// CODEFREEZE
/**
 * @file excel-import.ts
 * @description PFD 워크시트 엑셀 Import (공정흐름 심볼 포함 + 병합 상태 유지)
 * @version 2.0.0
 * @updated 2026-02-26 - 공정흐름 심볼 Import, 자동 헤더 매핑 최적화
 */

import type ExcelJS from 'exceljs';
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

// 공정흐름 심볼 → 키 매핑
const FLOW_SYMBOL_MAP: Record<string, string> = {
    '●': 'flowWork',
    '▶': 'flowTransport',
    '▲': 'flowStorage',
    '◆': 'flowInspect',
};

// 헤더 → 필드 매핑 (유연한 매칭)
const HEADER_MAP: Record<string, string> = {
    'P-No': 'processNo',
    'p-no': 'processNo',
    'P-NO': 'processNo',
    '공정번호': 'processNo',
    '공정명': 'processName',
    '작업': 'flowWork',
    '운반': 'flowTransport',
    '저장': 'flowStorage',
    '검사': 'flowInspect',
    '레벨': 'processLevel',
    '공정설명': 'processDesc',
    '부품명': 'partName',
    '설비': 'equipment',
    '설비/금형/JIG': 'equipment',
    '설비/금형': 'equipment',
    'no': 'charNo',
    'NO': 'charNo',
    '제품SC': 'productSC',
    '제품특성': 'productChar',
    '공정SC': 'processSC',
    '공정특성': 'processChar',
};

// =====================================================
// 메인 Import 함수
// =====================================================
export async function importPFDExcel(file: File): Promise<PfdImportResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const items: PfdItem[] = [];

    try {
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        const buffer = await file.arrayBuffer();
        await workbook.xlsx.load(buffer);

        // 시트 찾기
        let ws: ExcelJS.Worksheet | undefined;
        workbook.eachSheet((sheet) => {
            if (!ws || sheet.name.includes('PFD') || sheet.name.includes('워크시트')) {
                ws = sheet;
            }
        });

        if (!ws) {
            return { success: false, items: [], errors: ['시트를 찾을 수 없습니다.'], warnings: [], rowCount: 0 };
        }


        // ★ 병합 정보를 Map<"row-col", masterValue>로 구축
        const mergeValueCache = new Map<string, string>();
        ws.model.merges?.forEach(mergeRef => {
            const [start, end] = mergeRef.split(':');
            const startMatch = start.match(/([A-Z]+)(\d+)/);
            const endMatch = end.match(/([A-Z]+)(\d+)/);

            if (startMatch && endMatch) {
                const startCol = colLetterToNum(startMatch[1]);
                const startRow = parseInt(startMatch[2]);
                const endCol = colLetterToNum(endMatch[1]);
                const endRow = parseInt(endMatch[2]);

                const masterValue = String(ws!.getRow(startRow).getCell(startCol).value || '').trim();
                for (let r = startRow; r <= endRow; r++) {
                    for (let c = startCol; c <= endCol; c++) {
                        mergeValueCache.set(`${r}-${c}`, masterValue);
                    }
                }
            }
        });

        // ★ 헤더 행 자동 탐지 + 컬럼 매핑
        let headerRowNum = -1;
        const colMapping = new Map<number, string>(); // excelCol → fieldKey

        for (let r = 1; r <= Math.min(5, ws.rowCount); r++) {
            const row = ws.getRow(r);
            let matchCount = 0;
            const tempMap = new Map<number, string>();

            row.eachCell({ includeEmpty: false }, (cell, colNum) => {
                const val = String(cell.value || '').trim();
                const fieldKey = HEADER_MAP[val];
                if (fieldKey) {
                    tempMap.set(colNum, fieldKey);
                    matchCount++;
                }
            });

            if (matchCount >= 3) {
                headerRowNum = r;
                tempMap.forEach((v, k) => colMapping.set(k, v));
                break;
            }
        }

        if (headerRowNum === -1) {
            // 폴백: 고정 컬럼 매핑 (기존 호환)
            headerRowNum = 3;
            warnings.push('헤더를 자동 감지하지 못했습니다. 기본 매핑을 사용합니다.');
            const defaultCols = ['processNo', 'processName', 'flowWork', 'flowTransport', 'flowStorage', 'flowInspect', 'processLevel', 'processDesc', 'equipment', 'charNo', 'productSC', 'productChar', 'processSC', 'processChar'];
            defaultCols.forEach((key, i) => colMapping.set(i + 1, key));
        }


        // PFD No 추출 (1행)
        let pfdNo = '';
        const firstRowCell = String(ws.getRow(1).getCell(1).value || '');
        const pfdNoMatch = firstRowCell.match(/PFD No:\s*(.+)/);
        if (pfdNoMatch) pfdNo = pfdNoMatch[1].trim();

        // ★ 데이터 읽기
        const dataStartRow = headerRowNum + 1;
        const inheritKeys = new Set(['processNo', 'processName', 'processLevel', 'processDesc']);
        let prevItem: Partial<PfdItem> = {};

        for (let rowNum = dataStartRow; rowNum <= ws.rowCount; rowNum++) {
            const row = ws.getRow(rowNum);

            // 셀 값 가져오기 (병합 캐시 우선)
            const getCellValue = (col: number): string => {
                const cacheKey = `${rowNum}-${col}`;
                return mergeValueCache.get(cacheKey) ?? String(row.getCell(col).value || '').trim();
            };

            // processNo 컬럼으로 빈 행 판별
            const processNoCol = [...colMapping.entries()].find(([_, v]) => v === 'processNo')?.[0];
            if (processNoCol && !getCellValue(processNoCol)) continue;

            // PfdItem 생성
            const item: PfdItem = {
                id: uuidv4(),
                pfdId: pfdNo,
                sortOrder: items.length,
                charIndex: items.length,
                processNo: '',
                processName: '',
                processLevel: '',
                processDesc: '',
                partName: '',
                equipment: '',
                productSC: '',
                productChar: '',
                processSC: '',
                processChar: '',
            };

            // 컬럼 매핑에 따라 값 설정
            colMapping.forEach((fieldKey, colNum) => {
                if (fieldKey === 'charNo') return; // charNo는 자동 계산

                const rawValue = getCellValue(colNum);

                // 공정흐름 심볼 처리
                if (['flowWork', 'flowTransport', 'flowStorage', 'flowInspect'].includes(fieldKey)) {
                    (item as any)[fieldKey] = !!rawValue; // 값이 있으면 true
                    return;
                }

                // 상속 컬럼 처리
                const value = rawValue || (inheritKeys.has(fieldKey) ? (prevItem as any)[fieldKey] || '' : '');
                (item as any)[fieldKey] = value;
            });

            items.push(item);
            prevItem = { ...item };
        }


        return { success: true, items, pfdNo, errors, warnings, rowCount: items.length };
    } catch (error) {
        console.error('PFD Excel Import 오류:', error);
        return { success: false, items: [], errors: [`파일 Import 오류: ${error}`], warnings: [], rowCount: 0 };
    }
}

// 컬럼 문자 → 숫자 변환 (A→1, Z→26, AA→27...)
function colLetterToNum(letters: string): number {
    let num = 0;
    for (let i = 0; i < letters.length; i++) {
        num = num * 26 + (letters.charCodeAt(i) - 64);
    }
    return num;
}
