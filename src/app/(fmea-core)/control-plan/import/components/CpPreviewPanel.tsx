/**
 * @file CpPreviewPanel.tsx
 * @description CP 워크시트 Import 미리보기 패널
 *   - Excel 파싱 결과를 20컬럼 테이블로 미리 보여줌
 *   - 5개 그룹 색상 구분 헤더 (공정현황/검출장치/관리항목/관리방법/대응계획)
 *   - 셀 더블클릭 인라인 편집 / 행 삭제 / 되돌리기 / 확정 지원
 * @updated 2026-03-05 — 편집 + 확정 기능 추가
 */

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, CheckCircle, Pencil, Trash2, Save, Undo2, CheckCircle2, X } from 'lucide-react';
import type { WorksheetRow, MergeInfo } from '../worksheet-excel-parser';

// ─── 20컬럼 정의 (5개 그룹) ───────────────────────────
const CP_COLUMNS = [
  // 공정현황 (6)
  { key: 'processNo', label: '공정번호(P-No)', group: 'process', width: 55, editable: false },
  { key: 'processName', label: '공정명(Process Name)', group: 'process', width: 90, editable: false },
  { key: 'level', label: '레벨(Level)', group: 'process', width: 40, editable: true },
  { key: 'processDesc', label: '공정설명(Proc. Desc.)', group: 'process', width: 100, editable: true },
  { key: 'partName', label: '부품명(Part Name)', group: 'process', width: 70, editable: true },
  { key: 'equipment', label: '설비(Equipment)', group: 'process', width: 80, editable: true },
  // 검출장치 (2)
  { key: 'ep', label: 'EP', group: 'detector', width: 30, editable: true },
  { key: 'autoDetector', label: '자동(Auto)', group: 'detector', width: 30, editable: true },
  // 관리항목 (5)
  { key: 'charNo', label: 'NO', group: 'control', width: 30, editable: true },
  { key: 'productChar', label: '제품특성(Product Char.)', group: 'control', width: 80, editable: true },
  { key: 'processChar', label: '공정특성(Process Char.)', group: 'control', width: 80, editable: true },
  { key: 'specialChar', label: '특별(SC)', group: 'control', width: 35, editable: true },
  { key: 'spec', label: '스펙/허용차(Spec/Tol.)', group: 'control', width: 80, editable: true },
  // 관리방법 (6)
  { key: 'evalMethod', label: '평가방법(Eval. Method)', group: 'method', width: 70, editable: true },
  { key: 'sampleSize', label: '샘플크기(Sample Size)', group: 'method', width: 50, editable: true },
  { key: 'frequency', label: '주기(Freq.)', group: 'method', width: 50, editable: true },
  { key: 'controlMethod', label: '관리방법(Ctrl. Method)', group: 'method', width: 70, editable: true },
  { key: 'owner1', label: '책임1(Owner1)', group: 'method', width: 45, editable: true },
  { key: 'owner2', label: '책임2(Owner2)', group: 'method', width: 45, editable: true },
  // 대응계획 (1)
  { key: 'reactionPlan', label: '대응계획(Reaction Plan)', group: 'reaction', width: 100, editable: true },
] as const;

// 그룹별 헤더 스타일
const GROUP_STYLES: Record<string, { bg: string; text: string; label: string; colSpan: number }> = {
  process:  { bg: 'bg-blue-100',   text: 'text-blue-800',   label: '공정현황(Process Status)', colSpan: 6 },
  detector: { bg: 'bg-pink-100',   text: 'text-pink-800',   label: '검출장치(Detector)', colSpan: 2 },
  control:  { bg: 'bg-green-100',  text: 'text-green-800',  label: '관리항목(Control Item)', colSpan: 5 },
  method:   { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '관리방법(Control Method)', colSpan: 6 },
  reaction: { bg: 'bg-purple-100', text: 'text-purple-800', label: '대응계획(Reaction Plan)', colSpan: 1 },
};

const GROUP_ORDER = ['process', 'detector', 'control', 'method', 'reaction'];

// ─── Props ────────────────────────────────────────────
interface Props {
  rows: WorksheetRow[];
  merges: MergeInfo[];
  cpId: string;
  fileName: string;
  isParsing: boolean;
  onFileSelect: () => void;
  onImport: () => void;
  isImporting: boolean;
  importSuccess: boolean;
  onRowsChange?: (rows: WorksheetRow[]) => void;
}

// ─── Component ────────────────────────────────────────
export function CpPreviewPanel({
  rows,
  merges,
  cpId,
  fileName,
  isParsing,
  onFileSelect,
  onImport,
  isImporting,
  importSuccess,
  onRowsChange,
}: Props) {
  const router = useRouter();
  const [localRows, setLocalRows] = useState<WorksheetRow[]>(rows);
  const [editMode, setEditMode] = useState(false);
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  // props.rows 변경 시 로컬 동기화
  useEffect(() => {
    setLocalRows(rows);
    setIsDirty(false);
  }, [rows]);

  // 통계
  const stats = useMemo(() => {
    const processNos = new Set(localRows.map(r => r.processNo).filter(Boolean));
    const filledCells = localRows.reduce((acc, row) => {
      let count = 0;
      CP_COLUMNS.forEach(col => {
        const val = (row as unknown as Record<string, unknown>)[col.key];
        if (val && String(val).trim()) count++;
      });
      return acc + count;
    }, 0);
    return { rowCount: localRows.length, processCount: processNos.size, filledCells };
  }, [localRows]);

  // 셀 값 추출 헬퍼
  const getCellValue = (row: WorksheetRow, key: string): string => {
    const val = (row as unknown as Record<string, unknown>)[key];
    return val ? String(val).trim() : '';
  };

  // ─── 편집 핸들러 ───
  const handleEditStart = useCallback((rowIdx: number) => {
    const row = localRows[rowIdx];
    if (!row) return;
    setEditingRowIdx(rowIdx);
    const values: Record<string, string> = {};
    CP_COLUMNS.forEach(col => {
      values[col.key] = getCellValue(row, col.key);
    });
    setEditValues(values);
  }, [localRows]);

  const handleEditCancel = useCallback(() => {
    setEditingRowIdx(null);
    setEditValues({});
  }, []);

  const handleEditSave = useCallback(() => {
    if (editingRowIdx === null) return;
    setLocalRows(prev => {
      const next = [...prev];
      const updated = { ...next[editingRowIdx] } as unknown as Record<string, unknown>;
      CP_COLUMNS.forEach(col => {
        if (col.editable && editValues[col.key] !== undefined) {
          updated[col.key] = editValues[col.key];
        }
      });
      next[editingRowIdx] = updated as unknown as WorksheetRow;
      return next;
    });
    setEditingRowIdx(null);
    setEditValues({});
    setIsDirty(true);
  }, [editingRowIdx, editValues]);

  const handleCellChange = useCallback((key: string, value: string) => {
    setEditValues(prev => ({ ...prev, [key]: value }));
  }, []);

  // ─── 행 삭제 ───
  const handleDeleteRow = useCallback((rowIdx: number) => {
    const row = localRows[rowIdx];
    if (!row) return;
    const pNo = getCellValue(row, 'processNo') || `${rowIdx + 1}`;
    if (!confirm(`행 ${rowIdx + 1} (공정: ${pNo})을 삭제하시겠습니까?`)) return;
    setLocalRows(prev => prev.filter((_, i) => i !== rowIdx));
    setIsDirty(true);
  }, [localRows]);

  // ─── 되돌리기 ───
  const handleRevert = useCallback(() => {
    if (!isDirty) return;
    if (!confirm('변경사항을 모두 되돌리시겠습니까?')) return;
    setLocalRows(rows);
    setEditingRowIdx(null);
    setEditValues({});
    setIsDirty(false);
  }, [rows, isDirty]);

  // ─── 저장 (부모 전파) ───
  const handleSave = useCallback(() => {
    if (onRowsChange) {
      onRowsChange(localRows);
    }
    setIsDirty(false);
  }, [localRows, onRowsChange]);

  const totalWidth = CP_COLUMNS.reduce((sum, col) => sum + col.width, 0) + 30 + (editMode ? 30 : 0);

  return (
    <div
      className="flex flex-col border-2 border-[#00587a] rounded-lg overflow-hidden bg-white shadow-lg"
      style={{ flex: '1 1 auto', minWidth: 500 }}
    >
      {/* ─── 헤더 ─── */}
      <div className="bg-gradient-to-br from-[#00587a] to-[#007a9e] text-white px-4 py-2 text-sm font-bold flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <FileSpreadsheet size={16} />
          <span>CP 워크시트 미리보기(CP Worksheet Preview)</span>
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
              되돌리기
            </button>
          )}
          {localRows.length > 0 && (
            <button
              onClick={() => setEditMode(prev => !prev)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors ${
                editMode ? 'bg-yellow-400 text-yellow-900' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Pencil size={11} />
              {editMode ? '편집중' : '수정'}
            </button>
          )}
          {isDirty && onRowsChange && (
            <button
              onClick={handleSave}
              className="px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              <Save size={11} />
              저장
            </button>
          )}
          {localRows.length > 0 && (
            <>
              <span className="bg-white/20 px-2 py-0.5 rounded whitespace-nowrap">
                행: <b className="text-yellow-300">{stats.rowCount}</b>
              </span>
              <span className="bg-green-500/50 px-2 py-0.5 rounded whitespace-nowrap">
                공정: <b className="text-green-200">{stats.processCount}</b>
              </span>
            </>
          )}
        </div>
      </div>

      {/* ─── 액션 바 ─── */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-300 shrink-0">
        <button
          onClick={onFileSelect}
          className="px-3 py-1 bg-purple-600 text-white rounded text-[11px] font-bold flex items-center gap-1 hover:bg-purple-700 transition-colors"
        >
          <Upload size={12} />
          {fileName || 'Excel 파일 선택'}
        </button>
        <button
          onClick={onImport}
          disabled={localRows.length === 0 || isImporting}
          className={`px-3 py-1 rounded text-[11px] font-bold transition-colors ${
            localRows.length === 0 || isImporting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : importSuccess
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isImporting ? '저장중...' : importSuccess ? '✓ Import 완료' : `적용 (${localRows.length}행)`}
        </button>
        {isParsing && <span className="text-purple-600 text-[10px] font-bold animate-pulse">파싱중...</span>}
        {importSuccess && (
          <span className="text-green-600 text-[10px] flex items-center gap-1">
            <CheckCircle size={12} /> DB 저장 완료
          </span>
        )}
        {/* 확정 버튼 — CP 화면으로 이동 */}
        {importSuccess && cpId && (
          <button
            onClick={() => router.push(`/control-plan/register?id=${cpId.toLowerCase()}`)}
            className="ml-auto px-4 py-1 rounded text-[11px] font-bold whitespace-nowrap flex items-center gap-1 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <CheckCircle2 size={13} />
            확정
          </button>
        )}
      </div>

      {/* ─── 테이블 ─── */}
      <div className="overflow-auto" style={{ minHeight: 200, maxHeight: 'calc(100vh - 320px)' }}>
        <table className="border-collapse" style={{ minWidth: totalWidth }}>
          <thead className="sticky top-0 z-[2]">
            {/* 1단: 그룹 헤더 */}
            <tr>
              <th
                className="bg-gray-300 border border-gray-400 text-[9px] font-bold text-center p-0.5"
                rowSpan={2}
                style={{ width: 30 }}
              >
                NO
              </th>
              {GROUP_ORDER.map(group => {
                const g = GROUP_STYLES[group];
                return (
                  <th
                    key={group}
                    colSpan={g.colSpan}
                    className={`${g.bg} ${g.text} border border-gray-400 text-[10px] font-bold text-center p-0.5`}
                  >
                    {g.label}
                  </th>
                );
              })}
              {editMode && (
                <th className="bg-gray-200 border border-gray-400 text-[9px] p-0.5" rowSpan={2} style={{ width: 30 }} />
              )}
            </tr>
            {/* 2단: 컬럼 헤더 */}
            <tr>
              {CP_COLUMNS.map(col => {
                const g = GROUP_STYLES[col.group];
                return (
                  <th
                    key={col.key}
                    className={`${g.bg} ${g.text} border border-gray-400 text-[9px] font-medium text-center p-0.5`}
                    style={{ width: col.width, minWidth: col.width }}
                  >
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {localRows.length === 0 ? null : (
              localRows.map((row, idx) => {
                const isEditing = editingRowIdx === idx;
                return (
                  <tr key={(row as unknown as Record<string, unknown>).rowIndex as number ?? idx} className={`group hover:bg-blue-50/50 ${isEditing ? 'bg-yellow-50' : ''}`}>
                    <td className="border border-gray-300 text-[9px] text-center text-gray-500 p-0.5 bg-gray-50">
                      {idx + 1}
                    </td>
                    {CP_COLUMNS.map(col => {
                      const value = isEditing ? (editValues[col.key] ?? getCellValue(row, col.key)) : getCellValue(row, col.key);

                      if (isEditing && col.editable) {
                        return (
                          <td key={col.key} className="border border-gray-300 p-0" style={{ maxWidth: col.width }}>
                            <input
                              type="text"
                              value={value}
                              onChange={e => handleCellChange(col.key, e.target.value)}
                              className="w-full h-full px-1 py-0.5 text-[9px] border-0 bg-yellow-50 focus:outline-none focus:bg-yellow-100"
                            />
                          </td>
                        );
                      }

                      return (
                        <td
                          key={col.key}
                          className={`border border-gray-300 text-[9px] p-0.5 leading-tight ${col.editable ? 'cursor-text' : ''}`}
                          style={{ maxWidth: col.width }}
                          title={value}
                          onDoubleClick={col.editable ? () => handleEditStart(idx) : undefined}
                        >
                          <span className="block truncate">{value || ''}</span>
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
        {localRows.length > 0
          ? `${stats.rowCount}행 · ${stats.processCount}개 공정 · ${stats.filledCells}개 데이터`
          : ''}
        {isDirty && <span className="ml-2 text-orange-600">(미저장 변경사항)</span>}
      </div>
    </div>
  );
}

export default CpPreviewPanel;
