/**
 * @file fill-pcdc-from-import.test.ts
 * @description fillPCDCFromImport 유틸리티 TDD 검증 — v3.0
 *
 * ★ v3.0 변경 (Import 우선 + m4 친화도):
 *   - Import 항목: O/D 상한 없이 직접 사용 (사용자 실제 데이터)
 *   - Pool 항목: O≤4 / D≤4 상한 유지 (산업DB 추천)
 *   - m4 기반 PC 매칭: FC의 m4와 B5의 m4 우선 매칭
 *   - "외관검사"(D=8) Import → DC에 선택됨 (이전엔 거부)
 */

import { fillPCDCFromImport } from '../app/(fmea-core)/pfmea/worksheet/utils/fillPCDCFromImport';

const mkLink = (fmId: string, fcId: string, processNo: string, m4?: string) => ({ fmId, fcId, processNo, m4 });
const mkItem = (processNo: string, value: string, m4?: string) => ({ processNo, value, m4 });

describe('fillPCDCFromImport — v2.1 Import + Pool 최적화', () => {
  it('빈 riskData + Import B5/A6 → PC/DC 반영', () => {
    const links = [mkLink('fm1', 'fc1', '10')];
    const b5 = [mkItem('10', '정기 교육 훈련')];
    const a6 = [mkItem('10', '비전검사')];

    const result = fillPCDCFromImport({}, links, b5, a6);

    expect(result.pcFilledCount).toBe(1);
    expect(result.dcFilledCount).toBe(1);
    expect(result.updatedRiskData['prevention-fm1-fc1']).toBe('P:정기 교육 훈련');
    expect(result.updatedRiskData['detection-fm1-fc1']).toBe('D:비전검사');
  });

  it('이미 값이 있는 PC/DC는 덮어쓰지 않음', () => {
    const existing: Record<string, string | number> = {
      'prevention-fm1-fc1': 'P:기존값',
      'detection-fm1-fc1': 'D:기존DC',
    };
    const links = [mkLink('fm1', 'fc1', '10')];
    const b5 = [mkItem('10', '새 값')];
    const a6 = [mkItem('10', '새 DC')];

    const result = fillPCDCFromImport(existing, links, b5, a6);

    expect(result.pcFilledCount).toBe(0);
    expect(result.dcFilledCount).toBe(0);
    expect(result.updatedRiskData['prevention-fm1-fc1']).toBe('P:기존값');
    expect(result.updatedRiskData['detection-fm1-fc1']).toBe('D:기존DC');
  });

  it('processNo 불일치 시 반영하지 않음', () => {
    const links = [mkLink('fm1', 'fc1', '20')];
    const b5 = [mkItem('10', 'SPC 관리')];
    const a6 = [mkItem('10', '측정기 검사')];

    const result = fillPCDCFromImport({}, links, b5, a6);

    expect(result.pcFilledCount).toBe(0);
    expect(result.dcFilledCount).toBe(0);
  });

  it('★ v3.0: 교육→O=5 (사람 의존 — AIAG-VDA 보수적 기준)', () => {
    const links = [mkLink('fm1', 'fc1', '10')];
    const b5 = [mkItem('10', '정기 교육 훈련')];
    const a6 = [mkItem('10', '비전검사')];

    const result = fillPCDCFromImport({}, links, b5, a6);

    const oVal = Number(result.updatedRiskData['risk-fm1-fc1-O']);
    expect(oVal).toBe(5);
    expect(result.oEvaluatedCount).toBe(1);
  });

  it('인터록 PC → O=2 평가', () => {
    const links = [mkLink('fm1', 'fc1', '10')];
    const b5 = [mkItem('10', '인터록 자동차단')];
    const a6 = [mkItem('10', '비전검사')];

    const result = fillPCDCFromImport({}, links, b5, a6);

    expect(result.updatedRiskData['prevention-fm1-fc1']).toBe('P:인터록 자동차단');
    expect(Number(result.updatedRiskData['risk-fm1-fc1-O'])).toBe(2);
  });

  it('★ v3.1: 육안검사(D=8) Import → DC에 선택됨 (AIAG-VDA: MSA 미입증, 조건부합격)', () => {
    const links = [mkLink('fm1', 'fc1', '10')];
    const b5 = [mkItem('10', '교육')];
    const a6 = [mkItem('10', '육안검사')];

    const result = fillPCDCFromImport({}, links, b5, a6);

    // v3.1→v3.2: 육안검사 = 사람 의존 검출 → D=7 (AIAG-VDA: detectionRatingMap 기준)
    expect(result.dcFilledCount).toBe(1);
    expect(result.updatedRiskData['detection-fm1-fc1']).toBe('D:육안검사');
    expect(Number(result.updatedRiskData['risk-fm1-fc1-D'])).toBe(7);
  });

  it('★ v3.1: 비전검사(D=7)→ D값 설정됨 (AIAG-VDA: 기계기반 검출, MSA 미입증)', () => {
    const links = [mkLink('fm1', 'fc1', '10')];
    const b5 = [mkItem('10', 'SPC 관리')];
    const a6 = [mkItem('10', '비전검사')];

    const result = fillPCDCFromImport({}, links, b5, a6);

    expect(result.dcFilledCount).toBe(1);
    const dVal = Number(result.updatedRiskData['risk-fm1-fc1-D']);
    expect(dVal).toBe(7);
  });

  it('★ v2.1: 검교정→O=3 (PC로 이동)', () => {
    const links = [mkLink('fm1', 'fc1', '10')];
    const b5 = [mkItem('10', '검교정 주기 관리')];
    const a6 = [mkItem('10', 'EOL 검사기')];

    const result = fillPCDCFromImport({}, links, b5, a6);

    expect(result.updatedRiskData['prevention-fm1-fc1']).toBe('P:검교정 주기 관리');
    expect(Number(result.updatedRiskData['risk-fm1-fc1-O'])).toBe(3);
  });
});

describe('fillPCDCFromImport — 풀 기반 최적화', () => {
  it('★ v3.0: Import 있으면 Import 우선 (풀이 더 효과적이어도)', () => {
    const links = [mkLink('fm1', 'fc1', '10')];
    const b5 = [mkItem('10', '정기 교육 훈련')]; // O=5 (사람 의존)
    const a6 = [mkItem('10', '비전검사')];
    const b5Pool = [mkItem('', 'Poka-Yoke 에러프루프')]; // O=2

    const result = fillPCDCFromImport({}, links, b5, a6, b5Pool);

    // v3.0: Import 우선 → 교육 훈련(O=5) 선택 (Pool의 Poka-Yoke 무시)
    expect(result.updatedRiskData['prevention-fm1-fc1']).toBe('P:정기 교육 훈련');
    expect(Number(result.updatedRiskData['risk-fm1-fc1-O'])).toBe(5);
  });

  it('★ v2.1: Import가 더 효과적이면 Import 유지', () => {
    const links = [mkLink('fm1', 'fc1', '10')];
    const b5 = [mkItem('10', '인터록 자동차단')]; // O=2
    const a6 = [mkItem('10', '비전검사')];
    const b5Pool = [mkItem('', '정기 교육 훈련')]; // O=5

    const result = fillPCDCFromImport({}, links, b5, a6, b5Pool);

    expect(result.updatedRiskData['prevention-fm1-fc1']).toBe('P:인터록 자동차단');
    expect(Number(result.updatedRiskData['risk-fm1-fc1-O'])).toBe(2);
  });

  it('★ v3.0: Import 있으면 Import 우선, Pool은 Import 없을 때 사용', () => {
    const links = [mkLink('fm1', 'fc1', '10')];
    const b5 = [mkItem('10', 'SPC 관리')];
    const a6 = [mkItem('10', '육안검사')]; // Import D=8 (사람 의존)
    const a6Pool = [mkItem('', '바코드 스캐너')]; // Pool D=3

    const result = fillPCDCFromImport({}, links, b5, a6, undefined, a6Pool);

    // v3.1→v3.2: Import 우선 → 육안검사(D=7) 선택 (Pool 무시)
    expect(result.updatedRiskData['detection-fm1-fc1']).toBe('D:육안검사');
    expect(Number(result.updatedRiskData['risk-fm1-fc1-D'])).toBe(7);
  });
});

describe('fillPCDCFromImport — v3.0 Import 우선 + m4 매칭', () => {
  it('★ v3.1: Import 외관검사(D=8) 선택, Pool 육안검사(D=8) 거부', () => {
    const links = [mkLink('fm1', 'fc1', '10')];
    const b5 = [mkItem('10', 'SPC 관리')];
    const a6 = [mkItem('10', '외관검사')]; // Import D=8 (사람 의존)
    const a6Pool = [mkItem('', '육안검사')]; // Pool D=8 → cap으로 거부

    const result = fillPCDCFromImport({}, links, b5, a6, undefined, a6Pool);

    // Import 항목이 cap 없이 선택됨 (v3.2: 외관검사=D=7)
    expect(result.updatedRiskData['detection-fm1-fc1']).toBe('D:외관검사');
    expect(Number(result.updatedRiskData['risk-fm1-fc1-D'])).toBe(7);
  });

  it('★ v3.0: Import 캘리퍼(D=6) 선택됨 (이전엔 D>4 거부)', () => {
    const links = [mkLink('fm1', 'fc1', '10')];
    const b5 = [mkItem('10', 'SPC 관리')];
    const a6 = [mkItem('10', '캘리퍼 검사')]; // Import D=6

    const result = fillPCDCFromImport({}, links, b5, a6);

    expect(result.dcFilledCount).toBe(1);
    expect(result.updatedRiskData['detection-fm1-fc1']).toBe('D:캘리퍼 검사');
  });

  it('★ v3.0: m4=MN FC → m4=MN B5 우선 매칭', () => {
    const links = [mkLink('fm1', 'fc1', '10', 'MN')]; // FC가 MN(사람)
    const b5 = [
      mkItem('10', '설비 정기점검', 'MC'),  // MC(설비) 예방관리
      mkItem('10', '작업자 교육 훈련', 'MN'), // MN(사람) 예방관리 ← 이것 선택
    ];
    const a6 = [mkItem('10', '비전검사')];

    const result = fillPCDCFromImport({}, links, b5, a6);

    // m4 MN 매칭으로 '작업자 교육 훈련' 선택
    expect(result.updatedRiskData['prevention-fm1-fc1']).toBe('P:작업자 교육 훈련');
  });

  it('★ v3.0: m4 미매칭 시 processNo fallback', () => {
    const links = [mkLink('fm1', 'fc1', '10', 'EN')]; // FC가 EN(환경)
    const b5 = [
      mkItem('10', '설비 정기점검', 'MC'),  // MC만 있음
      mkItem('10', '작업자 교육 훈련', 'MN'), // MN만 있음
    ];
    const a6 = [mkItem('10', '비전검사')];

    const result = fillPCDCFromImport({}, links, b5, a6);

    // EN 매칭 실패 → processNo fallback → 첫 번째 항목 중 하나 선택
    expect(result.pcFilledCount).toBe(1);
    expect(result.updatedRiskData['prevention-fm1-fc1']).toBeDefined();
  });

  it('★ v3.0: Pool 항목은 여전히 O/D cap 적용', () => {
    const links = [mkLink('fm1', 'fc1', '10')];
    const b5: { processNo: string; value: string }[] = []; // Import 없음
    const a6: { processNo: string; value: string }[] = []; // Import 없음
    const b5Pool = [mkItem('', '작업 순서 배치')]; // 키워드 미매칭 → O=null → 거부
    const a6Pool = [mkItem('', '육안검사')]; // D=8 > D_CAP=4 → 거부

    const result = fillPCDCFromImport({}, links, b5, a6, b5Pool, a6Pool);

    // Pool 항목은 cap 적용으로 거부
    expect(result.pcFilledCount).toBe(0);
    expect(result.dcFilledCount).toBe(0);
  });
});

describe('fillPCDCFromImport — 여러 링크 동시 처리', () => {
  it('각 processNo별 import 데이터 매칭', () => {
    const links = [
      mkLink('fm1', 'fc1', '10'),
      mkLink('fm2', 'fc2', '20'),
    ];
    const b5 = [mkItem('10', '정기 교육 훈련'), mkItem('20', 'SPC 관리')];
    const a6 = [mkItem('10', '비전검사'), mkItem('20', 'EOL 검사기')];

    const result = fillPCDCFromImport({}, links, b5, a6);

    expect(result.pcFilledCount).toBe(2);
    expect(result.dcFilledCount).toBe(2);
    expect(result.updatedRiskData['prevention-fm1-fc1']).toBe('P:정기 교육 훈련');
    expect(result.updatedRiskData['prevention-fm2-fc2']).toBe('P:SPC 관리');
  });

  it('중복 B5 값은 하나만 반영', () => {
    const links = [mkLink('fm1', 'fc1', '10')];
    const b5 = [mkItem('10', '교육 훈련'), mkItem('10', '교육 훈련')];
    const a6 = [mkItem('10', '비전검사')];

    const result = fillPCDCFromImport({}, links, b5, a6);

    expect(result.pcFilledCount).toBe(1);
  });
});
