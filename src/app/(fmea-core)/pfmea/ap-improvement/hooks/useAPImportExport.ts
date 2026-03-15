/**
 * @file useAPImportExport.ts
 * @description AP 개선관리 Excel Import/Export/Template/Save 훅 (SRP)
 */

'use client';

import { useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { downloadStyledExcel, downloadTemplate } from '@/lib/excel-utils';
import { EXCEL_HEADERS, EXCEL_COL_WIDTHS } from '../constants';
import { APItem } from '../types';

export const CIP_TARGETS = ['Field', 'Yield', 'Quality', 'Cost', 'Delivery', 'Safety'] as const;
export type CIPTarget = typeof CIP_TARGETS[number];

interface UseAPImportExportProps {
  allData: APItem[];
  manualRows: APItem[];
  setManualRows: React.Dispatch<React.SetStateAction<APItem[]>>;
  cipOverlay: Record<string, { cipNo: string; target: CIPTarget }>;
  setCipOverlay: React.Dispatch<React.SetStateAction<Record<string, { cipNo: string; target: CIPTarget }>>>;
  selectedFmeaId: string;
  refresh: () => void;
}

export function useAPImportExport({
  allData, manualRows, setManualRows, cipOverlay, setCipOverlay, selectedFmeaId, refresh,
}: UseAPImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Export ──
  const handleExport = useCallback(() => {
    if (allData.length === 0) {
      alert('내보낼 데이터가 없습니다.');
      return;
    }
    const yr = new Date().getFullYear().toString().slice(-2);
    const rows = allData.map((item, idx) => {
      const overlay = cipOverlay[item.id];
      return [
        overlay?.cipNo || `CIP${yr}-${String(idx + 1).padStart(3, '0')}`,
        item.ap5 || '',
        overlay?.target || 'Quality',
        item.specialChar || '',
        item.processName || '',
        item.severity || '',
        item.failureMode || '',
        item.failureCause || '',
        item.occurrence || '',
        item.detection || '',
        item.preventionAction || '',
        item.detectionAction || '',
        item.responsible || '',
        item.status || '대기',
        item.dueDate || '',
        item.completedDate || '',
        item.remarks || '',
      ];
    });
    downloadStyledExcel(EXCEL_HEADERS, rows, EXCEL_COL_WIDTHS, 'AP개선', `AP개선_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [allData, cipOverlay]);

  // ── Template Download ──
  const handleDownloadTemplate = useCallback(() => {
    downloadTemplate(EXCEL_HEADERS, EXCEL_COL_WIDTHS, 'AP개선', 'AP개선_양식.xlsx');
  }, []);

  // ── Import ──
  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });

        if (json.length === 0) {
          alert('데이터가 없습니다.');
          return;
        }

        const yr = new Date().getFullYear().toString().slice(-2);
        const newRows: APItem[] = [];
        const newOverlay: Record<string, { cipNo: string; target: CIPTarget }> = {};

        json.forEach((row, idx) => {
          const id = `cip-manual-import-${Date.now()}-${idx}`;
          const cipNo = row['CIP_No'] || row['CIP No'] || `CIP${yr}-I${String(idx + 1).padStart(3, '0')}`;
          const rawTarget = row['대상'] || 'Quality';
          const target: CIPTarget = CIP_TARGETS.includes(rawTarget as CIPTarget) ? rawTarget as CIPTarget : 'Quality';

          newRows.push({
            id,
            riskId: id,
            fmeaId: selectedFmeaId || '',
            linkId: '',
            ap5: (row['AP등급'] || 'M') as APItem['ap5'],
            ap6: '',
            specialChar: row['공정번호'] || '',
            category: '',
            preventiveControl: '',
            severity: parseInt(row['S'] || '0', 10) || 0,
            failureMode: row['고장형태(FM)'] || row['고장형태'] || '',
            failureCause: row['고장원인(FC)'] || row['고장원인'] || '',
            occurrence: parseInt(row['O'] || '0', 10) || 0,
            detectionControl: '',
            detection: parseInt(row['D'] || '0', 10) || 0,
            preventionAction: row['예방조치'] || '',
            detectionAction: row['검출조치'] || '',
            responsible: row['담당자'] || '',
            status: (row['상태'] || '대기') as APItem['status'],
            dueDate: row['목표일'] || '',
            completedDate: row['완료일'] || undefined,
            processName: row['공정명'] || '',
            remarks: row['비고'] || undefined,
          });

          newOverlay[id] = { cipNo, target: target as CIPTarget };
        });

        setManualRows(prev => [...prev, ...newRows]);
        setCipOverlay(prev => ({ ...prev, ...newOverlay }));
        alert(`${newRows.length}건 Import 완료`);
      } catch (err) {
        console.error('[AP Import] 오류:', err);
        alert('엑셀 파싱 오류가 발생했습니다.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }, [selectedFmeaId, setManualRows, setCipOverlay]);

  // ── Save (manual rows → CIP DB) ──
  const handleSave = useCallback(async () => {
    if (manualRows.length === 0) {
      alert('저장할 수동 입력 항목이 없습니다.');
      return;
    }

    const yr = new Date().getFullYear().toString().slice(-2);
    const items = manualRows.map((row, idx) => {
      const overlay = cipOverlay[row.id];
      return {
        cipNo: overlay?.cipNo || `CIP${yr}-${String(idx + 1).padStart(3, '0')}`,
        fmeaId: row.fmeaId || null,
        apLevel: row.ap5 || 'M',
        category: overlay?.target || 'Quality',
        failureMode: row.failureMode || '',
        cause: row.failureCause || '',
        improvement: [row.preventionAction, row.detectionAction].filter(Boolean).join(' | '),
        responsible: row.responsible || null,
        targetDate: row.dueDate || null,
        completedDate: row.completedDate || null,
        status: row.status === '완료' ? 'G' : row.status === '진행중' ? 'Y' : 'R',
        s: row.severity || null,
        o: row.occurrence || null,
        d: row.detection || null,
        processName: row.processName || null,
      };
    });

    try {
      const res = await fetch('/api/cip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const result = await res.json();
      if (result.success) {
        alert(`${result.count || items.length}건 저장 완료`);
        setManualRows([]);
        refresh();
      } else {
        alert('저장 실패: ' + (result.error || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error('[AP Save] 오류:', err);
      alert('저장 중 오류가 발생했습니다.');
    }
  }, [manualRows, cipOverlay, setManualRows, refresh]);

  // ── Delete (selected manual row) ──
  const handleDeleteAll = useCallback(() => {
    if (manualRows.length === 0) {
      alert('삭제할 수동 입력 항목이 없습니다.');
      return;
    }
    if (!confirm(`수동 입력 ${manualRows.length}건을 모두 삭제하시겠습니까?`)) return;
    setManualRows([]);
  }, [manualRows, setManualRows]);

  return {
    fileInputRef,
    handleExport,
    handleDownloadTemplate,
    handleImport,
    handleFileChange,
    handleSave,
    handleDeleteAll,
  };
}
