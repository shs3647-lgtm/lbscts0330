/**
 * @file page.tsx
 * @description PFD 개정관리 페이지 - FMEA 개정관리와 완전 동일한 구조
 * @version 3.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import { BizInfoSelectModal } from '@/components/modals/BizInfoSelectModal';
import { MeetingMinutesTable } from '@/components/tables/MeetingMinutesTable';
import { BizInfoProject } from '@/types/bizinfo';
import { MeetingMinute } from '@/types/project-revision';
import PFDTopNav from '@/components/layout/PFDTopNav';

// =====================================================
// 타입 정의
// =====================================================
interface PFDProject {
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
// 초기 개정 이력 생성
// =====================================================
const createDefaultRevisions = (projectId: string): RevisionRecord[] => 
  Array.from({ length: 10 }, (_, index) => ({
    id: `REV-${projectId}-${index}`,
    projectId: projectId,
    revisionNumber: `Rev.${index.toString().padStart(2, '0')}`,
    revisionHistory: index === 0 ? '신규 프로젝트 등록' : '',
    createPosition: '',
    createName: '',
    createDate: index === 0 ? new Date().toISOString().split('T')[0] : '',
    createStatus: index === 0 ? '진행' : '',
    reviewPosition: '',
    reviewName: '',
    reviewDate: '',
    reviewStatus: '',
    approvePosition: '',
    approveName: '',
    approveDate: '',
    approveStatus: '',
  }));

// =====================================================
// 메인 컴포넌트
// =====================================================
export default function PFDRevisionManagementPage() {
  const [projectList, setProjectList] = useState<PFDProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [revisions, setRevisions] = useState<RevisionRecord[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [meetingMinutes, setMeetingMinutes] = useState<MeetingMinute[]>([]);
  const [bizInfoModalOpen, setBizInfoModalOpen] = useState(false);

  const [selectedInfo, setSelectedInfo] = useState({
    customer: '',
    factory: '',
    projectName: '',
    productName: '',
    partNo: '',
  });

  // 프로젝트 목록 로드
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pfd-projects');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setProjectList(parsed);
          if (parsed.length > 0 && !selectedProjectId) {
            setSelectedProjectId(parsed[0].id);
          }
        }
      }
    } catch (error) {
      console.error('❌ 프로젝트 목록 로드 실패:', error);
    }
  }, [selectedProjectId]);

  // 선택된 프로젝트의 개정 이력 로드
  useEffect(() => {
    if (!selectedProjectId) {
      setRevisions(createDefaultRevisions(''));
      return;
    }

    try {
      const allRevisions = JSON.parse(localStorage.getItem('pfd-revisions') || '[]');
      let projectRevisions = allRevisions.filter((r: RevisionRecord) => r.projectId === selectedProjectId);

      if (projectRevisions.length === 0) {
        projectRevisions = createDefaultRevisions(selectedProjectId);
        localStorage.setItem('pfd-revisions', JSON.stringify([...allRevisions, ...projectRevisions]));
      }

      while (projectRevisions.length < 5) {
        const nextNumber = projectRevisions.length.toString().padStart(2, '0');
        projectRevisions.push({
          id: `REV-${selectedProjectId}-${Date.now()}-${projectRevisions.length}`,
          projectId: selectedProjectId,
          revisionNumber: `Rev.${nextNumber}`,
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

      setRevisions(projectRevisions.sort((a: RevisionRecord, b: RevisionRecord) => 
        a.revisionNumber.localeCompare(b.revisionNumber)
      ));
    } catch (error) {
      console.error('❌ 개정 이력 로드 실패:', error);
      setRevisions(createDefaultRevisions(selectedProjectId));
    }
  }, [selectedProjectId]);

  // 기초정보 선택 처리
  const handleBizInfoSelect = (info: BizInfoProject) => {
    setSelectedInfo({
      customer: info.customerName,
      factory: info.factory,
      projectName: info.program || info.productName,
      productName: info.productName,
      partNo: info.partNo,
    });
    const matched = projectList.find(p => 
      p.project?.customer === info.customerName && 
      p.project?.productName === info.productName
    );
    if (matched) {
      setSelectedProjectId(matched.id);
    }
  };

  // 프로젝트 필터링
  const filteredProjects = projectList.filter(p => {
    if (!p || !p.id) return false;
    return (
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.project?.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.project?.customer?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const selectedProject = projectList.find(p => p.id === selectedProjectId);
  const projectLabel = selectedProject
    ? `${selectedProject.project?.projectName || selectedProject.id}`
    : '프로젝트를 선택하세요';

  // 필드 업데이트
  const updateField = (id: string, field: keyof RevisionRecord, value: string) => {
    const updated = revisions.map(r => (r.id === id ? { ...r, [field]: value } : r));
    setRevisions(updated);
  };

  // 저장
  const handleSave = () => {
    if (!selectedProjectId) {
      alert('프로젝트를 선택해주세요.');
      return;
    }

    try {
      const allRevisions = JSON.parse(localStorage.getItem('pfd-revisions') || '[]');
      const otherRevisions = allRevisions.filter((r: RevisionRecord) => r.projectId !== selectedProjectId);
      localStorage.setItem('pfd-revisions', JSON.stringify([...otherRevisions, ...revisions]));

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('❌ 저장 실패:', error);
      alert('저장에 실패했습니다.');
    }
  };

  // 개정 추가
  const handleAddRevision = () => {
    if (!selectedProjectId) {
      alert('프로젝트를 선택해주세요.');
      return;
    }

    const latestNumber = revisions.length > 0
      ? parseInt(revisions[revisions.length - 1].revisionNumber.replace('Rev.', ''))
      : -1;
    const nextNumber = (latestNumber + 1).toString().padStart(2, '0');

    const newRevision: RevisionRecord = {
      id: `REV-${selectedProjectId}-${Date.now()}`,
      projectId: selectedProjectId,
      revisionNumber: `Rev.${nextNumber}`,
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

    const allRevisions = JSON.parse(localStorage.getItem('pfd-revisions') || '[]');
    const otherRevisions = allRevisions.filter((r: RevisionRecord) => r.projectId !== selectedProjectId);
    localStorage.setItem('pfd-revisions', JSON.stringify([...otherRevisions, ...updated]));
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
  };

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

  // 회의록 로드
  useEffect(() => {
    if (!selectedProjectId) {
      setMeetingMinutes(createDefaultMeetings());
      return;
    }
    try {
      const saved = localStorage.getItem(`pfd-meetings-${selectedProjectId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length < 5) {
          const additional = Array.from({ length: 5 - parsed.length }, (_, i) => ({
            id: `MEETING-${Date.now()}-${i}`,
            no: parsed.length + i + 1,
            date: '',
            projectName: '',
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
  }, [selectedProjectId]);

  // 회의록 자동 저장
  useEffect(() => {
    if (!selectedProjectId || meetingMinutes.length === 0) return;
    localStorage.setItem(`pfd-meetings-${selectedProjectId}`, JSON.stringify(meetingMinutes));
  }, [meetingMinutes, selectedProjectId]);

  return (
    <>
      <PFDTopNav />
      
      <div className="min-h-screen bg-[#f0f0f0] px-3 py-3 pt-9 font-[Malgun_Gothic]">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📝</span>
          <h1 className="text-base font-bold text-gray-800">PFD 개정관리</h1>
        </div>

        {/* 프로젝트 정보 테이블 */}
        <div className="rounded-lg overflow-hidden border border-gray-400 mb-4">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#7c3aed] text-white">
                <th className="border border-white px-3 py-2 text-center font-semibold w-1/5">고객</th>
                <th className="border border-white px-3 py-2 text-center font-semibold w-1/5">공장</th>
                <th className="border border-white px-3 py-2 text-center font-semibold w-1/5">프로젝트</th>
                <th className="border border-white px-3 py-2 text-center font-semibold w-1/5">품명</th>
                <th className="border border-white px-3 py-2 text-center font-semibold w-1/5">품번</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
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
                    <button onClick={() => setBizInfoModalOpen(true)} className="p-1 text-violet-500 hover:text-violet-700">🔍</button>
                  </div>
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
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full h-8 px-2 text-xs text-center border-0 bg-transparent focus:outline-none"
                  >
                    <option value="">-- 선택 --</option>
                    {filteredProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project?.projectName || p.id}
                      </option>
                    ))}
                  </select>
                </td>
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
                    <button onClick={() => setBizInfoModalOpen(true)} className="p-1 text-violet-500 hover:text-violet-700">🔍</button>
                  </div>
                </td>
                <td className="border border-gray-400 px-1 py-1">
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={selectedInfo.partNo}
                      onChange={(e) => setSelectedInfo(prev => ({ ...prev, partNo: e.target.value }))}
                      placeholder="클릭 또는 입력"
                      className="flex-1 h-8 px-2 text-xs text-center border-0 bg-transparent focus:outline-none cursor-pointer"
                      onClick={() => setBizInfoModalOpen(true)}
                    />
                    <button onClick={() => setBizInfoModalOpen(true)} className="p-1 text-violet-500 hover:text-violet-700">🔍</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 개정 이력 테이블 */}
        <div className="rounded-lg overflow-hidden border border-gray-400 bg-white">
          <div className="flex items-center justify-between px-4 py-2 bg-[#7c3aed] text-white">
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
                    : 'bg-[#7c3aed] text-white hover:bg-[#6d28d9]'
                }`}
              >
                {saveStatus === 'saved' ? '✅ 저장됨' : '💾 저장'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs min-w-[1200px]">
              <thead>
                <tr className="bg-[#7c3aed] text-white">
                  <th className="border border-white px-2 py-2 text-center align-middle w-10" rowSpan={2}>
                    <input
                      type="checkbox"
                      checked={revisions.length > 0 && selectedRows.size === revisions.length}
                      onChange={toggleAllRows}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="border border-white px-3 py-2 text-center align-middle w-20" rowSpan={2}>개정번호</th>
                  <th className="border border-white px-3 py-2 text-center align-middle w-48" rowSpan={2}>개정이력</th>
                  <th className="border border-white px-3 py-2 text-center align-middle" colSpan={4}>작성</th>
                  <th className="border border-white px-3 py-2 text-center align-middle" colSpan={4}>검토</th>
                  <th className="border border-white px-3 py-2 text-center align-middle" colSpan={4}>승인</th>
                </tr>
                <tr className="bg-[#7c3aed] text-white">
                  <th className="border border-white px-2 py-1 text-center align-middle w-16">직급</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-20">성명</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-24">날짜</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-16">상태</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-16">직급</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-20">성명</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-24">날짜</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-16">상태</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-16">직급</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-20">성명</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-24">날짜</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-16">상태</th>
                </tr>
              </thead>
              <tbody>
                {revisions.map((revision, index) => (
                  <tr key={revision.id} className={`hover:bg-violet-50 ${index % 2 === 0 ? 'bg-white' : 'bg-[#ede9fe]'}`}>
                    <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(revision.id)}
                        onChange={() => toggleRow(revision.id)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="border border-gray-400 px-3 py-1 text-center align-middle font-bold text-violet-600">
                      {revision.revisionNumber}
                    </td>
                    <td className="border border-gray-400 px-1 py-1 text-left align-middle">
                      <input
                        type="text"
                        value={revision.revisionHistory}
                        onChange={(e) => updateField(revision.id, 'revisionHistory', e.target.value)}
                        placeholder="개정이력 입력"
                        className="w-full h-6 px-2 text-xs border-0 bg-transparent focus:outline-none focus:bg-violet-50"
                      />
                    </td>
                    {/* 작성 */}
                    <td className="border border-gray-400 px-1 py-1">
                      <input type="text" value={revision.createPosition} onChange={(e) => updateField(revision.id, 'createPosition', e.target.value)} placeholder="직급" className="w-full h-6 px-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-violet-50" />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <input type="text" value={revision.createName} onChange={(e) => updateField(revision.id, 'createName', e.target.value)} placeholder="성명" className="w-full h-6 px-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-violet-50" />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <input type="date" value={revision.createDate} onChange={(e) => updateField(revision.id, 'createDate', e.target.value)} className="w-full h-6 px-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-violet-50" />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <select value={revision.createStatus} onChange={(e) => updateField(revision.id, 'createStatus', e.target.value)} className={`w-full h-6 px-1 text-xs text-center border-0 rounded ${getStatusColor(revision.createStatus)}`}>
                        <option value="">선택</option>
                        <option value="진행">진행</option>
                        <option value="승인">승인</option>
                        <option value="반려">반려</option>
                      </select>
                    </td>
                    {/* 검토 */}
                    <td className="border border-gray-400 px-1 py-1">
                      <input type="text" value={revision.reviewPosition} onChange={(e) => updateField(revision.id, 'reviewPosition', e.target.value)} placeholder="직급" className="w-full h-6 px-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-violet-50" />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <input type="text" value={revision.reviewName} onChange={(e) => updateField(revision.id, 'reviewName', e.target.value)} placeholder="성명" className="w-full h-6 px-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-violet-50" />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <input type="date" value={revision.reviewDate} onChange={(e) => updateField(revision.id, 'reviewDate', e.target.value)} className="w-full h-6 px-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-violet-50" />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <select value={revision.reviewStatus} onChange={(e) => updateField(revision.id, 'reviewStatus', e.target.value)} className={`w-full h-6 px-1 text-xs text-center border-0 rounded ${getStatusColor(revision.reviewStatus)}`}>
                        <option value="">선택</option>
                        <option value="진행">진행</option>
                        <option value="승인">승인</option>
                        <option value="반려">반려</option>
                      </select>
                    </td>
                    {/* 승인 */}
                    <td className="border border-gray-400 px-1 py-1">
                      <input type="text" value={revision.approvePosition} onChange={(e) => updateField(revision.id, 'approvePosition', e.target.value)} placeholder="직급" className="w-full h-6 px-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-violet-50" />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <input type="text" value={revision.approveName} onChange={(e) => updateField(revision.id, 'approveName', e.target.value)} placeholder="성명" className="w-full h-6 px-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-violet-50" />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <input type="date" value={revision.approveDate} onChange={(e) => updateField(revision.id, 'approveDate', e.target.value)} className="w-full h-6 px-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-violet-50" />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <select value={revision.approveStatus} onChange={(e) => updateField(revision.id, 'approveStatus', e.target.value)} className={`w-full h-6 px-1 text-xs text-center border-0 rounded ${getStatusColor(revision.approveStatus)}`}>
                        <option value="">선택</option>
                        <option value="진행">진행</option>
                        <option value="승인">승인</option>
                        <option value="반려">반려</option>
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

        {/* 회의록 관리 섹션 */}
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
          <span>버전: PFD Suite v3.0 | 사용자: PFD Lead</span>
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
