
import { chromium, Browser } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { GoogleGenerativeAI } from '@google/generative-ai';

import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

// --- Configuration ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID!;

// Validate Env
const requiredVars = { SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID };
const missing = Object.entries(requiredVars).filter(([, value]) => !value).map(([key]) => key);
if (missing.length > 0) {
  console.error(`❌ Missing: ${missing.join(', ')}`);
  process.exit(1);
}

// --- Clients ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- Types ---
interface ScrapedEvent {
  title: string;
  detailUrl: string;
  dateRange?: string;
}

interface EnrichedEvent extends ScrapedEvent {
  movieTitle: string;
  goodsType: string;
  locations: string[];
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getExistingUrls(): Promise<Set<string>> {
  const { data, error } = await supabase.from('events').select('official_url');
  if (error) return new Set();
  return new Set(data.map((e: any) => e.official_url));
}

async function crawlLotteList(): Promise<ScrapedEvent[]> {
  console.log('Starting Playwright for Lotte Cinema (JSON mode)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  const listUrl = 'https://www.lottecinema.co.kr/NLCHS/Event/DetailList?code=20';
  let capturedEvents: ScrapedEvent[] = [];

  try {
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('EventData.aspx')) {
        try {
          const text = await response.text();
          const data = JSON.parse(text);
          if (data && data.Items) {
            capturedEvents = data.Items.map((item: any) => ({
              title: item.EventName,
              dateRange: `${item.ProgressStartDate} ~ ${item.ProgressEndDate}`,
              detailUrl: `https://www.lottecinema.co.kr/NLCHS/Event/EventTemplateInfo?eventId=${item.EventID}`
            }));
          }
        } catch {}
      }
    });

    await page.goto(listUrl, { waitUntil: 'networkidle' });
    for (let i = 0; i < 15 && capturedEvents.length === 0; i++) await wait(1000);
    return capturedEvents;
  } catch (e) {
    console.error('Error in crawlLotteList:', e);
    return [];
  } finally {
    await browser.close();
  }
}

async function analyzeImageWithGemini(imagePath: string): Promise<{ movieTitle: string, goodsType: string, locations: string[] }> {
  const models = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash", 
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-2.0-pro"
  ];
  
  for (const modelName of models) {
    let retries = 2;
    // We handle model creation inside to ensure it tries the next one if the model name itself fails
    
    while (retries > 0) {
      try {
        console.log(`🔍 Gemini 이미지 분석 시작 (${modelName})...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const imageBuffer = fs.readFileSync(imagePath);
        const imageBase64 = imageBuffer.toString('base64');
        const prompt = `당신은 영화관 이벤트 페이지 전문가입니다. 이미지를 분석하여 다음 JSON 형식으로 출력하세요.
        { "movieTitle": "제목", "goodsType": "종류(아트카드, 포스터 등)", "locations": ["지점" 또는 "All"] }`;

        const result = await model.generateContent([
          prompt,
          { inlineData: { data: imageBase64, mimeType: "image/png" } }
        ]);
        
        const text = result.response.text();
        const cleanJson = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (e: any) {
        if (e.status === 429) {
          console.warn(`⏳ Rate limit hit for ${modelName}, waiting 10s...`);
          await wait(10000);
          retries--;
        } else {
          console.error(`Gemini failure for ${modelName}:`, e.message || 'Unknown error');
          break; // Try next model
        }
      }
    }
  }
  return { movieTitle: '', goodsType: 'Unknown', locations: [] };
}

async function saveToSheets(event: EnrichedEvent) {
  try {
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const headers = ['event_title', 'movie_title', 'goods_type', 'locations', 'period', 'detail_url', 'crawled_at'];
    try { await sheet.loadHeaderRow(); } catch { await sheet.setHeaderRow(headers); }
    await sheet.addRow({
      event_title: event.title,
      movie_title: event.movieTitle,
      goods_type: event.goodsType,
      locations: event.locations.join(', '),
      period: event.dateRange || '',
      detail_url: event.detailUrl,
      crawled_at: new Date().toISOString()
    });
  } catch (e) { console.error('Sheet error:', e); }
}

async function saveToSupabase(event: EnrichedEvent) {
  const { error } = await supabase.from('events').insert({
    event_title: event.title,
    movie_title: event.movieTitle,
    cinema_id: 3, // Lotte
    goods_type: event.goodsType,
    period: event.dateRange,
    locations: event.locations,
    official_url: event.detailUrl,
    status: '예정',
    is_visible: false,
    is_new: true
  });
  if (error) console.error('Supabase error:', error);
}

async function processDetail(browser: Browser, url: string): Promise<string | null> {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 2000 });
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await wait(2000);
    const imagesDir = path.join(__dirname, 'crawled_images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
    const screenshotPath = path.join(imagesDir, `lotte_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  } catch { return null; } finally { await page.close(); }
}

(async () => {
  console.log('🚀 Starting Test Crawler (Lotte)...');
  const existingUrls = await getExistingUrls();
  const allEvents = await crawlLotteList();
  
  const targetEvents = allEvents.filter(e => {
    const keywords = ['증정', '스페셜', '아트카드', '시그니처'];
    const hasKeyword = keywords.some(k => e.title.includes(k));
    return hasKeyword && !existingUrls.has(e.detailUrl);
  });

  console.log(`Found ${targetEvents.length} events to process.`);
  const browser = await chromium.launch();
  for (const event of targetEvents) {
    console.log(`Processing: ${event.title}`);
    const screenshotPath = await processDetail(browser, event.detailUrl);
    if (!screenshotPath) continue;

    const analysis = await analyzeImageWithGemini(screenshotPath);
    await saveToSheets({ ...event, ...analysis });
    await saveToSupabase({ ...event, ...analysis });
    if (fs.existsSync(screenshotPath)) fs.unlinkSync(screenshotPath);
    await wait(3000);
  }
  await browser.close();
  console.log('Done.');
})();
