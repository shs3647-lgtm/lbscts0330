/**
 * @file page.tsx
 * @description Control Plan 접속 로그 페이지 - PFMEA와 동일한 구조
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import CPTopNav from '@/components/layout/CPTopNav';

// =====================================================
// 타입 정의
// =====================================================
interface LogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  details: string;
  ipAddress: string;
  browser: string;
}

// =====================================================
// 샘플 로그 데이터
// =====================================================
const SAMPLE_LOGS: LogEntry[] = [
  {
    id: 'LOG-001',
    timestamp: new Date().toISOString(),
    userId: 'user001',
    userName: '신홍섭',
    action: '로그인',
    target: 'Control Plan',
    details: '시스템 접속',
    ipAddress: '192.168.1.100',
    browser: 'Chrome 120.0',
  },
  {
    id: 'LOG-002',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    userId: 'user001',
    userName: '신홍섭',
    action: '조회',
    target: 'CP 리스트',
    details: 'CP 리스트 조회',
    ipAddress: '192.168.1.100',
    browser: 'Chrome 120.0',
  },
  {
    id: 'LOG-003',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    userId: 'user002',
    userName: '김철수',
    action: '수정',
    target: 'CP-001',
    details: 'CP 데이터 수정',
    ipAddress: '192.168.1.101',
    browser: 'Firefox 121.0',
  },
  {
    id: 'LOG-004',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    userId: 'user003',
    userName: '이영희',
    action: '생성',
    target: 'CP-002',
    details: '신규 CP 등록',
    ipAddress: '192.168.1.102',
    browser: 'Edge 120.0',
  },
  {
    id: 'LOG-005',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    userId: 'user001',
    userName: '신홍섭',
    action: '내보내기',
    target: 'CP-001',
    details: 'Excel 내보내기',
    ipAddress: '192.168.1.100',
    browser: 'Chrome 120.0',
  },
];

// 액션별 색상
const ACTION_COLORS: Record<string, string> = {
  '로그인': 'bg-blue-100 text-blue-700',
  '로그아웃': 'bg-gray-100 text-gray-700',
  '조회': 'bg-green-100 text-green-700',
  '수정': 'bg-yellow-100 text-yellow-700',
  '생성': 'bg-teal-100 text-teal-700',
  '삭제': 'bg-red-100 text-red-700',
  '내보내기': 'bg-purple-100 text-purple-700',
  '가져오기': 'bg-indigo-100 text-indigo-700',
};

// =====================================================
// 메인 컴포넌트
// =====================================================
export default function CPLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // 로그 로드
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cp-access-logs');
      if (stored) {
        const parsed = JSON.parse(stored);
        setLogs(parsed);
      } else {
        // 샘플 데이터 저장
        localStorage.setItem('cp-access-logs', JSON.stringify(SAMPLE_LOGS));
        setLogs(SAMPLE_LOGS);
      }
    } catch (error) {
      console.error('❌ 로그 로드 실패:', error);
      setLogs(SAMPLE_LOGS);
    }
  }, []);

  // 새로고침
  const handleRefresh = useCallback(() => {
    // 현재 접속 로그 추가
    const newLog: LogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: 'current_user',
      userName: 'CP Lead',
      action: '조회',
      target: '접속 로그',
      details: '로그 페이지 새로고침',
      ipAddress: '192.168.1.100',
      browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other',
    };
    
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem('cp-access-logs', JSON.stringify(updatedLogs));
  }, [logs]);

  // 로그 초기화
  const handleClearLogs = useCallback(() => {
    if (!confirm('모든 로그를 삭제하시겠습니까?')) return;
    setLogs([]);
    localStorage.removeItem('cp-access-logs');
  }, []);

  // 필터링
  const filteredLogs = logs.filter(log => {
    // 검색어 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        log.userName.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.target.toLowerCase().includes(query) ||
        log.details.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // 액션 필터
    if (filterAction && log.action !== filterAction) return false;

    // 날짜 범위 필터
    if (dateRange.start) {
      const logDate = new Date(log.timestamp).toISOString().split('T')[0];
      if (logDate < dateRange.start) return false;
    }
    if (dateRange.end) {
      const logDate = new Date(log.timestamp).toISOString().split('T')[0];
      if (logDate > dateRange.end) return false;
    }

    return true;
  });

  // 타임스탬프 포맷
  const formatTimestamp = (timestamp: string) => {
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

  return (
    <>
      <CPTopNav />
      
      <div className="min-h-screen bg-[#f0f0f0] px-3 py-3 pt-9 font-[Malgun_Gothic]">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📊</span>
          <h1 className="text-base font-bold text-gray-800">CP 접속 로그</h1>
          <span className="text-xs text-gray-500 ml-2">총 {filteredLogs.length}건</span>
        </div>

        {/* 필터 바 */}
        <div className="rounded-lg overflow-hidden border border-gray-400 mb-4 bg-white p-3">
          <div className="flex items-center gap-4 flex-wrap">
            {/* 검색 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">검색:</span>
              <input
                type="text"
                placeholder="사용자, 액션, 대상 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded w-48 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* 액션 필터 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">액션:</span>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-teal-500"
              >
                <option value="">전체</option>
                {Object.keys(ACTION_COLORS).map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

            {/* 날짜 범위 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">기간:</span>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-teal-500"
              />
              <span className="text-xs text-gray-400">~</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 ml-auto">
              <button
                onClick={handleRefresh}
                className="px-3 py-1.5 bg-gray-100 border border-gray-400 text-gray-700 text-xs rounded hover:bg-gray-200"
              >
                🔄 새로고침
              </button>
              <button
                onClick={handleClearLogs}
                className="px-3 py-1.5 bg-red-100 border border-red-400 text-red-600 text-xs rounded hover:bg-red-200"
              >
                🗑️ 로그 초기화
              </button>
            </div>
          </div>
        </div>

        {/* 로그 테이블 */}
        <div className="rounded-lg overflow-hidden border border-gray-400 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs min-w-[1200px]">
              <thead>
                <tr className="bg-[#0d9488] text-white h-7">
                  <th className="border border-white px-2 py-1 text-center align-middle w-10">No</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-40">일시</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-20">사용자ID</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-20">이름</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-20">액션</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-28">대상</th>
                  <th className="border border-white px-2 py-1 text-center align-middle">상세내용</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-28">IP 주소</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-28">브라우저</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                      로그 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, index) => (
                    <tr 
                      key={log.id} 
                      className={`hover:bg-teal-50 h-7 ${index % 2 === 0 ? 'bg-white' : 'bg-teal-50/50'}`}
                    >
                      <td className="border border-gray-400 px-2 py-1 text-center align-middle font-bold text-teal-600">
                        {index + 1}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-600">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                        {log.userId}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-center align-middle font-semibold">
                        {log.userName}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-center align-middle text-teal-600 font-semibold">
                        {log.target}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-left align-middle text-gray-600">
                        {log.details}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-500">
                        {log.ipAddress}
                      </td>
                      <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-500">
                        {log.browser}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 하단 상태바 */}
        <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex justify-between text-xs text-gray-500">
          <span>조회 결과: {filteredLogs.length}건 / 전체: {logs.length}건</span>
          <span>버전: CP Suite v1.0 | 사용자: CP Lead</span>
        </div>
      </div>
    </>
  );
}

















