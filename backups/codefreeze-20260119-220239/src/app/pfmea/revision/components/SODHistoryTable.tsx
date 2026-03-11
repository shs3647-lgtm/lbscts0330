/**
 * @file pfmea/revision/components/SODHistoryTable.tsx
 * @description 변경 히스토리 테이블 컴포넌트 (SOD + 고장확정 + 6ST확정)
 * @module pfmea/revision/components
 * @created 2026-01-19
 * @updated 2026-01-19 - 고장확정, 6ST확정 표시 추가
 * @lines ~250 (500줄 미만 원칙)
 */

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSODHistory, SOD_TYPE_LABELS, CONFIRM_TYPE_LABELS, type SODHistoryRecord, type ConfirmHistoryRecord, type ChangeType } from '@/hooks/revision';

// ============================================================================
// Props
// ============================================================================

interface SODHistoryTableProps {
  fmeaId: string;
  fmeaName?: string; // FMEA명 (등록정보에서 연동)
}

// ============================================================================
// 로컬 확정 히스토리 (localStorage 기반)
// ============================================================================

interface LocalConfirmHistory {
  id: string;
  fmeaId: string;
  changeType: 'FAILURE_LINK_CONFIRM' | 'STEP6_CONFIRM' | 'ORPHAN_CLEAN';
  summary: string;
  details?: {
    fmCount?: number;
    feCount?: number;
    fcCount?: number;
    linkCount?: number;
    orphanFmCount?: number;
    orphanFeCount?: number;
    orphanFcCount?: number;
  };
  changedBy: string;
  changedAt: string;
}

// ============================================================================
// 변경 히스토리 테이블 컴포넌트
// ============================================================================

export default function SODHistoryTable({ fmeaId, fmeaName }: SODHistoryTableProps) {
  const { state, loadHistories, deleteHistory } = useSODHistory(fmeaId);
  const [localConfirmHistories, setLocalConfirmHistories] = useState<LocalConfirmHistory[]>([]);
  
  // 초기 로드
  useEffect(() => {
    if (fmeaId) {
      loadHistories();
      loadLocalConfirmHistories();
    }
  }, [fmeaId, loadHistories]);
  
  // 로컬 확정 히스토리 로드
  const loadLocalConfirmHistories = () => {
    try {
      const key = `fmea_confirm_history_${fmeaId?.toLowerCase()}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        setLocalConfirmHistories(JSON.parse(stored));
      }
    } catch (e) {
      console.error('로컬 확정 히스토리 로드 실패:', e);
    }
  };
  
  // 통합 히스토리 (SOD + 확정)
  const combinedHistories = useMemo(() => {
    const sodRecords = state.histories.map(h => ({
      ...h,
      source: 'sod' as const,
    }));
    
    const confirmRecords = localConfirmHistories.map(h => ({
      ...h,
      revMajor: state.revMajor,
      revMinor: 0,
      source: 'confirm' as const,
    }));
    
    // 날짜 기준 내림차순 정렬
    return [...sodRecords, ...confirmRecords].sort((a, b) => 
      new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );
  }, [state.histories, localConfirmHistories, state.revMajor]);
  
  // --------------------------------------------------------------------------
  // 날짜 포맷
  // --------------------------------------------------------------------------
  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // --------------------------------------------------------------------------
  // 변경 내용 포맷
  // --------------------------------------------------------------------------
  const formatChange = (record: any): { text: string; bgColor: string } => {
    if (record.source === 'sod') {
      const typeLabel = SOD_TYPE_LABELS[record.changeType as keyof typeof SOD_TYPE_LABELS] || record.changeType;
      return {
        text: `${typeLabel}: ${record.oldValue} → ${record.newValue}`,
        bgColor: record.changeType === 'S' ? 'bg-red-500' :
                 record.changeType === 'O' ? 'bg-orange-500' : 'bg-blue-500',
      };
    } else {
      // 확정 히스토리
      const typeLabel = CONFIRM_TYPE_LABELS[record.changeType as keyof typeof CONFIRM_TYPE_LABELS] || record.changeType;
      return {
        text: `${typeLabel}: ${record.summary}`,
        bgColor: record.changeType === 'FAILURE_LINK_CONFIRM' ? 'bg-purple-500' :
                 record.changeType === 'STEP6_CONFIRM' ? 'bg-green-600' : 'bg-gray-500',
      };
    }
  };
  
  // --------------------------------------------------------------------------
  // 개정 번호 포맷 (N.XX 형식)
  // --------------------------------------------------------------------------
  const formatRevision = (revMajor: number, revMinor: number): string => {
    return `${revMajor}.${revMinor.toString().padStart(2, '0')}`;
  };
  
  // --------------------------------------------------------------------------
  // 복구 핸들러
  // --------------------------------------------------------------------------
  const handleRestore = async (revMajor: number, revMinor: number) => {
    const version = `${revMajor}.${revMinor.toString().padStart(2, '0')}`;
    if (!window.confirm(`⚠️ ${version} 버전으로 복구하시겠습니까?\n\n현재 FMEA 데이터가 해당 버전의 백업으로 대체됩니다.`)) {
      return;
    }
    
    try {
      const res = await fetch('/api/fmea/version-backup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fmeaId,
          version,
          action: 'restore',
        }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        if (res.status === 404) {
          alert(`❌ 해당 버전(${version})의 백업이 없습니다.`);
        } else {
          alert(`❌ 복구 실패: ${err.error || '알 수 없는 오류'}`);
        }
        return;
      }
      
      const result = await res.json();
      const backupData = result.data;
      
      // localStorage에 복구
      const atomicKey = `pfmea_atomic_${fmeaId.toLowerCase()}`;
      localStorage.setItem(atomicKey, JSON.stringify(backupData));
      
      alert(`✅ 복구 완료!\n\nFMEA: ${fmeaId}\n버전: ${version}\n\n페이지를 새로고침합니다.`);
      window.location.reload();
    } catch (error) {
      console.error('복구 오류:', error);
      alert('복구 중 오류가 발생했습니다.');
    }
  };
  
  // --------------------------------------------------------------------------
  // 삭제 핸들러
  // --------------------------------------------------------------------------
  const handleDelete = async (id: string, source: 'sod' | 'confirm') => {
    if (!window.confirm('이 변경 기록을 삭제하시겠습니까?')) return;
    
    if (source === 'sod') {
      await deleteHistory(id);
    } else {
      // 로컬 확정 히스토리 삭제
      const updated = localConfirmHistories.filter(h => h.id !== id);
      setLocalConfirmHistories(updated);
      const key = `fmea_confirm_history_${fmeaId?.toLowerCase()}`;
      localStorage.setItem(key, JSON.stringify(updated));
    }
  };

  // --------------------------------------------------------------------------
  // FMEA ID 표시용 (소문자 정규화)
  // --------------------------------------------------------------------------
  const displayFmeaId = fmeaId?.toLowerCase() || '-';
  const displayFmeaName = fmeaName || '-';
  
  // --------------------------------------------------------------------------
  // 렌더링
  // --------------------------------------------------------------------------
  return (
    <div className="rounded-lg overflow-hidden border border-gray-400 bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#00587a] text-white">
        <span className="text-sm font-bold">
          📝 변경히스토리
          <span className="ml-2 text-xs font-normal text-gray-300">
            {state.revMajor}.{state.revMinor}
          </span>
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => { loadHistories(); loadLocalConfirmHistories(); }}
            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            disabled={state.isLoading}
          >
            {state.isLoading ? '로딩...' : '🔄 새로고침'}
          </button>
        </div>
      </div>
      
      {/* 테이블 - 헤더 고정 + 스크롤 (7행) */}
      <div className="overflow-auto max-h-[200px]">
        <table className="w-full border-collapse text-[10px] min-w-[800px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#e0f2fb] text-gray-800 h-[25px]">
              <th className="border border-gray-300 px-1 py-0 text-center font-semibold w-10">버전</th>
              <th className="border border-gray-300 px-1 py-0 text-center font-semibold w-24">일시</th>
              <th className="border border-gray-300 px-1 py-0 text-center font-semibold w-14">변경자</th>
              <th className="border border-gray-300 px-1 py-0 text-center font-semibold w-24">FMEA ID</th>
              <th className="border border-gray-300 px-1 py-0 text-center font-semibold w-28">FMEA명</th>
              <th className="border border-gray-300 px-1 py-0 text-center font-semibold">변경내용</th>
              <th className="border border-gray-300 px-1 py-0 text-center font-semibold w-10">복구</th>
              <th className="border border-gray-300 px-1 py-0 text-center font-semibold w-10">삭제</th>
            </tr>
          </thead>
          <tbody>
            {state.isLoading ? (
              <tr className="h-[25px]">
                <td colSpan={8} className="px-2 py-0 text-center text-gray-500">
                  로딩 중...
                </td>
              </tr>
            ) : combinedHistories.length === 0 ? (
              // 빈행 7개 표시 - 현재 FMEA 정보 연동 (개정이력과 일관성 유지)
              Array.from({ length: 7 }).map((_, idx) => (
                <tr key={`empty-${idx}`} className="h-[25px]">
                  <td className="border border-gray-300 px-1 py-0 text-center text-gray-400">
                    {`1.${idx.toString().padStart(2, '0')}`}
                  </td>
                  <td className="border border-gray-300 px-1 py-0 text-center text-gray-400">-</td>
                  <td className="border border-gray-300 px-1 py-0 text-center text-gray-500">admin</td>
                  <td className="border border-gray-300 px-1 py-0 text-center text-blue-500 font-mono">{displayFmeaId}</td>
                  <td className="border border-gray-300 px-1 py-0 text-gray-600 truncate">{displayFmeaName}</td>
                  <td className="border border-gray-300 px-1 py-0 text-gray-400">-</td>
                  <td className="border border-gray-300 px-1 py-0 text-center">
                    <button
                      onClick={() => handleRestore(1, idx)}
                      className="px-1.5 py-0.5 text-[9px] bg-green-500 text-white rounded hover:bg-green-600"
                      title="이 버전으로 복구"
                    >
                      ↩️
                    </button>
                  </td>
                  <td className="border border-gray-300 px-1 py-0 text-center text-gray-400">-</td>
                </tr>
              ))
            ) : (
              combinedHistories.map((record) => {
                const { text, bgColor } = formatChange(record);
                return (
                  <tr key={record.id} className="h-[25px] hover:bg-gray-50">
                    <td className="border border-gray-300 px-1 py-0 text-center">
                      <span className="font-mono text-blue-600">
                        {formatRevision(record.revMajor, record.revMinor)}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-1 py-0 text-center text-gray-600">
                      {formatDate(record.changedAt)}
                    </td>
                    <td className="border border-gray-300 px-1 py-0 text-center">
                      {record.changedBy || 'admin'}
                    </td>
                    <td className="border border-gray-300 px-1 py-0 text-center text-blue-500 font-mono">
                      {displayFmeaId}
                    </td>
                    <td className="border border-gray-300 px-1 py-0 truncate" title={displayFmeaName}>
                      {displayFmeaName}
                    </td>
                    <td className="border border-gray-300 px-1 py-0">
                      <span className={`px-1 py-0 rounded text-white text-[9px] ${bgColor}`}>
                        {text}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-1 py-0 text-center">
                      <button
                        onClick={() => handleRestore(record.revMajor, record.revMinor)}
                        className="px-1.5 py-0.5 text-[9px] bg-green-500 text-white rounded hover:bg-green-600"
                        title="이 버전으로 복구"
                      >
                        ↩️
                      </button>
                    </td>
                    <td className="border border-gray-300 px-1 py-0 text-center">
                      <button
                        onClick={() => handleDelete(record.id, record.source)}
                        className="text-red-500 hover:text-red-700 text-[10px]"
                        title="삭제"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* 푸터 */}
      {combinedHistories.length > 0 && (
        <div className="px-4 py-1 bg-gray-50 text-[10px] text-gray-600 border-t border-gray-300">
          총 {combinedHistories.length}건 (SOD: {state.histories.length}, 확정: {localConfirmHistories.length})
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 확정 히스토리 기록 유틸리티 (외부에서 사용)
// ============================================================================

export function recordConfirmHistory(
  fmeaId: string,
  changeType: 'FAILURE_LINK_CONFIRM' | 'STEP6_CONFIRM' | 'ORPHAN_CLEAN',
  summary: string,
  details?: LocalConfirmHistory['details']
) {
  try {
    const key = `fmea_confirm_history_${fmeaId.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    const histories: LocalConfirmHistory[] = stored ? JSON.parse(stored) : [];
    
    const newRecord: LocalConfirmHistory = {
      id: `confirm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fmeaId: fmeaId.toLowerCase(),
      changeType,
      summary,
      details,
      changedBy: 'admin',
      changedAt: new Date().toISOString(),
    };
    
    histories.unshift(newRecord);
    localStorage.setItem(key, JSON.stringify(histories.slice(0, 100))); // 최대 100개 유지
    
    console.log(`[확정 히스토리] ${changeType}: ${summary}`);
    return newRecord;
  } catch (e) {
    console.error('확정 히스토리 기록 실패:', e);
    return null;
  }
}
