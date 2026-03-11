/**
 * @file page.tsx
 * @description DFMEA 개정관리 페이지 - 설계 FMEA
 * @version 1.0.0
 * @created 2025-12-27
 */

'use client';

import { useState, useEffect } from 'react';
import { headerCellStyle, inputCellStyle } from './RevisionPageStyles';
import DFMEATopNav from '@/components/layout/DFMEATopNav';

// 타입 정의
interface RevisionRecord {
  id: number;
  projectId: string;
  projectName: string;
  revisionNo: string;
  revisionDate: string;
  revisionReason: string;
  revisionContent: string;
  reviser: string;
  approver: string;
  status: 'draft' | 'review' | 'approved' | 'rejected';
}

interface MeetingMinute {
  id: number;
  projectId: string;
  meetingDate: string;
  meetingTitle: string;
  participants: string;
  agenda: string;
  decisions: string;
  actionItems: string;
  nextMeetingDate: string;
  recorder: string;
}

// 초기 데이터
const INITIAL_REVISIONS: RevisionRecord[] = [];
const INITIAL_MEETINGS: MeetingMinute[] = [];

// 상태 배지
function renderStatusBadge(status: string) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-200 text-gray-700',
    review: 'bg-yellow-200 text-yellow-700',
    approved: 'bg-green-200 text-green-700',
    rejected: 'bg-red-200 text-red-700',
  };
  const labels: Record<string, string> = {
    draft: '작성중',
    review: '검토중',
    approved: '승인',
    rejected: '반려',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${styles[status] || styles.draft}`}>
      {labels[status] || '작성중'}
    </span>
  );
}

export default function DFMEARevisionPage() {
  const [revisions, setRevisions] = useState<RevisionRecord[]>(INITIAL_REVISIONS);
  const [meetings, setMeetings] = useState<MeetingMinute[]>(INITIAL_MEETINGS);
  const [selectedProject, setSelectedProject] = useState('');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  // 프로젝트 목록 로드
  useEffect(() => {
    const saved = localStorage.getItem('dfmea-projects');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProjects(parsed.map((p: { id: string; fmeaInfo?: { subject?: string }; project?: { projectName?: string } }) => ({
          id: p.id,
          name: p.fmeaInfo?.subject || p.project?.projectName || p.id
        })));
      } catch (e) {
        console.error('프로젝트 로드 실패:', e);
      }
    }

    // 개정 이력 로드
    const savedRevisions = localStorage.getItem('dfmea-revisions');
    if (savedRevisions) {
      try {
        setRevisions(JSON.parse(savedRevisions));
      } catch (e) {
        console.error('개정이력 로드 실패:', e);
      }
    }

    // 회의록 로드
    const savedMeetings = localStorage.getItem('dfmea-meetings');
    if (savedMeetings) {
      try {
        setMeetings(JSON.parse(savedMeetings));
      } catch (e) {
        console.error('회의록 로드 실패:', e);
      }
    }
  }, []);

  // 개정 이력 추가
  const addRevision = () => {
    const newId = revisions.length > 0 ? Math.max(...revisions.map(r => r.id)) + 1 : 1;
    const newRevision: RevisionRecord = {
      id: newId,
      projectId: selectedProject,
      projectName: projects.find(p => p.id === selectedProject)?.name || '',
      revisionNo: `Rev.${String(revisions.filter(r => r.projectId === selectedProject).length + 1).padStart(2, '0')}`,
      revisionDate: new Date().toISOString().split('T')[0],
      revisionReason: '',
      revisionContent: '',
      reviser: '',
      approver: '',
      status: 'draft',
    };
    setRevisions([...revisions, newRevision]);
  };

  // 회의록 추가
  const addMeeting = () => {
    const newId = meetings.length > 0 ? Math.max(...meetings.map(m => m.id)) + 1 : 1;
    const newMeeting: MeetingMinute = {
      id: newId,
      projectId: selectedProject,
      meetingDate: new Date().toISOString().split('T')[0],
      meetingTitle: '',
      participants: '',
      agenda: '',
      decisions: '',
      actionItems: '',
      nextMeetingDate: '',
      recorder: '',
    };
    setMeetings([...meetings, newMeeting]);
  };

  // 개정 이력 삭제
  const deleteRevision = () => {
    if (revisions.length === 0) return;
    if (!confirm('마지막 개정 이력을 삭제하시겠습니까?')) return;
    setRevisions(revisions.slice(0, -1));
  };

  // 회의록 삭제
  const deleteMeeting = () => {
    if (meetings.length === 0) return;
    if (!confirm('마지막 회의록을 삭제하시겠습니까?')) return;
    setMeetings(meetings.slice(0, -1));
  };

  // 저장
  const saveRevisions = () => {
    localStorage.setItem('dfmea-revisions', JSON.stringify(revisions));
    alert('개정이력이 저장되었습니다.');
  };

  const saveMeetings = () => {
    localStorage.setItem('dfmea-meetings', JSON.stringify(meetings));
    alert('회의록이 저장되었습니다.');
  };

  // 필터링
  const filteredRevisions = selectedProject 
    ? revisions.filter(r => r.projectId === selectedProject)
    : revisions;
  
  const filteredMeetings = selectedProject
    ? meetings.filter(m => m.projectId === selectedProject)
    : meetings;

  // 테이블 셀 스타일
  const headerCell = "bg-[#00587a] text-white px-2 py-1.5 border border-white font-semibold text-xs text-center align-middle";
  const inputCell = "border border-gray-300 px-1 py-0.5";

  // 빈 행 생성 (5행)
  const emptyRevisionRows = Math.max(0, 5 - filteredRevisions.length);
  const emptyMeetingRows = Math.max(0, 5 - filteredMeetings.length);

  return (
    <>
      <DFMEATopNav />
      <div className="min-h-screen bg-[#f0f0f0] p-3 font-[Malgun_Gothic] pt-11">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <h1 className="text-sm font-bold text-gray-800">D-FMEA 개정관리</h1>
        </div>
      </div>

      {/* 프로젝트 선택 영역 */}
      <div className="bg-white rounded border border-gray-300 mb-3">
        <table className="w-full border-collapse text-xs">
          <tbody>
            <tr className="h-8">
              <td className={headerCell} style={headerCellStyle('8%')}>고객사</td>
              <td className={`${inputCell} w-[12%]`}>
                <input type="text" className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" readOnly />
              </td>
              <td className={headerCell} style={headerCellStyle('8%')}>공장</td>
              <td className={`${inputCell} w-[12%]`}>
                <input type="text" className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" readOnly />
              </td>
              <td className={headerCell} style={headerCellStyle('8%')}>프로젝트</td>
              <td className={`${inputCell} w-[17%]`}>
                <select 
                  value={selectedProject} 
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                >
                  <option value="">전체</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </td>
              <td className={headerCell} style={headerCellStyle('8%')}>품명</td>
              <td className={`${inputCell} w-[12%]`}>
                <input type="text" className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" readOnly />
              </td>
              <td className={headerCell} style={headerCellStyle('8%')}>품번</td>
              <td className={`${inputCell} w-[12%]`}>
                <input type="text" className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" readOnly />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== 개정 이력 ===== */}
      <div className="bg-white rounded border border-gray-300 mb-3">
        <div className="bg-[#e3f2fd] px-3 py-1.5 border-b border-gray-300 flex justify-between items-center">
          <h2 className="text-xs font-bold text-gray-700">📋 개정 이력</h2>
          <div className="flex gap-1">
            <button onClick={addRevision} className="px-2 py-1 bg-blue-500 text-white text-[10px] rounded hover:bg-blue-600">추가</button>
            <button onClick={deleteRevision} className="px-2 py-1 bg-red-100 text-red-600 text-[10px] rounded hover:bg-red-200">삭제</button>
            <button onClick={saveRevisions} className="px-2 py-1 bg-green-500 text-white text-[10px] rounded hover:bg-green-600">저장</button>
          </div>
        </div>
        
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className={`${headerCell} w-[5%]`}>No</th>
              <th className={`${headerCell} w-[15%]`}>프로젝트</th>
              <th className={`${headerCell} w-[8%]`}>개정번호</th>
              <th className={`${headerCell} w-[10%]`}>개정일자</th>
              <th className={`${headerCell} w-[15%]`}>개정사유</th>
              <th className={`${headerCell} w-[20%]`}>개정내용</th>
              <th className={`${headerCell} w-[8%]`}>작성자</th>
              <th className={`${headerCell} w-[8%]`}>승인자</th>
              <th className={`${headerCell} w-[8%]`}>상태</th>
            </tr>
          </thead>
          <tbody>
            {filteredRevisions.map((rev, idx) => (
              <tr key={rev.id} className={`h-7 ${idx % 2 === 0 ? 'bg-[#e3f2fd]' : 'bg-white'}`}>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle font-bold text-[#00587a]">{idx + 1}</td>
                <td className="border border-gray-400 px-2 py-1 text-left align-middle">{rev.projectName}</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle font-semibold">{rev.revisionNo}</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">{rev.revisionDate}</td>
                <td className="border border-gray-400 px-1 py-0.5">
                  <input 
                    type="text" 
                    value={rev.revisionReason}
                    onChange={(e) => {
                      const updated = [...revisions];
                      const i = updated.findIndex(r => r.id === rev.id);
                      if (i >= 0) updated[i].revisionReason = e.target.value;
                      setRevisions(updated);
                    }}
                    className="w-full h-6 px-1 text-xs border-0 bg-transparent focus:outline-none"
                  />
                </td>
                <td className="border border-gray-400 px-1 py-0.5">
                  <input 
                    type="text" 
                    value={rev.revisionContent}
                    onChange={(e) => {
                      const updated = [...revisions];
                      const i = updated.findIndex(r => r.id === rev.id);
                      if (i >= 0) updated[i].revisionContent = e.target.value;
                      setRevisions(updated);
                    }}
                    className="w-full h-6 px-1 text-xs border-0 bg-transparent focus:outline-none"
                  />
                </td>
                <td className="border border-gray-400 px-1 py-0.5">
                  <input 
                    type="text" 
                    value={rev.reviser}
                    onChange={(e) => {
                      const updated = [...revisions];
                      const i = updated.findIndex(r => r.id === rev.id);
                      if (i >= 0) updated[i].reviser = e.target.value;
                      setRevisions(updated);
                    }}
                    className="w-full h-6 px-1 text-xs border-0 bg-transparent focus:outline-none"
                  />
                </td>
                <td className="border border-gray-400 px-1 py-0.5">
                  <input 
                    type="text" 
                    value={rev.approver}
                    onChange={(e) => {
                      const updated = [...revisions];
                      const i = updated.findIndex(r => r.id === rev.id);
                      if (i >= 0) updated[i].approver = e.target.value;
                      setRevisions(updated);
                    }}
                    className="w-full h-6 px-1 text-xs border-0 bg-transparent focus:outline-none"
                  />
                </td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                  {renderStatusBadge(rev.status)}
                </td>
              </tr>
            ))}

            {/* 빈 행 */}
            {Array.from({ length: emptyRevisionRows }).map((_, idx) => (
              <tr key={`empty-rev-${idx}`} className={`h-7 ${(filteredRevisions.length + idx) % 2 === 0 ? 'bg-[#e3f2fd]' : 'bg-white'}`}>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">{filteredRevisions.length + idx + 1}</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== 회의록 ===== */}
      <div className="bg-white rounded border border-gray-300">
        <div className="bg-[#e3f2fd] px-3 py-1.5 border-b border-gray-300 flex justify-between items-center">
          <h2 className="text-xs font-bold text-gray-700">📝 회의록</h2>
          <div className="flex gap-1">
            <button onClick={addMeeting} className="px-2 py-1 bg-blue-500 text-white text-[10px] rounded hover:bg-blue-600">추가</button>
            <button onClick={deleteMeeting} className="px-2 py-1 bg-red-100 text-red-600 text-[10px] rounded hover:bg-red-200">삭제</button>
            <button onClick={saveMeetings} className="px-2 py-1 bg-green-500 text-white text-[10px] rounded hover:bg-green-600">저장</button>
          </div>
        </div>
        
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className={`${headerCell} w-[5%]`}>No</th>
              <th className={`${headerCell} w-[10%]`}>회의일자</th>
              <th className={`${headerCell} w-[15%]`}>회의제목</th>
              <th className={`${headerCell} w-[15%]`}>참석자</th>
              <th className={`${headerCell} w-[15%]`}>안건</th>
              <th className={`${headerCell} w-[15%]`}>결정사항</th>
              <th className={`${headerCell} w-[12%]`}>실행항목</th>
              <th className={`${headerCell} w-[8%]`}>기록자</th>
            </tr>
          </thead>
          <tbody>
            {filteredMeetings.map((mtg, idx) => (
              <tr key={mtg.id} className={`h-7 ${idx % 2 === 0 ? 'bg-[#e3f2fd]' : 'bg-white'}`}>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle font-bold text-[#00587a]">{idx + 1}</td>
                <td className="border border-gray-400 px-1 py-0.5">
                  <input 
                    type="date" 
                    value={mtg.meetingDate}
                    onChange={(e) => {
                      const updated = [...meetings];
                      const i = updated.findIndex(m => m.id === mtg.id);
                      if (i >= 0) updated[i].meetingDate = e.target.value;
                      setMeetings(updated);
                    }}
                    className="w-full h-6 px-1 text-xs border-0 bg-transparent focus:outline-none"
                  />
                </td>
                <td className="border border-gray-400 px-1 py-0.5">
                  <input 
                    type="text" 
                    value={mtg.meetingTitle}
                    onChange={(e) => {
                      const updated = [...meetings];
                      const i = updated.findIndex(m => m.id === mtg.id);
                      if (i >= 0) updated[i].meetingTitle = e.target.value;
                      setMeetings(updated);
                    }}
                    className="w-full h-6 px-1 text-xs border-0 bg-transparent focus:outline-none"
                  />
                </td>
                <td className="border border-gray-400 px-1 py-0.5">
                  <input 
                    type="text" 
                    value={mtg.participants}
                    onChange={(e) => {
                      const updated = [...meetings];
                      const i = updated.findIndex(m => m.id === mtg.id);
                      if (i >= 0) updated[i].participants = e.target.value;
                      setMeetings(updated);
                    }}
                    className="w-full h-6 px-1 text-xs border-0 bg-transparent focus:outline-none"
                  />
                </td>
                <td className="border border-gray-400 px-1 py-0.5">
                  <input 
                    type="text" 
                    value={mtg.agenda}
                    onChange={(e) => {
                      const updated = [...meetings];
                      const i = updated.findIndex(m => m.id === mtg.id);
                      if (i >= 0) updated[i].agenda = e.target.value;
                      setMeetings(updated);
                    }}
                    className="w-full h-6 px-1 text-xs border-0 bg-transparent focus:outline-none"
                  />
                </td>
                <td className="border border-gray-400 px-1 py-0.5">
                  <input 
                    type="text" 
                    value={mtg.decisions}
                    onChange={(e) => {
                      const updated = [...meetings];
                      const i = updated.findIndex(m => m.id === mtg.id);
                      if (i >= 0) updated[i].decisions = e.target.value;
                      setMeetings(updated);
                    }}
                    className="w-full h-6 px-1 text-xs border-0 bg-transparent focus:outline-none"
                  />
                </td>
                <td className="border border-gray-400 px-1 py-0.5">
                  <input 
                    type="text" 
                    value={mtg.actionItems}
                    onChange={(e) => {
                      const updated = [...meetings];
                      const i = updated.findIndex(m => m.id === mtg.id);
                      if (i >= 0) updated[i].actionItems = e.target.value;
                      setMeetings(updated);
                    }}
                    className="w-full h-6 px-1 text-xs border-0 bg-transparent focus:outline-none"
                  />
                </td>
                <td className="border border-gray-400 px-1 py-0.5">
                  <input 
                    type="text" 
                    value={mtg.recorder}
                    onChange={(e) => {
                      const updated = [...meetings];
                      const i = updated.findIndex(m => m.id === mtg.id);
                      if (i >= 0) updated[i].recorder = e.target.value;
                      setMeetings(updated);
                    }}
                    className="w-full h-6 px-1 text-xs border-0 bg-transparent focus:outline-none"
                  />
                </td>
              </tr>
            ))}

            {/* 빈 행 */}
            {Array.from({ length: emptyMeetingRows }).map((_, idx) => (
              <tr key={`empty-mtg-${idx}`} className={`h-7 ${(filteredMeetings.length + idx) % 2 === 0 ? 'bg-[#e3f2fd]' : 'bg-white'}`}>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">{filteredMeetings.length + idx + 1}</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 하단 상태바 */}
      <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex justify-between text-xs text-gray-500">
        <span>개정 이력: {filteredRevisions.length}건 | 회의록: {filteredMeetings.length}건</span>
        <span>D-FMEA Suite v3.0</span>
      </div>
      </div>
    </>
  );
}













