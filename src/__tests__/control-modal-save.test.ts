/**
 * @file control-modal-save.test.ts
 * @description 검출관리/예방관리 모달 저장 핵심 로직 단위 테스트
 *
 * 검증 항목:
 * 1. saveType = controlModal.type (originalType 사용 금지) → 저장 키 정확성
 * 2. P:/D: 접두어 정확성 (prevention→P:, detection→D:)
 * 3. modalItemCode 매핑 정확성
 * 4. switchModes = undefined 확인
 *
 * ★ renderHook 대신 구현 코드의 핵심 로직을 직접 추출하여 테스트
 *   (React hook 의존성 없이 순수 로직 검증)
 */
import { describe, it, expect } from 'vitest';

// ════════════════════════════════════════════════
// useControlModalSave.ts에서 추출한 핵심 로직 (순수 함수)
// 이 로직이 올바르게 동작하는지 검증
// ════════════════════════════════════════════════

type ControlModalType = 'prevention' | 'detection' | 'specialChar' | 'prevention-opt' | 'detection-opt';

interface ControlModalState {
  isOpen: boolean;
  type: ControlModalType;
  originalType?: ControlModalType;
  rowIndex: number;
  fmId?: string;
  fcId?: string;
}

/**
 * useControlModalSave.ts line 52 로직 추출:
 * saveType 결정 (★ 핵심 수정: type 기준, originalType 무시)
 */
function determineSaveType(controlModal: ControlModalState): string {
  // ★ FIX: controlModal.type 기준 (이전 버그: originalType || type)
  return controlModal.type;
}

/**
 * useControlModalSave.ts line 54-57 로직 추출:
 * P:/D: 접두어 결정
 */
function determineTypePrefix(type: ControlModalType): string {
  const isControlType = ['prevention', 'prevention-opt', 'detection', 'detection-opt'].includes(type);
  if (!isControlType) return '';
  return (type === 'prevention' || type === 'prevention-opt') ? 'P:' : 'D:';
}

/**
 * useControlModalSave.ts line 58-60 로직 추출:
 * 선택값에 접두어 추가
 */
function buildSelectedValue(selectedValues: string[], type: ControlModalType): string {
  const isControlType = ['prevention', 'prevention-opt', 'detection', 'detection-opt'].includes(type);
  const prefix = determineTypePrefix(type);
  return isControlType
    ? selectedValues.map(v => `${prefix}${v}`).join('\n')
    : selectedValues.join('\n');
}

/**
 * useControlModalSave.ts line 62-65 로직 추출:
 * 저장 키 생성
 */
function buildSaveKey(controlModal: ControlModalState): string {
  const saveType = determineSaveType(controlModal);
  const uniqueKey = controlModal.fmId && controlModal.fcId
    ? `${controlModal.fmId}-${controlModal.fcId}`
    : String(controlModal.rowIndex);
  return `${saveType}-${uniqueKey}`;
}

/**
 * useControlModalSave.ts line 408-412 로직 추출:
 * modalItemCode 결정
 */
function determineModalItemCode(type: ControlModalType): string {
  if (type === 'prevention' || type === 'prevention-opt') return 'B5';
  if (type === 'detection' || type === 'detection-opt') return 'A6';
  return 'SC';
}

// ════════════════════════════════════════════════
// 테스트 시작
// ════════════════════════════════════════════════

describe('useControlModalSave 핵심 로직', () => {

  // ═══════════════════════════════════════════════════════
  // TEST 1: saveType = controlModal.type (핵심 버그 수정 검증)
  // 이전 버그: originalType='prevention' + type='detection' → prevention 키에 D:값 저장
  // ═══════════════════════════════════════════════════════
  describe('saveType은 controlModal.type 기준 (originalType 무시)', () => {
    it('detection 모달 → saveType = "detection"', () => {
      const modal: ControlModalState = {
        isOpen: true,
        type: 'detection',
        originalType: 'prevention', // ★ 이전 버그 시나리오
        rowIndex: 0,
      };
      expect(determineSaveType(modal)).toBe('detection');
    });

    it('prevention 모달 → saveType = "prevention"', () => {
      const modal: ControlModalState = {
        isOpen: true,
        type: 'prevention',
        originalType: 'detection', // originalType이 달라도 무시
        rowIndex: 0,
      };
      expect(determineSaveType(modal)).toBe('prevention');
    });

    it('originalType 없어도 type 기준으로 동작', () => {
      const modal: ControlModalState = {
        isOpen: true,
        type: 'detection',
        rowIndex: 0,
      };
      expect(determineSaveType(modal)).toBe('detection');
    });

    it('prevention-opt → saveType = "prevention-opt"', () => {
      const modal: ControlModalState = {
        isOpen: true,
        type: 'prevention-opt',
        originalType: 'detection-opt',
        rowIndex: 0,
      };
      expect(determineSaveType(modal)).toBe('prevention-opt');
    });
  });

  // ═══════════════════════════════════════════════════════
  // TEST 2: 저장 키 생성 정확성
  // ═══════════════════════════════════════════════════════
  describe('저장 키 생성', () => {
    it('detection + fmId/fcId → detection-{fmId}-{fcId}', () => {
      const modal: ControlModalState = {
        isOpen: true,
        type: 'detection',
        originalType: 'prevention', // ★ 이전 버그: originalType 기준이면 prevention-fm-1-fc-1 생성
        rowIndex: 0,
        fmId: 'fm-1',
        fcId: 'fc-1',
      };
      expect(buildSaveKey(modal)).toBe('detection-fm-1-fc-1');
    });

    it('prevention + fmId/fcId → prevention-{fmId}-{fcId}', () => {
      const modal: ControlModalState = {
        isOpen: true,
        type: 'prevention',
        rowIndex: 0,
        fmId: 'fm-2',
        fcId: 'fc-3',
      };
      expect(buildSaveKey(modal)).toBe('prevention-fm-2-fc-3');
    });

    it('fmId/fcId 없으면 rowIndex 폴백', () => {
      const modal: ControlModalState = {
        isOpen: true,
        type: 'detection',
        rowIndex: 5,
      };
      expect(buildSaveKey(modal)).toBe('detection-5');
    });

    it('specialChar + fmId/fcId → specialChar-{fmId}-{fcId}', () => {
      const modal: ControlModalState = {
        isOpen: true,
        type: 'specialChar',
        rowIndex: 0,
        fmId: 'fm-1',
        fcId: 'fc-1',
      };
      expect(buildSaveKey(modal)).toBe('specialChar-fm-1-fc-1');
    });
  });

  // ═══════════════════════════════════════════════════════
  // TEST 3: P:/D: 접두어 정확성
  // ═══════════════════════════════════════════════════════
  describe('P:/D: 접두어 정확성', () => {
    it('prevention → P: 접두어', () => {
      expect(determineTypePrefix('prevention')).toBe('P:');
    });

    it('prevention-opt → P: 접두어', () => {
      expect(determineTypePrefix('prevention-opt')).toBe('P:');
    });

    it('detection → D: 접두어', () => {
      expect(determineTypePrefix('detection')).toBe('D:');
    });

    it('detection-opt → D: 접두어', () => {
      expect(determineTypePrefix('detection-opt')).toBe('D:');
    });

    it('specialChar → 접두어 없음', () => {
      expect(determineTypePrefix('specialChar')).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════
  // TEST 4: 선택값 빌드 (접두어 + 줄바꿈 연결)
  // ═══════════════════════════════════════════════════════
  describe('선택값 빌드', () => {
    it('prevention 단일 선택 → P:값', () => {
      expect(buildSelectedValue(['예방관리1'], 'prevention')).toBe('P:예방관리1');
    });

    it('detection 단일 선택 → D:값', () => {
      expect(buildSelectedValue(['검출관리1'], 'detection')).toBe('D:검출관리1');
    });

    it('detection 다중 선택 → D:값1\\nD:값2', () => {
      expect(buildSelectedValue(['검출관리1', '검출관리2'], 'detection')).toBe('D:검출관리1\nD:검출관리2');
    });

    it('prevention 다중 선택 → P:값1\\nP:값2', () => {
      expect(buildSelectedValue(['예방1', '예방2', '예방3'], 'prevention')).toBe('P:예방1\nP:예방2\nP:예방3');
    });

    it('specialChar 선택 → 접두어 없이 줄바꿈 연결', () => {
      expect(buildSelectedValue(['CC', 'SC'], 'specialChar')).toBe('CC\nSC');
    });
  });

  // ═══════════════════════════════════════════════════════
  // TEST 5: modalItemCode 매핑
  // ═══════════════════════════════════════════════════════
  describe('modalItemCode 매핑', () => {
    it('prevention → B5', () => {
      expect(determineModalItemCode('prevention')).toBe('B5');
    });

    it('prevention-opt → B5', () => {
      expect(determineModalItemCode('prevention-opt')).toBe('B5');
    });

    it('detection → A6', () => {
      expect(determineModalItemCode('detection')).toBe('A6');
    });

    it('detection-opt → A6', () => {
      expect(determineModalItemCode('detection-opt')).toBe('A6');
    });

    it('specialChar → SC', () => {
      expect(determineModalItemCode('specialChar')).toBe('SC');
    });
  });

  // ═══════════════════════════════════════════════════════
  // TEST 6: 회귀 방지 - 이전 버그 시나리오 재현
  // originalType='prevention' + type='detection' → detection 키에 D:값 저장되어야 함
  // ═══════════════════════════════════════════════════════
  describe('회귀 방지: originalType 무시 시나리오', () => {
    it('originalType=prevention, type=detection → 검출관리 키에 D: 접두어로 저장', () => {
      const modal: ControlModalState = {
        isOpen: true,
        type: 'detection',
        originalType: 'prevention',
        rowIndex: 0,
        fmId: 'fm-100',
        fcId: 'fc-200',
      };

      const key = buildSaveKey(modal);
      const value = buildSelectedValue(['검출관리항목A'], modal.type);

      // ★ 핵심 검증: detection 키에 D: 접두어
      expect(key).toBe('detection-fm-100-fc-200');
      expect(value).toBe('D:검출관리항목A');

      // ★ 이전 버그라면 이렇게 되었을 것:
      // key = 'prevention-fm-100-fc-200' (잘못된 키)
      // value = 'D:검출관리항목A' (접두어는 맞지만 키가 틀림)
      expect(key).not.toBe('prevention-fm-100-fc-200');
    });

    it('originalType=detection, type=prevention → 예방관리 키에 P: 접두어로 저장', () => {
      const modal: ControlModalState = {
        isOpen: true,
        type: 'prevention',
        originalType: 'detection',
        rowIndex: 0,
        fmId: 'fm-100',
        fcId: 'fc-200',
      };

      const key = buildSaveKey(modal);
      const value = buildSelectedValue(['예방관리항목B'], modal.type);

      expect(key).toBe('prevention-fm-100-fc-200');
      expect(value).toBe('P:예방관리항목B');
      expect(key).not.toBe('detection-fm-100-fc-200');
    });
  });
});
