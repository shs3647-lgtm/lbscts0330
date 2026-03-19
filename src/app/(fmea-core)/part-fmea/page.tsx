/**
 * @file page.tsx
 * @description Part FMEA 대시보드 페이지
 * - 상태별 통계 카드
 * - Part FMEA 목록 테이블
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FixedLayout } from '@/components/layout';
import PartFmeaTopNav from './components/PartFmeaTopNav';
import { toast } from '@/hooks/useToast';

// ─── 타입 ───

interface PartFmeaItem {
  id: string;
  partCode: string;
  customerName: string;
  productName: string;
  sourceType: string;
  status: string;
  version: string;
  updatedAt: string;
}

interface StatusCount {
  total: number;
  familyRef: number;
  independent: number;
  approved: number;
}

// ─── 상수 ───

const STATUS_BG: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  REVIEW: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700',
  SUPERSEDED: 'bg-red-100 text-red-700',
};

const SOURCE_BG: Record<string, string> = {
  FAMILY_REF: 'bg-blue-100 text-blue-700',
  INDEPENDENT: 'bg-orange-100 text-orange-700',
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

// ─── 배지 ───

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BG[status] || 'bg-gray-100 text-gray-600';
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${cls}`}>{status}</span>;
}

function SourceBadge({ sourceType }: { sourceType: string }) {
  const label = sourceType === 'FAMILY_REF' ? '참조모드' : '독립모드';
  const cls = SOURCE_BG[sourceType] || 'bg-gray-100 text-gray-600';
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${cls}`}>{label}</span>;
}

// ─── 메인 페이지 ───

export default function PartFmeaDashboardPage() {
  const [items, setItems] = useState<PartFmeaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<StatusCount>({ total: 0, familyRef: 0, independent: 0, approved: 0 });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/part-fmea/list');
      if (!res.ok) throw new Error(`API 오류: ${res.status}`);
      const data = await res.json();
      const list: PartFmeaItem[] = data.data || [];
      setItems(list);

      setCounts({
        total: list.length,
        familyRef: list.filter((i) => i.sourceType === 'FAMILY_REF').length,
        independent: list.filter((i) => i.sourceType === 'INDEPENDENT').length,
        approved: list.filter((i) => i.status === 'APPROVED').length,
      });
    } catch (error) {
      console.error('Part FMEA 목록 로드 실패:', error);
      toast.error('Part FMEA 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <FixedLayout>
      <PartFmeaTopNav />
      <div className="pt-10 px-4 pb-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-gray-800">Part FMEA 대시보드</h1>
          <button
            onClick={fetchData}
            className="px-3 py-1 text-xs bg-red-700 text-white rounded hover:bg-red-800 transition-colors"
          >
            새로고침
          </button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <StatCard label="전체" value={counts.total} color="#c62828" />
          <StatCard label="참조모드" value={counts.familyRef} color="#1565c0" />
          <StatCard label="독립모드" value={counts.independent} color="#e65100" />
          <StatCard label="APPROVED" value={counts.approved} color="#4caf50" />
        </div>

        {/* 테이블 */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[5%]">No</th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[12%]">코드</th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[12%]">고객사</th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[18%]">제품명</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-600 w-[10%]">소스타입</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-600 w-[8%]">상태</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-600 w-[7%]">버전</th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[12%]">수정일</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">로딩 중...</td></tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    등록된 Part FMEA가 없습니다. &apos;새 P/F 생성&apos;에서 추가하세요.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="border-b hover:bg-red-50/50 cursor-pointer transition-colors"
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => { window.location.href = `/part-fmea/${item.id}`; }}
                  >
                    <td className="px-2">{idx + 1}</td>
                    <td className="px-2 font-mono text-red-700">{item.partCode}</td>
                    <td className="px-2">{item.customerName}</td>
                    <td className="px-2 truncate max-w-[200px]">{item.productName}</td>
                    <td className="px-2 text-center"><SourceBadge sourceType={item.sourceType} /></td>
                    <td className="px-2 text-center"><StatusBadge status={item.status} /></td>
                    <td className="px-2 text-center">{item.version}</td>
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
