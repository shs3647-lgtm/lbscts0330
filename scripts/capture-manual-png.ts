/**
 * HTML 목업 → PNG 변환 스크립트 (노란 번호 + 주석 포함)
 *
 * 사용법: npx tsx scripts/capture-manual-png.ts
 *
 * 1. docs/매뉴얼사진/화면캡처/*.html 을 순회
 * 2. 노란색 번호 원(①②③...) 오버레이 삽입
 * 3. 하단 주석 패널 추가
 * 4. PNG로 캡처 → 기존 PNG 대체
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = path.resolve(__dirname, '../docs/매뉴얼사진/화면캡처');
const ANNOTATIONS_PATH = path.resolve(__dirname, 'manual-annotations.json');

// 원 번호 문자 매핑
const CIRCLE_NUMS = ['', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪'];

interface Annotation {
  num: number;
  x: number;
  y: number;
  label: string;
}

interface PageAnnotation {
  title: string;
  annotations: Annotation[];
}

async function main() {
  // 주석 데이터 로드
  const annotationsData: Record<string, PageAnnotation> = JSON.parse(
    fs.readFileSync(ANNOTATIONS_PATH, 'utf-8')
  );

  // HTML 파일 목록
  const htmlFiles = fs.readdirSync(SCREENSHOT_DIR)
    .filter(f => f.endsWith('.html'))
    .sort();

  console.log(`\n📸 HTML → PNG 변환 시작 (${htmlFiles.length}개 파일)\n`);

  // 기존 PNG 삭제
  const existingPngs = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
  for (const png of existingPngs) {
    fs.unlinkSync(path.join(SCREENSHOT_DIR, png));
  }
  console.log(`🗑️  기존 PNG ${existingPngs.length}개 삭제 완료\n`);

  // Playwright 브라우저 시작
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // 고해상도
  });

  let success = 0;
  let skipped = 0;

  for (const htmlFile of htmlFiles) {
    const pageData = annotationsData[htmlFile];
    if (!pageData) {
      console.log(`⏭️  ${htmlFile} — 주석 데이터 없음, 스킵`);
      skipped++;
      continue;
    }

    const htmlPath = path.join(SCREENSHOT_DIR, htmlFile);
    const pngFile = htmlFile.replace('.html', '.png');
    const pngPath = path.join(SCREENSHOT_DIR, pngFile);

    try {
      const page = await context.newPage();

      // HTML 파일 로드
      await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Tailwind CSS 로드 대기
      await page.waitForTimeout(2000);

      // 노란 원 번호 오버레이 + 하단 주석 삽입
      await page.evaluate((data: { annotations: Annotation[]; title: string; circleNums: string[] }) => {
        const { annotations, title, circleNums } = data;

        // 오버레이 컨테이너 (원 번호들)
        const overlay = document.createElement('div');
        overlay.id = 'annotation-overlay';
        overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';

        for (const ann of annotations) {
          const circle = document.createElement('div');
          circle.style.cssText = `
            position: absolute;
            left: ${ann.x - 14}px;
            top: ${ann.y - 14}px;
            width: 28px;
            height: 28px;
            background: #FFD600;
            border: 2px solid #F57F17;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            font-weight: 800;
            color: #212121;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            font-family: 'Segoe UI', sans-serif;
            line-height: 1;
          `;
          circle.textContent = String(ann.num);
          overlay.appendChild(circle);
        }

        document.body.style.position = 'relative';
        document.body.appendChild(overlay);

        // 하단 주석 패널
        const panel = document.createElement('div');
        panel.id = 'annotation-panel';
        panel.style.cssText = `
          width: 100%;
          background: #FAFAFA;
          border-top: 3px solid #FFD600;
          padding: 16px 24px;
          font-family: 'Malgun Gothic', 'Segoe UI', sans-serif;
          box-sizing: border-box;
        `;

        // 제목
        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-size: 14px; font-weight: 700; color: #1a1a1a; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #e0e0e0;';
        titleEl.textContent = `📌 ${title}`;
        panel.appendChild(titleEl);

        // 주석 목록 (2열 그리드)
        const grid = document.createElement('div');
        grid.style.cssText = `
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px 32px;
          font-size: 13px;
          color: #333;
          line-height: 1.6;
        `;

        for (const ann of annotations) {
          const item = document.createElement('div');
          item.style.cssText = 'display: flex; align-items: baseline; gap: 6px;';

          const numSpan = document.createElement('span');
          numSpan.style.cssText = 'color: #F57F17; font-weight: 800; min-width: 20px;';
          numSpan.textContent = circleNums[ann.num] || `(${ann.num})`;

          const labelSpan = document.createElement('span');
          labelSpan.textContent = ann.label;

          item.appendChild(numSpan);
          item.appendChild(labelSpan);
          grid.appendChild(item);
        }

        panel.appendChild(grid);
        document.body.appendChild(panel);

      }, {
        annotations: pageData.annotations,
        title: pageData.title,
        circleNums: CIRCLE_NUMS,
      });

      // 전체 페이지 캡처 (화면 + 주석 패널 포함)
      await page.screenshot({
        path: pngPath,
        fullPage: true,
        type: 'png',
      });

      await page.close();
      success++;
      console.log(`✅ ${pngFile} — ${pageData.annotations.length}개 주석`);

    } catch (err) {
      console.error(`❌ ${htmlFile} — 오류: ${err}`);
    }
  }

  await browser.close();

  console.log(`\n📊 완료: ${success}개 성공, ${skipped}개 스킵`);
  console.log(`📁 저장 위치: ${SCREENSHOT_DIR}\n`);
}

main().catch(console.error);
