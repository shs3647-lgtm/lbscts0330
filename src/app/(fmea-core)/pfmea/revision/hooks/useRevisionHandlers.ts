/**
 * @file useRevisionHandlers.ts
 * @description 개정 이력 이벤트 핸들러 훅
 * @module pfmea/revision/hooks
 *
 * @status CODEFREEZE L4 (Gold) 🔒
 * @freeze_level L4 (Critical - Gold Test Passed)
 * @frozen_date 2026-03-02
 * @gold_tag v4.0.0-gold
 * @allowed_changes NONE — 사용자 명시적 승인 + full test pass 필수
 */

import { useCallback } from 'react';
import { RevisionRecord, FMEAInfoData } from '../types';
import { MeetingMinute } from '@/types/project-revision';

interface UseRevisionHandlersProps {
    selectedProjectId: string;
    revisions: RevisionRecord[];
    setRevisions: React.Dispatch<React.SetStateAction<RevisionRecord[]>>;
    selectedRows: Set<string>;
    setSelectedRows: React.Dispatch<React.SetStateAction<Set<string>>>;
    meetingMinutes: MeetingMinute[];
    setMeetingMinutes: React.Dispatch<React.SetStateAction<MeetingMinute[]>>;
    fmeaInfo: FMEAInfoData | null;
}

interface UseRevisionHandlersReturn {
    // 개정 관리
    handleAddRevision: () => void;
    handleDeleteSelected: () => void;
    handleStartNewRevision: () => Promise<void>;
    toggleRow: (id: string) => void;
    toggleAllRows: () => void;
    getStatusColor: (status: string) => string;

    // 버전 백업/복구
    handleBackup: (version: string) => Promise<void>;
    handleRestore: (version: string) => Promise<void>;

    // 결재
    handleApprovalRequest: (revision: RevisionRecord, approvalType: 'CREATE' | 'REVIEW' | 'APPROVE') => Promise<void>;

    // 회의록
    handleAddMeeting: () => void;
    handleUpdateMeetingField: (id: string, field: keyof MeetingMinute, value: unknown) => void;
    handleDeleteMeeting: (id: string) => void;
    createDefaultMeetings: () => MeetingMinute[];
}

export function useRevisionHandlers({
    selectedProjectId,
    revisions,
    setRevisions,
    selectedRows,
    setSelectedRows,
    meetingMinutes,
    setMeetingMinutes,
    fmeaInfo,
}: UseRevisionHandlersProps): UseRevisionHandlersReturn {

    // 개정 추가 (CFT 역할 자동 채움 + 개정사유 입력)
    const handleAddRevision = useCallback(() => {
        if (!selectedProjectId) {
            alert('프로젝트를 선택해주세요.');
            return;
        }

        const reason = prompt('개정 사유를 입력하세요:');
        if (reason === null) return;  // 취소 시 중단

        const latestNumber = revisions.length > 0
            ? parseInt(revisions[revisions.length - 1].revisionNumber.split('.')[1] || '0')
            : -1;
        const nextNumber = (latestNumber + 1).toString().padStart(2, '0');
        const today = new Date().toISOString().split('T')[0];

        const newRevision: RevisionRecord = {
            id: `REV-${selectedProjectId}-${Date.now()}`,
            projectId: selectedProjectId,
            revisionNumber: `0.${nextNumber}`,
            revisionDate: today,
            revisionHistory: reason || '',
            // 작성자: FMEA 담당자 (CFT Leader)
            createPosition: fmeaInfo?.fmeaResponsiblePosition || '',
            createName: fmeaInfo?.fmeaResponsibleName || '',
            createDate: today,
            createStatus: '진행',
            // 검토자: CFT Technical Leader
            reviewPosition: fmeaInfo?.reviewResponsiblePosition || '',
            reviewName: fmeaInfo?.reviewResponsibleName || '',
            reviewDate: '',
            reviewStatus: '',
            // 승인자: CFT Champion
            approvePosition: fmeaInfo?.approvalResponsiblePosition || '',
            approveName: fmeaInfo?.approvalResponsibleName || '',
            approveDate: '',
            approveStatus: '',
        };

        setRevisions(prev => [...prev, newRevision]);
    }, [selectedProjectId, revisions, setRevisions, fmeaInfo]);

    // ★ REV N+1 생성 — 기존데이터 적용 (묻지 않고 바로 워크시트 이동)
    const handleStartNewRevision = useCallback(async () => {
        if (!selectedProjectId) {
            alert('프로젝트를 선택해주세요.');
            return;
        }

        // 기존데이터 적용: 개정 이력 추가 → 워크시트로 바로 이동
        const latestNumber = revisions.length > 0
            ? parseInt(revisions[revisions.length - 1].revisionNumber.split('.')[1] || '0')
            : -1;
        const nextNumber = (latestNumber + 1).toString().padStart(2, '0');

        const newRevision: RevisionRecord = {
            id: `REV-${selectedProjectId}-${Date.now()}`,
            projectId: selectedProjectId,
            revisionNumber: `0.${nextNumber}`,
            revisionDate: '',
            revisionHistory: '기존데이터 개정',
            createPosition: fmeaInfo?.fmeaResponsiblePosition || '',
            createName: fmeaInfo?.fmeaResponsibleName || '',
            createDate: new Date().toISOString().split('T')[0],
            createStatus: '진행',
            reviewPosition: fmeaInfo?.reviewResponsiblePosition || '',
            reviewName: fmeaInfo?.reviewResponsibleName || '',
            reviewDate: '',
            reviewStatus: '',
            approvePosition: fmeaInfo?.approvalResponsiblePosition || '',
            approveName: fmeaInfo?.approvalResponsibleName || '',
            approveDate: '',
            approveStatus: '',
        };

        setRevisions(prev => [...prev, newRevision]);

        // DB 저장 후 워크시트로 이동
        try {
            await fetch('/api/fmea/revisions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: selectedProjectId,
                    revisions: [...revisions, newRevision],
                }),
            });
        } catch (e) {
            console.error('[개정관리] 개정 이력 저장 실패:', e);
        }

        window.location.href = `/pfmea/worksheet?id=${selectedProjectId}`;
    }, [selectedProjectId, revisions, setRevisions, fmeaInfo]);

    // 선택 삭제 (보호: 디폴트 1번째 개정 + 승인완료 개정 삭제 불가)
    const handleDeleteSelected = useCallback(async () => {
        if (selectedRows.size === 0) {
            alert('삭제할 개정 이력을 선택해주세요.');
            return;
        }

        // ✅ 보호된 행 필터링 (디폴트 첫 번째 + 승인완료)
        const protectedIds = new Set<string>();
        revisions.forEach((r, idx) => {
            if (idx === 0 || r.approveStatus === '승인') {
                protectedIds.add(r.id);
            }
        });
        const deletableRows = [...selectedRows].filter(id => !protectedIds.has(id));
        const blockedCount = selectedRows.size - deletableRows.length;

        if (deletableRows.length === 0) {
            alert('선택한 개정은 모두 삭제할 수 없습니다.\n(디폴트 개정 또는 승인완료 개정)');
            return;
        }

        const msg = blockedCount > 0
            ? `${deletableRows.length}개 삭제 가능 (${blockedCount}개는 보호됨: 디폴트/승인완료)\n\n삭제하시겠습니까?`
            : `선택한 ${deletableRows.length}개의 개정 이력을 삭제하시겠습니까?`;
        if (!confirm(msg)) return;

        const deleteSet = new Set(deletableRows);
        const updated = revisions.filter(r => !deleteSet.has(r.id));
        setRevisions(updated);
        setSelectedRows(new Set());

        // DB 저장 (삭제 반영)
        try {
            await fetch('/api/fmea/revisions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: selectedProjectId, revisions: updated }),
            });
        } catch (e) {
            console.error('[개정관리] 삭제 후 DB 동기화 실패:', e);
        }
    }, [selectedRows, revisions, selectedProjectId, setRevisions, setSelectedRows]);

    // 행 선택 토글
    const toggleRow = useCallback((id: string) => {
        setSelectedRows(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(id)) {
                newSelected.delete(id);
            } else {
                newSelected.add(id);
            }
            return newSelected;
        });
    }, [setSelectedRows]);

    // 전체 선택 토글
    const toggleAllRows = useCallback(() => {
        setSelectedRows(prev => {
            if (prev.size === revisions.length) {
                return new Set();
            } else {
                return new Set(revisions.map(r => r.id));
            }
        });
    }, [revisions, setSelectedRows]);

    // 상태 배지 색상
    const getStatusColor = useCallback((status: string) => {
        switch (status) {
            case '승인': return 'bg-green-200 text-green-700';
            case '상신': return 'bg-blue-200 text-blue-700';
            case '반려': return 'bg-red-200 text-red-700';
            case '진행': return 'bg-amber-200 text-amber-700';
            default: return 'bg-gray-100 text-gray-500';
        }
    }, []);

    // 버전 백업
    const handleBackup = useCallback(async (version: string) => {
        if (!selectedProjectId) {
            alert('프로젝트를 선택해주세요.');
            return;
        }

        try {
            const atomicKey = `pfmea_atomic_${selectedProjectId.toLowerCase()}`;
            const savedData = localStorage.getItem(atomicKey);

            if (!savedData) {
                alert('백업할 FMEA 데이터가 없습니다.');
                return;
            }

            const fmeaData = JSON.parse(savedData);
            const versionType = version.endsWith('.00') ? 'MAJOR' : 'MINOR';

            const res = await fetch('/api/fmea/version-backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fmeaId: selectedProjectId,
                    version,
                    versionType,
                    backupData: fmeaData,
                    changeNote: `개정 ${version} 백업`,
                    triggerType: 'MANUAL',
                    createdBy: 'admin',
                }),
            });

            if (res.ok) {
                const result = await res.json();
                alert(`✅ 백업 완료!\n\nFMEA: ${selectedProjectId}\n버전: ${version}\n크기: ${Math.round((result.backup?.dataSize || 0) / 1024)}KB`);
            } else {
                const err = await res.json();
                alert(`❌ 백업 실패: ${err.error || '알 수 없는 오류'}`);
            }
        } catch (error) {
            console.error('백업 오류:', error);
            alert('백업 중 오류가 발생했습니다.');
        }
    }, [selectedProjectId]);

    // 버전 복구
    const handleRestore = useCallback(async (version: string) => {
        if (!selectedProjectId) {
            alert('프로젝트를 선택해주세요.');
            return;
        }

        if (!window.confirm(`⚠️ ${version} 버전으로 복구하시겠습니까?\n\n현재 FMEA 데이터가 해당 버전의 백업으로 대체됩니다.`)) {
            return;
        }

        try {
            const res = await fetch('/api/fmea/version-backup', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fmeaId: selectedProjectId,
                    version,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                if (res.status === 404) {
                    alert(`❌ 해당 버전(${version})의 백업이 없습니다.\n\n먼저 [📦] 버튼으로 백업을 생성하세요.`);
                } else {
                    alert(`❌ 복구 실패: ${err.error || '알 수 없는 오류'}`);
                }
                return;
            }

            const result = await res.json();
            const backupData = result.data;

            const atomicKey = `pfmea_atomic_${selectedProjectId.toLowerCase()}`;
            localStorage.setItem(atomicKey, JSON.stringify(backupData));

            alert(`✅ 복구 완료!\n\nFMEA: ${selectedProjectId}\n버전: ${version}\n\n페이지를 새로고침합니다.`);
            window.location.reload();

        } catch (error) {
            console.error('복구 오류:', error);
            alert('복구 중 오류가 발생했습니다.');
        }
    }, [selectedProjectId]);

    // 결재 요청
    const handleApprovalRequest = useCallback(async (revision: RevisionRecord, approvalType: 'CREATE' | 'REVIEW' | 'APPROVE') => {
        const approvalTypeLabels = { CREATE: '작성', REVIEW: '검토', APPROVE: '승인' };
        const label = approvalTypeLabels[approvalType];

        const approverEmail = window.prompt(
            `${label} 결재 요청\n\n결재자 이메일을 입력하세요:`
        );

        if (!approverEmail || !approverEmail.includes('@')) {
            alert('올바른 이메일 주소를 입력해주세요.');
            return;
        }

        const approverName = window.prompt('결재자 이름을 입력하세요:', '') || approverEmail;

        try {
            const res = await fetch('/api/fmea/approval', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fmeaId: selectedProjectId,
                    revisionId: revision.id,
                    revisionNumber: revision.revisionNumber,
                    approvalType,
                    requester: {
                        name: revision.createName || 'admin',
                        email: '',
                    },
                    approver: {
                        name: approverName,
                        email: approverEmail,
                    },
                    fmeaName: fmeaInfo?.fmeaName || selectedProjectId,
                }),
            });

            const data = await res.json();

            if (data.success) {
                if (data.emailSent) {
                    alert(`✅ 결재 요청 완료!\n\n${approverEmail}로 이메일이 발송되었습니다.`);
                } else {
                    const copyLink = window.confirm(
                        `⚠️ 이메일 발송에 실패했습니다.\n\n결재 링크를 클립보드에 복사하시겠습니까?\n\n링크: ${data.approvalLink}`
                    );
                    if (copyLink) {
                        navigator.clipboard.writeText(data.approvalLink);
                        alert('클립보드에 복사되었습니다.');
                    }
                }

                setRevisions(prev => prev.map(r => {
                    if (r.id === revision.id) {
                        if (approvalType === 'CREATE') return { ...r, createStatus: '진행' };
                        if (approvalType === 'REVIEW') return { ...r, reviewStatus: '진행' };
                        if (approvalType === 'APPROVE') return { ...r, approveStatus: '진행' };
                    }
                    return r;
                }));
            } else {
                alert(`❌ 결재 요청 실패: ${data.error}`);
            }
        } catch (error) {
            console.error('결재 요청 오류:', error);
            alert('결재 요청 중 오류가 발생했습니다.');
        }
    }, [selectedProjectId, fmeaInfo, setRevisions]);

    // 기본 회의록 생성
    const createDefaultMeetings = useCallback((): MeetingMinute[] => {
        return Array.from({ length: 5 }, (_, i) => ({
            id: `MEETING-${Date.now()}-${i}`,
            no: i + 1,
            date: '',
            projectName: '',
            content: '',
            author: '',
            authorPosition: '',
        }));
    }, []);

    // 회의록 추가
    const handleAddMeeting = useCallback(() => {
        const newMeeting: MeetingMinute = {
            id: `MEETING-${Date.now()}`,
            no: meetingMinutes.length + 1,
            date: new Date().toISOString().split('T')[0],
            projectName: '',
            content: '',
            author: '',
            authorPosition: '',
        };
        setMeetingMinutes(prev => [...prev, newMeeting]);
    }, [meetingMinutes.length, setMeetingMinutes]);

    // 회의록 필드 업데이트
    const handleUpdateMeetingField = useCallback((id: string, field: keyof MeetingMinute, value: unknown) => {
        setMeetingMinutes(prev => prev.map(m =>
            m.id === id ? { ...m, [field]: value } : m
        ));
    }, [setMeetingMinutes]);

    // 회의록 삭제
    const handleDeleteMeeting = useCallback((id: string) => {
        if (!confirm('회의록을 삭제하시겠습니까?')) return;
        setMeetingMinutes(prev => {
            const filtered = prev.filter(m => m.id !== id);
            const renumbered = filtered.map((m, index) => ({ ...m, no: index + 1 }));
            if (renumbered.length < 5) {
                const additional = Array.from({ length: 5 - renumbered.length }, (_, i) => ({
                    id: `MEETING-${Date.now()}-${i}`,
                    no: renumbered.length + i + 1,
                    date: '',
                    projectName: '',
                    content: '',
                    author: '',
                    authorPosition: '',
                }));
                return [...renumbered, ...additional];
            }
            return renumbered;
        });
    }, [setMeetingMinutes]);

    return {
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
    };
}
