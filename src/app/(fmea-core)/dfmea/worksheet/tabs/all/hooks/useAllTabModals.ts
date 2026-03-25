/**
 * @file useAllTabModals.ts
 * @description AllTab 모달 상태 관리 훅
 */

import { useState } from 'react';
import { WorksheetState, WorksheetFailureLink } from '../../../constants';
import { UserInfo } from '@/types/user';
import type { SODItem } from '@/components/modals/SODMasterData';
import { getRecommendedDetectionMethods } from './detectionKeywordMap';
import { recordSeverityUsage } from '@/hooks/useSeverityRecommend';
import { normalizeScope as normalizeScopeFromConstants } from '@/lib/fmea/scope-constants';

/** WorksheetFailureLink + feSeverity (런타임에 존재하는 확장 필드) */
interface FailureLinkWithSeverity extends WorksheetFailureLink {
  feSeverity?: number;
}

/** SOD 모달 상태 타입 */
export interface SODModalState {
  isOpen: boolean;
  category: 'S' | 'O' | 'D';
  currentValue?: number;
  scope?: 'YP' | 'SP' | 'USER';
  targetType: 'risk' | 'opt' | 'failure';  // ★ 2026-01-11: failure 추가
  rowIndex: number;
  feIndex?: number;
  feText?: string;
  feId?: string;   // ★ 2026-01-11: 개별 FE ID 추가
  fmId?: string;   // ★ 2026-01-11: 발생도/검출도 키용
  fcId?: string;   // ★ 2026-01-11: 발생도/검출도 키용
}

/** 컨트롤 모달 상태 타입 */
export interface ControlModalState {
  isOpen: boolean;
  type: 'prevention' | 'detection' | 'specialChar' | 'prevention-opt' | 'detection-opt';
  originalType?: 'prevention' | 'detection' | 'specialChar' | 'prevention-opt' | 'detection-opt';  // ★ 2026-02-03: 원래 모달 타입 (탭 전환 시에도 저장용)
  rowIndex: number;
  fmId?: string;    // ★ 고유 키용
  fcId?: string;    // ★ 고유 키용
  fcText?: string;
  fmText?: string;       // ★ 2026-02-28: 설계검증 검출 2섹션 모달용 (FM 검출 1순위)
  processNo?: string;    // ★ 2026-02-03: 해당 공정 필터링용
  processName?: string;  // ★ 2026-02-03: 해당 공정명
  m4?: string;           // ★ 2026-02-19: FC 4M 필터링용
}

/** 초기 SOD 모달 상태 */
const initialSodModal: SODModalState = {
  isOpen: false,
  category: 'S',
  targetType: 'risk',
  rowIndex: -1
};

/** 초기 컨트롤 모달 상태 */
const initialControlModal: ControlModalState = {
  isOpen: false,
  type: 'prevention',
  rowIndex: -1
};

/** LLD 모달 상태 타입 */
export interface LLDModalState {
  isOpen: boolean;
  rowIndex: number;
  fmId?: string;
  fcId?: string;
  currentValue?: string;
  fmText?: string;       // ★ 2026-03-02: 추천용 고장형태
  fcText?: string;       // ★ 2026-03-02: 추천용 고장원인
  pcText?: string;       // ★ 2026-03-02: 현재 행 설계검증 예방
  dcText?: string;       // ★ 2026-03-02: 현재 행 설계검증 검출
}

/** 초기 LLD 모달 상태 */
const initialLldModal: LLDModalState = {
  isOpen: false,
  rowIndex: -1
};

/** 사용자 선택 모달 상태 타입 */
export interface UserModalState {
  isOpen: boolean;
  rowIndex: number;
  fmId?: string;
  fcId?: string;
  currentValue?: string;
}

/** 초기 사용자 모달 상태 */
const initialUserModal: UserModalState = {
  isOpen: false,
  rowIndex: -1
};

/** 날짜 선택 모달 상태 타입 */
export interface DateModalState {
  isOpen: boolean;
  rowIndex: number;
  field: 'targetDate' | 'completionDate';
  fmId?: string;
  fcId?: string;
  currentValue?: string;
}

/** 초기 날짜 모달 상태 */
const initialDateModal: DateModalState = {
  isOpen: false,
  rowIndex: -1,
  field: 'targetDate'
};

/**
 * AllTab 모달 관리 훅
 */
export function useAllTabModals(
  setState?: React.Dispatch<React.SetStateAction<WorksheetState>>,
  setDirty?: React.Dispatch<React.SetStateAction<boolean>>,  // ★★★ 2026-01-12: DB 저장 트리거 추가
  saveAtomicDB?: (force?: boolean) => void | Promise<void>  // ★★★ 2026-02-11: SOD 선택 후 즉시 DB 저장
) {
  const [sodModal, setSodModal] = useState<SODModalState>(initialSodModal);
  const [controlModal, setControlModal] = useState<ControlModalState>(initialControlModal);
  const [lldModal, setLldModal] = useState<LLDModalState>(initialLldModal);
  const [userModal, setUserModal] = useState<UserModalState>(initialUserModal);
  const [dateModal, setDateModal] = useState<DateModalState>(initialDateModal);

  /** SOD 셀 클릭 핸들러 */
  const handleSODClick = (
    category: 'S' | 'O' | 'D',
    targetType: 'risk' | 'opt' | 'failure',  // ★ 2026-01-11: failure 추가
    rowIndex: number,
    currentValue?: number,
    scope?: string,
    feId?: string,    // ★ 2026-01-11: 개별 FE ID
    feText?: string,  // ★ FE 텍스트 (표시용)
    fmId?: string,    // ★ 2026-01-11: 발생도/검출도 키용
    fcId?: string     // ★ 2026-01-11: 발생도/검출도 키용
  ) => {
    setSodModal({
      isOpen: true,
      category,
      targetType,
      rowIndex,
      currentValue,
      scope: scope as 'YP' | 'SP' | 'USER' | undefined,
      feId,    // ★ 개별 FE ID 전달
      feText,
      fmId,    // ★ 발생도/검출도 키용
      fcId     // ★ 발생도/검출도 키용
    });
  };

  /** SOD 선택 핸들러 */
  const handleSODSelect = (rating: number, _item: SODItem) => {
    const categoryName = sodModal.category === 'S' ? '심각도' : sodModal.category === 'O' ? '발생도' : '검출도';
    if (!setState) {
      console.error('❌ [handleSODSelect] setState가 undefined!');
      alert('저장 실패: setState가 없습니다.');
      setSodModal(prev => ({ ...prev, isOpen: false }));
      return;
    }

    // ★★★ 2026-01-11: 고장분석 심각도 - 개별 FE 또는 전체에 적용 ★★★
    if (sodModal.targetType === 'failure' && sodModal.category === 'S') {
      setState((prevState: WorksheetState) => {
        const failureScopes = prevState.l1?.failureScopes || [];
        const failureLinks: FailureLinkWithSeverity[] = prevState.failureLinks || [];

        // ★ feId가 있으면 해당 FE만 업데이트, 없으면 전체 업데이트
        const targetFeId = sodModal.feId;
        const targetFeText = sodModal.feText;

        let updatedScopes;
        let updatedLinks: FailureLinkWithSeverity[];

        if (targetFeId || targetFeText) {
          // ★ 개별 FE 클릭 → 동일 유형(scope)의 모든 FE에 동일 점수 부여
          // scope 정규화: 'Your Plant'/'YP' → 'YP', 'Ship to Plant'/'SP' → 'SP', 'User'/'USER' → 'USER'
          // ★ 2026-03-22: 중앙 normalizeScope() 사용
          const normalizeScope = (s?: string): string => {
            if (!s) return '';
            return normalizeScopeFromConstants(s);
          };

          // 클릭된 FE의 scope 찾기
          const clickedScope = failureScopes.find((sc) =>
            (targetFeId && sc.id === targetFeId) ||
            (targetFeText && sc.effect === targetFeText)
          );
          const targetScopeNorm = normalizeScope(clickedScope?.scope || sodModal.scope);

          updatedScopes = failureScopes.map((sc) => {
            // 동일 scope의 모든 FE에 동일 점수 부여
            if (targetScopeNorm && normalizeScope(sc.scope) === targetScopeNorm) {
              return { ...sc, severity: rating };
            }
            // scope 매칭 실패 시 기존 로직 (feId/feText 개별 매칭)
            if ((targetFeId && sc.id === targetFeId) ||
              (targetFeText && sc.effect === targetFeText)) {
              return { ...sc, severity: rating };
            }
            return sc;
          });

          // failureLinks도 동일 scope의 모든 FE에 적용
          // FE ID → scope 매핑 생성
          const feIdToScope = new Map<string, string>();
          failureScopes.forEach((sc) => {
            if (sc.id) feIdToScope.set(sc.id, normalizeScope(sc.scope));
          });

          updatedLinks = failureLinks.map((link) => {
            const linkFeScope = feIdToScope.get(link.feId || '') || normalizeScope(link.feCategory || link.feScope);
            if (targetScopeNorm && linkFeScope === targetScopeNorm) {
              return { ...link, feSeverity: rating, severity: rating };
            }
            // fallback: 개별 매칭
            if ((targetFeId && link.feId === targetFeId) ||
              (targetFeText && link.feText === targetFeText)) {
              return { ...link, feSeverity: rating, severity: rating };
            }
            return link;
          });
        } else {
          // ★ 전체 FE에 점수 부여 (심각도 컬럼 클릭 시)
          updatedScopes = failureScopes.map((scope) => {
            return { ...scope, severity: rating };
          });

          updatedLinks = failureLinks.map((link) => {
            return { ...link, feSeverity: rating, severity: rating };
          });
        }

        // ★★★ 2026-02-26: failureLinks 심각도 → riskData 동기화 (FM별 최대값으로 통일)
        const updatedRiskData = { ...(prevState.riskData || {}) };
        // FM별 최대 심각도 계산
        const fmMaxSev = new Map<string, number>();
        updatedLinks.forEach((link) => {
          if (link.fmId) {
            const sev = link.severity || link.feSeverity || 0;
            const cur = fmMaxSev.get(link.fmId) || 0;
            if (sev > cur) fmMaxSev.set(link.fmId, sev);
          }
        });
        // 모든 link에 FM 최대 심각도 기록
        updatedLinks.forEach((link) => {
          if (link.fmId && link.fcId) {
            const uk = `${link.fmId}-${link.fcId}`;
            const maxSev = fmMaxSev.get(link.fmId) || 0;
            if (maxSev > 0) updatedRiskData[`risk-${uk}-S`] = maxSev;
          }
        });

        return {
          ...prevState,
          l1: {
            ...prevState.l1,
            failureScopes: updatedScopes
          },
          failureLinks: updatedLinks,
          riskData: updatedRiskData
        };
      });

      // ★★★ 2026-01-12: DB 저장 트리거 ★★★
      if (setDirty) {
        setDirty(true);
      }
      // ★★★ 2026-02-11: SOD 선택 후 즉시 DB 저장 (다른 화면 이동 시 데이터 손실 방지)
      if (saveAtomicDB) {
        setTimeout(() => { Promise.resolve(saveAtomicDB(true)).catch((e: unknown) => console.error('[SOD 저장] 오류:', e)); }, 150);
      }

      // ★★★ 2026-03-17: 심각도 개선루프 — FE-S 쌍 DB 기록 + fmeaId (마스터→F/P 전파) ★★★
      if (sodModal.feText && rating > 0) {
        const fmeaId = typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('id') || ''
          : '';
        recordSeverityUsage({
          feText: sodModal.feText,
          severity: rating,
          feCategory: sodModal.scope || '',
          fmeaId,
        }).catch(() => { /* fire-and-forget */ });
      }

      setSodModal(prev => ({ ...prev, isOpen: false }));
      return;
    }

    // ★ 검출도 불일치 경고용 변수 (setState 내부에서 설정, 외부에서 표시)
    let detectionMismatchInfo: { existingD: number; dcText: string } | null = null;

    // ★ 리스크분석/최적화 - riskData에 저장
    setState((prevState: WorksheetState) => {
      let riskKey: string;
      let uniqueKey = '';

      if (sodModal.category === 'S' && sodModal.feText) {
        // 심각도 (개별 FE 텍스트 기준)
        riskKey = `S-fe-${sodModal.feText}`;
      } else if (sodModal.fmId && sodModal.fcId) {
        // ★★★ 2026-01-11: 최적화 단계 포함 - fmId-fcId 조합 키 사용 ★★★
        uniqueKey = `${sodModal.fmId}-${sodModal.fcId}`;
        riskKey = `${sodModal.targetType}-${uniqueKey}-${sodModal.category}`;
      } else {
        // 폴백: rowIndex 기반
        riskKey = `${sodModal.targetType}-${sodModal.rowIndex}-${sodModal.category}`;
      }

      const updatedRiskData = {
        ...(prevState.riskData || {}),
        [riskKey]: rating
      };

      // ★★★ 2026-01-12: 발생도 입력 시 동일 설계검증 예방에 동일 발생도 자동 적용 ★★★
      if (sodModal.category === 'O' && sodModal.targetType === 'risk' && uniqueKey) {
        const preventionKey = `prevention-${uniqueKey}`;
        const currentPreventionValue = prevState.riskData?.[preventionKey] || '';

        if (currentPreventionValue) {
          // failureLinks에서 동일 설계검증 예방를 가진 다른 행 찾기
          const failureLinks: WorksheetFailureLink[] = prevState.failureLinks || [];
          let autoLinkedCount = 0;

          failureLinks.forEach((link) => {
            const linkUniqueKey = `${link.fmId}-${link.fcId}`;
            if (linkUniqueKey === uniqueKey) return; // 현재 행은 스킵

            const linkPreventionKey = `prevention-${linkUniqueKey}`;
            const linkPreventionValue = prevState.riskData?.[linkPreventionKey] || '';

            // 설계검증 예방가 일치하면 발생도 자동 적용
            if (linkPreventionValue === currentPreventionValue) {
              const linkOccurrenceKey = `risk-${linkUniqueKey}-O`;
              updatedRiskData[linkOccurrenceKey] = rating;
              autoLinkedCount++;
            }
          });

        }
      }

      // ★ 검출도: 자동 적용 + 불일치 체크 — DC 인덱스 기반 O(1) 조회 (2026-02-23 최적화)
      if (sodModal.category === 'D' && sodModal.targetType === 'risk' && uniqueKey) {
        const dcKey = `detection-${uniqueKey}`;
        const currentDC = (prevState.riskData?.[dcKey] || '') as string;

        if (currentDC) {
          // ★ 1회 순회로 동일 DC 링크만 수집 (Map 인덱스)
          const failureLinks: WorksheetFailureLink[] = prevState.failureLinks || [];
          const sameDCLinks: Array<{ linkUK: string; fmId: string }> = [];
          for (const link of failureLinks) {
            const linkUK = `${link.fmId}-${link.fcId}`;
            if (linkUK === uniqueKey) continue;
            if ((prevState.riskData?.[`detection-${linkUK}`] || '') === currentDC) {
              sameDCLinks.push({ linkUK, fmId: link.fmId });
              // ★ 검출도 불일치 감지: 동일 DC에 다른 D값이 이미 존재하는 경우
              const existingD = Number(prevState.riskData?.[`risk-${linkUK}-D`]) || 0;
              if (existingD > 0 && existingD !== rating && !detectionMismatchInfo) {
                detectionMismatchInfo = { existingD, dcText: currentDC };
              }
            }
          }

          // ★ 동일 설계검증 검출 → 전체 FM에 검출도 자동적용 (공정별 제한 제거)
          for (const { linkUK } of sameDCLinks) {
            updatedRiskData[`risk-${linkUK}-D`] = rating;
          }
        }
      }

      return { ...prevState, riskData: updatedRiskData };
    });

    // ★★★ 2026-01-12: DB 저장 트리거 (auto-save 500ms debounce가 처리) ★★★
    if (setDirty) {
      setDirty(true);
    }

    // ★★★ 2026-03-17: 리스크/최적화 심각도 선택 시에도 FE-S 쌍 DB 기록 + fmeaId ★★★
    if (sodModal.category === 'S' && sodModal.feText && rating > 0) {
      const fmeaId = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('id') || ''
        : '';
      recordSeverityUsage({
        feText: sodModal.feText,
        severity: rating,
        feCategory: sodModal.scope || '',
        fmeaId,
      }).catch(() => { /* fire-and-forget */ });
    }

    setSodModal(prev => ({ ...prev, isOpen: false }));

    // ★ 검출도 불일치 경고 (동일 설계검증 검출에 다른 검출도 존재)
    if (detectionMismatchInfo) {
      const { existingD, dcText } = detectionMismatchInfo as { existingD: number; dcText: string };
      const shortDC = dcText.length > 30 ? dcText.slice(0, 30) + '…' : dcText;
      setTimeout(() => {
        alert(`⚠️ 검출도 불일치\n\n동일 설계검증 검출 "${shortDC}"에\n기존 검출도 ${existingD}점이 지정되어 있습니다.\n\n현재 선택: ${rating}점`);
      }, 300);
    }
  };

  /** 습득교훈 텍스트 입력 핸들러 (레거시) */
  const handleLessonInput = (rowIndex: number, value: string) => {
    if (setState) {
      setState((prev: WorksheetState) => ({
        ...prev,
        riskData: {
          ...(prev.riskData || {}),
          [`lesson-${rowIndex}`]: value
        }
      }));
    }
  };

  /** ★ LLD 모달 열기 (습득교훈 셀 클릭 시) */
  const openLldModal = (rowIndex: number, currentValue?: string, fmId?: string, fcId?: string, fmText?: string, fcText?: string, pcText?: string, dcText?: string) => {
    setLldModal({ isOpen: true, rowIndex, currentValue, fmId, fcId, fmText, fcText, pcText, dcText });
  };

  /** ★ LLD 모달 닫기 */
  const closeLldModal = () => {
    setLldModal(prev => ({ ...prev, isOpen: false }));
  };

  /** ★ LLD 선택 완료 핸들러 — 설계검증 예방개선 또는 설계검증 검출개선에 선택 반영 */
  const handleLldSelect = async (lldNo: string, fmeaId?: string, detail?: { lldNo: string; applyTarget?: 'prevention' | 'detection'; improvement: string; failureMode: string; cause: string; classification?: string }) => {
    if (!setState || lldModal.rowIndex < 0) return;

    const uniqueKey = (lldModal.fmId && lldModal.fcId)
      ? `${lldModal.fmId}-${lldModal.fcId}`
      : String(lldModal.rowIndex);

    const lessonKey = `lesson-${uniqueKey}`;
    const target = detail?.applyTarget || 'prevention';
    // ★ 2026-03-09 FIX: 설계검증 검출 → LLD 개선대책은 detection-opt(개선) 컬럼에 저장
    // detection(현재 설계검증 검출)에는 실제 검사장비명(외관검사, 마이크로미터 등)만 표시
    const targetKey = target === 'detection'
      ? `detection-opt-${uniqueKey}`   // 검출: 개선 컬럼에 LLD 텍스트 저장
      : `prevention-${uniqueKey}`;     // 예방: 기존 동작 유지

    setState((prev: WorksheetState) => {
      const updated: Record<string, string | number> = {
        ...(prev.riskData || {}),
        [lessonKey]: lldNo,
        [`lesson-target-${uniqueKey}`]: target,  // ★ 2026-03-02: 예방/검출 어디에 연결했는지 기록
        [`lesson-cls-${uniqueKey}`]: detail?.classification || '',  // ★ 2026-03-07: LLD 구분(RMA/ABN/ECN 등) 저장
      };

      if (detail?.improvement) {
        const prefix = `[${lldNo}] `;
        const existing = (prev.riskData?.[targetKey] as string) || '';
        if (!existing || !existing.includes(detail.improvement)) {
          updated[targetKey] = existing
            ? `${existing}\n${prefix}${detail.improvement}`
            : `${prefix}${detail.improvement}`;
        }
      }

      // ★ 2026-03-09: 설계검증 검출 → FM 키워드 기반 실제 검사장비 자동 채움
      if (target === 'detection') {
        const dcKey = `detection-${uniqueKey}`;
        const existingDC = (prev.riskData?.[dcKey] as string) || '';
        // LLD 관리텍스트나 빈값 → 검사장비로 교체
        const isLldText = existingDC.includes('[LLD');
        const isAutoText = existingDC.startsWith('D:') || existingDC.startsWith('D ');
        if (!existingDC || isLldText || isAutoText) {
          const fmText = lldModal.fmText || '';
          const methods = getRecommendedDetectionMethods(fmText);
          if (methods.length > 0) {
            updated[dcKey] = `D:${methods[0]}`;
            updated[`imported-detection-${uniqueKey}`] = 'auto';
          }
        }
      }

      return { ...prev, riskData: updated };
    });

    if (setDirty) {
      setDirty(true);
    }

    if (fmeaId && lldNo) {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const response = await fetch('/api/lessons-learned/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lldNo,
            fmeaId,
            appliedDate: today
          })
        });
        const result = await response.json();
        if (result.success) {
          // LLD 적용결과 업데이트 완료
        }
      } catch (error) {
        console.error('LLD 적용결과 업데이트 오류:', error);
      }
    }

    closeLldModal();
  };

  /** 컨트롤 모달 열기 */
  const openControlModal = (type: 'prevention' | 'detection' | 'specialChar' | 'prevention-opt' | 'detection-opt', rowIndex: number, fcText?: string) => {
    setControlModal({ isOpen: true, type, rowIndex, fcText });
  };

  /** 컨트롤 모달 닫기 */
  const closeControlModal = () => {
    setControlModal(prev => ({ ...prev, isOpen: false }));
  };

  /** SOD 모달 닫기 */
  const closeSodModal = () => {
    setSodModal(prev => ({ ...prev, isOpen: false }));
  };

  /** 사용자 모달 열기 */
  const openUserModal = (rowIndex: number, currentValue?: string, fmId?: string, fcId?: string) => {
    setUserModal({ isOpen: true, rowIndex, currentValue, fmId, fcId });
  };

  /** 사용자 모달 닫기 */
  const closeUserModal = () => {
    setUserModal(prev => ({ ...prev, isOpen: false }));
  };

  /** 사용자 선택 처리 */
  const handleUserSelect = (user: UserInfo) => {
    if (!setState || userModal.rowIndex < 0) return;

    // fmId-fcId 기반 키 생성
    const key = (userModal.fmId && userModal.fcId)
      ? `person-opt-${userModal.fmId}-${userModal.fcId}`
      : `person-opt-${userModal.rowIndex}`;

    setState((prev: WorksheetState) => ({
      ...prev,
      riskData: {
        ...(prev.riskData || {}),
        [key]: user.name  // 사용자 이름만 저장
      }
    }));

    if (setDirty) setDirty(true);
    closeUserModal();
  };

  /** 날짜 모달 열기 */
  const openDateModal = (rowIndex: number, field: 'targetDate' | 'completionDate', currentValue?: string, fmId?: string, fcId?: string) => {
    setDateModal({ isOpen: true, rowIndex, field, currentValue, fmId, fcId });
  };

  /** 날짜 모달 닫기 */
  const closeDateModal = () => {
    setDateModal(prev => ({ ...prev, isOpen: false }));
  };

  /** 날짜 선택 처리 */
  const handleDateSelect = (date: string) => {
    if (!setState || dateModal.rowIndex < 0) return;

    const uniqueKey = (dateModal.fmId && dateModal.fcId)
      ? `${dateModal.fmId}-${dateModal.fcId}`
      : String(dateModal.rowIndex);

    const key = `${dateModal.field}-opt-${uniqueKey}`;

    setState((prev: WorksheetState) => ({
      ...prev,
      riskData: {
        ...(prev.riskData || {}),
        [key]: date
      }
    }));

    if (setDirty) setDirty(true);
    closeDateModal();
  };

  return {
    sodModal,
    setSodModal,
    controlModal,
    setControlModal,
    lldModal,
    setLldModal,
    userModal,
    setUserModal,
    handleSODClick,
    handleSODSelect,
    handleLessonInput,
    openControlModal,
    closeControlModal,
    closeSodModal,
    openLldModal,
    closeLldModal,
    handleLldSelect,
    openUserModal,
    closeUserModal,
    handleUserSelect,
    dateModal,
    setDateModal,
    openDateModal,
    closeDateModal,
    handleDateSelect
  };
}


