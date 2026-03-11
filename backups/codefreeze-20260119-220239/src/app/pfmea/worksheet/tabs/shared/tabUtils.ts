// @ts-nocheck
/**
 * @file tabUtils.ts
 * @description L1~L3 탭 공용 유틸리티 함수
 * @created 2026-01-19
 * @note FunctionL1~L3Tab, FailureL1~L3Tab에서 공용 사용
 */

/**
 * 플레이스홀더/빈 값 체크 함수
 * @param name 검사할 문자열
 * @returns 값이 누락/플레이스홀더면 true
 */
export const isMissing = (name: string | undefined | null): boolean => {
  if (name === null || name === undefined) return true;
  if (!name) return true;
  const str = String(name);
  const trimmed = str.trim();
  if (trimmed === '' || trimmed === '-') return true;
  if (str.includes('클릭')) return true;
  if (str.includes('추가')) return true;
  if (str.includes('선택')) return true;
  if (str.includes('입력')) return true;
  if (str.includes('필요')) return true;
  return false;
};

/**
 * 의미있는 이름인지 체크 (플레이스홀더 제외)
 * @param name 검사할 문자열
 * @returns 의미있는 값이면 true
 */
export const isMeaningful = (name: unknown): name is string => {
  if (typeof name !== 'string') return false;
  const n = name.trim();
  if (!n) return false;
  if (n.includes('클릭하여')) return false;
  if (n === '요구사항 선택') return false;
  if (n.startsWith('(기능분석에서')) return false;
  return true;
};

/**
 * 셀 클릭 시 확정 상태 해제 핸들러 생성
 * @param isConfirmed 현재 확정 상태
 * @param setStateSynced 동기 상태 업데이트 함수
 * @param setState 상태 업데이트 함수
 * @param setDirty dirty 플래그 설정 함수
 * @param confirmKey 확정 상태 키 (예: 'l1Confirmed')
 * @param setModal 모달 설정 함수
 */
export const createHandleCellClick = (
  isConfirmed: boolean,
  setStateSynced: ((updater: any) => void) | undefined,
  setState: (updater: any) => void,
  setDirty: (dirty: boolean) => void,
  confirmKey: string,
  setModal: (config: any) => void
) => {
  return (modalConfig: any) => {
    if (isConfirmed) {
      const updateFn = (prev: any) => ({ ...prev, [confirmKey]: false });
      if (setStateSynced) {
        setStateSynced(updateFn);
      } else {
        setState(updateFn);
      }
      setDirty(true);
    }
    setModal(modalConfig);
  };
};

/**
 * 확정 핸들러 생성
 * @param setStateSynced 동기 상태 업데이트 함수
 * @param setState 상태 업데이트 함수
 * @param setDirty dirty 플래그 설정 함수
 * @param saveToLocalStorage localStorage 저장 함수
 * @param saveAtomicDB DB 저장 함수
 * @param confirmKey 확정 상태 키
 */
export const createHandleConfirm = (
  setStateSynced: ((updater: any) => void) | undefined,
  setState: (updater: any) => void,
  setDirty: (dirty: boolean) => void,
  saveToLocalStorage: (() => void) | undefined,
  saveAtomicDB: (() => void) | undefined,
  confirmKey: string
) => {
  return () => {
    const updateFn = (prev: any) => ({ ...prev, [confirmKey]: true });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    
    // 저장
    setTimeout(() => {
      saveToLocalStorage?.();
      saveAtomicDB?.();
    }, 100);
  };
};

/**
 * 수정 핸들러 생성
 * @param setStateSynced 동기 상태 업데이트 함수
 * @param setState 상태 업데이트 함수
 * @param setDirty dirty 플래그 설정 함수
 * @param confirmKey 확정 상태 키
 */
export const createHandleEdit = (
  setStateSynced: ((updater: any) => void) | undefined,
  setState: (updater: any) => void,
  setDirty: (dirty: boolean) => void,
  confirmKey: string
) => {
  return () => {
    const updateFn = (prev: any) => ({ ...prev, [confirmKey]: false });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
  };
};
