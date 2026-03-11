/**
 * @file exportFunctionL1.ts
 * @description 1L 완제품 기능분석 Excel 내보내기
 */

import ExcelJS from 'exceljs';
import { WorksheetState } from '../constants';
import { applyHeaderStyle, applyDataStyle, saveExcelFile, EXCEL_COLORS } from './excelStyles';

/**
 * 1L 완제품 기능분석 Excel 내보내기 (화면과 1:1 일치)
 * @param includeFailure - true이면 고장영향 컬럼 포함 (4단계), false이면 기능분석만 (3단계)
 */
export async function exportFunctionL1(state: WorksheetState, fmeaName: string, includeFailure: boolean = false) {
  const workbook = new ExcelJS.Workbook();
  const sheetName = includeFailure ? '1L 고장영향' : '1L 완제품기능';
  const worksheet = workbook.addWorksheet(sheetName, {
    properties: { tabColor: { argb: includeFailure ? 'C62828' : '1B5E20' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  // 고장영향 데이터 가져오기
  const failureScopes = (state.l1 as any)?.failureScopes || [];

  // 기능분석만 또는 고장분석 포함 컬럼
  const baseColumns = [
    { header: '완제품 공정명', key: 'l1Name', width: 20 },
    { header: '구분', key: 'type', width: 15 },
    { header: '완제품기능', key: 'function', width: 35 },
    { header: '요구사항', key: 'requirement', width: 20 },
  ];
  
  const failureColumns = [
    { header: '고장영향(FE)', key: 'failureEffect', width: 25 },
    { header: 'S', key: 'severity', width: 5 },
  ];
  
  const columns = includeFailure ? [...baseColumns, ...failureColumns] : baseColumns;
  worksheet.columns = columns;

  // 헤더 설정
  const headerRow = worksheet.getRow(1);
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    const color = idx === 0 ? EXCEL_COLORS.structure : idx < 4 ? EXCEL_COLORS.function : EXCEL_COLORS.failure;
    applyHeaderStyle(cell, color);
  });
  headerRow.height = 25;

  // 평탄화된 데이터 생성
  interface FlatData { 
    l1Name: string; 
    type: string; 
    function: string; 
    requirement: string; 
    failureEffect?: string; 
    severity?: number; 
  }
  const flatData: FlatData[] = [];
  
  const l1Name = state.l1?.name || '';
  const types = (state.l1 as any)?.types || [];
  
  types.forEach((type: any) => {
    const typeName = type.name || '';
    const functions = type.functions || [];
    
    functions.forEach((fn: any) => {
      const requirements = fn.requirements || [];
      
      if (requirements.length === 0) {
        if (includeFailure) {
          // 고장영향 포함 시, 해당 요구사항과 연결된 FE 찾기
          const linkedFEs = failureScopes.filter((fs: any) => fs.reqId === null && fn.id);
          if (linkedFEs.length === 0) {
            flatData.push({ l1Name, type: typeName, function: fn.name || '', requirement: '', failureEffect: '', severity: 0 });
          } else {
            linkedFEs.forEach((fe: any) => {
              flatData.push({ l1Name, type: typeName, function: fn.name || '', requirement: '', failureEffect: fe.effect || '', severity: fe.severity || 0 });
            });
          }
        } else {
          flatData.push({ l1Name, type: typeName, function: fn.name || '', requirement: '' });
        }
      } else {
        requirements.forEach((req: any) => {
          if (includeFailure) {
            // 해당 요구사항과 연결된 FE 찾기
            const linkedFEs = failureScopes.filter((fs: any) => fs.reqId === req.id);
            if (linkedFEs.length === 0) {
              flatData.push({ l1Name, type: typeName, function: fn.name || '', requirement: req.name || '', failureEffect: '', severity: 0 });
            } else {
              linkedFEs.forEach((fe: any) => {
                flatData.push({ l1Name, type: typeName, function: fn.name || '', requirement: req.name || '', failureEffect: fe.effect || '', severity: fe.severity || 0 });
              });
            }
          } else {
            flatData.push({ l1Name, type: typeName, function: fn.name || '', requirement: req.name || '' });
          }
        });
      }
    });
  });

  // 데이터 기록 및 병합
  let rowNum = 2;
  interface MergeInfo { startRow: number; endRow: number; col: number }
  const l1Merges: MergeInfo[] = [];
  const typeMerges: MergeInfo[] = [];
  const funcMerges: MergeInfo[] = [];
  
  let currentL1 = '';
  let l1StartRow = rowNum;
  let currentType = '';
  let typeStartRow = rowNum;
  let currentFunc = '';
  let funcStartRow = rowNum;

  flatData.forEach((data) => {
    const row = worksheet.getRow(rowNum);
    row.getCell(1).value = data.l1Name;
    row.getCell(2).value = data.type;
    row.getCell(3).value = data.function;
    row.getCell(4).value = data.requirement;
    if (includeFailure) {
      row.getCell(5).value = data.failureEffect || '';
      row.getCell(6).value = data.severity || '';
    }
    
    const cellIndices = includeFailure ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4];
    cellIndices.forEach(i => {
      applyDataStyle(row.getCell(i), rowNum % 2 === 0);
      if (i === 2 || i === 6) row.getCell(i).alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // 병합 추적 - L1
    if (data.l1Name !== currentL1) {
      if (currentL1 && rowNum > l1StartRow) l1Merges.push({ startRow: l1StartRow, endRow: rowNum - 1, col: 1 });
      currentL1 = data.l1Name;
      l1StartRow = rowNum;
    }
    
    // 병합 추적 - 구분
    if (data.type !== currentType) {
      if (currentType && rowNum > typeStartRow) typeMerges.push({ startRow: typeStartRow, endRow: rowNum - 1, col: 2 });
      currentType = data.type;
      typeStartRow = rowNum;
    }
    
    // 병합 추적 - 기능
    const funcKey = `${data.type}_${data.function}`;
    if (funcKey !== currentFunc) {
      if (currentFunc && rowNum > funcStartRow) funcMerges.push({ startRow: funcStartRow, endRow: rowNum - 1, col: 3 });
      currentFunc = funcKey;
      funcStartRow = rowNum;
    }

    rowNum++;
  });

  // 마지막 병합 처리
  if (currentL1 && rowNum > l1StartRow) l1Merges.push({ startRow: l1StartRow, endRow: rowNum - 1, col: 1 });
  if (currentType && rowNum > typeStartRow) typeMerges.push({ startRow: typeStartRow, endRow: rowNum - 1, col: 2 });
  if (currentFunc && rowNum > funcStartRow) funcMerges.push({ startRow: funcStartRow, endRow: rowNum - 1, col: 3 });

  // 병합 적용
  l1Merges.forEach(m => { if (m.endRow > m.startRow) worksheet.mergeCells(m.startRow, m.col, m.endRow, m.col); });
  typeMerges.forEach(m => { if (m.endRow > m.startRow) worksheet.mergeCells(m.startRow, m.col, m.endRow, m.col); });
  funcMerges.forEach(m => { if (m.endRow > m.startRow) worksheet.mergeCells(m.startRow, m.col, m.endRow, m.col); });

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = includeFailure ? `${fmeaName}_1L_고장영향` : `${fmeaName}_1L_완제품기능`;
  saveExcelFile(buffer, fileName);
}



