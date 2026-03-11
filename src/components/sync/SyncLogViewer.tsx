/**
 * @file components/sync/SyncLogViewer.tsx
 * @description 동기화 로그 뷰어 컴포넌트
 * @module sync/components
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// 타입 정의
// ============================================================================

interface SyncLog {
  id: string;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  action: string;
  status: 'pending' | 'synced' | 'failed';
  errorMsg?: string;
  fieldChanges?: Record<string, any>[];
  syncedAt?: string;
  createdAt: string;
}

interface SyncLogViewerProps {
  /** 필터: 소스 타입 */
  sourceType?: string;
  /** 필터: 소스 ID */
  sourceId?: string;
  /** 필터: 대상 타입 */
  targetType?: string;
  /** 필터: 대상 ID */
  targetId?: string;
  /** 최대 표시 개수 */
  limit?: number;
  /** 제목 표시 여부 */
  showTitle?: boolean;
  /** 클래스명 */
  className?: string;
}

// ============================================================================
// 유틸리티
// ============================================================================

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'synced':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'pending':
    default:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'synced': return '완료';
    case 'failed': return '실패';
    case 'pending': return '대기';
    default: return status;
  }
};

const getActionLabel = (action: string) => {
  switch (action) {
    case 'create': return '생성';
    case 'update': return '수정';
    case 'delete': return '삭제';
    case 'structure-sync': return '구조연동';
    case 'data-sync': return '데이터동기화';
    default: return action;
  }
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ============================================================================
// 컴포넌트
// ============================================================================

export function SyncLogViewer({
  sourceType,
  sourceId,
  targetType,
  targetId,
  limit = 20,
  showTitle = true,
  className = '',
}: SyncLogViewerProps) {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 로그 조회
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (sourceType) params.set('sourceType', sourceType);
      if (sourceId) params.set('sourceId', sourceId);
      if (targetType) params.set('targetType', targetType);
      if (targetId) params.set('targetId', targetId);
      params.set('limit', String(limit));

      const res = await fetch(`/api/sync/logs?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setLogs(data.data);
      } else {
        setError(data.error || '로그 조회 실패');
      }
    } catch (e: any) {
      setError(e.message || '네트워크 오류');
    } finally {
      setLoading(false);
    }
  }, [sourceType, sourceId, targetType, targetId, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // 로딩 상태
  if (loading) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        로그 불러오는 중...
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className={`p-4 text-center text-red-500 ${className}`}>
        오류: {error}
        <button
          onClick={fetchLogs}
          className="ml-2 text-blue-500 underline hover:text-blue-700"
        >
          재시도
        </button>
      </div>
    );
  }

  // 빈 상태
  if (logs.length === 0) {
    return (
      <div className={`p-4 text-center text-gray-400 ${className}`}>
        동기화 로그가 없습니다
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {showTitle && (
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            동기화 이력
          </h3>
          <button
            onClick={fetchLogs}
            className="text-xs text-blue-500 hover:text-blue-700"
          >
            새로고침
          </button>
        </div>
      )}

      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {logs.map((log) => (
          <div
            key={log.id}
            className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs rounded border ${getStatusBadge(log.status)}`}>
                  {getStatusLabel(log.status)}
                </span>
                <span className="text-xs text-gray-600">
                  {getActionLabel(log.action)}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {formatDate(log.createdAt)}
              </span>
            </div>

            {/* 내용 */}
            <div className="mt-1 text-xs text-gray-500">
              <span className="font-medium">{log.sourceType.toUpperCase()}</span>
              <span className="mx-1">({log.sourceId})</span>
              <span className="mx-1">→</span>
              <span className="font-medium">{log.targetType.toUpperCase()}</span>
              <span className="mx-1">({log.targetId})</span>
            </div>

            {/* 확장된 상세 정보 */}
            {expandedId === log.id && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                {log.errorMsg && (
                  <div className="text-red-500 mb-1">
                    오류: {log.errorMsg}
                  </div>
                )}
                {log.fieldChanges && log.fieldChanges.length > 0 && (
                  <div className="text-gray-600">
                    <div className="font-medium mb-1">변경 필드:</div>
                    <ul className="list-disc list-inside">
                      {log.fieldChanges.map((change, idx) => (
                        <li key={idx}>
                          {change.field}: {change.oldValue} → {change.newValue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {log.syncedAt && (
                  <div className="text-gray-400 mt-1">
                    동기화 완료: {formatDate(log.syncedAt)}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SyncLogViewer;
