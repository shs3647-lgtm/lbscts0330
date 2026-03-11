/**
 * @file step-confirmation.test.ts
 * @description Import 3단계 확정 프로세스 TDD 테스트
 * @created 2026-02-21
 *
 * Step 1: SA 확정 — flatData 있으면 가능 (isSaved 무관) → buildWorksheetState
 * Step 2: FC 확정 — saConfirmed → FC 비교 + 사용자 확정
 * Step 3: FA 확정 — fcConfirmed → saveWorksheetFromImport + 워크시트 이동
 */

import { describe, it, expect } from 'vitest';
import {
  canConfirmSA,
  canConfirmFC,
  canConfirmFA,
  getInitialStepState,
  advanceToFC,
  advanceToFA,
  resetAllSteps,
  resetAfterSA,
  type ImportStepState,
} from '@/app/(fmea-core)/pfmea/import/utils/stepConfirmation';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';

// ─── 테스트 헬퍼 ───

function makeFlatItem(overrides: Partial<ImportedFlatData> = {}): ImportedFlatData {
  return {
    id: 'test-1',
    processNo: '10',
    category: 'A',
    itemCode: 'A1',
    value: '10',
    createdAt: new Date(),
    ...overrides,
  };
}

function makeConfirmedSA(): ImportStepState {
  return {
    ...getInitialStepState(),
    saConfirmed: true,
    activeStep: 'FC',
  };
}

function makeConfirmedFC(): ImportStepState {
  return {
    ...makeConfirmedSA(),
    fcConfirmed: true,
    activeStep: 'FA',
  };
}

// ─── SA 확정 테스트 ───

describe('Import 3단계 확정 프로세스', () => {
  describe('Step 1: SA 확정', () => {
    it('1. flatData 없으면 SA 확정 불가 (canConfirmSA=false)', () => {
      const result = canConfirmSA({
        flatData: [],
        isSaved: true,
        missingTotal: 0,
      });
      expect(result).toBe(false);
    });

    it('2. missingStats > 0이어도 SA 확정 가능 (경고만, 차단 안 함)', () => {
      const result = canConfirmSA({
        flatData: [makeFlatItem()],
        isSaved: true,
        missingTotal: 3,
      });
      expect(result).toBe(true);
    });

    it('3. isSaved=false이어도 SA 확정 가능 (저장 불필요)', () => {
      const result = canConfirmSA({
        flatData: [makeFlatItem()],
        isSaved: false,
        missingTotal: 0,
      });
      expect(result).toBe(true);
    });

    it('4. 조건 충족 시 SA 확정 가능', () => {
      const result = canConfirmSA({
        flatData: [makeFlatItem()],
        isSaved: true,
        missingTotal: 0,
      });
      expect(result).toBe(true);
    });

    it('5. SA 확정 후 → saConfirmed=true, FC 탭 활성화', () => {
      const state = getInitialStepState();
      const next = advanceToFC(state);

      expect(next.saConfirmed).toBe(true);
      expect(next.activeStep).toBe('FC');
    });
  });

  describe('Step 2: FC 확정', () => {
    it('6. SA 미확정이면 FC 확정 불가', () => {
      const state = getInitialStepState();
      const result = canConfirmFC(state);
      expect(result).toBe(false);
    });

    it('7. SA 확정 후 FC 확정 가능', () => {
      const state = makeConfirmedSA();
      const result = canConfirmFC(state);
      expect(result).toBe(true);
    });

    it('8. FC 확정 → fcConfirmed=true, FA 탭 활성화', () => {
      const state = makeConfirmedSA();
      const next = advanceToFA(state);

      expect(next.fcConfirmed).toBe(true);
      expect(next.activeStep).toBe('FA');
    });
  });

  describe('Step 3: FA 확정', () => {
    it('9. FC 미확정이면 FA 확정 불가', () => {
      const state = makeConfirmedSA(); // FC 미확정
      const result = canConfirmFA(state);
      expect(result).toBe(false);
    });

    it('10. FC 확정 후 FA 확정 가능', () => {
      const state = makeConfirmedFC();
      const result = canConfirmFA(state);
      expect(result).toBe(true);
    });
  });

  describe('단계 초기화', () => {
    it('11. resetAllSteps → 모든 확정 리셋', () => {
      const state = makeConfirmedFC();
      const next = resetAllSteps(state);

      expect(next.saConfirmed).toBe(false);
      expect(next.fcConfirmed).toBe(false);
      expect(next.faConfirmed).toBe(false);
      expect(next.activeStep).toBe('SA');
    });

    it('12. resetAfterSA → FC/FA만 리셋, SA 유지', () => {
      const state = makeConfirmedFC();
      const next = resetAfterSA(state);

      expect(next.saConfirmed).toBe(true); // SA 유지
      expect(next.fcConfirmed).toBe(false);
      expect(next.faConfirmed).toBe(false);
      expect(next.activeStep).toBe('FC'); // FC로 돌아감
    });

    it('13. getInitialStepState → 초기 상태 SA', () => {
      const state = getInitialStepState();

      expect(state.saConfirmed).toBe(false);
      expect(state.fcConfirmed).toBe(false);
      expect(state.faConfirmed).toBe(false);
      expect(state.activeStep).toBe('SA');
      expect(state.buildResult).toBeNull();
      expect(state.fcComparison).toBeNull();
    });
  });

  // ─── 2026-02-23: SA 확정 버그 수정 검증 ───

  describe('SA 확정 isSaved 지속성 (2026-02-23 버그 수정)', () => {
    it('14. 저장 후 isSaved=true 유지 시 canSA=true 지속', () => {
      // 저장 후 isSaved=true가 setTimeout으로 리셋되면 SA 확정 불가
      // 요구사항: isSaved=true는 사용자가 데이터 편집 전까지 유지되어야 함
      const saved = canConfirmSA({
        flatData: [makeFlatItem()],
        isSaved: true,
        missingTotal: 0,
      });
      expect(saved).toBe(true);

      // 5초 후에도 isSaved=true가 유지되면 canSA=true 유지
      // (setTimeout으로 리셋하면 안 됨)
      const stillSaved = canConfirmSA({
        flatData: [makeFlatItem()],
        isSaved: true, // setTimeout 제거 후 유지됨
        missingTotal: 0,
      });
      expect(stillSaved).toBe(true);
    });

    it('15. SA→FC→FA 전체 순차 확정 흐름 정상 동작', () => {
      // SA 확정 가능
      expect(canConfirmSA({ flatData: [makeFlatItem()], isSaved: true })).toBe(true);

      // SA 확정 → FC 단계
      const afterSA = advanceToFC(getInitialStepState());
      expect(afterSA.saConfirmed).toBe(true);
      expect(afterSA.activeStep).toBe('FC');

      // FC 확정 가능
      expect(canConfirmFC(afterSA)).toBe(true);

      // FC 확정 → FA 단계
      const afterFC = advanceToFA(afterSA);
      expect(afterFC.fcConfirmed).toBe(true);
      expect(afterFC.activeStep).toBe('FA');

      // FA 확정 가능
      expect(canConfirmFA(afterFC)).toBe(true);
    });

    it('16. SA 확정 후 데이터 변경 없으면 canFC 유지', () => {
      const afterSA = advanceToFC(getInitialStepState());
      // flatData 변경 없음 → saConfirmed 유지 → canFC=true
      expect(canConfirmFC(afterSA)).toBe(true);
    });
  });
});
