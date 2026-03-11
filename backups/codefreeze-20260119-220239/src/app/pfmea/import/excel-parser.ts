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
    
    // 디버깅: 모든 시트 이름 출력 및 매핑 확인
    const allSheetNames: string[] = [];
    workbook.eachSheet((sheet) => {
      allSheetNames.push(sheet.name);
    });
    console.log('📊 Excel 파일 시트 목록:', allSheetNames);
    console.log('📊 총 시트 수:', allSheetNames.length);
    
    // 각 시트명의 매핑 결과 미리 확인
    allSheetNames.forEach(sheetName => {
      const normalized = normalizeSheetName(sheetName.trim());
      if (normalized) {
        console.log(`  ✅ "${sheetName}" → "${normalized}"`);
      } else {
        console.log(`  ❌ "${sheetName}" → 매핑 실패`);
      }
    });

    workbook.eachSheet((sheet) => {
      const originalSheetName = sheet.name.trim();
      const sheetName = normalizeSheetName(originalSheetName);
      
      // 유효한 시트만 처리 (A1-A6, B1-B5, C1-C4 또는 L2-1 ~ L1-4 형식)
      if (!sheetName) {
        console.log(`⏭️ 시트 "${originalSheetName}" 건너뜀 (유효한 이름: A1~C4 또는 L2-1~L1-4)`);
        return;
      }
      
      console.log(`📋 시트 "${originalSheetName}" → "${sheetName}" 매핑됨`);

      const headers: string[] = [];
      const rows: { key: string; value: string }[] = [];

      // 헤더 읽기 (1행)
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        headers.push(String(cell.value || ''));
      });

      // 데이터 읽기 - 1행=헤더, 2행부터=데이터 (안내행 제거됨)
      // ✅ 변경: 기본값 2행 (템플릿에서 (필수)/(선택) 안내행 제거됨)
      let startRow = 2; // 기본값: 2행부터 (헤더 다음)

      // 실제 데이터 시작 행 찾기 (숫자로 시작하는 행)
      for (let i = 1; i <= Math.min(5, sheet.rowCount); i++) {
        const row = sheet.getRow(i);
        const firstCell = String(row.getCell(1).value || '').trim();
        // 숫자로 시작하면 데이터 행으로 판단 (공정번호: 10, 20, 30 등)
        if (firstCell && /^\d+$/.test(firstCell)) {
          startRow = i;
          break;
        }
        // 헤더 행 감지: '번호', 'No', '공정', '구분', 'L2-1', 'L3-1' 등
        if (firstCell && (
          firstCell.includes('번호') ||
          firstCell.includes('No') ||
          firstCell.includes('공정') ||
          firstCell.includes('구분') ||
          /^L[123]-\d/.test(firstCell) ||
          firstCell.includes('A1') || firstCell.includes('B1') || firstCell.includes('C1')
        )) {
          startRow = i + 1;
        }
        // ✅ (필수)/(선택) 안내행 건너뛰기 (하위호환)
        if (firstCell === '(필수)' || firstCell === '(선택)') {
          startRow = i + 1;
        }
      }
      
      console.log(`📋 시트 "${sheetName}": 시작행=${startRow}, 총행수=${sheet.rowCount}`);
      
      for (let i = startRow; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        const key = String(row.getCell(1).value || '').trim();
        
        // 빈 행이면 건너뛰기
        if (!key) continue;
        
        // 시트 타입에 따라 다르게 처리
        // - A1 시트('L2-1 공정번호'): 1열=공정번호, 2열=공정명 → key=공정번호, value=공정명
        // - A2 시트: 별도 시트가 있는 경우 1열=공정번호, 2열=공정명
        // - A3-A6, B1-B5 시트: 1열=공정번호, 2열~N열=값들 (다중 값, 같은 공정번호에 여러 값)
        // - C1 시트('L1-1 구분'): 1열=구분 → key=구분, value=구분(동일)
        // - C2-C4 시트: 1열=구분, 2열~N열=값들 (다중 값, 같은 구분에 여러 값)
        const isSingleValueSheet = sheetName === 'A1' || sheetName === 'A2';
        const isC1Sheet = sheetName === 'C1';
        
        if (isSingleValueSheet) {
          // A1, A2 시트: 2열 값만 읽기 (공정명)
          const value = String(row.getCell(2).value || '').trim();
          if (value && 
              value !== 'null' && 
              value !== 'undefined' && 
              value !== '0' &&
              value !== '(필수)' &&
              value !== '(선택)') {
            rows.push({ key, value });
          }
        } else if (isC1Sheet) {
          // C1 시트: 1열=구분 (값도 동일하게)
          if (key && 
              key !== 'null' && 
              key !== 'undefined' && 
              key !== '0' &&
              key !== '(필수)' &&
              key !== '(선택)' &&
              !key.includes('구분') &&
              !key.includes('L1-1')) {
            rows.push({ key, value: key }); // key와 value 동일
          }
        } else {
          // A3-A6, B1-B5, C2-C4 시트: 2열부터 모든 열 읽기 (다중 값)
          const colCount = Math.max(row.cellCount || 2, headers.length || 20);
          let hasValue = false;
          
          for (let col = 2; col <= colCount; col++) {
            const cellValue = row.getCell(col).value;
            const value = String(cellValue || '').trim();
            // 빈 값, null, undefined, 숫자 0, '(필수)', '(선택)', 헤더 텍스트 제외
            if (value && 
                value !== 'null' && 
                value !== 'undefined' && 
                value !== '0' &&
                value !== '(필수)' &&
                value !== '(선택)' &&
                !value.includes('공정번호') &&
                !value.includes('구분') &&
                !/^L[123]-\d/.test(value)) {
              rows.push({ key, value });
              hasValue = true;
            }
          }
          
          // 값이 하나도 없으면 2열 값만이라도 추가 시도
          if (!hasValue) {
            const value = String(row.getCell(2).value || '').trim();
            if (value && 
                value !== 'null' && 
                value !== 'undefined' && 
                value !== '0' &&
                value !== '(필수)' &&
                value !== '(선택)' &&
                !value.includes('공정번호') &&
                !value.includes('구분') &&
                !/^L[123]-\d/.test(value)) {
              rows.push({ key, value });
            }
          }
        }
      }

      sheetDataMap[sheetName] = { sheetName, headers, rows };
      sheetSummary.push({ name: sheetName, rowCount: rows.length });
      const uniqueKeys = new Set(rows.map(r => r.key)).size;
      console.log(`✅ 시트 "${sheetName}" 파싱 완료: 키 ${uniqueKeys}개, 값 ${rows.length}건`);
    });

    // 공정별 관계형 데이터 구축
    const processMap = new Map<string, ProcessRelation>();

    // A1 시트에서 공정 마스터 생성 (L2-1 공정번호 시트: 1열=공정번호, 2열=공정명)
    const a1Data = sheetDataMap['A1'];
    if (a1Data) {
      console.log(`📋 A1 시트에서 공정 마스터 생성: ${a1Data.rows.length}건`);
      // A1 시트는 공정번호와 공정명이 같은 행에 있음 (1열=번호, 2열=명)
      // 같은 공정번호가 여러 번 나올 수 있으므로 Map으로 중복 제거
      const processNoMap = new Map<string, string>(); // processNo -> processName
      
      a1Data.rows.forEach((row) => {
        if (row.key) {
          // A1 시트의 경우: row.key = 공정번호, row.value = 공정명
          // 하지만 실제로는 같은 행의 다른 열일 수 있으므로 처리
          if (!processNoMap.has(row.key)) {
            processNoMap.set(row.key, row.value || '');
          }
        }
      });
      
      // 공정 마스터 생성
      processNoMap.forEach((processName, processNo) => {
        if (!processMap.has(processNo)) {
          processMap.set(processNo, {
            processNo,
            processName,
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
        } else {
          // 이미 있으면 공정명 업데이트 (빈 경우만)
          const process = processMap.get(processNo);
          if (process && !process.processName && processName) {
            process.processName = processName;
          }
        }
      });
      console.log(`  ✅ 공정 마스터 생성 완료: ${processMap.size}개`);
    } else {
      console.warn('⚠️ A1 시트가 없습니다. L2-1 공정번호 시트가 필요합니다.');
    }

    // A2 시트에서 공정명 업데이트 (A2 시트가 별도로 있는 경우 - 하위호환)
    const a2Data = sheetDataMap['A2'];
    if (a2Data) {
      console.log(`📋 A2 시트에서 공정명 업데이트: ${a2Data.rows.length}건`);
      a2Data.rows.forEach((row) => {
        if (row.key) {
          let process = processMap.get(row.key);
          if (process) {
            // 공정명 업데이트 (기존 값이 없거나 더 긴 값으로 업데이트)
            if (row.value && (!process.processName || row.value.length > process.processName.length)) {
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
      console.log(`📋 C1 시트 데이터: ${c1Data.rows.length}건`);
      c1Data.rows.forEach((row) => {
        // C1 시트: 1열이 구분, 2열부터 값들
        const productName = row.key || row.value;
        if (productName && !productMap.has(productName)) {
          productMap.set(productName, {
            productProcessName: productName,
            productFuncs: [],
            requirements: [],
            failureEffects: [],
          });
          console.log(`  ✅ 구분 추가: "${productName}"`);
        }
      });
    } else {
      console.warn('⚠️ C1 시트가 없습니다. L1-1 구분 시트가 필요합니다.');
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
        console.log(`📋 ${sheet} 시트 데이터: ${sheetData.rows.length}건`);
        let mappedCount = 0;
        sheetData.rows.forEach((row) => {
          // C2-C4 시트: 1열이 C1의 구분과 매칭되어야 함
          const product = productMap.get(row.key);
          if (product && row.value) {
            (product[field] as string[]).push(row.value);
            mappedCount++;
          } else if (row.key && !productMap.has(row.key)) {
            // C1에 없는 구분이면 자동 생성
            console.warn(`⚠️ C1에 없는 구분 "${row.key}" 발견, 자동 생성`);
            const newProduct: ProductRelation = {
              productProcessName: row.key,
              productFuncs: [],
              requirements: [],
              failureEffects: [],
            };
            (newProduct[field] as string[]).push(row.value);
            productMap.set(row.key, newProduct);
            mappedCount++;
          }
        });
        console.log(`  ✅ ${sheet} → ${field}: ${mappedCount}건 매핑됨`);
      } else {
        console.warn(`⚠️ ${sheet} 시트가 없습니다.`);
      }
    });
    
    console.log(`📊 완제품 관계형 데이터: 총 ${productMap.size}개 구분, 총 항목 ${Array.from(productMap.values()).reduce((sum, p) => sum + p.productFuncs.length + p.requirements.length + p.failureEffects.length, 0)}건`);

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

/** 시트 이름 → 내부 코드 매핑 (템플릿 다운로드와 100% 일치) */
const SHEET_NAME_MAP: Record<string, string> = {
  // 템플릿 다운로드에서 사용하는 정확한 시트명 (excel-template.ts와 일치)
  'L2-1': 'A1',                    // downloadRelationAEmpty에서 사용
  'L2-1 공정번호': 'A1',           // SHEET_DEFINITIONS에서 사용
  'L2-2': 'A2',
  'L2-2 공정명': 'A2',
  'L2-3': 'A3',
  'L2-3 공정기능': 'A3',
  'L2-4': 'A4',
  'L2-4 제품특성': 'A4',
  'L2-5': 'A5',
  'L2-5 고장형태': 'A5',
  'L2-6': 'A6',
  'L2-6 검출관리': 'A6',
  'L3-1': 'B1',                    // downloadRelationBEmpty에서 사용
  'L3-1 작업요소': 'B1',
  'L3-2': 'B2',
  'L3-2 요소기능': 'B2',
  'L3-3': 'B3',
  'L3-3 공정특성': 'B3',
  'L3-4': 'B4',
  'L3-4 고장원인': 'B4',
  'L3-5': 'B5',
  'L3-5 예방관리': 'B5',
  'L1-1': 'C1',                    // downloadRelationCEmpty에서 사용
  'L1-1 구분': 'C1',
  'L1-2': 'C2',
  'L1-2 제품기능': 'C2',
  'L1-3': 'C3',
  'L1-3 요구사항': 'C3',
  'L1-4': 'C4',
  'L1-4 고장영향': 'C4',
  // 기존 형식도 지원 (하위호환)
  'A1': 'A1', 'A2': 'A2', 'A3': 'A3', 'A4': 'A4', 'A5': 'A5', 'A6': 'A6',
  'B1': 'B1', 'B2': 'B2', 'B3': 'B3', 'B4': 'B4', 'B5': 'B5',
  'C1': 'C1', 'C2': 'C2', 'C3': 'C3', 'C4': 'C4',
};

/** 유효한 시트 이름 확인 및 내부 코드 반환 (템플릿 다운로드 시트명과 100% 매칭) */
function normalizeSheetName(name: string): string | null {
  const trimmedName = name.trim();
  
  // 1. 직접 매핑 확인 (정확한 이름 일치)
  if (SHEET_NAME_MAP[trimmedName]) {
    console.log(`✅ 시트명 "${trimmedName}" → 직접 매핑 → "${SHEET_NAME_MAP[trimmedName]}"`);
    return SHEET_NAME_MAP[trimmedName];
  }
  
  // 2. 대소문자 구분 없이 매핑 확인
  const lowerTrimmed = trimmedName.toLowerCase();
  for (const [key, value] of Object.entries(SHEET_NAME_MAP)) {
    if (key.toLowerCase() === lowerTrimmed) {
      console.log(`✅ 시트명 "${trimmedName}" → 대소문자 무시 매핑 → "${value}"`);
      return value;
    }
  }
  
  // 3. L2-1, L2-1 공정번호 같은 형식 처리 (공백 이후 제거하고 앞부분만 매칭)
  const nameParts = trimmedName.split(/\s+/);
  const baseName = nameParts[0]; // 'L2-1', 'L3-1', 'L1-1' 등
  
  // 4. L2-1, L3-1, L1-1 형식 직접 매핑 (템플릿 다운로드와 동일)
  const directMap: Record<string, string> = {
    'L2-1': 'A1', 'L2-2': 'A2', 'L2-3': 'A3', 'L2-4': 'A4', 'L2-5': 'A5', 'L2-6': 'A6',
    'L3-1': 'B1', 'L3-2': 'B2', 'L3-3': 'B3', 'L3-4': 'B4', 'L3-5': 'B5',
    'L1-1': 'C1', 'L1-2': 'C2', 'L1-3': 'C3', 'L1-4': 'C4',
  };
  
  if (directMap[baseName]) {
    console.log(`✅ 시트명 "${trimmedName}" → "${baseName}" → "${directMap[baseName]}" 매핑`);
    return directMap[baseName];
  }
  
  // 5. 부분 매핑 확인 (시트 이름 앞부분만 일치) - 템플릿과의 호환성
  for (const [key, value] of Object.entries(SHEET_NAME_MAP)) {
    const keyBase = key.split(/\s+/)[0].toLowerCase();
    const nameBase = baseName.toLowerCase();
    if (nameBase === keyBase || trimmedName.toLowerCase().startsWith(keyBase)) {
      console.log(`✅ 시트명 "${trimmedName}" → "${keyBase}" → "${value}" 부분 매핑`);
      return value;
    }
  }
  
  // 6. 기존 A1~C4 형식 확인 (하위호환)
  const validNames = [
    'A1', 'A2', 'A3', 'A4', 'A5', 'A6',
    'B1', 'B2', 'B3', 'B4', 'B5',
    'C1', 'C2', 'C3', 'C4',
  ];
  if (validNames.includes(trimmedName) || validNames.includes(trimmedName.toUpperCase())) {
    const matched = validNames.find(n => n.toUpperCase() === trimmedName.toUpperCase());
    console.log(`✅ 시트명 "${trimmedName}" → 기존 형식 → "${matched}"`);
    return matched || trimmedName.toUpperCase();
  }
  
  console.log(`⏭️ 시트 "${trimmedName}" 매핑 실패 (유효한 이름 아님)`);
  console.log(`   예상 시트명: L2-1, L2-2, L2-3, L2-4, L2-5, L2-6, L3-1, L3-2, L3-3, L3-4, L3-5, L1-1, L1-2, L1-3, L1-4`);
  return null;
}

/** 유효한 시트 이름 확인 */
function isValidSheetName(name: string): boolean {
  return normalizeSheetName(name) !== null;
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

