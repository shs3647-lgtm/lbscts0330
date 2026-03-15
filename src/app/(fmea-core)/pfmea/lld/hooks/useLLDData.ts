/**
 * @file useLLDData.ts
 * @description LLD 데이터 로드/필터/정렬/CRUD 훅 (SRP)
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  LLDRow, LLDStats, CLASSIFICATION_OPTIONS, CLASSIFICATION_LABELS,
  createEmptyLLDRow,
} from '../types';

export function useLLDData() {
  const [data, setData] = useState<LLDRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClassification, setFilterClassification] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string>('lldNo');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // ── 데이터 로드 ──
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/lld');
        const result = await res.json();
        if (result.success && result.items?.length > 0) {
          setData(result.items.map((item: LLDRow) => ({
            ...item,
            severity: item.severity ?? null,
            occurrence: item.occurrence ?? null,
            detection: item.detection ?? null,
            preventionImprovement: item.preventionImprovement || '',
            detectionImprovement: item.detectionImprovement || '',
            owner: item.owner || '',
            attachmentUrl: item.attachmentUrl || '',
          })));
        }
      } catch (error) { console.error('[LLD] 로드 오류:', error); }
      finally { setIsLoading(false); }
    })();
  }, []);

  // ── 통계 ──
  const stats = useMemo<LLDStats>(() => {
    const byClassification: Record<string, number> = {};
    for (const c of CLASSIFICATION_OPTIONS) byClassification[c] = 0;
    for (const row of data) byClassification[row.classification] = (byClassification[row.classification] || 0) + 1;
    return {
      total: data.length,
      completed: data.filter(d => d.status === 'G').length,
      inProgress: data.filter(d => d.status === 'Y').length,
      pending: data.filter(d => d.status === 'R').length,
      byClassification,
    };
  }, [data]);

  // ── 정렬 ──
  const handleSort = useCallback((key: string) => {
    setSortKey(prev => { setSortDir(d => prev === key ? (d === 'asc' ? 'desc' : 'asc') : 'asc'); return key; });
  }, []);

  // ── 필터링 + 정렬 ──
  const filteredData = useMemo(() => {
    const filtered = data.filter(row => {
      if (filterClassification !== 'all' && row.classification !== filterClassification) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const searchable = [
          row.lldNo, CLASSIFICATION_LABELS[row.classification],
          row.processNo, row.processName, row.productName,
          row.failureMode, row.cause,
          row.preventionImprovement, row.detectionImprovement,
          row.improvement, row.vehicle, row.owner, row.fmeaId,
        ].join(' ').toLowerCase();
        if (!searchable.includes(s)) return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''), 'ko', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, searchTerm, filterClassification, sortKey, sortDir]);

  // ── CRUD ──
  const handleCellChange = useCallback((id: string, field: keyof LLDRow, value: string | number | null) => {
    setData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  }, []);

  const handleAddRow = useCallback(() => setData(prev => [...prev, createEmptyLLDRow()]), []);

  const handleDeleteRow = useCallback((id: string) => {
    if (confirm('삭제하시겠습니까?')) setData(prev => prev.filter(r => r.id !== id));
  }, []);

  const handleSave = async () => {
    const invalid = data.find(r => !r.processName || !r.productName);
    if (invalid) { alert(`필수 필드 누락: ${invalid.lldNo} — 공정명, 제품명은 필수입니다.`); return; }
    try {
      const res = await fetch('/api/lld', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: data }) });
      const result = await res.json();
      if (result.success) alert(`저장 완료 (${result.count}건)`);
      else alert('저장 실패: ' + (result.error || '알 수 없는 오류'));
    } catch (error) { console.error('[LLD Save] 오류:', error); alert('저장 중 오류가 발생했습니다.'); }
  };

  const handleDeploy = async () => {
    const source = prompt('소스 제품명을 입력하세요 (복사할 LLD의 제품명):');
    if (!source) return;
    const target = prompt('대상 제품명을 입력하세요 (전개할 제품명):');
    if (!target) return;
    try {
      const res = await fetch('/api/lld/deploy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceProductName: source, targetProductName: target }) });
      const result = await res.json();
      if (result.success) { alert(result.message); const r = await fetch('/api/lld'); const rr = await r.json(); if (rr.success) setData(rr.items); }
      else alert('수평전개 실패: ' + (result.error || ''));
    } catch (error) { console.error('[LLD Deploy] 오류:', error); alert('수평전개 중 오류'); }
  };

  const sortArrow = (key: string) => {
    if (sortKey === key) return sortDir === 'asc' ? '▲' : '▼';
    return '▽';
  };

  return {
    data, setData, isLoading,
    searchTerm, setSearchTerm,
    filterClassification, setFilterClassification,
    stats, filteredData,
    handleSort, sortArrow,
    handleCellChange, handleAddRow, handleDeleteRow,
    handleSave, handleDeploy,
  };
}
