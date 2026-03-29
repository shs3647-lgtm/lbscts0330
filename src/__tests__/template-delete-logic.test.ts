/**
 * @file template-delete-logic.test.ts
 * @description 템플릿 삭제 로직 TDD 테스트
 * 13개 시나리오로 삭제 기능 완벽 검증
 */

import { buildCrossTab, collectDeleteIds } from '../../src/app/(fmea-core)/pfmea/import/utils/template-delete-logic';
import { generateManualTemplateData } from '../../src/app/(fmea-core)/pfmea/import/utils/template-data-generator';
import type { ImportedFlatData } from '../../src/app/(fmea-core)/pfmea/import/types';

// ─── 테스트 데이터 ───

function mkItem(
  id: string,
  processNo: string,
  category: 'A' | 'B' | 'C',
  itemCode: string,
  value: string,
  m4?: string,
  parentItemId?: string,
): ImportedFlatData {
  return { id, processNo, category, itemCode, value, m4, parentItemId, createdAt: new Date() };
}

/** INITIAL_SAMPLE_DATA 동일 구조 (3공정, 1작업요소, 3분류) */
const SAMPLE_DATA: ImportedFlatData[] = [
  // L2 (A) — 공정 10, 20, 30
  mkItem('s1','10','A','A1','10'), mkItem('s2','10','A','A2','파이프 절단'),
  mkItem('s3','10','A','A3','정밀 절단'), mkItem('s4','10','A','A4','절단 길이'),
  mkItem('s5','10','A','A5','길이 불량'), mkItem('s6','10','A','A6','길이 측정'),
  mkItem('s7','20','A','A1','20'), mkItem('s8','20','A','A2','프레임 용접'),
  mkItem('s9','20','A','A3','TIG 용접'), mkItem('s10','20','A','A4','용접강도'),
  mkItem('s11','20','A','A5','용접불량'), mkItem('s12','20','A','A6','외관검사'),
  mkItem('s13','30','A','A1','30'), mkItem('s14','30','A','A2','도장'),
  mkItem('s15','30','A','A3','분체 도장'), mkItem('s16','30','A','A4','도막 두께'),
  mkItem('s17','30','A','A5','도막 벗겨짐'), mkItem('s18','30','A','A6','두께 측정'),
  // L3 (B) — 공정10 MC 1건, 공정20 MN/MC 각1건
  mkItem('s19','10','B','B1','CNC 절단기','MC'), mkItem('s20','10','B','B2','정밀 절단','MC'),
  mkItem('s21','10','B','B3','절단 속도','MC'), mkItem('s22','10','B','B4','속도 이탈','MC'),
  mkItem('s23','10','B','B5','일상점검','MC'),
  mkItem('s24','20','B','B1','용접공','MN'), mkItem('s25','20','B','B2','TIG 용접 실행','MN'),
  mkItem('s26','20','B','B3','용접 전류','MN'), mkItem('s27','20','B','B4','전류 이탈','MN'),
  mkItem('s28','20','B','B5','용접공 교육','MN'),
  mkItem('s29','20','B','B1','용접 지그','MC'), mkItem('s30','20','B','B2','프레임 고정','MC'),
  mkItem('s31','20','B','B3','고정력','MC'), mkItem('s32','20','B','B4','고정 불량','MC'),
  mkItem('s33','20','B','B5','지그 점검','MC'),
  // L1 (C) — YP, SP, USER
  mkItem('c1','YP','C','C1','YP'), mkItem('c2','YP','C','C2','프레임 강도'),
  mkItem('c3','YP','C','C3','200MPa 이상'), mkItem('c4','YP','C','C4','재작업'),
  mkItem('c5','SP','C','C1','SP'), mkItem('c6','SP','C','C2','안전 주행'),
  mkItem('c7','SP','C','C3','5만km'), mkItem('c8','SP','C','C4','납기지연'),
  mkItem('c9','USER','C','C1','USER'), mkItem('c10','USER','C','C2','편안한 승차감'),
  mkItem('c11','USER','C','C3','안전 기준'), mkItem('c12','USER','C','C4','파손 사고'),
];

// ═══════════════════════════════════════
// 1. buildCrossTab 테스트
// ═══════════════════════════════════════

describe('buildCrossTab', () => {
  const ct = buildCrossTab(SAMPLE_DATA);

  test('1-1. A rows: 3공정 생성, 각 공정에 A1~A5 ID 매핑 (v3.0: A6 제거)', () => {
    expect(ct.aRows).toHaveLength(3);
    expect(ct.aRows.map(r => r.processNo)).toEqual(['10','20','30']);
    // 공정10의 _ids 검증 (A1~A5만)
    expect(ct.aRows[0]._ids.A1).toBe('s1');
    expect(ct.aRows[0]._ids.A5).toBe('s5');
    // 공정20의 _ids 검증
    expect(ct.aRows[1]._ids.A1).toBe('s7');
    expect(ct.aRows[1]._ids.A5).toBe('s11');
  });

  test('1-2. B rows: processNo+m4별 정확한 그룹핑 (3행, v3.0: B5 제거)', () => {
    expect(ct.bRows).toHaveLength(3);
    // 공정10-MC (B1~B4만)
    const row10MC = ct.bRows.find(r => r.processNo === '10' && r.m4 === 'MC');
    expect(row10MC).toBeDefined();
    expect(row10MC!._ids.B1).toBe('s19');
    expect(row10MC!._ids.B4).toBe('s22');
    // 공정20-MN
    const row20MN = ct.bRows.find(r => r.processNo === '20' && r.m4 === 'MN');
    expect(row20MN).toBeDefined();
    expect(row20MN!._ids.B1).toBe('s24');
    expect(row20MN!._ids.B4).toBe('s27');
    // 공정20-MC
    const row20MC = ct.bRows.find(r => r.processNo === '20' && r.m4 === 'MC');
    expect(row20MC).toBeDefined();
    expect(row20MC!._ids.B1).toBe('s29');
    expect(row20MC!._ids.B4).toBe('s32');
  });

  test('1-3. C rows: 3분류 생성, 각 분류에 C1~C4 ID 매핑', () => {
    expect(ct.cRows).toHaveLength(3);
    expect(ct.cRows.map(r => r.category)).toEqual(['YP','SP','USER']);
    expect(ct.cRows[0]._ids.C1).toBe('c1');
    expect(ct.cRows[0]._ids.C4).toBe('c4');
  });

  test('1-4. B rows: 같은 processNo의 다른 m4가 섞이지 않음', () => {
    const row20MN = ct.bRows.find(r => r.processNo === '20' && r.m4 === 'MN')!;
    const row20MC = ct.bRows.find(r => r.processNo === '20' && r.m4 === 'MC')!;
    // MN 행의 B2 = '용접공' 관련, MC 행의 B2 = '지그' 관련
    expect(row20MN.B2).toBe('TIG 용접 실행');
    expect(row20MC.B2).toBe('프레임 고정');
    // ID도 다름
    expect(row20MN._ids.B2).not.toBe(row20MC._ids.B2);
  });

  test('1-5. A6: 동일 공정에 여러 flat 행 → 고유값 줄바꿈 합침, _ids.A6는 첫 행', () => {
    const extra: ImportedFlatData[] = [
      mkItem('a6b', '10', 'A', 'A6', '두번째 검출'),
      mkItem('a6c', '10', 'A', 'A6', '길이 측정'), // 공정10 첫 A6과 동일 텍스트 → 1줄로 dedup
    ];
    const ct2 = buildCrossTab([...SAMPLE_DATA, ...extra]);
    const r10 = ct2.aRows.find(r => r.processNo === '10')!;
    expect(r10.A6).toBe('길이 측정\n두번째 검출');
    expect(r10._ids.A6).toBe('s6');
  });

  test('1-6. 동일 공정+M4 복수 B1: parentItemId 체인으로 B2~B4 정확히 매칭 (flat 순서와 무관)', () => {
    const a10: ImportedFlatData[] = [
      mkItem('a10-1', '10', 'A', 'A1', '10'),
      mkItem('a10-2', '10', 'A', 'A2', '공정명'),
      mkItem('a10-3', '10', 'A', 'A3', '기능'),
      mkItem('a10-4', '10', 'A', 'A4', '특성'),
      mkItem('a10-5', '10', 'A', 'A5', 'FM'),
      mkItem('a10-6', '10', 'A', 'A6', '검출'),
    ];
    // B1 순서: WE-B 먼저, WE-A 나중 — B2 flat은 A용이 먼저 오면 키 풀만 쓰면 오매칭됨
    const bFlat: ImportedFlatData[] = [
      mkItem('l3fn-a', '10', 'B', 'B2', '요소기능-A', 'MC', 'l3-a'),
      mkItem('l3fn-a-b3', '10', 'B', 'B3', '공정특성-A', 'MC', 'l3fn-a'),
      mkItem('l3fn-a-b4', '10', 'B', 'B4', '고장원인-A', 'MC', 'l3fn-a-b3'),
      mkItem('l3-b', '10', 'B', 'B1', '작업요소-B', 'MC'),
      mkItem('l3-a', '10', 'B', 'B1', '작업요소-A', 'MC'),
      mkItem('l3fn-b', '10', 'B', 'B2', '요소기능-B', 'MC', 'l3-b'),
      mkItem('l3fn-b-b3', '10', 'B', 'B3', '공정특성-B', 'MC', 'l3fn-b'),
      mkItem('l3fn-b-b4', '10', 'B', 'B4', '고장원인-B', 'MC', 'l3fn-b-b3'),
    ];
    const ct = buildCrossTab([...a10, ...bFlat]);
    expect(ct.bRows).toHaveLength(2);
    const rowA = ct.bRows.find(r => r.B1 === '작업요소-A')!;
    const rowB = ct.bRows.find(r => r.B1 === '작업요소-B')!;
    expect(rowA.B2).toBe('요소기능-A');
    expect(rowA.B3).toBe('공정특성-A');
    expect(rowA.B4).toBe('고장원인-A');
    expect(rowB.B2).toBe('요소기능-B');
    expect(rowB.B3).toBe('공정특성-B');
    expect(rowB.B4).toBe('고장원인-B');
  });
});

// ═══════════════════════════════════════
// 2. L2 삭제 테스트
// ═══════════════════════════════════════

describe('collectDeleteIds — L2 삭제', () => {
  const ct = buildCrossTab(SAMPLE_DATA);

  test('2-1. L2 단일 공정 삭제: A항목 6개 + 연동 B항목 삭제', () => {
    const result = collectDeleteIds('L2', ct, new Set([0]), SAMPLE_DATA); // 공정10 선택
    expect(result.blocked).toBe(false);
    // 공정10의 A항목 (s1~s6) + B항목 (s19~s23) = 11개
    expect(result.idsToDelete).toContain('s1');   // A1
    expect(result.idsToDelete).toContain('s6');   // A6
    expect(result.idsToDelete).toContain('s19');  // B1 (연동)
    expect(result.idsToDelete).toContain('s23');  // B5 (연동)
    expect(result.idsToDelete).toHaveLength(11);
  });

  test('2-2. L2 2공정 삭제: 각 공정의 A+B 항목 삭제', () => {
    const result = collectDeleteIds('L2', ct, new Set([0, 1]), SAMPLE_DATA); // 공정10,20 선택
    expect(result.blocked).toBe(false);
    // 공정10: A(6)+B(5)=11, 공정20: A(6)+B(10)=16 → 총 27
    expect(result.idsToDelete).toHaveLength(27);
    // 공정30의 A항목은 포함 안 됨
    expect(result.idsToDelete).not.toContain('s13');
  });

  test('2-3. L2 전체 삭제 허용 (기존 데이터 전체 선택 삭제 가능)', () => {
    const result = collectDeleteIds('L2', ct, new Set([0, 1, 2]), SAMPLE_DATA); // 전체 선택
    expect(result.blocked).toBe(false);
    // A 전체(18) + B 전체(15) = 33
    expect(result.idsToDelete).toHaveLength(33);
    // 모든 A 항목 포함
    expect(result.idsToDelete).toContain('s1');
    expect(result.idsToDelete).toContain('s18');
    // 모든 B 항목 포함 (연동 삭제)
    expect(result.idsToDelete).toContain('s19');
    expect(result.idsToDelete).toContain('s33');
    // C 항목은 미포함
    expect(result.idsToDelete).not.toContain('c1');
  });

  test('2-4. L2 삭제 시 C항목은 영향 없음', () => {
    const result = collectDeleteIds('L2', ct, new Set([0]), SAMPLE_DATA);
    // C 카테고리 ID는 포함 안 됨
    expect(result.idsToDelete).not.toContain('c1');
    expect(result.idsToDelete).not.toContain('c12');
  });
});

// ═══════════════════════════════════════
// 3. L3 삭제 테스트
// ═══════════════════════════════════════

describe('collectDeleteIds — L3 삭제', () => {
  const ct = buildCrossTab(SAMPLE_DATA);

  test('3-1. L3 단일 작업요소 삭제: B1~B5 전체 5개', () => {
    // 공정10-MC (bRows[0])
    const idx = ct.bRows.findIndex(r => r.processNo === '10' && r.m4 === 'MC');
    const result = collectDeleteIds('L3', ct, new Set([idx]), SAMPLE_DATA);
    expect(result.blocked).toBe(false);
    expect(result.idsToDelete).toContain('s19'); // B1
    expect(result.idsToDelete).toContain('s23'); // B5
    expect(result.idsToDelete).toHaveLength(5);
  });

  test('3-2. L3 m4 정밀 매칭: 같은 공정의 다른 m4는 삭제 안 됨', () => {
    // 공정20-MN만 선택
    const idx = ct.bRows.findIndex(r => r.processNo === '20' && r.m4 === 'MN');
    const result = collectDeleteIds('L3', ct, new Set([idx]), SAMPLE_DATA);
    expect(result.blocked).toBe(false);
    // MN 항목만 삭제 (s24~s28)
    expect(result.idsToDelete).toContain('s24');
    expect(result.idsToDelete).toContain('s28');
    // MC 항목은 삭제 안 됨 (s29~s33)
    expect(result.idsToDelete).not.toContain('s29');
    expect(result.idsToDelete).not.toContain('s33');
    expect(result.idsToDelete).toHaveLength(5);
  });

  test('3-3. L3 삭제 시 A항목은 영향 없음', () => {
    const idx = ct.bRows.findIndex(r => r.processNo === '10' && r.m4 === 'MC');
    const result = collectDeleteIds('L3', ct, new Set([idx]), SAMPLE_DATA);
    // A 카테고리 ID는 포함 안 됨
    expect(result.idsToDelete).not.toContain('s1');
    expect(result.idsToDelete).not.toContain('s6');
  });

  test('3-4. L3 빈값 B2~B5도 함께 삭제 (orphan 방지)', () => {
    // B2~B5가 빈값인 작업요소
    const dataWithEmpty = [
      ...SAMPLE_DATA.filter(d => d.category !== 'B' || d.processNo !== '10'),
      mkItem('e1','10','B','B1','작업요소명','MC'),
      mkItem('e2','10','B','B2','','MC'),  // 빈값
      mkItem('e3','10','B','B3','','MC'),  // 빈값
      mkItem('e4','10','B','B4','','MC'),  // 빈값
      mkItem('e5','10','B','B5','','MC'),  // 빈값
    ];
    const ct2 = buildCrossTab(dataWithEmpty);
    const idx = ct2.bRows.findIndex(r => r.processNo === '10' && r.m4 === 'MC');
    const result = collectDeleteIds('L3', ct2, new Set([idx]), dataWithEmpty);
    // 빈값 포함 5개 전부 삭제 (orphan 방지)
    expect(result.idsToDelete).toContain('e1');
    expect(result.idsToDelete).toContain('e2');
    expect(result.idsToDelete).toContain('e5');
    expect(result.idsToDelete).toHaveLength(5);
  });
});

// ═══════════════════════════════════════
// 4. L1 삭제 테스트
// ═══════════════════════════════════════

describe('collectDeleteIds — L1 삭제', () => {
  const ct = buildCrossTab(SAMPLE_DATA);

  test('4-1. L1 단일 분류 삭제: C1~C4 4개', () => {
    const result = collectDeleteIds('L1', ct, new Set([0]), SAMPLE_DATA); // YP 선택
    expect(result.blocked).toBe(false);
    expect(result.idsToDelete).toContain('c1');
    expect(result.idsToDelete).toContain('c4');
    expect(result.idsToDelete).toHaveLength(4);
  });

  test('4-2. L1 삭제 시 A/B항목 영향 없음', () => {
    const result = collectDeleteIds('L1', ct, new Set([0, 1]), SAMPLE_DATA);
    expect(result.idsToDelete).not.toContain('s1');
    expect(result.idsToDelete).not.toContain('s19');
  });
});

// ═══════════════════════════════════════
// 5. ID 불일치 시나리오 (crossTab _ids ≠ flatData)
// ═══════════════════════════════════════

describe('collectDeleteIds — ID 불일치 방어', () => {
  test('5-1. crossTab _ids가 flatData에 없어도 processNo fallback으로 삭제 성공', () => {
    // crossTab은 tpl-* ID, flatData는 s* ID
    const previewData = SAMPLE_DATA.map((d, i) => ({ ...d, id: `tpl-${i}` }));
    const ct = buildCrossTab(previewData); // tpl-* IDs
    // flatData는 원본 s* IDs
    const result = collectDeleteIds('L2', ct, new Set([0]), SAMPLE_DATA);
    expect(result.blocked).toBe(false);
    // processNo '10' fallback으로 s1~s6 + s19~s23 찾음
    expect(result.idsToDelete).toContain('s1');
    expect(result.idsToDelete).toContain('s23');
    expect(result.idsToDelete.length).toBeGreaterThan(0);
  });

  test('5-2. crossTab _ids가 flatData에 있으면 직접 수집', () => {
    const ct = buildCrossTab(SAMPLE_DATA); // 동일 ID
    const result = collectDeleteIds('L2', ct, new Set([0]), SAMPLE_DATA);
    // _ids 방법과 processNo 방법 모두 같은 결과
    expect(result.idsToDelete).toContain('s1');
    expect(result.idsToDelete).toContain('s6');
  });
});

// ═══════════════════════════════════════
// 6. 실제 삭제 적용 후 데이터 무결성
// ═══════════════════════════════════════

describe('삭제 적용 후 데이터 무결성', () => {
  test('6-1. L2 삭제 후 남은 데이터로 crossTab 재구성 가능', () => {
    const ct = buildCrossTab(SAMPLE_DATA);
    const result = collectDeleteIds('L2', ct, new Set([0]), SAMPLE_DATA);
    const remaining = SAMPLE_DATA.filter(d => !new Set(result.idsToDelete).has(d.id));
    const ct2 = buildCrossTab(remaining);
    // 공정 10 삭제 → 20, 30만 남음
    expect(ct2.aRows).toHaveLength(2);
    expect(ct2.aRows.map(r => r.processNo)).toEqual(['20','30']);
    // 공정10의 B행도 삭제 → 공정20의 B행만 남음
    expect(ct2.bRows).toHaveLength(2);
    expect(ct2.bRows.every(r => r.processNo === '20')).toBe(true);
    // C행은 그대로
    expect(ct2.cRows).toHaveLength(3);
  });

  test('6-2. L3 삭제 후 A항목과 C항목 온전', () => {
    const ct = buildCrossTab(SAMPLE_DATA);
    const idx = ct.bRows.findIndex(r => r.processNo === '20' && r.m4 === 'MN');
    const result = collectDeleteIds('L3', ct, new Set([idx]), SAMPLE_DATA);
    const remaining = SAMPLE_DATA.filter(d => !new Set(result.idsToDelete).has(d.id));
    const ct2 = buildCrossTab(remaining);
    // A행 그대로 3공정
    expect(ct2.aRows).toHaveLength(3);
    // B행: 공정10-MC, 공정20-MC만 남음 (공정20-MN 삭제)
    expect(ct2.bRows).toHaveLength(2);
    expect(ct2.bRows.find(r => r.processNo === '20' && r.m4 === 'MN')).toBeUndefined();
    expect(ct2.bRows.find(r => r.processNo === '20' && r.m4 === 'MC')).toBeDefined();
  });
});

// ═══════════════════════════════════════
// 7. 수동 템플릿 실제 데이터 L3 삭제 (스크린샷 재현)
// ═══════════════════════════════════════

describe('수동 템플릿 generateManualTemplateData — L3 삭제', () => {
  // 기본 설정: 3공정, commonMN=1, commonEN=1, perProcessMC=2 → B행 8개
  const templateData = generateManualTemplateData({
    processCount: 3,
    processNaming: 'number',
    commonMN: 1,
    commonEN: 1,
    perProcessMN: 0,
    perProcessMC: 2,
    perProcessIM: 0,
    perProcessEN: 0,
    exampleIndustry: 'sample-001',
  });

  test('7-0. 수동 템플릿 데이터 구조 확인', () => {
    const bItems = templateData.filter(d => d.category === 'B');
    const b1Items = bItems.filter(d => d.itemCode === 'B1');
    // 8개 B1: 공통MN(1) + 공통EN(1) + 공정별MC×2(6) = 8
    expect(b1Items).toHaveLength(8);
    // 전체 B = 8 × 5(B1~B5) = 40
    expect(bItems).toHaveLength(40);
  });

  test('7-1. crossTab bRows = 8행 생성 확인 (v3.0: B5 제거)', () => {
    const ct = buildCrossTab(templateData);
    expect(ct.bRows).toHaveLength(8);
    // 모든 bRow에 B1~B4 _ids 존재 (v3.0: B5 제거)
    ct.bRows.forEach(row => {
      expect(row._ids.B1).toBeTruthy();
      expect(row._ids.B2).toBeTruthy();
      expect(row._ids.B3).toBeTruthy();
      expect(row._ids.B4).toBeTruthy();
    });
  });

  test('7-2. L3 전체 8행 삭제: B항목 40개 전부 삭제 (삭제 안돼 버그 재현)', () => {
    const ct = buildCrossTab(templateData);
    const allRows = new Set(Array.from({ length: 8 }, (_, i) => i));
    const result = collectDeleteIds('L3', ct, allRows, templateData);
    expect(result.blocked).toBe(false);
    // B 전체 40개 삭제
    expect(result.idsToDelete.length).toBe(40);
    // A, C 항목 미포함
    const aIds = new Set(templateData.filter(d => d.category === 'A').map(d => d.id));
    const cIds = new Set(templateData.filter(d => d.category === 'C').map(d => d.id));
    result.idsToDelete.forEach(id => {
      expect(aIds.has(id)).toBe(false);
      expect(cIds.has(id)).toBe(false);
    });
  });

  test('7-3. L3 단일 행 삭제: 해당 processNo+m4의 B항목 5개만 삭제', () => {
    const ct = buildCrossTab(templateData);
    // 첫번째 행 (공통 MN) 선택
    const result = collectDeleteIds('L3', ct, new Set([0]), templateData);
    expect(result.blocked).toBe(false);
    expect(result.idsToDelete.length).toBe(5); // B1~B5
    // 삭제된 항목은 모두 processNo='00', m4='MN'
    const deleted = templateData.filter(d => result.idsToDelete.includes(d.id));
    deleted.forEach(d => {
      expect(d.processNo).toBe('00');
      expect(d.m4).toBe('MN');
    });
  });
});
