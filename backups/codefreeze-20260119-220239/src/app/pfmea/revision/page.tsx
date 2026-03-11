/**
 * @file page.tsx
 * @description FMEA 개정관리 페이지 - 프로젝트별 개정 이력 관리
 * @version 1.0.0
 * @created 2025-12-26
 * @ref C:\01_Next_FMEA\app\fmea\components\RevisionManagement.tsx
 */

'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BizInfoSelectModal } from '@/components/modals/BizInfoSelectModal';
import { MeetingMinutesTable } from '@/components/tables/MeetingMinutesTable';
import { BizInfoProject } from '@/types/bizinfo';
import { MeetingMinute } from '@/types/project-revision';
import PFMEATopNav from '@/components/layout/PFMEATopNav';
import { SODHistoryTable } from './components';

// =====================================================
// 타입 정의
// =====================================================
interface FMEAProject {
  id: string;
  project: {
    projectName: string;
    customer: string;
    productName: string;
  };
  createdAt?: string;
}

interface RevisionRecord {
  id: string;
  projectId: string;
  revisionNumber: string; // 1.00, 1.01, 1.02...
  revisionDate: string;   // 개정일자 (YYYY-MM-DD)
  revisionHistory: string; // 개정이력 설명
  // 작성
  createPosition: string;
  createName: string;
  createDate: string;
  createStatus: string; // 진행/승인/반려
  // 검토
  reviewPosition: string;
  reviewName: string;
  reviewDate: string;
  reviewStatus: string;
  // 승인
  approvePosition: string;
  approveName: string;
  approveDate: string;
  approveStatus: string;
}

// =====================================================
// FMEA 등록정보 타입
// =====================================================
interface FMEAInfoData {
  fmeaResponsibleName?: string;
  fmeaResponsiblePosition?: string;
  reviewResponsibleName?: string;
  reviewResponsiblePosition?: string;
  approvalResponsibleName?: string;
  approvalResponsiblePosition?: string;
}

// =====================================================
// 개정번호 정규화 (Rev.XX → N.XX)
// =====================================================
const normalizeRevisionNumber = (revNum: string): string => {
  if (!revNum) return '1.00';
  // Rev.00 → 1.00, Rev.01 → 1.01, ...
  const revMatch = revNum.match(/^Rev\.?(\d{2})$/i);
  if (revMatch) {
    const minor = parseInt(revMatch[1], 10);
    return `1.${minor.toString().padStart(2, '0')}`;
  }
  // 이미 N.XX 형식이면 그대로
  if (/^\d+\.\d{2}$/.test(revNum)) {
    return revNum;
  }
  return '1.00';
};

// =====================================================
// 초기 개정 이력 생성 (FMEA 등록정보 자동 반영)
// =====================================================
const createDefaultRevisions = (projectId: string, fmeaInfo?: FMEAInfoData | null): RevisionRecord[] => 
  Array.from({ length: 5 }, (_, index) => ({
    id: `REV-${projectId}-${index}`,
    projectId: projectId,
    revisionNumber: `1.${index.toString().padStart(2, '0')}`,
    revisionDate: index === 0 ? new Date().toISOString().split('T')[0] : '',
    revisionHistory: index === 0 ? '신규 프로젝트 등록' : '',
    // 작성 (FMEA 등록정보에서 자동 채움)
    createPosition: index === 0 ? (fmeaInfo?.fmeaResponsiblePosition || '') : '',
    createName: index === 0 ? (fmeaInfo?.fmeaResponsibleName || '') : '',
    createDate: index === 0 ? new Date().toISOString().split('T')[0] : '',
    createStatus: index === 0 ? '진행' : '',
    // 검토 (FMEA 등록정보에서 자동 채움)
    reviewPosition: index === 0 ? (fmeaInfo?.reviewResponsiblePosition || '') : '',
    reviewName: index === 0 ? (fmeaInfo?.reviewResponsibleName || '') : '',
    reviewDate: '',
    reviewStatus: '',
    // 승인 (FMEA 등록정보에서 자동 채움)
    approvePosition: index === 0 ? (fmeaInfo?.approvalResponsiblePosition || '') : '',
    approveName: index === 0 ? (fmeaInfo?.approvalResponsibleName || '') : '',
    approveDate: '',
    approveStatus: '',
  }));

// =====================================================
// 내부 컴포넌트 (useSearchParams 사용)
// =====================================================
function RevisionManagementPageInner() {
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get('id') || '';
  
  // 프로젝트 상태
  const [projectList, setProjectList] = useState<FMEAProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(idFromUrl);
  const [searchQuery, setSearchQuery] = useState('');

  // 개정 데이터
  const [revisions, setRevisions] = useState<RevisionRecord[]>([]);
  
  // 선택된 행
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  // 저장 상태
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  // 회의록 상태
  const [meetingMinutes, setMeetingMinutes] = useState<MeetingMinute[]>([]);

  // 기초정보 모달
  const [bizInfoModalOpen, setBizInfoModalOpen] = useState(false);

  // 선택된 프로젝트 상세 정보 (FMEAID, FMEA명, 공장, FMEA책임자, 고객, 품명)
  const [selectedInfo, setSelectedInfo] = useState({
    fmeaId: '',        // FMEAID
    fmeaName: '',      // FMEA명
    factory: '',       // 공장
    responsible: '',   // FMEA책임자
    customer: '',      // 고객
    productName: '',   // 품명
  });

  // FMEA 등록정보에서 작성자 정보 자동 채우기
  const [fmeaInfo, setFmeaInfo] = useState<{
    fmeaResponsibleName?: string;
    fmeaResponsiblePosition?: string;
    reviewResponsibleName?: string;
    reviewResponsiblePosition?: string;
    approvalResponsibleName?: string;
    approvalResponsiblePosition?: string;
  } | null>(null);

  // URL 파라미터로 전달된 FMEA ID 처리
  useEffect(() => {
    if (idFromUrl && idFromUrl !== selectedProjectId) {
      setSelectedProjectId(idFromUrl);
    }
  }, [idFromUrl, selectedProjectId]);

  // FMEA 등록정보 로드 (작성자 정보 자동 채움)
  useEffect(() => {
    if (!selectedProjectId) return;
    
    const loadFmeaInfo = async () => {
      try {
        // DB에서 FMEA Info 조회
        const response = await fetch(`/api/fmea/info?fmeaId=${selectedProjectId}`);
        const result = await response.json();
        
        if (result.success && result.fmeaInfo) {
          console.log('✅ [개정관리] FMEA 등록정보 로드:', result.fmeaInfo);
          setFmeaInfo(result.fmeaInfo);
          
          // 프로젝트 정보도 업데이트 (새 필드: FMEAID, FMEA명, 공장, FMEA책임자, 고객, 품명)
          // ✅ API 응답에서 직접 매핑된 필드 사용
          setSelectedInfo(prev => ({
            ...prev,
            fmeaId: selectedProjectId || prev.fmeaId,
            fmeaName: result.fmeaInfo.fmeaName || result.fmeaInfo.subject || prev.fmeaName,
            factory: result.fmeaInfo.factory || result.fmeaInfo.engineeringLocation || prev.factory,
            responsible: result.fmeaInfo.responsible || result.fmeaInfo.fmeaResponsibleName || prev.responsible,
            customer: result.fmeaInfo.customer || result.fmeaInfo.customerName || prev.customer,
            productName: result.fmeaInfo.productName || result.fmeaInfo.subject || prev.productName,
          }));
          
          // 🚀 1.00에 FMEA 등록정보 자동 반영
          setRevisions(prev => {
            const rev00 = prev.find(r => r.revisionNumber === '1.00');
            if (rev00 && !rev00.createName) {
              // 작성자 정보가 비어있으면 자동 채움
              return prev.map(r => {
                if (r.revisionNumber === '1.00') {
                  return {
                    ...r,
                    createPosition: result.fmeaInfo.fmeaResponsiblePosition || r.createPosition,
                    createName: result.fmeaInfo.fmeaResponsibleName || r.createName,
                    reviewPosition: result.fmeaInfo.reviewResponsiblePosition || r.reviewPosition,
                    reviewName: result.fmeaInfo.reviewResponsibleName || r.reviewName,
                    approvePosition: result.fmeaInfo.approvalResponsiblePosition || r.approvePosition,
                    approveName: result.fmeaInfo.approvalResponsibleName || r.approveName,
                  };
                }
                return r;
              });
            }
            return prev;
          });
        }
      } catch (error) {
        console.warn('⚠️ [개정관리] FMEA 등록정보 로드 실패:', error);
      }
    };
    
    loadFmeaInfo();
  }, [selectedProjectId]);

  // 프로젝트 목록 로드 (DB API 우선, localStorage 폴백)
  useEffect(() => {
    const loadProjects = async () => {
      try {
        // 1. DB에서 프로젝트 목록 조회 (Primary Source)
        const response = await fetch('/api/fmea/projects');
        const result = await response.json();
        
        if (result.success && result.projects.length > 0) {
          console.log('✅ [개정관리] DB에서 FMEA 목록 로드:', result.projects.length, '건');
          setProjectList(result.projects);
          
          // URL에서 받은 ID가 있으면 그것을 디폴트로, 없으면 첫번째
          if (!selectedProjectId && result.projects.length > 0) {
            // URL ID로 프로젝트 찾기
            const urlProject = result.projects.find((p: FMEAProject) => 
              p.id.toLowerCase() === idFromUrl.toLowerCase()
            );
            setSelectedProjectId(urlProject?.id || result.projects[0].id);
          }
          return;
        }
      } catch (error) {
        console.warn('⚠️ [개정관리] DB API 호출 실패, localStorage 폴백:', error);
      }
      
      // 2. localStorage 폴백 (DB 실패 시)
      try {
        const stored = localStorage.getItem('fmea-projects') || localStorage.getItem('pfmea-projects');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log('📦 [개정관리] localStorage에서 FMEA 목록 로드:', parsed.length, '건');
            setProjectList(parsed);
            if (!selectedProjectId) {
              const urlProject = parsed.find((p: FMEAProject) => 
                p.id.toLowerCase() === idFromUrl.toLowerCase()
              );
              setSelectedProjectId(urlProject?.id || parsed[0].id);
            }
            return;
          }
        }
      } catch (error) {
        console.error('❌ localStorage 파싱 실패:', error);
      }
      
      // 3. 폴백: URL ID로 직접 생성
      if (idFromUrl) {
        console.log('📍 [개정관리] URL ID로 프로젝트 생성:', idFromUrl);
        const fallbackProject: FMEAProject = {
          id: idFromUrl,
          project: { projectName: idFromUrl, customer: '', productName: '' }
        };
        setProjectList([fallbackProject]);
        setSelectedProjectId(idFromUrl);
      }
    };
    
    loadProjects();
  }, [idFromUrl]);

  // 선택된 프로젝트의 개정 이력 로드 (DB API 우선)
  useEffect(() => {
    if (!selectedProjectId) {
      setRevisions(createDefaultRevisions('', null));
      return;
    }

    const loadRevisions = async () => {
      try {
        // 1. DB에서 개정 이력 조회
        const response = await fetch(`/api/fmea/revisions?projectId=${selectedProjectId}`);
        const result = await response.json();
        
        if (result.success && result.revisions.length > 0) {
          console.log('✅ [개정관리] DB에서 개정 이력 로드:', result.revisions.length, '건');
          // ✅ 개정번호 정규화 (Rev.XX → N.XX)
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
        console.warn('⚠️ [개정관리] DB API 호출 실패, localStorage 폴백:', error);
      }
      
      // 2. localStorage 폴백
      try {
        const allRevisions = JSON.parse(localStorage.getItem('fmea-revisions') || '[]');
        let projectRevisions = allRevisions.filter((r: RevisionRecord) => r.projectId === selectedProjectId);

        if (projectRevisions.length === 0) {
          projectRevisions = createDefaultRevisions(selectedProjectId, fmeaInfo);
          localStorage.setItem('fmea-revisions', JSON.stringify([...allRevisions, ...projectRevisions]));
        }

        // 최소 5개 행 보장
        while (projectRevisions.length < 5) {
          const nextNumber = projectRevisions.length.toString().padStart(2, '0');
          projectRevisions.push({
            id: `REV-${selectedProjectId}-${Date.now()}-${projectRevisions.length}`,
            projectId: selectedProjectId,
            revisionNumber: `1.${nextNumber}`,
            revisionDate: '',
            revisionHistory: '',
            createPosition: '',
            createName: '',
            createDate: '',
            createStatus: '',
            reviewPosition: '',
            reviewName: '',
            reviewDate: '',
            reviewStatus: '',
            approvePosition: '',
            approveName: '',
            approveDate: '',
            approveStatus: '',
          });
        }

        // ✅ 개정번호 정규화 (Rev.XX → N.XX)
        const normalizedRevisions = projectRevisions.map((r: RevisionRecord) => ({
          ...r,
          revisionNumber: normalizeRevisionNumber(r.revisionNumber),
        }));
        
        setRevisions(normalizedRevisions.sort((a: RevisionRecord, b: RevisionRecord) => 
          a.revisionNumber.localeCompare(b.revisionNumber)
        ));
      } catch (error) {
        console.error('❌ 개정 이력 로드 실패:', error);
        setRevisions(createDefaultRevisions(selectedProjectId));
      }
    };
    
    loadRevisions();
  }, [selectedProjectId]);

  // 기초정보 선택 처리
  const handleBizInfoSelect = (info: BizInfoProject) => {
    setSelectedInfo(prev => ({
      ...prev,
      customer: info.customerName,
      factory: info.factory || prev.factory,
      productName: info.productName,
    }));
    // 해당 고객의 프로젝트 필터링
    const matched = projectList.find(p => 
      p.project?.customer === info.customerName && 
      p.project?.productName === info.productName
    );
    if (matched) {
      setSelectedProjectId(matched.id);
    }
  };

  // 프로젝트 필터링
  const filteredProjects = projectList.filter(p =>
    p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.project?.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.project?.customer?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 현재 프로젝트 정보
  const selectedProject = projectList.find(p => p.id === selectedProjectId);
  const projectLabel = selectedProject
    ? `${selectedProject.project?.projectName || selectedProject.id}`
    : '프로젝트를 선택하세요';

  // 필드 업데이트
  const updateField = (id: string, field: keyof RevisionRecord, value: string) => {
    const updated = revisions.map(r => (r.id === id ? { ...r, [field]: value } : r));
    setRevisions(updated);
  };

  // 저장 (DB API 우선 + localStorage 폴백)
  const handleSave = async () => {
    if (!selectedProjectId) {
      alert('프로젝트를 선택해주세요.');
      return;
    }

    try {
      // 1. DB에 저장 시도
      const response = await fetch('/api/fmea/revisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId, revisions })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ [개정관리] DB 저장 완료:', result.savedCount, '건');
      } else {
        console.warn('⚠️ [개정관리] DB 저장 실패, localStorage 폴백');
      }
    } catch (error) {
      console.warn('⚠️ [개정관리] DB API 호출 실패, localStorage 폴백:', error);
    }
    
    // 2. localStorage에도 저장 (폴백 & 동기화)
    try {
      const allRevisions = JSON.parse(localStorage.getItem('fmea-revisions') || '[]');
      const otherRevisions = allRevisions.filter((r: RevisionRecord) => r.projectId !== selectedProjectId);
      localStorage.setItem('fmea-revisions', JSON.stringify([...otherRevisions, ...revisions]));

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('❌ 저장 실패:', error);
      alert('저장에 실패했습니다.');
    }
  };

  // ✅ 2026-01-19: 버전 백업 기능
  const handleBackup = async (version: string) => {
    if (!selectedProjectId) {
      alert('프로젝트를 선택해주세요.');
      return;
    }
    
    try {
      // localStorage에서 현재 FMEA 데이터 로드
      const atomicKey = `pfmea_atomic_${selectedProjectId.toLowerCase()}`;
      const savedData = localStorage.getItem(atomicKey);
      
      if (!savedData) {
        alert('백업할 FMEA 데이터가 없습니다.');
        return;
      }
      
      const fmeaData = JSON.parse(savedData);
      
      // 버전 타입 결정 (정수 버전이면 MAJOR)
      const versionType = version.endsWith('.00') ? 'MAJOR' : 'MINOR';
      
      // API 호출
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
  };

  // ✅ 2026-01-19: 버전 복구 기능
  const handleRestore = async (version: string) => {
    if (!selectedProjectId) {
      alert('프로젝트를 선택해주세요.');
      return;
    }
    
    if (!window.confirm(`⚠️ ${version} 버전으로 복구하시겠습니까?\n\n현재 FMEA 데이터가 해당 버전의 백업으로 대체됩니다.\n(현재 데이터를 먼저 백업하는 것을 권장합니다)`)) {
      return;
    }
    
    try {
      // API 호출 - 백업 데이터 가져오기
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
      
      // localStorage에 복구
      const atomicKey = `pfmea_atomic_${selectedProjectId.toLowerCase()}`;
      localStorage.setItem(atomicKey, JSON.stringify(backupData));
      
      alert(`✅ 복구 완료!\n\nFMEA: ${selectedProjectId}\n버전: ${version}\n\n페이지를 새로고침합니다.`);
      
      // 페이지 새로고침 (워크시트에서 데이터 다시 로드)
      window.location.reload();
      
    } catch (error) {
      console.error('복구 오류:', error);
      alert('복구 중 오류가 발생했습니다.');
    }
  };

  // ✅ 2026-01-19: 결재 요청 기능
  const handleApprovalRequest = async (revision: RevisionRecord, approvalType: 'CREATE' | 'REVIEW' | 'APPROVE') => {
    const approvalTypeLabels = { CREATE: '작성', REVIEW: '검토', APPROVE: '승인' };
    const label = approvalTypeLabels[approvalType];
    
    // 결재자 이메일 입력 받기
    const approverEmail = window.prompt(
      `${label} 결재 요청\n\n결재자 이메일을 입력하세요:`,
      approvalType === 'CREATE' ? '' : 
      approvalType === 'REVIEW' ? '' : ''
    );
    
    if (!approverEmail || !approverEmail.includes('@')) {
      alert('올바른 이메일 주소를 입력해주세요.');
      return;
    }
    
    // 결재자 이름 입력 받기
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
            email: '', // 요청자 이메일
          },
          approver: {
            name: approverName,
            email: approverEmail,
          },
          fmeaName: selectedInfo.fmeaName || selectedProjectId,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        if (data.emailSent) {
          alert(`✅ 결재 요청 완료!\n\n${approverEmail}로 이메일이 발송되었습니다.`);
        } else {
          // 이메일 발송 실패 시 링크 제공
          const copyLink = window.confirm(
            `⚠️ 이메일 발송에 실패했습니다.\n\n결재 링크를 클립보드에 복사하시겠습니까?\n\n링크: ${data.approvalLink}`
          );
          if (copyLink) {
            navigator.clipboard.writeText(data.approvalLink);
            alert('클립보드에 복사되었습니다.');
          }
        }
        
        // 상태 업데이트
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
  };

  // 개정 추가
  const handleAddRevision = () => {
    if (!selectedProjectId) {
      alert('프로젝트를 선택해주세요.');
      return;
    }

    const latestNumber = revisions.length > 0
      ? parseInt(revisions[revisions.length - 1].revisionNumber.split('.')[1] || '0')
      : -1;
    const nextNumber = (latestNumber + 1).toString().padStart(2, '0');

    const newRevision: RevisionRecord = {
      id: `REV-${selectedProjectId}-${Date.now()}`,
      projectId: selectedProjectId,
      revisionNumber: `1.${nextNumber}`,
      revisionDate: '',
      revisionHistory: '',
      createPosition: '',
      createName: '',
      createDate: new Date().toISOString().split('T')[0],
      createStatus: '진행',
      reviewPosition: '',
      reviewName: '',
      reviewDate: '',
      reviewStatus: '',
      approvePosition: '',
      approveName: '',
      approveDate: '',
      approveStatus: '',
    };

    setRevisions([...revisions, newRevision]);
  };

  // 선택 삭제
  const handleDeleteSelected = () => {
    if (selectedRows.size === 0) {
      alert('삭제할 개정 이력을 선택해주세요.');
      return;
    }

    if (!confirm(`선택한 ${selectedRows.size}개의 개정 이력을 삭제하시겠습니까?`)) {
      return;
    }

    const updated = revisions.filter(r => !selectedRows.has(r.id));
    setRevisions(updated);
    setSelectedRows(new Set());

    // 저장
    const allRevisions = JSON.parse(localStorage.getItem('fmea-revisions') || '[]');
    const otherRevisions = allRevisions.filter((r: RevisionRecord) => r.projectId !== selectedProjectId);
    localStorage.setItem('fmea-revisions', JSON.stringify([...otherRevisions, ...updated]));
  };

  // 행 선택 토글
  const toggleRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  // 전체 선택 토글
  const toggleAllRows = () => {
    if (selectedRows.size === revisions.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(revisions.map(r => r.id)));
    }
  };

  // 상태 배지 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case '승인': return 'bg-green-200 text-green-700';
      case '반려': return 'bg-red-200 text-red-700';
      case '진행': return 'bg-amber-200 text-amber-700';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  // 회의록 관련 핸들러
  const handleAddMeeting = () => {
    const newMeeting: MeetingMinute = {
      id: `MEETING-${Date.now()}`,
      no: meetingMinutes.length + 1,
      date: new Date().toISOString().split('T')[0],
      projectName: selectedInfo.projectName || '',
      content: '',
      author: '',
      authorPosition: '',
    };
    setMeetingMinutes([...meetingMinutes, newMeeting]);
  };

  const handleUpdateMeetingField = (id: string, field: keyof MeetingMinute, value: unknown) => {
    setMeetingMinutes(prev => prev.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const handleDeleteMeeting = (id: string) => {
    if (!confirm('회의록을 삭제하시겠습니까?')) return;
    setMeetingMinutes(prev => {
      const filtered = prev.filter(m => m.id !== id);
      // 번호 재정렬
      const renumbered = filtered.map((m, index) => ({ ...m, no: index + 1 }));
      // 최소 5개 유지
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
  };

  // 기본 5개 빈 회의록 생성
  const createDefaultMeetings = (): MeetingMinute[] => 
    Array.from({ length: 5 }, (_, index) => ({
      id: `MEETING-DEFAULT-${index}`,
      no: index + 1,
      date: '',
      projectName: '',
      content: '',
      author: '',
      authorPosition: '',
    }));

  // 회의록 로드 (DB API 우선 + localStorage 폴백)
  useEffect(() => {
    if (!selectedProjectId) {
      setMeetingMinutes(createDefaultMeetings());
      return;
    }

    const loadMeetings = async () => {
      try {
        // 1. DB에서 회의록 조회
        const response = await fetch(`/api/fmea/meetings?fmeaId=${selectedProjectId}`);
        const result = await response.json();
        
        if (result.success && result.meetings.length > 0) {
          console.log('✅ [개정관리] DB에서 회의록 로드:', result.meetings.length, '건');
          // 최소 5개 행 보장
          if (result.meetings.length < 5) {
            const additional = Array.from({ length: 5 - result.meetings.length }, (_, i) => ({
              id: `MEETING-${Date.now()}-${i}`,
              no: result.meetings.length + i + 1,
              date: '',
              projectName: selectedInfo.projectName || '',
              content: '',
              author: '',
              authorPosition: '',
            }));
            setMeetingMinutes([...result.meetings, ...additional]);
          } else {
            setMeetingMinutes(result.meetings);
          }
          return;
        }
      } catch (error) {
        console.warn('⚠️ [개정관리] DB API 호출 실패, localStorage 폴백:', error);
      }
      
      // 2. localStorage 폴백
      try {
        const saved = localStorage.getItem(`fmea-meetings-${selectedProjectId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          // 최소 5개 행 보장
          if (parsed.length < 5) {
            const additional = Array.from({ length: 5 - parsed.length }, (_, i) => ({
              id: `MEETING-${Date.now()}-${i}`,
              no: parsed.length + i + 1,
              date: '',
              projectName: selectedInfo.projectName || '',
              content: '',
              author: '',
              authorPosition: '',
            }));
            setMeetingMinutes([...parsed, ...additional]);
          } else {
            setMeetingMinutes(parsed);
          }
        } else {
          setMeetingMinutes(createDefaultMeetings());
        }
      } catch {
        setMeetingMinutes(createDefaultMeetings());
      }
    };
    
    loadMeetings();
  }, [selectedProjectId, selectedInfo.projectName]);

  // 회의록 저장 (DB API 우선 + localStorage 폴백)
  const saveMeetings = async () => {
    if (!selectedProjectId || meetingMinutes.length === 0) return;
    
    try {
      // 1. DB에 저장 시도
      const response = await fetch('/api/fmea/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fmeaId: selectedProjectId, meetings: meetingMinutes }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ [개정관리] DB에 회의록 저장 완료:', result.savedCount, '건');
      } else {
        console.warn('⚠️ [개정관리] DB 저장 실패, localStorage 폴백');
      }
    } catch (error) {
      console.warn('⚠️ [개정관리] DB API 호출 실패, localStorage 폴백:', error);
    }
    
    // 2. localStorage에도 저장 (폴백 & 동기화)
    try {
      localStorage.setItem(`fmea-meetings-${selectedProjectId}`, JSON.stringify(meetingMinutes));
    } catch (error) {
      console.error('❌ 회의록 localStorage 저장 실패:', error);
    }
  };

  // 회의록 자동 저장 (디바운싱)
  const meetingsSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!selectedProjectId || meetingMinutes.length === 0) return;
    
    if (meetingsSaveTimeoutRef.current) {
      clearTimeout(meetingsSaveTimeoutRef.current);
    }
    
    meetingsSaveTimeoutRef.current = setTimeout(() => {
      saveMeetings();
    }, 1000); // 1초 디바운싱
    
    return () => {
      if (meetingsSaveTimeoutRef.current) {
        clearTimeout(meetingsSaveTimeoutRef.current);
      }
    };
  }, [meetingMinutes, selectedProjectId]);

  return (
    <>
      {/* 상단 고정 바로가기 메뉴 */}
      <PFMEATopNav selectedFmeaId={selectedProjectId} />
      
      <div className="h-screen overflow-y-auto bg-[#f0f0f0] px-3 py-3 pt-9 font-[Malgun_Gothic]">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📝</span>
          <h1 className="text-base font-bold text-gray-800">FMEA 개정관리</h1>
      </div>

      {/* 프로젝트 정보 테이블 - 6개 필드 (FMEAID, FMEA명, 공장, FMEA책임자, 고객, 모델) */}
      <div className="rounded-lg overflow-hidden border border-gray-400 mb-4">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#00587a] text-white">
              <th className="border border-white px-3 py-2 text-center font-semibold" style={{width: '16.66%'}}>FMEAID</th>
              <th className="border border-white px-3 py-2 text-center font-semibold" style={{width: '16.66%'}}>FMEA명</th>
              <th className="border border-white px-3 py-2 text-center font-semibold" style={{width: '16.66%'}}>공장</th>
              <th className="border border-white px-3 py-2 text-center font-semibold" style={{width: '16.66%'}}>FMEA책임자</th>
              <th className="border border-white px-3 py-2 text-center font-semibold" style={{width: '16.66%'}}>고객</th>
              <th className="border border-white px-3 py-2 text-center font-semibold" style={{width: '16.66%'}}>모델</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white">
              {/* FMEAID */}
              <td className="border border-gray-400 px-1 py-1">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full h-8 px-2 text-xs text-center border-0 bg-transparent focus:outline-none font-bold text-blue-600"
                >
                  <option value="">-- 선택 --</option>
                  {filteredProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id}
                    </option>
                  ))}
                </select>
              </td>
              {/* FMEA명 */}
              <td className="border border-gray-400 px-1 py-1">
                <input
                  type="text"
                  value={selectedInfo.fmeaName}
                  readOnly
                  placeholder="-"
                  className="w-full h-8 px-2 text-xs text-center border-0 bg-gray-50 focus:outline-none"
                />
              </td>
              {/* 공장 */}
              <td className="border border-gray-400 px-1 py-1">
                <input
                  type="text"
                  value={selectedInfo.factory}
                  readOnly
                  placeholder="-"
                  className="w-full h-8 px-2 text-xs text-center border-0 bg-gray-50 focus:outline-none"
                />
              </td>
              {/* FMEA책임자 */}
              <td className="border border-gray-400 px-1 py-1">
                <input
                  type="text"
                  value={selectedInfo.responsible}
                  readOnly
                  placeholder="-"
                  className="w-full h-8 px-2 text-xs text-center border-0 bg-gray-50 focus:outline-none font-semibold text-green-700"
                />
              </td>
              {/* 고객 */}
              <td className="border border-gray-400 px-1 py-1">
                <div className="flex items-center">
                  <input
                    type="text"
                    value={selectedInfo.customer}
                    readOnly
                    placeholder="클릭하여 선택"
                    className="flex-1 h-8 px-2 text-xs text-center border-0 bg-transparent focus:outline-none cursor-pointer"
                    onClick={() => setBizInfoModalOpen(true)}
                  />
                  <button onClick={() => setBizInfoModalOpen(true)} className="p-1 text-blue-500 hover:text-blue-700">🔍</button>
                </div>
              </td>
              {/* 품명 */}
              <td className="border border-gray-400 px-1 py-1">
                <div className="flex items-center">
                  <input
                    type="text"
                    value={selectedInfo.productName}
                    onChange={(e) => setSelectedInfo(prev => ({ ...prev, productName: e.target.value }))}
                    placeholder="클릭 또는 입력"
                    className="flex-1 h-8 px-2 text-xs text-center border-0 bg-transparent focus:outline-none cursor-pointer"
                    onClick={() => setBizInfoModalOpen(true)}
                  />
                  <button onClick={() => setBizInfoModalOpen(true)} className="p-1 text-blue-500 hover:text-blue-700">🔍</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 개정 이력 테이블 */}
      <div className="rounded-lg overflow-hidden border border-gray-400 bg-white">
        {/* 테이블 헤더 바 */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#00587a] text-white">
          <span className="text-sm font-bold">📝 개정 이력 관리 - {projectLabel}</span>
          <div className="flex gap-2">
            <button
              onClick={handleAddRevision}
              className="px-3 py-1.5 bg-green-100 border border-green-500 text-green-700 text-xs rounded hover:bg-green-200"
            >
              + 추가
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedRows.size === 0}
              className="px-3 py-1.5 bg-red-100 border border-red-400 text-red-600 text-xs rounded hover:bg-red-200 disabled:opacity-50"
            >
              − 삭제
            </button>
            <button
              onClick={handleSave}
              className={`px-3 py-1.5 text-xs font-semibold rounded ${
                saveStatus === 'saved' 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-[#1976d2] text-white hover:bg-[#1565c0]'
              }`}
            >
              {saveStatus === 'saved' ? '✅ 저장됨' : '💾 저장'}
            </button>
          </div>
        </div>

        {/* HTML 테이블 - 헤더 고정 + 스크롤 (5행) */}
        <div className="overflow-auto max-h-[175px] border border-gray-300 rounded">
          <table className="w-full border-collapse text-xs min-w-[1100px]">
            <thead className="sticky top-0 z-10">
              {/* 첫 번째 헤더 행 */}
              <tr className="bg-[#00587a] text-white h-[25px] text-[10px]">
                <th className="border border-white px-1 py-0 text-center align-middle w-8" rowSpan={2}>
                  <input
                    type="checkbox"
                    checked={revisions.length > 0 && selectedRows.size === revisions.length}
                    onChange={toggleAllRows}
                    className="w-3 h-3"
                  />
                </th>
                <th className="border border-white px-1 py-0 text-center align-middle w-12" rowSpan={2}>개정번호</th>
                <th className="border border-white px-1 py-0 text-center align-middle w-[76px]" rowSpan={2}>개정일자</th>
                <th className="border border-white px-1 py-0 text-center align-middle w-32" rowSpan={2}>개정이력</th>
                <th className="border border-white px-1 py-0 text-center align-middle" colSpan={4}>작성</th>
                <th className="border border-white px-1 py-0 text-center align-middle" colSpan={4}>검토</th>
                <th className="border border-white px-1 py-0 text-center align-middle" colSpan={4}>승인</th>
                <th className="border border-white px-1 py-0 text-center align-middle w-10" rowSpan={2}>복구</th>
              </tr>
              {/* 두 번째 헤더 행 */}
              <tr className="bg-[#00587a] text-white h-[25px] text-[10px]">
                <th className="border border-white px-1 py-0 text-center align-middle w-14">직급</th>
                <th className="border border-white px-1 py-0 text-center align-middle w-16">성명</th>
                <th className="border border-white px-1 py-0 text-center align-middle w-[76px]">날짜</th>
                <th className="border border-white px-1 py-0 text-center align-middle w-12">상태▼</th>
                <th className="border border-white px-1 py-0 text-center align-middle w-14">직급</th>
                <th className="border border-white px-1 py-0 text-center align-middle w-16">성명</th>
                <th className="border border-white px-1 py-0 text-center align-middle w-[76px]">날짜</th>
                <th className="border border-white px-1 py-0 text-center align-middle w-12">상태▼</th>
                <th className="border border-white px-1 py-0 text-center align-middle w-14">직급</th>
                <th className="border border-white px-1 py-0 text-center align-middle w-16">성명</th>
                <th className="border border-white px-1 py-0 text-center align-middle w-[76px]">날짜</th>
                <th className="border border-white px-1 py-0 text-center align-middle w-12">상태▼</th>
              </tr>
            </thead>
            <tbody>
              {revisions.map((revision, index) => (
                <tr key={revision.id} className={`h-[25px] hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`}>
                  <td className="border border-gray-400 px-1 py-0 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(revision.id)}
                      onChange={() => toggleRow(revision.id)}
                      className="w-3 h-3"
                    />
                  </td>
                  <td className="border border-gray-400 px-1 py-0 text-center align-middle font-bold text-green-600 text-xs">
                    {revision.revisionNumber}
                  </td>
                  <td className="border border-gray-400 px-0 py-0 text-center align-middle">
                    <input
                      type="date"
                      value={revision.revisionDate || ''}
                      onChange={(e) => updateField(revision.id, 'revisionDate', e.target.value)}
                      className="w-[76px] h-[23px] px-0 text-[10px] text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                      style={{ colorScheme: 'light' }}
                    />
                  </td>
                  <td className="border border-gray-400 px-1 py-0 text-left align-middle">
                    <input
                      type="text"
                      value={revision.revisionHistory}
                      onChange={(e) => updateField(revision.id, 'revisionHistory', e.target.value)}
                      placeholder="개정이력"
                      className="w-full h-[23px] px-1 text-[10px] border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                    />
                  </td>
                  {/* 작성 */}
                  <td className="border border-gray-400 px-0 py-0">
                    <input
                      type="text"
                      value={revision.createPosition}
                      onChange={(e) => updateField(revision.id, 'createPosition', e.target.value)}
                      placeholder="직급"
                      className="w-full h-[23px] px-1 text-[10px] text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                    />
                  </td>
                  <td className="border border-gray-400 px-0 py-0">
                    <input
                      type="text"
                      value={revision.createName}
                      onChange={(e) => updateField(revision.id, 'createName', e.target.value)}
                      placeholder="성명"
                      className="w-full h-[23px] px-1 text-[10px] text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                    />
                  </td>
                  <td className="border border-gray-400 px-0 py-0">
                    <input
                      type="date"
                      value={revision.createDate}
                      onChange={(e) => updateField(revision.id, 'createDate', e.target.value)}
                      className="w-[76px] h-[23px] px-0 text-[10px] text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                      style={{ colorScheme: 'light' }}
                    />
                  </td>
                  <td className="border border-gray-400 px-0 py-0">
                    <div className="flex items-center gap-0.5">
                      <select
                        value={revision.createStatus}
                        onChange={(e) => updateField(revision.id, 'createStatus', e.target.value)}
                        className={`flex-1 h-[23px] px-0 text-[10px] text-center border-0 rounded appearance-none cursor-pointer ${getStatusColor(revision.createStatus)}`}
                      >
                        <option value="">-</option>
                        <option value="진행">진행</option>
                        <option value="승인">승인</option>
                        <option value="반려">반려</option>
                      </select>
                      <button
                        onClick={() => handleApprovalRequest(revision, 'CREATE')}
                        className="px-1 text-[9px] hover:bg-blue-100 rounded"
                        title="작성 결재 요청 이메일 발송"
                      >
                        📧
                      </button>
                    </div>
                  </td>
                  {/* 검토 */}
                  <td className="border border-gray-400 px-0 py-0">
                    <input
                      type="text"
                      value={revision.reviewPosition}
                      onChange={(e) => updateField(revision.id, 'reviewPosition', e.target.value)}
                      placeholder="직급"
                      className="w-full h-[23px] px-1 text-[10px] text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                    />
                  </td>
                  <td className="border border-gray-400 px-0 py-0">
                    <input
                      type="text"
                      value={revision.reviewName}
                      onChange={(e) => updateField(revision.id, 'reviewName', e.target.value)}
                      placeholder="성명"
                      className="w-full h-[23px] px-1 text-[10px] text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                    />
                  </td>
                  <td className="border border-gray-400 px-0 py-0">
                    <input
                      type="date"
                      value={revision.reviewDate}
                      onChange={(e) => updateField(revision.id, 'reviewDate', e.target.value)}
                      className="w-[76px] h-[23px] px-0 text-[10px] text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                      style={{ colorScheme: 'light' }}
                    />
                  </td>
                  <td className="border border-gray-400 px-0 py-0">
                    <div className="flex items-center gap-0.5">
                      <select
                        value={revision.reviewStatus}
                        onChange={(e) => updateField(revision.id, 'reviewStatus', e.target.value)}
                        className={`flex-1 h-[23px] px-0 text-[10px] text-center border-0 rounded appearance-none cursor-pointer ${getStatusColor(revision.reviewStatus)}`}
                      >
                        <option value="">-</option>
                        <option value="진행">진행</option>
                        <option value="승인">승인</option>
                        <option value="반려">반려</option>
                      </select>
                      <button
                        onClick={() => handleApprovalRequest(revision, 'REVIEW')}
                        className="px-1 text-[9px] hover:bg-blue-100 rounded"
                        title="검토 결재 요청 이메일 발송"
                      >
                        📧
                      </button>
                    </div>
                  </td>
                  {/* 승인 */}
                  <td className="border border-gray-400 px-0 py-0">
                    <input
                      type="text"
                      value={revision.approvePosition}
                      onChange={(e) => updateField(revision.id, 'approvePosition', e.target.value)}
                      placeholder="직급"
                      className="w-full h-[23px] px-1 text-[10px] text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                    />
                  </td>
                  <td className="border border-gray-400 px-0 py-0">
                    <input
                      type="text"
                      value={revision.approveName}
                      onChange={(e) => updateField(revision.id, 'approveName', e.target.value)}
                      placeholder="성명"
                      className="w-full h-[23px] px-1 text-[10px] text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                    />
                  </td>
                  <td className="border border-gray-400 px-0 py-0">
                    <input
                      type="date"
                      value={revision.approveDate}
                      onChange={(e) => updateField(revision.id, 'approveDate', e.target.value)}
                      className="w-[76px] h-[23px] px-0 text-[10px] text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                      style={{ colorScheme: 'light' }}
                    />
                  </td>
                  <td className="border border-gray-400 px-0 py-0">
                    <div className="flex items-center gap-0.5">
                      <select
                        value={revision.approveStatus}
                        onChange={(e) => updateField(revision.id, 'approveStatus', e.target.value)}
                        className={`flex-1 h-[23px] px-0 text-[10px] text-center border-0 rounded appearance-none cursor-pointer ${getStatusColor(revision.approveStatus)}`}
                      >
                        <option value="">-</option>
                        <option value="진행">진행</option>
                        <option value="승인">승인</option>
                        <option value="반려">반려</option>
                      </select>
                      <button
                        onClick={() => handleApprovalRequest(revision, 'APPROVE')}
                        className="px-1 text-[9px] hover:bg-blue-100 rounded"
                        title="승인 결재 요청 이메일 발송"
                      >
                        📧
                      </button>
                    </div>
                  </td>
                  {/* 복구 버튼 (백업은 고장연결/6ST 확정 시 자동) */}
                  <td className="border border-gray-400 px-1 py-0 text-center align-middle">
                    <button
                      onClick={() => handleRestore(revision.revisionNumber)}
                      className="px-1.5 py-0.5 text-[9px] bg-green-500 text-white rounded hover:bg-green-600"
                      title="이 버전의 백업에서 복구"
                    >
                      ↩️
                    </button>
                  </td>
                </tr>
              ))}
              {revisions.length === 0 && (
                <tr>
                  <td colSpan={16} className="px-4 py-10 text-center text-gray-500">
                    개정 이력이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== SOD 변경 히스토리 섹션 (모듈화 컴포넌트) ===== */}
      <div className="mt-4">
        {selectedProjectId ? (
          <SODHistoryTable fmeaId={selectedProjectId} fmeaName={selectedInfo.fmeaName} />
        ) : (
          <div className="rounded-lg overflow-hidden border border-gray-400 bg-white">
            <div className="flex items-center justify-between px-4 py-2 bg-[#00587a] text-white">
              <span className="text-sm font-bold">📝 변경히스토리 (SOD 변경 기록)</span>
            </div>
            <div className="p-8 text-center text-gray-500">
              프로젝트를 먼저 선택해주세요.
            </div>
          </div>
        )}
      </div>

      {/* ===== 회의록 관리 섹션 ===== */}
      <div className="mt-6">
        <MeetingMinutesTable
          meetingMinutes={meetingMinutes}
          onUpdateField={handleUpdateMeetingField}
          onDelete={handleDeleteMeeting}
          onAdd={handleAddMeeting}
          maxVisibleRows={5}
        />
      </div>

      {/* 하단 상태바 */}
      <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex justify-between text-xs text-gray-500">
        <span>총 {revisions.length}개의 개정 이력 | 회의록 {meetingMinutes.length}건</span>
        <span>버전: FMEA Suite v3.0 | 사용자: FMEA Lead</span>
      </div>

        {/* 기초정보 선택 모달 */}
        <BizInfoSelectModal
          isOpen={bizInfoModalOpen}
          onSelect={handleBizInfoSelect}
          onClose={() => setBizInfoModalOpen(false)}
        />
      </div>
    </>
  );
}

// =====================================================
// 메인 컴포넌트 (Suspense 바운더리로 감싸기 - Next.js 16 필수)
// =====================================================
export default function RevisionManagementPage() {
  return (
    <Suspense fallback={<div className="p-4">로딩 중...</div>}>
      <RevisionManagementPageInner />
    </Suspense>
  );
}

