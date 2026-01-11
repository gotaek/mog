
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
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use Service Role for admin access
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
// const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY!; // Support both names
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID!;

// Validate Env
const requiredVars = {
  SUPABASE_URL,
  SUPABASE_KEY,
  GEMINI_API_KEY,
  // TMDB_API_KEY,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  GOOGLE_SHEET_ID
};

const missing = Object.entries(requiredVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('Please check your .env.local file.');
  process.exit(1);
}

// --- Clients ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// const tmdb = new TMDB(TMDB_API_KEY);

// --- Types ---
interface ScrapedEvent {
  title: string;
  detailUrl: string;
  imageUrl?: string;
  dateRange?: string;
}

interface EnrichedEvent extends ScrapedEvent {
  movieTitle: string;
  goodsType: string;
  locations: string[];
  posterPath?: string;
}

// --- Functions ---
// --- Functions ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getExistingUrls(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('events')
    .select('official_url');

  if (error) {
    console.error('Error fetching existing events:', error);
    return new Set();
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Set(data.map((e: any) => e.official_url));
}

async function crawlMegaboxList(): Promise<ScrapedEvent[]> {
  console.log('Starting Playwright...');
  const browser = await chromium.launch({ headless: true }); // HEADLESS mode
  const page = await browser.newPage();

  try {
    console.log('Navigating to Megabox event page...');
    await page.goto('https://www.megabox.co.kr/event/movie', { waitUntil: 'networkidle' });

    // Wait for list to load
    try {
        await page.waitForSelector('.event-list', { timeout: 10000 });
    } catch {
        console.log("Timeout waiting for .event-list. Taking screenshot...");
        await page.screenshot({ path: 'debug_list_page.png', fullPage: true });
    }

    // Extract basic info
    const events = await page.evaluate(() => {
        // Debug: return HTML
        const listContainer = document.querySelector('.event-list');
        if (!listContainer) return { html: 'No container' };
        
        const items = document.querySelectorAll('.event-list li');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results: any[] = [];
        
        items.forEach((item) => {
            const linkEl = item.querySelector('a.eventBtn'); // Correct class name
            const titleEl = item.querySelector('.tit');
            const dateEl = item.querySelector('.date');
            const imgEl = item.querySelector('.img img');

            if (linkEl && titleEl) { // Ensure essential elements exist
                const eventNo = linkEl.getAttribute('data-no');
                if (!eventNo) return;
                
                const fullUrl = `https://www.megabox.co.kr/event/detail?eventNo=${eventNo}`;
                
                results.push({
                    title: titleEl?.textContent?.trim() || 'No Title',
                    detailUrl: fullUrl,
                    dateRange: dateEl?.textContent?.trim() || '',
                    imageUrl: imgEl?.getAttribute('src') || ''
                });
            }
        });

        return results;
    });
    
    console.log(`Found ${events.length} events on the list page.`);
    return events;

  } catch (e) {
    console.error('Error in crawlMegaboxList:', e);
    return [];
  } finally {
    await browser.close();
  }
}


/**
 * Gemini를 사용하여 이미지에서 이벤트 정보 추출
 * @param imagePath - 분석할 스크린샷 경로
 * @returns 추출된 영화 제목, 상품 타입, 지점 정보
 */
async function analyzeImageWithGemini(imagePath: string): Promise<{ movieTitle: string, goodsType: string, locations: string[] }> {
  let rawResponse = '';
  
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    // Convert to base64
    const imageBase64 = imageBuffer.toString('base64');

    const prompt = `
당신은 영화관 이벤트 페이지에서 정보를 추출하는 전문가입니다.
제공된 메가박스 이벤트 상세 페이지 이미지를 분석해주세요.

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

    console.log('🔍 Gemini 이미지 분석 시작...');

    // Candidate models in order of preference (Lite/Flash typically faster/cheaper)
    const models = [
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash", 
        "gemini-2.5-pro",
        "gemini-2.0-flash",
        "gemini-2.0-pro"
    ];

    let result: any;
    let lastError: any;

    // Try each model in order
    modelLoop: for (const modelName of models) {
        console.log(`🤖 Trying model: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        let retries = 2; // Retry per model
        while (retries > 0) {
            try {
                result = await model.generateContent([
                    prompt,
                    { inlineData: { data: imageBase64, mimeType: "image/png" } }
                ]);
                break modelLoop; // Success! Exit both loops
            } catch (e: any) {
                lastError = e;
                if (e.message && e.message.includes('429')) {
                    console.warn(`⏳ Rate Limit (429) on ${modelName}. Waiting 20s... (${retries} retries left)`);
                    await wait(20000); // Wait 20s
                    retries--;
                } else {
                    console.warn(`⚠️ Error with ${modelName}: ${e.message}. Trying next model/retry...`);
                    // For non-429 errors, maybe move to next model immediately or retry?
                    // Let's retry once more then move on
                    retries--;
                }
            }
        }
    }
    
    if (!result) throw new Error(`All Gemini models failed. Last error: ${lastError?.message}`);
    
    rawResponse = result.response.text();
    console.log('📝 Gemini 원본 응답:', rawResponse.substring(0, 200) + (rawResponse.length > 200 ? '...' : ''));

    // JSON 추출 및 정리
    let cleanJson = rawResponse.trim();
    
    // 코드 블록 제거
    cleanJson = cleanJson.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    // JSON 객체만 추출 (중괄호로 시작하고 끝나는 부분)
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanJson = jsonMatch[0];
    }
    
    // 파싱 시도
    let parsed: { movieTitle: string, goodsType: string, locations: string[] };
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      console.error('❌ JSON 파싱 실패. 재시도 중...');
      console.error('   파싱 시도한 텍스트:', cleanJson.substring(0, 300));
      
      // 재시도: 더 공격적인 정리
      cleanJson = cleanJson.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      try {
        parsed = JSON.parse(cleanJson);
      } catch (retryError) {
        console.error('❌ JSON 파싱 재시도 실패');
        console.error('   원본 응답 전체:', rawResponse);
        throw new Error(`JSON 파싱 실패: ${retryError}`);
      }
    }
    
    // 결과 검증 및 정리
    const result_cleaned = {
      movieTitle: (parsed.movieTitle || '').trim() || '',
      goodsType: (parsed.goodsType || '').trim() || 'Unknown',
      locations: Array.isArray(parsed.locations) 
        ? parsed.locations.filter((loc: unknown): loc is string => typeof loc === 'string' && loc.length > 0)
          .map((loc: string) => loc.trim()) 
        : []
    };
    
    console.log('✅ Gemini 분석 완료:', result_cleaned);
    return result_cleaned;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.error('❌ Gemini 분석 실패:');
    console.error('   에러 타입:', e.constructor?.name || 'Unknown');
    console.error('   메시지:', e.message || e);
    if (rawResponse) {
      console.error('   원본 응답:', rawResponse);
    }
    
    // 실패한 스크린샷 저장 (디버깅용)
    try {
      const debugPath = `debug_failed_${Date.now()}.png`;
      fs.copyFileSync(imagePath, debugPath);
      console.error(`   디버깅용 스크린샷 저장: ${debugPath}`);
    } catch {
      // 스크린샷 저장 실패는 무시
    }
    
    return { movieTitle: '', goodsType: 'Unknown', locations: [] };
  }
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
    
    // Assume first sheet
    const sheet = doc.sheetsByIndex[0];

    // Check headers
    // Removed 'status', added 'crawled_at'
    const headers = ['event_title', 'movie_title', 'goods_type', 'locations', 'period', 'poster_url', 'detail_url', 'crawled_at'];
    await sheet.loadHeaderRow(); // Try loading
    
    // If empty or mismatch, set headers
    if (sheet.headerValues.length === 0) {
        console.log('Sheet is empty. Setting headers...');
        await sheet.setHeaderRow(headers);
    }

    await sheet.addRow({
        'event_title': event.title,
        'movie_title': event.movieTitle,
        'goods_type': event.goodsType,
        'locations': event.locations.join(', '),
        'period': event.dateRange || '',
        'poster_url': event.posterPath || '',
        'detail_url': event.detailUrl,
        'crawled_at': new Date().toISOString()
    });
    console.log(`Saved "${event.title}" to Google Sheets.`);
  } catch (e) {
    console.error('Error saving to Google Sheets:', e);
  }
}

async function saveToSupabase(event: EnrichedEvent) {
    const { error } = await supabase.from('events').insert({
        event_title: event.title, // Maps to renamed column
        movie_title: event.movieTitle, // New column
        cinema_id: 2, 
        goods_type: event.goodsType,
        period: event.dateRange,
        image_url: event.posterPath, 
        locations: event.locations,
        official_url: event.detailUrl,
        status: '진행중',
        is_visible: false // Hidden by default, requires manual approval
    });
    if (error) console.error('Error saving to Supabase:', error);
    else console.log(`Saved "${event.title}" to Supabase.`);
}

/**
 * 이벤트 상세 페이지 스크린샷 촬영
 * @param browser - Playwright 브라우저 인스턴스
 * @param url - 이벤트 상세 페이지 URL
 * @returns 스크린샷 파일 경로 또는 null
 */
async function processDetail(browser: Browser, url: string): Promise<string | null> {
    const page = await browser.newPage();
    // Set explicit viewport for better screenshot consistency
    await page.setViewportSize({ width: 1280, height: 2000 }); 
    
    try {
        console.log(`   페이지 로딩 중: ${url}`);
        // 네트워크가 안정될 때까지 대기
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        
        // 추가 대기 시간: 동적 콘텐츠 로딩을 위해
        await wait(2000);
        
        // Wait for content - 여러 선택자 시도
        const contentSelectors = ['.event-view', '.event-detail', '.event-content', 'main', 'body'];
        let element = null;
        let usedSelector = '';
        
        for (const selector of contentSelectors) {
            try {
                console.log(`   요소 대기 중: ${selector}`);
                await page.waitForSelector(selector, { timeout: 5000 });
                
                // 요소가 실제로 보이는지 확인
                const isVisible = await page.evaluate((sel) => {
                    const el = document.querySelector(sel);
                    if (!el) return false;
                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                }, selector);
                
                if (isVisible) {
                    element = await page.$(selector);
                    usedSelector = selector;
                    console.log(`   ✅ 요소 찾음: ${selector}`);
                    break;
                }
            } catch {
                // 다음 선택자 시도
                continue;
            }
        }
        
        // 추가 대기: 이미지 및 폰트 로딩 완료 대기
        if (element) {
            await wait(1000);
            // 이미지 로딩 완료 대기
            await page.evaluate(() => {
                return Promise.all(
                    Array.from(document.images)
                        .filter(img => !img.complete)
                        .map(img => new Promise((resolve) => {
                            img.onload = resolve;
                            img.onerror = resolve;
                            setTimeout(resolve, 2000); // 타임아웃
                        }))
                );
            });
        }
        
        const imagesDir = path.join(__dirname, 'crawled_images');
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
        }
        
        // Use event ID from URL or timestamp for filename
        const eventIdMatch = url.match(/eventNo=(\d+)/);
        const eventId = eventIdMatch ? eventIdMatch[1] : `unknown_${Date.now()}`;
        const screenshotPath = path.join(imagesDir, `event_${eventId}.png`);
        
        if (element && usedSelector) {
            // 특정 요소만 스크린샷
            console.log(`   스크린샷 촬영 중 (요소: ${usedSelector})...`);
            await element.screenshot({ path: screenshotPath });
        } else {
            // 전체 페이지 스크린샷
            console.log(`   전체 페이지 스크린샷 촬영 중...`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
        }
        
        console.log(`   ✅ 스크린샷 저장 완료: ${screenshotPath}`);
        return screenshotPath;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
        console.error(`❌ 상세 페이지 처리 실패 ${url}:`);
        console.error(`   에러: ${e.message || e}`);
        return null;
    } finally {
        await page.close();
    }
}


// --- Main ---
(async () => {
    console.log('Starting Megabox Crawler...');
    
    // 1. Get Old URLs
    const existingUrls = await getExistingUrls();
    console.log(`Found ${existingUrls.size} existing events in DB.`);

    // 2. Crawl List
    const allEvents = await crawlMegaboxList();
    const newEvents = allEvents.filter(e => !existingUrls.has(e.detailUrl));
    
    console.log(`Found ${newEvents.length} NEW events.`);

    if (newEvents.length === 0) {
        console.log("No new events found. Exiting.");
        return;
    }

    // Launch browser for details (re-using chromium execution)
    const browser = await chromium.launch();
    
    // const key = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
    // console.log(`🔑 TMDB Key Debug: Value="${key ? key.substring(0, 5) + '...' : 'undefined'}", Length=${key?.length}`);

    // 3. Process each new event
    for (const event of newEvents) {
        // Quick filter for testing to avoid rate limits
        if (!event.title.includes('누벨바그')) {
            continue;
        }

        console.log(`Processing: ${event.title}...`);
        
        // A. Screenshot
        const screenshotPath = await processDetail(browser, event.detailUrl);
        
        if (!screenshotPath) continue;

        // B. Gemini
        const analysis = await analyzeImageWithGemini(screenshotPath);
        console.log("Gemini Analysis:", analysis);
        
        // Cleanup screenshot? 
        // User requested: "이미지를 잘 정리해서 수집하도록 하나의 폴더를 만들어주고"
        // So we do NOT delete it.
        // fs.unlinkSync(screenshotPath);

        // C. TMDB - Skipped as requested
        // const posterPath = await searchTmdb(analysis.movieTitle || event.title);
        
        // D. Enrichment
        const enriched: EnrichedEvent = {
            ...event,
            ...analysis,
            posterPath: undefined // No poster search
        };

        // E. Save
        await saveToSheets(enriched);
        await saveToSupabase(enriched);
    }

    await browser.close();
    console.log('Done.');
})();
