
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
  isUpcoming: boolean;
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

async function ensureMainView(page: any) {
    // Handle Renewal Landing Page
    try {
        const renewalBtn = page.getByText('새로운 CGV로 이동');
        if (await renewalBtn.isVisible({ timeout: 5000 })) {
            console.log('Detected renewal landing page. Clicking move button...');
            await renewalBtn.click();
            await page.waitForLoadState('networkidle');
        }
    } catch {}

    // Close initial modals/popups
    console.log('Handling initial popups...');
    try {
        await wait(2000);
        const closeBtn = page.getByText('닫기');
        const count = await closeBtn.count();
        if (count > 0) {
            await closeBtn.first().click();
            console.log('✅ Closed popup "닫기"');
        }
    } catch {}
}

async function reNavigateToMovieTab(page: any) {
    console.log('Ensuring "영화" category is selected...');
    try {
        const movieCategory = page.locator('button[class*="roundtab_tabTitle__VWFIX"]').filter({ hasText: /^영화$/ });
        await movieCategory.waitFor({ timeout: 5000 });
        const isSelected = await movieCategory.evaluate((el: any) => el.classList.contains('active') || el.parentElement.classList.contains('active') || el.getAttribute('aria-selected') === 'true');
        
        if (!isSelected) {
            await movieCategory.click({ force: true });
            console.log('✅ Clicked "영화" category');
            await wait(2000);
        }
    } catch {
        // If not found or error, it might already be there or structure changed
    }
}

async function crawlCGVList(page: any): Promise<ScrapedEvent[]> {
  try {
    console.log('Navigating to CGV...');
    await page.goto('https://www.cgv.co.kr/', { waitUntil: 'networkidle', timeout: 60000 });

    await ensureMainView(page);

    // Try to find "이벤트/혜택" button
    console.log('Searching for "이벤트/혜택" button...');
    const eventTab = page.locator('button[class*="maintab_tabTitle__77wdq"]').filter({ hasText: '이벤트/혜택' });
    await eventTab.waitFor({ timeout: 15000 });
    await eventTab.click({ force: true });
    await wait(2000);

    await reNavigateToMovieTab(page);
    
    await wait(3000);

    // Listen for browser logs
    page.on('console', (msg: any) => console.log('BROWSER:', msg.text()));

    // Scrape events
    console.log('Scraping event list...');
    await wait(5000); 
    const html = await page.content();
    fs.writeFileSync('debug_cgv.html', html);
    console.log('Saved debug_cgv.html');
    await page.screenshot({ path: 'debug_cgv_at_scrape.png' });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = await page.evaluate(function(t: number) {
        try {
            const todayDate = new Date(t);
            const results: any[] = [];
            const processedTitles = new Set();
            
            // Search for event cards (li)
            const cards = document.querySelectorAll('li, [class*="eventCard_card"]');
            
            cards.forEach(card => {
                const img = card.querySelector('img');
                const alt = img ? img.getAttribute('alt') : '';
                if (!alt || alt === 'No Title' || alt === '-' || processedTitles.has(alt)) return;

                // Title often in img alt
                const title = alt;
                processedTitles.add(title);

                // Link can be a or button
                const linkEl = card.querySelector('a, button[class*="link"]');
                let detailUrl = '';
                if (linkEl) {
                    if (linkEl.tagName === 'A') {
                        detailUrl = (linkEl as HTMLAnchorElement).href;
                    } else {
                        // If it's a button, make a unique fallback using title
                        detailUrl = 'https://www.cgv.co.kr/culture-event/event/default.aspx?title=' + encodeURIComponent(title);
                    }
                }

                // Date range
                const periodEl = card.querySelector('[class*="period"], [class*="subText"]');
                const dateRange = periodEl ? (periodEl as HTMLElement).innerText : '';
                
                if (dateRange) {
                    let isUpcoming = false;
                    const match = dateRange.match(/(\d{2})\.(\d{2})\.(\d{2})/);
                    if (match) {
                        const sd = new Date(2000 + parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
                        if (sd > todayDate) isUpcoming = true;
                    }

                    results.push({
                        title: title,
                        detailUrl: detailUrl,
                        dateRange: dateRange,
                        isUpcoming: isUpcoming
                    });
                }
            });

            return results;
        } catch (e) {
            return { error: (e as any).message };
        }
    }, today.getTime()) as any;

    if (events && events.error) {
        console.error('Browser Scrape Error:', events.error);
        return [];
    }

    const finalEvents = (events || []) as ScrapedEvent[];
    console.log(`Found total ${finalEvents.length} events from list.`);
    finalEvents.forEach(e => {
        console.log(`- [${e.isUpcoming ? 'UPCOMING' : 'PAST'}] ${e.title} (${e.dateRange})`);
    });
    return finalEvents;
  } catch (e) {
    console.error('Error in crawlCGVList:', e);
    return [];
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
    while (retries > 0) {
      try {
        console.log(`🔍 Gemini 이미지 분석 시작 (${modelName})...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const imageBuffer = fs.readFileSync(imagePath);
        const imageBase64 = imageBuffer.toString('base64');
        const prompt = `
당신은 영화관 이벤트 페이지에서 정보를 추출하는 전문가입니다.
제공된 CGV 이벤트 상세 페이지 이미지를 분석해주세요.

이미지에서 다음 정보를 정확히 추출해야 합니다:

1. "movieTitle" (영화 제목):
   - 특정 영화와 관련된 이벤트인 경우, 이미지에 표시된 정확한 영화 제목을 추출하세요.
   - 영화와 관련 없는 일반 이벤트인 경우 "General"을 사용하세요.
   - 예시: "듄: 파트 2", "웡카", "General"

2. "goodsType" (상품 종류):
   - 제공되는 상품의 종류를 추출하세요.
   - 가능한 값: "오리지널 티켓", "TTT", "포스터", "배지", "포스트카드", "스티커", "포토카드", "키링" 등
   - 여러 종류가 있으면 쉼표로 구분하여 결합하세요 (예: "배지, 배지")
   - 이미지에서 정확히 확인할 수 없는 경우 "Unknown"을 사용하세요.

3. "locations" (지점 정보):
   - 이벤트가 진행되는 지점을 추출하세요.
   - "전국", "전 지점", "모든 지점" 등의 표현이 있으면 ["All"]을 반환하세요.
   - 특정 지점이 나열되어 있으면 모든 지점을 배열로 추출하세요 (예: ["용산아이파크몰", "코엑스", "강남"]).
   - 지점 정보가 없는 경우 빈 배열 []을 반환하세요.

중요 사항:
- 이미지의 텍스트는 한국어입니다.
- 이미지를 자세히 살펴보고 모든 텍스트를 정확히 읽어주세요.
- 추출할 수 없는 정보는 빈 문자열("") 또는 빈 배열([])로 반환하세요.
- 반드시 아래 JSON 형식으로만 응답하세요. 다른 설명이나 텍스트는 포함하지 마세요.

응답 형식 (JSON만):
{
  "movieTitle": "영화 제목 또는 General",
  "goodsType": "상품 종류",
  "locations": ["지점1", "지점2"] 또는 ["All"] 또는 []
}
`;
        const result = await model.generateContent([
          prompt,
          { inlineData: { data: imageBase64, mimeType: "image/png" } }
        ]);
        
        const text = result.response.text();
        const cleanJson = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/^[^{]*/, '').replace(/[^}]*$/, '').trim();
        return JSON.parse(cleanJson);
      } catch (e: any) {
        if (e.status === 429) {
          console.warn(`⏳ Rate limit hit for ${modelName}, waiting 10s...`);
          await wait(10000);
          retries--;
        } else {
          console.error(`Gemini failure for ${modelName}:`, e.message || 'Unknown error');
          break;
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
    movie_title: event.movieTitle || event.title.replace(/\[.*\]\s*/, '').trim(),
    cinema_id: 1, // CGV
    goods_type: event.goodsType || 'Unknown',
    period: event.dateRange,
    locations: event.locations || ['All'],
    official_url: event.detailUrl,
    status: '예정',
    is_visible: false,
    is_new: true
  });
  if (error) console.error('Supabase error:', error);
}

async function processEventByClick(page: any, event: ScrapedEvent): Promise<string | null> {
  try {
    console.log(`Navigating to detail by clicking: ${event.title}`);
    
    // Find the image with the specific alt text and click its parent link
    const eventImg = page.locator(`img[alt="${event.title}"]`);
    await eventImg.first().waitFor({ timeout: 5000 });
    await eventImg.first().click({ force: true });
    
    await page.waitForLoadState('networkidle');
    await wait(2000);

    // Handle any renewal landing pages or popups on the detail page
    await ensureMainView(page);
    
    await wait(2000);
    const imagesDir = path.join(__dirname, 'crawled_images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
    const screenshotPath = path.join(imagesDir, `cgv_${Date.now()}.png`);
    
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    // Go back to the list
    console.log('Going back to list...');
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await wait(3000);

    // Re-verify we are in the Movie tab (CGV often resets state)
    await reNavigateToMovieTab(page);

    return screenshotPath;
  } catch (e: any) { 
    console.error(`Error processing ${event.title} via click:`, e.message);
    // Try to go back anyway if we failed
    try { await page.goBack(); } catch {}
    return null; 
  }
}

(async () => {
  console.log('🚀 Starting CGV Crawler (Session Reuse Mode)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    const existingUrls = await getExistingUrls();
    const allEvents = await crawlCGVList(page);
    
    // Filter: Upcoming AND New AND Keyword
    const targetEvents = allEvents.filter(e => {
      const keywords = ['증정', '스페셜', 'TTT', '오리지널티켓', '아트카드', '시그니처', '굿즈', '뱃지', '포스터', '현장','짱구'];
      const hasKeyword = keywords.some(k => e.title.includes(k));
      const isNew = !existingUrls.has(e.detailUrl);
      return e.isUpcoming && isNew && hasKeyword;
    });

    console.log(`Found ${targetEvents.length} target events to process.`);
    for (const event of targetEvents) {
      console.log(`Processing: ${event.title}`);
      const screenshotPath = await processEventByClick(page, event);
      if (!screenshotPath) continue;

      const analysis = await analyzeImageWithGemini(screenshotPath);
      await saveToSheets({ ...event, ...analysis });
      await saveToSupabase({ ...event, ...analysis });
      if (fs.existsSync(screenshotPath)) fs.unlinkSync(screenshotPath);
      await wait(3000);
    }
  } catch (e) {
    console.error('Crawler main loop error:', e);
  } finally {
    await browser.close();
    console.log('Done.');
  }
})();
