/**
 * @file cp-master-sync.test.ts
 * @description CP 워크시트 → 마스터 동기화 단위 테스트
 */
import { describe, it, expect } from 'vitest';
import { extractCpMasterFlatItems } from '@/app/api/control-plan/master/sync';
import type { CPWorksheetDB } from '@/app/(fmea-core)/control-plan/worksheet/schema';
import { createEmptyDB } from '@/app/(fmea-core)/control-plan/worksheet/schema';

function makeSampleDB(): CPWorksheetDB {
  const db = createEmptyDB('cp26-test');
  db.processes = [
    { id: 'p1', cpNo: 'cp26-test', processNo: '10', processName: '자재입고', level: 'Main', processDesc: '원자재 검수', equipment: '지게차, 입고대', sortOrder: 0 },
    { id: 'p2', cpNo: 'cp26-test', processNo: '20', processName: '수입검사', processDesc: '원부자재 검사', sortOrder: 1 },
  ];
  db.detectors = [
    { id: 'd1', cpNo: 'cp26-test', processNo: '10', processId: 'p1', ep: 'Poka-Yoke', autoDetector: '바코드 스캐너', sortOrder: 0 },
  ];
  db.controlItems = [
    { id: 'ci1', cpNo: 'cp26-test', processNo: '20', processId: 'p2', productChar: 'Mooney Viscosity', processChar: '검사 정밀도', specialChar: 'CC', spec: 'Mooney 50±5', sortOrder: 0 },
  ];
  db.controlMethods = [
    { id: 'cm1', cpNo: 'cp26-test', processNo: '20', processId: 'p2', evalMethod: 'Mooney Viscometer', sampleSize: 'n=5', frequency: '매Lot', owner1: '검사원', owner2: '품질팀장', sortOrder: 0 },
  ];
  db.reactionPlans = [
    { id: 'rp1', cpNo: 'cp26-test', processNo: '20', processId: 'p2', reactionPlan: '재검사, 불합격 시 반품', sortOrder: 0 },
  ];
  return db;
}

describe('extractCpMasterFlatItems', () => {
  it('공정현황 → A1~A5 매핑', () => {
    const db = makeSampleDB();
    const items = extractCpMasterFlatItems(db);

    const a1 = items.filter(i => i.itemCode === 'A1');
    expect(a1).toHaveLength(2);
    expect(a1.map(i => i.value)).toContain('10');
    expect(a1.map(i => i.value)).toContain('20');

    const a2 = items.filter(i => i.itemCode === 'A2');
    expect(a2).toHaveLength(2);
    expect(a2.map(i => i.value)).toContain('자재입고');

    expect(items.filter(i => i.itemCode === 'A3')).toHaveLength(1); // level=Main (공정 10만)
    expect(items.filter(i => i.itemCode === 'A4')).toHaveLength(2); // processDesc 2개
    expect(items.filter(i => i.itemCode === 'A5')).toHaveLength(1); // equipment 1개
  });

  it('검출장치 → A6, A7 매핑', () => {
    const db = makeSampleDB();
    const items = extractCpMasterFlatItems(db);

    const a6 = items.filter(i => i.itemCode === 'A6');
    expect(a6).toHaveLength(1);
    expect(a6[0].value).toBe('Poka-Yoke');

    const a7 = items.filter(i => i.itemCode === 'A7');
    expect(a7).toHaveLength(1);
    expect(a7[0].value).toBe('바코드 스캐너');
  });

  it('관리항목 → B1~B4 매핑', () => {
    const db = makeSampleDB();
    const items = extractCpMasterFlatItems(db);

    expect(items.find(i => i.itemCode === 'B1')?.value).toBe('Mooney Viscosity');
    expect(items.find(i => i.itemCode === 'B2')?.value).toBe('검사 정밀도');
    expect(items.find(i => i.itemCode === 'B3')?.value).toBe('CC');
    expect(items.find(i => i.itemCode === 'B4')?.value).toBe('Mooney 50±5');
  });

  it('관리방법 → B5~B9 매핑', () => {
    const db = makeSampleDB();
    const items = extractCpMasterFlatItems(db);

    expect(items.find(i => i.itemCode === 'B5')?.value).toBe('Mooney Viscometer');
    expect(items.find(i => i.itemCode === 'B6')?.value).toBe('n=5');
    expect(items.find(i => i.itemCode === 'B7')?.value).toBe('매Lot');
    expect(items.find(i => i.itemCode === 'B8')?.value).toBe('검사원');
    expect(items.find(i => i.itemCode === 'B9')?.value).toBe('품질팀장');
  });

  it('대응계획 → B10 매핑', () => {
    const db = makeSampleDB();
    const items = extractCpMasterFlatItems(db);

    const b10 = items.filter(i => i.itemCode === 'B10');
    expect(b10).toHaveLength(1);
    expect(b10[0].value).toBe('재검사, 불합격 시 반품');
  });

  it('빈 DB → 빈 배열 반환', () => {
    const db = createEmptyDB('cp26-empty');
    const items = extractCpMasterFlatItems(db);
    expect(items).toHaveLength(0);
  });

  it('빈 processNo는 스킵', () => {
    const db = createEmptyDB('cp26-test');
    db.processes = [
      { id: 'p1', cpNo: 'cp26-test', processNo: '', processName: '공정없음', sortOrder: 0 },
    ];
    const items = extractCpMasterFlatItems(db);
    expect(items).toHaveLength(0);
  });

  it('빈 value 필드는 스킵', () => {
    const db = createEmptyDB('cp26-test');
    db.processes = [
      { id: 'p1', cpNo: 'cp26-test', processNo: '10', processName: '입고', sortOrder: 0 },
    ];
    db.controlItems = [
      { id: 'ci1', cpNo: 'cp26-test', processNo: '10', processId: 'p1', productChar: '', processChar: '', sortOrder: 0 },
    ];
    const items = extractCpMasterFlatItems(db);
    // A1(10), A2(입고)만 생성, 빈 productChar/processChar는 스킵
    expect(items.filter(i => i.itemCode === 'B1')).toHaveLength(0);
    expect(items.filter(i => i.itemCode === 'B2')).toHaveLength(0);
  });

  // ── 추가 테스트 케이스 (2026-03-05) ──

  it('중복 소스 행 → 중복 출력 (dedup은 DB 레이어 담당)', () => {
    const db = createEmptyDB('cp26-dup');
    db.processes = [
      { id: 'p1', cpNo: 'cp26-dup', processNo: '10', processName: '입고', sortOrder: 0 },
    ];
    // 동일 processNo/itemCode/value 조합이 2행 존재
    db.controlItems = [
      { id: 'ci1', cpNo: 'cp26-dup', processNo: '10', processId: 'p1', productChar: '인장강도', sortOrder: 0 },
      { id: 'ci2', cpNo: 'cp26-dup', processNo: '10', processId: 'p1', productChar: '인장강도', sortOrder: 1 },
    ];
    const items = extractCpMasterFlatItems(db);
    // extractCpMasterFlatItems는 raw 추출 → 중복 제거하지 않음
    const b1 = items.filter(i => i.itemCode === 'B1');
    expect(b1).toHaveLength(2);
    expect(b1[0].value).toBe('인장강도');
    expect(b1[1].value).toBe('인장강도');
  });

  it('앞뒤 공백 trim 처리', () => {
    const db = createEmptyDB('cp26-trim');
    db.processes = [
      { id: 'p1', cpNo: 'cp26-trim', processNo: '10', processName: '  성형  ', sortOrder: 0 },
    ];
    db.controlItems = [
      { id: 'ci1', cpNo: 'cp26-trim', processNo: '10', processId: 'p1', productChar: ' 경도 ', processChar: '\t두께\t', spec: '  50±3  ', sortOrder: 0 },
    ];
    db.controlMethods = [
      { id: 'cm1', cpNo: 'cp26-trim', processNo: '10', processId: 'p1', evalMethod: '  경도계  ', sampleSize: ' n=3 ', sortOrder: 0 },
    ];
    const items = extractCpMasterFlatItems(db);

    // processName 공백 제거
    expect(items.find(i => i.itemCode === 'A2')?.value).toBe('성형');
    // controlItems 공백 제거
    expect(items.find(i => i.itemCode === 'B1')?.value).toBe('경도');
    expect(items.find(i => i.itemCode === 'B2')?.value).toBe('두께');
    expect(items.find(i => i.itemCode === 'B4')?.value).toBe('50±3');
    // controlMethods 공백 제거
    expect(items.find(i => i.itemCode === 'B5')?.value).toBe('경도계');
    expect(items.find(i => i.itemCode === 'B6')?.value).toBe('n=3');
  });

  it('B1~B10 전체 카테고리 통합 매핑', () => {
    const db = createEmptyDB('cp26-full');
    db.processes = [
      { id: 'p1', cpNo: 'cp26-full', processNo: '30', processName: '사출', sortOrder: 0 },
    ];
    db.controlItems = [
      { id: 'ci1', cpNo: 'cp26-full', processNo: '30', processId: 'p1', productChar: '외관', processChar: '사출압력', specialChar: 'SC', spec: '120±10 bar', sortOrder: 0 },
    ];
    db.controlMethods = [
      { id: 'cm1', cpNo: 'cp26-full', processNo: '30', processId: 'p1', evalMethod: '압력게이지', sampleSize: 'n=1', frequency: '매시간', owner1: '작업자', owner2: '반장', sortOrder: 0 },
    ];
    db.reactionPlans = [
      { id: 'rp1', cpNo: 'cp26-full', processNo: '30', processId: 'p1', reactionPlan: '라인 정지 후 조정', sortOrder: 0 },
    ];

    const items = extractCpMasterFlatItems(db);

    // B1~B10 모두 존재하는지 확인
    const bItems = items.filter(i => i.category === 'B');
    const bCodes = bItems.map(i => i.itemCode).sort();
    expect(bCodes).toEqual(['B1', 'B10', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9']);

    // 각 값 정확성 검증
    expect(bItems.find(i => i.itemCode === 'B1')?.value).toBe('외관');
    expect(bItems.find(i => i.itemCode === 'B2')?.value).toBe('사출압력');
    expect(bItems.find(i => i.itemCode === 'B3')?.value).toBe('SC');
    expect(bItems.find(i => i.itemCode === 'B4')?.value).toBe('120±10 bar');
    expect(bItems.find(i => i.itemCode === 'B5')?.value).toBe('압력게이지');
    expect(bItems.find(i => i.itemCode === 'B6')?.value).toBe('n=1');
    expect(bItems.find(i => i.itemCode === 'B7')?.value).toBe('매시간');
    expect(bItems.find(i => i.itemCode === 'B8')?.value).toBe('작업자');
    expect(bItems.find(i => i.itemCode === 'B9')?.value).toBe('반장');
    expect(bItems.find(i => i.itemCode === 'B10')?.value).toBe('라인 정지 후 조정');
  });

  it('여러 공정 동시 처리 — processNo별 독립 매핑', () => {
    const db = createEmptyDB('cp26-multi');
    db.processes = [
      { id: 'p1', cpNo: 'cp26-multi', processNo: '10', processName: '원재료입고', processDesc: '원자재 수입검사', sortOrder: 0 },
      { id: 'p2', cpNo: 'cp26-multi', processNo: '20', processName: '가공', processDesc: 'CNC 가공', sortOrder: 1 },
      { id: 'p3', cpNo: 'cp26-multi', processNo: '30', processName: '열처리', processDesc: '침탄 열처리', sortOrder: 2 },
    ];
    db.controlItems = [
      { id: 'ci1', cpNo: 'cp26-multi', processNo: '10', processId: 'p1', productChar: '외관', sortOrder: 0 },
      { id: 'ci2', cpNo: 'cp26-multi', processNo: '20', processId: 'p2', productChar: '치수', processChar: '절삭속도', sortOrder: 0 },
      { id: 'ci3', cpNo: 'cp26-multi', processNo: '30', processId: 'p3', productChar: '경도', sortOrder: 0 },
    ];
    db.reactionPlans = [
      { id: 'rp1', cpNo: 'cp26-multi', processNo: '10', processId: 'p1', reactionPlan: '반품', sortOrder: 0 },
      { id: 'rp2', cpNo: 'cp26-multi', processNo: '30', processId: 'p3', reactionPlan: '재열처리', sortOrder: 0 },
    ];

    const items = extractCpMasterFlatItems(db);

    // 3개 공정 모두 A1 생성
    const a1 = items.filter(i => i.itemCode === 'A1');
    expect(a1).toHaveLength(3);
    expect(a1.map(i => i.processNo).sort()).toEqual(['10', '20', '30']);

    // 공정별 processName 매핑 확인
    const a2 = items.filter(i => i.itemCode === 'A2');
    expect(a2).toHaveLength(3);
    expect(a2.map(i => i.value).sort()).toEqual(['가공', '열처리', '원재료입고']);

    // 공정 10: B1=외관, B10=반품
    const p10B1 = items.filter(i => i.processNo === '10' && i.itemCode === 'B1');
    expect(p10B1).toHaveLength(1);
    expect(p10B1[0].value).toBe('외관');
    const p10B10 = items.filter(i => i.processNo === '10' && i.itemCode === 'B10');
    expect(p10B10).toHaveLength(1);
    expect(p10B10[0].value).toBe('반품');

    // 공정 20: B1=치수, B2=절삭속도 (B10 없음)
    const p20B1 = items.filter(i => i.processNo === '20' && i.itemCode === 'B1');
    expect(p20B1).toHaveLength(1);
    expect(p20B1[0].value).toBe('치수');
    const p20B2 = items.filter(i => i.processNo === '20' && i.itemCode === 'B2');
    expect(p20B2).toHaveLength(1);
    expect(p20B2[0].value).toBe('절삭속도');
    expect(items.filter(i => i.processNo === '20' && i.itemCode === 'B10')).toHaveLength(0);

    // 공정 30: B1=경도, B10=재열처리
    const p30B1 = items.filter(i => i.processNo === '30' && i.itemCode === 'B1');
    expect(p30B1).toHaveLength(1);
    expect(p30B1[0].value).toBe('경도');
    const p30B10 = items.filter(i => i.processNo === '30' && i.itemCode === 'B10');
    expect(p30B10).toHaveLength(1);
    expect(p30B10[0].value).toBe('재열처리');
  });
});
