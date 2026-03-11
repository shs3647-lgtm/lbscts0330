/**
 * @file page.tsx
 * @description Family CP 관리 페이지 — FMEA 하위 다중 관리계획서 관리
 * @created 2026-03-02
 *
 * URL: /control-plan/family?fmeaId=pfm26-p001
 */

'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CPTopNav from '@/components/layout/CPTopNav';
import { FixedLayout } from '@/components/layout';
import FamilyCPBadge from '../components/FamilyCPBadge';

interface FamilyCPItem {
  cpNo: string;
  fmeaId: string | null;
  parentCpId: string | null;
  familyGroupId: string | null;
  variantNo: number | null;
  variantLabel: string | null;
  isBaseVariant: boolean;
  subject: string | null;
  partName: string | null;
  partNo: string | null;
  confidentialityLevel: string | null;
  status: string | null;
  cpStartDate: string | null;
  cpResponsibleName: string | null;
  createdAt: string;
}

function FamilyCPPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fmeaId = searchParams.get('fmeaId')?.toLowerCase() || '';

  const [familyCps, setFamilyCps] = useState<FamilyCPItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fmeaInfo, setFmeaInfo] = useState<{ subject?: string; partName?: string } | null>(null);

  // Family CP 목록 조회
  const fetchData = useCallback(async () => {
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
      }

      // FMEA 정보 조회
      const fmeaRes = await fetch(`/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}`);
      const fmeaData = await fmeaRes.json();
      if (fmeaData.success && fmeaData.data?.registration) {
        setFmeaInfo({
          subject: fmeaData.data.registration.subject,
          partName: fmeaData.data.registration.partName,
        });
      }
    } catch (err) {
      console.error('[FamilyCPPage] 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [fmeaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Family CP 추가
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
        alert(`관리계획서 생성 완료!\n\nCP ID: ${data.cpNo}\n${data.isBaseVariant ? '(Base CP)' : `(Variant #${data.variantNo})`}`);
        fetchData();
      } else {
        alert(`생성 실패: ${data.error}`);
      }
    } catch (err) {
      console.error('[FamilyCPPage] 생성 오류:', err);
      alert('생성 중 오류가 발생했습니다.');
    } finally {
      setCreating(false);
    }
  }, [fmeaId, familyCps, fetchData]);

  if (!fmeaId) {
    return (
      <FixedLayout topNav={<CPTopNav />}>
        <div className="flex items-center justify-center h-64 text-gray-500">
          fmeaId 파라미터가 필요합니다.
          <br />
          URL 예시: /control-plan/family?fmeaId=pfm26-p001
        </div>
      </FixedLayout>
    );
  }

  return (
    <FixedLayout topNav={<CPTopNav />}>
      <div className="p-4 max-w-[1200px] mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-800">
              Family 관리계획서
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              상위 FMEA: <span className="font-mono text-blue-600">{fmeaId}</span>
              {fmeaInfo?.subject && (
                <span className="ml-2 text-gray-400">({fmeaInfo.subject})</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddVariant}
              disabled={creating}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? '생성 중...' : '+ 관리계획서 추가'}
            </button>
            <button
              onClick={() => router.push('/control-plan/list')}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              CP 목록
            </button>
          </div>
        </div>

        {/* Family CP ID 설명 */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-xs text-blue-700">
          <strong>Family CP ID 규칙:</strong>{' '}
          FMEA <code className="bg-blue-100 px-1 rounded">{fmeaId}</code> 하위 CP는{' '}
          <code className="bg-blue-100 px-1 rounded">cp{fmeaId.replace(/^pfm/, '')}.NN</code> 형식으로 자동 생성됩니다.
          <br />
          공통부분으로 동일 FMEA 소속을 표시하고, 개별 번호(.01, .02)로 구분합니다.
        </div>

        {/* 테이블 */}
        {loading ? (
          <div className="text-center py-8 text-gray-400">로딩 중...</div>
        ) : familyCps.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-gray-50 rounded border border-dashed border-gray-300">
            <p className="text-base mb-2">등록된 관리계획서가 없습니다</p>
            <p className="text-sm mb-4">이 FMEA의 첫 번째 관리계획서를 생성하세요.</p>
            <button
              onClick={handleAddVariant}
              disabled={creating}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? '생성 중...' : '첫 번째 CP 생성'}
            </button>
          </div>
        ) : (
          <div className="border border-gray-200 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-xs">
                  <th className="px-3 py-2 text-left w-[40px]">No</th>
                  <th className="px-3 py-2 text-left w-[130px]">CP ID</th>
                  <th className="px-3 py-2 text-left w-[80px]">구분(Type)</th>
                  <th className="px-3 py-2 text-left w-[120px]">라벨(Label)</th>
                  <th className="px-3 py-2 text-left">제목(Title)</th>
                  <th className="px-3 py-2 text-left w-[80px]">담당자(Owner)</th>
                  <th className="px-3 py-2 text-center w-[60px]">상태(Status)</th>
                  <th className="px-3 py-2 text-center w-[80px]">작성일(Date)</th>
                  <th className="px-3 py-2 text-center w-[80px]">동작(Action)</th>
                </tr>
              </thead>
              <tbody>
                {familyCps.map((cp, idx) => (
                  <tr
                    key={cp.cpNo}
                    className="border-t border-gray-100 hover:bg-blue-50"
                  >
                    <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-blue-600 text-xs" title={cp.cpNo}>{cp.cpNo.split('-').pop()}</span>
                    </td>
                    <td className="px-3 py-2">
                      <FamilyCPBadge
                        variantNo={cp.variantNo}
                        isBaseVariant={cp.isBaseVariant}
                        variantLabel={cp.variantLabel}
                        size="md"
                      />
                    </td>
                    <td className="px-3 py-2 text-gray-600">{cp.variantLabel || '-'}</td>
                    <td className="px-3 py-2 text-gray-700 truncate max-w-[200px]">
                      {cp.subject || cp.partName || '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{cp.cpResponsibleName || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          cp.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : cp.status === 'draft'
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {cp.status === 'approved' ? '승인(Approved)' : cp.status === 'draft' ? '초안(Draft)' : cp.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-gray-400">
                      {cp.createdAt ? new Date(cp.createdAt).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => router.push(`/control-plan/worksheet?cpNo=${cp.cpNo}`)}
                          className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                        >
                          워크시트(WS)
                        </button>
                        <button
                          onClick={() => router.push(`/control-plan/register?id=${cp.cpNo}`)}
                          className="text-[11px] px-2 py-0.5 bg-gray-50 text-gray-500 rounded hover:bg-gray-100"
                        >
                          편집(Edit)
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </FixedLayout>
  );
}

export default function FamilyCPPage() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-400">로딩 중...</div>}>
      <FamilyCPPageContent />
    </Suspense>
  );
}
