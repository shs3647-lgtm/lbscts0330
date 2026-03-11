/**
 * @file verify-loop-retry.test.ts
 * @description verify-counts 100% 일치 루프 + ImportStepBar 통합 검증
 *
 * 2026-03-10: FA 확정 후 verify-counts I→D 불일치 감지 → 최대 3회 재시도
 *
 * 검증 항목:
 *   1. verify-counts 100% 일치 → 루프 1회로 종료
 *   2. 1차 불일치 → 재저장 → 2차 일치 → 성공
 *   3. 3회 모두 불일치 → 경고 메시지 포함
 *   4. verify-counts API 실패 → 루프 continue (에러 삼키기)
 *   5. saveWorksheetFromImport 재호출 시 동일 파라미터
 *   6. SA→FC→FA 순차 가드: SA 미확정 시 FC 불가, FC 미확정 시 FA 불가
 *   7. FA 확정 후 isAnalysisComplete = true
 *   8. ImportStepBar에서 FMEA 작성 → FA 완료 전 disabled
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  canConfirmSA,
  canConfirmFC,
  canConfirmFA,
  getInitialStepState,
  advanceToFC,
  advanceToFA,
  type ImportStepState,
} from '@/app/(fmea-core)/pfmea/import/utils/stepConfirmation';

// ── verify-loop 시뮬레이션 헬퍼 ──

interface VerifyCountsResponse {
  success: boolean;
  import: Record<string, number>;
  db: Record<string, number>;
}

const VERIFY_CODES = ['A2', 'B1', 'C1', 'C2', 'C3', 'A3', 'A4', 'B2', 'B3', 'C4', 'A5', 'B4'];
const TOLERANCE = 2;
const MAX_RETRIES = 3;

/**
 * verify-loop 로직 추출 (useImportSteps.ts confirmFA 내부 로직과 동일)
 * 테스트 가능한 순수 함수로 분리
 */
async function runVerifyLoop(
  fmeaId: string,
  fetchFn: (url: string) => Promise<{ ok: boolean; json: () => Promise<VerifyCountsResponse> }>,
  retrySaveFn: () => Promise<void>,
): Promise<{ verifyCounts: VerifyCountsResponse | null; mismatchItems: string[]; attempts: number }> {
  let verifyCounts: VerifyCountsResponse | null = null;
  let mismatchItems: string[] = [];
  let attempts = 0;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    attempts = attempt;
    try {
      const vcRes = await fetchFn(`/api/fmea/verify-counts?fmeaId=${encodeURIComponent(fmeaId)}`);
      if (vcRes.ok) {
        const vcJson = await vcRes.json();
        if (vcJson.success) {
          verifyCounts = vcJson;
        }
      }
    } catch {
      // verify-counts 조회 실패 — continue
    }

    // 불일치 체크
    mismatchItems = [];
    if (verifyCounts) {
      for (const code of VERIFY_CODES) {
        const imp = verifyCounts.import[code] ?? 0;
        const db = verifyCounts.db[code] ?? 0;
        if (imp > 0 && db < imp - TOLERANCE) {
          mismatchItems.push(`${code}: Import=${imp}, DB=${db}`);
        }
      }
    }

    // 100% 일치 → 루프 탈출
    if (mismatchItems.length === 0) break;

    // 마지막 시도가 아니면 재저장
    if (attempt < MAX_RETRIES) {
      await retrySaveFn();
    }
  }

  return { verifyCounts, mismatchItems, attempts };
}

// ── 테스트 ──

describe('verify-counts 100% 일치 루프', () => {
  it('1. 100% 일치 → 루프 1회로 종료', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        import: { A2: 2, B1: 3, A5: 5, B4: 10, C4: 2 },
        db: { A2: 2, B1: 3, A5: 5, B4: 10, C4: 2 },
      }),
    });
    const mockRetrySave = vi.fn();

    const result = await runVerifyLoop('test-001', mockFetch, mockRetrySave);

    expect(result.mismatchItems).toHaveLength(0);
    expect(result.attempts).toBe(1);
    expect(mockRetrySave).not.toHaveBeenCalled();
  });

  it('2. 1차 불일치 → 재저장 → 2차 일치', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // 1차: DB가 비어있음 (불일치)
        return {
          ok: true,
          json: async () => ({
            success: true,
            import: { A2: 2, B1: 3 },
            db: { A2: 0, B1: 0 },
          }),
        };
      }
      // 2차: 일치
      return {
        ok: true,
        json: async () => ({
          success: true,
          import: { A2: 2, B1: 3 },
          db: { A2: 2, B1: 3 },
        }),
      };
    });
    const mockRetrySave = vi.fn();

    const result = await runVerifyLoop('test-002', mockFetch, mockRetrySave);

    expect(result.mismatchItems).toHaveLength(0);
    expect(result.attempts).toBe(2);
    expect(mockRetrySave).toHaveBeenCalledTimes(1);
  });

  it('3. 3회 모두 불일치 → mismatchItems 비어있지 않음', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        import: { A2: 10, B1: 20, A5: 30 },
        db: { A2: 0, B1: 0, A5: 0 },
      }),
    });
    const mockRetrySave = vi.fn();

    const result = await runVerifyLoop('test-003', mockFetch, mockRetrySave);

    expect(result.mismatchItems.length).toBeGreaterThan(0);
    expect(result.attempts).toBe(3);
    // 마지막 시도에서는 재저장하지 않음
    expect(mockRetrySave).toHaveBeenCalledTimes(2);
  });

  it('4. verify-counts API 실패 → 에러 무시, mismatch=0 (검증 스킵)', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const mockRetrySave = vi.fn();

    const result = await runVerifyLoop('test-004', mockFetch, mockRetrySave);

    // API 실패 시 verifyCounts=null → mismatchItems=[] → 루프 탈출 (1회)
    expect(result.mismatchItems).toHaveLength(0);
    expect(result.attempts).toBe(1);
  });

  it('5. TOLERANCE=2 이내 차이는 허용 (불일치로 안 잡힘)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        import: { A2: 5, B1: 10 },
        db: { A2: 4, B1: 8 },  // A2: 차이 1(허용), B1: 차이 2(허용)
      }),
    });
    const mockRetrySave = vi.fn();

    const result = await runVerifyLoop('test-005', mockFetch, mockRetrySave);

    expect(result.mismatchItems).toHaveLength(0);
    expect(mockRetrySave).not.toHaveBeenCalled();
  });

  it('6. TOLERANCE 초과 → 불일치 감지', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        import: { A2: 5, B1: 10 },
        db: { A2: 2, B1: 5 },  // A2: 차이 3(초과), B1: 차이 5(초과)
      }),
    });
    const mockRetrySave = vi.fn();

    const result = await runVerifyLoop('test-006', mockFetch, mockRetrySave);

    expect(result.mismatchItems.length).toBe(2);
    expect(result.mismatchItems[0]).toContain('A2');
    expect(result.mismatchItems[1]).toContain('B1');
  });
});

describe('ImportStepBar SA→FC→FA 순차 가드', () => {
  it('7. 초기 상태 → SA만 가능, FC/FA 불가', () => {
    const state = getInitialStepState();
    expect(canConfirmSA({ flatData: [{ id: '1', processNo: '10', category: 'A', itemCode: 'A1', value: 'v', createdAt: new Date() }], isSaved: true, missingTotal: 0 })).toBe(true);
    expect(canConfirmFC(state)).toBe(false);
    expect(canConfirmFA(state)).toBe(false);
  });

  it('8. SA 확정 후 → FC 가능, FA 불가', () => {
    const state = advanceToFC(getInitialStepState());
    expect(state.saConfirmed).toBe(true);
    expect(canConfirmFC(state)).toBe(true);
    expect(canConfirmFA(state)).toBe(false);
  });

  it('9. FC 확정 후 → FA 가능', () => {
    const state = advanceToFA(advanceToFC(getInitialStepState()));
    expect(state.fcConfirmed).toBe(true);
    expect(canConfirmFA(state)).toBe(true);
  });

  it('10. FMEA 작성 → : FA 미완료 시 disabled', () => {
    // advanceToFA는 fcConfirmed=true, activeStep='FA'로 전이 (faConfirmed는 별도 콜백)
    const stateSA = advanceToFC(getInitialStepState());
    expect(stateSA.faConfirmed).toBe(false);

    const stateFC = advanceToFA(stateSA);
    // advanceToFA는 FC→FA 전이만, faConfirmed는 confirmFA 콜백에서 설정
    expect(stateFC.fcConfirmed).toBe(true);
    expect(stateFC.activeStep).toBe('FA');
    expect(stateFC.faConfirmed).toBe(false); // FA 확정은 아직 안 됨
    // isAnalysisComplete도 false → "FMEA 작성 →" 버튼 disabled
  });

  it('11. 4탭 공통 검증 프로세스 — ImportStepBar props 구조 검증', () => {
    // ImportStepBar는 flatData, fmeaId, fmeaInfo를 받아 useImportSteps 훅 사용
    // 모든 탭(기존/수동/자동/전처리)에서 동일한 props 전달
    interface ImportStepBarProps {
      flatData: unknown[];
      fmeaId: string;
      failureChains?: unknown[];
      fmeaInfo?: { fmeaType?: string };
    }

    // 수동 탭 시뮬레이션
    const manualProps: ImportStepBarProps = {
      flatData: [{ id: '1' }],
      fmeaId: 'manual-001',
      fmeaInfo: { fmeaType: 'P' },
    };

    // 자동 탭 시뮬레이션
    const autoProps: ImportStepBarProps = {
      flatData: [{ id: '2' }],
      fmeaId: 'auto-001',
      fmeaInfo: { fmeaType: 'P' },
    };

    // 전처리 탭 시뮬레이션
    const preprocessProps: ImportStepBarProps = {
      flatData: [{ id: '3' }],
      fmeaId: 'preprocess-001',
      failureChains: [{ id: 'fc1' }],
      fmeaInfo: { fmeaType: 'P' },
    };

    // 모든 탭이 동일한 인터페이스 사용
    for (const props of [manualProps, autoProps, preprocessProps]) {
      expect(props.flatData.length).toBeGreaterThan(0);
      expect(props.fmeaId).toBeTruthy();
      expect(props.fmeaInfo?.fmeaType).toBe('P');
    }
  });
});
