/**
 * @file page.tsx
 * @description FMEA 개정관리 페이지 - 경량화 버전 (모듈화 완료)
 * @version 2.0.0 
 * @updated 2026-01-27 - 훅/컴포넌트 분리 적용
 *
 * @status CODEFREEZE L4 (Gold) 🔒
 * @freeze_level L4 (Critical - Gold Test Passed)
 * @frozen_date 2026-03-02
 * @gold_tag v4.0.0-gold
 * @allowed_changes NONE — 사용자 명시적 승인 + full test pass 필수
 */

'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
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
import { MeetingMinutesTable } from '@/components/tables/MeetingMinutesTable';
import { BizInfoProject } from '@/types/bizinfo';
import { MeetingMinute } from '@/types/project-revision';
import PFMEATopNav from '@/components/layout/PFMEATopNav';
import { FixedLayout } from '@/components/layout';

// 훅
import { useRevisionData } from './hooks/useRevisionData';
import { useRevisionHandlers } from './hooks/useRevisionHandlers';

// 컴포넌트
import { RevisionTable } from './components/RevisionTable';
import { ProjectInfoTable } from './components/ProjectInfoTable';
import { ChangeHistoryTable, ApprovalFlowBar } from './components';

// 타입
import type { RevisionRecord } from './types';

// =====================================================
// 메인 컴포넌트
// =====================================================
function RevisionManagementPageInner() {
    const searchParams = useSearchParams();
    const idFromUrl = (searchParams.get('id') || '').toLowerCase();
    const isNewRevMode = searchParams.get('mode') === 'newrev';  // ★ 신규 개정 모드

    // 회의록 상태
    const [meetingMinutes, setMeetingMinutes] = useState<MeetingMinute[]>([]);

    // 선택된 행
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

    // 기초정보 모달
    const [bizInfoModalOpen, setBizInfoModalOpen] = useState(false);

    // ★ 사용자 선택 모달 상태
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [userSelectTarget, setUserSelectTarget] = useState<{
        revisionId: string;
        type: 'create' | 'review' | 'approve';
    } | null>(null);

    // 검색 쿼리
    const [searchQuery, setSearchQuery] = useState('');

    // 데이터 훅
    const {
        projectList,
        selectedProjectId,
        setSelectedProjectId,
        selectedInfo,
        setSelectedInfo,
        fmeaInfo,
        revisions,
        setRevisions,
        saveStatus,
        handleSave,
        requestSave,
        updateField,
        loadProjects,
    } = useRevisionData(idFromUrl);

    // 핸들러 훅
    const {
        handleAddRevision,
        handleDeleteSelected,
        handleStartNewRevision,
        toggleRow,
        toggleAllRows,
        getStatusColor,
        handleBackup,
        handleRestore,
        handleApprovalRequest,
        handleAddMeeting,
        handleUpdateMeetingField,
        handleDeleteMeeting,
        createDefaultMeetings,
    } = useRevisionHandlers({
        selectedProjectId,
        revisions,
        setRevisions,
        selectedRows,
        setSelectedRows,
        meetingMinutes,
        setMeetingMinutes,
        fmeaInfo,
    });

    // ★ 등록화면으로 이동 (개정 디테일 쟅계)
    const handleGoToRegister = () => {
        if (!selectedProjectId) return alert('FMEA를 선택해주세요.');

        // 최신 개정번호 계산 (minor 기반: 1.00→00, 1.01→01, ...)
        const latestMinor = revisions.length > 0
            ? Math.max(...revisions.map(r => parseInt(r.revisionNumber.split('.')[1]) || 0))
            : 0;
        const newRevNo = isNewRevMode ? latestMinor + 1 : latestMinor;

        // 등록화면으로 이동 (rev 파라미터 전달)
        window.location.href = `/pfmea/register?id=${selectedProjectId}&rev=Rev.${String(newRevNo).padStart(2, '0')}`;
    };

    // 회의록 초기화
    useEffect(() => {
        if (!selectedProjectId) {
            setMeetingMinutes(createDefaultMeetings());
            return;
        }
        // DB에서 회의록 로드
        const loadMeetings = async () => {
            try {
                const res = await fetch(`/api/fmea/meetings?fmeaId=${selectedProjectId}`);
                const result = await res.json();
                if (result.success && result.meetings.length > 0) {
                    setMeetingMinutes(result.meetings);
                } else {
                    setMeetingMinutes(createDefaultMeetings());
                }
            } catch {
                setMeetingMinutes(createDefaultMeetings());
            }
        };
        loadMeetings();
    }, [selectedProjectId, createDefaultMeetings]);

    // ✅ 개정 이력 자동 저장 (디바운스 1.5초)
    const revisionSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const revisionLoadedRef = useRef(false);
    useEffect(() => {
        // 최초 로드 시에는 저장 스킵
        if (!selectedProjectId || revisions.length === 0) return;
        if (!revisionLoadedRef.current) {
            revisionLoadedRef.current = true;
            return;
        }
        if (revisionSaveTimeoutRef.current) clearTimeout(revisionSaveTimeoutRef.current);
        revisionSaveTimeoutRef.current = setTimeout(() => {
            handleSave();
        }, 1500);
        return () => {
            if (revisionSaveTimeoutRef.current) clearTimeout(revisionSaveTimeoutRef.current);
        };
    }, [revisions, selectedProjectId, handleSave]);

    // 프로젝트 변경 시 로드 플래그 리셋
    useEffect(() => {
        revisionLoadedRef.current = false;
    }, [selectedProjectId]);

    // 회의록 자동 저장
    const meetingsSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (!selectedProjectId || meetingMinutes.length === 0) return;
        if (meetingsSaveTimeoutRef.current) clearTimeout(meetingsSaveTimeoutRef.current);
        meetingsSaveTimeoutRef.current = setTimeout(async () => {
            try {
                await fetch('/api/fmea/meetings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fmeaId: selectedProjectId, meetings: meetingMinutes }),
                });
            } catch (error) {
            }
        }, 1000);
        return () => {
            if (meetingsSaveTimeoutRef.current) clearTimeout(meetingsSaveTimeoutRef.current);
        };
    }, [meetingMinutes, selectedProjectId]);

    // 기초정보 선택 핸들러
    const handleBizInfoSelect = (info: BizInfoProject) => {
        setSelectedInfo(prev => ({
            ...prev,
            fmeaName: info.productName || '',
            factory: info.factory || '',
            customer: info.customerName || '',
            productName: info.productName || '',
        }));
        setBizInfoModalOpen(false);
    };

    // ★ 사용자 선택 모달 열기
    const handleOpenUserModal = (revisionId: string, type: 'create' | 'review' | 'approve') => {
        setUserSelectTarget({ revisionId, type });
        setUserModalOpen(true);
    };

    // ★ 사용자 선택 완료 핸들러
    const handleUserSelect = (user: { name?: string; position?: string; id?: string }) => {
        if (!userSelectTarget) return;
        const { revisionId, type } = userSelectTarget;

        // 이름과 직급 업데이트
        if (type === 'create') {
            updateField(revisionId, 'createName', user.name || '');
            updateField(revisionId, 'createPosition', user.position || '');
        } else if (type === 'review') {
            updateField(revisionId, 'reviewName', user.name || '');
            updateField(revisionId, 'reviewPosition', user.position || '');
        } else if (type === 'approve') {
            updateField(revisionId, 'approveName', user.name || '');
            updateField(revisionId, 'approvePosition', user.position || '');
        }

        setUserModalOpen(false);
        setUserSelectTarget(null);
    };

    // 프로젝트 필터링
    const filteredProjects = projectList.filter(p =>
        !searchQuery ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.project.projectName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 프로젝트 라벨
    const projectLabel = projectList.find(p => p.id === selectedProjectId)?.project.projectName || selectedProjectId || '미선택';

    return (
        <FixedLayout
            topNav={<PFMEATopNav selectedFmeaId={selectedProjectId} />}
            showSidebar={true}
            bgColor="#f0f0f0"
            contentPadding="p-0"
        >
            <div className="h-full overflow-y-auto px-[10px] py-[10px] font-[Malgun_Gothic]">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">📝</span>
                    <h1 className="text-base font-bold text-gray-800" title="PFMEA Revision Management Status">PFMEA 개정관리 현황(Rev. Mgmt)</h1>
                    {isNewRevMode && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-[10px] rounded font-bold">
                            신규 개정 모드(New Rev. Mode)
                        </span>
                    )}
                    {/* ★ 등록화면 이동 + 도움말 버튼 */}
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={handleGoToRegister}
                            className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1"
                        >
                            📝 등록화면으로 이동(Go to Register)
                        </button>
                        <button
                            onClick={() => alert(
                                '📋 PFMEA 개정관리 도움말\n\n' +
                                '【 화면 구성 】\n' +
                                '• 프로젝트 정보: FMEA ID(→리스트), FMEA명(→워크시트) 클릭 이동\n' +
                                '• 결재 진행: 상신→검토→승인 3단계 결재 흐름\n' +
                                '• 개정 이력: SOD 변경 이력 + 확정 이력 관리\n\n' +
                                '【 결재 흐름 】\n' +
                                '1. 작성자 지정 → 상신 클릭\n' +
                                '2. 검토자가 승인 또는 반려\n' +
                                '3. 승인자가 최종 승인 또는 반려\n' +
                                '4. 반려 시 → 작성자가 수정 후 재상신\n\n' +
                                '【 회수 】\n' +
                                '• 상신 후 검토자 처리 전 → 회수 가능\n' +
                                '• 검토 승인 후 승인자 처리 전 → 회수 가능\n\n' +
                                '【 개정 버전 】\n' +
                                '• 결재 완료 후 "REV N+1" → 새 개정 시작\n' +
                                '• "이력추가" → 현재 개정에 변경 내역 추가\n\n' +
                                '【 등록화면 이동 】\n' +
                                '• FMEA 등록정보 수정/확인 시 사용\n' +
                                '• 기초정보, 팀 멤버, 연결 문서 관리'
                            )}
                            className="px-2 py-1.5 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 cursor-pointer"
                            title="개정관리 도움말 (Help)"
                        >
                            ❓ 도움말(Help)
                        </button>
                    </div>
                </div>

                {/* 프로젝트 정보 테이블 */}
                <ProjectInfoTable selectedInfo={selectedInfo} />

                {/* ★ 결재 진행 바 (개정 이력 테이블 위에 배치) */}
                <div className="mt-2 mb-1">
                    <ApprovalFlowBar
                        revisions={revisions}
                        updateField={updateField}
                        onSave={handleSave}
                        onRequestSave={requestSave}
                        onUserSelect={handleOpenUserModal}
                        onAddRevision={handleAddRevision}
                        onStartNewRevision={handleStartNewRevision}
                        fmeaId={selectedProjectId}
                        fmeaName={selectedInfo.fmeaName}
                    />
                </div>

                {/* 개정 이력 테이블 */}
                <RevisionTable
                    revisions={revisions}
                    selectedRows={selectedRows}
                    selectedInfo={selectedInfo}
                    projectLabel={projectLabel}
                    saveStatus={saveStatus}
                    targetDate={fmeaInfo?.fmeaRevisionDate || ''}
                    toggleRow={toggleRow}
                    toggleAllRows={toggleAllRows}
                    updateField={updateField}
                    handleAddRevision={handleAddRevision}
                    handleDeleteSelected={handleDeleteSelected}
                    handleSave={handleSave}
                    getStatusColor={getStatusColor}
                    handleBackup={handleBackup}
                    handleRestore={handleRestore}
                    handleApprovalRequest={handleApprovalRequest}
                    onUserSelect={handleOpenUserModal}  /* ★ 사용자 선택 핸들러 */
                />

                {/* 회의록 섹션 */}
                <div className="mt-4">
                    <MeetingMinutesTable
                        meetingMinutes={meetingMinutes}
                        onUpdateField={handleUpdateMeetingField}
                        onDelete={handleDeleteMeeting}
                        onAdd={handleAddMeeting}
                    />
                </div>

                {/* SOD 변경 이력 */}
                <div className="mt-4">
                    <ChangeHistoryTable fmeaId={selectedProjectId} />
                </div>

                {/* 하단 상태바 */}
                <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex justify-between text-xs text-gray-500">
                    <span>총 {revisions.length}개의 개정 이력(Revision History) | 회의록(Minutes) {meetingMinutes.length}건</span>
                    <span>버전: FMEA Suite v3.0</span>
                </div>

                {/* 기초정보 선택 모달 */}
                <BizInfoSelectModal
                    isOpen={bizInfoModalOpen}
                    onSelect={handleBizInfoSelect}
                    onClose={() => setBizInfoModalOpen(false)}
                />

                {/* ★ 사용자 선택 모달 */}
                <UserSelectModal
                    isOpen={userModalOpen}
                    onClose={() => { setUserModalOpen(false); setUserSelectTarget(null); }}
                    onSelect={handleUserSelect}
                    title={userSelectTarget?.type === 'create' ? '작성자 선택(Select Author)' : userSelectTarget?.type === 'review' ? '검토자 선택(Select Reviewer)' : '승인자 선택(Select Approver)'}
                />
            </div>
        </FixedLayout>
    );
}

// =====================================================
// 메인 컴포넌트 (Suspense 바운더리)
// =====================================================
export default function RevisionManagementPage() {
    return (
        <Suspense fallback={<div className="p-4">로딩 중...(Loading...)</div>}>
            <RevisionManagementPageInner />
        </Suspense>
    );
}
