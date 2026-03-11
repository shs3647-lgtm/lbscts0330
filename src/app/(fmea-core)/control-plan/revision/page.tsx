/**
 * @file page.tsx
 * @description Control Plan 개정관리 페이지 - PFMEA revision과 동일한 구조
 * @version 2.1.0
 * @updated 2026-01-25 - 회의록 관리 추가, FixedLayout + Sidebar 적용
 */

'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
// ✅ xlsx/xlsx-js-style: dynamic import
const BizInfoSelectModal = dynamic(
  () => import('@/components/modals/BizInfoSelectModal').then(mod => ({ default: mod.BizInfoSelectModal })),
  { ssr: false }
);
import { MeetingMinutesTable } from '@/components/tables/MeetingMinutesTable';
import { BizInfoProject } from '@/types/bizinfo';
import { MeetingMinute } from '@/types/project-revision';
import CPTopNav from '@/components/layout/CPTopNav';
import { FixedLayout } from '@/components/layout';
import { CPChangeHistoryTable } from './components';

// =====================================================
// 타입 정의
// =====================================================
interface CPProject {
  id: string;
  cpInfo?: {
    cpProjectName?: string;
    customerName?: string;
    subject?: string;
  };
  createdAt?: string;
}

interface RevisionRecord {
  id: string;
  projectId: string;
  revisionNumber: string;
  revisionHistory: string;
  createPosition: string;
  createName: string;
  createDate: string;
  createStatus: string;
  reviewPosition: string;
  reviewName: string;
  reviewDate: string;
  reviewStatus: string;
  approvePosition: string;
  approveName: string;
  approveDate: string;
  approveStatus: string;
}

// =====================================================
// CP 등록정보 타입
// =====================================================
interface CPInfoData {
  cpResponsibleName?: string;
  cpResponsiblePosition?: string;
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
// 초기 개정 이력 생성 (CP 등록정보 자동 반영)
// =====================================================
const createDefaultRevisions = (projectId: string, cpInfo?: CPInfoData | null): RevisionRecord[] =>
  Array.from({ length: 5 }, (_, index) => ({
    id: `REV-CP-${projectId}-${index}`,
    projectId: projectId,
    revisionNumber: `1.${index.toString().padStart(2, '0')}`,
    revisionHistory: index === 0 ? '신규 CP 등록' : '',
    // 작성 (CP 등록정보에서 자동 채움)
    createPosition: index === 0 ? (cpInfo?.cpResponsiblePosition || '') : '',
    createName: index === 0 ? (cpInfo?.cpResponsibleName || '') : '',
    createDate: index === 0 ? new Date().toISOString().split('T')[0] : '',
    createStatus: index === 0 ? '진행' : '',
    // 검토 (CP 등록정보에서 자동 채움)
    reviewPosition: index === 0 ? (cpInfo?.reviewResponsiblePosition || '') : '',
    reviewName: index === 0 ? (cpInfo?.reviewResponsibleName || '') : '',
    reviewDate: '',
    reviewStatus: '',
    // 승인 (CP 등록정보에서 자동 채움)
    approvePosition: index === 0 ? (cpInfo?.approvalResponsiblePosition || '') : '',
    approveName: index === 0 ? (cpInfo?.approvalResponsibleName || '') : '',
    approveDate: '',
    approveStatus: '',
  }));

// =====================================================
// 내부 컴포넌트 (useSearchParams 사용)
// =====================================================
function CPRevisionManagementPageInner() {
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get('id') || '';

  // 프로젝트 상태
  const [projectList, setProjectList] = useState<CPProject[]>([]);
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

  // 선택된 프로젝트 상세 정보 (CPID, CP명, 공장, CP담당자, 고객, 품명)
  const [selectedInfo, setSelectedInfo] = useState({
    cpId: '',          // CPID
    cpName: '',        // CP명
    factory: '',       // 공장
    responsible: '',   // CP담당자
    customer: '',      // 고객
    productName: '',   // 품명
  });

  // CP 등록정보에서 작성자 정보 자동 채우기
  const [cpInfo, setCpInfo] = useState<CPInfoData | null>(null);

  // URL 파라미터로 전달된 CP ID 처리
  useEffect(() => {
    if (idFromUrl && idFromUrl !== selectedProjectId) {
      setSelectedProjectId(idFromUrl);
    }
  }, [idFromUrl, selectedProjectId]);

  // CP 등록정보 로드 (작성자 정보 자동 채움)
  useEffect(() => {
    if (!selectedProjectId) return;

    const loadCpInfo = async () => {
      try {
        // DB에서 CP Info 조회
        const response = await fetch(`/api/control-plan?cpNo=${selectedProjectId}`);
        const result = await response.json();

        if (result.success && result.data) {
          setCpInfo({
            cpResponsibleName: result.data.cpResponsibleName || '',
            cpResponsiblePosition: result.data.processResponsibility || '',
          });

          // 프로젝트 정보도 업데이트
          setSelectedInfo(prev => ({
            ...prev,
            cpId: selectedProjectId || prev.cpId,
            cpName: result.data.subject || prev.cpName,
            factory: result.data.engineeringLocation || prev.factory,
            responsible: result.data.cpResponsibleName || prev.responsible,
            customer: result.data.customerName || prev.customer,
            productName: result.data.subject || prev.productName,
          }));

          // 1.00에 CP 등록정보 자동 반영
          setRevisions(prev => {
            const rev00 = prev.find(r => r.revisionNumber === '1.00');
            if (rev00 && !rev00.createName) {
              return prev.map(r => {
                if (r.revisionNumber === '1.00') {
                  return {
                    ...r,
                    createPosition: result.data.processResponsibility || r.createPosition,
                    createName: result.data.cpResponsibleName || r.createName,
                  };
                }
                return r;
              });
            }
            return prev;
          });
        }
      } catch (error) {
      }
    };

    loadCpInfo();
  }, [selectedProjectId]);

  // 프로젝트 목록 로드 (DB API 우선, localStorage 폴백)
  useEffect(() => {
    const loadProjects = async () => {
      try {
        // 1. DB에서 프로젝트 목록 조회 (Primary Source)
        const response = await fetch('/api/control-plan');
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
          const cpProjects: CPProject[] = result.data.map((cp: any) => ({
            id: cp.cpNo,
            cpInfo: {
              cpProjectName: cp.subject || '',
              customerName: cp.customerName || '',
              subject: cp.subject || '',
            },
            createdAt: cp.createdAt || new Date().toISOString(),
          }));
          setProjectList(cpProjects);

          // URL에서 받은 ID가 있으면 그것을 디폴트로, 없으면 첫번째
          if (!selectedProjectId && cpProjects.length > 0) {
            const urlProject = cpProjects.find((p: CPProject) =>
              p.id.toLowerCase() === idFromUrl.toLowerCase()
            );
            setSelectedProjectId(urlProject?.id || cpProjects[0].id);
          }
          return;
        }
      } catch (error) {
      }

      // 2. localStorage 폴백 (DB 실패 시)
      try {
        const stored = localStorage.getItem('cp-projects');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProjectList(parsed);
            if (!selectedProjectId) {
              const urlProject = parsed.find((p: CPProject) =>
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
        const fallbackProject: CPProject = {
          id: idFromUrl,
          cpInfo: { cpProjectName: idFromUrl, customerName: '', subject: '' },
          createdAt: new Date().toISOString(),
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
        // 1. DB에서 개정 이력 조회 (CP용 API가 있으면 사용)
        const response = await fetch(`/api/control-plan/revisions?cpNo=${selectedProjectId}`);
        if (response.ok) {
          const result = await response.json();

          if (result.success && result.revisions && result.revisions.length > 0) {
            const normalizedRevisions = result.revisions.map((r: RevisionRecord) => ({
              ...r,
              revisionNumber: normalizeRevisionNumber(r.revisionNumber),
            }));
            setRevisions(normalizedRevisions.sort((a: RevisionRecord, b: RevisionRecord) =>
              a.revisionNumber.localeCompare(b.revisionNumber)
            ));
            return;
          }
        }
      } catch (error) {
      }

      // 2. localStorage 폴백
      try {
        const allRevisions = JSON.parse(localStorage.getItem('cp-revisions') || '[]');
        let projectRevisions = allRevisions.filter((r: RevisionRecord) => r.projectId === selectedProjectId);

        if (projectRevisions.length === 0) {
          projectRevisions = createDefaultRevisions(selectedProjectId, cpInfo);
          localStorage.setItem('cp-revisions', JSON.stringify([...allRevisions, ...projectRevisions]));
        }

        // 최소 5개 행 보장
        while (projectRevisions.length < 5) {
          const nextNumber = projectRevisions.length.toString().padStart(2, '0');
          projectRevisions.push({
            id: `REV-CP-${selectedProjectId}-${Date.now()}-${projectRevisions.length}`,
            projectId: selectedProjectId,
            revisionNumber: `1.${nextNumber}`,
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

        // 개정번호 정규화
        const normalizedRevisions = projectRevisions.map((r: RevisionRecord) => ({
          ...r,
          revisionNumber: normalizeRevisionNumber(r.revisionNumber),
        }));

        setRevisions(normalizedRevisions.sort((a: RevisionRecord, b: RevisionRecord) =>
          a.revisionNumber.localeCompare(b.revisionNumber)
        ));
      } catch (error) {
        console.error('❌ 개정 이력 로드 실패:', error);
        setRevisions(createDefaultRevisions(selectedProjectId, cpInfo));
      }
    };

    loadRevisions();
  }, [selectedProjectId, cpInfo]);

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
      p.cpInfo?.customerName === info.customerName &&
      p.cpInfo?.subject === info.productName
    );
    if (matched) {
      setSelectedProjectId(matched.id);
    }
  };

  const filteredProjects = projectList.filter(p => {
    if (!p || !p.id) return false;
    return (
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.cpInfo?.cpProjectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.cpInfo?.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const selectedProject = projectList.find(p => p.id === selectedProjectId);
  const projectLabel = selectedProject
    ? `${selectedProject.cpInfo?.cpProjectName || selectedProject.id}`
    : 'CP를 선택하세요';

  const updateField = (id: string, field: keyof RevisionRecord, value: string) => {
    const updated = revisions.map(r => (r.id === id ? { ...r, [field]: value } : r));
    setRevisions(updated);
  };

  const handleSave = () => {
    if (!selectedProjectId) {
      alert('CP를 선택해주세요.');
      return;
    }

    try {
      const allRevisions = JSON.parse(localStorage.getItem('cp-revisions') || '[]');
      const otherRevisions = allRevisions.filter((r: RevisionRecord) => r.projectId !== selectedProjectId);
      localStorage.setItem('cp-revisions', JSON.stringify([...otherRevisions, ...revisions]));

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('❌ 저장 실패:', error);
      alert('저장에 실패했습니다.');
    }
  };

  const handleAddRevision = () => {
    if (!selectedProjectId) {
      alert('CP를 선택해주세요.');
      return;
    }

    // 마지막 개정번호 파싱 (N.XX 형식)
    const lastRevision = revisions[revisions.length - 1];
    let nextMinor = 0;
    if (lastRevision) {
      const match = lastRevision.revisionNumber.match(/^(\d+)\.(\d{2})$/);
      if (match) {
        nextMinor = parseInt(match[2], 10) + 1;
      }
    }
    const nextNumber = nextMinor.toString().padStart(2, '0');

    const newRevision: RevisionRecord = {
      id: `REV-CP-${selectedProjectId}-${Date.now()}`,
      projectId: selectedProjectId,
      revisionNumber: `1.${nextNumber}`,
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

    const allRevisions = JSON.parse(localStorage.getItem('cp-revisions') || '[]');
    const otherRevisions = allRevisions.filter((r: RevisionRecord) => r.projectId !== selectedProjectId);
    localStorage.setItem('cp-revisions', JSON.stringify([...otherRevisions, ...updated]));
  };

  const toggleRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllRows = () => {
    if (selectedRows.size === revisions.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(revisions.map(r => r.id)));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '승인': return 'bg-green-200 text-green-700';
      case '반려': return 'bg-red-200 text-red-700';
      case '진행': return 'bg-amber-200 text-amber-700';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  // ===== 회의록 관련 핸들러 =====
  const handleAddMeeting = () => {
    const newMeeting: MeetingMinute = {
      id: `MEETING-CP-${Date.now()}`,
      no: meetingMinutes.length + 1,
      date: new Date().toISOString().split('T')[0],
      projectName: selectedInfo.productName || '',
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
      const renumbered = filtered.map((m, index) => ({ ...m, no: index + 1 }));
      if (renumbered.length < 5) {
        const additional = Array.from({ length: 5 - renumbered.length }, (_, i) => ({
          id: `MEETING-CP-${Date.now()}-${i}`,
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
      id: `MEETING-CP-DEFAULT-${index}`,
      no: index + 1,
      date: '',
      projectName: '',
      content: '',
      author: '',
      authorPosition: '',
    }));

  // 회의록 로드
  useEffect(() => {
    if (!selectedProjectId) {
      setMeetingMinutes(createDefaultMeetings());
      return;
    }

    try {
      const saved = localStorage.getItem(`cp-meetings-${selectedProjectId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length < 5) {
          const additional = Array.from({ length: 5 - parsed.length }, (_, i) => ({
            id: `MEETING-CP-${Date.now()}-${i}`,
            no: parsed.length + i + 1,
            date: '',
            projectName: selectedInfo.productName || '',
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
  }, [selectedProjectId, selectedInfo.productName]);

  // 회의록 자동 저장 (디바운싱)
  const meetingsSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!selectedProjectId || meetingMinutes.length === 0) return;

    if (meetingsSaveTimeoutRef.current) {
      clearTimeout(meetingsSaveTimeoutRef.current);
    }

    meetingsSaveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(`cp-meetings-${selectedProjectId}`, JSON.stringify(meetingMinutes));
    }, 1000);

    return () => {
      if (meetingsSaveTimeoutRef.current) {
        clearTimeout(meetingsSaveTimeoutRef.current);
      }
    };
  }, [meetingMinutes, selectedProjectId]);

  return (
    <FixedLayout
      topNav={<CPTopNav selectedCpId={selectedProjectId} />}
      showSidebar={true}
      bgColor="#f0f0f0"
      contentPadding="p-0"
    >
      <div className="h-full overflow-y-auto px-[10px] py-[10px] font-[Malgun_Gothic]">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📝</span>
          <h1 className="text-base font-bold text-gray-800">Control Plan 개정관리(Revision Mgmt.)</h1>
        </div>

        {/* 프로젝트 정보 테이블 (PFMEA 동일 구조) */}
        <div className="rounded-lg overflow-hidden border border-gray-400 mb-4">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#00587a] text-white">
                <th className="border border-white px-3 py-2 text-center font-semibold" title="CP ID">CP ID</th>
                <th className="border border-white px-3 py-2 text-center font-semibold" title="CP Name">CP명(Name)</th>
                <th className="border border-white px-3 py-2 text-center font-semibold" title="Factory">공장(Factory)</th>
                <th className="border border-white px-3 py-2 text-center font-semibold" title="CP Owner">CP담당자(Owner)</th>
                <th className="border border-white px-3 py-2 text-center font-semibold" title="Customer">고객(Customer)</th>
                <th className="border border-white px-3 py-2 text-center font-semibold" title="Part Name">품명(Part Name)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="border border-gray-400 px-1 py-1">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full h-8 px-2 text-xs text-center border-0 bg-transparent focus:outline-none font-semibold text-blue-600"
                  >
                    <option value="">-- CP 선택 --</option>
                    {filteredProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border border-gray-400 px-1 py-1">
                  <input
                    type="text"
                    value={selectedInfo.cpName}
                    readOnly
                    placeholder="-"
                    className="w-full h-8 px-2 text-xs text-center border-0 bg-gray-50 focus:outline-none"
                  />
                </td>
                <td className="border border-gray-400 px-1 py-1">
                  <input
                    type="text"
                    value={selectedInfo.factory}
                    readOnly
                    placeholder="-"
                    className="w-full h-8 px-2 text-xs text-center border-0 bg-gray-50 focus:outline-none"
                  />
                </td>
                <td className="border border-gray-400 px-1 py-1">
                  <input
                    type="text"
                    value={selectedInfo.responsible}
                    readOnly
                    placeholder="-"
                    className="w-full h-8 px-2 text-xs text-center border-0 bg-gray-50 focus:outline-none"
                  />
                </td>
                <td className="border border-gray-400 px-1 py-1">
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={selectedInfo.customer}
                      readOnly
                      placeholder="클릭하여 선택(Click to Select)"
                      className="flex-1 h-8 px-2 text-xs text-center border-0 bg-transparent focus:outline-none cursor-pointer"
                      onClick={() => setBizInfoModalOpen(true)}
                    />
                    <button onClick={() => setBizInfoModalOpen(true)} className="p-1 text-blue-500 hover:text-blue-700">🔍</button>
                  </div>
                </td>
                <td className="border border-gray-400 px-1 py-1">
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={selectedInfo.productName}
                      readOnly
                      placeholder="-"
                      className="flex-1 h-8 px-2 text-xs text-center border-0 bg-gray-50 focus:outline-none"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 개정 이력 테이블 */}
        <div className="rounded-lg overflow-hidden border border-gray-400 bg-white">
          <div className="flex items-center justify-between px-4 py-2 bg-[#00587a] text-white">
            <span className="text-sm font-bold">📝 개정 이력 관리 - {projectLabel}</span>
            <div className="flex gap-2">
              <button
                onClick={handleAddRevision}
                className="px-3 py-1.5 bg-green-100 border border-green-500 text-green-700 text-xs rounded hover:bg-green-200"
              >
                + 추가(Add)
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={selectedRows.size === 0}
                className="px-3 py-1.5 bg-red-100 border border-red-400 text-red-600 text-xs rounded hover:bg-red-200 disabled:opacity-50"
              >
                − 삭제(Delete)
              </button>
              <button
                onClick={handleSave}
                className={`px-3 py-1.5 text-xs font-semibold rounded ${saveStatus === 'saved'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                {saveStatus === 'saved' ? '✅ 저장됨(Saved)' : '💾 저장(Save)'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs min-w-[1200px]">
              <thead>
                <tr className="bg-[#00587a] text-white">
                  <th className="border border-white px-2 py-2 text-center align-middle w-10" rowSpan={2}>
                    <input
                      type="checkbox"
                      checked={revisions.length > 0 && selectedRows.size === revisions.length}
                      onChange={toggleAllRows}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="border border-white px-3 py-2 text-center align-middle w-20" rowSpan={2} title="Revision Number">개정번호(Rev No)</th>
                  <th className="border border-white px-3 py-2 text-center align-middle w-48" rowSpan={2} title="Revision History">개정이력(History)</th>
                  <th className="border border-white px-3 py-2 text-center align-middle" colSpan={4} title="Created">작성(Create)</th>
                  <th className="border border-white px-3 py-2 text-center align-middle" colSpan={4} title="Reviewed">검토(Review)</th>
                  <th className="border border-white px-3 py-2 text-center align-middle" colSpan={4} title="Approved">승인(Approve)</th>
                </tr>
                <tr className="bg-[#00587a] text-white">
                  <th className="border border-white px-2 py-1 text-center align-middle w-16" title="Position">직급(Pos.)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-20" title="Name">성명(Name)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-24" title="Date">날짜(Date)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-16" title="Status">상태(Status)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-16" title="Position">직급(Pos.)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-20" title="Name">성명(Name)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-24" title="Date">날짜(Date)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-16" title="Status">상태(Status)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-16" title="Position">직급(Pos.)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-20" title="Name">성명(Name)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-24" title="Date">날짜(Date)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-16" title="Status">상태(Status)</th>
                </tr>
              </thead>
              <tbody>
                {revisions.map((revision, index) => (
                  <tr key={revision.id} className={`hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-blue-50/50'}`}>
                    <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(revision.id)}
                        onChange={() => toggleRow(revision.id)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="border border-gray-400 px-3 py-1 text-center align-middle font-bold text-blue-600">
                      {normalizeRevisionNumber(revision.revisionNumber)}
                    </td>
                    <td className="border border-gray-400 px-1 py-1 text-left align-middle">
                      <input
                        type="text"
                        value={revision.revisionHistory}
                        onChange={(e) => updateField(revision.id, 'revisionHistory', e.target.value)}
                        placeholder="개정이력 입력(Revision History)"
                        className="w-full h-6 px-2 text-xs border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                      />
                    </td>
                    {/* 작성 */}
                    <td className="border border-gray-400 px-1 py-1">
                      <input type="text" value={revision.createPosition} onChange={(e) => updateField(revision.id, 'createPosition', e.target.value)}
                        placeholder="직급(Position)" className="w-full h-6 px-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50" />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <input type="text" value={revision.createName} onChange={(e) => updateField(revision.id, 'createName', e.target.value)}
                        placeholder="성명(Name)" className="w-full h-6 px-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50" />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <input type="date" value={revision.createDate} onChange={(e) => updateField(revision.id, 'createDate', e.target.value)}
                        className="w-full h-6 px-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50" />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <select value={revision.createStatus} onChange={(e) => updateField(revision.id, 'createStatus', e.target.value)}
                        className={`w-full h-6 px-1 text-xs text-center border-0 rounded ${getStatusColor(revision.createStatus)}`}>
                        <option value="">선택(Select)</option>
                        <option value="진행">진행(In Progress)</option>
                        <option value="승인">승인(Approved)</option>
                        <option value="반려">반려(Rejected)</option>
                      </select>
                    </td>
                    {/* 검토 */}
                    <td className="border border-gray-400 px-1 py-1">
                      <input type="text" value={revision.reviewPosition} onChange={(e) => updateField(revision.id, 'reviewPosition', e.target.value)}
                        placeholder="직급(Position)" className="w-full h-6 px-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50" />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <input type="text" value={revision.reviewName} onChange={(e) => updateField(revision.id, 'reviewName', e.target.value)}
                        placeholder="성명(Name)" className="w-full h-6 px-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50" />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <input type="date" value={revision.reviewDate} onChange={(e) => updateField(revision.id, 'reviewDate', e.target.value)}
                        className="w-full h-6 px-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50" />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <select value={revision.reviewStatus} onChange={(e) => updateField(revision.id, 'reviewStatus', e.target.value)}
                        className={`w-full h-6 px-1 text-xs text-center border-0 rounded ${getStatusColor(revision.reviewStatus)}`}>
                        <option value="">선택(Select)</option>
                        <option value="진행">진행(In Progress)</option>
                        <option value="승인">승인(Approved)</option>
                        <option value="반려">반려(Rejected)</option>
                      </select>
                    </td>
                    {/* 승인 */}
                    <td className="border border-gray-400 px-1 py-1">
                      <input type="text" value={revision.approvePosition} onChange={(e) => updateField(revision.id, 'approvePosition', e.target.value)}
                        placeholder="직급(Position)" className="w-full h-6 px-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50" />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <input type="text" value={revision.approveName} onChange={(e) => updateField(revision.id, 'approveName', e.target.value)}
                        placeholder="성명(Name)" className="w-full h-6 px-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50" />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <input type="date" value={revision.approveDate} onChange={(e) => updateField(revision.id, 'approveDate', e.target.value)}
                        className="w-full h-6 px-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50" />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <select value={revision.approveStatus} onChange={(e) => updateField(revision.id, 'approveStatus', e.target.value)}
                        className={`w-full h-6 px-1 text-xs text-center border-0 rounded ${getStatusColor(revision.approveStatus)}`}>
                        <option value="">선택(Select)</option>
                        <option value="진행">진행(In Progress)</option>
                        <option value="승인">승인(Approved)</option>
                        <option value="반려">반려(Rejected)</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {revisions.length === 0 && (
                  <tr>
                    <td colSpan={15} className="px-4 py-10 text-center text-gray-500">
                      개정 이력이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== 변경 히스토리 섹션 ===== */}
        <div className="mt-4">
          {selectedProjectId ? (
            <CPChangeHistoryTable cpId={selectedProjectId} cpName={selectedInfo.cpName} />
          ) : (
            <div className="rounded-lg overflow-hidden border border-gray-400 bg-white">
              <div className="flex items-center justify-between px-4 py-2 bg-[#00587a] text-white">
                <span className="text-sm font-bold">📝 변경 히스토리 (Change History)</span>
              </div>
              <div className="p-8 text-center text-gray-500">
                프로젝트를 먼저 선택해주세요.
              </div>
            </div>
          )}
        </div>

        {/* ===== 회의록 관리 섹션 (마지막) ===== */}
        <div className="mt-6">
          <MeetingMinutesTable
            meetingMinutes={meetingMinutes}
            onUpdateField={handleUpdateMeetingField}
            onDelete={handleDeleteMeeting}
            onAdd={handleAddMeeting}
            maxVisibleRows={5}
            themeColor="#00587a"
          />
        </div>

        {/* 하단 상태바 */}
        <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex justify-between text-xs text-gray-500">
          <span>총 {revisions.length}개의 개정 이력 | 회의록 {meetingMinutes.length}건</span>
          <span className="text-[10px] text-green-600 bg-green-100 px-2 py-0.5 rounded">🔗 DB 연동</span>
          <span>버전: CP Suite v2.1</span>
        </div>

        <BizInfoSelectModal
          isOpen={bizInfoModalOpen}
          onSelect={handleBizInfoSelect}
          onClose={() => setBizInfoModalOpen(false)}
        />
      </div>
    </FixedLayout>
  );
}

// =====================================================
// 메인 컴포넌트 (Suspense Wrapper)
// =====================================================
export default function CPRevisionManagementPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">CP 개정관리 로딩 중...</p>
        </div>
      </div>
    }>
      <CPRevisionManagementPageInner />
    </Suspense>
  );
}

