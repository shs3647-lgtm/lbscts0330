/**
 * @file opus-validation-rules.test.ts
 * @description Opus 검증규칙 v1 — 6개 규칙 단위테스트
 *
 * V_FC_01: FC carry-forward 실패 감지 (공정번호 None 행)
 * V_FC_02: FC carry-forward 실패 — FE구분 None 행
 * V_FC_03: FC↔B4 키 매핑 — B4에 있는데 FC에 없음
 * V_FC_04: FC↔B4 키 매핑 — FC에 있는데 B4에 없음
 * V_L2_01: 공통공정(01) A4 필수
 * V_L2_02: 공통공정(01) A5 필수
 * V_FE_01: C4 FE가 FC에서 참조되지 않음 (고아 FE)
 * V_FE_02: FC FE가 C4에 미등록
 * V_B4_02: 고아 B4 — B1에 없는 m4의 B4
 *
 * @created 2026-03-10
 */

import { describe, it, expect } from 'vitest';
import {
  validateFC_CarryForward,
  validateFC_B4KeyMapping,
  validateL2_CommonProcess,
  validateFE_Orphan,
  validateB4_Orphan,
  type OpusValidationInput,
} from '@/app/(fmea-core)/pfmea/import/utils/opusValidationRules';

// ── V_FC_01/02: FC carry-forward 실패 감지 ──

describe('V_FC_01/02 — FC carry-forward 실패 감지', () => {
  it('1. 모든 행에 공정번호 있음 → 이슈 0건', () => {
    const fcRows = [
      { processNo: '10', feCategory: 'YP', fm: '파손', fc: '원인1' },
      { processNo: '20', feCategory: 'SP', fm: '변형', fc: '원인2' },
    ];
    const result = validateFC_CarryForward(fcRows);
    expect(result).toHaveLength(0);
  });

  it('2. 공정번호 None 행 2건 → V_FC_01 이슈 2건', () => {
    const fcRows = [
      { processNo: '10', feCategory: 'YP', fm: '파손', fc: '원인1' },
      { processNo: '', feCategory: 'SP', fm: '변형', fc: '원인2' },
      { processNo: null as unknown as string, feCategory: 'YP', fm: '균열', fc: '원인3' },
    ];
    const result = validateFC_CarryForward(fcRows);
    const fc01 = result.filter(r => r.rule === 'V_FC_01');
    expect(fc01.length).toBe(2);
  });

  it('3. FE구분 None 행 → V_FC_02 이슈', () => {
    const fcRows = [
      { processNo: '10', feCategory: '', fm: '파손', fc: '원인1' },
      { processNo: '20', feCategory: 'YP', fm: '변형', fc: '원인2' },
    ];
    const result = validateFC_CarryForward(fcRows);
    const fc02 = result.filter(r => r.rule === 'V_FC_02');
    expect(fc02.length).toBe(1);
  });
});

// ── V_FC_03/04: FC↔B4 키 매핑 양방향 검증 ──

describe('V_FC_03/04 — FC↔B4 키 매핑 양방향 검증', () => {
  it('4. 완전 일치 → 이슈 0건', () => {
    const input: OpusValidationInput = {
      fcKeys: new Set(['10|원인A', '20|원인B']),
      b4Keys: new Set(['10|원인A', '20|원인B']),
    };
    const result = validateFC_B4KeyMapping(input);
    expect(result).toHaveLength(0);
  });

  it('5. B4에 있는데 FC에 없음 → V_FC_03', () => {
    const input: OpusValidationInput = {
      fcKeys: new Set(['10|원인A']),
      b4Keys: new Set(['10|원인A', '20|원인C']),
    };
    const result = validateFC_B4KeyMapping(input);
    const fc03 = result.filter(r => r.rule === 'V_FC_03');
    expect(fc03.length).toBe(1);
    expect(fc03[0].message).toContain('20|원인C');
  });

  it('6. FC에 있는데 B4에 없음 → V_FC_04', () => {
    const input: OpusValidationInput = {
      fcKeys: new Set(['10|원인A', '30|원인D']),
      b4Keys: new Set(['10|원인A']),
    };
    const result = validateFC_B4KeyMapping(input);
    const fc04 = result.filter(r => r.rule === 'V_FC_04');
    expect(fc04.length).toBe(1);
    expect(fc04[0].message).toContain('30|원인D');
  });
});

// ── V_L2_01/02: 공통공정(01) A4/A5 필수 검증 ──

describe('V_L2_01/02 — 공통공정(01) A4/A5 필수 검증', () => {
  it('7. 공통공정 A4≥1, A5≥1 → 이슈 0건', () => {
    const processes = [
      { processNo: '01', a4Count: 2, a5Count: 3 },
      { processNo: '10', a4Count: 1, a5Count: 1 },
    ];
    const result = validateL2_CommonProcess(processes);
    expect(result).toHaveLength(0);
  });

  it('8. 공통공정 A4=0 → V_L2_01', () => {
    const processes = [
      { processNo: '01', a4Count: 0, a5Count: 3 },
    ];
    const result = validateL2_CommonProcess(processes);
    const l201 = result.filter(r => r.rule === 'V_L2_01');
    expect(l201.length).toBe(1);
  });

  it('9. 공통공정 A5=0 → V_L2_02', () => {
    const processes = [
      { processNo: '01', a4Count: 2, a5Count: 0 },
    ];
    const result = validateL2_CommonProcess(processes);
    const l202 = result.filter(r => r.rule === 'V_L2_02');
    expect(l202.length).toBe(1);
  });

  it('10. 공통공정 없음 → 이슈 0건 (공통공정 없으면 스킵)', () => {
    const processes = [
      { processNo: '10', a4Count: 1, a5Count: 1 },
    ];
    const result = validateL2_CommonProcess(processes);
    expect(result).toHaveLength(0);
  });

  it('11. 공통공정=00 패턴도 인식', () => {
    const processes = [
      { processNo: '00', a4Count: 0, a5Count: 0 },
    ];
    const result = validateL2_CommonProcess(processes);
    expect(result.length).toBe(2); // V_L2_01 + V_L2_02
  });
});

// ── V_FE_01/02: FE 정합성 (고아 FE / 미등록 FE) ──

describe('V_FE_01/02 — FE 정합성 검증', () => {
  it('12. 모든 FE 양방향 매칭 → 이슈 0건', () => {
    const c4FeTexts = ['지연', '오작동'];
    const fcFeTexts = ['지연', '오작동'];
    const result = validateFE_Orphan(c4FeTexts, fcFeTexts);
    expect(result).toHaveLength(0);
  });

  it('13. C4 FE가 FC 미참조 → V_FE_01 (고아 FE)', () => {
    const c4FeTexts = ['지연', '오작동', '파손'];
    const fcFeTexts = ['지연'];
    const result = validateFE_Orphan(c4FeTexts, fcFeTexts);
    const fe01 = result.filter(r => r.rule === 'V_FE_01');
    expect(fe01.length).toBe(1);
    expect(fe01[0].message).toContain('2건');
  });

  it('14. FC FE가 C4에 미등록 → V_FE_02', () => {
    const c4FeTexts = ['지연'];
    const fcFeTexts = ['지연', '화재', '침수'];
    const result = validateFE_Orphan(c4FeTexts, fcFeTexts);
    const fe02 = result.filter(r => r.rule === 'V_FE_02');
    expect(fe02.length).toBe(1);
    expect(fe02[0].message).toContain('2건');
  });
});

// ── V_B4_02: 고아 B4 검출 ──

describe('V_B4_02 — 고아 B4 검출', () => {
  it('15. 모든 B4의 m4가 B1에 존재 → 이슈 0건', () => {
    const b1M4Set = new Set(['MN', 'MT', 'IM']);
    const b4M4Set = new Set(['MN', 'MT']);
    const result = validateB4_Orphan('10', b1M4Set, b4M4Set);
    expect(result).toHaveLength(0);
  });

  it('16. B4 m4가 B1에 없음 → V_B4_02', () => {
    const b1M4Set = new Set(['MN']);
    const b4M4Set = new Set(['MN', 'IM', 'MT']);
    const result = validateB4_Orphan('10', b1M4Set, b4M4Set);
    const b402 = result.filter(r => r.rule === 'V_B4_02');
    expect(b402.length).toBe(2); // IM, MT
  });
});
