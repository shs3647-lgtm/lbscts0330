/**
 * @file page.tsx
 * @description PFD 접속 로그 페이지
 * @version 2.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import PFDTopNav from '@/components/layout/PFDTopNav';

// =====================================================
// 타입 정의
// =====================================================
interface AccessLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  targetId?: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

// =====================================================
// 메인 컴포넌트
// =====================================================
export default function PFDAccessLogPage() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');

  // 로그 로드 (실제로는 API에서)
  useEffect(() => {
    // 샘플 데이터
    const sampleLogs: AccessLog[] = [
      {
        id: 'LOG-001',
        userId: 'user1',
        userName: '신홍섭',
        action: '조회',
        target: 'PFD 작성화면',
        targetId: 'PFD25-001',
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.100',
      },
      {
        id: 'LOG-002',
        userId: 'user2',
        userName: '김철수',
        action: '수정',
        target: 'PFD 등록',
        targetId: 'PFD25-002',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        ipAddress: '192.168.1.101',
      },
      {
        id: 'LOG-003',
        userId: 'user1',
        userName: '신홍섭',
        action: '저장',
        target: 'PFD 개정관리',
        targetId: 'PFD25-001',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        ipAddress: '192.168.1.100',
      },
    ];

    // localStorage에서 로그 로드
    try {
      const storedLogs = localStorage.getItem('pfd-access-logs');
      if (storedLogs) {
        setLogs(JSON.parse(storedLogs));
      } else {
        setLogs(sampleLogs);
        localStorage.setItem('pfd-access-logs', JSON.stringify(sampleLogs));
      }
    } catch (e) {
      setLogs(sampleLogs);
    }
  }, []);

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
              <h1 className="text-xl font-bold text-violet-700">📊 PFD 접속 로그</h1>
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
                      <th className="px-4 py-3 text-left text-xs font-semibold">IP 주소</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
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
                          <td className="px-4 py-3 text-xs text-gray-500">{log.ipAddress || '-'}</td>
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
