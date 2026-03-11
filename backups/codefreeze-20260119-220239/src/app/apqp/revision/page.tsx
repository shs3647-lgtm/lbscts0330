/**
 * @file page.tsx
 * @description APQP 개정관리 페이지 - FMEA 개정관리와 동일한 구조
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import APQPTopNav from '@/components/layout/APQPTopNav';
import { BizInfoSelectModal } from '@/components/modals/BizInfoSelectModal';
import { MeetingMinutesTable } from '@/components/tables/MeetingMinutesTable';
import { MeetingMinute } from '@/types/project-revision';
import { APQPProject } from '@/types/apqp-project';
import { APQPStorage } from '@/utils/apqp-storage';
import { BizInfoProject } from '@/types/bizinfo';

// 빈 회의록 생성 함수
function createEmptyMeetingMinute(no: number): MeetingMinute {
  return {
    id: `meeting-${Date.now()}-${no}`,
    no,
    date: '',
    projectName: '',
    content: '',
    author: '',
    authorPosition: '',
    attachment: undefined,
  };
}

// 초기 회의록 목록 생성
function createInitialMeetingMinutes(count: number): MeetingMinute[] {
  return Array.from({ length: count }, (_, i) => createEmptyMeetingMinute(i + 1));
}

interface RevisionRecord {
  id: string;
  revisionNo: number;
  revisionDate: string;
  authorName: string;
  authorStatus: 'completed' | 'pending' | 'none';
  reviewerName: string;
  reviewerStatus: 'completed' | 'pending' | 'none';
  approverName: string;
  approverStatus: 'completed' | 'pending' | 'none';
  description: string;
}

const STORAGE_KEY = 'apqp-revisions';

export default function APQPRevisionPage() {
  const [projects, setProjects] = useState<APQPProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<APQPProject | null>(null);
  const [revisions, setRevisions] = useState<RevisionRecord[]>([]);
  const [meetingMinutes, setMeetingMinutes] = useState<MeetingMinute[]>(createInitialMeetingMinutes(5));
  
  const [bizInfoModalOpen, setBizInfoModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [meetingSaveStatus, setMeetingSaveStatus] = useState<'idle' | 'saved'>('idle');

  const loadProjects = useCallback(() => {
    const allProjects = APQPStorage.getAllProjects();
    const sorted = allProjects.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    setProjects(sorted);
    
    if (sorted.length > 0 && !selectedProjectId) {
      setSelectedProjectId(sorted[0].id);
    }
  }, [selectedProjectId]);

  const loadRevisions = useCallback((projectId: string) => {
    const saved = localStorage.getItem(`${STORAGE_KEY}-${projectId}`);
    if (saved) {
      setRevisions(JSON.parse(saved));
    } else {
      setRevisions([createEmptyRevision(1)]);
    }
    
    const savedMeeting = localStorage.getItem(`apqp-meeting-${projectId}`);
    if (savedMeeting) {
      setMeetingMinutes(JSON.parse(savedMeeting));
    } else {
      setMeetingMinutes(createInitialMeetingMinutes(5));
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      const project = APQPStorage.getProjectDetail(selectedProjectId);
      setSelectedProject(project);
      loadRevisions(selectedProjectId);
    }
  }, [selectedProjectId, loadRevisions]);

  const createEmptyRevision = (revNo: number): RevisionRecord => ({
    id: `rev-${Date.now()}-${revNo}`,
    revisionNo: revNo,
    revisionDate: new Date().toISOString().split('T')[0],
    authorName: '',
    authorStatus: 'none',
    reviewerName: '',
    reviewerStatus: 'none',
    approverName: '',
    approverStatus: 'none',
    description: '',
  });

  const handleProjectSelect = (info: BizInfoProject) => {
    const found = projects.find(p => p.projectName === info.productName || p.customer === info.customerName);
    if (found) {
      setSelectedProjectId(found.id);
    }
    setBizInfoModalOpen(false);
  };

  const handleSave = () => {
    if (!selectedProjectId) return;
    localStorage.setItem(`${STORAGE_KEY}-${selectedProjectId}`, JSON.stringify(revisions));
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleMeetingSave = () => {
    if (!selectedProjectId) return;
    localStorage.setItem(`apqp-meeting-${selectedProjectId}`, JSON.stringify(meetingMinutes));
    setMeetingSaveStatus('saved');
    setTimeout(() => setMeetingSaveStatus('idle'), 2000);
  };

  const handleMeetingReset = () => {
    if (confirm('회의록을 초기화하시겠습니까?')) {
      setMeetingMinutes(createInitialMeetingMinutes(5));
    }
  };

  const addRevision = () => {
    const nextNo = revisions.length > 0 ? Math.max(...revisions.map(r => r.revisionNo)) + 1 : 1;
    setRevisions([...revisions, createEmptyRevision(nextNo)]);
  };

  const deleteRevision = (id: string) => {
    if (revisions.length === 1) { alert('최소 1개의 개정 이력이 필요합니다.'); return; }
    if (!confirm('삭제하시겠습니까?')) return;
    setRevisions(revisions.filter(r => r.id !== id));
  };

  const updateRevision = (id: string, field: keyof RevisionRecord, value: any) => {
    setRevisions(revisions.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const renderStatusBadge = (status: 'completed' | 'pending' | 'none', name: string) => {
    if (!name) return <span className="text-gray-400 text-[10px]">미지정</span>;
    if (status === 'completed') return <span className="px-1.5 py-0.5 bg-green-200 text-green-700 rounded text-[10px] font-bold">✓ 완료</span>;
    if (status === 'pending') return <span className="px-1.5 py-0.5 bg-yellow-200 text-yellow-700 rounded text-[10px] font-bold">⏳ 대기</span>;
    return <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px]">미진행</span>;
  };

  const headerCell = "bg-[#2563eb] text-white px-2 py-1.5 border border-white font-semibold text-xs text-center align-middle";
  const inputCell = "border border-gray-300 px-1 py-0.5";

  // 표시 행 (최소 5개)
  const displayRevisions = [...revisions];
  while (displayRevisions.length < 5) {
    displayRevisions.push({ ...createEmptyRevision(0), id: `empty-${displayRevisions.length}`, revisionNo: 0 });
  }

  return (
    <>
      <APQPTopNav rowCount={projects.length} />
      
      <div className="min-h-screen bg-[#f0f0f0] px-3 py-3 pt-9 font-[Malgun_Gothic]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📜</span>
            <h1 className="text-base font-bold text-gray-800">APQP 개정관리</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className={`px-4 py-1.5 text-xs font-bold rounded ${saveStatus === 'saved' ? 'bg-green-500 text-white' : 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]'}`}>
              {saveStatus === 'saved' ? '✓ 저장됨' : '💾 저장'}
            </button>
          </div>
        </div>

        {/* 프로젝트 선택 */}
        <div className="bg-white rounded border border-gray-300 mb-4 overflow-hidden">
          <table className="w-full border-collapse text-xs">
            <tbody>
              <tr className="h-8">
                <td className={`${headerCell} w-24`}>프로젝트</td>
                <td className={`${inputCell}`}>
                  <div className="flex items-center gap-2 px-2">
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="flex-1 h-7 px-2 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    >
                      <option value="">프로젝트 선택...</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.projectName} ({p.customer || '-'})</option>
                      ))}
                    </select>
                    <button onClick={() => setBizInfoModalOpen(true)} className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs">🔍 검색</button>
                  </div>
                </td>
                <td className={`${headerCell} w-20`}>고객</td>
                <td className={`${inputCell} w-32 text-center`}>{selectedProject?.customer || '-'}</td>
                <td className={`${headerCell} w-20`}>품명</td>
                <td className={`${inputCell} w-40 text-center`}>{selectedProject?.productName || '-'}</td>
                <td className={`${headerCell} w-20`}>상태</td>
                <td className={`${inputCell} w-24 text-center`}>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedProject?.status === 'Active' ? 'bg-green-200 text-green-700' : selectedProject?.status === 'Completed' ? 'bg-blue-200 text-blue-700' : 'bg-amber-200 text-amber-700'}`}>{selectedProject?.status || '-'}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 개정 이력 */}
        <div className="bg-white rounded border border-gray-300 mb-4 overflow-hidden">
          <div className="bg-[#dbeafe] px-3 py-2 border-b border-gray-300 flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-700">📋 개정 이력</h2>
            <button onClick={addRevision} className="px-3 py-1 bg-green-500 text-white rounded text-xs font-bold hover:bg-green-600">➕ 추가</button>
          </div>
          
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#2563eb] text-white" style={{ height: '28px' }}>
                <th className="border border-white px-2 py-1 w-12">No</th>
                <th className="border border-white px-2 py-1 w-24">개정일</th>
                <th className="border border-white px-2 py-1" colSpan={2}>작성</th>
                <th className="border border-white px-2 py-1" colSpan={2}>검토</th>
                <th className="border border-white px-2 py-1" colSpan={2}>승인</th>
                <th className="border border-white px-2 py-1">설명</th>
                <th className="border border-white px-2 py-1 w-16">작업</th>
              </tr>
            </thead>
            <tbody>
              {displayRevisions.map((rev, idx) => {
                const isReal = rev.revisionNo > 0;
                return (
                  <tr key={rev.id} className={`${idx % 2 === 0 ? 'bg-[#dbeafe]' : 'bg-white'}`} style={{ height: '28px' }}>
                    <td className="border border-gray-300 px-2 py-0.5 text-center font-bold text-blue-600">{isReal ? rev.revisionNo : ''}</td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      {isReal ? <input type="date" value={rev.revisionDate} onChange={(e) => updateRevision(rev.id, 'revisionDate', e.target.value)} className="w-full h-6 px-1 text-xs border-0 bg-transparent focus:outline-none" /> : ''}
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      {isReal ? <input type="text" value={rev.authorName} onChange={(e) => updateRevision(rev.id, 'authorName', e.target.value)} placeholder="작성자" className="w-full h-6 px-1 text-xs border-0 bg-transparent focus:outline-none" /> : ''}
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5 text-center">
                      {isReal && (
                        <select value={rev.authorStatus} onChange={(e) => updateRevision(rev.id, 'authorStatus', e.target.value)} className="h-6 px-1 text-[10px] border-0 bg-transparent">
                          <option value="none">-</option>
                          <option value="pending">대기</option>
                          <option value="completed">완료</option>
                        </select>
                      )}
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      {isReal ? <input type="text" value={rev.reviewerName} onChange={(e) => updateRevision(rev.id, 'reviewerName', e.target.value)} placeholder="검토자" className="w-full h-6 px-1 text-xs border-0 bg-transparent focus:outline-none" /> : ''}
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5 text-center">
                      {isReal && (
                        <select value={rev.reviewerStatus} onChange={(e) => updateRevision(rev.id, 'reviewerStatus', e.target.value)} className="h-6 px-1 text-[10px] border-0 bg-transparent">
                          <option value="none">-</option>
                          <option value="pending">대기</option>
                          <option value="completed">완료</option>
                        </select>
                      )}
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      {isReal ? <input type="text" value={rev.approverName} onChange={(e) => updateRevision(rev.id, 'approverName', e.target.value)} placeholder="승인자" className="w-full h-6 px-1 text-xs border-0 bg-transparent focus:outline-none" /> : ''}
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5 text-center">
                      {isReal && (
                        <select value={rev.approverStatus} onChange={(e) => updateRevision(rev.id, 'approverStatus', e.target.value)} className="h-6 px-1 text-[10px] border-0 bg-transparent">
                          <option value="none">-</option>
                          <option value="pending">대기</option>
                          <option value="completed">완료</option>
                        </select>
                      )}
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      {isReal ? <input type="text" value={rev.description} onChange={(e) => updateRevision(rev.id, 'description', e.target.value)} placeholder="개정 내용" className="w-full h-6 px-1 text-xs border-0 bg-transparent focus:outline-none" /> : ''}
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5 text-center">
                      {isReal && (
                        <button onClick={() => deleteRevision(rev.id)} className="px-2 py-0.5 bg-red-500 text-white rounded text-[10px] hover:bg-red-600">❌</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 회의록 */}
        <div className="bg-white rounded border border-gray-300 overflow-hidden">
          <div className="bg-[#dbeafe] px-3 py-2 border-b border-gray-300 flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-700">📝 APQP 회의록</h2>
            <div className="flex gap-2">
              <button onClick={handleMeetingReset} className="px-3 py-1 bg-gray-100 border border-gray-400 text-gray-600 rounded text-xs hover:bg-gray-200">🔄 초기화</button>
              <button onClick={handleMeetingSave} className={`px-3 py-1 text-xs font-bold rounded ${meetingSaveStatus === 'saved' ? 'bg-green-500 text-white' : 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]'}`}>
                {meetingSaveStatus === 'saved' ? '✓ 저장됨' : '💾 저장'}
              </button>
            </div>
          </div>
          <div className="p-3">
            <MeetingMinutesTable
              meetingMinutes={meetingMinutes}
              onUpdateField={(id, field, value) => {
                setMeetingMinutes(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
              }}
              onDelete={(id) => {
                if (meetingMinutes.length <= 1) { alert('최소 1개의 회의록이 필요합니다.'); return; }
                setMeetingMinutes(prev => prev.filter(m => m.id !== id));
              }}
              onAdd={() => {
                const nextNo = meetingMinutes.length > 0 ? Math.max(...meetingMinutes.map(m => m.no)) + 1 : 1;
                setMeetingMinutes(prev => [...prev, createEmptyMeetingMinute(nextNo)]);
              }}
              maxVisibleRows={5}
            />
          </div>
        </div>

        <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex justify-between text-xs text-gray-500">
          <span>개정 이력 {revisions.length}건 | 회의록 {meetingMinutes.filter(m => m.date).length}건</span>
          <span>버전: APQP Suite v3.0 | 사용자: APQP Lead</span>
        </div>

        <BizInfoSelectModal isOpen={bizInfoModalOpen} onClose={() => setBizInfoModalOpen(false)} onSelect={handleProjectSelect} />
      </div>
    </>
  );
}

