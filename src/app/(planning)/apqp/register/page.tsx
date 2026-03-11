/**
 * @file page.tsx
 * @description APQP 등록 페이지 (리팩토링 v12.0 - JSX 전용)
 */

'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useLocale } from '@/lib/locale';
// ✅ xlsx/xlsx-js-style: dynamic import
const BizInfoSelectModal = dynamic(
  () => import('@/components/modals/BizInfoSelectModal').then(mod => ({ default: mod.BizInfoSelectModal })),
  { ssr: false }
);
// ✅ xlsx/xlsx-js-style: dynamic import
const UserSelectModal = dynamic(
  () => import('@/components/modals/UserSelectModal').then(mod => ({ default: mod.UserSelectModal })),
  { ssr: false }
);
import { DatePickerModal } from '@/components/DatePickerModal';
import { CFTAccessLogTable } from '@/components/tables/CFTAccessLogTable';
import { CFTRegistrationTable, createInitialCFTMembers } from '@/components/tables/CFTRegistrationTable';
import { BizInfoProject } from '@/types/bizinfo';
import APQPTopNav from '@/components/layout/APQPTopNav';
import { FixedLayout } from '@/components/layout';
import { LinkageModal } from '@/components/linkage/LinkageModal';
import CreateDocumentModal from '@/components/modals/CreateDocumentModal';
import AlertModal from '@/components/modals/AlertModal';
import { DevLevel } from './types';
import { useApqpRegister } from './hooks/useApqpRegister';
import { useApqpSave } from './hooks/useApqpSave';
import { FmeaSelectModal, CpSelectModal, PfdSelectModal, ApqpSelectModal } from './components/DocSelectModals';

// =====================================================
// 메인 컴포넌트
// =====================================================
function APQPRegisterPageContent() {
  const { t } = useLocale();
  const reg = useApqpRegister();

  const { handleSave, cftAlertRoles, setCftAlertRoles } = useApqpSave({
    apqpId: reg.apqpId,
    apqpInfo: reg.apqpInfo,
    cftMembers: reg.cftMembers,
    linkedFmea: reg.linkedFmea,
    linkedDfmea: reg.linkedDfmea,
    linkedCp: reg.linkedCp,
    linkedPfd: reg.linkedPfd,
    isEditMode: reg.isEditMode,
    originalData: reg.originalData,
    userName: reg.user?.name || 'Unknown',
    setOriginalData: reg.setOriginalData,
    setSaveStatus: reg.setSaveStatus,
    setIsCreateModalOpen: reg.setIsCreateModalOpen,
    recordAccessLog: reg.recordAccessLog,
    router: reg.router,
  });

  const cftNames = reg.cftMembers.filter(m => m.name).map(m => m.name).join(', ');
  const headerCell = "bg-[#00587a] text-white px-2 py-1.5 border border-white font-semibold text-xs text-center whitespace-nowrap";
  const inputCell = "border border-gray-300 px-1 py-0.5 overflow-hidden";

  return (
    <FixedLayout topNav={<APQPTopNav />} topNavHeight={48} showSidebar={true} contentPadding="px-1 py-2">
      <div className="font-[Malgun_Gothic]">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{reg.isEditMode ? '✏️' : '📝'}</span>
            <h1 className="text-sm font-bold text-gray-800">APQP {reg.isEditMode ? t('수정') : t('등록')}</h1>
            {reg.apqpId && <span className="text-xs text-gray-500 ml-2">ID: {reg.apqpId}</span>}
            {reg.isEditMode && <span className="px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded font-bold">{t('수정모드')}</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={reg.handleNewRegister} className="px-3 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 font-semibold">➕ 새로 작성(Create)</button>
            <button onClick={reg.handleEditClick} className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 font-semibold">✏️ {t('편집')}</button>
            <button onClick={handleSave} disabled={reg.saveStatus === 'saving'} className={`px-4 py-1.5 text-xs font-bold rounded ${reg.saveStatus === 'saving' ? 'bg-gray-300 text-gray-500' : reg.saveStatus === 'saved' ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              {reg.saveStatus === 'saving' ? `⏳ ${t('저장 중...')}` : reg.saveStatus === 'saved' ? `✓ ${t('저장됨')}` : `💾 ${t('저장')}`}
            </button>
          </div>
        </div>

        {/* 기본정보 테이블 */}
        <div className="bg-white rounded border border-gray-300 mb-3">
          <div className="bg-[#dbeafe] px-3 py-1.5 border-b border-gray-300">
            <h2 className="text-xs font-bold text-gray-700">{t('기획 및 준비 (1단계)')}</h2>
          </div>
          <table className="w-full border-collapse text-xs table-fixed">
            <colgroup><col style={{ width: '8%' }} /><col style={{ width: '14%' }} /><col style={{ width: '8%' }} /><col style={{ width: '14%' }} /><col style={{ width: '7%' }} /><col style={{ width: '14%' }} /><col style={{ width: '7%' }} /><col style={{ width: '14%' }} /></colgroup>
            <tbody>
              {/* 1행 */}
              <tr className="h-8">
                <td className={headerCell}>{t('개발레벨')}</td>
                <td className={inputCell}>
                  <select value={reg.apqpInfo.developmentLevel} onChange={e => {
                    const newLevel = e.target.value as DevLevel;
                    reg.updateField('developmentLevel', newLevel);
                    if (!reg.isEditMode) {
                      const newId = reg.generateAPQPId(newLevel);
                      reg.setApqpId(newId);
                      reg.router.replace(`/apqp/register?id=${newId}`);
                    }
                  }} className="w-full h-7 px-2 text-xs border border-gray-300 bg-white rounded font-semibold cursor-pointer">
                    <option value="">{t('선택')}</option>
                    <option value="NEW">{t('신규개발')}</option>
                    <option value="MAJOR">Major</option>
                    <option value="MINOR">Minor</option>
                    <option value="OTHER">기타</option>
                  </select>
                </td>
                <td className={headerCell}>{t('APQP명')}</td>
                <td className={inputCell}>
                  <input type="text" value={reg.apqpInfo.subject} onChange={e => reg.updateField('subject', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="시스템, 서브시스템 및/또는 구성품" />
                </td>
                <td className={headerCell}>APQP ID</td>
                <td className={inputCell}>
                  <span className="px-2 text-xs font-semibold text-blue-600 cursor-pointer hover:underline hover:text-blue-700" onClick={() => reg.router.push('/apqp/list')} title="클릭하여 APQP 리스트로 이동">{reg.apqpId}</span>
                </td>
                <td className={`${headerCell} bg-yellow-600`}>연동 FMEA</td>
                <td className={inputCell}>
                  <div className="flex items-center gap-2 px-2">
                    {reg.linkedFmea ? (
                      <>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-yellow-500 cursor-pointer hover:bg-yellow-600" onClick={() => reg.router.push(`/pfmea/register?id=${reg.linkedFmea!.toLowerCase()}`)} title="PFMEA 등록화면으로 이동">PFMEA</span>
                        <span className="text-xs font-semibold text-yellow-600 cursor-pointer hover:underline" onClick={() => reg.loadFmeaList('P')} title="PFMEA 변경">{reg.linkedFmea}</span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 cursor-pointer hover:text-yellow-600" onClick={() => reg.loadFmeaList('P')}>선택...</span>
                    )}
                    {reg.linkedDfmea && (
                      <>
                        <span className="text-gray-300 mx-0.5">|</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-indigo-500 cursor-pointer hover:bg-indigo-600" onClick={() => reg.router.push(`/dfmea/register?id=${reg.linkedDfmea!.toLowerCase()}`)} title="DFMEA 등록화면으로 이동">DFMEA</span>
                        <span className="text-xs font-semibold text-indigo-600 cursor-pointer hover:underline" onClick={() => reg.loadFmeaList('D')} title="DFMEA 변경">{reg.linkedDfmea}</span>
                      </>
                    )}
                  </div>
                </td>
              </tr>
              {/* 2행 */}
              <tr className="h-8">
                <td className={headerCell}>{t('개발 책임')}</td>
                <td className={inputCell}>
                  <div className="flex items-center gap-1">
                    <input type="text" value={reg.apqpInfo.processResponsibility} onChange={e => reg.updateField('processResponsibility', e.target.value)} className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="부서" />
                    <button onClick={() => { reg.setUserModalTarget('design'); reg.setUserModalOpen(true); }} className="text-blue-500 hover:text-blue-700 px-1 shrink-0">🔍</button>
                  </div>
                </td>
                <td className={headerCell}>{t('APQP 담당자')}</td>
                <td className={inputCell}>
                  <div className="flex items-center gap-1">
                    <input type="text" value={reg.apqpInfo.apqpResponsibleName} onChange={e => reg.updateField('apqpResponsibleName', e.target.value)} className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="담당자 성명" />
                    <button onClick={() => { reg.setUserModalTarget('responsible'); reg.setUserModalOpen(true); }} className="text-blue-500 hover:text-blue-700 px-1 shrink-0">🔍</button>
                  </div>
                </td>
                <td className={headerCell}>{t('시작 일자')}</td>
                <td className={inputCell}>
                  <input type="text" readOnly value={reg.apqpInfo.apqpStartDate} onClick={() => reg.setStartDateModalOpen(true)} className="w-full h-7 px-2 text-xs border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50" placeholder="클릭하여 선택" />
                </td>
                <td className={`${headerCell} bg-teal-600`}>연동 CP</td>
                <td className={inputCell}>
                  <div className="flex items-center gap-2 px-2">
                    {reg.linkedCp ? (
                      <>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-teal-500 cursor-pointer hover:bg-teal-600" onClick={() => reg.router.push(`/control-plan/register?id=${reg.linkedCp!.toLowerCase()}`)} title="CP 등록화면으로 이동">CP</span>
                        <span className="text-xs font-semibold text-teal-600 cursor-pointer hover:underline" onClick={() => reg.setLinkageModalOpen(true)} title="연동 관리">{reg.linkedCp}</span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </div>
                </td>
              </tr>
              {/* 3행 */}
              <tr className="h-8">
                <td className={headerCell}>{t('고객 명')}</td>
                <td className={inputCell}>
                  <div className="flex items-center gap-1">
                    <input type="text" value={reg.apqpInfo.customerName} onChange={e => reg.updateField('customerName', e.target.value)} className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="고객 명" />
                    <button onClick={() => reg.setBizInfoModalOpen(true)} className="text-blue-500 hover:text-blue-700">🔍</button>
                  </div>
                </td>
                <td className={headerCell}>{t('목표완료일')}</td>
                <td className={inputCell}>
                  <input type="text" readOnly value={reg.apqpInfo.apqpRevisionDate} onClick={() => reg.setRevisionDateModalOpen(true)} className="w-full h-7 px-2 text-xs border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50" placeholder="클릭하여 선택" />
                </td>
                <td className={headerCell}>{t('회사 명')}</td>
                <td className={inputCell}><input type="text" value={reg.apqpInfo.companyName} onChange={e => reg.updateField('companyName', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="회사 명" /></td>
                <td className={`${headerCell} bg-yellow-600`}>연동 PFMEA</td>
                <td className={inputCell}>
                  <div className="flex items-center gap-2 px-2">
                    {reg.linkedFmea ? (
                      <>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-yellow-500 cursor-pointer hover:bg-yellow-600" onClick={() => reg.router.push(`/pfmea/register?id=${reg.linkedFmea!.toLowerCase()}`)} title="PFMEA 등록화면으로 이동">PFMEA</span>
                        <span className="text-xs font-semibold text-yellow-600 cursor-pointer hover:underline" onClick={() => reg.loadFmeaList('P')} title="PFMEA 변경">{reg.linkedFmea}</span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 cursor-pointer hover:text-yellow-600" onClick={() => reg.loadFmeaList('P')}>선택...</span>
                    )}
                  </div>
                </td>
              </tr>
              {/* 4행 */}
              <tr className="h-8">
                <td className={headerCell}>{t('모델 연식')}</td>
                <td className={inputCell}><input type="text" value={reg.apqpInfo.modelYear} onChange={e => reg.updateField('modelYear', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="어플리케이션" /></td>
                <td className={headerCell}>{t('엔지니어링 위치')}</td>
                <td className={inputCell}><input type="text" value={reg.apqpInfo.engineeringLocation} onChange={e => reg.updateField('engineeringLocation', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="엔지니어링 위치" /></td>
                <td className={headerCell}>{t('품명')}</td>
                <td className={inputCell}><input type="text" value={reg.apqpInfo.partName} onChange={e => reg.updateField('partName', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="완제품명" /></td>
                <td className={`${headerCell} bg-indigo-600`}>연동 DFMEA</td>
                <td className={inputCell}>
                  <div className="flex items-center gap-2 px-2">
                    {reg.linkedDfmea ? (
                      <>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-indigo-500 cursor-pointer hover:bg-indigo-600" onClick={() => reg.router.push(`/dfmea/register?id=${reg.linkedDfmea!.toLowerCase()}`)} title="DFMEA 등록화면으로 이동">DFMEA</span>
                        <span className="text-xs font-semibold text-indigo-600 cursor-pointer hover:underline" onClick={() => reg.loadFmeaList('D')} title="DFMEA 변경">{reg.linkedDfmea}</span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 cursor-pointer hover:text-indigo-600" onClick={() => reg.loadFmeaList('D')}>선택...</span>
                    )}
                  </div>
                </td>
              </tr>
              {/* 5행 */}
              <tr className="h-8">
                <td className={headerCell}>{t('품번')}</td>
                <td className={inputCell}><input type="text" value={reg.apqpInfo.partNo} onChange={e => reg.updateField('partNo', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="품번" /></td>
                <td className={headerCell}>{t('상호기능팀')}</td>
                <td className={inputCell}><span className="text-xs text-gray-700 px-2">{cftNames || '-'}</span></td>
                <td className={headerCell}>{t('기밀수준')}</td>
                <td className={inputCell}>
                  <select value={reg.apqpInfo.confidentialityLevel} onChange={e => reg.updateField('confidentialityLevel', e.target.value)} className="w-full h-7 px-1 text-xs border-0 bg-transparent focus:outline-none">
                    <option value="">선택</option>
                    <option value="사업용도">{t('사업용도')}</option>
                    <option value="독점">{t('독점')}</option>
                    <option value="기밀">{t('기밀')}</option>
                  </select>
                </td>
                <td className={`${headerCell} bg-cyan-600`}>연동 PFD</td>
                <td className={inputCell}>
                  <div className="flex items-center gap-2 px-2">
                    {reg.linkedPfd ? (
                      <>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-cyan-500 cursor-pointer hover:bg-cyan-600" onClick={() => reg.router.push(`/pfd/register?id=${reg.linkedPfd!.toLowerCase()}`)} title="PFD 등록화면으로 이동">PFD</span>
                        <span className="text-xs font-semibold text-cyan-600 cursor-pointer hover:underline" onClick={() => reg.setLinkageModalOpen(true)} title="연동 관리">{reg.linkedPfd}</span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* APQP 기초정보 등록 옵션 */}
        <div className="mb-3">
          <table className="w-full border-collapse text-xs">
            <tbody>
              <tr className="h-8">
                <td className="w-[20%] bg-[#2563eb] text-white px-3 py-1.5 border border-gray-400 font-bold text-center">{t('APQP 기초 정보등록')}</td>
                <td onClick={() => window.location.href = `/apqp/worksheet?id=${reg.apqpId}`} className="w-[40%] px-3 py-1.5 border border-gray-400 text-center cursor-pointer font-semibold bg-[#dbeafe] text-blue-700 hover:bg-blue-200">{t('APQP 작성화면으로 이동')}</td>
                <td onClick={() => window.location.href = `/apqp/list`} className="w-[40%] px-3 py-1.5 border border-gray-400 text-center cursor-pointer font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200">{t('APQP 리스트 보기')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* CFT 리스트 */}
        <div id="cft-section" className="mt-6 scroll-mt-20">
          <CFTRegistrationTable
            title="CFT 리스트"
            members={reg.cftMembers}
            onMembersChange={reg.setCftMembers}
            onUserSearch={(index) => { reg.setSelectedMemberIndex(index); reg.setUserModalTarget('cft'); reg.setUserModalOpen(true); }}
            onSave={handleSave}
            onReset={() => { if (confirm('CFT 목록을 초기화하시겠습니까?')) reg.setCftMembers(createInitialCFTMembers()); }}
            minRows={6}
          />
        </div>

        {/* CFT 접속 로그 */}
        <div className="flex items-center gap-2 mt-6 mb-2">
          <span>📊</span>
          <h2 className="text-sm font-bold text-gray-700">{t('CFT 접속 로그')}</h2>
        </div>
        <CFTAccessLogTable accessLogs={reg.accessLogs} maxRows={5} />

        {/* 하단 상태바 */}
        <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex justify-between text-xs text-gray-500">
          <span>총 {reg.cftMembers.filter(m => m.name).length}명의 CFT 멤버 | 접속 로그 {reg.accessLogs.length}건</span>
          <span>버전: APQP Suite v3.0 | 사용자: {reg.user?.name || 'APQP Lead'}</span>
        </div>

        {/* 공통 모달 */}
        <BizInfoSelectModal isOpen={reg.bizInfoModalOpen} onClose={() => reg.setBizInfoModalOpen(false)} onSelect={(info: BizInfoProject) => { reg.setApqpInfo(prev => ({ ...prev, customerName: info.customerName || '', modelYear: info.modelYear || '', partName: info.productName || '', partNo: info.partNo || '' })); reg.setBizInfoModalOpen(false); }} />
        <UserSelectModal isOpen={reg.userModalOpen} onClose={() => { reg.setUserModalOpen(false); reg.setSelectedMemberIndex(null); }} onSelect={reg.handleUserSelect} />
        <DatePickerModal isOpen={reg.startDateModalOpen} onClose={() => reg.setStartDateModalOpen(false)} onSelect={date => reg.updateField('apqpStartDate', date)} currentValue={reg.apqpInfo.apqpStartDate} title="시작 일자 선택" />
        <DatePickerModal isOpen={reg.revisionDateModalOpen} onClose={() => reg.setRevisionDateModalOpen(false)} onSelect={date => reg.updateField('apqpRevisionDate', date)} currentValue={reg.apqpInfo.apqpRevisionDate} title="목표 완료일 선택" />

        {/* 선택 모달 */}
        <FmeaSelectModal isOpen={reg.fmeaModalOpen} target={reg.fmeaSelectTarget} list={reg.fmeaList} onSelect={(id) => { if (reg.fmeaSelectTarget === 'D') reg.setLinkedDfmea(id); else reg.setLinkedFmea(id); reg.setFmeaModalOpen(false); }} onClose={() => reg.setFmeaModalOpen(false)} />
        <CpSelectModal isOpen={reg.cpModalOpen} list={reg.cpList} onSelect={(id) => { reg.setLinkedCp(id); reg.setCpModalOpen(false); }} onClose={() => reg.setCpModalOpen(false)} />
        <PfdSelectModal isOpen={reg.pfdModalOpen} list={reg.pfdList} onSelect={(id) => { reg.setLinkedPfd(id); reg.setPfdModalOpen(false); }} onClose={() => reg.setPfdModalOpen(false)} />
        <ApqpSelectModal isOpen={reg.apqpSelectModalOpen} list={reg.availableApqps} onSelect={(id) => { reg.setApqpSelectModalOpen(false); reg.router.push(`/apqp/register?id=${id}`); window.location.reload(); }} onClose={() => reg.setApqpSelectModalOpen(false)} />

        {/* 표준 연동 모달 (v2.0) */}
        <LinkageModal
          isOpen={reg.linkageModalOpen}
          onClose={() => reg.setLinkageModalOpen(false)}
          sourceInfo={{
            id: reg.apqpId,
            module: 'apqp',
            subject: reg.apqpInfo.subject,
            customerName: reg.apqpInfo.customerName,
            modelYear: reg.apqpInfo.modelYear,
            companyName: reg.apqpInfo.companyName,
            docType: reg.apqpInfo.developmentLevel === 'NEW' ? 'M' :
              reg.apqpInfo.developmentLevel === 'MAJOR' ? 'F' :
                reg.apqpInfo.developmentLevel === 'MINOR' ? 'P' : 'P',
          }}
          linkedPfdList={reg.linkedPfdList}
          linkedCpList={reg.linkedCpList}
          onAddLinkedDoc={reg.handleAddLinkedDoc}
          onRemoveLinkedDoc={reg.handleRemoveLinkedDoc}
          onToggleLinkage={reg.handleToggleLinkage}
          showPfdSection={true}
          showCpSection={true}
        />

        {/* 새로 만들기 모달 */}
        <CreateDocumentModal
          isOpen={reg.isCreateModalOpen}
          onClose={() => reg.setIsCreateModalOpen(false)}
          sourceApp="apqp"
          initialProductName={reg.apqpInfo.subject}
          initialCustomer={reg.apqpInfo.customerName}
          initialCompanyName={reg.apqpInfo.companyName}
          initialManagerName={reg.apqpInfo.apqpResponsibleName}
          initialPartNo={reg.apqpInfo.partNo}
        />

        {/* CFT 미입력 경고 모달 */}
        <AlertModal isOpen={cftAlertRoles.length > 0} onClose={() => setCftAlertRoles([])} message="사용자 검색으로 CFT를 지정해 주세요" items={cftAlertRoles} />
      </div>
    </FixedLayout>
  );
}

export default function APQPRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">Loading...</div>}>
      <APQPRegisterPageContent />
    </Suspense>
  );
}
