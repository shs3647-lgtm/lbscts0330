/**
 * @file deep-verify.test.ts
 * @description TDD RED → GREEN: deep-verify 엔진 42개 규칙 테스트
 *
 * mock 데이터로 DB 없이 순수 로직 테스트
 */
import { describe, it, expect } from 'vitest';
import {
  runDeepVerify,
  type DeepVerifyInput,
  type DeepVerifyResult,
} from '@/lib/fmea/deep-verify';

// ─── 정상 데이터 (ALL GREEN 기대) ───

function makeGoodData(): DeepVerifyInput {
  return {
    fmeaId: 'pfm26-test',
    l1Structure: { id: 'L1-STRUCT', fmeaId: 'pfm26-test', name: 'Test' },
    l1Functions: [
      { id: 'L1-R2-C2', fmeaId: 'pfm26-test', l1StructId: 'L1-STRUCT', category: 'YP', functionName: 'F1', requirement: 'R1' },
    ],
    l2Structures: [
      { id: 'L2-R2', fmeaId: 'pfm26-test', l1Id: 'L1-STRUCT', no: '01', name: 'P1', order: 0 },
    ],
    l2Functions: [
      { id: 'L2-R2-C4', fmeaId: 'pfm26-test', l2StructId: 'L2-R2', functionName: 'F1', productChar: 'PC1' },
    ],
    l3Structures: [
      { id: 'L3-R2', fmeaId: 'pfm26-test', l1Id: 'L1-STRUCT', l2Id: 'L2-R2', m4: 'MN', name: 'WE1', order: 0 },
    ],
    l3Functions: [
      { id: 'L3-R2-C5', fmeaId: 'pfm26-test', l3StructId: 'L3-R2', l2StructId: 'L2-R2', functionName: 'B2', processChar: 'B3' },
    ],
    processProductChars: [
      { id: 'L2-R2-C5', fmeaId: 'pfm26-test', l2StructId: 'L2-R2', name: 'PC1', orderIndex: 0 },
    ],
    failureEffects: [
      { id: 'L1-R2-C4', fmeaId: 'pfm26-test', l1FuncId: 'L1-R2-C2', category: 'YP', effect: 'FE1', severity: 5 },
    ],
    failureModes: [
      { id: 'L2-R2-C6', fmeaId: 'pfm26-test', l2FuncId: 'L2-R2-C4', l2StructId: 'L2-R2', productCharId: 'L2-R2-C5', mode: 'FM1' },
    ],
    failureCauses: [
      { id: 'L3-R2-C7', fmeaId: 'pfm26-test', l3FuncId: 'L3-R2-C5', l3StructId: 'L3-R2', l2StructId: 'L2-R2', cause: 'FC1' },
    ],
    failureLinks: [
      { id: 'FC-R2', fmeaId: 'pfm26-test', fmId: 'L2-R2-C6', feId: 'L1-R2-C4', fcId: 'L3-R2-C7' },
    ],
    riskAnalyses: [
      { id: 'FC-R2-RA', fmeaId: 'pfm26-test', linkId: 'FC-R2', severity: 5, occurrence: 3, detection: 4, ap: 'M', preventionControl: 'PC test', detectionControl: 'DC test' },
    ],
    publicSchemaData: null, // public 스키마 오염 없음
  };
}

// ─── A. DB 정합성 ───

describe('A. DB 정합성', () => {
  it('A1: 정상 데이터 → 에러 0건', () => {
    const r = runDeepVerify(makeGoodData());
    const dbErrors = r.categories.db.filter(c => c.level === 'error');
    expect(dbErrors.length).toBe(0);
  });

  it('A3: fmeaId 불일치 탐지', () => {
    const data = makeGoodData();
    data.failureModes[0].fmeaId = 'pfm26-wrong';
    const r = runDeepVerify(data);
    const mismatch = r.categories.db.find(c => c.code === 'A3');
    expect(mismatch).toBeDefined();
    expect(mismatch!.level).toBe('error');
    expect(mismatch!.count).toBeGreaterThan(0);
  });

  it('A4: 중복 ID 탐지', () => {
    const data = makeGoodData();
    data.failureCauses.push({ ...data.failureCauses[0] }); // 동일 ID 중복
    const r = runDeepVerify(data);
    const dup = r.categories.db.find(c => c.code === 'A4');
    expect(dup).toBeDefined();
    expect(dup!.count).toBeGreaterThan(0);
  });

  it('A5: FL의 필수 FK NULL 탐지', () => {
    const data = makeGoodData();
    data.failureLinks[0].fmId = '';
    const r = runDeepVerify(data);
    const nullFk = r.categories.db.find(c => c.code === 'A5');
    expect(nullFk).toBeDefined();
    expect(nullFk!.level).toBe('error');
  });

  it('A6: RA 수 ≠ FL 수 탐지', () => {
    const data = makeGoodData();
    data.riskAnalyses = []; // RA 0건인데 FL 1건
    const r = runDeepVerify(data);
    const ratio = r.categories.db.find(c => c.code === 'A6');
    expect(ratio).toBeDefined();
    expect(ratio!.level).toBe('error');
  });
});

// ─── B. UUID 일관성 ───

describe('B. UUID 일관성', () => {
  it('B1: 위치기반 UUID 정상 → 경고 없음', () => {
    const r = runDeepVerify(makeGoodData());
    const uuidErrors = r.categories.uuid.filter(c => c.level === 'error');
    expect(uuidErrors.length).toBe(0);
  });

  it('B2: mixed UUID 세대 경고', () => {
    const data = makeGoodData();
    // position-based + old genXxx 혼합
    data.failureModes[0].id = 'PF-L2-001-M-001'; // old genXxx 형식
    const r = runDeepVerify(data);
    const mixed = r.categories.uuid.find(c => c.code === 'B2');
    expect(mixed).toBeDefined();
    expect(mixed!.level).toBe('warning');
  });

  it('B3: 빈 UUID 탐지', () => {
    const data = makeGoodData();
    data.l3Structures[0].id = '';
    const r = runDeepVerify(data);
    const empty = r.categories.uuid.find(c => c.code === 'B3');
    expect(empty).toBeDefined();
    expect(empty!.level).toBe('error');
  });
});

// ─── C. FK 양방향 무결성 ───

describe('C. FK 양방향 무결성', () => {
  it('C1-C3: FL→FM/FE/FC 존재 (정상)', () => {
    const r = runDeepVerify(makeGoodData());
    const fwdErrors = r.categories.fk.filter(c => ['C1', 'C2', 'C3'].includes(c.code) && c.level === 'error');
    expect(fwdErrors.length).toBe(0);
  });

  it('C1: FL→FM 깨진 참조 탐지', () => {
    const data = makeGoodData();
    data.failureLinks[0].fmId = 'NONEXISTENT-FM';
    const r = runDeepVerify(data);
    const c1 = r.categories.fk.find(c => c.code === 'C1');
    expect(c1).toBeDefined();
    expect(c1!.level).toBe('error');
  });

  it('C4: orphan FM 탐지 (FL이 참조하지 않는 FM)', () => {
    const data = makeGoodData();
    // FM 2개인데 FL은 첫 번째만 참조
    data.failureModes.push({
      id: 'L2-R3-C6', fmeaId: 'pfm26-test', l2FuncId: 'L2-R2-C4',
      l2StructId: 'L2-R2', mode: 'FM2-orphan',
    });
    const r = runDeepVerify(data);
    const c4 = r.categories.fk.find(c => c.code === 'C4');
    expect(c4).toBeDefined();
    expect(c4!.count).toBe(1);
  });

  it('C5: orphan FE 탐지', () => {
    const data = makeGoodData();
    data.failureEffects.push({
      id: 'L1-R99-C4', fmeaId: 'pfm26-test', l1FuncId: 'L1-R2-C2',
      category: 'YP', effect: 'orphan FE', severity: 3,
    });
    const r = runDeepVerify(data);
    const c5 = r.categories.fk.find(c => c.code === 'C5');
    expect(c5).toBeDefined();
    expect(c5!.count).toBe(1);
  });

  it('C6: orphan FC 탐지', () => {
    const data = makeGoodData();
    data.failureCauses.push({
      id: 'L3-R99-C7', fmeaId: 'pfm26-test', l3FuncId: 'L3-R2-C5',
      l3StructId: 'L3-R2', l2StructId: 'L2-R2', cause: 'orphan FC',
    });
    const r = runDeepVerify(data);
    const c6 = r.categories.fk.find(c => c.code === 'C6');
    expect(c6).toBeDefined();
    expect(c6!.count).toBe(1);
  });

  it('C8: FM.productCharId 크로스공정 오염 탐지', () => {
    const data = makeGoodData();
    // PC는 L2-R2 소속인데 FM의 l2StructId가 다름
    data.failureModes[0].l2StructId = 'L2-R99'; // 다른 공정
    const r = runDeepVerify(data);
    const c8 = r.categories.fk.find(c => c.code === 'C8');
    expect(c8).toBeDefined();
    expect(c8!.level).toBe('error');
  });

  it('C10: L3.l2Id → 존재하는 L2 확인', () => {
    const data = makeGoodData();
    data.l3Structures[0].l2Id = 'L2-NONEXIST';
    const r = runDeepVerify(data);
    const c10 = r.categories.fk.find(c => c.code === 'C10');
    expect(c10).toBeDefined();
    expect(c10!.level).toBe('error');
  });
});

// ─── D. 렌더링 완전성 ───

describe('D. 렌더링 완전성', () => {
  it('D1: FM 있는데 FL 없음 = 빈 행 탐지', () => {
    const data = makeGoodData();
    data.failureLinks = []; // FL 삭제
    const r = runDeepVerify(data);
    const d1 = r.categories.render.find(c => c.code === 'D1');
    expect(d1).toBeDefined();
    expect(d1!.level).toBe('error');
    expect(d1!.count).toBe(1);
  });

  it('D2: FL 있는데 RA 없음 = SOD 빈칸', () => {
    const data = makeGoodData();
    data.riskAnalyses = [];
    const r = runDeepVerify(data);
    const d2 = r.categories.render.find(c => c.code === 'D2');
    expect(d2).toBeDefined();
    expect(d2!.level).toBe('error');
  });

  it('D3: RA severity=0 탐지', () => {
    const data = makeGoodData();
    data.riskAnalyses[0].severity = 0;
    const r = runDeepVerify(data);
    const d3 = r.categories.render.find(c => c.code === 'D3');
    expect(d3).toBeDefined();
    expect(d3!.level).toBe('warning');
  });

  it('D4: RA.detectionControl NULL 탐지', () => {
    const data = makeGoodData();
    data.riskAnalyses[0].detectionControl = undefined;
    const r = runDeepVerify(data);
    const d4 = r.categories.render.find(c => c.code === 'D4');
    expect(d4).toBeDefined();
  });

  it('D6: L2Structure 있는데 L2Function 없음', () => {
    const data = makeGoodData();
    data.l2Functions = [];
    const r = runDeepVerify(data);
    const d6 = r.categories.render.find(c => c.code === 'D6');
    expect(d6).toBeDefined();
    expect(d6!.level).toBe('warning');
  });

  it('D9: FM.mode 빈문자열 탐지', () => {
    const data = makeGoodData();
    data.failureModes[0].mode = '';
    const r = runDeepVerify(data);
    const d9 = r.categories.render.find(c => c.code === 'D9');
    expect(d9).toBeDefined();
    expect(d9!.level).toBe('error');
  });

  it('D10: FC.cause 빈문자열 탐지', () => {
    const data = makeGoodData();
    data.failureCauses[0].cause = '';
    const r = runDeepVerify(data);
    const d10 = r.categories.render.find(c => c.code === 'D10');
    expect(d10).toBeDefined();
    expect(d10!.level).toBe('error');
  });
});

// ─── E. 스키마 분리 ───

describe('E. 스키마 분리', () => {
  it('E1-E5: public 오염 없음 → 에러 0건', () => {
    const r = runDeepVerify(makeGoodData());
    const schemaErrors = r.categories.schema.filter(c => c.level === 'error');
    expect(schemaErrors.length).toBe(0);
  });

  it('E1: public.failure_modes 오염 탐지', () => {
    const data = makeGoodData();
    data.publicSchemaData = { failureModes: 3, failureLinks: 0, riskAnalyses: 0, l2Structures: 0, l3Structures: 0 };
    const r = runDeepVerify(data);
    const e1 = r.categories.schema.find(c => c.code === 'E1');
    expect(e1).toBeDefined();
    expect(e1!.level).toBe('error');
    expect(e1!.count).toBe(3);
  });
});

// ─── F. AP/SOD 정합성 ───

describe('F. AP/SOD 정합성', () => {
  it('F2: S=0인데 AP 값 있음', () => {
    const data = makeGoodData();
    data.riskAnalyses[0].severity = 0;
    data.riskAnalyses[0].ap = 'H';
    const r = runDeepVerify(data);
    const f2 = r.categories.ap.find(c => c.code === 'F2');
    expect(f2).toBeDefined();
    expect(f2!.level).toBe('warning');
  });

  it('F5: RA.severity ≠ FE.severity 불일치', () => {
    const data = makeGoodData();
    data.failureEffects[0].severity = 8; // FE severity=8
    data.riskAnalyses[0].severity = 5;   // RA severity=5 → 불일치
    const r = runDeepVerify(data);
    const f5 = r.categories.ap.find(c => c.code === 'F5');
    expect(f5).toBeDefined();
    expect(f5!.level).toBe('warning');
  });
});

// ─── 종합 ───

describe('종합', () => {
  it('정상 데이터 → allGreen', () => {
    const r = runDeepVerify(makeGoodData());
    expect(r.summary.errors).toBe(0);
  });

  it('renderingGaps 좌표 포함', () => {
    const data = makeGoodData();
    data.failureLinks = []; // FM은 있지만 FL 없음
    const r = runDeepVerify(data);
    expect(r.renderingGaps.length).toBeGreaterThan(0);
    expect(r.renderingGaps[0].table).toBe('FailureMode');
    expect(r.renderingGaps[0].id).toBe('L2-R2-C6');
    expect(r.renderingGaps[0].missingFields).toContain('FailureLink');
  });
});
