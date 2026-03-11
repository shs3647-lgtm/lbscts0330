/**
 * @file FamilyCPSection.tsx
 * @description Family FMEA 등록 시 하위 CP 일괄 생성/관리 섹션
 * @created 2026-03-02
 *
 * fmeaType === 'F' 일 때만 표시
 * - CP 개수 지정 + 라벨 입력 → 일괄 생성
 * - 생성된 CP 목록 표시 + 등록/워크시트 이동
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface FamilyCPItem {
  cpNo: string;
  variantNo: number | null;
  variantLabel: string | null;
  isBaseVariant: boolean;
  subject: string | null;
  status: string | null;
  cpResponsibleName: string | null;
  createdAt: string;
}

interface FamilyCPSectionProps {
  fmeaId: string;
  fmeaInfo: { subject: string; companyName: string; customerName: string };
}

export function FamilyCPSection({ fmeaId, fmeaInfo }: FamilyCPSectionProps) {
  const router = useRouter();
  const [cpList, setCpList] = useState<FamilyCPItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cpCount, setCpCount] = useState(3);

  // Family CP 목록 조회
  const fetchCpList = useCallback(async () => {
    if (!fmeaId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/control-plan/family?fmeaId=${encodeURIComponent(fmeaId)}`);
      const data = await res.json();
      if (data.success) {
        const all: FamilyCPItem[] = [];
        if (data.baseCp) all.push(data.baseCp);
        if (data.variants) all.push(...data.variants);
        setCpList(all);
      }
    } catch (err) {
      console.error('[FamilyCPSection] 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [fmeaId]);

  useEffect(() => {
    fetchCpList();
  }, [fetchCpList]);

  // 일괄 생성
  const handleBatchCreate = useCallback(async () => {
    if (!fmeaId) return;

    const input = prompt(
      `CP 라벨을 쉼표로 구분하여 입력하세요 (선택사항)\n` +
      `라벨 입력 시 라벨 수만큼 CP가 생성됩니다.\n` +
      `빈칸이면 ${cpCount}개가 생성됩니다.\n\n` +
      `예: 품번, 공장, 공정`
    );
    if (input === null) return; // 취소

    const labels = input.trim()
      ? input.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const finalCount = labels.length > 0 ? labels.length : cpCount;

    if (finalCount < 1 || finalCount > 10) {
      alert('CP 개수는 1~10 범위여야 합니다.');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/control-plan/family/batch-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fmeaId,
          count: finalCount,
          labels: labels.length > 0 ? labels : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`관리계획서 ${data.totalCount}건 생성 완료!\n\n${data.created.map((c: any) => `${c.cpNo}${c.variantLabel ? ` (${c.variantLabel})` : ''}`).join('\n')}`);
        fetchCpList();
      } else {
        alert(`생성 실패: ${data.error}`);
      }
    } catch (err) {
      console.error('[FamilyCPSection] 생성 오류:', err);
      alert('CP 생성 중 오류가 발생했습니다.');
    } finally {
      setCreating(false);
    }
  }, [fmeaId, cpCount, fetchCpList]);

  return (
    <div className="mt-3 rounded-lg overflow-hidden border border-gray-400 bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#00587a] text-white">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold">Family CP 관리(Family CP Management)</span>
          <span className="text-[9px] px-1.5 py-0.5 bg-white/20 rounded">
            {cpList.length}건
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px]">CP개수:</span>
          <input
            type="number"
            min={1}
            max={10}
            value={cpCount}
            onChange={e => setCpCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-10 h-5 px-1 text-[10px] text-gray-800 rounded border-0 text-center"
          />
          <button
            onClick={handleBatchCreate}
            disabled={creating}
            className="px-2 py-0.5 text-[9px] font-bold bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 cursor-pointer"
          >
            {creating ? '생성중...' : '일괄생성'}
          </button>
          <button
            onClick={() => router.push(`/control-plan/family?fmeaId=${fmeaId}`)}
            className="px-2 py-0.5 text-[9px] font-bold bg-white/20 text-white rounded hover:bg-white/30 cursor-pointer"
          >
            CP관리페이지
          </button>
        </div>
      </div>

      {/* CP 목록 테이블 */}
      <div className="px-2 py-1.5">
        {loading ? (
          <div className="text-center py-3 text-[10px] text-gray-400">로딩 중...</div>
        ) : cpList.length === 0 ? (
          <div className="text-center py-4 text-[10px] text-gray-400 bg-gray-50 rounded border border-dashed border-gray-200">
            <p className="mb-1">등록된 관리계획서가 없습니다</p>
            <p className="text-[9px] text-gray-300">CP개수를 지정하고 [일괄생성]을 클릭하세요</p>
          </div>
        ) : (
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500">
                <th className="px-2 py-1 text-left w-8 border border-gray-200">No</th>
                <th className="px-2 py-1 text-left w-28 border border-gray-200">CP ID</th>
                <th className="px-2 py-1 text-center w-14 border border-gray-200">구분</th>
                <th className="px-2 py-1 text-left w-20 border border-gray-200">라벨</th>
                <th className="px-2 py-1 text-left border border-gray-200">제목</th>
                <th className="px-2 py-1 text-center w-12 border border-gray-200">상태</th>
                <th className="px-2 py-1 text-center w-24 border border-gray-200">동작</th>
              </tr>
            </thead>
            <tbody>
              {cpList.map((cp, idx) => (
                <tr key={cp.cpNo} className="hover:bg-blue-50">
                  <td className="px-2 py-1 text-gray-400 border border-gray-200">{idx + 1}</td>
                  <td className="px-2 py-1 border border-gray-200">
                    <span className="font-mono text-blue-600" title={cp.cpNo}>{cp.cpNo.split('-').pop()}</span>
                  </td>
                  <td className="px-2 py-1 text-center border border-gray-200">
                    {cp.isBaseVariant ? (
                      <span className="px-1 py-0 text-[9px] font-bold rounded bg-blue-100 text-blue-700 border border-blue-200">
                        Base
                      </span>
                    ) : (
                      <span className="px-1 py-0 text-[9px] font-bold rounded bg-gray-100 text-gray-600 border border-gray-200">
                        V.{String(cp.variantNo).padStart(2, '0')}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-gray-600 border border-gray-200 truncate max-w-[80px]">
                    {cp.variantLabel || '-'}
                  </td>
                  <td className="px-2 py-1 text-gray-700 border border-gray-200 truncate max-w-[150px]">
                    {cp.subject || fmeaInfo.subject || '-'}
                  </td>
                  <td className="px-2 py-1 text-center border border-gray-200">
                    <span className={`px-1 py-0 text-[9px] rounded ${
                      cp.status === 'approved' ? 'bg-green-100 text-green-700' :
                      cp.status === 'draft' ? 'bg-gray-100 text-gray-500' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {cp.status === 'approved' ? '승인' : cp.status === 'draft' ? '초안' : cp.status || '초안'}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-center border border-gray-200">
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => router.push(`/control-plan/register?id=${cp.cpNo}`)}
                        className="px-1.5 py-0 text-[9px] bg-blue-50 text-blue-600 rounded hover:bg-blue-100 cursor-pointer"
                      >
                        등록
                      </button>
                      <button
                        onClick={() => router.push(`/control-plan/worksheet?cpNo=${cp.cpNo}`)}
                        className="px-1.5 py-0 text-[9px] bg-gray-50 text-gray-500 rounded hover:bg-gray-100 cursor-pointer"
                      >
                        WS
                      </button>
                    </div>
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
