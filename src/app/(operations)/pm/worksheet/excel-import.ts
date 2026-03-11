/**
 * @file excel-import.ts
 * @description PFD 워크시트 엑셀 Import (병합 상태 유지)
 * @version 1.0.0
 * @created 2026-01-25
 * 
 * 병합된 Excel 파일을 Import하면 병합 상태 그대로 렌더링
 */

import ExcelJS from 'exceljs';
import { PfdItem } from './types';
import { v4 as uuidv4 } from 'uuid';

// =====================================================
// 타입 정의
// =====================================================
export interface PfdImportResult {
    success: boolean;
    items: PfdItem[];
    pfdNo?: string;
    errors: string[];
    warnings: string[];
    rowCount: number;
}

// =====================================================
// 병합 정보 추출
// =====================================================
interface MergeInfo {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
}

function getMergeInfoForCell(
    merges: Map<string, MergeInfo>,
    row: number,
    col: number
): MergeInfo | null {
    for (const [, merge] of merges) {
        if (
            row >= merge.startRow && row <= merge.endRow &&
            col >= merge.startCol && col <= merge.endCol
        ) {
            return merge;
        }
    }
    return null;
}

// =====================================================
// 메인 Import 함수
// =====================================================
export async function importPFDExcel(file: File): Promise<PfdImportResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const items: PfdItem[] = [];

    try {
        const workbook = new ExcelJS.Workbook();
        const buffer = await file.arrayBuffer();
        await workbook.xlsx.load(buffer);

        // 첫 번째 시트 또는 'PFD 워크시트' 시트 찾기
        let ws: ExcelJS.Worksheet | undefined;
        workbook.eachSheet((sheet) => {
            if (!ws || sheet.name.includes('PFD') || sheet.name.includes('워크시트')) {
                ws = sheet;
            }
        });

        if (!ws) {
            return {
                success: false,
                items: [],
                errors: ['시트를 찾을 수 없습니다.'],
                warnings: [],
                rowCount: 0,
            };
        }


        // 병합 정보 추출
        const merges = new Map<string, MergeInfo>();
        ws.model.merges?.forEach(mergeRef => {
            const [start, end] = mergeRef.split(':');
            const startMatch = start.match(/([A-Z]+)(\d+)/);
            const endMatch = end.match(/([A-Z]+)(\d+)/);

            if (startMatch && endMatch) {
                const startCol = startMatch[1].charCodeAt(0) - 64;
                const startRow = parseInt(startMatch[2]);
                const endCol = endMatch[1].charCodeAt(0) - 64;
                const endRow = parseInt(endMatch[2]);

                merges.set(mergeRef, { startRow, endRow, startCol, endCol });
            }
        });


        // PFD No 추출 (1행에서)
        let pfdNo = '';
        const firstRow = ws.getRow(1);
        const firstCell = String(firstRow.getCell(1).value || '');
        const pfdNoMatch = firstCell.match(/PFD No:\s*(.+)/);
        if (pfdNoMatch) {
            pfdNo = pfdNoMatch[1].trim();
        }

        // 데이터 시작 행 찾기 (헤더 다음)
        let startRow = 4; // 기본: 4행부터 데이터
        for (let i = 1; i <= 5; i++) {
            const row = ws.getRow(i);
            const cell1 = String(row.getCell(1).value || '').trim();
            // 숫자로 시작하면 데이터 행
            if (/^\d+$/.test(cell1)) {
                startRow = i;
                break;
            }
        }


        // 데이터 추출 (병합 셀 처리)
        const cellValueCache = new Map<string, string>();

        // 먼저 모든 셀 값 캐싱 (병합 셀의 첫 번째 값)
        for (const [mergeRef, merge] of merges) {
            const firstCellValue = String(ws.getRow(merge.startRow).getCell(merge.startCol).value || '').trim();
            for (let r = merge.startRow; r <= merge.endRow; r++) {
                for (let c = merge.startCol; c <= merge.endCol; c++) {
                    cellValueCache.set(`${r}-${c}`, firstCellValue);
                }
            }
        }

        // ★ 이전 행 값 저장 (병합 컬럼 상속용) - CP와 동일
        let prevRow: Partial<PfdItem> = {};

        // 데이터 행 읽기
        for (let rowNum = startRow; rowNum <= ws.rowCount; rowNum++) {
            const row = ws.getRow(rowNum);

            // 셀 값 가져오기 (병합된 경우 캐시에서)
            const getCellValue = (col: number): string => {
                const cacheKey = `${rowNum}-${col}`;
                if (cellValueCache.has(cacheKey)) {
                    return cellValueCache.get(cacheKey)!;
                }
                return String(row.getCell(col).value || '').trim();
            };

            const processNo = getCellValue(1);

            // 빈 행이면 건너뛰기
            if (!processNo) continue;

            // ★ 상속 컬럼 값 결정 (CP와 동일)
            // ⚠️ partName, equipment는 상속하지 않음 (빈 값이면 빈 값 유지)
            const inheritColumns = ['processNo', 'processName', 'processLevel', 'processDesc'];

            const getInheritedValue = (col: number, key: string): string => {
                const value = getCellValue(col);
                if (value) return value;
                // 상속 컬럼이면 이전 행 값 사용
                if (inheritColumns.includes(key)) {
                    return (prevRow as any)[key] || '';
                }
                return '';
            };

            // PFD Item 생성 (★ 5열=partName, 6열=equipment로 수정)
            const item: PfdItem = {
                id: uuidv4(),
                pfdId: pfdNo,  // pfdNo → pfdId
                sortOrder: items.length,
                charIndex: items.length,
                processNo: getInheritedValue(1, 'processNo'),
                processName: getInheritedValue(2, 'processName'),
                processLevel: getInheritedValue(3, 'processLevel'),
                processDesc: getInheritedValue(4, 'processDesc'),
                partName: getInheritedValue(5, 'partName'),      // ★ 5열 = 부품명 (CP와 동일)
                equipment: getInheritedValue(6, 'equipment'),     // ★ 6열 = 설비
                productSC: getCellValue(7) || '',    // 제품SC
                productChar: getCellValue(8) || '',  // 제품특성
                processSC: getCellValue(9) || '',    // 공정SC
                processChar: getCellValue(10) || '', // 공정특성
            };

            items.push(item);

            // ★ 현재 행을 이전 행으로 저장 (상속용)
            prevRow = { ...item };
        }


        return {
            success: true,
            items,
            pfdNo,
            errors,
            warnings,
            rowCount: items.length,
        };
    } catch (error) {
        console.error('PFD Excel Import 오류:', error);
        return {
            success: false,
            items: [],
            errors: [`파일 Import 오류: ${error}`],
            warnings: [],
            rowCount: 0,
        };
    }
}
