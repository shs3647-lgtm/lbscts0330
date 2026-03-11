// CODEFREEZE (modularized: hooks/useCpRegisterCore, hooks/useCpRegisterHandlers, components/*)
/**
 * @file page.tsx
 * @description CP 등록 페이지 — 모듈화된 슬림 버전
 * @version 11.0.0
 */

'use client';

import { Suspense, useMemo } from 'react';
import dynamic from 'next/dynamic';
// ApqpSelectModal 삭제됨 (APQP 모듈 제거)
import { DatePickerModal } from '@/components/DatePickerModal';
import { CFTAccessLogTable } from '@/components/tables/CFTAccessLogTable';
import { CFTRegistrationTable, createInitialCFTMembers } from '@/components/tables/CFTRegistrationTable';
import { BizInfoProject } from '@/types/bizinfo';
import CPTopNav from '@/components/layout/CPTopNav';
import { FixedLayout } from '@/components/layout';
import { LinkageModal } from '@/components/linkage/LinkageModal';
import { TargetModule, getNextLinkGroupNo } from '@/components/linkage/types';
import CreateDocumentModal from '@/components/modals/CreateDocumentModal';

import { CPType } from './types';
import { generateCPId } from './utils';
import { useCpRegisterCore } from './hooks/useCpRegisterCore';
import { useCpRegisterHandlers } from './hooks/useCpRegisterHandlers';
import CpBasicInfoTable from './components/CpBasicInfoTable';
import CpSelectModals from './components/CpSelectModals';
import CpMasterInfoTable from './components/CpMasterInfoTable';

// Dynamic imports (xlsx dependency)
const BizInfoSelectModal = dynamic(
  () => import('@/components/modals/BizInfoSelectModal').then(mod => ({ default: mod.BizInfoSelectModal })),
  { ssr: false }
);
const UserSelectModal = dynamic(
  () => import('@/components/modals/UserSelectModal').then(mod => ({ default: mod.UserSelectModal })),
  { ssr: false }
);

function CPRegisterPageContent() {
  const core = useCpRegisterCore();
  const handlers = useCpRegisterHandlers(core);

  const {
    user, router, isEditMode,
    cpInfo, setCpInfo, cpId, setCpId,
    cftMembers, setCftMembers, saveStatus, accessLogs,
    bizInfoModalOpen, setBizInfoModalOpen,
    userModalOpen, setUserModalOpen, setUserModalTarget, setSelectedMemberIndex,
    startDateModalOpen, setStartDateModalOpen,
    revisionDateModalOpen, setRevisionDateModalOpen,
    cpSelectModalOpen, setCpSelectModalOpen, cpSelectType, availableCps,
    selectedBaseCp, setSelectedBaseCp,
    masterInfoOpen, setMasterInfoOpen,
    fmeaSelectModalOpen, setFmeaSelectModalOpen, availableFmeas,
    selectedParentFmea, setSelectedParentFmea,
    cpSelFloating, fmeaSelFloating,
    apqpModalOpen, setApqpModalOpen, apqpList,
    selectedParentApqp, setSelectedParentApqp,
    fmeaLocked,
    linkageModalOpen, setLinkageModalOpen,
    linkedPfdList, setLinkedPfdList,
    isCreateModalOpen, setIsCreateModalOpen,
  } = core;

  const {
    updateField, openCpSelectModal, handleCpSelect,
    openFmeaSelectModal, loadApqpList,
    handleSave, handleNewRegister, handleUserSelect,
  } = handlers;

  // CFT 이름 목록
  const cftNames = useMemo(
    () => cftMembers.filter(m => m.name).map(m => m.name).join(', '),
    [cftMembers]
  );

  // CP 유형 변경 핸들러
  const handleCpTypeChange = (newType: CPType) => {
    updateField('cpType', newType);
    const currentIdType = cpId?.match(/cp\d{2}-([mfp])/i)?.[1]?.toUpperCase() || '';
    let currentId = cpId;
    if (currentIdType !== newType) {
      currentId = generateCPId(newType);
      setCpId(currentId);
      router.replace(`/control-plan/register?id=${currentId}`);
    }
    if (newType === 'M' && currentId) {
      setSelectedBaseCp(currentId);
    } else if (newType !== 'M') {
      setSelectedBaseCp(null);
    }
  };

  return (
    <FixedLayout topNav={<CPTopNav selectedCpId={cpId} />}>
      <div className="px-4 py-3">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{isEditMode ? '✏️' : '📝'}</span>
            <h1 className="text-sm font-bold text-gray-800">Control Plan {isEditMode ? '수정(Edit)' : '등록(Register)'}</h1>
            {cpId && <span className="text-xs text-gray-500 ml-2">ID: {cpId}</span>}
            {isEditMode && <span className="px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded font-bold">수정모드</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={handleNewRegister} className="px-3 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 font-semibold">➕ 새로 작성(Create)</button>
            <button onClick={() => openCpSelectModal('LOAD')} className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 font-semibold">✏️ 편집</button>
            <button onClick={handleSave} disabled={saveStatus === 'saving'} className={`px-4 py-1.5 text-xs font-bold rounded ${saveStatus === 'saving' ? 'bg-gray-300 text-gray-500' : saveStatus === 'saved' ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              {saveStatus === 'saving' ? '⏳ 저장 중...' : saveStatus === 'saved' ? '✓ 저장됨' : '💾 저장'}
            </button>
          </div>
        </div>

        {/* Basic info table */}
        <CpBasicInfoTable
          cpInfo={cpInfo} cpId={cpId} isEditMode={isEditMode}
          selectedBaseCp={selectedBaseCp} selectedParentFmea={selectedParentFmea}
          fmeaLocked={fmeaLocked}
          linkedPfdList={linkedPfdList} cftNames={cftNames}
          updateField={updateField} setCpId={setCpId} setCpInfo={setCpInfo} setSelectedBaseCp={setSelectedBaseCp}
          openCpSelectModal={openCpSelectModal} openFmeaSelectModal={openFmeaSelectModal}
          setBizInfoModalOpen={setBizInfoModalOpen}
          setUserModalTarget={(t) => setUserModalTarget(t as 'responsible' | 'design' | 'cft')}
          setUserModalOpen={setUserModalOpen}
          setStartDateModalOpen={setStartDateModalOpen} setRevisionDateModalOpen={setRevisionDateModalOpen}
          setLinkageModalOpen={setLinkageModalOpen}
          handleCpTypeChange={handleCpTypeChange}
          router={router}
        />

        {/* CP 기초정보 등록 옵션 */}
        <div className="mb-3">
          <table className="w-full border-collapse text-xs">
            <tbody>
              <tr className="h-8">
                <td onClick={() => setMasterInfoOpen(v => !v)} className={`w-[15%] px-3 py-1.5 border border-gray-400 font-bold text-center cursor-pointer ${masterInfoOpen ? 'bg-[#004d6b] text-white' : 'bg-[#00587a] text-white hover:bg-[#004d6b]'}`}>{masterInfoOpen ? '▼' : '▶'} CP 기초 정보등록</td>
                <td onClick={() => openCpSelectModal('M')} className={`w-[22%] px-3 py-1.5 border border-gray-400 text-center cursor-pointer font-semibold ${selectedBaseCp?.includes('-m') ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
                  {selectedBaseCp?.includes('-m') ? `✅ 마스터 ${selectedBaseCp} 적용` : '🟣 MASTER CP DATA 사용'}
                </td>
                <td onClick={() => openCpSelectModal('F')} className={`w-[22%] px-3 py-1.5 border border-gray-400 text-center cursor-pointer font-semibold ${selectedBaseCp?.includes('-f') ? 'bg-blue-600 text-white' : 'bg-[#e3f2fd] text-blue-700 hover:bg-blue-200'}`}>
                  {selectedBaseCp?.includes('-f') ? `✅ 패밀리 ${selectedBaseCp} 적용` : '🔵 Family CP Data 사용'}
                </td>
                <td onClick={() => openCpSelectModal('P')} className={`w-[22%] px-3 py-1.5 border border-gray-400 text-center cursor-pointer font-semibold ${selectedBaseCp?.includes('-p') ? 'bg-green-600 text-white' : 'bg-[#e8f5e9] text-green-700 hover:bg-green-200'}`}>
                  {selectedBaseCp?.includes('-p') ? `✅ 파트 ${selectedBaseCp} 적용` : '🟢 Part CP Data 사용'}
                </td>
                <td onClick={() => window.location.href = `/control-plan/import?cpNo=${cpId}`} className="w-[19%] px-3 py-1.5 border border-gray-400 text-center cursor-pointer hover:bg-amber-200 font-semibold text-amber-700 bg-amber-100">✏️ 신규 입력</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* CP 기초정보 패널 */}
        <CpMasterInfoTable cpNo={cpId} isOpen={masterInfoOpen} />

        {/* CFT 리스트 */}
        <div id="cft-section" className="mt-6 scroll-mt-20">
          <CFTRegistrationTable
            title="CFT 리스트" members={cftMembers} onMembersChange={setCftMembers}
            onUserSearch={(index) => { setSelectedMemberIndex(index); setUserModalTarget('cft'); setUserModalOpen(true); }}
            onSave={handleSave}
            onReset={() => { if (confirm('CFT 목록을 초기화하시겠습니까?')) setCftMembers(createInitialCFTMembers()); }}
            minRows={6} themeColor="#00587a"
          />
        </div>

        {/* CFT 접속 로그 */}
        <div className="flex items-center gap-2 mt-6 mb-2">
          <span>📊</span>
          <h2 className="text-sm font-bold text-gray-700">CFT 접속 로그</h2>
        </div>
        <CFTAccessLogTable accessLogs={accessLogs} maxRows={5} themeColor="#00587a" />

        {/* 하단 상태바 */}
        <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex justify-between text-xs text-gray-500">
          <span>총 {cftMembers.filter(m => m.name).length}명의 CFT 멤버 | 접속 로그 {accessLogs.length}건</span>
          <span>버전: Control Plan Suite v3.0 | 사용자: {user?.name || 'CP Lead'}</span>
        </div>

        {/* Modals */}
        <BizInfoSelectModal isOpen={bizInfoModalOpen} onClose={() => setBizInfoModalOpen(false)} onSelect={(info: BizInfoProject) => { setCpInfo(prev => ({ ...prev, customerName: info.customerName || '', modelYear: info.modelYear || '', partName: info.productName || '', partNo: info.partNo || '' })); setBizInfoModalOpen(false); }} />
        <UserSelectModal isOpen={userModalOpen} onClose={() => { setUserModalOpen(false); setSelectedMemberIndex(null); }} onSelect={handleUserSelect} />
        <DatePickerModal isOpen={startDateModalOpen} onClose={() => setStartDateModalOpen(false)} onSelect={date => updateField('cpStartDate', date)} currentValue={cpInfo.cpStartDate} title="시작 일자 선택" />
        <DatePickerModal isOpen={revisionDateModalOpen} onClose={() => setRevisionDateModalOpen(false)} onSelect={date => updateField('cpRevisionDate', date)} currentValue={cpInfo.cpRevisionDate} title="목표 완료일 선택" />

        {/* CP/FMEA 선택 모달 */}
        <CpSelectModals
          cpSelectModalOpen={cpSelectModalOpen} setCpSelectModalOpen={setCpSelectModalOpen}
          cpSelectType={cpSelectType} availableCps={availableCps} handleCpSelect={handleCpSelect}
          cpSelPos={cpSelFloating.pos} cpSelSize={cpSelFloating.size}
          cpSelDragStart={cpSelFloating.onDragStart} cpSelResizeStart={cpSelFloating.onResizeStart}
          fmeaSelectModalOpen={fmeaSelectModalOpen} setFmeaSelectModalOpen={setFmeaSelectModalOpen}
          availableFmeas={availableFmeas} setSelectedParentFmea={(id) => { setSelectedParentFmea(id.toLowerCase()); setFmeaSelectModalOpen(false); }}
          fmeaSelPos={fmeaSelFloating.pos} fmeaSelSize={fmeaSelFloating.size}
          fmeaSelDragStart={fmeaSelFloating.onDragStart} fmeaSelResizeStart={fmeaSelFloating.onResizeStart}
        />

        {/* 표준 연동 모달 */}
        <LinkageModal
          isOpen={linkageModalOpen} onClose={() => setLinkageModalOpen(false)}
          sourceInfo={{ id: cpId, module: 'cp', subject: cpInfo.subject, customerName: cpInfo.customerName, docType: cpInfo.cpType }}
          linkedPfdList={linkedPfdList} linkedCpList={[]}
          onAddLinkedDoc={(targetModule) => {
            if (!cpId) { alert('먼저 CP를 저장해주세요.'); return; }
            if (targetModule !== 'pfd') return;
            const nextGroupNo = getNextLinkGroupNo(linkedPfdList);
            const year = new Date().getFullYear().toString().slice(-2);
            const newId = `pfd${year}-${cpInfo.cpType.toLowerCase()}${String(linkedPfdList.length + 1).padStart(3, '0')}-L${String(nextGroupNo).padStart(2, '0')}`;
            setLinkedPfdList(prev => [...prev, {
              id: newId, module: 'pfd' as TargetModule, docType: cpInfo.cpType,
              subject: cpInfo.subject, linkGroupNo: nextGroupNo, isAutoGenerated: false, status: 'linked'
            }]);
          }}
          onRemoveLinkedDoc={(docId, targetModule) => {
            if (targetModule === 'pfd') setLinkedPfdList(prev => prev.filter(d => d.id !== docId));
          }}
          onToggleLinkage={(docId, isLinked, targetModule) => {
            if (targetModule === 'pfd') setLinkedPfdList(prev => prev.map(d => d.id === docId ? { ...d, status: isLinked ? 'linked' : 'solo' } : d));
          }}
          showPfdSection={true} showCpSection={false}
        />

        {/* 새로 만들기 모달 */}
        <CreateDocumentModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} sourceApp="cp" />
      </div>
    </FixedLayout>
  );
}

export default function CPRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">로딩 중...</div>}>
      <CPRegisterPageContent />
    </Suspense>
  );
}
