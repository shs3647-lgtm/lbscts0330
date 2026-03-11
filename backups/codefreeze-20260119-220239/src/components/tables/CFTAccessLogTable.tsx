/**
 * CFTAccessLogTable.tsx
 * 
 * 목적: CFT 접속 로그 테이블 컴포넌트
 * 컬럼: No, 성명, 수정항목, TASK, 액션, 수정내용, 사용시간, 로그인시각, 로그아웃시각
 */

'use client';

import React, { useMemo } from 'react';
import { CFTAccessLog } from '@/types/project-cft';

interface CFTAccessLogTableProps {
  accessLogs: CFTAccessLog[];
  searchQuery?: string;
  maxRows?: number;
}

// 사용시간 계산 함수
function calculateUsageTime(loginTime: string, logoutTime: string | null): string {
  if (!logoutTime || logoutTime === '-' || loginTime === '-') return '-';
  
  try {
    const login = new Date(loginTime.replace(' ', 'T'));
    const logout = new Date(logoutTime.replace(' ', 'T'));
    
    if (isNaN(login.getTime()) || isNaN(logout.getTime())) return '-';
    
    const diffMs = logout.getTime() - login.getTime();
    if (diffMs < 0) return '-';
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
  } catch {
    return '-';
  }
}

export const CFTAccessLogTable: React.FC<CFTAccessLogTableProps> = ({ 
  accessLogs, 
  searchQuery = '',
  maxRows = 10 
}) => {

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return accessLogs;

    const query = searchQuery.toLowerCase();
    return accessLogs.filter((log) =>
      log.userName.toLowerCase().includes(query) ||
      log.itemType.toLowerCase().includes(query) ||
      log.cellAddress.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.description.toLowerCase().includes(query)
    );
  }, [accessLogs, searchQuery]);

  const displayLogs = useMemo(() => {
    const result = [...filteredLogs];
    while (result.length < maxRows) {
      result.push({
        id: -result.length,
        projectId: '',
        userName: '-',
        loginTime: '-',
        logoutTime: '-',
        action: '수정',
        itemType: '-',
        cellAddress: '-',
        description: '-',
      });
    }
    return result.slice(0, maxRows);
  }, [filteredLogs, maxRows]);

  return (
    <div className="rounded-lg overflow-hidden border border-gray-400">
      <div className="max-h-[350px] overflow-y-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#00587a] text-white">
              <th className="border border-white px-2 py-2 text-center align-middle font-semibold w-10">No</th>
              <th className="border border-white px-2 py-2 text-center align-middle font-semibold w-16">성명</th>
              <th className="border border-white px-2 py-2 text-center align-middle font-semibold w-20">수정항목</th>
              <th className="border border-white px-2 py-2 text-center align-middle font-semibold w-20">TASK</th>
              <th className="border border-white px-2 py-2 text-center align-middle font-semibold w-14">액션</th>
              <th className="border border-white px-2 py-2 text-center align-middle font-semibold">수정내용</th>
              <th className="border border-white px-2 py-2 text-center align-middle font-semibold w-24">사용시간</th>
              <th className="border border-white px-2 py-2 text-center align-middle font-semibold w-36 whitespace-nowrap">로그인시각</th>
              <th className="border border-white px-2 py-2 text-center align-middle font-semibold w-36 whitespace-nowrap">로그아웃시각</th>
            </tr>
          </thead>
          <tbody>
            {displayLogs.map((log, index) => {
              const usageTime = calculateUsageTime(log.loginTime, log.logoutTime);
              
              return (
                <tr key={log.id || `empty-${index}`} className={index % 2 === 0 ? 'bg-[#e3f2fd]' : 'bg-white'}>
                  <td className="border border-gray-300 px-2 py-1.5 text-center align-middle font-bold text-[#00587a]">
                    {log.id > 0 ? log.id : '-'}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center align-middle">
                    {log.userName}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center align-middle">
                    {log.itemType}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center align-middle">
                    {log.cellAddress}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center align-middle">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                      log.action === '추가' ? 'bg-green-100 text-green-700' :
                      log.action === '삭제' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-left align-middle">
                    {log.description}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center align-middle text-gray-600 font-medium">
                    {usageTime}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center align-middle text-gray-600 whitespace-nowrap">
                    {log.loginTime}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center align-middle text-gray-600 whitespace-nowrap">
                    {log.logoutTime || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CFTAccessLogTable;
