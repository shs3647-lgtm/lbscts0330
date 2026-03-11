/**
 * @file page.tsx
 * @description APQP 접속 로그 페이지 (실제 API 연동)
 * @version 2.0.0
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import APQPTopNav from '@/components/layout/APQPTopNav';
import { FixedLayout } from '@/components/layout';
import { useLocale } from '@/lib/locale';
import { CFTAccessLogTable } from '@/components/tables/CFTAccessLogTable';
import { CFTAccessLog } from '@/types/project-cft';
import { useAuth } from '@/hooks/useAuth';

export default function APQPLogPage() {
  const { t } = useLocale();
  const { user } = useAuth();
  const [logs, setLogs] = useState<CFTAccessLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // 로그 데이터 로드
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      // 모듈 필터: APQP
      const moduleParam = '&module=APQP';
      const res = await fetch(`/api/auth/access-log?limit=100${moduleParam}`);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.logs) {
          setLogs(data.logs);
        }
      } else {
        // API 실패 시 (또는 아직 구현 안됨) 빈 배열
        setLogs([]);
      }
    } catch (e) {
      console.error('로그 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // 클라이언트 측 필터링
  const filteredLogs = logs.filter(log => {
    // 검색어 (사용자명, 내용, 대상)
    const q = searchQuery.toLowerCase();
    const matchSearch =
      (log.userName || '').toLowerCase().includes(q) ||
      (log.description || '').toLowerCase().includes(q) ||
      (log.itemType || '').toLowerCase().includes(q);

    // 액션 필터
    const matchAction = !filterAction || log.action === filterAction;

    return matchSearch && matchAction;
  });

  return (
    <FixedLayout topNav={<APQPTopNav />} showSidebar={true} bgColor="#f0f0f0" contentPadding="p-3">
      <div className="font-[Malgun_Gothic] h-full flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <h1 className="text-base font-bold text-gray-800">{t('APQP 접속 로그')}</h1>
            <span className="text-xs text-gray-500">{t('총')} {filteredLogs.length}{t('건')}</span>
          </div>
          <button
            onClick={loadLogs}
            className="px-3 py-1 bg-[#004C6D] text-white rounded text-xs hover:bg-[#003853] flex items-center gap-1"
          >
            🔄 {t('새로고침')}
          </button>
        </div>

        {/* 필터 영역 */}
        <div className="bg-white rounded border border-gray-300 p-3 mb-4 flex gap-4 items-center flex-shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700">{t('검색')}:</span>
            <input
              type="text"
              placeholder="사용자, 내용 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="border border-gray-300 px-2 py-1 rounded w-64 focus:outline-none focus:border-[#004C6D]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700">{t('액션')}:</span>
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="border border-gray-300 px-2 py-1 rounded focus:outline-none focus:border-[#004C6D]"
            >
              <option value="">{t('전체')}</option>
              <option value="access">{t('접속')}</option>
              <option value="create">{t('생성')}</option>
              <option value="update">{t('수정')}</option>
              <option value="delete">{t('삭제')}</option>
              <option value="download">{t('다운로드')}</option>
            </select>
          </div>
        </div>

        {/* 로그 테이블 (재사용) */}
        <div className="flex-1 overflow-auto bg-white rounded border border-gray-300">
          {loading ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              {t('데이터 로딩 중...')}
            </div>
          ) : (
            <div className="p-0">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#004C6D] text-white">
                    <th className="px-3 py-2 text-center w-16">No</th>
                    <th className="px-3 py-2 text-center w-36">{t('일시')}</th>
                    <th className="px-3 py-2 text-center w-24">{t('사용자')}</th>
                    <th className="px-3 py-2 text-center w-20">{t('구분')}</th>
                    <th className="px-3 py-2 text-center w-24">{t('항목')}</th>
                    <th className="px-3 py-2 text-left">{t('내용')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-500">{t('로그 데이터가 없습니다.')}</td></tr>
                  ) : (
                    filteredLogs.map((log, idx) => (
                      <tr key={log.id} className="border-b border-gray-200 hover:bg-blue-50">
                        <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-2 text-center text-gray-600">
                          {new Date(log.loginTime).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold">{log.userName}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.action === '조회' ? 'bg-green-100 text-green-700' :
                              log.action === '생성' ? 'bg-blue-100 text-blue-700' :
                                log.action === '삭제' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                            }`}>
                            {log.action.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center text-gray-600">{log.itemType}</td>
                        <td className="px-3 py-2 text-left text-gray-800">{log.description}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </FixedLayout>
  );
}
