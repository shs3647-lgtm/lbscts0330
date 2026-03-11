/**
 * @file AllTabRenderer.tsx
 * @description 전체보기 탭 렌더러 (35컬럼 기본화면)
 * @updated 2026-01-10 - 화면정의서 v2.2 기준 3색 시스템 적용
 * 
 * ★★★ 새로운 ALL 화면 ★★★
 * - 기본화면: 35컬럼 (RPN 제외)
 * - 옵션화면: 37컬럼 (RPN 포함)
 * - 2행 분류 기준 3색 시스템 (구조/기능/고장분석)
 *
 * @status CODEFREEZE L4 (Gold) 🔒
 * @freeze_level L4 (Critical - Gold Test Passed)
 * @frozen_date 2026-03-02
 * @gold_tag v4.0.0-gold
 * @allowed_changes NONE — 사용자 명시적 승인 + full test pass 필수
 */

'use client';

import React, { useMemo } from 'react';
import type { WorksheetState } from '../../constants';
import AllTabEmpty from './AllTabEmpty';
import type { FailureLinkRow } from './processFailureLinks';
import { enrichFailureLinks } from '@/lib/fmea-core/enrichFailureChains';

interface AllTabRendererProps {
  tab: string;
  state: WorksheetState;
  setState?: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty?: React.Dispatch<React.SetStateAction<boolean>>;  // ✅ DB 저장 트리거용
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;  // ★★★ 2026-02-11: SOD 즉시 저장용
  visibleSteps?: number[];
  fmeaId?: string;
  showRPN?: boolean; // RPN 표시 여부 (기본: false)
  // ★★★ 2026-01-12: 트리뷰 패널 전환 핸들러 추가 ★★★
  onOpen5AP?: () => void;
  onOpen6AP?: () => void;
  onOpenRPN?: () => void;
  activePanelId?: string; // 현재 활성 패널 ID
  // ★★★ 2026-01-27: 수동모드 컨텍스트 메뉴 ★★★
  inputMode?: 'manual' | 'auto';
  onContextMenu?: (
    e: React.MouseEvent,
    rowIdx: number,
    fmId?: string,
    fcId?: string,
    columnType?: 'fm' | 'fc' | 'fe' | 'sod' | 'ap' | 'other'
  ) => void;
  // ★★★ 2026-02-03: 등록화면 목표완료일 연동 ★★★
  fmeaRevisionDate?: string;
  onOpenSpecialChar?: () => void;
  // 레거시 props (호환성 유지용 — 사용되지 않음)
  rows?: unknown[];
  l1Spans?: number[];
  l1TypeSpans?: number[];
  l1FuncSpans?: number[];
  l2Spans?: number[];
  onAPClick?: () => void;
  useAtomicDB?: boolean;
}

export default function AllTabRenderer({
  tab,
  state,
  setState,
  setDirty,
  saveAtomicDB,
  visibleSteps: propsVisibleSteps,
  fmeaId,
  showRPN = false,
  // ★★★ 2026-01-12: 트리뷰 패널 전환 핸들러 ★★★
  onOpen5AP,
  onOpen6AP,
  onOpenRPN,
  activePanelId,
  // ★★★ 2026-01-27: 수동모드 컨텍스트 메뉴 ★★★
  inputMode,
  onContextMenu,
  // ★★★ 2026-02-03: 등록화면 목표완료일 연동 ★★★
  fmeaRevisionDate,
  onOpenSpecialChar,
}: AllTabRendererProps) {

  // 렌더링 로그 비활성화 (성능)

  // visibleSteps를 단계명으로 변환
  // ✅ 2026-01-12: visibleSteps가 객체일 수도 있으므로 배열로 정규화
  let visibleStepsNumbers: number[] = [2, 3, 4, 5, 6]; // 기본값

  if (propsVisibleSteps) {
    // props가 배열이면 그대로 사용
    visibleStepsNumbers = Array.isArray(propsVisibleSteps) ? propsVisibleSteps : [2, 3, 4, 5, 6];
  } else if (state.visibleSteps) {
    // state.visibleSteps가 배열이면 그대로, 객체면 배열로 변환
    if (Array.isArray(state.visibleSteps)) {
      visibleStepsNumbers = state.visibleSteps;
    } else if (typeof state.visibleSteps === 'object') {
      // { step2: true, step3: true, ... } 형태를 [2, 3, ...] 배열로 변환
      visibleStepsNumbers = [2, 3, 4, 5, 6].filter(step => {
        const key = `step${step}`;
        return (state.visibleSteps as unknown as Record<string, boolean>)?.[key] !== false;
      });
    }
  }

  const stepNameMap: Record<number, string> = {
    2: '구조분석',
    3: '기능분석',
    4: '고장분석',
    5: '리스크분석',
    6: '최적화',
  };
  const visibleStepNames = visibleStepsNumbers.map(num => stepNameMap[num] || '').filter(Boolean);

  // ★★★ 성능 최적화: enrichment를 useMemo로 메모이제이션 (2026-03-04)
  // state.l1/l2/failureLinks가 바뀔 때만 재계산 — riskData 변경 시 스킵 (150-300ms 절약)
  const failureLinks: FailureLinkRow[] = useMemo(
    () => enrichFailureLinks(state.failureLinks || [], state),
    [state.l1, state.l2, state.failureLinks],
  );

  // ★★★ 새로운 ALL 화면: AllTabEmpty 사용 ★★★
  // 사이드바, 제목, 메인메뉴, 탭 메뉴는 상위 컴포넌트에서 유지
  // 워크시트 영역만 새로운 시트로 대체
  return (
    <AllTabEmpty
      rowCount={30}
      showRPN={showRPN}
      visibleSteps={visibleStepNames}
      failureLinks={failureLinks}
      state={state}
      setState={setState}
      setDirty={setDirty}
      saveAtomicDB={saveAtomicDB}
      // ★★★ 2026-01-12: 트리뷰 패널 전환 핸들러 ★★★
      onOpen5AP={onOpen5AP}
      onOpen6AP={onOpen6AP}
      onOpenRPN={onOpenRPN}
      activePanelId={activePanelId}
      // ★★★ 2026-01-27: 수동모드 컨텍스트 메뉴 ★★★
      inputMode={inputMode}
      onContextMenu={onContextMenu}
      // ★★★ 2026-02-03: 등록화면 목표완료일 연동 ★★★
      fmeaRevisionDate={fmeaRevisionDate}
      onOpenSpecialChar={onOpenSpecialChar}
    />
  );
}
