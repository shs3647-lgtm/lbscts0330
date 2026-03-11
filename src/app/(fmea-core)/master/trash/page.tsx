/**
 * @file 휴지통 페이지
 * @description Soft Delete된 레코드 조회/복원/영구삭제
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { FixedLayout, AdminTopNav } from '@/components/layout';
import { useLocale } from '@/lib/locale';
import { TrashActionBar } from './TrashActionBar';

interface TrashItem {
  id: string;
  module: string;
  docNo: string;
  title: string;
  customerName: string;
  deletedAt: string;
}

const MODULE_TABS = ['전체', 'APQP', 'PFMEA', 'DFMEA', 'CP', 'PFD', 'WS', 'PM'] as const;

export default function TrashPage() {
  const { t } = useLocale();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>('전체');
  const [search, setSearch] = useState('');

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const moduleParam = activeTab !== '전체' ? `?module=${activeTab}` : '';
      const res = await fetch(`/api/trash${moduleParam}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.items || []);
      }
    } catch (err) {
      console.error('[Trash] 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  // 검색 필터링
  const filteredItems = items.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      item.docNo.toLowerCase().includes(s) ||
      item.title.toLowerCase().includes(s) ||
      item.customerName.toLowerCase().includes(s)
    );
  });

  // 선택 토글
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
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
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  // 복원
  const handleRestore = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}건을 복원하시겠습니까?`)) return;

    const selectedItems = items
      .filter(i => selectedIds.has(i.id))
      .map(i => ({ module: i.module, docNo: i.docNo }));

    try {
      const res = await fetch('/api/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', items: selectedItems }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`${json.processed}건 복원 완료`);
        setSelectedIds(new Set());
        fetchTrash();
      } else {
        alert(`복원 실패: ${json.error}`);
      }
    } catch (err) {
      alert('복원 중 오류 발생');
    }
  };

  // 영구삭제
  const handlePermanentDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}건을 영구삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

    const selectedItems = items
      .filter(i => selectedIds.has(i.id))
      .map(i => ({ module: i.module, docNo: i.docNo }));

    try {
      const res = await fetch('/api/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'permanentDelete', items: selectedItems }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`${json.processed}건 영구삭제 완료`);
        setSelectedIds(new Set());
        fetchTrash();
      } else {
        alert(`영구삭제 실패: ${json.error}`);
      }
    } catch (err) {
      alert('영구삭제 중 오류 발생');
    }
  };

  // 모듈별 배지 색상
  const getModuleBadgeColor = (module: string) => {
    const colors: Record<string, string> = {
      APQP: 'bg-purple-100 text-purple-700',
      PFMEA: 'bg-blue-100 text-blue-700',
      DFMEA: 'bg-cyan-100 text-cyan-700',
      CP: 'bg-green-100 text-green-700',
      PFD: 'bg-orange-100 text-orange-700',
      WS: 'bg-yellow-100 text-yellow-700',
      PM: 'bg-red-100 text-red-700',
    };
    return colors[module] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <FixedLayout topNav={<AdminTopNav />} showSidebar={true}>
      <div className="flex flex-col h-full">
        {/* 액션바 */}
        <TrashActionBar
          search={search}
          onSearchChange={setSearch}
          activeTab={activeTab}
          tabs={MODULE_TABS as unknown as string[]}
          onTabChange={(tab) => { setActiveTab(tab); setSelectedIds(new Set()); }}
          selectedCount={selectedIds.size}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
          onRefresh={fetchTrash}
        />

        {/* 테이블 */}
        <div className="flex-1 overflow-auto px-4 pb-4">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="w-8 p-2 text-center">
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="w-10 p-2 text-center text-xs font-medium text-gray-500">No</th>
                <th className="w-20 p-2 text-center text-xs font-medium text-gray-500" title="Module">모듈(Module)</th>
                <th className="p-2 text-left text-xs font-medium text-gray-500" title="Document Number">문서번호(Doc. No.)</th>
                <th className="p-2 text-left text-xs font-medium text-gray-500" title="Title">제목(Title)</th>
                <th className="w-32 p-2 text-left text-xs font-medium text-gray-500" title="Customer">고객사(Customer)</th>
                <th className="w-36 p-2 text-center text-xs font-medium text-gray-500" title="Deleted Date/Time">삭제일시(Deleted At)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    {t('로딩 중...')}
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    {t('휴지통이 비어 있습니다')}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-100 hover:bg-blue-50 cursor-pointer ${selectedIds.has(item.id) ? 'bg-blue-50' : ''}`}
                    onClick={() => toggleSelect(item.id)}
                  >
                    <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="p-2 text-center text-xs text-gray-400">{idx + 1}</td>
                    <td className="p-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getModuleBadgeColor(item.module)}`}>
                        {item.module}
                      </span>
                    </td>
                    <td className="p-2 text-xs font-mono">{item.docNo}</td>
                    <td className="p-2 text-xs truncate max-w-[300px]">{item.title || '-'}</td>
                    <td className="p-2 text-xs text-gray-600 truncate">{item.customerName || '-'}</td>
                    <td className="p-2 text-center text-xs text-gray-400">{formatDate(item.deletedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 상태바 */}
        <div className="h-7 px-4 flex items-center justify-between bg-gray-50 border-t text-xs text-gray-500">
          <span>
            {t('전체')} {filteredItems.length}{t('건')}
            {selectedIds.size > 0 && ` | ${selectedIds.size}${t('건')} ${t('선택됨')}`}
          </span>
        </div>
      </div>
    </FixedLayout>
  );
}
