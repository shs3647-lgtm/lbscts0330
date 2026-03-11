/**
 * @file hooks/useCpRegisterHandlers.ts
 * @description CP 등록 페이지 - 모든 핸들러 함수 (저장, 선택, 검증)
 * @module control-plan/register
 * @created 2026-03-05 page.tsx 분리 리팩토링 (PFMEA 수평전개)
 */

'use client';

import { useCallback } from 'react';
import { UserInfo } from '@/types/user';
import { CPInfo, CPSelectType, SaveStatus } from '../types';
import { syncToLocalStorage } from '../utils';
import { useCpRegisterCore } from './useCpRegisterCore';

type CoreReturn = ReturnType<typeof useCpRegisterCore>;

export function useCpRegisterHandlers(core: CoreReturn) {
  const {
    user, router, editId, isEditMode,
    cpId, setCpId, cpInfo, setCpInfo,
    cftMembers, setCftMembers, saveStatus, setSaveStatus,
    cpSelectType, setCpSelectType,
    availableCps, setAvailableCps,
    selectedBaseCp, setSelectedBaseCp,
    selectedParentFmea, setSelectedParentFmea,
    selectedParentApqp, setSelectedParentApqp,
    apqpList, setApqpList, setApqpModalOpen,
    fmeaSelectModalOpen, setFmeaSelectModalOpen,
    availableFmeas, setAvailableFmeas,
    linkedPfdList, setLinkedPfdList,
    linkedPfdNo,
    originalData, setOriginalData,
    setCpSelectModalOpen,
    setIsCreateModalOpen,
    setUserModalOpen, selectedMemberIndex,
    userModalTarget,
    recordAccessLog,
    linkageModalOpen, setLinkageModalOpen,
  } = core;

  // =====================================================
  // 필드 업데이트
  // =====================================================
  const updateField = useCallback((field: keyof CPInfo, value: string) => {
    setCpInfo(prev => ({ ...prev, [field]: value }));
  }, [setCpInfo]);

  // =====================================================
  // CP 선택 모달 열기
  // =====================================================
  const openCpSelectModal = useCallback(async (type: CPSelectType) => {
    let projects: any[] = [];

    try {
      const res = await fetch('/api/control-plan');
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        projects = data.data;
      }
    } catch (e) { console.error('[CP 프로젝트 목록] 오류:', e); }

    if (projects.length === 0) {
      try {
        const stored = localStorage.getItem('cp-projects');
        if (stored) projects = JSON.parse(stored);
      } catch (e) { console.error('[CP localStorage 파싱] 오류:', e); }
    }

    const filtered = type === 'ALL' || type === 'LOAD'
      ? projects.filter((p: any) => (p.cpNo || p.id) !== cpId)
      : projects.filter((p: any) => p.cpType?.toLowerCase() === type.toLowerCase());

    setAvailableCps(filtered.map((p: any) => ({
      id: p.cpNo || p.id,
      subject: p.subject || '제목 없음',
      type: p.cpType?.toLowerCase() || 'p',
    })));
    setCpSelectType(type);
    setCpSelectModalOpen(true);
  }, [cpId, setAvailableCps, setCpSelectType, setCpSelectModalOpen]);

  // =====================================================
  // CP 선택
  // =====================================================
  const handleCpSelect = useCallback((selectedId: string) => {
    const normalizedId = selectedId.toLowerCase();
    setCpSelectModalOpen(false);

    if (cpSelectType === 'LOAD') {
      router.push(`/control-plan/register?id=${normalizedId}`);
      window.location.reload();
    } else {
      setSelectedBaseCp(normalizedId);
    }
  }, [cpSelectType, router, setCpSelectModalOpen, setSelectedBaseCp]);

  // =====================================================
  // FMEA 선택 모달 열기
  // =====================================================
  const openFmeaSelectModal = useCallback(async () => {
    let projects: any[] = [];

    try {
      const res = await fetch('/api/fmea/projects?type=P');
      const data = await res.json();
      if (data.success && data.projects?.length > 0) {
        projects = data.projects;
      }
    } catch (e) { console.error('[CP FMEA 목록 로드] 오류:', e); }

    setAvailableFmeas(projects.map((p: any) => ({
      id: p.id,
      subject: p.fmeaInfo?.subject || p.project?.productName || '제목 없음',
      type: p.fmeaType?.toLowerCase() || 'f',
    })));
    setFmeaSelectModalOpen(true);
  }, [setAvailableFmeas, setFmeaSelectModalOpen]);

  // =====================================================
  // APQP 목록 로드
  // =====================================================
  const loadApqpList = useCallback(async () => {
    try {
      const res = await fetch('/api/apqp');
      const data = await res.json();
      if (data.success && data.apqps) {
        setApqpList(data.apqps.map((p: any) => ({
          apqpNo: p.apqpNo, subject: p.subject || p.productName || '', customerName: p.customerName || '',
        })));
      }
    } catch (e) {
      console.error('[CP APQP 목록 로드] 오류:', e);
      setApqpList([]);
    }
  }, [setApqpList]);

  // =====================================================
  // APQP 선택 → 기초정보 자동 채움
  // =====================================================
  const handleApqpSelect = useCallback(async (apqpNo: string) => {
    if (!apqpNo) return;
    setSelectedParentApqp(apqpNo);
    setApqpModalOpen(false);

    // 1. ProjectLinkage에서 먼저 조회
    try {
      const res = await fetch(`/api/project-linkage?apqpNo=${apqpNo.toLowerCase()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.data?.[0]) {
          const linkage = data.data[0];
          setCpInfo(prev => ({
            ...prev,
            companyName: linkage.companyName || prev.companyName || '',
            customerName: linkage.customerName || prev.customerName || '',
            modelYear: linkage.modelYear || prev.modelYear || '',
            subject: linkage.subject || prev.subject || '',
            engineeringLocation: linkage.engineeringLocation || prev.engineeringLocation || '',
            cpStartDate: linkage.startDate || prev.cpStartDate || '',
            processResponsibility: linkage.processResponsibility || prev.processResponsibility || '',
            cpResponsibleName: linkage.responsibleName || prev.cpResponsibleName || '',
          }));
          return;
        }
      }
    } catch (e) { console.error('[CP APQP 연동정보 조회] 오류:', e); }

    // 2. APQP API 직접 조회 (폴백)
    try {
      const apqpRes = await fetch(`/api/apqp?apqpNo=${apqpNo.toLowerCase()}`);
      if (apqpRes.ok) {
        const apqpData = await apqpRes.json();
        const apqp = apqpData.apqp || apqpData.apqps?.[0];
        if (apqp) {
          setCpInfo(prev => ({
            ...prev,
            companyName: apqp.companyName || prev.companyName || '',
            customerName: apqp.customerName || prev.customerName || '',
            modelYear: apqp.modelYear || prev.modelYear || '',
            subject: apqp.subject || apqp.productName || prev.subject || '',
            engineeringLocation: apqp.engineeringLocation || prev.engineeringLocation || '',
          }));
        }
      }
    } catch (e) { console.error('[CP APQP 정보 조회] 오류:', e); }
  }, [setSelectedParentApqp, setApqpModalOpen, setCpInfo]);

  // =====================================================
  // 변경 이력 기록 (PFMEA 수준 - 완전한 버전)
  // =====================================================
  const recordChangeHistory = useCallback((targetId: string) => {
    if (!originalData) return;

    const fieldLabels: Record<keyof CPInfo, string> = {
      companyName: '회사명', engineeringLocation: '엔지니어링 위치', customerName: '고객명',
      modelYear: '모델 연식', subject: 'CP명', cpStartDate: '시작 일자',
      cpRevisionDate: '목표 완료일', cpProjectName: '프로젝트명', cpId: 'CP ID',
      cpType: 'CP 유형', processResponsibility: '공정 책임', confidentialityLevel: 'CP 종류',
      securityLevel: '기밀수준', cpResponsibleName: 'CP 담당자', createdAt: '작성일', updatedAt: '수정일',
      partName: '품명', partNo: '품번', linkedDfmeaNo: '상위 DFMEA',
      partNameMode: '부품명 표시 모드',
    };

    const changes: { field: string; oldValue: string; newValue: string }[] = [];

    (Object.keys(cpInfo) as (keyof CPInfo)[]).forEach(key => {
      const oldVal = originalData[key] || '';
      const newVal = cpInfo[key] || '';
      if (oldVal !== newVal) {
        changes.push({ field: fieldLabels[key] || key, oldValue: oldVal, newValue: newVal });
      }
    });

    if (changes.length === 0) return;

    // 변경 이력 저장
    const historyKey = `cp_change_history_${targetId}`;
    const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');

    const newEntry = {
      id: `CH-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: user?.name || 'Unknown',
      cpId: targetId,
      cpName: cpInfo.subject || '',
      changes,
      description: changes.map(c => `${c.field}: "${c.oldValue}" -> "${c.newValue}"`).join(', '),
    };

    existingHistory.unshift(newEntry);
    localStorage.setItem(historyKey, JSON.stringify(existingHistory.slice(0, 100)));
  }, [originalData, cpInfo, user]);

  // =====================================================
  // 저장
  // =====================================================
  const handleSave = useCallback(async () => {
    // ID가 없으면 저장 불가 - 모달로 먼저 생성 필요
    if (!cpId) {
      alert('CP ID가 없습니다. "새로 작성" 버튼을 눌러 ID를 먼저 생성해주세요.');
      setIsCreateModalOpen(true);
      return;
    }
    if (!cpInfo.subject?.trim()) { alert('CP명을 입력해주세요.'); return; }

    setSaveStatus('saving');

    try {
      const finalId = cpId.toLowerCase();

      const res = await fetch('/api/control-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpNo: finalId,
          cpInfo: {
            cpType: cpInfo.cpType,
            subject: cpInfo.subject,
            companyName: cpInfo.companyName,
            customerName: cpInfo.customerName,
            modelYear: cpInfo.modelYear,
            cpStartDate: cpInfo.cpStartDate,
            cpRevisionDate: cpInfo.cpRevisionDate,
            processResponsibility: cpInfo.processResponsibility,
            cpResponsibleName: cpInfo.cpResponsibleName,
            engineeringLocation: cpInfo.engineeringLocation,
            confidentialityLevel: cpInfo.confidentialityLevel,  // CP 종류
            securityLevel: cpInfo.securityLevel,  // 기밀수준
            cpProjectName: cpInfo.cpProjectName,
          },
          cftMembers: cftMembers.filter(m => m.name?.trim()),
          parentApqpNo: selectedParentApqp,
          parentFmeaId: selectedParentFmea,
          baseCpId: selectedBaseCp,
          linkedPfdNo: linkedPfdNo,  // 연동 PFD 저장
          partNameMode: cpInfo.partNameMode || 'A',  // A=부품명 숨김(기본), B=표시
        }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      if (originalData) recordChangeHistory(finalId);

      syncToLocalStorage(finalId, cpInfo, cftMembers, selectedBaseCp, selectedParentApqp, selectedParentFmea);
      localStorage.setItem('cp-last-edited', finalId);

      setOriginalData({ ...cpInfo });

      // ProjectLinkage에 기초정보 동기화
      try {
        await fetch('/api/project-linkage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cpNo: finalId,
            apqpNo: selectedParentApqp || null,
            pfmeaId: selectedParentFmea || null,
            pfdNo: linkedPfdNo || null,
            // 기초정보 동기화
            projectName: cpInfo.subject || '',
            subject: cpInfo.subject || '',
            companyName: cpInfo.companyName || '',
            customerName: cpInfo.customerName || '',
            responsibleName: cpInfo.cpResponsibleName || '',
            modelYear: cpInfo.modelYear || '',
            engineeringLocation: cpInfo.engineeringLocation || '',
            processResponsibility: cpInfo.processResponsibility || '',
            confidentialityLevel: cpInfo.confidentialityLevel || '',
            partName: cpInfo.partName || cpInfo.subject || '',
            partNo: cpInfo.partNo || '',
          }),
        });
      } catch (linkErr) { console.error('[CP ProjectLinkage 동기화] 오류:', linkErr); }

      // 접속 로그 기록
      await recordAccessLog(
        isEditMode ? 'update' : 'create',
        '기초정보',
        isEditMode ? `CP 수정: ${cpInfo.subject}` : `CP 등록: ${cpInfo.subject}`,
        finalId
      );

      setSaveStatus('saved');
      if (!isEditMode) router.replace(`/control-plan/register?id=${finalId}`);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '알 수 없는 오류';
      alert('저장 실패: ' + message);
      setSaveStatus('idle');
    }
  }, [cpId, cpInfo, cftMembers, isEditMode, selectedBaseCp, selectedParentApqp, selectedParentFmea,
    linkedPfdNo, originalData,
    setSaveStatus, setOriginalData, setIsCreateModalOpen,
    recordChangeHistory, recordAccessLog, router]);

  // =====================================================
  // 새로 등록 - 모달로 변경
  // =====================================================
  const handleNewRegister = useCallback(() => {
    setIsCreateModalOpen(true);
  }, [setIsCreateModalOpen]);

  // =====================================================
  // 사용자 선택
  // =====================================================
  const handleUserSelect = useCallback((selectedUser: UserInfo) => {
    if (userModalTarget === 'responsible') {
      setCpInfo(prev => ({
        ...prev,
        cpResponsibleName: selectedUser.name,
        processResponsibility: selectedUser.department || '',
        engineeringLocation: (selectedUser as any).factory || prev.engineeringLocation || '',
        companyName: prev.companyName || 'AMPSYSTEM',
      }));
    } else if (userModalTarget === 'design') {
      setCpInfo(prev => ({
        ...prev,
        processResponsibility: selectedUser.department || '',
        cpResponsibleName: selectedUser.name,
        engineeringLocation: (selectedUser as any).factory || prev.engineeringLocation || '',
        companyName: prev.companyName || 'AMPSYSTEM',
      }));
    } else if (selectedMemberIndex !== null) {
      const updated = [...cftMembers];
      updated[selectedMemberIndex] = {
        ...updated[selectedMemberIndex],
        name: selectedUser.name,
        department: selectedUser.department || '',
        position: selectedUser.position || '',
        phone: selectedUser.phone || '',
        email: selectedUser.email || '',
      };
      setCftMembers(updated);
    }
    setUserModalOpen(false);
  }, [userModalTarget, cftMembers, setCftMembers, setCpInfo, setUserModalOpen, selectedMemberIndex]);

  return {
    updateField,
    openCpSelectModal, handleCpSelect,
    openFmeaSelectModal,
    loadApqpList, handleApqpSelect,
    recordChangeHistory,
    handleSave, handleNewRegister, handleUserSelect,
  };
}
