import { test, expect } from '@playwright/test';

test('CP 워크시트 컬럼 고유 너비 검증 (PRD 준수 확인)', async ({ page }) => {
  const cpNo = 'cp26-m001';
  await page.goto(`http://localhost:3000/control-plan/worksheet?cpNo=${cpNo}`);
  
  await page.waitForSelector('table thead tr');

  // PRD 정의 너비 (상수 파일과 동일해야 함)
  const expectedWidths = [
    40,  // No
    45,  // 공정번호
    65,  // 공정명
    45,  // 레벨
    200, // 공정설명
    80,  // 설비/금형/JIG
    40,  // EP
    40,  // 자동
    25,  // NO (특성)
    80,  // 제품특성
    80,  // 공정특성
    35,  // 특별특성
    75,  // 스펙/공차
    70,  // 평가방법
    35,  // 샘플
    45,  // 주기
    80,  // 관리방법
    50,  // 책임1
    50,  // 책임2
    200  // 대응계획
  ];

  const columnHeaders = await page.locator('table thead tr:nth-child(2) th').all();
  console.log(`🔍 검증 대상 컬럼 수: ${columnHeaders.length}`);
  
  for (let i = 0; i < columnHeaders.length; i++) {
    const box = await columnHeaders[i].boundingBox();
    const actualWidth = box ? Math.round(box.width) : 0;
    const expected = expectedWidths[i];
    
    console.log(`컬럼 ${i} (${expected}px 예정): 실제 ${actualWidth}px`);
    
    // 브라우저 렌더링 특성상 1~5px 정도의 유동적 확장은 허용 (min-width 기준이므로)
    // 하지만 모든 컬럼이 동일(80px)하게 나오는 버그가 없는지 확인이 핵심
    expect(actualWidth).toBeGreaterThanOrEqual(expected - 2);
  }
});
