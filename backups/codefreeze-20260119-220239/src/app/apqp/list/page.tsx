/**
 * @file page.tsx
 * @description APQP 리스트 페이지 - DB API 연동 + 리얼타임 업데이트
 * @version 2.0.0
 * @updated 2026-01-13 DB API 연동
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import APQPTopNav from '@/components/layout/APQPTopNav';

// DB에서 가져오는 APQP 프로젝트 타입
interface APQPProjectDB {
  id: string;
  apqpNo: string;
  companyName?: string;
  customerName?: string;
  subject?: string;
  productName?: string;
  modelYear?: string;
  status?: string;
  apqpStartDate?: string;
  apqpRevisionDate?: string;
  apqpResponsibleName?: string;
  leader?: string;
  createdAt: string;
  updatedAt: string;
}

const COLUMN_HEADERS = [
  'No',
  'APQP ID',
  '프로젝트명',
  '고객사',
  '품명',
  '회사명',
  '시작일자',
  '개정일자',
  '상태',
  '책임자',
  '작성일',
];

function renderStatusBadge(status: string): React.ReactNode {
  const colors: Record<string, { bg: string; text: string }> = {
    'planning': { bg: 'bg-blue-200', text: 'text-blue-700' },
    'development': { bg: 'bg-amber-200', text: 'text-amber-700' },
    'validation': { bg: 'bg-purple-200', text: 'text-purple-700' },
    'production': { bg: 'bg-green-200', text: 'text-green-700' },
    'closed': { bg: 'bg-gray-200', text: 'text-gray-700' },
  };
  const statusLabels: Record<string, string> = {
    'planning': '계획중',
    'development': '개발중',
    'validation': '검증중',
    'production': '양산',
    'closed': '완료',
  };
  const { bg, text } = colors[status] || { bg: 'bg-gray-200', text: 'text-gray-700' };
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${bg} ${text}`}>{statusLabels[status] || status}</span>;
}

export default function APQPListPage() {
  const [projects, setProjects] = useState<APQPProjectDB[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // ★ DB API에서 APQP 목록 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/apqp');
      const result = await response.json();
      
      if (result.success && result.apqps) {
        console.log('✅ APQP 목록 로드:', result.apqps.length, '개');
        setProjects(result.apqps);
      } else {
        console.warn('APQP 목록 로드 실패:', result.error);
        setProjects([]);
      }
    } catch (error) {
      console.error('APQP API 호출 실패:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ★ 초기 로드 + 리얼타임 업데이트 리스너
  useEffect(() => {
    loadData();

    // 리얼타임 업데이트: 등록 화면에서 저장 시 자동 새로고침
    const handleApqpSaved = () => {
      console.log('🔄 APQP 저장 이벤트 수신 - 목록 새로고침');
      loadData();
    };

    window.addEventListener('apqp-saved', handleApqpSaved);
    
    // 5초마다 자동 새로고침 (폴링)
    const interval = setInterval(loadData, 5000);

    return () => {
      window.removeEventListener('apqp-saved', handleApqpSaved);
      clearInterval(interval);
    };
  }, [loadData]);

  const filteredProjects = projects.filter(p => {
    if (!p || !p.apqpNo) return false;
    const query = searchQuery.toLowerCase();
    return (
      p.apqpNo.toLowerCase().includes(query) ||
      p.subject?.toLowerCase().includes(query) ||
      p.customerName?.toLowerCase().includes(query) ||
      p.productName?.toLowerCase().includes(query) ||
      p.companyName?.toLowerCase().includes(query)
    );
  });

  const toggleRow = (apqpNo: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(apqpNo)) newSelected.delete(apqpNo);
    else newSelected.add(apqpNo);
    setSelectedRows(newSelected);
  };

  const toggleAllRows = () => {
    if (selectedRows.size === filteredProjects.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(filteredProjects.map(p => p.apqpNo)));
  };

  // ★ DB API로 삭제
  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) { alert('삭제할 항목을 선택해주세요.'); return; }
    if (!confirm(`선택한 ${selectedRows.size}개 항목을 삭제하시겠습니까?`)) return;
    
    for (const apqpNo of selectedRows) {
      try {
        await fetch(`/api/apqp?apqpNo=${apqpNo}`, { method: 'DELETE' });
        console.log(`✅ APQP 삭제: ${apqpNo}`);
      } catch (error) {
        console.error(`❌ APQP 삭제 실패: ${apqpNo}`, error);
      }
    }
    
    loadData();
    setSelectedRows(new Set());
  };

  const handleEditSelected = () => {
    if (selectedRows.size !== 1) { alert('수정은 한 번에 하나의 항목만 가능합니다.'); return; }
    const selectedId = Array.from(selectedRows)[0];
    window.location.href = `/apqp/register?id=${selectedId}`;
  };

  return (
    <>
      <APQPTopNav rowCount={projects.length} />
      
      <div className="min-h-screen bg-[#f0f0f0] px-3 py-3 pt-9 font-[Malgun_Gothic]">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📋</span>
          <h1 className="text-base font-bold text-gray-800">APQP 리스트</h1>
          <span className="text-xs text-gray-500 ml-2">총 {filteredProjects.length}건</span>
        </div>

        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="🔍 프로젝트명, 고객사로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-400 rounded bg-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button onClick={loadData} className="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 text-xs rounded hover:bg-gray-200 flex items-center gap-1">🔄 새로고침</button>
            <button onClick={handleEditSelected} disabled={selectedRows.size !== 1} className="px-4 py-2 bg-yellow-100 border border-yellow-500 text-yellow-700 text-xs rounded hover:bg-yellow-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">✏️ 수정</button>
            <button onClick={handleDeleteSelected} disabled={selectedRows.size === 0} className="px-4 py-2 bg-red-100 border border-red-400 text-red-600 text-xs rounded hover:bg-red-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">🗑️ 선택 삭제 ({selectedRows.size})</button>
            <a href="/apqp/register" className="px-4 py-2 bg-[#2563eb] text-white text-xs font-bold rounded hover:bg-[#1d4ed8] flex items-center gap-1">➕ 신규 등록</a>
          </div>
        </div>

        <div className="rounded-lg overflow-hidden border border-gray-400 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#2563eb] text-white" style={{ height: '28px' }}>
                <th className="border border-white px-1 py-1 text-center align-middle w-8">
                  <input type="checkbox" checked={filteredProjects.length > 0 && selectedRows.size === filteredProjects.length} onChange={toggleAllRows} className="w-3.5 h-3.5" />
                </th>
                {COLUMN_HEADERS.map((header, idx) => (
                  <th key={idx} className="border border-white px-2 py-1 text-center align-middle font-semibold whitespace-nowrap text-xs">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COLUMN_HEADERS.length + 1} className="text-center py-8 text-gray-500">
                    <span className="animate-pulse">🔄 데이터 로딩 중...</span>
                  </td>
                </tr>
              ) : filteredProjects.map((p, index) => (
                <tr
                  key={`${p.apqpNo}-${index}`}
                  className={`hover:bg-blue-50 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-[#dbeafe]' : 'bg-white'} ${selectedRows.has(p.apqpNo) ? 'bg-blue-100' : ''}`}
                  style={{ height: '28px' }}
                  onClick={() => toggleRow(p.apqpNo)}
                >
                  <td className="border border-gray-400 px-1 py-0.5 text-center align-middle">
                    <input type="checkbox" checked={selectedRows.has(p.apqpNo)} onChange={() => toggleRow(p.apqpNo)} onClick={(e) => e.stopPropagation()} className="w-3.5 h-3.5" />
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-center align-middle font-bold text-[#2563eb]">{index + 1}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center align-middle font-semibold text-blue-600">
                    <a href={`/apqp/register?id=${p.apqpNo}`} className="hover:underline">{p.apqpNo}</a>
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-left align-middle">
                    <a href={`/apqp/register?id=${p.apqpNo}`} className="text-blue-600 hover:underline font-semibold">{p.subject || '미입력'}</a>
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-center align-middle">{p.customerName || '-'}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center align-middle">{p.productName || '-'}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center align-middle">{p.companyName || '-'}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center align-middle">{p.apqpStartDate || '-'}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center align-middle">{p.apqpRevisionDate || '-'}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center align-middle">{renderStatusBadge(p.status || 'planning')}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center align-middle">{p.apqpResponsibleName || p.leader || '-'}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center align-middle">{p.createdAt?.split('T')[0] || '-'}</td>
                </tr>
              ))}
              {/* 빈 행 */}
              {Array.from({ length: Math.max(0, 10 - filteredProjects.length) }).map((_, idx) => (
                <tr key={`empty-${idx}`} className={`${(filteredProjects.length + idx) % 2 === 0 ? 'bg-[#dbeafe]' : 'bg-white'}`} style={{ height: '28px' }}>
                  <td className="border border-gray-400 px-1 py-0.5 text-center align-middle"><input type="checkbox" disabled className="w-3.5 h-3.5 opacity-30" /></td>
                  {COLUMN_HEADERS.map((_, i) => (
                    <td key={i} className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex justify-between text-xs text-gray-500">
          <span>조회 결과: {filteredProjects.length}건 / 전체: {projects.length}건</span>
          <span>버전: APQP Suite v3.0 | 사용자: APQP Lead</span>
        </div>
      </div>
    </>
  );
}


















