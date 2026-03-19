/**
 * @file page.tsx
 * @description Family FMEA 공정별 목록 페이지
 * - 검색 + 상태 필터
 * - 행 클릭 시 상세 페이지로 이동
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FixedLayout } from '@/components/layout';
import FamilyTopNav from '../components/FamilyTopNav';
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
  cpCount: number;
  pfdCount: number;
  updatedAt: string;
}

// ─── 상수 ───

const STATUS_OPTIONS = ['전체', 'DRAFT', 'REVIEW', 'APPROVED', 'SUPERSEDED'] as const;

const STATUS_BG: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  REVIEW: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700',
  SUPERSEDED: 'bg-red-100 text-red-700',
};

const ROW_HEIGHT = 28;

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

export default function FamilyFmeaListPage() {
  const [items, setItems] = useState<FamilyFmeaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('전체');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/family-fmea/list');
      if (!res.ok) throw new Error(`API 오류: ${res.status}`);
      const data = await res.json();
      setItems(data.data || []);
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

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== '전체' && item.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          item.familyCode.toLowerCase().includes(q) ||
          item.processNo.toLowerCase().includes(q) ||
          item.processName.toLowerCase().includes(q) ||
          item.authorName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, search, statusFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  return (
    <FixedLayout>
      <FamilyTopNav />
      <div className="pt-10 px-4 pb-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-800">공정별 Family FMEA</h1>
          <span className="text-xs text-gray-500">
            {filteredItems.length}건 / 전체 {items.length}건
          </span>
        </div>

        {/* 필터 바 */}
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            placeholder="코드, 공정번호, 공정명, 담당자 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 max-w-sm px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex gap-1">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* 테이블 */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-1 py-1.5 w-[3%]">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                    onChange={toggleSelectAll}
                    className="w-3 h-3"
                  />
                </th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[12%]">코드</th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[8%]">공정번호</th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[18%]">공정명</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-600 w-[8%]">상태</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-600 w-[6%]">버전</th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[9%]">담당자</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-600 w-[6%]">CP수</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-600 w-[6%]">PFD수</th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[12%]">수정일</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-400">로딩 중...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-400">
                    {items.length === 0
                      ? "등록된 Family FMEA가 없습니다."
                      : "검색 결과가 없습니다."}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b hover:bg-blue-50/50 cursor-pointer transition-colors"
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => { window.location.href = `/pfmea/family/${item.id}`; }}
                  >
                    <td className="px-1 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="w-3 h-3"
                      />
                    </td>
                    <td className="px-2 font-mono text-blue-700">{item.familyCode}</td>
                    <td className="px-2">{item.processNo}</td>
                    <td className="px-2 truncate max-w-[200px]">{item.processName}</td>
                    <td className="px-2 text-center"><StatusBadge status={item.status} /></td>
                    <td className="px-2 text-center">{item.version}</td>
                    <td className="px-2">{item.authorName}</td>
                    <td className="px-2 text-center">{item.cpCount ?? 0}</td>
                    <td className="px-2 text-center">{item.pfdCount ?? 0}</td>
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
