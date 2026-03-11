/**
 * @file page.tsx
 * @description WS 접속 로그 페이지 - API 연동
 * @version 3.0.0
 * @updated 2026-02-10 P0-3: localStorage → API 전환
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PFDTopNav from '@/components/layout/PFDTopNav';

// =====================================================
// 타입 정의
// =====================================================
interface AccessLog {
  id: string;
  userName: string;
  action: string;
  target: string;
  targetId?: string;
  timestamp: string;
}

// =====================================================
// 메인 컴포넌트
// =====================================================
export default function WSAccessLogPage() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [loading, setLoading] = useState(false);

  // API에서 로그 로드
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/access-log?module=WS&limit=100');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.logs) {
          setLogs(data.logs.map((log: Record<string, unknown>, idx: number) => ({
            id: String(log.id || idx + 1),
            userName: (log.userName as string) || '',
            action: (log.action as string) || '조회',
            target: (log.itemType as string) || '-',
            targetId: (log.projectId as string) || '',
            timestamp: log.loginTime ? String(log.loginTime).replace(' ', 'T') : new Date().toISOString(),
          })));
        } else {
          setLogs([]);
        }
      } else {
        setLogs([]);
      }
    } catch (e) {
      console.error('로그 로드 실패:', e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // 날짜 필터링
  const filterByDate = (log: AccessLog) => {
    if (dateFilter === 'all') return true;

    const logDate = new Date(log.timestamp);
    const now = new Date();

    switch (dateFilter) {
      case 'today':
        return logDate.toDateString() === now.toDateString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return logDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return logDate >= monthAgo;
      default:
        return true;
    }
  };

  // 검색 필터링
  const filteredLogs = logs
    .filter(filterByDate)
    .filter(log => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        log.userName?.toLowerCase().includes(query) ||
        log.action?.toLowerCase().includes(query) ||
        log.target?.toLowerCase().includes(query) ||
        log.targetId?.toLowerCase().includes(query)
      );
    });

  // 시간 포맷
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // 액션 배지 스타일
  const getActionBadge = (action: string) => {
    const styles: Record<string, string> = {
      '조회': 'bg-blue-100 text-blue-700',
      '수정': 'bg-amber-100 text-amber-700',
      '저장': 'bg-green-100 text-green-700',
      '삭제': 'bg-red-100 text-red-700',
      '생성': 'bg-violet-100 text-violet-700',
    };
    return styles[action] || 'bg-gray-100 text-gray-700';
  };

  return (
    <>
      <PFDTopNav rowCount={filteredLogs.length} />
      
      <div className="min-h-screen bg-[#f5f7fa]">
        <div className="pt-12 px-4">
          <div className="max-w-[1400px] mx-auto">
            
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4 mt-2">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-violet-700">WS 접속 로그</h1>
                <button
                  onClick={loadLogs}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                >
                  {loading ? '로딩...' : '새로고침'}
                </button>
              </div>
              <div className="flex gap-2">
                {/* 날짜 필터 */}
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
                  className="px-4 py-2 border rounded-lg text-sm"
                >
                  <option value="all">전체 기간</option>
                  <option value="today">오늘</option>
                  <option value="week">최근 7일</option>
                  <option value="month">최근 30일</option>
                </select>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 검색..."
                  className="px-4 py-2 border rounded-lg text-sm w-64"
                />
              </div>
            </div>

            {/* 테이블 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-violet-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold">시간</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">사용자</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">액션</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">대상</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">대상 ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                          로그를 불러오는 중...
                        </td>
                      </tr>
                    ) : filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                          접속 로그가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log, index) => (
                        <tr
                          key={log.id}
                          className={`border-b hover:bg-violet-50 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                        >
                          <td className="px-4 py-3 text-xs text-gray-600">{formatTime(log.timestamp)}</td>
                          <td className="px-4 py-3 text-xs font-medium">{log.userName}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getActionBadge(log.action)}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">{log.target}</td>
                          <td className="px-4 py-3 text-xs font-mono text-violet-600">{log.targetId || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 하단 정보 */}
            <div className="mt-4 text-sm text-gray-500">
              총 {filteredLogs.length}개 로그
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
