/**
 * @file useLLDImportExport.ts
 * @description LLD Import/Export/Template 핸들러 (SRP)
 */

import { useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { downloadStyledExcel, downloadTemplate } from '@/lib/excel-utils';
import { EXCEL_HEADERS, EXCEL_COL_WIDTHS } from '../constants';
import {
  LLDRow, CLASSIFICATION_OPTIONS, createEmptyLLDRow,
  type Classification,
} from '../types';

interface UseLLDImportExportProps {
  data: LLDRow[];
  setData: React.Dispatch<React.SetStateAction<LLDRow[]>>;
}

export function useLLDImportExport({ data, setData }: UseLLDImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Export: 현재 데이터 내보내기 ──
  const handleExport = useCallback(() => {
    if (data.length === 0) { alert('내보낼 데이터가 없습니다.'); return; }
    const rows = data.map(row => [
      row.lldNo, row.classification, row.processName, row.productName,
      row.failureMode, row.cause,
      row.severity ?? '', row.occurrence ?? '', row.detection ?? '',
      row.preventionImprovement, row.detectionImprovement,
      row.completedDate, row.status, row.owner,
      row.attachmentUrl || '',
      // 숨겨진 필드
      row.applyTo === 'prevention' ? '예방관리' : '검출관리',
      row.processNo, row.vehicle, row.target, row.m4Category, row.location,
      row.fmeaId, row.appliedDate,
    ]);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadStyledExcel(EXCEL_HEADERS, rows, EXCEL_COL_WIDTHS, 'LLD(필터코드)', `LLD_Export_${today}.xlsx`);
  }, [data]);

  // ── 빈 양식 다운로드 ──
  const handleDownloadTemplate = useCallback(() => {
    downloadTemplate(EXCEL_HEADERS, EXCEL_COL_WIDTHS, 'LLD(필터코드)', 'LLD_빈양식.xlsx');
  }, []);

  // ── Import: 엑셀 파일 가져오기 ──
  const handleImport = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) { alert('시트가 없습니다.'); return; }
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
      if (json.length === 0) { alert('데이터가 없습니다.'); return; }

      const imported: LLDRow[] = json.map((row, idx) => ({
        ...createEmptyLLDRow(),
        id: `lld-import-${Date.now()}-${idx}`,
        lldNo: String(row['LLD_No'] || row['LLD No'] || row['lldNo'] || '').trim()
          || `LLD${new Date().getFullYear().toString().slice(-2)}-${String(idx + 1).padStart(3, '0')}`,
        classification: (CLASSIFICATION_OPTIONS.includes(row['구분'] as Classification) ? row['구분'] : 'CIP') as Classification,
        applyTo: (row['적용']?.includes('검출') ? 'detection' : 'prevention') as 'prevention' | 'detection',
        processNo: String(row['공정번호'] || '').trim(),
        processName: String(row['공정명'] || '').trim(),
        productName: String(row['제품명'] || '').trim(),
        failureMode: String(row['고장형태'] || row['고장형태(FM)'] || '').trim(),
        cause: String(row['고장원인'] || row['고장원인(FC)'] || '').trim(),
        severity: row['S값'] || row['S'] ? parseInt(String(row['S값'] || row['S']), 10) || null : null,
        occurrence: row['O값'] || row['O'] ? parseInt(String(row['O값'] || row['O']), 10) || null : null,
        detection: row['D값'] || row['D'] ? parseInt(String(row['D값'] || row['D']), 10) || null : null,
        improvement: '', // 레거시 호환
        preventionImprovement: String(row['예방관리 개선'] || row['예방관리개선'] || row['개선대책'] || '').trim(),
        detectionImprovement: String(row['검출관리 개선'] || row['검출관리개선'] || '').trim(),
        vehicle: String(row['차종'] || '').trim(),
        target: String(row['대상'] || '제조').trim(),
        owner: String(row['담당자'] || '').trim(),
        m4Category: String(row['4M'] || '').trim(),
        location: String(row['발생장소'] || '').trim(),
        completedDate: String(row['개선일자'] || row['완료일자'] || '').trim(),
        status: (['G', 'Y', 'R'].includes(String(row['상태'] || '').trim()) ? String(row['상태']).trim() : 'R') as 'G' | 'Y' | 'R',
        attachmentUrl: String(row['첨부(근거서류)'] || row['첨부'] || '').trim(),
      }));

      // 레거시 호환: improvement 비어있고 preventionImprovement도 비어있으면 improvement를 prevention에 넣기
      for (const row of imported) {
        if (!row.preventionImprovement && row.improvement) {
          row.preventionImprovement = row.improvement;
        }
      }

      setData(prev => {
        const map = new Map(prev.map(r => [r.lldNo, r]));
        for (const row of imported) map.set(row.lldNo, row);
        return Array.from(map.values());
      });
      alert(`Import 완료: ${imported.length}건`);
    } catch (error) { console.error('[LLD Import] 오류:', error); alert('엑셀 읽기 오류'); }
    e.target.value = '';
  }, [setData]);

  return {
    fileInputRef,
    handleExport,
    handleDownloadTemplate,
    handleImport,
    handleFileChange,
  };
}
