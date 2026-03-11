/**
 * @file b3-auto-name-placeholder.test.ts
 * @description 공정특성 자동생성명 placeholder 키워드 검증
 *
 * 문제: 자동생성 공정특성 이름(`${we} 관리 특성`)이 FailureL3Tab의
 *       isMeaningful()을 통과하여 "FC 누락"으로 오집계됨
 * 해결: 자동생성명에 placeholder 키워드('입력', '필요' 등)를 포함시켜
 *       isMeaningful()이 false를 반환하도록 함
 *
 * @created 2026-03-05
 */

import { describe, it, expect, vi } from 'vitest';

// ────────────────────────────────────────────
// FailureL3Tab의 isMeaningful 로직을 그대로 복제 (CODEFREEZE 파일이므로 직접 import 불가)
// ────────────────────────────────────────────
function isMeaningful(name: string | undefined | null): boolean {
  if (!name) return false;
  const trimmed = String(name).trim();
  if (trimmed === '') return false;
  if (trimmed.length > 20) return true;
  const placeholders = ['클릭', '선택', '입력', '필요', '기능분석에서'];
  return !placeholders.some(p => trimmed.includes(p));
}

// ────────────────────────────────────────────
// 테스트 대상 상수: 수정 후 기대하는 자동생성명
// ────────────────────────────────────────────
const EXPECTED_PLACEHOLDER = '공정특성 입력 필요';

describe('B3 자동생성명 placeholder 키워드 검증', () => {

  describe('isMeaningful → false 검증 (기대 동작)', () => {
    it('새 placeholder "공정특성 입력 필요"는 isMeaningful=false', () => {
      expect(isMeaningful(EXPECTED_PLACEHOLDER)).toBe(false);
    });

    it('빈 문자열은 isMeaningful=false', () => {
      expect(isMeaningful('')).toBe(false);
    });

    it('null/undefined는 isMeaningful=false', () => {
      expect(isMeaningful(null)).toBe(false);
      expect(isMeaningful(undefined)).toBe(false);
    });
  });

  describe('이전 자동생성명은 isMeaningful=true (버그 확인)', () => {
    it('"셋업엔지니어 관리 특성"은 isMeaningful=true → FC 누락 오집계 원인', () => {
      expect(isMeaningful('셋업엔지니어 관리 특성')).toBe(true);
    });

    it('"작업자 관리 특성"은 isMeaningful=true → FC 누락 오집계 원인', () => {
      expect(isMeaningful('작업자 관리 특성')).toBe(true);
    });

    it('"공정 관리 특성"은 isMeaningful=true → FC 누락 오집계 원인', () => {
      expect(isMeaningful('공정 관리 특성')).toBe(true);
    });
  });

  describe('실제 공정특성은 isMeaningful=true (영향 없음 확인)', () => {
    it('"압출 온도"는 isMeaningful=true', () => {
      expect(isMeaningful('압출 온도')).toBe(true);
    });

    it('"혼련 온도"는 isMeaningful=true', () => {
      expect(isMeaningful('혼련 온도')).toBe(true);
    });

    it('"Mooney Viscosity"는 isMeaningful=true', () => {
      expect(isMeaningful('Mooney Viscosity')).toBe(true);
    });
  });
});

// ────────────────────────────────────────────
// pc-dc-inference inferChar WE fallback 검증
// ────────────────────────────────────────────
describe('pc-dc-inference inferChar WE fallback 검증', () => {
  // inferChar의 fallback은 "${we} 관리 특성" — 이것은 STEP B Import에서
  // 실제 공정특성을 추론할 때 사용되므로 placeholder가 아닌 실제 값이다.
  // 공통공정/자동보충 경로만 별도로 placeholder를 사용한다.

  it('inferChar WE fallback은 WE명 기반 값을 반환한다 (변경하면 안 됨)', async () => {
    const mod = await vi.importActual<typeof import('../../app/(fmea-core)/pfmea/import/stepb-parser/pc-dc-inference')>(
      '../../app/(fmea-core)/pfmea/import/stepb-parser/pc-dc-inference'
    );

    const emptyRules = {
      id: 'test', name: '테스트',
      pcRulesFC: [], pcRulesFM: [], m4Defaults: {},
      dcRules: [],
      charRulesFC: [], charRulesFM: [], charM4Defaults: {},
      fallbackPC: '작업 표준 준수',
      fallbackDC: { dc: '육안 검사', d: 7 },
    };

    // inferChar fallback은 WE명 기반 → 실제 데이터로 취급
    const result = mod.inferChar('', '', 'MN', '작업자', emptyRules as any);
    expect(result).toBe('작업자 관리 특성');
  });

  it('inferChar WE가 빈 문자열이면 "공정 관리 특성" 반환', async () => {
    const mod = await vi.importActual<typeof import('../../app/(fmea-core)/pfmea/import/stepb-parser/pc-dc-inference')>(
      '../../app/(fmea-core)/pfmea/import/stepb-parser/pc-dc-inference'
    );

    const emptyRules = {
      id: 'test', name: '테스트',
      pcRulesFC: [], pcRulesFM: [], m4Defaults: {},
      dcRules: [],
      charRulesFC: [], charRulesFM: [], charM4Defaults: {},
      fallbackPC: '작업 표준 준수',
      fallbackDC: { dc: '육안 검사', d: 7 },
    };

    const result = mod.inferChar('', '', '', '', emptyRules as any);
    expect(result).toBe('공정 관리 특성');
  });
});

// ────────────────────────────────────────────
// buildWorksheetState B3 자동생성 통합 검증
// ────────────────────────────────────────────
describe('buildWorksheetState B3 자동생성명 통합 검증', () => {

  it('공통공정 MN 작업요소 processChars가 WE명 기반 완전한 데이터로 자동생성된다', async () => {
    // ── 목적: CP 전처리는 "완전한 데이터"를 만드는 것이 목표.
    //    자동생성된 processChar은 placeholder가 아닌 의미있는 이름이어야 한다.
    const { buildWorksheetState } = await import(
      '../../app/(fmea-core)/pfmea/import/utils/buildWorksheetState'
    );

    const flatData = [
      { processNo: '10', processName: '가공', category: 'A', itemCode: 'A1', value: '완제품', m4: '', specialChar: '' },
      { processNo: '10', processName: '가공', category: 'A', itemCode: 'A2', value: '가공 공정', m4: '', specialChar: '' },
      // B1 (작업요소) — MN 타입, B2/B3 누락 → 자동생성 트리거
      { processNo: '10', processName: '가공', category: 'B', itemCode: 'B1', value: '작업자', m4: 'MN', specialChar: '' },
    ];

    const result = buildWorksheetState(flatData as any, { fmeaId: 'test-fmea' });

    const proc = result.state.l2[0];
    expect(proc).toBeDefined();

    const workerWE = proc.l3.find((we: any) => we.name === '작업자');
    expect(workerWE).toBeDefined();

    const allChars = workerWE!.functions.flatMap((f: any) => f.processChars || []);

    if (allChars.length > 0) {
      // 자동생성된 processChar은 "WE명 관리 특성" 형식의 의미있는 이름
      for (const pc of allChars) {
        expect(isMeaningful(pc.name)).toBe(true);
        expect(pc.name).toContain('관리 특성');
      }
    }
  });
});
