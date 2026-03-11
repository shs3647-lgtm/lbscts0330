/**
 * @file excel-parser.ts
 * @description PFMEA 기초정보 Excel 파서 - 다중 시트 방식
 * @author AI Assistant
 * @created 2025-12-26
 * 
 * 시트 구조:
 * A1-A6: 공정번호 + 공정 레벨 항목
 * B1-B5: 공정번호 + 작업요소 레벨 항목
 * C1-C4: 구분(YOUR PLANT/SHIP TO PLANT/USER) + 완제품 레벨 항목
 * 
 * 공정번호를 기준으로 모든 시트를 연결하여 관계형 데이터 생성
 */

import ExcelJS from 'exceljs';

/** 시트별 데이터 타입 */
export interface SheetData {
  sheetName: string;
  headers: string[];
  rows: { key: string; value: string }[];
}

/** 공정별 관계형 데이터 */
export interface ProcessRelation {
  processNo: string;
  processName: string;
  // A 레벨: 공정
  processDesc: string[];      // A3
  productChars: string[];     // A4
  failureModes: string[];     // A5
  detectionCtrls: string[];   // A6
  // B 레벨: 작업요소
  workElements: string[];     // B1
  elementFuncs: string[];     // B2
  processChars: string[];     // B3
  failureCauses: string[];    // B4
  preventionCtrls: string[];  // B5
}

/** 완제품별 관계형 데이터 */
export interface ProductRelation {
  productProcessName: string; // C1
  productFuncs: string[];     // C2
  requirements: string[];     // C3
  failureEffects: string[];   // C4
}

/** 파싱 결과 */
export interface ParseResult {
  success: boolean;
  processes: ProcessRelation[];
  products: ProductRelation[];
  sheetSummary: { name: string; rowCount: number }[];
  errors: string[];
}

/**
 * Excel 파일 파싱 (다중 시트) - 모든 열 읽기 지원
 */
export async function parseMultiSheetExcel(file: File): Promise<ParseResult> {
  const errors: string[] = [];
  const sheetSummary: { name: string; rowCount: number }[] = [];

  try {
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    // 시트별 데이터 추출
    const sheetDataMap: Record<string, SheetData> = {};
    
    // 디버깅: 모든 시트 이름 출력
    const allSheetNames: string[] = [];
    workbook.eachSheet((sheet) => {
      allSheetNames.push(sheet.name);
    });
    console.log('📊 Excel 파일 시트 목록:', allSheetNames);

    workbook.eachSheet((sheet) => {
      const sheetName = sheet.name.trim();
      
      // 유효한 시트만 처리 (A1-A6, B1-B5, C1-C4)
      if (!isValidSheetName(sheetName)) {
        console.log(`⏭️ 시트 "${sheetName}" 건너뜀 (유효한 이름: A1~A6, B1~B5, C1~C4)`);
        return;
      }

      const headers: string[] = [];
      const rows: { key: string; value: string }[] = [];

      // 헤더 읽기 (1행)
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        headers.push(String(cell.value || ''));
      });

      // 데이터 읽기 - 1행부터 시작해서 실제 데이터 찾기
      let startRow = 1;
      for (let i = 1; i <= Math.min(5, sheet.rowCount); i++) {
        const row = sheet.getRow(i);
        const firstCell = String(row.getCell(1).value || '').trim();
        // 숫자로 시작하면 데이터 행으로 판단
        if (firstCell && /^\d+$/.test(firstCell)) {
          startRow = i;
          break;
        }
        // 공정번호, 번호 등의 헤더가 있으면 다음 행부터
        if (firstCell && (firstCell.includes('번호') || firstCell.includes('No') || firstCell.includes('공정'))) {
          startRow = i + 1;
        }
      }
      
      console.log(`📋 시트 "${sheetName}": 시작행=${startRow}, 총행수=${sheet.rowCount}`);
      
      for (let i = startRow; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        const key = String(row.getCell(1).value || '').trim();
        
        // 빈 행이면 건너뛰기
        if (!key) continue;
        
        // 2열부터 모든 열의 값을 읽어서 추가
        const colCount = Math.max(row.cellCount || 2, 20); // 최대 20열까지 확인
        let hasValue = false;
        
        for (let col = 2; col <= colCount; col++) {
          const cellValue = row.getCell(col).value;
          const value = String(cellValue || '').trim();
          if (value && value !== 'null' && value !== 'undefined') {
            rows.push({ key, value });
            hasValue = true;
          }
        }
        
        // 값이 하나도 없으면 2열 값만이라도 추가 시도
        if (!hasValue) {
          const value = String(row.getCell(2).value || '').trim();
          if (value && value !== 'null' && value !== 'undefined') {
            rows.push({ key, value });
          }
        }
      }

      sheetDataMap[sheetName] = { sheetName, headers, rows };
      sheetSummary.push({ name: sheetName, rowCount: rows.length });
      console.log(`✅ 시트 "${sheetName}" 파싱 완료: ${rows.length}건`);
    });

    // 공정별 관계형 데이터 구축
    const processMap = new Map<string, ProcessRelation>();

    // A1 시트에서 공정 마스터 생성
    const a1Data = sheetDataMap['A1'];
    if (a1Data) {
      a1Data.rows.forEach((row) => {
        if (row.key && !processMap.has(row.key)) {
          processMap.set(row.key, {
            processNo: row.key,
            processName: row.value || '', // A1 시트 2열에 공정명이 있을 수 있음
            processDesc: [],
            productChars: [],
            failureModes: [],
            detectionCtrls: [],
            workElements: [],
            elementFuncs: [],
            processChars: [],
            failureCauses: [],
            preventionCtrls: [],
          });
        }
      });
    }

    // A2 시트에서 공정명 업데이트 (A2 시트가 별도로 있는 경우)
    const a2Data = sheetDataMap['A2'];
    if (a2Data) {
      a2Data.rows.forEach((row) => {
        if (row.key) {
          let process = processMap.get(row.key);
          if (process) {
            // 공정명 업데이트
            if (row.value && !process.processName) {
              process.processName = row.value;
            }
          } else {
            // A1에 없는 공정이면 새로 생성
            processMap.set(row.key, {
              processNo: row.key,
              processName: row.value || '',
              processDesc: [],
              productChars: [],
              failureModes: [],
              detectionCtrls: [],
              workElements: [],
              elementFuncs: [],
              processChars: [],
              failureCauses: [],
              preventionCtrls: [],
            });
          }
        }
      });
    }

    // A3-A6, B1-B5 데이터 매핑
    const sheetMapping: { sheet: string; field: keyof ProcessRelation }[] = [
      { sheet: 'A3', field: 'processDesc' },
      { sheet: 'A4', field: 'productChars' },
      { sheet: 'A5', field: 'failureModes' },
      { sheet: 'A6', field: 'detectionCtrls' },
      { sheet: 'B1', field: 'workElements' },
      { sheet: 'B2', field: 'elementFuncs' },
      { sheet: 'B3', field: 'processChars' },
      { sheet: 'B4', field: 'failureCauses' },
      { sheet: 'B5', field: 'preventionCtrls' },
    ];

    sheetMapping.forEach(({ sheet, field }) => {
      const sheetData = sheetDataMap[sheet];
      if (sheetData) {
        sheetData.rows.forEach((row) => {
          const process = processMap.get(row.key);
          if (process && row.value) {
            (process[field] as string[]).push(row.value);
          } else if (row.key && !processMap.has(row.key)) {
            // 공정이 없으면 생성
            const newProcess: ProcessRelation = {
              processNo: row.key,
              processName: '',
              processDesc: [],
              productChars: [],
              failureModes: [],
              detectionCtrls: [],
              workElements: [],
              elementFuncs: [],
              processChars: [],
              failureCauses: [],
              preventionCtrls: [],
            };
            (newProcess[field] as string[]).push(row.value);
            processMap.set(row.key, newProcess);
          }
        });
      }
    });

    // 완제품별 관계형 데이터 구축
    const productMap = new Map<string, ProductRelation>();

    // C1 시트에서 구분 마스터 생성 (YOUR PLANT, SHIP TO PLANT, USER)
    const c1Data = sheetDataMap['C1'];
    if (c1Data) {
      c1Data.rows.forEach((row) => {
        const productName = row.key || row.value;
        if (productName && !productMap.has(productName)) {
          productMap.set(productName, {
            productProcessName: productName,
            productFuncs: [],
            requirements: [],
            failureEffects: [],
          });
        }
      });
    }

    // C2-C4 데이터 매핑
    const productSheetMapping: { sheet: string; field: keyof ProductRelation }[] = [
      { sheet: 'C2', field: 'productFuncs' },
      { sheet: 'C3', field: 'requirements' },
      { sheet: 'C4', field: 'failureEffects' },
    ];

    productSheetMapping.forEach(({ sheet, field }) => {
      const sheetData = sheetDataMap[sheet];
      if (sheetData) {
        sheetData.rows.forEach((row) => {
          const product = productMap.get(row.key);
          if (product && row.value) {
            (product[field] as string[]).push(row.value);
          }
        });
      }
    });

    return {
      success: true,
      processes: Array.from(processMap.values()),
      products: Array.from(productMap.values()),
      sheetSummary,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      processes: [],
      products: [],
      sheetSummary,
      errors: [`파일 파싱 오류: ${error}`],
    };
  }
}

/** 유효한 시트 이름 확인 */
function isValidSheetName(name: string): boolean {
  const validNames = [
    'A1', 'A2', 'A3', 'A4', 'A5', 'A6',
    'B1', 'B2', 'B3', 'B4', 'B5',
    'C1', 'C2', 'C3', 'C4',
  ];
  return validNames.includes(name);
}

/** 파싱 결과 통계 */
export function getParseStats(result: ParseResult) {
  return {
    totalProcesses: result.processes.length,
    totalProducts: result.products.length,
    aLevelItems: result.processes.reduce((sum, p) => 
      sum + p.productChars.length + p.failureModes.length + p.detectionCtrls.length, 0),
    bLevelItems: result.processes.reduce((sum, p) => 
      sum + p.workElements.length + p.failureCauses.length + p.preventionCtrls.length, 0),
    cLevelItems: result.products.reduce((sum, p) => 
      sum + p.productFuncs.length + p.requirements.length + p.failureEffects.length, 0),
  };
}

