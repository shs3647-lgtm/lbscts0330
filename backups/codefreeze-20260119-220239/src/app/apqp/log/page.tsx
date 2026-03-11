/**
 * @file page.tsx
 * @description APQP 접속 로그 페이지
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import APQPTopNav from '@/components/layout/APQPTopNav';
import { CFTAccessLogTable } from '@/components/tables/CFTAccessLogTable';
import { CFTAccessLog } from '@/types/project-cft';

const MOCK_LOGS: CFTAccessLog[] = [
  { id: 1, projectId: 'PJ-001', userName: '김철수', loginTime: '2025-01-02 09:00', logoutTime: '2025-01-02 12:30', action: '조회', itemType: 'APQP', cellAddress: '-', description: 'APQP 프로젝트 조회' },
  { id: 2, projectId: 'PJ-001', userName: '박영희', loginTime: '2025-01-02 10:15', logoutTime: '2025-01-02 11:45', action: '수정', itemType: 'APQP', cellAddress: 'Stage 3', description: 'Stage 3 활동 추가' },
  { id: 3, projectId: 'PJ-002', userName: '이민수', loginTime: '2025-01-02 13:00', logoutTime: '2025-01-02 17:00', action: '수정', itemType: 'APQP', cellAddress: 'Stage 1', description: '계획 및 정의 수정' },
  { id: 4, projectId: 'PJ-001', userName: '최지영', loginTime: '2025-01-02 14:30', logoutTime: '2025-01-02 16:00', action: '승인', itemType: 'APQP', cellAddress: '-', description: 'APQP 검토 승인' },
  { id: 5, projectId: 'PJ-003', userName: '정대표', loginTime: '2025-01-02 15:00', logoutTime: '2025-01-02 18:00', action: '생성', itemType: 'APQP', cellAddress: '-', description: '신규 APQP 프로젝트 생성' },
];

export default function APQPLogPage() {
  const [logs, setLogs] = useState<CFTAccessLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    // 로컬 스토리지에서 로그 로드 또는 Mock 데이터 사용
    const savedLogs = localStorage.getItem('apqp-access-logs');
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    } else {
      setLogs(MOCK_LOGS);
    }
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchSearch = !searchQuery || 
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.projectId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchDate = !dateFilter || log.loginTime.startsWith(dateFilter);
    
    return matchSearch && matchDate;
  });

  return (
    <>
      <APQPTopNav rowCount={logs.length} />
      
      <div className="min-h-screen bg-[#f0f0f0] px-3 py-3 pt-9 font-[Malgun_Gothic]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <h1 className="text-base font-bold text-gray-800">APQP 접속 로그</h1>
            <span className="text-xs text-gray-500 ml-2">총 {filteredLogs.length}건</span>
          </div>
        </div>

        {/* 필터 영역 */}
        <div className="bg-white rounded border border-gray-300 p-3 mb-4 flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 사용자, 프로젝트ID, 작업 내용 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => { setSearchQuery(''); setDateFilter(''); }}
            className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-600 text-xs rounded hover:bg-gray-200"
          >
            🔄 초기화
          </button>
        </div>

        {/* 로그 테이블 */}
        <CFTAccessLogTable accessLogs={filteredLogs} maxRows={15} />

        {/* 하단 상태바 */}
        <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex justify-between text-xs text-gray-500">
          <span>조회 결과: {filteredLogs.length}건 / 전체: {logs.length}건</span>
          <span>버전: APQP Suite v3.0 | 사용자: APQP Lead</span>
        </div>
      </div>
    </>
  );
}



















