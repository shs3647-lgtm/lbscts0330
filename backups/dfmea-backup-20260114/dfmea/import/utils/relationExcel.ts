/**
 * @file relationExcel.ts
 * @description 관계형 데이터 Excel 다운로드/업로드 유틸리티
 */

import ExcelJS from 'exceljs';
import { ImportedFlatData } from '../types';
import { downloadExcelBuffer } from './excelDownload';

/** 관계형 탭 타입 */
export type RelationTab = 'A' | 'B' | 'C';

/** 관계형 데이터 Excel 다운로드 */
export async function downloadRelationExcel(
  relationTab: RelationTab,
  relationData: any[]
) {
  const workbook = new ExcelJS.Workbook();
  const sheetName = relationTab === 'A' ? 'A_공정' : relationTab === 'B' ? 'B_작업요소' : 'C_완제품';
  const sheet = workbook.addWorksheet(sheetName);
  
  // 헤더 설정
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
  
  // 헤더 스타일
  sheet.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00587a' } };
    cell.font = { color: { argb: 'FFFFFF' }, bold: true };
    cell.alignment = { horizontal: 'center' };
  });
  
  // 데이터 추가
  relationData.forEach((row) => {
    sheet.addRow(row);
  });
  
  // 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `관계형_${sheetName}_${new Date().toISOString().slice(0, 10)}`;
  await downloadExcelBuffer(buffer, fileName);
  
  console.log(`✅ ${sheetName} 다운로드 완료: ${relationData.length}건`);
}

/** 관계형 데이터 Excel 업로드 파싱 */
export async function parseRelationExcel(
  file: File,
  relationTab: RelationTab
): Promise<ImportedFlatData[]> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);
  
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('Excel 파일에서 시트를 찾을 수 없습니다.');
  }
  
  const newData: ImportedFlatData[] = [];
  const category = relationTab;
  
  // 2행부터 데이터 읽기 (1행은 헤더)
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const processNo = String(row.getCell(1).value || '').trim();
    if (!processNo) continue;
    
    // 각 열을 해당 itemCode로 변환
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
  
  return newData;
}

/** 관계형 데이터 병합 */
export function mergeRelationData(
  existingData: ImportedFlatData[],
  newData: ImportedFlatData[],
  relationTab: RelationTab
): ImportedFlatData[] {
  const itemCodes = relationTab === 'A' 
    ? ['A2', 'A3', 'A4', 'A5', 'A6']
    : relationTab === 'B'
    ? ['B1', 'B2', 'B3', 'B4', 'B5']
    : ['C1', 'C2', 'C3', 'C4'];
  
  const otherData = existingData.filter(d => !itemCodes.includes(d.itemCode));
  return [...otherData, ...newData];
}



