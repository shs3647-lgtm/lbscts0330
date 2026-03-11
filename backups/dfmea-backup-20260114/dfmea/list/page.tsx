/**
 * @file page.tsx
 * @description DFMEA 리스트 페이지 - 설계 FMEA 목록
 * @version 1.0.0
 * @created 2025-12-27
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import DFMEATopNav from '@/components/layout/DFMEATopNav';

// 타입 정의
interface DFMEAProject {
  id: string;
  project?: {
    projectName?: string;
    customer?: string;
    productName?: string;
    partNo?: string;
    department?: string;
    leader?: string;
    startDate?: string;
    endDate?: string;
  };
  fmeaInfo?: {
    subject?: string;
    fmeaStartDate?: string;
    fmeaRevisionDate?: string;
    modelYear?: string;
    designResponsibility?: string;
    fmeaResponsibleName?: string;
  };
  cftMembers?: unknown[];
  createdAt?: string;
  status?: string;
  step?: number;
  revisionNo?: string;
}

// FMEA ID 포맷
function formatFmeaId(id: string, index: number): string {
  if (id?.startsWith('DFM')) return id;
  const year = new Date().getFullYear().toString().slice(-2);
  const seq = (index + 1).toString().padStart(3, '0');
  return `DFM${year}-${seq}`;
}

// 단계 배지
function renderStepBadge(step?: number) {
  const s = step || 1;
  const colors: Record<number, string> = {
    1: 'bg-gray-200 text-gray-700',
    2: 'bg-blue-100 text-blue-700',
    3: 'bg-cyan-100 text-cyan-700',
    4: 'bg-yellow-100 text-yellow-700',
    5: 'bg-orange-100 text-orange-700',
    6: 'bg-green-100 text-green-700',
    7: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[s] || colors[1]}`}>
      {s}단계
    </span>
  );
}

const COLUMN_HEADERS = [
  'No',
  'FMEA ID',
  '프로젝트명',
  'FMEA명',
  '고객사',
  '모델명',
  '설계책임',
  '담당자',
  '시작일자',
  '개정일자',
  '개정번호',
  '단계',
];

export default function DFMEAListPage() {
  const [projects, setProjects] = useState<DFMEAProject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem('dfmea-projects');
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch (e) {
        console.error('프로젝트 로드 실패:', e);
      }
    }
  }, []);

  const filteredProjects = projects.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      p.project?.projectName?.toLowerCase().includes(term) ||
      p.fmeaInfo?.subject?.toLowerCase().includes(term) ||
      p.project?.customer?.toLowerCase().includes(term) ||
      p.id.toLowerCase().includes(term)
    );
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredProjects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProjects.map(p => p.id)));
    }
  };

  const handleDelete = useCallback(() => {
    if (selectedIds.size === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }
    if (!confirm(`선택한 ${selectedIds.size}개 항목을 삭제하시겠습니까?`)) return;
    
    const updated = projects.filter(p => !selectedIds.has(p.id));
    setProjects(updated);
    localStorage.setItem('dfmea-projects', JSON.stringify(updated));
    setSelectedIds(new Set());
  }, [projects, selectedIds]);

  return (
    <>
      <DFMEATopNav />
      <div className="min-h-screen bg-[#f0f0f0] p-3 font-[Malgun_Gothic] pt-11">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h1 className="text-sm font-bold text-gray-800">D-FMEA 리스트</h1>
          <span className="text-xs text-gray-500 ml-2">총 {projects.length}건</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-400 rounded focus:outline-none focus:border-blue-500"
          />
          <button onClick={handleDelete} className="px-3 py-1.5 bg-red-100 border border-red-400 text-red-700 text-xs rounded hover:bg-red-200">
            🗑️ 삭제
          </button>
          <a href="/dfmea/register" className="px-3 py-1.5 bg-[#1976d2] text-white text-xs rounded hover:bg-[#1565c0]">
            ➕ 신규등록
          </a>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded border border-gray-300">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="bg-[#00587a] text-white px-1 py-1.5 border border-white font-semibold text-center align-middle w-[30px]">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredProjects.length && filteredProjects.length > 0}
                  onChange={selectAll}
                  className="w-3.5 h-3.5"
                />
              </th>
              {COLUMN_HEADERS.map((h, i) => (
                <th key={i} className="bg-[#00587a] text-white px-2 py-1.5 border border-white font-semibold text-center align-middle">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((p, index) => (
              <tr key={p.id} className={`${index % 2 === 0 ? 'bg-[#e3f2fd]' : 'bg-white'} hover:bg-blue-100 h-7`}>
                <td className="border border-gray-400 px-1 py-0.5 text-center align-middle">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    className="w-3.5 h-3.5"
                  />
                </td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle font-bold text-[#00587a]">{index + 1}</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle font-semibold text-blue-600">
                  <a href={`/dfmea/worksheet?id=${p.id}`} className="hover:underline">
                    {formatFmeaId(p.id, index)}
                  </a>
                </td>
                <td className="border border-gray-400 px-2 py-1 text-left align-middle">{p.project?.projectName || '-'}</td>
                <td className="border border-gray-400 px-2 py-1 text-left align-middle">{p.fmeaInfo?.subject || p.project?.productName || '-'}</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">{p.project?.customer || '-'}</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">{p.fmeaInfo?.modelYear || '-'}</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">{p.fmeaInfo?.designResponsibility || p.project?.department || '-'}</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">{p.fmeaInfo?.fmeaResponsibleName || p.project?.leader || '-'}</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">{p.fmeaInfo?.fmeaStartDate || p.project?.startDate || '-'}</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">{p.fmeaInfo?.fmeaRevisionDate || '-'}</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">{p.revisionNo || 'Rev.00'}</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                  {renderStepBadge(p.step)}
                </td>
              </tr>
            ))}

            {/* 빈 행 */}
            {Array.from({ length: Math.max(0, 10 - filteredProjects.length) }).map((_, idx) => (
              <tr key={`empty-${idx}`} className={`${(filteredProjects.length + idx) % 2 === 0 ? 'bg-[#e3f2fd]' : 'bg-white'} h-7`}>
                <td className="border border-gray-400 px-1 py-0.5 text-center align-middle">
                  <input type="checkbox" disabled className="w-3.5 h-3.5 opacity-30" />
                </td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">{filteredProjects.length + idx + 1}</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
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

      {/* 하단 상태바 */}
      <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex justify-between text-xs text-gray-500">
        <span>검색 결과: {filteredProjects.length}건 | 선택: {selectedIds.size}건</span>
        <span>D-FMEA Suite v3.0</span>
      </div>
      </div>
    </>
  );
}













