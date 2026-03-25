/**
 * @file AllTabModals.tsx
 * @description AllTabEmpty.tsx에서 추출한 모달 렌더링 전용 컴포넌트
 * - 9개 모달을 한곳에서 관리 (DataSelect, SOD, LLD, User, DatePicker, APResult, APImprove, SpecialChar, Recommend)
 * - DataSelectModal, SODSelectModal, APResultModal, LLDSelectModal, DatePickerModal, SpecialCharMasterModal에 dynamic() lazy loading 적용
 * @created 2026-02-28
 */
'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { ControlModalState, SODModalState, LLDModalState, UserModalState, DateModalState } from './hooks/useAllTabModals';
import type { UserInfo } from '@/types/user';
import type { WorksheetState } from '../../constants';
import type { SODItem } from '@/components/modals/SODMasterData';

// ★ dynamic() lazy loading — 모달은 열릴 때만 로드
const DataSelectModal = dynamic(() => import('@/components/modals/DataSelectModal'), { ssr: false });
const SODSelectModal = dynamic(() => import('@/components/modals/SODSelectModal'), { ssr: false });
const APResultModal = dynamic(() => import('@/components/modals/APResultModal'), { ssr: false });
const LLDSelectModal = dynamic(() => import('@/components/modals/LLDSelectModal'), { ssr: false });
const DatePickerModal = dynamic(
  () => import('@/components/DatePickerModal').then(mod => ({ default: mod.DatePickerModal })),
  { ssr: false }
);
const SpecialCharMasterModal = dynamic(() => import('@/components/modals/SpecialCharMasterModal'), { ssr: false });
const UserSelectModal = dynamic(
  () => import('@/components/modals/UserSelectModal').then(mod => ({ default: mod.UserSelectModal })),
  { ssr: false }
);

// ★ APImproveModal, DetectionSectionModal — 같은 디렉토리 (상대 경로)
import APImproveModal from './APImproveModal';
const DetectionSectionModal = dynamic(() => import('./DetectionSectionModal'), { ssr: false });
const PreventionSectionModal = dynamic(() => import('./PreventionSectionModal'), { ssr: false });
const IndustryImproveModal = dynamic(() => import('@/components/modals/IndustryImproveModal'), { ssr: false });

// ────── Props 타입 ──────

interface SpecialCharModalState {
  riskDataKey: string;
  currentValue: string;
}

export interface AllTabModalsProps {
  // ── DataSelectModal (설계검증 예방/설계검증 검출/특별특성) ──
  controlModal: ControlModalState;
  closeControlModal: () => void;
  modalTitle: string;
  modalItemCode: string;
  currentValues: string[];
  switchModes?: Array<{ id: string; label: string; itemCode: string }>;
  handleModeChange: (mode: string) => void;
  handleSave: (selectedValues: string[]) => void;
  handleDelete: () => void;
  sodInfo?: { s: number; o: number; d: number; ap?: string };
  sodRecommendation?: {
    category: 'O' | 'D';
    currentRating: number;
    targetRating: number;
    sodItem: SODItem | null;
  };
  state: WorksheetState | undefined;

  // ── SODSelectModal ──
  sodModal: SODModalState;
  closeSodModal: () => void;
  handleSODSelect: (rating: number, item: SODItem) => void;

  // ── LLDSelectModal ──
  lldModal: LLDModalState;
  closeLldModal: () => void;
  handleLldSelect: (lldNo: string, fmeaId?: string, detail?: {
    lldNo: string; applyTarget?: 'prevention' | 'detection';
    improvement: string; failureMode: string; cause: string;
  }) => void;
  handleAutoLld?: () => void;

  // ── UserSelectModal ──
  userModal: UserModalState;
  closeUserModal: () => void;
  handleUserSelect: (user: UserInfo) => void;

  // ── DatePickerModal ──
  dateModal: DateModalState;
  closeDateModal: () => void;
  handleDateSelect: (date: string) => void;

  // ── APResultModal ──
  apModal: {
    isOpen: boolean;
    stage: 5 | 6;
    data: Array<{
      id: string; processName: string; failureMode: string; failureCause: string;
      severity: number; occurrence: number; detection: number; ap: 'H' | 'M' | 'L';
    }>;
  };
  setApModal: React.Dispatch<React.SetStateAction<{
    isOpen: boolean;
    stage: 5 | 6;
    data: Array<{
      id: string; processName: string; failureMode: string; failureCause: string;
      severity: number; occurrence: number; detection: number; ap: 'H' | 'M' | 'L';
    }>;
  }>>;

  // ── APImproveModal ──
  apImproveModal: {
    isOpen: boolean; uniqueKey: string; fmId: string; fcId: string;
    s: number; o: number; d: number; ap: 'H' | 'M' | 'L'; failureMode?: string;
  };
  setApImproveModal: React.Dispatch<React.SetStateAction<{
    isOpen: boolean; uniqueKey: string; fmId: string; fcId: string;
    s: number; o: number; d: number; ap: 'H' | 'M' | 'L'; failureMode?: string;
  }>>;
  handleApImproveSave: (data: {
    uniqueKey: string; direction: string;
    preventionOpt?: string; detectionOpt?: string;
  }) => void;

  // ── SpecialCharMasterModal ──
  specialCharModal: SpecialCharModalState | null;
  setSpecialCharModal: React.Dispatch<React.SetStateAction<SpecialCharModalState | null>>;
  handleSpecialCharSelect: (symbol: string) => void;

}

/**
 * AllTab 모달 렌더링 전용 컴포넌트
 * - 순수 렌더 컴포넌트 (상태 없음, props로만 동작)
 */
export default function AllTabModals({
  // DataSelectModal
  controlModal, closeControlModal, modalTitle, modalItemCode,
  currentValues, switchModes, handleModeChange, handleSave, handleDelete,
  sodInfo, sodRecommendation, state,
  // SODSelectModal
  sodModal, closeSodModal, handleSODSelect,
  // LLDSelectModal
  lldModal, closeLldModal, handleLldSelect, handleAutoLld,
  // UserSelectModal
  userModal, closeUserModal, handleUserSelect,
  // DatePickerModal
  dateModal, closeDateModal, handleDateSelect,
  // APResultModal
  apModal, setApModal,
  // APImproveModal
  apImproveModal, setApImproveModal, handleApImproveSave,
  // SpecialCharMasterModal
  specialCharModal, setSpecialCharModal, handleSpecialCharSelect,
}: AllTabModalsProps) {

  // ★ fmeaId 추출 (LLD, SpecialChar 모달에서 사용)
  const fmeaId = state?.fmeaId
    || (typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('id') || ''
      : '');

  return (
    <>
      {/* 설계검증 예방/설계검증 검출/특별특성 선택 모달 */}
      {controlModal.isOpen && state && (() => {
        const resolvedProcessNo = controlModal.processNo || '';
        if (!resolvedProcessNo) {
        }

        // ★ 2026-03-02: -opt 타입 → 산업DB 개선안 선택 모달
        if (controlModal.type === 'prevention-opt' || controlModal.type === 'detection-opt') {
          return (
            <IndustryImproveModal
              isOpen={controlModal.isOpen}
              onClose={closeControlModal}
              onSave={handleSave}
              onDelete={handleDelete}
              mode={controlModal.type === 'prevention-opt' ? 'prevention' : 'detection'}
              fcText={controlModal.fcText}
              fmText={controlModal.fmText}
              processNo={resolvedProcessNo}
              processName={controlModal.processName}
              currentValues={currentValues}
              sodInfo={sodInfo}
            />
          );
        }

        // ★ 2026-02-28: 설계검증 검출(A6) → 2섹션 DetectionSectionModal로 라우팅
        if (modalItemCode === 'A6' && controlModal.type === 'detection') {
          return (
            <DetectionSectionModal
              isOpen={controlModal.isOpen}
              onClose={closeControlModal}
              onSave={handleSave}
              onDelete={handleDelete}
              fmText={controlModal.fmText}
              fcText={controlModal.fcText}
              processNo={resolvedProcessNo}
              processName={controlModal.processName}
              currentValues={currentValues}
              sodInfo={sodInfo}
            />
          );
        }

        // ★ 2026-02-28: 설계검증 예방(B5) → 2섹션 PreventionSectionModal로 라우팅
        if (modalItemCode === 'B5' && controlModal.type === 'prevention') {
          return (
            <PreventionSectionModal
              isOpen={controlModal.isOpen}
              onClose={closeControlModal}
              onSave={handleSave}
              onDelete={handleDelete}
              fcText={controlModal.fcText}
              processNo={resolvedProcessNo}
              processName={controlModal.processName}
              currentValues={currentValues}
              sodInfo={sodInfo}
            />
          );
        }

        return (
          <DataSelectModal
            isOpen={controlModal.isOpen}
            title={modalTitle}
            itemCode={modalItemCode}
            onClose={closeControlModal}
            onSave={handleSave}
            onDelete={handleDelete}
            singleSelect={false}
            processNo={resolvedProcessNo}
            processName={controlModal.processName}
            fcText={controlModal.fcText}
            parentCategory={controlModal.m4}
            currentValues={currentValues}
            switchModes={switchModes}
            currentMode={controlModal.type}
            onModeChange={handleModeChange}
            sodInfo={sodInfo}
            sodRecommendation={sodRecommendation}
          />
        );
      })()}

      {/* SOD 선택 모달 */}
      <SODSelectModal
        isOpen={sodModal.isOpen}
        onClose={closeSodModal}
        onSelect={handleSODSelect}
        category={sodModal.category}
        fmeaType="P-FMEA"
        currentValue={sodModal.currentValue}
        scope={sodModal.scope}
      />

      {/* LLD 선택 모달 */}
      <LLDSelectModal
        isOpen={lldModal.isOpen}
        onClose={closeLldModal}
        onSelect={handleLldSelect}
        currentValue={lldModal.currentValue}
        fmeaId={fmeaId}
        fmText={lldModal.fmText}
        fcText={lldModal.fcText}
        pcText={lldModal.pcText}
        dcText={lldModal.dcText}
        onAutoSelect={handleAutoLld}
      />

      {/* 사용자 선택 모달 */}
      <UserSelectModal
        isOpen={userModal.isOpen}
        onClose={closeUserModal}
        onSelect={handleUserSelect}
      />

      {/* 날짜 선택 모달 */}
      <DatePickerModal
        isOpen={dateModal.isOpen}
        onClose={closeDateModal}
        onSelect={handleDateSelect}
        currentValue={dateModal.currentValue}
        title={dateModal.field === 'targetDate' ? '목표완료일자 선택' : '완료일자 선택'}
      />

      {/* AP 결과 모달 */}
      <APResultModal
        isOpen={apModal.isOpen}
        onClose={() => setApModal(prev => ({ ...prev, isOpen: false }))}
        stage={apModal.stage}
        data={apModal.data}
      />

      {/* AP 개선 방향 모달 (H/M 클릭) */}
      <APImproveModal
        isOpen={apImproveModal.isOpen}
        onClose={() => setApImproveModal(prev => ({ ...prev, isOpen: false }))}
        s={apImproveModal.s}
        o={apImproveModal.o}
        d={apImproveModal.d}
        ap={apImproveModal.ap}
        uniqueKey={apImproveModal.uniqueKey}
        failureMode={apImproveModal.failureMode}
        currentPC={(state?.riskData?.[`prevention-${apImproveModal.uniqueKey}`] as string) || ''}
        currentDC={(state?.riskData?.[`detection-${apImproveModal.uniqueKey}`] as string) || ''}
        onSave={handleApImproveSave}
      />

      {/* 특별특성 등록표 모달 (셀 선택 모드) */}
      {specialCharModal && (
        <SpecialCharMasterModal
          isOpen={!!specialCharModal}
          onClose={() => setSpecialCharModal(null)}
          onSelect={handleSpecialCharSelect}
          currentFmeaId={fmeaId}
        />
      )}

    </>
  );
}
