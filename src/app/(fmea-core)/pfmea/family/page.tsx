/**
 * @file page.tsx
 * @description Family FMEA 대시보드 페이지
 * - 상태별 통계 카드
 * - Family FMEA 목록 테이블
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FixedLayout } from '@/components/layout';
import FamilyTopNav from './components/FamilyTopNav';
import { toast } from '@/hooks/useToast';

// ─── 타입 ───

interface FamilyFmeaItem {
  id: string;
  familyCode: string;
  processNo: string;
  processName: string;
  status: string;
  version: string;
  authorName: string;
  updatedAt: string;
}

interface StatusCount {
  total: number;
  DRAFT: number;
  REVIEW: number;
  APPROVED: number;
  SUPERSEDED: number;
}

// ─── 상수 ───

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#9e9e9e',
  REVIEW: '#ff9800',
  APPROVED: '#4caf50',
  SUPERSEDED: '#f44336',
};

const STATUS_BG: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  REVIEW: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700',
  SUPERSEDED: 'bg-red-100 text-red-700',
};

const ROW_HEIGHT = 28;

// ─── 통계 카드 ───

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="rounded-lg p-3 border transition-all duration-200 hover:scale-105 cursor-default"
      style={{ borderColor: color, background: `${color}10` }}
    >
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

// ─── 상태 배지 ───

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BG[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${cls}`}>
      {status}
    </span>
  );
}

// ─── 메인 페이지 ───

export default function FamilyFmeaDashboardPage() {
  const [items, setItems] = useState<FamilyFmeaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<StatusCount>({ total: 0, DRAFT: 0, REVIEW: 0, APPROVED: 0, SUPERSEDED: 0 });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/family-fmea/list');
      if (!res.ok) throw new Error(`API 오류: ${res.status}`);
      const data = await res.json();
      const list: FamilyFmeaItem[] = data.data || data.items || [];
      setItems(list);

      const c: StatusCount = { total: list.length, DRAFT: 0, REVIEW: 0, APPROVED: 0, SUPERSEDED: 0 };
      list.forEach((item) => {
        const s = item.status as keyof Omit<StatusCount, 'total'>;
        if (s in c) c[s]++;
      });
      setCounts(c);
    } catch (error) {
      console.error('Family FMEA 목록 로드 실패:', error);
      toast.error('Family FMEA 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <FixedLayout>
      <FamilyTopNav />
      <div className="pt-10 px-4 pb-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-gray-800">Family FMEA 대시보드</h1>
          <button
            onClick={fetchData}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            새로고침
          </button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-5 gap-3 mb-4">
          <StatCard label="전체" value={counts.total} color="#1565c0" />
          <StatCard label="DRAFT" value={counts.DRAFT} color={STATUS_COLORS.DRAFT} />
          <StatCard label="REVIEW" value={counts.REVIEW} color={STATUS_COLORS.REVIEW} />
          <StatCard label="APPROVED" value={counts.APPROVED} color={STATUS_COLORS.APPROVED} />
          <StatCard label="SUPERSEDED" value={counts.SUPERSEDED} color={STATUS_COLORS.SUPERSEDED} />
        </div>

        {/* 테이블 */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[5%]">No</th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[12%]">코드</th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[8%]">공정번호</th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[20%]">공정명</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-600 w-[8%]">상태</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-600 w-[7%]">버전</th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[10%]">담당자</th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[12%]">수정일</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    로딩 중...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    등록된 Family FMEA가 없습니다. &apos;새 F/F 생성&apos;에서 추가하세요.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="border-b hover:bg-blue-50/50 cursor-pointer transition-colors"
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => { window.location.href = `/pfmea/family/${item.id}`; }}
                  >
                    <td className="px-2">{idx + 1}</td>
                    <td className="px-2 font-mono text-blue-700">{item.familyCode}</td>
                    <td className="px-2">{item.processNo}</td>
                    <td className="px-2 truncate max-w-[200px]">{item.processName}</td>
                    <td className="px-2 text-center"><StatusBadge status={item.status} /></td>
                    <td className="px-2 text-center">{item.version}</td>
                    <td className="px-2">{item.authorName}</td>
                    <td className="px-2 text-gray-500">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('ko-KR') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </FixedLayout>
  );
}
