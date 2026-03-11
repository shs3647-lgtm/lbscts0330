/**
 * @file CpMasterPreviewTabs.tsx
 * @description 기초정보 Import 데이터를 5개 탭(공정현황/검출장치/관리항목/관리방법/대응계획)으로 표시 + 편집
 * @created 2026-03-05
 * @updated 2026-03-05 — 인라인 편집/삭제/저장 기능 추가
 */

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, CheckCircle2, Pencil, Trash2, Save, X, Undo2 } from 'lucide-react';
import type { ImportedData } from '../types';
import { saveMasterDataset } from '../utils/cp-master-api';

// ─── 5개 탭 정의 ───────────────────────────
interface TabDef {
  key: string;
  label: string;
  bg: string;
  activeBg: string;
  headerBg: string;
  headerText: string;
  columns: { itemCode: string; label: string; width: number }[];
}

const TABS: TabDef[] = [
  {
    key: 'processInfo',
    label: '공정현황(Process Status)',
    bg: 'bg-teal-100 text-teal-700',
    activeBg: 'bg-teal-600 text-white',
    headerBg: 'bg-teal-100',
    headerText: 'text-teal-800',
    columns: [
      { itemCode: 'A1', label: '공정번호(P-No)', width: 60 },
      { itemCode: 'A2', label: '공정명(Process Name)', width: 120 },
      { itemCode: 'A3', label: '레벨(Level)', width: 50 },
      { itemCode: 'A4', label: '공정설명(Process Desc.)', width: 180 },
      { itemCode: 'A5', label: '설비/금형/지그(Equipment)', width: 150 },
    ],
  },
  {
    key: 'detector',
    label: '검출장치(Detector)',
    bg: 'bg-purple-100 text-purple-700',
    activeBg: 'bg-purple-600 text-white',
    headerBg: 'bg-purple-100',
    headerText: 'text-purple-800',
    columns: [
      { itemCode: 'A1', label: '공정번호(P-No)', width: 60 },
      { itemCode: 'A2', label: '공정명(Process Name)', width: 120 },
      { itemCode: 'A6', label: 'EP', width: 150 },
      { itemCode: 'A7', label: '자동검사장치(Auto Detector)', width: 150 },
    ],
  },
  {
    key: 'controlItem',
    label: '관리항목(Control Item)',
    bg: 'bg-blue-100 text-blue-700',
    activeBg: 'bg-blue-600 text-white',
    headerBg: 'bg-blue-100',
    headerText: 'text-blue-800',
    columns: [
      { itemCode: 'A1', label: '공정번호(P-No)', width: 60 },
      { itemCode: 'A2', label: '공정명(Process Name)', width: 120 },
      { itemCode: 'B1', label: '제품특성(Product Char.)', width: 120 },
      { itemCode: 'B2', label: '공정특성(Process Char.)', width: 120 },
      { itemCode: 'B3', label: '특별특성(SC)', width: 60 },
      { itemCode: 'B4', label: '스펙/공차(Spec/Tol.)', width: 150 },
    ],
  },
  {
    key: 'controlMethod',
    label: '관리방법(Control Method)',
    bg: 'bg-green-100 text-green-700',
    activeBg: 'bg-green-600 text-white',
    headerBg: 'bg-green-100',
    headerText: 'text-green-800',
    columns: [
      { itemCode: 'A1', label: '공정번호(P-No)', width: 60 },
      { itemCode: 'A2', label: '공정명(Process Name)', width: 120 },
      { itemCode: 'B5', label: '평가방법(Eval. Method)', width: 100 },
      { itemCode: 'B6', label: '샘플크기(Sample Size)', width: 70 },
      { itemCode: 'B7', label: '주기(Freq.)', width: 70 },
      { itemCode: 'B7-1', label: '관리방법(Control Method)', width: 100 },
      { itemCode: 'B8', label: '책임1(Owner1)', width: 70 },
      { itemCode: 'B9', label: '책임2(Owner2)', width: 70 },
    ],
  },
  {
    key: 'reactionPlan',
    label: '대응계획(Reaction Plan)',
    bg: 'bg-orange-100 text-orange-700',
    activeBg: 'bg-orange-600 text-white',
    headerBg: 'bg-orange-100',
    headerText: 'text-orange-800',
    columns: [
      { itemCode: 'A1', label: '공정번호(P-No)', width: 60 },
      { itemCode: 'A2', label: '공정명(Process Name)', width: 120 },
      { itemCode: 'B1', label: '제품특성(Product Char.)', width: 120 },
      { itemCode: 'B2', label: '공정특성(Process Char.)', width: 120 },
      { itemCode: 'B10', label: '대응계획(Reaction Plan)', width: 200 },
    ],
  },
];

// ─── Props ────────────────────────────────────────────
interface Props {
  data: ImportedData[];
  cpId: string;
  onDataChange?: (newData: ImportedData[]) => void;
}

// ─── Row 타입 ─────────────────────────────────────────
interface RowData {
  processNo: string;
  processName: string;
  values: Record<string, string>;
  rowIdx: number;
  subIdx: number; // processNo 내 몇 번째 행인지
}

// ─── Component ────────────────────────────────────────
export default function CpMasterPreviewTabs({ data, cpId, onDataChange }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('processInfo');
  const [localData, setLocalData] = useState<ImportedData[]>(data);
  const [editMode, setEditMode] = useState(false);
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // props.data 변경 시 로컬 동기화
  useEffect(() => {
    setLocalData(data);
    setIsDirty(false);
  }, [data]);

  // 공정번호 순서 목록
  const processNos = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const d of localData) {
      if (d.processNo && !seen.has(d.processNo)) {
        seen.add(d.processNo);
        result.push(d.processNo);
      }
    }
    return result.sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [localData]);

  const currentTab = TABS.find(t => t.key === activeTab) || TABS[0];

  // processNo → itemCode → value[] 맵 (★ 현재 탭 카테고리로 필터링)
  // B1/B2가 관리항목(controlItem)과 대응계획(reactionPlan) 양쪽에 존재하므로
  // category 필터 없이 합산하면 데이터가 섞여서 잘못된 행이 생김
  const dataMap = useMemo(() => {
    const tabCategory = currentTab.key;
    const map = new Map<string, Map<string, string[]>>();
    for (const d of localData) {
      if (!d.processNo) continue;
      // A1(공정번호), A2(공정명)는 모든 시트에 공통 — 카테고리 무관
      const isSharedCode = d.itemCode === 'A1' || d.itemCode === 'A2';
      if (!isSharedCode && d.category !== tabCategory) continue;
      if (!map.has(d.processNo)) map.set(d.processNo, new Map());
      const pMap = map.get(d.processNo)!;
      if (!pMap.has(d.itemCode)) pMap.set(d.itemCode, []);
      const val = (d.value || '').trim();
      if (val) pMap.get(d.itemCode)!.push(val);
    }
    return map;
  }, [localData, currentTab]);

  // 탭별 데이터 행 수 (★ 카테고리별 필터링 — B1/B2 중복 방지)
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tab of TABS) {
      const dataItemCodes = tab.columns
        .filter(c => c.itemCode !== 'A1' && c.itemCode !== 'A2')
        .map(c => c.itemCode);
      let count = 0;
      for (const d of localData) {
        if (d.category !== tab.key) continue; // ★ 해당 탭 카테고리만 집계
        if (dataItemCodes.includes(d.itemCode) && (d.value || '').trim()) {
          count++;
        }
      }
      counts[tab.key] = count;
    }
    return counts;
  }, [localData]);

  // 현재 탭의 행 데이터 생성
  const rows = useMemo(() => {
    const dataItemCodes = currentTab.columns
      .filter(c => c.itemCode !== 'A1' && c.itemCode !== 'A2')
      .map(c => c.itemCode);

    const result: RowData[] = [];

    for (const pNo of processNos) {
      const pMap = dataMap.get(pNo);
      if (!pMap) continue;

      const processName = (pMap.get('A2') || [''])[0];

      let maxRows = 0;
      for (const code of dataItemCodes) {
        const vals = pMap.get(code) || [];
        if (vals.length > maxRows) maxRows = vals.length;
      }
      if (maxRows === 0) maxRows = 1;

      for (let i = 0; i < maxRows; i++) {
        const values: Record<string, string> = {};
        for (const col of currentTab.columns) {
          if (col.itemCode === 'A1') {
            values[col.itemCode] = i === 0 ? pNo : '';
          } else if (col.itemCode === 'A2') {
            values[col.itemCode] = i === 0 ? processName : '';
          } else {
            const vals = pMap.get(col.itemCode) || [];
            values[col.itemCode] = vals[i] || '';
          }
        }
        result.push({ processNo: pNo, processName, values, rowIdx: result.length, subIdx: i });
      }
    }

    return result;
  }, [processNos, dataMap, currentTab]);

  // ─── 편집 핸들러 ───
  const handleEditStart = useCallback((rowIdx: number) => {
    const row = rows[rowIdx];
    if (!row) return;
    setEditingRowIdx(rowIdx);
    setEditValues({ ...row.values });
  }, [rows]);

  const handleEditCancel = useCallback(() => {
    setEditingRowIdx(null);
    setEditValues({});
  }, []);

  const handleEditSave = useCallback(() => {
    if (editingRowIdx === null) return;
    const row = rows[editingRowIdx];
    if (!row) return;

    setLocalData(prev => {
      const next = [...prev];
      // 해당 processNo의 각 itemCode에 대해 subIdx번째 값을 업데이트
      for (const col of currentTab.columns) {
        if (col.itemCode === 'A1' || col.itemCode === 'A2') continue;
        const newVal = (editValues[col.itemCode] || '').trim();
        // subIdx번째 값을 찾아서 업데이트
        let matchCount = 0;
        for (let i = 0; i < next.length; i++) {
          if (next[i].processNo === row.processNo && next[i].itemCode === col.itemCode && (next[i].value || '').trim()) {
            if (matchCount === row.subIdx) {
              next[i] = { ...next[i], value: newVal };
              break;
            }
            matchCount++;
          }
        }
        // 기존에 없던 값을 새로 입력한 경우
        if (matchCount <= row.subIdx && newVal) {
          next.push({
            id: `new-${Date.now()}-${col.itemCode}`,
            processNo: row.processNo,
            processName: row.processName,
            category: currentTab.key,
            itemCode: col.itemCode,
            value: newVal,
            createdAt: new Date(),
          });
        }
      }
      return next;
    });

    setEditingRowIdx(null);
    setEditValues({});
    setIsDirty(true);
  }, [editingRowIdx, editValues, rows, currentTab]);

  const handleCellChange = useCallback((itemCode: string, value: string) => {
    setEditValues(prev => ({ ...prev, [itemCode]: value }));
  }, []);

  // ─── 행 삭제 ───
  const handleDeleteRow = useCallback((rowIdx: number) => {
    const row = rows[rowIdx];
    if (!row) return;
    if (!confirm(`공정 "${row.processNo} ${row.processName}" 행 ${row.subIdx + 1}을 삭제하시겠습니까?`)) return;

    setLocalData(prev => {
      const next = [...prev];
      const dataItemCodes = currentTab.columns
        .filter(c => c.itemCode !== 'A1' && c.itemCode !== 'A2')
        .map(c => c.itemCode);

      // 해당 processNo의 subIdx번째 데이터 항목들을 삭제
      for (const itemCode of dataItemCodes) {
        let matchCount = 0;
        for (let i = 0; i < next.length; i++) {
          if (next[i].processNo === row.processNo && next[i].itemCode === itemCode && (next[i].value || '').trim()) {
            if (matchCount === row.subIdx) {
              next.splice(i, 1);
              break;
            }
            matchCount++;
          }
        }
      }
      return next;
    });
    setIsDirty(true);
  }, [rows, currentTab]);

  // ─── 되돌리기 (원본 복원) ───
  const handleRevert = useCallback(() => {
    if (!isDirty) return;
    if (!confirm('변경사항을 모두 되돌리시겠습니까?')) return;
    setLocalData(data);
    setEditingRowIdx(null);
    setEditValues({});
    setIsDirty(false);
  }, [data, isDirty]);

  // ─── 저장 (부모 전파 + DB 저장) ───
  const handleSave = useCallback(async () => {
    if (onDataChange) onDataChange(localData);

    if (!cpId?.trim()) {
      setIsDirty(false);
      return;
    }

    setIsSaving(true);
    try {
      const flatData = localData
        .filter(d => d.processNo && d.itemCode && (d.value || '').trim())
        .map(d => ({
          processNo: d.processNo,
          category: d.category,
          itemCode: d.itemCode,
          value: d.value || '',
        }));

      const res = await saveMasterDataset({
        cpNo: cpId,
        name: 'MASTER',
        setActive: true,
        replace: true,
        flatData,
      });

      if (res.ok) {
        setIsDirty(false);
      } else {
        alert('저장 실패: DB 저장 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('[CpMasterPreviewTabs] DB 저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [localData, onDataChange, cpId]);

  const totalWidth = currentTab.columns.reduce((sum, col) => sum + col.width, 0) + 30 + (editMode ? 30 : 0);

  return (
    <div
      className="flex flex-col border-2 border-[#00587a] rounded-lg overflow-hidden bg-white shadow-lg w-full"
      style={{ flex: '1 1 auto', minWidth: 500 }}
    >
      {/* ─── 헤더 ─── */}
      <div className="bg-gradient-to-br from-[#00587a] to-[#007a9e] text-white px-4 py-2 text-sm font-bold flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <FileSpreadsheet size={16} />
          <span>CP 기초정보 미리보기</span>
          {cpId && (
            <span className="bg-blue-500/80 px-2 py-0.5 rounded text-[10px] font-semibold">{cpId}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-normal">
          {/* 되돌리기/수정/저장 버튼 */}
          {isDirty && (
            <button
              onClick={handleRevert}
              className="px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 bg-white/20 text-white hover:bg-red-500/80 transition-colors"
              title="변경사항 되돌리기"
            >
              <Undo2 size={11} />
              되돌리기(Revert)
            </button>
          )}
          <button
            onClick={() => setEditMode(prev => !prev)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors ${
              editMode ? 'bg-yellow-400 text-yellow-900' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Pencil size={11} />
            {editMode ? '편집중(Editing)' : '수정(Edit)'}
          </button>
          {isDirty && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors ${isSaving ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'}`}
            >
              <Save size={11} />
              {isSaving ? '저장중...(Saving)' : '저장(Save)'}
            </button>
          )}
          <span className="bg-white/20 px-2 py-0.5 rounded whitespace-nowrap">
            공정: <b className="text-yellow-300">{processNos.length}</b>
          </span>
          <span className="bg-green-500/50 px-2 py-0.5 rounded whitespace-nowrap">
            전체: <b className="text-green-200">{localData.filter(d => (d.value || '').trim()).length}</b>건
          </span>
        </div>
      </div>

      {/* ─── 탭 바 ─── */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 border-b border-gray-300 shrink-0 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); handleEditCancel(); }}
            className={`px-3 py-1 rounded text-[11px] font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
              activeTab === tab.key ? tab.activeBg : tab.bg
            }`}
          >
            {tab.label}
            <span className={`text-[9px] px-1 rounded-full ${
              activeTab === tab.key ? 'bg-white/30' : 'bg-black/10'
            }`}>
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
        {/* 확정 버튼 — 미저장 시 저장 후 CP 화면으로 이동 */}
        <button
          onClick={async () => {
            if (isDirty) await handleSave();
            router.push(`/control-plan/register?id=${cpId.toLowerCase()}`);
          }}
          disabled={!cpId || isSaving}
          className="ml-auto px-4 py-1 rounded text-[11px] font-bold whitespace-nowrap flex items-center gap-1 bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCircle2 size={13} />
          {isSaving ? '저장중...(Saving)' : '확정(Confirm)'}
        </button>
      </div>

      {/* ─── 테이블 ─── */}
      <div className="overflow-auto flex-1" style={{ minHeight: 200 }}>
        <table className="border-collapse w-full" style={{ minWidth: totalWidth }}>
          <thead className="sticky top-0 z-[2]">
            <tr>
              <th
                className="bg-gray-300 border border-gray-400 text-[9px] font-bold text-center p-0.5"
                style={{ width: 30 }}
              >
                NO
              </th>
              {currentTab.columns.map(col => (
                <th
                  key={col.itemCode}
                  className={`${currentTab.headerBg} ${currentTab.headerText} border border-gray-400 text-[10px] font-bold text-center p-0.5`}
                  style={{ width: col.width, minWidth: col.width }}
                >
                  {col.label}
                </th>
              ))}
              {editMode && (
                <th
                  className="bg-gray-200 border border-gray-400 text-[9px] font-bold text-center p-0.5"
                  style={{ width: 30 }}
                />
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={currentTab.columns.length + 1 + (editMode ? 1 : 0)} className="text-center text-gray-400 py-8 text-sm">
                  데이터가 없습니다
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const isFirstOfProcess = idx === 0 || rows[idx - 1].processNo !== row.processNo;
                const isEditing = editingRowIdx === idx;
                return (
                  <tr
                    key={row.rowIdx}
                    className={`group hover:bg-blue-50/50 ${isFirstOfProcess ? 'border-t-2 border-t-gray-400' : ''} ${isEditing ? 'bg-yellow-50' : ''}`}
                  >
                    <td className="border border-gray-300 text-[9px] text-center text-gray-500 p-0.5 bg-gray-50">
                      {idx + 1}
                    </td>
                    {currentTab.columns.map(col => {
                      const value = isEditing ? (editValues[col.itemCode] ?? '') : (row.values[col.itemCode] || '');
                      const isKeyCol = col.itemCode === 'A1' || col.itemCode === 'A2';

                      if (isEditing && !isKeyCol) {
                        return (
                          <td
                            key={col.itemCode}
                            className="border border-gray-300 p-0"
                            style={{ maxWidth: col.width }}
                          >
                            <input
                              type="text"
                              value={value}
                              onChange={e => handleCellChange(col.itemCode, e.target.value)}
                              className="w-full h-full px-1 py-0.5 text-[10px] border-0 bg-yellow-50 focus:outline-none focus:bg-yellow-100"
                            />
                          </td>
                        );
                      }

                      return (
                        <td
                          key={col.itemCode}
                          className={`border border-gray-300 text-[10px] p-0.5 leading-tight ${
                            col.itemCode === 'A1' ? 'text-center font-bold text-blue-700' :
                            col.itemCode === 'A2' ? 'font-medium' : ''
                          } ${!isKeyCol ? 'cursor-text' : ''}`}
                          style={{ maxWidth: col.width }}
                          title={value}
                          onDoubleClick={!isKeyCol ? () => handleEditStart(idx) : undefined}
                        >
                          <span className="block truncate">{value}</span>
                        </td>
                      );
                    })}
                    {/* 액션 열 (편집모드일 때만) */}
                    {editMode && (
                      <td className="border border-gray-300 p-0 text-center" style={{ width: 30 }}>
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-0.5">
                            <button onClick={handleEditSave} className="p-0.5 text-green-600 hover:text-green-800" title="저장">
                              <CheckCircle2 size={11} />
                            </button>
                            <button onClick={handleEditCancel} className="p-0.5 text-gray-500 hover:text-gray-700" title="취소">
                              <X size={11} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditStart(idx)} className="p-0.5 text-blue-500 hover:text-blue-700" title="수정">
                              <Pencil size={10} />
                            </button>
                            <button onClick={() => handleDeleteRow(idx)} className="p-0.5 text-red-400 hover:text-red-600" title="삭제">
                              <Trash2 size={10} />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── 푸터 ─── */}
      <div className="px-4 py-1.5 bg-gradient-to-br from-[#e0f2fb] to-gray-100 border-t-2 border-gray-600 text-[11px] text-gray-700 text-center shrink-0 font-bold">
        {currentTab.label}: {tabCounts[currentTab.key]}건 · {processNos.length}개 공정
        {isDirty && <span className="ml-2 text-orange-600">(미저장 변경사항/Unsaved Changes)</span>}
      </div>
    </div>
  );
}
