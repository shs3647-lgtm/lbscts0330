'use client';

/**
 * @file CpMasterInfoTable.tsx
 * @description CP 기초정보(마스터) 조회 패널 — 검색/소팅/체크박스/일괄삭제/적합뱃지/통계
 * @updated 2026-03-05 검색, 소팅, 체크박스 선택, 일괄삭제, 적합 뱃지, 헤더 통계 추가
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// ── 타입 ──
interface FlatItem {
  id: string;
  processNo: string;
  category: string;
  itemCode: string;
  value: string;
}

interface ProcessRow {
  processNo: string;
  processName: string;
  level: string;
  processDesc: string;
  equipment: string;
  ep: string;
  autoDetector: string;
  productChars: string[];
  processChars: string[];
  specialChars: string[];
  specs: string[];
  evalMethods: string[];
  sampleSizes: string[];
  frequencies: string[];
  owners1: string[];
  owners2: string[];
  reactionPlans: string[];
  controlItemCount: number;
  methodCount: number;
  isComplete: boolean;
  id: string;
}

type CategoryFilter = 'ALL' | 'A' | 'B';
type SortKey = 'processNo' | 'processName' | 'controlItemCount';
type SortDir = 'asc' | 'desc';

// ── 매핑 ──
function buildProcessRows(items: FlatItem[]): ProcessRow[] {
  const map = new Map<string, Omit<ProcessRow, 'controlItemCount' | 'methodCount' | 'isComplete' | 'id'>>();

  const ensure = (pno: string) => {
    if (!map.has(pno)) {
      map.set(pno, {
        processNo: pno, processName: '', level: '', processDesc: '',
        equipment: '', ep: '', autoDetector: '',
        productChars: [], processChars: [], specialChars: [], specs: [],
        evalMethods: [], sampleSizes: [], frequencies: [],
        owners1: [], owners2: [], reactionPlans: [],
      });
    }
    return map.get(pno)!;
  };

  for (const item of items) {
    const row = ensure(item.processNo);
    const v = item.value;
    switch (item.itemCode) {
      case 'A1': break;
      case 'A2': row.processName = v; break;
      case 'A3': row.level = v; break;
      case 'A4': row.processDesc = v; break;
      case 'A5': row.equipment = v; break;
      case 'A6': row.ep = v; break;
      case 'A7': row.autoDetector = v; break;
      case 'B1': if (!row.productChars.includes(v)) row.productChars.push(v); break;
      case 'B2': if (!row.processChars.includes(v)) row.processChars.push(v); break;
      case 'B3': if (!row.specialChars.includes(v)) row.specialChars.push(v); break;
      case 'B4': if (!row.specs.includes(v)) row.specs.push(v); break;
      case 'B5': if (!row.evalMethods.includes(v)) row.evalMethods.push(v); break;
      case 'B6': if (!row.sampleSizes.includes(v)) row.sampleSizes.push(v); break;
      case 'B7': if (!row.frequencies.includes(v)) row.frequencies.push(v); break;
      case 'B8': if (!row.owners1.includes(v)) row.owners1.push(v); break;
      case 'B9': if (!row.owners2.includes(v)) row.owners2.push(v); break;
      case 'B10': if (!row.reactionPlans.includes(v)) row.reactionPlans.push(v); break;
    }
  }

  return Array.from(map.values())
    .map((base): ProcessRow => {
      const controlItemCount = base.productChars.length + base.processChars.length;
      const methodCount = base.evalMethods.length;
      const hasControlItem = controlItemCount > 0;
      const hasSpec = base.specs.length > 0;
      const isComplete = !!base.processName && hasControlItem && hasSpec;
      return { ...base, controlItemCount, methodCount, isComplete, id: base.processNo };
    })
    .sort((a, b) => (parseInt(a.processNo) || 0) - (parseInt(b.processNo) || 0));
}

// ── 카테고리별 건수 ──
function countByCategory(items: FlatItem[]): { a: number; b: number } {
  let a = 0, b = 0;
  for (const i of items) {
    if (i.category === 'A') a++;
    else if (i.category === 'B') b++;
  }
  return { a, b };
}

// ── Props ──
interface Props {
  cpNo: string;
  isOpen: boolean;
}

// ── 스타일 ──
const filterBtn = (active: boolean) =>
  `px-2.5 py-0.5 text-[10px] font-semibold rounded-sm cursor-pointer transition-colors ${
    active
      ? 'bg-white text-[#00587a]'
      : 'text-blue-100 hover:bg-[#004d6b] hover:text-white'
  }`;

const badgeStyle = (color: string) =>
  `ml-1 px-1.5 py-px rounded-full text-[9px] font-bold ${color}`;

const TH_BASE = 'px-1 py-1 border-b border-gray-300 font-semibold text-[10px]';

/** 정렬 화살표 */
function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-0.5 text-gray-400 text-[8px]">⇅</span>;
  return <span className="ml-0.5 text-[8px]">{dir === 'asc' ? '▲' : '▼'}</span>;
}

/** 적합 뱃지 — 클릭 시 워크시트 이동 */
function CompletenessBadge({ isComplete, cpNo }: { isComplete: boolean; cpNo: string }) {
  if (!isComplete) return null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        window.location.href = `/control-plan/worksheet?cpNo=${cpNo}`;
      }}
      className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap bg-green-100 text-green-700 border-green-300 border hover:bg-green-200 cursor-pointer"
      title="워크시트로 이동"
    >
      적합(OK)
    </button>
  );
}

export default function CpMasterInfoTable({ cpNo, isOpen }: Props) {
  const [items, setItems] = useState<FlatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<CategoryFilter>('ALL');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('processNo');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const fetchMaster = useCallback(async () => {
    if (!cpNo) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/control-plan/master?cpNo=${cpNo}&includeItems=true`);
      const json = await res.json();
      setItems(json.active?.flatItems ?? []);
      setCheckedIds(new Set());
    } catch (err) {
      console.error('[CpMasterInfoTable] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [cpNo]);

  useEffect(() => {
    if (isOpen) fetchMaster();
  }, [isOpen, fetchMaster]);

  // ── 행 빌드 ──
  const allRows = useMemo(() => buildProcessRows(items), [items]);
  const counts = useMemo(() => countByCategory(items), [items]);

  // ── 헤더 통계 ──
  const stats = useMemo(() => {
    const totalControlItems = allRows.reduce((sum, r) => sum + r.controlItemCount, 0);
    const totalMethods = allRows.reduce((sum, r) => sum + r.methodCount, 0);
    return { processCount: allRows.length, controlItemCount: totalControlItems, methodCount: totalMethods };
  }, [allRows]);

  // ── 검색 필터 ──
  const searchedRows = useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.trim().toLowerCase();
    return allRows.filter(
      (r) => r.processNo.toLowerCase().includes(q) || r.processName.toLowerCase().includes(q),
    );
  }, [allRows, search]);

  // ── 정렬 ──
  const rows = useMemo(() => {
    const sorted = [...searchedRows];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'processNo':
          cmp = (parseInt(a.processNo) || 0) - (parseInt(b.processNo) || 0);
          break;
        case 'processName':
          cmp = a.processName.localeCompare(b.processName, 'ko');
          break;
        case 'controlItemCount':
          cmp = a.controlItemCount - b.controlItemCount;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [searchedRows, sortKey, sortDir]);

  // ── 정렬 토글 ──
  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortDir('asc');
      }
      return key;
    });
  }, []);

  // ── 체크박스 핸들러 ──
  const handleToggleCheck = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    setCheckedIds((prev) => {
      if (prev.size === rows.length && rows.length > 0) return new Set();
      return new Set(rows.map((r) => r.id));
    });
  }, [rows]);

  // ── 일괄 삭제 ──
  const handleBulkDelete = useCallback(async () => {
    if (checkedIds.size === 0) return;
    const confirmed = window.confirm(`선택한 ${checkedIds.size}개 공정의 기초정보를 삭제하시겠습니까?`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      // 선택된 processNo에 해당하는 모든 flatItem을 삭제 대상으로 구성
      const deleteItems = items
        .filter((item) => checkedIds.has(item.processNo))
        .map((item) => ({
          itemCode: item.itemCode,
          value: item.value,
          processNo: item.processNo,
        }));

      const res = await fetch('/api/control-plan/master', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpNo, items: deleteItems }),
      });
      const json = await res.json();

      if (json.success) {
        await fetchMaster();
      } else {
        console.error('[CpMasterInfoTable] delete error:', json.error);
      }
    } catch (err) {
      console.error('[CpMasterInfoTable] delete error:', err);
    } finally {
      setDeleting(false);
    }
  }, [checkedIds, items, cpNo, fetchMaster]);

  if (!isOpen) return null;

  const isAllChecked = rows.length > 0 && checkedIds.size === rows.length;

  return (
    <div className="mb-4 rounded overflow-hidden border border-gray-300 bg-white">
      {/* ── 헤더 바 ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#00587a]">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-white" title="CP Master Info Status">CP 기초정보 현황(Master Status)</span>

          {/* 카테고리 필터 탭 */}
          <div className="flex items-center gap-1 ml-2">
            <button className={filterBtn(filter === 'ALL')} onClick={() => setFilter('ALL')}>
              전체(All)<span className={badgeStyle('bg-blue-100 text-blue-700')}>{items.length}</span>
            </button>
            <button className={filterBtn(filter === 'A')} onClick={() => setFilter('A')}>
              공정현황(Process)<span className={badgeStyle('bg-emerald-100 text-emerald-700')}>{counts.a}</span>
            </button>
            <button className={filterBtn(filter === 'B')} onClick={() => setFilter('B')}>
              관리항목(Control Item)<span className={badgeStyle('bg-purple-100 text-purple-700')}>{counts.b}</span>
            </button>
          </div>

          {/* 통계 */}
          <div className="flex items-center gap-2 ml-3 text-[10px] text-blue-200">
            <span>공정(Process) {stats.processCount}개</span>
            <span className="text-blue-400">|</span>
            <span>관리항목(Control Item) {stats.controlItemCount}건</span>
            <span className="text-blue-400">|</span>
            <span>평가방법(Eval. Method) {stats.methodCount}건</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 검색 */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="공정번호/공정명 검색(Search Process)"
            className="text-[10px] px-2 py-0.5 rounded bg-[#004d6b] text-white placeholder-blue-300 border border-[#006d99] focus:outline-none focus:border-blue-300 w-36"
          />

          {/* 일괄삭제 버튼 */}
          {checkedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="text-[10px] px-2 py-0.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded font-semibold"
            >
              {deleting ? '삭제중...(Deleting)' : `삭제(Delete) (${checkedIds.size})`}
            </button>
          )}

          <button
            onClick={fetchMaster}
            className="text-[10px] px-2 py-0.5 bg-[#004d6b] hover:bg-[#003d5b] text-blue-100 rounded"
          >
            새로고침(Refresh)
          </button>
        </div>
      </div>

      {/* ── 테이블 ── */}
      {loading ? (
        <div className="p-6 text-center text-xs text-gray-400">로딩 중...(Loading)</div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-center text-xs text-gray-400">
          {search.trim()
            ? '검색 결과가 없습니다.'
            : '기초정보가 없습니다. 워크시트에서 데이터를 입력하거나 Import하면 자동으로 생성됩니다.'}
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
          <table className="w-full border-collapse table-fixed text-[10px]">
            <colgroup>
              <col style={{ width: 32 }} />  {/* checkbox */}
              <col style={{ width: 52 }} />  {/* processNo */}
              <col style={{ width: 90 }} />  {/* processName */}
              {filter !== 'B' && <col style={{ width: 90 }} />}
              {filter !== 'B' && <col style={{ width: 80 }} />}
              {filter !== 'A' && <col style={{ width: 100 }} />}
              {filter !== 'A' && <col style={{ width: 100 }} />}
              {filter !== 'A' && <col style={{ width: 60 }} />}
              {filter !== 'A' && <col style={{ width: 80 }} />}
              {filter !== 'A' && <col style={{ width: 80 }} />}
              {filter !== 'A' && <col style={{ width: 70 }} />}
              {filter !== 'A' && <col />}
              <col style={{ width: 50 }} />  {/* 관리항목수 */}
              <col style={{ width: 45 }} />  {/* 판정 */}
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-100">
                {/* 전체선택 체크박스 */}
                <th className={`${TH_BASE} text-center text-gray-600`}>
                  <input
                    type="checkbox"
                    checked={isAllChecked}
                    onChange={handleToggleAll}
                    className="cursor-pointer"
                  />
                </th>
                <th
                  className={`${TH_BASE} text-center text-gray-600 cursor-pointer hover:bg-gray-200 select-none`}
                  onClick={() => handleSort('processNo')}
                >
                  공정번호(No.)<SortArrow active={sortKey === 'processNo'} dir={sortDir} />
                </th>
                <th
                  className={`${TH_BASE} text-left text-gray-600 cursor-pointer hover:bg-gray-200 select-none`}
                  onClick={() => handleSort('processName')}
                >
                  공정명(Process Name)<SortArrow active={sortKey === 'processName'} dir={sortDir} />
                </th>
                {filter !== 'B' && <th className={`${TH_BASE} text-left text-gray-600`} title="Equipment / Mold">설비/금형(Equip.)</th>}
                {filter !== 'B' && <th className={`${TH_BASE} text-left text-gray-600`} title="Process Description">공정설명(Desc.)</th>}
                {filter !== 'A' && <th className={`${TH_BASE} text-left text-emerald-700`} title="Product Characteristics">제품특성(Product Char.)</th>}
                {filter !== 'A' && <th className={`${TH_BASE} text-left text-emerald-700`} title="Process Characteristics">공정특성(Process Char.)</th>}
                {filter !== 'A' && <th className={`${TH_BASE} text-center text-emerald-700`} title="Special Characteristics">특별특성(SC)</th>}
                {filter !== 'A' && <th className={`${TH_BASE} text-left text-purple-700`} title="Specification / Tolerance">스펙/공차(Spec.)</th>}
                {filter !== 'A' && <th className={`${TH_BASE} text-left text-purple-700`} title="Evaluation Method">평가방법(Eval. Method)</th>}
                {filter !== 'A' && <th className={`${TH_BASE} text-left text-purple-700`} title="Frequency">주기(Freq.)</th>}
                {filter !== 'A' && <th className={`${TH_BASE} text-left text-orange-700`} title="Reaction Plan">대응계획(Reaction Plan)</th>}
                <th
                  className={`${TH_BASE} text-center text-gray-600 cursor-pointer hover:bg-gray-200 select-none`}
                  onClick={() => handleSort('controlItemCount')}
                >
                  관리항목(Control Item)<SortArrow active={sortKey === 'controlItemCount'} dir={sortDir} />
                </th>
                <th className={`${TH_BASE} text-center text-gray-600`} title="Judgement">판정(Judge)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={r.processNo}
                  className={`hover:bg-blue-50 ${
                    checkedIds.has(r.id) ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  }`}
                >
                  {/* 체크박스 */}
                  <td className="px-1 py-0.5 border-b border-gray-100 text-center">
                    <input
                      type="checkbox"
                      checked={checkedIds.has(r.id)}
                      onChange={() => handleToggleCheck(r.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-1 py-0.5 border-b border-gray-100 text-center font-mono font-semibold text-blue-700">
                    {r.processNo}
                  </td>
                  <td className="px-1 py-0.5 border-b border-gray-100 font-medium text-gray-800 truncate">
                    {r.processName}
                    {r.level && <span className="ml-1 text-[8px] text-gray-400">{r.level}</span>}
                  </td>
                  {filter !== 'B' && (
                    <td className="px-1 py-0.5 border-b border-gray-100 text-gray-600 truncate">{r.equipment || '-'}</td>
                  )}
                  {filter !== 'B' && (
                    <td className="px-1 py-0.5 border-b border-gray-100 text-gray-600 truncate">{r.processDesc || '-'}</td>
                  )}
                  {filter !== 'A' && (
                    <td className="px-1 py-0.5 border-b border-gray-100 text-gray-700">{r.productChars.join(', ') || '-'}</td>
                  )}
                  {filter !== 'A' && (
                    <td className="px-1 py-0.5 border-b border-gray-100 text-gray-700">{r.processChars.join(', ') || '-'}</td>
                  )}
                  {filter !== 'A' && (
                    <td className="px-1 py-0.5 border-b border-gray-100 text-center">
                      {r.specialChars.length > 0 ? (
                        r.specialChars.map((sc) => (
                          <span
                            key={sc}
                            className={`inline-block px-1 py-px rounded text-[8px] font-bold mr-0.5 ${
                              sc === 'CC' ? 'bg-red-100 text-red-700' :
                              sc === 'SC' ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}
                          >{sc}</span>
                        ))
                      ) : '-'}
                    </td>
                  )}
                  {filter !== 'A' && (
                    <td className="px-1 py-0.5 border-b border-gray-100 text-gray-600 truncate">{r.specs.join(', ') || '-'}</td>
                  )}
                  {filter !== 'A' && (
                    <td className="px-1 py-0.5 border-b border-gray-100 text-gray-600 truncate">{r.evalMethods.join(', ') || '-'}</td>
                  )}
                  {filter !== 'A' && (
                    <td className="px-1 py-0.5 border-b border-gray-100 text-gray-600">{r.frequencies.join(', ') || '-'}</td>
                  )}
                  {filter !== 'A' && (
                    <td className="px-1 py-0.5 border-b border-gray-100 text-gray-600 truncate">{r.reactionPlans.join(', ') || '-'}</td>
                  )}
                  {/* 관리항목 수 */}
                  <td className="px-1 py-0.5 border-b border-gray-100 text-center font-mono text-gray-600">
                    {r.controlItemCount}
                  </td>
                  {/* 판정 */}
                  <td className="px-1 py-0.5 border-b border-gray-100 text-center">
                    <CompletenessBadge isComplete={r.isComplete} cpNo={cpNo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
