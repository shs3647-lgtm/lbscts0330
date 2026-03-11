/**
 * @file useRevisionData.ts
 * @description 개정 이력 데이터 로드/저장 훅
 * @module pfmea/revision/hooks
 *
 * @status CODEFREEZE L4 (Gold) 🔒
 * @freeze_level L4 (Critical - Gold Test Passed)
 * @frozen_date 2026-03-02
 * @gold_tag v4.0.0-gold
 * @allowed_changes NONE — 사용자 명시적 승인 + full test pass 필수
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { FMEAProject, RevisionRecord, FMEAInfoData } from '../types';
import { normalizeRevisionNumber, createDefaultRevisions } from '../utils';

interface SelectedInfo {
    fmeaId: string;
    fmeaName: string;
    factory: string;
    responsible: string;
    customer: string;
    productName: string;
}

interface UseRevisionDataReturn {
    // 프로젝트 상태
    projectList: FMEAProject[];
    selectedProjectId: string;
    setSelectedProjectId: (id: string) => void;
    selectedInfo: SelectedInfo;
    setSelectedInfo: React.Dispatch<React.SetStateAction<SelectedInfo>>;
    fmeaInfo: FMEAInfoData | null;

    // 개정 데이터
    revisions: RevisionRecord[];
    setRevisions: React.Dispatch<React.SetStateAction<RevisionRecord[]>>;

    // 저장 상태
    saveStatus: 'idle' | 'saved';

    // 핸들러
    handleSave: () => Promise<void>;
    requestSave: () => void;  // ★ 결재 플로우용: 렌더 완료 후 저장 보장
    updateField: (id: string, field: keyof RevisionRecord, value: string) => void;
    loadProjects: () => Promise<void>;
}

const INITIAL_SELECTED_INFO: SelectedInfo = {
    fmeaId: '',
    fmeaName: '',
    factory: '',
    responsible: '',
    customer: '',
    productName: '',
};

export function useRevisionData(idFromUrl: string): UseRevisionDataReturn {
    // 프로젝트 상태
    const [projectList, setProjectList] = useState<FMEAProject[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>(idFromUrl);
    const [selectedInfo, setSelectedInfo] = useState<SelectedInfo>(INITIAL_SELECTED_INFO);
    const [fmeaInfo, setFmeaInfo] = useState<FMEAInfoData | null>(null);

    // 개정 데이터
    const [revisions, setRevisions] = useState<RevisionRecord[]>([]);
    // ★ Stale closure 방지: handleSave가 항상 최신 revisions를 읽도록 ref 사용
    const revisionsRef = useRef(revisions);
    revisionsRef.current = revisions;

    // 저장 상태
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

    // URL 파라미터로 전달된 FMEA ID 처리
    useEffect(() => {
        if (idFromUrl && idFromUrl !== selectedProjectId) {
            setSelectedProjectId(idFromUrl);
        }
    }, [idFromUrl, selectedProjectId]);

    // FMEA 등록정보 로드
    useEffect(() => {
        if (!selectedProjectId) {
            setSelectedInfo(INITIAL_SELECTED_INFO);
            return;
        }

        setSelectedInfo(prev => ({
            ...prev,
            fmeaId: selectedProjectId,
        }));

        const loadFmeaInfo = async () => {
            try {
                const response = await fetch(`/api/fmea/info?fmeaId=${selectedProjectId}`);
                const result = await response.json();

                if (result.success && result.fmeaInfo) {
                    setFmeaInfo(result.fmeaInfo);

                    setSelectedInfo({
                        fmeaId: selectedProjectId,
                        fmeaName: result.fmeaInfo.fmeaName || result.fmeaInfo.subject || '',
                        factory: result.fmeaInfo.factory || result.fmeaInfo.engineeringLocation || '',
                        responsible: result.fmeaInfo.responsible || result.fmeaInfo.fmeaResponsibleName || '',
                        customer: result.fmeaInfo.customer || result.fmeaInfo.customerName || '',
                        productName: result.fmeaInfo.productName || result.fmeaInfo.modelYear || '',
                    });

                } else {
                    // FMEA 등록정보 없음 - 빈 값으로 설정
                    setSelectedInfo({
                        fmeaId: selectedProjectId,
                        fmeaName: '',
                        factory: '',
                        responsible: '',
                        customer: '',
                        productName: '',
                    });
                }
            } catch (error) {
                console.error('[개정관리] FMEA 등록정보 로드 실패:', error);
                setSelectedInfo({
                    fmeaId: selectedProjectId,
                    fmeaName: '',
                    factory: '',
                    responsible: '',
                    customer: '',
                    productName: '',
                });
            }
        };

        loadFmeaInfo();
    }, [selectedProjectId]);

    // 프로젝트 목록 로드
    const loadProjects = useCallback(async () => {
        const isPfmeaProject = (id: string) => {
            const lowerId = id.toLowerCase();
            return lowerId.startsWith('dfm') || lowerId.startsWith('dfmea');
        };

        try {
            const response = await fetch('/api/fmea/projects?type=D');
            const result = await response.json();

            if (result.success && result.projects.length > 0) {
                const dfmeaProjects = result.projects
                    .map((p: FMEAProject) => ({ ...p, id: p.id.toLowerCase() }));
                setProjectList(dfmeaProjects);

                if (!selectedProjectId && dfmeaProjects.length > 0) {
                    const urlProject = dfmeaProjects.find((p: FMEAProject) => p.id === idFromUrl);
                    setSelectedProjectId(urlProject?.id || dfmeaProjects[0].id);
                }
                return;
            }
        } catch (error) {
            console.error('[개정관리] 프로젝트 목록 API 호출 실패:', error);
        }

        // 폴백: URL ID로 직접 생성
        if (idFromUrl && isPfmeaProject(idFromUrl)) {
            const fallbackProject: FMEAProject = {
                id: idFromUrl,
                project: { projectName: idFromUrl, customer: '', productName: '' }
            };
            setProjectList([fallbackProject]);
            setSelectedProjectId(idFromUrl);
        }
    }, [idFromUrl, selectedProjectId]);

    // 프로젝트 목록 초기 로드
    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    // 개정 이력 로드
    // 개정 이력 로드 (fmeaInfo 의존성 제거 → race condition 방지)
    useEffect(() => {
        if (!selectedProjectId) {
            setRevisions(createDefaultRevisions('', null));
            return;
        }

        const loadRevisions = async () => {
            try {
                const response = await fetch(`/api/fmea/revisions?projectId=${selectedProjectId}`);
                const result = await response.json();

                if (result.success && result.revisions.length > 0) {
                    const normalizedRevisions = result.revisions.map((r: RevisionRecord) => ({
                        ...r,
                        revisionNumber: normalizeRevisionNumber(r.revisionNumber),
                    }));
                    setRevisions(normalizedRevisions.sort((a: RevisionRecord, b: RevisionRecord) =>
                        a.revisionNumber.localeCompare(b.revisionNumber)
                    ));
                    return;
                }
            } catch (error) {
                console.error('[개정관리] 개정 이력 API 호출 실패:', error);
                setRevisions(createDefaultRevisions(selectedProjectId, null));
            }
        };

        loadRevisions();
    }, [selectedProjectId]);

    // ✅ CFT 역할 자동 연동 (fmeaInfo 도착 후 revisions에 패치)
    useEffect(() => {
        if (!fmeaInfo) return;
        setRevisions(prev => {
            if (prev.length === 0) return prev;
            const info = fmeaInfo as Record<string, string>;
            let changed = false;
            const updated = prev.map(r => {
                const patch: Partial<RevisionRecord> = {};
                // 작성자: FMEA담당자 + CFT Leader
                if (!r.createName && info.fmeaResponsibleName) { patch.createName = info.fmeaResponsibleName; changed = true; }
                if (!r.createPosition && info.fmeaResponsiblePosition) { patch.createPosition = info.fmeaResponsiblePosition; changed = true; }
                // 검토자: CFT Technical Leader
                if (!r.reviewName && info.reviewResponsibleName) { patch.reviewName = info.reviewResponsibleName; changed = true; }
                if (!r.reviewPosition && info.reviewResponsiblePosition) { patch.reviewPosition = info.reviewResponsiblePosition; changed = true; }
                // 승인자: CFT Champion
                if (!r.approveName && info.approvalResponsibleName) { patch.approveName = info.approvalResponsibleName; changed = true; }
                if (!r.approvePosition && info.approvalResponsiblePosition) { patch.approvePosition = info.approvalResponsiblePosition; changed = true; }
                return Object.keys(patch).length > 0 ? { ...r, ...patch } : r;
            });
            return changed ? updated : prev;
        });
    }, [fmeaInfo]);

    // 필드 업데이트
    const updateField = useCallback((id: string, field: keyof RevisionRecord, value: string) => {
        setRevisions(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
    }, []);

    // 저장 — ★ revisionsRef.current로 항상 최신 상태 읽기 (stale closure 방지)
    const handleSave = useCallback(async () => {
        if (!selectedProjectId) {
            alert('프로젝트를 선택해주세요.');
            return;
        }

        try {
            const response = await fetch('/api/fmea/revisions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: selectedProjectId, revisions: revisionsRef.current })
            });

            const result = await response.json();

            if (result.success) {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 3000);
            } else {
                alert('저장에 실패했습니다.');
            }
        } catch (error) {
            console.error('[개정관리] DB 저장 실패:', error);
            alert('저장에 실패했습니다.');
        }
    }, [selectedProjectId]);

    // ★ requestSave: 다음 렌더 후 저장 (결재 플로우에서 updateField 후 호출)
    const pendingSaveRef = useRef(false);
    const requestSave = useCallback(() => {
        pendingSaveRef.current = true;
    }, []);

    // pendingSave 플래그가 켜지면 다음 렌더에서 저장 실행
    useEffect(() => {
        if (pendingSaveRef.current) {
            pendingSaveRef.current = false;
            handleSave();
        }
    });

    return {
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
    };
}
