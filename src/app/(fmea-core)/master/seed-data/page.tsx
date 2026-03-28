'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface FlatItem {
  id: string;
  processNo: string;
  category: string;
  itemCode: string;
  value: string;
  m4?: string;
  parentItemId?: string;
}


type TabId = 'structure' | 'l1func' | 'l2func' | 'l3func' | 'failure';

const TABS: { id: TabId; label: string; codes: string[] }[] = [
  { id: 'structure', label: '구조 (공정/작업요소)', codes: ['A1', 'A2', 'B1'] },
  { id: 'l1func', label: '1기능 (구분/완제품기능/요구사항)', codes: ['C1', 'C2', 'C3'] },
  { id: 'l2func', label: '2기능 (공정기능/제품특성)', codes: ['A3', 'A4'] },
  { id: 'l3func', label: '3기능 (요소기능/공정특성)', codes: ['B2', 'B3'] },
  { id: 'failure', label: '고장 (고장형태/원인/영향)', codes: ['A5', 'B4', 'C4'] },
];

const CODE_LABELS: Record<string, string> = {
  A1: '공정번호', A2: '공정명', A3: '공정기능', A4: '제품특성', A5: '고장형태',
  B1: '작업요소', B2: '요소기능', B3: '공정특성', B4: '고장원인',
  C1: '구분', C2: '완제품기능', C3: '요구사항', C4: '고장영향',
};

const CODE_COLORS: Record<string, string> = {
  A1: '#e3f2fd', A2: '#e3f2fd', A3: '#e8f5e9', A4: '#e8f5e9', A5: '#fce4ec',
  B1: '#fff3e0', B2: '#e8f5e9', B3: '#e8f5e9', B4: '#fce4ec',
  C1: '#f3e5f5', C2: '#e8f5e9', C3: '#e8f5e9', C4: '#fce4ec',
};

export default function SeedDataPage() {
  const [items, setItems] = useState<FlatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabId>('structure');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // 시드 데이터 로드
  useEffect(() => {
    setLoading(true);
    fetch('/api/master/seed-data')
      .then(r => r.json())
      .then(d => { if (d.success) setItems(d.items); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const currentCodes = TABS.find(t => t.id === tab)?.codes || [];

  const processNameMap = useMemo(() => {
    const map = new Map<string, string>();
    items.filter(i => i.itemCode === 'A2').forEach(i => map.set(i.processNo, i.value));
    return map;
  }, [items]);

  const c2Map = useMemo(() => {
    const map = new Map<string, string>();
    items.filter(i => i.itemCode === 'C2').forEach(i => map.set(i.id, i.value));
    return map;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items
      .filter(i => currentCodes.includes(i.itemCode))
      .sort((a, b) => {
        const pA = parseInt(a.processNo) || 0;
        const pB = parseInt(b.processNo) || 0;
        if (pA !== pB) return pA - pB;
        return currentCodes.indexOf(a.itemCode) - currentCodes.indexOf(b.itemCode);
      });
  }, [items, currentCodes]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    TABS.forEach(t => { counts[t.id] = items.filter(i => t.codes.includes(i.itemCode)).length; });
    return counts;
  }, [items]);

  const handleSave = useCallback(async () => {
    if (!editingId) return;
    try {
      await fetch('/api/master/seed-data', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, value: editValue.trim() }),
      });
      setItems(prev => prev.map(i => i.id === editingId ? { ...i, value: editValue.trim() } : i));
    } catch (e) { console.error(e); }
    setEditingId(null);
  }, [editingId, editValue]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await fetch('/api/master/seed-data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error(e); }
  }, []);

  const renderCell = (item: FlatItem) => {
    if (editingId === item.id) {
      return (
        <input type="text" value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditingId(null); }}
          autoFocus className="w-full px-1 py-0.5 text-xs border border-blue-400 rounded" />
      );
    }
    return (
      <span className="cursor-pointer hover:text-blue-600 block px-1"
        onClick={() => { setEditingId(item.id); setEditValue(item.value); }}>
        {item.value || <span className="text-gray-300">(빈값)</span>}
      </span>
    );
  };

  // 구조 탭
  const renderStructureTab = () => {
    const groups = new Map<string, { no: string; name: string; l3: FlatItem[] }>();
    filteredItems.forEach(item => {
      if (item.itemCode === 'A1' || item.itemCode === 'A2') {
        if (!groups.has(item.processNo)) groups.set(item.processNo, { no: item.processNo, name: '', l3: [] });
        if (item.itemCode === 'A2') groups.get(item.processNo)!.name = item.value;
      }
      if (item.itemCode === 'B1') {
        if (!groups.has(item.processNo)) groups.set(item.processNo, { no: item.processNo, name: processNameMap.get(item.processNo) || '', l3: [] });
        groups.get(item.processNo)!.l3.push(item);
      }
    });
    return (
      <table className="w-full border-collapse text-xs">
        <thead><tr className="bg-[#00587a] text-white text-[10px]">
          <th className="border border-white/40 px-2 py-1.5 w-16">공정번호</th>
          <th className="border border-white/40 px-2 py-1.5 w-36">공정명</th>
          <th className="border border-white/40 px-2 py-1.5 w-12">4M</th>
          <th className="border border-white/40 px-2 py-1.5">작업요소</th>
          <th className="border border-white/40 px-2 py-1.5 w-10">삭제</th>
        </tr></thead>
        <tbody>
          {Array.from(groups.values()).map(g => {
            if (g.l3.length === 0) return (
              <tr key={g.no} className="hover:bg-blue-50">
                <td className="border px-2 py-1 text-center font-bold">{g.no}</td>
                <td className="border px-2 py-1">{g.name}</td>
                <td className="border px-2 py-1 text-center text-gray-300">-</td>
                <td className="border px-2 py-1 text-gray-300">(작업요소 없음)</td>
                <td className="border px-1 text-center">-</td>
              </tr>
            );
            return g.l3.map((we, idx) => (
              <tr key={we.id} className="hover:bg-blue-50">
                {idx === 0 && <td rowSpan={g.l3.length} className="border px-2 py-1 text-center font-bold align-top">{g.no}</td>}
                {idx === 0 && <td rowSpan={g.l3.length} className="border px-2 py-1 align-top">{g.name}</td>}
                <td className="border px-1 py-0.5 text-center text-[10px]" style={{ background: we.m4 === 'MN' ? '#e8f5e9' : we.m4 === 'MC' ? '#e3f2fd' : we.m4 === 'IM' ? '#fff3e0' : we.m4 === 'EN' ? '#fce4ec' : '' }}>{we.m4 || '-'}</td>
                <td className="border px-1 py-0.5">{renderCell(we)}</td>
                <td className="border px-1 text-center"><button onClick={() => handleDelete(we.id)} className="text-red-400 hover:text-red-600 text-[10px]">X</button></td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    );
  };

  // 1기능 탭: C2→C3 트리
  const renderL1FuncTab = () => {
    const c1Items = filteredItems.filter(i => i.itemCode === 'C1');
    const c2Items = filteredItems.filter(i => i.itemCode === 'C2');
    const c3Items = filteredItems.filter(i => i.itemCode === 'C3');
    return (
      <table className="w-full border-collapse text-xs">
        <thead><tr className="bg-[#00587a] text-white text-[10px]">
          <th className="border border-white/40 px-2 py-1.5 w-16">구분(C1)</th>
          <th className="border border-white/40 px-2 py-1.5 w-[200px]">완제품기능 (C2)</th>
          <th className="border border-white/40 px-2 py-1.5">요구사항 (C3)</th>
          <th className="border border-white/40 px-2 py-1.5 w-10">삭제</th>
        </tr></thead>
        <tbody>
          {c2Items.map(c2 => {
            const reqs = c3Items.filter(c3 => c3.parentItemId === c2.id);
            if (reqs.length === 0) return (
              <tr key={c2.id} className="hover:bg-blue-50">
                <td className="border px-2 py-1 text-center font-bold" style={{ background: '#f3e5f5' }}>{c2.processNo || '-'}</td>
                <td className="border px-1 py-0.5" style={{ background: '#e8f5e9' }}>{renderCell(c2)}</td>
                <td className="border px-2 py-1 text-gray-300">(요구사항 없음)</td>
                <td className="border px-1 text-center"><button onClick={() => handleDelete(c2.id)} className="text-red-400 hover:text-red-600 text-[10px]">X</button></td>
              </tr>
            );
            return reqs.map((req, idx) => (
              <tr key={req.id} className="hover:bg-blue-50">
                {idx === 0 && <td rowSpan={reqs.length} className="border px-2 py-1 text-center font-bold align-top" style={{ background: '#f3e5f5' }}>{c2.processNo || '-'}</td>}
                {idx === 0 && <td rowSpan={reqs.length} className="border px-1 py-0.5 align-top" style={{ background: '#e8f5e9' }}>{renderCell(c2)}</td>}
                <td className="border px-1 py-0.5">{renderCell(req)}</td>
                <td className="border px-1 text-center"><button onClick={() => handleDelete(req.id)} className="text-red-400 hover:text-red-600 text-[10px]">X</button></td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    );
  };

  // 공정별 그룹 렌더러 (2기능/3기능/고장)
  const renderGroupedTab = () => {
    const cols = currentCodes;
    const colLabels = cols.map(c => CODE_LABELS[c] || c);

    // 공정별로 그룹화
    const groups = new Map<string, Map<string, FlatItem[]>>();
    filteredItems.forEach(item => {
      const pno = item.processNo || '';
      if (!groups.has(pno)) groups.set(pno, new Map());
      const codeMap = groups.get(pno)!;
      if (!codeMap.has(item.itemCode)) codeMap.set(item.itemCode, []);
      codeMap.get(item.itemCode)!.push(item);
    });

    return (
      <table className="w-full border-collapse text-xs">
        <thead><tr className="bg-[#00587a] text-white text-[10px]">
          <th className="border border-white/40 px-2 py-1.5 w-28">공정NO+공정명</th>
          {colLabels.map((label, i) => (
            <th key={cols[i]} className="border border-white/40 px-2 py-1.5" style={{ background: CODE_COLORS[cols[i]] ? '#00587a' : undefined }}>{label} ({cols[i]})</th>
          ))}
        </tr></thead>
        <tbody>
          {Array.from(groups.entries()).map(([pno, codeMap]) => {
            const maxRows = Math.max(1, ...Array.from(codeMap.values()).map(arr => arr.length));
            return Array.from({ length: maxRows }).map((_, rowIdx) => (
              <tr key={`${pno}-${rowIdx}`} className="hover:bg-blue-50">
                {rowIdx === 0 && (
                  <td rowSpan={maxRows} className="border px-2 py-1 text-center font-bold align-top text-[10px]">
                    {pno ? `${pno} ${processNameMap.get(pno) || ''}` : '-'}
                  </td>
                )}
                {cols.map(code => {
                  const arr = codeMap.get(code) || [];
                  const item = arr[rowIdx];
                  return (
                    <td key={code} className="border px-1 py-0.5" style={{ background: item ? CODE_COLORS[code] || '' : '' }}>
                      {item ? (
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex-1">{renderCell(item)}</div>
                          <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600 text-[10px] shrink-0">X</button>
                        </div>
                      ) : ''}
                    </td>
                  );
                })}
              </tr>
            ));
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-sm font-bold">시드 데이터 관리</h1>
          <p className="text-[10px] text-gray-400">새 마스터 FMEA 생성 시 자동 복사되는 기초 데이터</p>
        </div>
        <span className="text-[10px] text-gray-400">총 {items.length}건</span>
      </div>

      <div className="flex gap-1 mb-3 border-b">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`text-[11px] px-3 py-1.5 rounded-t font-bold ${tab === t.id ? 'bg-[#00587a] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.label} ({tabCounts[t.id] || 0})
          </button>
        ))}
      </div>

      <div className="overflow-auto max-h-[calc(100vh-200px)]">
        {loading ? <div className="text-center py-8 text-gray-400">로딩 중...</div>
          : tab === 'structure' ? renderStructureTab()
          : tab === 'l1func' ? renderL1FuncTab()
          : renderGroupedTab()}
      </div>
    </div>
  );
}
