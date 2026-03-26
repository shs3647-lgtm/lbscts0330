/**
 * @file useLLDImportExport.ts
 * @description LLD Import/Export/Template 핸들러 (SRP)
 */

import { useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { EXCEL_HEADERS, EXCEL_COL_WIDTHS } from '../constants';
import {
  LLDRow, CLASSIFICATION_OPTIONS, createEmptyLLDRow,
  type Classification,
} from '../types';
import { exportLLDExcel, exportLLDTemplate } from '../excel-export';

interface UseLLDImportExportProps {
  data: LLDRow[];
  setData: React.Dispatch<React.SetStateAction<LLDRow[]>>;
}

export function useLLDImportExport({ data, setData }: UseLLDImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Export: ExcelJS 기반 스타일링 내보내기 ──
  const handleExport = useCallback(() => {
    exportLLDExcel(data);
  }, [data]);

  // ── 빈 양식 다운로드 ──
  const handleDownloadTemplate = useCallback(() => {
    exportLLDTemplate();
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
      const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
      if (rawRows.length === 0) { alert('데이터가 없습니다.'); return; }

      // 헤더 행 찾기 (LLD No. 가 포함된 행)
      let headerIdx = -1;
      for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
        if (rawRows[i] && typeof rawRows[i][0] === 'string' && rawRows[i][0].includes('LLD')) {
          headerIdx = i;
          break;
        }
      }
      if (headerIdx === -1) { alert('헤더(LLD No.)를 찾을 수 없습니다.'); return; }

      const headers = rawRows[headerIdx];
      // 한글 헤더 아래 영문 헤더(sub-header)가 있으면 데이터는 headerIdx + 2 부터, 아니면 headerIdx + 1 부터 시작
      let dataStartIdx = headerIdx + 1;
      if (rawRows[headerIdx + 1] && typeof rawRows[headerIdx + 1][0] === 'string' && rawRows[headerIdx + 1][0].includes('LLD')) {
        dataStartIdx = headerIdx + 2;
      }

      const imported: LLDRow[] = [];
      const timestamp = Date.now();
      
      for (let i = dataStartIdx; i < rawRows.length; i++) {
        const rowArr = rawRows[i];
        if (!rowArr || rowArr.length === 0 || !rowArr[0]) continue; // 빈 행 무시

        // 헤더 맵핑
        const row = headers.reduce((acc: any, h: string, idx: number) => {
          if (h) acc[h.trim()] = rowArr[idx];
          return acc;
        }, {});

        const rawGubun = String(row['구분'] || row['Category'] || '');
        const classification = rawGubun.includes('ABN') ? 'ABN' : rawGubun.includes('RMA') ? 'RMA' : rawGubun.includes('CIP') ? 'CIP' : 'CIP';
        
        let rawStatus = String(row['상태'] || row['Status'] || '').trim();
        let statusObj: 'G' | 'Y' | 'R' = 'R';
        if (rawStatus.includes('완료') || rawStatus === 'G') statusObj = 'G';
        else if (rawStatus.includes('예정') || rawStatus === 'Y' || classification === 'CIP') statusObj = 'Y';
        
        const lldNo = String(row['LLD No.'] || row['LLD_No'] || row['LLD No'] || row['lldNo'] || '').trim()
          || `LLD${new Date().getFullYear().toString().slice(-2)}-${String(i).padStart(3, '0')}`;
        const processName = String(row['공정명'] || row['Process'] || '').trim();
        const productName = ''; // AU_BUMP.xlsx 엔 제품명 없음
        const failureMode = String(row['고장형태(FM)'] || row['Failure Mode'] || row['고장형태'] || '').trim();
        const cause = String(row['고장원인(FC)'] || row['Failure Cause'] || row['고장원인'] || '').trim();
        const sVal = row['S'] ? parseInt(String(row['S']), 10) || null : null;
        const oVal = row['O'] ? parseInt(String(row['O']), 10) || null : null;
        const dVal = row['D'] ? parseInt(String(row['D']), 10) || null : null;
        const compDate = String(row['개선일자'] || row['완료일자'] || row['Comp. Date'] || '').trim();
        const owner = String(row['담당자'] || row['Owner'] || '').trim();
        const attach = String(row['첨부(근거서류)'] || row['Attachment'] || '').trim();

        const prevImpr = String(row['예방관리 개선'] || row['PC Improvement'] || '').trim();
        const detImpr = String(row['검출관리 개선'] || row['DC Improvement'] || '').trim();

        if (prevImpr) {
          imported.push({
            ...createEmptyLLDRow(),
            id: `lld-import-${timestamp}-P${i}`,
            lldNo, classification, applyTo: 'prevention',
            processNo: '', processName, productName, failureMode, cause,
            severity: sVal, occurrence: oVal, detection: dVal,
            improvement: '', preventionImprovement: prevImpr, detectionImprovement: detImpr,
            vehicle: '', target: '', owner, m4Category: '', location: '',
            completedDate: compDate, status: statusObj, attachmentUrl: attach,
          });
        }
        if (detImpr) {
          imported.push({
            ...createEmptyLLDRow(),
            id: `lld-import-${timestamp}-D${i}`,
            lldNo, classification, applyTo: 'detection',
            processNo: '', processName, productName, failureMode, cause,
            severity: sVal, occurrence: oVal, detection: dVal,
            improvement: '', preventionImprovement: detImpr, detectionImprovement: prevImpr,
            vehicle: '', target: '', owner, m4Category: '', location: '',
            completedDate: compDate, status: statusObj, attachmentUrl: attach,
          });
        }
      }

      setData(prev => {
        // 동일 id, lldNo+applyTo 기준으로 덮어쓰기 로직
        const newMap = new Map();
        for (const r of prev) newMap.set(`${r.lldNo}-${r.applyTo}`, r);
        for (const req of imported) newMap.set(`${req.lldNo}-${req.applyTo}`, req);
        return Array.from(newMap.values());
      });
      alert(`Import 완료: ${imported.length}건 처리됨 (투 트랙 분할 병합)`);
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
