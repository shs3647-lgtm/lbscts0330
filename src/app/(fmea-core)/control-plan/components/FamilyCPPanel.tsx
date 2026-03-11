/**
 * @file FamilyCPPanel.tsx
 * @description Family CP 패널 — FMEA 하위 다중 관리계획서 관리
 * @created 2026-03-02
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import FamilyCPBadge from './FamilyCPBadge';

interface FamilyCPItem {
  cpNo: string;
  variantNo: number | null;
  variantLabel: string | null;
  isBaseVariant: boolean;
  subject: string | null;
  status: string | null;
  createdAt: string;
}

interface FamilyCPPanelProps {
  fmeaId: string;
  onNavigateToCp?: (cpNo: string) => void;
  className?: string;
}

/**
 * Family CP 패널
 * - 상위 FMEA 하위의 모든 CP 표시
 * - Base CP + Variant CP 목록
 * - "변형 CP 추가" 버튼
 */
export default function FamilyCPPanel({
  fmeaId,
  onNavigateToCp,
  className = '',
}: FamilyCPPanelProps) {
  const [familyCps, setFamilyCps] = useState<FamilyCPItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Family CP 목록 조회
  const fetchFamilyCps = useCallback(async () => {
    if (!fmeaId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/control-plan/family?fmeaId=${encodeURIComponent(fmeaId)}`);
      const data = await res.json();
      if (data.success) {
        const all: FamilyCPItem[] = [];
        if (data.baseCp) all.push(data.baseCp);
        if (data.variants) all.push(...data.variants);
        setFamilyCps(all);
        setTotalCount(data.totalCount || 0);
      }
    } catch (err) {
      console.error('[FamilyCPPanel] 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [fmeaId]);

  useEffect(() => {
    fetchFamilyCps();
  }, [fetchFamilyCps]);

  // 변형 CP 추가
  const handleAddVariant = useCallback(async () => {
    if (!fmeaId) return;
    const label = prompt('관리계획서 라벨을 입력하세요 (선택사항)\n예: 공장A, 야간조, 해외공장');

    setCreating(true);
    try {
      const baseCpNo = familyCps.find(cp => cp.isBaseVariant)?.cpNo || familyCps[0]?.cpNo;
      const res = await fetch('/api/control-plan/family/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fmeaId,
          baseCpNo: baseCpNo || undefined,
          variantLabel: label || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`관리계획서 생성 완료: ${data.cpNo}`);
        fetchFamilyCps(); // 목록 갱신
        if (onNavigateToCp) onNavigateToCp(data.cpNo);
      } else {
        alert(`생성 실패: ${data.error}`);
      }
    } catch (err) {
      console.error('[FamilyCPPanel] 생성 실패:', err);
      alert('관리계획서 생성 중 오류가 발생했습니다.');
    } finally {
      setCreating(false);
    }
  }, [fmeaId, familyCps, fetchFamilyCps, onNavigateToCp]);

  if (!fmeaId) return null;

  return (
    <div className={`border border-gray-200 rounded bg-white ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700" title="Control Plan (Family CP)">관리계획서(Family CP)</span>
          <span className="text-[10px] text-gray-400">{fmeaId}</span>
          {totalCount > 0 && (
            <span className="text-[10px] bg-blue-50 text-blue-600 px-1 rounded">
              {totalCount}건
            </span>
          )}
        </div>
        <button
          onClick={handleAddVariant}
          disabled={creating}
          className="text-[11px] px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {creating ? '생성 중...' : '+ CP 추가'}
        </button>
      </div>

      {/* 목록 */}
      <div className="max-h-[200px] overflow-y-auto">
        {loading ? (
          <div className="text-xs text-gray-400 text-center py-3">로딩 중...</div>
        ) : familyCps.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-3">
            등록된 관리계획서가 없습니다.
            <br />
            <span className="text-blue-500 cursor-pointer" onClick={handleAddVariant}>
              첫 번째 CP를 생성하세요
            </span>
          </div>
        ) : (
          <table className="w-full text-xs">
            <tbody>
              {familyCps.map((cp) => (
                <tr
                  key={cp.cpNo}
                  className="hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                  onClick={() => onNavigateToCp?.(cp.cpNo)}
                >
                  <td className="px-2 py-1 w-[100px]">
                    <span className="font-mono text-blue-600" title={cp.cpNo}>{cp.cpNo.split('-').pop()}</span>
                  </td>
                  <td className="px-1 py-1 w-[60px]">
                    <FamilyCPBadge
                      variantNo={cp.variantNo}
                      isBaseVariant={cp.isBaseVariant}
                      variantLabel={cp.variantLabel}
                    />
                  </td>
                  <td className="px-1 py-1 truncate max-w-[150px] text-gray-600">
                    {cp.variantLabel || cp.subject || '-'}
                  </td>
                  <td className="px-1 py-1 w-[40px] text-center">
                    <span
                      className={`text-[10px] ${
                        cp.status === 'approved'
                          ? 'text-green-600'
                          : cp.status === 'draft'
                          ? 'text-gray-400'
                          : 'text-yellow-600'
                      }`}
                    >
                      {cp.status === 'approved' ? '승인(Approved)' : cp.status === 'draft' ? '초안(Draft)' : cp.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
