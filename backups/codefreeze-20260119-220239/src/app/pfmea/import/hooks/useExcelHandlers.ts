/**
 * @file useExcelHandlers.ts
 * @description Excel 다운로드/업로드 관련 핸들러
 */

import { ImportedFlatData } from '../types';
import { PREVIEW_OPTIONS } from '../sampleData';

interface FMEAProject {
  id: string;
  fmeaNo?: string;
  fmeaInfo?: { subject?: string };
  project?: { productName?: string };
}

interface UseExcelHandlersProps {
  flatData: ImportedFlatData[];
  setFlatData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  fmeaList: FMEAProject[];
  previewColumn: string;
  relationTab: 'A' | 'B' | 'C';
  setIsSaved: (saved: boolean) => void;
  relationFileInputRef: React.RefObject<HTMLInputElement | null>;
  getRelationData: (tabOverride?: 'A' | 'B' | 'C') => Record<string, string>[];
}

export function useExcelHandlers({
  flatData,
  setFlatData,
  fmeaList,
  previewColumn,
  relationTab,
  setIsSaved,
  relationFileInputRef,
  getRelationData,
}: UseExcelHandlersProps) {
  
  /** 선택된 FMEA 워크시트 데이터를 엑셀로 다운로드 */
  const downloadFmeaSample = async (fmeaId: string, level: 'L0' | 'L1' | 'L2' | 'L3') => {
    if (!fmeaId) {
      alert('FMEA를 선택해주세요.');
      return;
    }
    
    const wsData = localStorage.getItem(`pfmea-worksheet-${fmeaId}`);
    if (!wsData) {
      alert('해당 FMEA의 워크시트 데이터가 없습니다.');
      return;
    }
    
    const ws = JSON.parse(wsData);
    const fmea = fmeaList.find(f => f.id === fmeaId);
    const fmeaName = fmea?.fmeaNo || fmea?.fmeaInfo?.subject || 'FMEA';
    
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    
    if (level === 'L1') {
      const sheet = workbook.addWorksheet('L1_고장영향');
      sheet.columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: '구분', key: 'type', width: 15 },
        { header: '완제품기능', key: 'func', width: 30 },
        { header: '요구사항', key: 'req', width: 25 },
        { header: '고장영향', key: 'effect', width: 30 },
        { header: '심각도', key: 'severity', width: 8 },
      ];
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EF4444' } }; cell.font = { bold: true, color: { argb: 'FFFFFF' } }; });
      
      let rowNo = 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ws.l1?.types || []).forEach((t: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (t.functions || []).forEach((fn: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (fn.requirements || []).forEach((req: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (req.failureEffects || [{ name: '' }]).forEach((fe: any) => {
              sheet.addRow({ no: rowNo++, type: t.typeName, func: fn.name, req: req.name, effect: fe.name || '', severity: fe.severity || '' });
            });
          });
        });
      });
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${fmeaName}_L1_고장영향_${new Date().toISOString().slice(0, 10)}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      
    } else if (level === 'L2') {
      const sheet = workbook.addWorksheet('L2_고장형태');
      sheet.columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: '공정명', key: 'proc', width: 15 },
        { header: '공정기능', key: 'func', width: 25 },
        { header: '제품특성', key: 'char', width: 25 },
        { header: '고장형태', key: 'mode', width: 30 },
      ];
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '3B82F6' } }; cell.font = { bold: true, color: { argb: 'FFFFFF' } }; });
      
      let rowNo = 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ws.l2 || []).forEach((proc: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (proc.functions || []).forEach((fn: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (fn.productChars || []).forEach((pc: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (pc.failureModes || [{ name: '' }]).forEach((fm: any) => {
              sheet.addRow({ no: rowNo++, proc: proc.name, func: fn.name, char: pc.name, mode: fm.name || '' });
            });
          });
        });
      });
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${fmeaName}_L2_고장형태_${new Date().toISOString().slice(0, 10)}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      
    } else if (level === 'L3') {
      const sheet = workbook.addWorksheet('L3_고장원인');
      sheet.columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: '공정명', key: 'proc', width: 12 },
        { header: '작업요소', key: 'we', width: 15 },
        { header: '요소기능', key: 'func', width: 25 },
        { header: '공정특성', key: 'char', width: 25 },
        { header: '고장원인', key: 'cause', width: 30 },
        { header: '발생도', key: 'occ', width: 8 },
      ];
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '22C55E' } }; cell.font = { bold: true, color: { argb: 'FFFFFF' } }; });
      
      let rowNo = 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ws.l2 || []).forEach((proc: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (proc.l3 || []).forEach((we: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (we.functions || []).forEach((fn: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (fn.processChars || []).forEach((pc: any) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (pc.failureCauses || [{ name: '' }]).forEach((fc: any) => {
                sheet.addRow({ no: rowNo++, proc: proc.name, we: we.name, func: fn.name, char: pc.name, cause: fc.name || '', occ: fc.occurrence || '' });
              });
            });
          });
        });
      });
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${fmeaName}_L3_고장원인_${new Date().toISOString().slice(0, 10)}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      
    } else {
      const sheet = workbook.addWorksheet('L0_기초정보');
      sheet.columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: '완제품공정명', key: 'l1', width: 20 },
        { header: '메인공정', key: 'l2', width: 20 },
        { header: '작업요소', key: 'l3', width: 20 },
      ];
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00587A' } }; cell.font = { bold: true, color: { argb: 'FFFFFF' } }; });
      
      let rowNo = 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ws.l2 || []).forEach((proc: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (proc.l3 || []).forEach((we: any) => {
          sheet.addRow({ no: rowNo++, l1: ws.l1?.name || '', l2: proc.name, l3: we.name });
        });
      });
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${fmeaName}_L0_기초정보_${new Date().toISOString().slice(0, 10)}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    }
  };
  
  /** FMEA 기초정보 미리 보기 데이터 다운로드 */
  const handleDownloadPreview = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const selectedLabel = PREVIEW_OPTIONS.find(opt => opt.value === previewColumn)?.label || previewColumn;
    const sheet = workbook.addWorksheet(selectedLabel);
    
    sheet.columns = [
      { header: 'NO', key: 'no', width: 8 },
      { header: '공정번호', key: 'processNo', width: 12 },
      { header: selectedLabel.split(' ')[1] || selectedLabel, key: 'value', width: 40 },
    ];
    
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00587A' } };
      cell.font = { bold: true, color: { argb: 'FFFFFF' }, name: '맑은 고딕', size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { 
        top: { style: 'thin', color: { argb: 'FFFFFF' } }, 
        left: { style: 'thin', color: { argb: 'FFFFFF' } }, 
        bottom: { style: 'thin', color: { argb: 'FFFFFF' } }, 
        right: { style: 'thin', color: { argb: 'FFFFFF' } } 
      };
    });
    
    const previewData = flatData.filter(d => d.itemCode === previewColumn);
    previewData.forEach((item, idx) => {
      const row = sheet.addRow({ no: idx + 1, processNo: item.processNo, value: item.value });
      row.eachCell((cell) => {
        cell.border = { 
          top: { style: 'thin', color: { argb: '999999' } }, 
          left: { style: 'thin', color: { argb: '999999' } }, 
          bottom: { style: 'thin', color: { argb: '999999' } }, 
          right: { style: 'thin', color: { argb: '999999' } } 
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { name: '맑은 고딕', size: 10 };
      });
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `입포트_${selectedLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  /** 관계형 데이터 Excel 다운로드 */
  const handleRelationDownload = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      
      const sheetName = relationTab === 'A' ? 'A_공정' : relationTab === 'B' ? 'B_작업요소' : 'C_완제품';
      const sheet = workbook.addWorksheet(sheetName);
      
      if (relationTab === 'A') {
        sheet.columns = [
          { header: 'A1 No', key: 'A1', width: 10 },
          { header: 'A2 공정명', key: 'A2', width: 15 },
          { header: 'A3 기능', key: 'A3', width: 20 },
          { header: 'A4 특성', key: 'A4', width: 15 },
          { header: 'A5 고장', key: 'A5', width: 15 },
          { header: 'A6 검출', key: 'A6', width: 15 },
        ];
      } else if (relationTab === 'B') {
        sheet.columns = [
          { header: 'A1 No', key: 'A1', width: 10 },
          { header: 'B1 작업요소', key: 'B1', width: 15 },
          { header: 'B2 기능', key: 'B2', width: 20 },
          { header: 'B3 특성', key: 'B3', width: 15 },
          { header: 'B4 원인', key: 'B4', width: 15 },
          { header: 'B5 예방', key: 'B5', width: 15 },
        ];
      } else {
        sheet.columns = [
          { header: 'No', key: 'A1', width: 10 },
          { header: 'C1 구분', key: 'C1', width: 15 },
          { header: 'C2 기능', key: 'C2', width: 20 },
          { header: 'C3 요구', key: 'C3', width: 15 },
          { header: 'C4 영향', key: 'C4', width: 15 },
          { header: '비고', key: 'note', width: 15 },
        ];
      }
      
      sheet.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00587a' } };
        cell.font = { color: { argb: 'FFFFFF' }, bold: true };
        cell.alignment = { horizontal: 'center' };
      });
      
      const relationDataItems = getRelationData();
      relationDataItems.forEach((row) => {
        sheet.addRow(row);
      });
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `관계형_${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      
      console.log(`✅ ${sheetName} 다운로드 완료: ${relationDataItems.length}건`);
    } catch (error) {
      console.error('다운로드 오류:', error);
      alert('다운로드 중 오류가 발생했습니다.');
    }
  };
  
  /** 관계형 데이터 Excel 입포트 */
  const handleRelationImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);
      
      const sheet = workbook.worksheets[0];
      if (!sheet) {
        alert('Excel 파일에서 시트를 찾을 수 없습니다.');
        return;
      }
      
      const newData: ImportedFlatData[] = [];
      const category = relationTab;
      
      for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        const processNo = String(row.getCell(1).value || '').trim();
        if (!processNo) continue;
        
        const colMapping = relationTab === 'A' 
          ? ['A1', 'A2', 'A3', 'A4', 'A5', 'A6']
          : relationTab === 'B'
          ? ['A1', 'B1', 'B2', 'B3', 'B4', 'B5']
          : ['A1', 'C1', 'C2', 'C3', 'C4'];
        
        for (let col = 2; col <= colMapping.length; col++) {
          const value = String(row.getCell(col).value || '').trim();
          const itemCode = colMapping[col - 1];
          if (value && itemCode) {
            newData.push({
              id: `${processNo}-${itemCode}-${i}`,
              processNo: category === 'C' ? 'ALL' : processNo,
              category: itemCode.charAt(0) as 'A' | 'B' | 'C',
              itemCode,
              value,
              createdAt: new Date(),
            });
          }
        }
      }
      
      if (newData.length === 0) {
        alert('Import할 데이터가 없습니다.');
        return;
      }
      
      const itemCodes = relationTab === 'A' 
        ? ['A2', 'A3', 'A4', 'A5', 'A6']
        : relationTab === 'B'
        ? ['B1', 'B2', 'B3', 'B4', 'B5']
        : ['C1', 'C2', 'C3', 'C4'];
      
      setFlatData(prev => {
        const otherData = prev.filter(d => !itemCodes.includes(d.itemCode));
        return [...otherData, ...newData];
      });
      setIsSaved(false);
      
      alert(`${relationTab} 관계형 데이터 ${newData.length}건 Import 완료!`);
      
      if (relationFileInputRef.current) {
        relationFileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('관계형 입포트 오류:', error);
      alert('Import 중 오류가 발생했습니다.');
    }
  };
  
  return {
    downloadFmeaSample,
    handleDownloadPreview,
    handleRelationDownload,
    handleRelationImport,
  };
}


