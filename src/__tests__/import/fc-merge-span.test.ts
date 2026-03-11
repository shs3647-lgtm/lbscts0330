/**
 * @file fc-merge-span.test.ts
 * @description TDD: FC 파싱 병합셀 추출 테스트
 *
 * P1 해결: parseFCSheet에서 fmMergeSpan / feMergeSpan / excelRow 추출
 *
 * docs/DB중심의_고장연결구축.md 참조
 * @created 2026-02-28
 */

import { describe, it, expect } from 'vitest';
import { getMergeSpan, getMergedCellValue } from '@/lib/excel-data-range';
import { parseFCSheet, detectColumnMap } from '@/app/(fmea-core)/pfmea/import/excel-parser-fc';

// ─── Mock ExcelJS Worksheet 생성 헬퍼 ───

interface MockCellData {
  [row: number]: { [col: number]: string };
}

/**
 * ExcelJS Worksheet 최소 목업
 * - rows: { [rowNum]: { [colNum]: value } }
 * - merges: ["A2:A4", "D2:D6"] 형식 (ExcelJS model.merges 형식)
 */
function createMockSheet(
  rows: MockCellData,
  merges: string[] = [],
  headerRow?: { [col: number]: string },
): any {
  const allRowNums = Object.keys(rows).map(Number);
  const maxRow = allRowNums.length > 0 ? Math.max(...allRowNums) : 1;

  // headerRow가 제공되면 rows에 합침
  const allRows = { ...rows };
  if (headerRow) {
    allRows[1] = headerRow;
  }

  return {
    rowCount: maxRow,
    name: 'FC 고장사슬',
    getRow(rowNum: number) {
      const rowData = allRows[rowNum] || {};
      return {
        number: rowNum,
        cellCount: 20,
        getCell(colNum: number) {
          return {
            value: rowData[colNum] ?? null,
          };
        },
      };
    },
    model: { merges },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. getMergeSpan 헬퍼 함수 테스트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('getMergeSpan 헬퍼', () => {

  it('병합 범위의 마스터 셀 → rowSpan 반환, isMaster=true', () => {
    // A2:A4 → 3행 병합 (행 2~4, 열 1)
    const sheet = createMockSheet(
      { 2: { 1: '값' }, 3: {}, 4: {} },
      ['A2:A4'],
    );
    const result = getMergeSpan(sheet, 2, 1);
    expect(result.rowSpan).toBe(3);
    expect(result.isMaster).toBe(true);
  });

  it('병합 범위 내 비-마스터 셀 → 같은 rowSpan, isMaster=false', () => {
    const sheet = createMockSheet(
      { 2: { 1: '값' }, 3: {}, 4: {} },
      ['A2:A4'],
    );
    const result = getMergeSpan(sheet, 3, 1);
    expect(result.rowSpan).toBe(3);
    expect(result.isMaster).toBe(false);
  });

  it('병합 범위 외 셀 → rowSpan=1, isMaster=true', () => {
    const sheet = createMockSheet(
      { 2: { 1: '값', 2: '단독' } },
      ['A2:A4'],
    );
    const result = getMergeSpan(sheet, 2, 2);
    expect(result.rowSpan).toBe(1);
    expect(result.isMaster).toBe(true);
  });

  it('병합 없는 시트 → 모든 셀 rowSpan=1', () => {
    const sheet = createMockSheet({ 2: { 1: '값' } }, []);
    const result = getMergeSpan(sheet, 2, 1);
    expect(result.rowSpan).toBe(1);
    expect(result.isMaster).toBe(true);
  });

  it('2차원 병합 (행+열) → rowSpan과 colSpan 모두 반환', () => {
    // B3:C5 → 3행 × 2열 병합
    const sheet = createMockSheet(
      { 3: { 2: '병합값' } },
      ['B3:C5'],
    );
    const result = getMergeSpan(sheet, 3, 2);
    expect(result.rowSpan).toBe(3);
    expect(result.colSpan).toBe(2);
    expect(result.isMaster).toBe(true);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. parseFCSheet — excelRow 추출 검증
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('parseFCSheet: excelRow 추출', () => {

  it('모든 파싱된 사슬에 excelRow가 설정됨', () => {
    // 헤더: 행1, 데이터: 행2~4
    const sheet = createMockSheet({
      1: { 1: '공정번호', 3: '고장원인', 4: '고장형태', 5: '고장영향' },
      2: { 1: '10', 3: 'FC-원인1', 4: 'FM-형태1', 5: 'FE-영향1' },
      3: { 1: '10', 3: 'FC-원인2', 4: 'FM-형태2', 5: 'FE-영향1' },
      4: { 1: '20', 3: 'FC-원인3', 4: 'FM-형태3', 5: 'FE-영향2' },
    });

    const chains = parseFCSheet(sheet);

    expect(chains.length).toBe(3);
    // 모든 사슬에 excelRow 존재
    chains.forEach(c => {
      expect(c.excelRow).toBeDefined();
      expect(typeof c.excelRow).toBe('number');
    });
    // 행 번호 검증 (1-based, 헤더 다음부터)
    expect(chains[0].excelRow).toBe(2);
    expect(chains[1].excelRow).toBe(3);
    expect(chains[2].excelRow).toBe(4);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. parseFCSheet — fmMergeSpan 추출 검증 (P1 핵심)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('parseFCSheet: fmMergeSpan 추출 (P1)', () => {

  it('FM이 3행 병합 → 3개 FC 사슬 모두 fmMergeSpan=3', () => {
    // 엑셀 구조:
    //   행2: 공정=10, FM="손가락끼임" (D2:D4 병합, 3행), FC="가이드마모"
    //   행3:                                               FC="윤활부족"
    //   행4:                                               FC="작업미숙"
    const sheet = createMockSheet({
      1: { 1: '공정번호', 2: '4M', 3: '고장원인', 4: '고장형태', 5: '고장영향' },
      2: { 1: '10', 2: 'MC', 3: '가이드마모', 4: '손가락끼임', 5: '상해' },
      3: { 1: '', 2: 'MC', 3: '윤활부족' },   // FM/FE 비어있음 → carry-forward
      4: { 1: '', 2: 'MN', 3: '작업미숙' },
    }, ['D2:D4', 'E2:E4']); // FM(D열) 3행 병합, FE(E열) 3행 병합

    const chains = parseFCSheet(sheet);

    expect(chains.length).toBe(3);

    // ★ 핵심 검증: 모든 사슬에 fmMergeSpan=3
    chains.forEach(c => {
      expect(c.fmMergeSpan).toBe(3);
    });

    // FC 값 검증
    expect(chains.map(c => c.fcValue).sort()).toEqual(['가이드마모', '윤활부족', '작업미숙']);

    // 모든 사슬이 같은 FM 값
    chains.forEach(c => {
      expect(c.fmValue).toBe('손가락끼임');
    });
  });

  it('FM 2건 — 각각 다른 병합 크기', () => {
    // FM1: "손가락끼임" (D2:D4, 3행 병합) → FC 3개
    // FM2: "정렬불량"   (D5:D6, 2행 병합) → FC 2개
    const sheet = createMockSheet({
      1: { 1: '공정번호', 2: '4M', 3: '고장원인', 4: '고장형태', 5: '고장영향' },
      2: { 1: '10', 2: 'MC', 3: '가이드마모', 4: '손가락끼임', 5: '상해' },
      3: { 2: 'MC', 3: '윤활부족' },
      4: { 2: 'MN', 3: '작업미숙' },
      5: { 3: '센서오류', 4: '정렬불량' },
      6: { 2: 'MC', 3: '지그마모' },
    }, ['D2:D4', 'D5:D6', 'E2:E6']); // FM 두 블록 + FE 전체 병합

    const chains = parseFCSheet(sheet);

    expect(chains.length).toBe(5);

    // FM1 (손가락끼임) → fmMergeSpan=3
    const fm1 = chains.filter(c => c.fmValue === '손가락끼임');
    expect(fm1.length).toBe(3);
    fm1.forEach(c => expect(c.fmMergeSpan).toBe(3));

    // FM2 (정렬불량) → fmMergeSpan=2
    const fm2 = chains.filter(c => c.fmValue === '정렬불량');
    expect(fm2.length).toBe(2);
    fm2.forEach(c => expect(c.fmMergeSpan).toBe(2));
  });

  it('병합 없는 FM → fmMergeSpan=1', () => {
    const sheet = createMockSheet({
      1: { 1: '공정번호', 3: '고장원인', 4: '고장형태', 5: '고장영향' },
      2: { 1: '10', 3: 'FC-1', 4: 'FM-1', 5: 'FE-1' },
      3: { 1: '10', 3: 'FC-2', 4: 'FM-2', 5: 'FE-1' },
    }); // 병합 없음

    const chains = parseFCSheet(sheet);

    expect(chains.length).toBe(2);
    chains.forEach(c => {
      expect(c.fmMergeSpan).toBe(1);
    });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. parseFCSheet — feMergeSpan 추출 검증
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('parseFCSheet: feMergeSpan 추출', () => {

  it('FE가 5행 병합 (FM 2개 포함) → 모든 사슬에 feMergeSpan=5', () => {
    // FE "상해" (E2:E6 병합, 5행)
    //   FM1 "손가락끼임" (D2:D4 병합, 3행) → FC 3개
    //   FM2 "정렬불량"   (D5:D6 병합, 2행) → FC 2개
    const sheet = createMockSheet({
      1: { 1: '공정번호', 2: '4M', 3: '고장원인', 4: '고장형태', 5: '고장영향' },
      2: { 1: '10', 2: 'MC', 3: '가이드마모', 4: '손가락끼임', 5: '상해' },
      3: { 2: 'MC', 3: '윤활부족' },
      4: { 2: 'MN', 3: '작업미숙' },
      5: { 3: '센서오류', 4: '정렬불량' },
      6: { 2: 'MC', 3: '지그마모' },
    }, ['D2:D4', 'D5:D6', 'E2:E6']);

    const chains = parseFCSheet(sheet);

    expect(chains.length).toBe(5);

    // ★ 모든 사슬에 feMergeSpan=5
    chains.forEach(c => {
      expect(c.feMergeSpan).toBe(5);
    });
  });

  it('FE 2건 — 서로 다른 병합 크기', () => {
    // FE1: "상해"     (E2:E4 병합, 3행)
    // FE2: "불량생산"  (E5:E6 병합, 2행)
    const sheet = createMockSheet({
      1: { 1: '공정번호', 2: '4M', 3: '고장원인', 4: '고장형태', 5: '고장영향' },
      2: { 1: '10', 3: 'FC-1', 4: 'FM-1', 5: '상해' },
      3: { 3: 'FC-2' },
      4: { 3: 'FC-3' },
      5: { 3: 'FC-4', 4: 'FM-2', 5: '불량생산' },
      6: { 3: 'FC-5' },
    }, ['D2:D4', 'E2:E4', 'E5:E6']);

    const chains = parseFCSheet(sheet);

    expect(chains.length).toBe(5);

    // FE="상해" 사슬 → feMergeSpan=3
    const fe1 = chains.filter(c => c.feValue === '상해');
    expect(fe1.length).toBe(3);
    fe1.forEach(c => expect(c.feMergeSpan).toBe(3));

    // FE="불량생산" 사슬 → feMergeSpan=2
    const fe2 = chains.filter(c => c.feValue === '불량생산');
    expect(fe2.length).toBe(2);
    fe2.forEach(c => expect(c.feMergeSpan).toBe(2));
  });

  it('병합 없는 FE → feMergeSpan=1', () => {
    const sheet = createMockSheet({
      1: { 1: '공정번호', 3: '고장원인', 4: '고장형태', 5: '고장영향' },
      2: { 1: '10', 3: 'FC-1', 4: 'FM-1', 5: 'FE-1' },
      3: { 1: '10', 3: 'FC-2', 4: 'FM-2', 5: 'FE-2' },
    });

    const chains = parseFCSheet(sheet);
    expect(chains.length).toBe(2);
    chains.forEach(c => {
      expect(c.feMergeSpan).toBe(1);
    });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. 완전한 시나리오 — DB중심의_고장연결구축.md 예시 재현
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('완전한 FC 시나리오 (docs 예시)', () => {

  it('docs/DB중심의_고장연결구축.md 1.1 예시 → 정확한 병합 정보 추출', () => {
    // 문서 예시 구조:
    //   공정10:
    //     FE "상해" (5행 병합 = 3+2)
    //       FM "손가락끼임" (3행 병합) → FC: 가이드마모, 윤활부족, 작업미숙
    //       FM "정렬불량"   (2행 병합) → FC: 센서오류, 지그마모
    const sheet = createMockSheet({
      1: { 1: '공정번호', 2: '4M', 3: '고장원인', 4: '고장형태', 5: '고장영향' },
      2: { 1: '10', 3: '가이드마모', 4: '손가락끼임', 5: '상해' },
      3: { 2: 'MC', 3: '윤활부족' },
      4: { 2: 'MN', 3: '작업미숙' },
      5: { 3: '센서오류', 4: '정렬불량' },
      6: { 2: 'MC', 3: '지그마모' },
    }, [
      'A2:A6',  // 공정번호 5행 병합
      'D2:D4',  // FM "손가락끼임" 3행 병합
      'D5:D6',  // FM "정렬불량" 2행 병합
      'E2:E6',  // FE "상해" 5행 병합
    ]);

    const chains = parseFCSheet(sheet);

    // 총 5건 (FC 5개)
    expect(chains.length).toBe(5);

    // ── 구조 검증 ──

    // 모든 사슬: processNo = "10"
    chains.forEach(c => expect(c.processNo).toBe('10'));

    // 모든 사슬: feValue = "상해", feMergeSpan = 5
    chains.forEach(c => {
      expect(c.feValue).toBe('상해');
      expect(c.feMergeSpan).toBe(5);
    });

    // FM "손가락끼임" → 3개 사슬, fmMergeSpan = 3
    const fm1 = chains.filter(c => c.fmValue === '손가락끼임');
    expect(fm1.length).toBe(3);
    fm1.forEach(c => expect(c.fmMergeSpan).toBe(3));
    expect(fm1.map(c => c.fcValue).sort()).toEqual(['가이드마모', '윤활부족', '작업미숙']);

    // FM "정렬불량" → 2개 사슬, fmMergeSpan = 2
    const fm2 = chains.filter(c => c.fmValue === '정렬불량');
    expect(fm2.length).toBe(2);
    fm2.forEach(c => expect(c.fmMergeSpan).toBe(2));
    expect(fm2.map(c => c.fcValue).sort()).toEqual(['센서오류', '지그마모']);

    // excelRow 순서 검증
    const excelRows = chains.map(c => c.excelRow);
    expect(excelRows).toEqual([2, 3, 4, 5, 6]);
  });

  it('다중 공정 + 병합 혼합 → 공정별 독립 병합 추출', () => {
    // 공정 10: FM 1개 (2행 병합) → FC 2개
    // 공정 20: FM 1개 (병합 없음) → FC 1개
    const sheet = createMockSheet({
      1: { 1: '공정번호', 2: '4M', 3: '고장원인', 4: '고장형태', 5: '고장영향' },
      2: { 1: '10', 2: 'MC', 3: 'FC-A', 4: 'FM-A', 5: 'FE-1' },
      3: { 2: 'MN', 3: 'FC-B' },
      4: { 1: '20', 2: 'MC', 3: 'FC-C', 4: 'FM-B', 5: 'FE-2' },
    }, [
      'A2:A3',  // 공정번호 10 병합
      'D2:D3',  // FM-A 2행 병합
      'E2:E3',  // FE-1 2행 병합
    ]);

    const chains = parseFCSheet(sheet);

    expect(chains.length).toBe(3);

    // 공정 10: fmMergeSpan=2, feMergeSpan=2
    const proc10 = chains.filter(c => c.processNo === '10');
    expect(proc10.length).toBe(2);
    proc10.forEach(c => {
      expect(c.fmMergeSpan).toBe(2);
      expect(c.feMergeSpan).toBe(2);
    });

    // 공정 20: fmMergeSpan=1, feMergeSpan=1
    const proc20 = chains.filter(c => c.processNo === '20');
    expect(proc20.length).toBe(1);
    expect(proc20[0].fmMergeSpan).toBe(1);
    expect(proc20[0].feMergeSpan).toBe(1);
  });
});
