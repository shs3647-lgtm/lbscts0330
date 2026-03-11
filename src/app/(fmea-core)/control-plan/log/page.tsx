/**
 * @file page.tsx
 * @description Control Plan 접속 로그 페이지 - 실제 API 연동
 * @version 2.0.0
 * @updated 2026-02-10 P0-3: localStorage → API 전환
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import CPTopNav from '@/components/layout/CPTopNav';

// =====================================================
// 타입 정의
// =====================================================
interface ApiLog {
  id: number;
  projectId: string;
  userName: string;
  loginTime: string;
  logoutTime: string | null;
  action: string;
  itemType: string;
  cellAddress: string;
  description: string;
}

// 액션별 색상
const ACTION_COLORS: Record<string, string> = {
  '로그인': 'bg-blue-100 text-blue-700',
  '로그아웃': 'bg-gray-100 text-gray-700',
  '조회': 'bg-green-100 text-green-700',
  '수정': 'bg-yellow-100 text-yellow-700',
  '추가': 'bg-blue-100 text-blue-700',
  '생성': 'bg-blue-100 text-blue-700',
  '삭제': 'bg-red-100 text-red-700',
  '승인': 'bg-teal-100 text-teal-700',
};

// =====================================================
// 메인 컴포넌트
// =====================================================
const PAGE_SIZE = 50;

export default function CPLogPage() {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // API에서 로그 로드 (서버사이드 페이지네이션)
  const loadLogs = useCallback(async (pageNum = 0) => {
    setLoading(true);
    try {
      const offset = pageNum * PAGE_SIZE;
      const res = await fetch(`/api/auth/access-log?module=CP&limit=${PAGE_SIZE}&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.logs) {
          setLogs(data.logs);
          setTotalCount(data.total || data.logs.length);
        } else {
          setLogs([]);
          setTotalCount(0);
        }
      } else {
        setLogs([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('로그 로드 실패:', error);
      setLogs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs(page);
  }, [loadLogs, page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // 필터링
  const filteredLogs = logs.filter(log => {
    // 검색어 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        (log.userName || '').toLowerCase().includes(query) ||
        (log.action || '').toLowerCase().includes(query) ||
        (log.itemType || '').toLowerCase().includes(query) ||
        (log.description || '').toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // 액션 필터
    if (filterAction && log.action !== filterAction) return false;

    // 날짜 범위 필터
    if (dateRange.start && log.loginTime) {
      const logDate = new Date(log.loginTime).toISOString().split('T')[0];
      if (logDate < dateRange.start) return false;
    }
    if (dateRange.end && log.loginTime) {
      const logDate = new Date(log.loginTime).toISOString().split('T')[0];
      if (logDate > dateRange.end) return false;
    }

    return true;
  });

  // 타임스탬프 포맷
  const formatTimestamp = (ts: string) => {
    if (!ts) return '-';
    const date = new Date(ts);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <>
      <CPTopNav />
      
      <div className="min-h-screen bg-[#f0f0f0] px-3 py-3 pt-9 font-[Malgun_Gothic]">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📊</span>
          <h1 className="text-base font-bold text-gray-800">CP 접속 로그(Access Log)</h1>
          <span className="text-xs text-gray-500 ml-2">총 {filteredLogs.length}건</span>
        </div>

        {/* 필터 바 */}
        <div className="rounded-lg overflow-hidden border border-gray-400 mb-4 bg-white p-3">
          <div className="flex items-center gap-4 flex-wrap">
            {/* 검색 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">검색(Search):</span>
              <input
                type="text"
                placeholder="사용자, 액션, 대상 검색...(Search)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded w-48 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* 액션 필터 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">액션(Action):</span>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="">전체(All)</option>
                {Object.keys(ACTION_COLORS).map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

            {/* 날짜 범위 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">기간(Period):</span>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
              <span className="text-xs text-gray-400">~</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => loadLogs(page)}
                disabled={loading}
                className="px-3 py-1.5 bg-gray-100 border border-gray-400 text-gray-700 text-xs rounded hover:bg-gray-200 disabled:opacity-50"
              >
                {loading ? '로딩...(Loading)' : '🔄 새로고침(Refresh)'}
              </button>
            </div>
          </div>
        </div>

        {/* 로그 테이블 */}
        <div className="rounded-lg overflow-hidden border border-gray-400 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs min-w-[1200px]">
              <thead>
                <tr className="bg-[#00587a] text-white h-7">
                  <th className="border border-white px-2 py-1 text-center align-middle w-10">No</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-40">접속시간(Login)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-40">퇴장시간(Logout)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-24">사용자(User)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-20">액션(Action)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-28">항목유형(Type)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-28">셀주소(Cell)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle">설명(Desc.)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                      로그를 불러오는 중...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                      로그 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, index) => (
                    <tr
                      key={log.id}
                      className={`hover:bg-blue-50 h-7 ${index % 2 === 0 ? 'bg-white' : 'bg-blue-50/50'}`}
                    >
                      <td className="border border-gray-400 px-2 py-1 text-center align-middle font-bold text-blue-600">
                        {index + 1}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-600">
                        {formatTimestamp(log.loginTime)}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-600">
                        {log.logoutTime ? formatTimestamp(log.logoutTime) : '-'}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-center align-middle font-semibold">
                        {log.userName}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-center align-middle text-blue-600 font-semibold">
                        {log.itemType || '-'}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-500">
                        {log.cellAddress || '-'}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-left align-middle text-gray-600">
                        {log.description || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 하단 상태바 + 페이지네이션 */}
        <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex items-center justify-between text-xs text-gray-500">
          <span>조회(View): {filteredLogs.length}건 / 전체(Total): {totalCount}건</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
              >
                &lt;
              </button>
              <span className="px-2 font-semibold text-gray-700">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40"
              >
                &gt;
              </button>
            </div>
          )}
          <span>CP Suite v1.0</span>
        </div>
      </div>
    </>
  );
}

















