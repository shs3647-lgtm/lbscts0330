/**
 * @file BdStatusTable.tsx
 * @description Basic Data 현황 테이블 (검색 + 소팅 + 판정 + 체크박스)
 * @created 2026-02-17
 * @updated 2026-02-20 판정 컬럼/체크박스/삭제 기능 추가
 *
 * @status CODEFREEZE L4 (Gold) 🔒
 * @freeze_level L4 (Critical - Gold Test Passed)
 * @frozen_date 2026-03-02
 * @gold_tag v4.0.0-gold
 * @allowed_changes NONE — 사용자 명시적 승인 + full test pass 필수
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { BdStatusItem } from './ImportPageTypes';
import { BD_TYPE_COLORS } from '../utils/bd-id';

export type BdTypeFilter = 'ALL' | 'M' | 'F' | 'P';

interface BdStatusTableProps {
  bdStatusList: BdStatusItem[];
  selectedFmeaId: string;
  setSelectedFmeaId: (id: string) => void;
  onSelectAndCopy?: (targetFmeaId: string) => void;
  onDeleteDatasets?: (fmeaIds: string[]) => void;
  /** 외부에서 유형 필터 제어 */
  typeFilter?: BdTypeFilter;
  onTypeFilterChange?: (type: BdTypeFilter) => void;
  /** 관리자 모드: 삭제 항목 표시 + 복구/완전삭제 */
  adminMode?: boolean;
  isAdmin?: boolean;
  onToggleAdminMode?: () => void;
  onRestoreDatasets?: (fmeaIds: string[]) => void;
  onPermanentDeleteDatasets?: (fmeaIds: string[]) => void;
}

/** 유형 뱃지 */
function TypeBadge({ type }: { type: string }) {
  const c = BD_TYPE_COLORS[type] || BD_TYPE_COLORS.P;
  const label = type === 'M' ? 'Master' : type === 'F' ? 'Family' : 'Part';
  return (
    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${c.bg} ${c.text} ${c.border} border`}>
      {label}
    </span>
  );
}

/** 판정: 공정·FM·FC 모두 1개 이상이면 적합 표시, 아니면 빈칸 */
function JudgeBadge({ processCount, fmCount, fcCount, fmeaId }: {
  processCount: number; dataCount: number; fmCount: number; fcCount: number; onMissingClick?: () => void; fmeaId?: string;
}) {
  if (processCount > 0 && fmCount > 0 && fcCount > 0) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (fmeaId) {
            window.location.href = `/pfmea/worksheet?id=${fmeaId}&fresh=1`;
          }
        }}
        className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap bg-green-100 text-green-700 border-green-300 border hover:bg-green-200 cursor-pointer"
        title={fmeaId ? `${fmeaId} 워크시트로 이동` : ''}
      >
        적합
      </button>
    );
  }
  return null;
}

type SortKey = 'fmeaType' | 'fmeaId' | 'bdId' | 'bdVersion' | 'customerName' | 'fmeaName' | 'revisionNo' | 'startDate' | 'createdAt' | 'processCount' | 'fmCount' | 'fcCount' | 'dataCount' | 'judge';
type SortDir = 'asc' | 'desc';

/** ISO 날짜 → YYYY-MM-DD */
function formatDate(iso?: string | null): string {
  if (!iso) return '-';
  return iso.slice(0, 10);
}

const TYPE_ORDER: Record<string, number> = { M: 0, F: 1, P: 2 };

const TH = 'bg-[#00587a] text-white border border-gray-400 px-2 py-1 font-bold text-center h-auto text-[11px] cursor-pointer hover:bg-[#006d99] select-none leading-tight';

/** 한글 줄바꿈(영어) 헤더 렌더 — 한글 위, (영어) 아래 */
function BiTh({ ko, en, children }: { ko: string; en?: string; children?: React.ReactNode }) {
  return (
    <>
      <span className="whitespace-nowrap">{ko}{children}</span>
      {en && <><br/><span className="text-[8px] font-normal opacity-70 whitespace-nowrap">({en})</span></>}
    </>
  );
}
const TD = 'px-1 py-0.5 text-center border-b border-gray-200 whitespace-nowrap';

export function BdStatusTable({
  bdStatusList,
  selectedFmeaId,
  setSelectedFmeaId,
  onSelectAndCopy,
  onDeleteDatasets,
  typeFilter: externalTypeFilter,
  onTypeFilterChange,
  adminMode,
  isAdmin,
  onToggleAdminMode,
  onRestoreDatasets,
  onPermanentDeleteDatasets,
}: BdStatusTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('fmeaType');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [internalTypeFilter, setInternalTypeFilter] = useState<BdTypeFilter>('ALL');

  const activeTypeFilter = externalTypeFilter ?? internalTypeFilter;
  const setTypeFilter = (t: BdTypeFilter) => {
    if (onTypeFilterChange) onTypeFilterChange(t);
    else setInternalTypeFilter(t);
  };

  const typeCounts = useMemo(() => {
    const counts = { ALL: bdStatusList.length, M: 0, F: 0, P: 0 };
    for (const bd of bdStatusList) {
      if (bd.fmeaType === 'M') counts.M++;
      else if (bd.fmeaType === 'F') counts.F++;
      else counts.P++;
    }
    return counts;
  }, [bdStatusList]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const isOk = (bd: BdStatusItem) => (bd.processCount ?? 0) > 0 && (bd.fmCount ?? 0) > 0 && (bd.fcCount ?? 0) > 0;

  // 유형 + 검색 필터
  const filtered = useMemo(() => {
    let list = bdStatusList;
    if (activeTypeFilter !== 'ALL') {
      list = list.filter(bd => bd.fmeaType === activeTypeFilter);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(bd =>
      bd.fmeaId.toLowerCase().includes(q) ||
      bd.fmeaName.toLowerCase().includes(q) ||
      (bd.customerName || '').toLowerCase().includes(q) ||
      (bd.companyName || '').toLowerCase().includes(q) ||
      bd.bdId.toLowerCase().includes(q)
    );
  }, [bdStatusList, search, activeTypeFilter]);

  // 소팅
  const sorted = useMemo(() => {
    const list = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case 'fmeaType':
          return dir * ((TYPE_ORDER[a.fmeaType] ?? 3) - (TYPE_ORDER[b.fmeaType] ?? 3)) || a.fmeaId.localeCompare(b.fmeaId);
        case 'fmeaId': return dir * a.fmeaId.localeCompare(b.fmeaId);
        case 'bdId': return dir * a.bdId.localeCompare(b.bdId);
        case 'bdVersion': return dir * ((a.version ?? 0) - (b.version ?? 0));
        case 'customerName': return dir * (a.customerName || '').localeCompare(b.customerName || '');
        case 'fmeaName': return dir * a.fmeaName.localeCompare(b.fmeaName);
        case 'revisionNo': return dir * (a.revisionNo || '').localeCompare(b.revisionNo || '');
        case 'startDate': return dir * (a.startDate || '').localeCompare(b.startDate || '');
        case 'createdAt': return dir * (a.createdAt || '').localeCompare(b.createdAt || '');
        case 'processCount': return dir * ((a.processCount ?? 0) - (b.processCount ?? 0));
        case 'fmCount': return dir * ((a.fmCount ?? 0) - (b.fmCount ?? 0));
        case 'fcCount': return dir * ((a.fcCount ?? 0) - (b.fcCount ?? 0));
        case 'dataCount': return dir * (a.dataCount - b.dataCount);
        case 'judge': {
          const aOk = isOk(a) ? 1 : 0;
          const bOk = isOk(b) ? 1 : 0;
          return dir * (aOk - bOk);
        }
        default: return 0;
      }
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  // 통계
  const stats = useMemo(() => {
    const total = bdStatusList.length;
    const ok = bdStatusList.filter(bd => isOk(bd)).length;
    return { total, ok, missing: total - ok };
  }, [bdStatusList]);

  // 체크박스 토글
  const toggleCheck = useCallback((fmeaId: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(fmeaId)) next.delete(fmeaId);
      else next.add(fmeaId);
      return next;
    });
  }, []);

  // 전체 선택/해제
  const toggleAll = useCallback(() => {
    if (checkedIds.size === sorted.length) setCheckedIds(new Set());
    else setCheckedIds(new Set(sorted.map(bd => bd.fmeaId)));
  }, [sorted, checkedIds.size]);

  const handleDelete = () => {
    if (checkedIds.size === 0) return;
    const ids = [...checkedIds];
    if (confirm(`선택한 ${ids.length}건의 BD 데이터를 삭제하시겠습니까?\n(Soft Delete — 관리자 모드에서 복구 가능)`)) {
      onDeleteDatasets?.(ids);
      setCheckedIds(new Set());
    }
  };

  // 관리자: 복구
  const handleRestore = () => {
    if (checkedIds.size === 0) return;
    const ids = [...checkedIds].filter(id => {
      const bd = bdStatusList.find(b => b.fmeaId === id);
      return bd && bd.isActive === false;
    });
    if (ids.length === 0) return;
    if (confirm(`선택한 ${ids.length}건의 삭제된 BD를 복구하시겠습니까?`)) {
      onRestoreDatasets?.(ids);
      setCheckedIds(new Set());
    }
  };

  // 관리자: 완전삭제
  const handlePermanentDelete = () => {
    if (checkedIds.size === 0) return;
    const ids = [...checkedIds].filter(id => {
      const bd = bdStatusList.find(b => b.fmeaId === id);
      return bd && bd.isActive === false;
    });
    if (ids.length === 0) return;
    if (confirm(`⚠️ 선택한 ${ids.length}건의 BD를 완전 삭제합니다.\n\n이 작업은 되돌릴 수 없습니다!\n정말 삭제하시겠습니까?`)) {
      onPermanentDeleteDatasets?.(ids);
      setCheckedIds(new Set());
    }
  };

  // 삭제된 항목만 선택
  const selectDeleted = useCallback(() => {
    setCheckedIds(new Set(sorted.filter(bd => bd.isActive === false).map(bd => bd.fmeaId)));
  }, [sorted]);

  const deletedCount = useMemo(() => bdStatusList.filter(bd => bd.isActive === false).length, [bdStatusList]);
  const checkedDeletedCount = useMemo(() => {
    return [...checkedIds].filter(id => {
      const bd = bdStatusList.find(b => b.fmeaId === id);
      return bd && bd.isActive === false;
    }).length;
  }, [checkedIds, bdStatusList]);

  return (
    <div className="rounded-lg overflow-hidden border border-gray-400 mt-3 mb-4">
      {/* 헤더: 타이틀 + 유형 필터 + 통계 + 검색 + 액션 */}
      <div className="bg-[#00587a] text-white px-2 py-1 flex items-center gap-2 flex-wrap">
        <span className="font-bold text-[10px] whitespace-nowrap">Basic Data 현황</span>
        {/* 유형 필터 탭 */}
        <div className="flex items-center gap-0.5 ml-1">
          {([['ALL', '전체'], ['M', 'Master'], ['F', 'Family'], ['P', 'Part']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                activeTypeFilter === key
                  ? 'bg-white text-[#00587a]'
                  : 'bg-white/15 text-white/80 hover:bg-white/25'
              }`}
            >
              {label} {typeCounts[key]}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-green-300 font-bold">적합 {stats.ok}</span>
        {adminMode && deletedCount > 0 && (
          <span className="text-[10px] text-orange-300 font-bold">삭제 {deletedCount}</span>
        )}
        <input
          type="text"
          placeholder="검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[80px] px-2 py-0.5 text-[10px] border-0 rounded bg-white/20 text-white placeholder-white/50 focus:outline-none focus:bg-white/30"
        />
        {checkedIds.size > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-yellow-200">{checkedIds.size}건 선택</span>
            {/* 일반 모드: soft delete */}
            {!adminMode && onDeleteDatasets && (
              <button onClick={handleDelete}
                className="text-[10px] px-1.5 py-0.5 bg-red-500 text-white rounded hover:bg-red-600 font-bold cursor-pointer">
                삭제
              </button>
            )}
            {/* 관리자 모드: 복구 + 완전삭제 */}
            {adminMode && checkedDeletedCount > 0 && onRestoreDatasets && (
              <button onClick={handleRestore}
                className="text-[10px] px-1.5 py-0.5 bg-green-500 text-white rounded hover:bg-green-600 font-bold cursor-pointer">
                복구 ({checkedDeletedCount})
              </button>
            )}
            {adminMode && checkedDeletedCount > 0 && onPermanentDeleteDatasets && (
              <button onClick={handlePermanentDelete}
                className="text-[10px] px-1.5 py-0.5 bg-red-700 text-white rounded hover:bg-red-800 font-bold cursor-pointer">
                완전삭제 ({checkedDeletedCount})
              </button>
            )}
            {/* 관리자 모드에서 활성 항목 soft delete도 가능 */}
            {adminMode && checkedIds.size > checkedDeletedCount && onDeleteDatasets && (
              <button onClick={handleDelete}
                className="text-[10px] px-1.5 py-0.5 bg-red-500 text-white rounded hover:bg-red-600 font-bold cursor-pointer">
                삭제
              </button>
            )}
          </div>
        )}
        {/* 관리자 모드 토글 */}
        {isAdmin && onToggleAdminMode && (
          <button onClick={onToggleAdminMode}
            className={`text-[10px] px-2 py-0.5 rounded font-bold cursor-pointer ${
              adminMode ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-white/20 text-white/80 hover:bg-white/30'
            }`}
            title="관리자 모드: 삭제된 BD 항목을 보고 복구/완전삭제 가능">
            {adminMode ? '관리자 ON' : '관리자'}
          </button>
        )}
      </div>

      {/* 테이블 */}
      <div className="max-h-[280px] overflow-y-auto">
        <table className="w-full border-collapse table-fixed">
          <colgroup>
            <col style={{ width: 28 }} />{/* 체크 */}
            <col style={{ width: 60 }} />{/* 유형 */}
            <col style={{ width: 80 }} />{/* 고객 */}
            <col style={{ width: 90 }} />{/* BD ID */}
            <col style={{ width: 80 }} />{/* BD생성일 */}
            <col style={{ width: 50 }} />{/* BD Rev */}
            <col style={{ width: 130 }} />{/* FMEA ID */}
            <col />{/* FMEA명 (flex — 회사명 삭제로 확장) */}
            <col style={{ width: 48 }} />{/* Rev */}
            <col style={{ width: 48 }} />{/* 공정 */}
            <col style={{ width: 42 }} />{/* FM */}
            <col style={{ width: 42 }} />{/* FC */}
            <col style={{ width: 48 }} />{/* 데이터 */}
            <col style={{ width: 50 }} />{/* 판정 */}
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={TH} onClick={toggleAll}>
                <input type="checkbox" checked={sorted.length > 0 && checkedIds.size === sorted.length}
                  onChange={toggleAll} className="w-3 h-3 cursor-pointer" onClick={e => e.stopPropagation()} />
              </th>
              <th className={TH} onClick={() => handleSort('fmeaType')} title="FMEA Type: Master / Family / Part"><BiTh ko="유형" en="Type">{sortArrow('fmeaType')}</BiTh></th>
              <th className={TH} onClick={() => handleSort('customerName')} title="Customer (Delivery destination)"><BiTh ko="고객" en="Cust.">{sortArrow('customerName')}</BiTh></th>
              <th className={TH} onClick={() => handleSort('bdId')} title="Basic Data Unique ID (Auto-generated)">BD ID{sortArrow('bdId')}</th>
              <th className={TH} onClick={() => handleSort('createdAt')} title="Basic Data Creation Date (Import time)"><BiTh ko="BD생성일" en="Created">{sortArrow('createdAt')}</BiTh></th>
              <th className={TH} onClick={() => handleSort('bdVersion')} title="Basic Data Version (Increments on save)">BD Rev{sortArrow('bdVersion')}</th>
              <th className={TH} onClick={() => handleSort('fmeaId')} title="FMEA Project Unique ID">FMEA ID{sortArrow('fmeaId')}</th>
              <th className={TH} onClick={() => handleSort('fmeaName')} title="FMEA Project Name (Subject)"><BiTh ko="FMEA명" en="Name">{sortArrow('fmeaName')}</BiTh></th>
              <th className={TH} onClick={() => handleSort('revisionNo')} title="Revision Number">Rev{sortArrow('revisionNo')}</th>
              <th className={TH} onClick={() => handleSort('processCount')} title="Process Count (FA verification criteria)"><BiTh ko="공정" en="Proc.">{sortArrow('processCount')}</BiTh></th>
              <th className={TH} onClick={() => handleSort('fmCount' as SortKey)} title="Failure Mode unique count">FM</th>
              <th className={TH} onClick={() => handleSort('fcCount' as SortKey)} title="Failure Cause unique count">FC</th>
              <th className={TH} onClick={() => handleSort('dataCount')} title="Basic Data item count (non-empty)"><BiTh ko="데이터" en="Data">{sortArrow('dataCount')}</BiTh></th>
              <th className={TH} onClick={() => handleSort('judge')} title="Judgment: Pass if Process/FM/FC all present"><BiTh ko="판정" en="Judge">{sortArrow('judge')}</BiTh></th>
            </tr>
            {/* 삭제됨 선택 버튼 (관리자 모드) */}
            {adminMode && deletedCount > 0 && (
              <tr>
                <td colSpan={14} className="bg-orange-50 border border-gray-300 px-2 py-0.5">
                  <button onClick={selectDeleted}
                    className="text-[10px] text-orange-600 font-bold hover:underline cursor-pointer">
                    삭제됨 {deletedCount}건 선택
                  </button>
                </td>
              </tr>
            )}
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={14} className="text-center py-3 text-[10px] text-gray-400 border border-gray-200">
                  {search ? '검색 결과가 없습니다' : 'Basic Data가 없습니다'}
                </td>
              </tr>
            ) : (
              sorted.map(bd => {
                const isSelected = bd.fmeaId === selectedFmeaId;
                const isChecked = checkedIds.has(bd.fmeaId);
                const isDeleted = bd.isActive === false;
                const canCopy = bd.dataCount === 0 && bd.parentFmeaId && bd.parentFmeaId !== bd.fmeaId;

                return (
                  <tr
                    key={bd.fmeaId}
                    className={`cursor-pointer transition-colors ${
                      isDeleted ? 'bg-gray-100 opacity-60' :
                      isChecked ? 'bg-yellow-50' : isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedFmeaId(bd.fmeaId)}
                    title={isDeleted ? `[삭제됨] ${bd.fmeaName}` : `${bd.fmeaName} (클릭하여 선택)`}
                  >
                    {/* 체크박스 */}
                    <td className={TD} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isChecked}
                        onChange={() => toggleCheck(bd.fmeaId)} className="w-3 h-3 cursor-pointer" />
                    </td>
                    {/* 유형 */}
                    <td className={TD}><TypeBadge type={bd.fmeaType} /></td>
                    {/* 고객 */}
                    <td className={`${TD} !text-left`}>
                      <span className="text-[10px] text-gray-600 truncate block" title={bd.customerName || ''}>
                        {bd.customerName || '-'}
                      </span>
                    </td>
                    {/* BD ID */}
                    <td className={TD}>
                      <span className="text-[10px] font-mono text-blue-600">{bd.bdId}</span>
                    </td>
                    {/* BD생성일 */}
                    <td className={TD}>
                      <span className="text-[10px] text-gray-500">{formatDate(bd.createdAt)}</span>
                    </td>
                    {/* BD Rev */}
                    <td className={TD}>
                      <span className="text-[10px] font-mono text-gray-500">{bd.version || '-'}</span>
                    </td>
                    {/* FMEA ID */}
                    <td className={TD}>
                      <span className="text-[10px] font-mono text-gray-700">{bd.fmeaId}</span>
                    </td>
                    {/* FMEA명 */}
                    <td className={`${TD} !text-left`}>
                      <span className={`text-[10px] break-all line-clamp-2 block leading-tight ${isDeleted ? 'text-gray-400 line-through' : 'text-gray-700'}`} title={bd.fmeaName}>
                        {isDeleted && <span className="text-[9px] text-orange-500 font-bold no-underline mr-1">[삭제]</span>}
                        {bd.fmeaName}
                      </span>
                      {canCopy && onSelectAndCopy && !isDeleted && (
                        <button
                          onClick={e => { e.stopPropagation(); onSelectAndCopy(bd.fmeaId); }}
                          className="text-[10px] px-1 py-0 bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200 mt-0.5"
                          title="상위 FMEA Basic Data를 복사합니다"
                        >
                          ← 가져오기
                        </button>
                      )}
                    </td>
                    {/* Rev — "Rev.00" → "00"만 표시 */}
                    <td className={TD}>
                      <span className="text-[10px] text-gray-500 font-mono">{bd.revisionNo ? bd.revisionNo.replace(/^Rev\.?/i, '') : '-'}</span>
                    </td>
                    {/* 공정 */}
                    <td className={TD}>
                      <span className={`text-[10px] font-bold ${(bd.processCount ?? 0) > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                        {(bd.processCount ?? 0) || '-'}
                      </span>
                    </td>
                    {/* FM */}
                    <td className={TD}>
                      <span className={`text-[10px] font-bold ${(bd.fmCount ?? 0) > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>
                        {(bd.fmCount ?? 0) || '-'}
                      </span>
                    </td>
                    {/* FC */}
                    <td className={TD}>
                      <span className={`text-[10px] font-bold ${(bd.fcCount ?? 0) > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                        {(bd.fcCount ?? 0) || '-'}
                      </span>
                    </td>
                    {/* 데이터 */}
                    <td className={TD}>
                      <span className={`text-[10px] font-bold ${bd.dataCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {bd.dataCount || '-'}
                      </span>
                    </td>
                    {/* 판정 */}
                    <td className={TD}>
                      <JudgeBadge
                        processCount={bd.processCount ?? 0}
                        dataCount={bd.dataCount}
                        fmCount={bd.fmCount ?? 0}
                        fcCount={bd.fcCount ?? 0}
                        fmeaId={bd.fmeaId}
                        onMissingClick={() => {
                          setSelectedFmeaId(bd.fmeaId);
                          setTimeout(() => {
                            document.getElementById('import-preview-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 100);
                        }}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BdStatusTable;
