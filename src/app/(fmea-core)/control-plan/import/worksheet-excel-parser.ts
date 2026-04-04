/**
 * @file worksheet-excel-parser.ts
 * @description 병합된 CP 워크시트 Excel 파서
 * - Excel의 병합 정보를 읽어서 rowSpan/mergeGroupId로 변환
 * - 각 행을 원자성 데이터로 추출
 * 
 * @created 2026-01-24
 */

import type ExcelJS from 'exceljs';

/**
 * 워크시트 행 데이터
 */
export interface WorksheetRow {
    rowIndex: number;
    processNo: string;
    processName: string;
    level?: string;
    processDesc?: string;
    partName?: string;      // ✅ 부품명 신규
    equipment?: string;
    ep?: string;
    autoDetector?: string;
    productChar?: string;
    processChar?: string;
    specialChar?: string;
    spec?: string;
    evalMethod?: string;
    sampleSize?: string;
    frequency?: string;
    controlMethod?: string;
    owner1?: string;
    owner2?: string;
    reactionPlan?: string;
    charNo?: string;        // I열: 특성번호 (NO)
}

/**
 * 병합 정보
 */
export interface MergeInfo {
    startRow: number;
    endRow: number;
    column: string;
}

/**
 * 파싱 결과
 */
export interface WorksheetParseResult {
    success: boolean;
    rows: WorksheetRow[];
    merges: MergeInfo[];
    headerRow: number;
    dataStartRow: number;
    error?: string;
}

/**
 * 컬럼 인덱스 → 컬럼 키 기본 매핑 (partName 포함된 20컬럼 Export 형식)
 * 실제 파싱 시 buildColumnMap()으로 헤더 기반 동적 매핑 수행
 */
const DEFAULT_COLUMN_MAP: Record<number, string> = {
    1: 'processNo',      // A열: 공정번호
    2: 'processName',    // B열: 공정명
    3: 'level',          // C열: 레벨 (Main/Sub)
    4: 'processDesc',    // D열: 공정설명
    5: 'partName',       // E열: 부품명
    6: 'equipment',      // F열: 설비/금형/JIG (PFD와 동일)
    7: 'ep',             // G열: EP (●/빈값)
    8: 'autoDetector',   // H열: 자동 (●/빈값)
    9: 'charNo',         // I열: NO (특성번호)
    10: 'productChar',   // J열: 제품특성
    11: 'processChar',   // K열: 공정특성
    12: 'specialChar',   // L열: 특별특성
    13: 'spec',          // M열: 스펙/공차
    14: 'evalMethod',    // N열: 평가방법
    15: 'sampleSize',    // O열: 샘플크기
    16: 'frequency',     // P열: 주기
    17: 'controlMethod', // Q열: 관리방법
    18: 'owner1',        // R열: 책임1
    19: 'owner2',        // S열: 책임2
    20: 'reactionPlan',  // T열: 조치방법
};

/**
 * 헤더 텍스트 → 필드 키 매핑 (대소문자/공백 무시, 키워드 매칭)
 */
const HEADER_TO_KEY: Array<{ keywords: string[]; key: string }> = [
    { keywords: ['공정번호', 'p-no', 'p no'], key: 'processNo' },
    { keywords: ['공정명', 'process name'], key: 'processName' },
    { keywords: ['레벨', 'level'], key: 'level' },
    { keywords: ['공정설명', 'process desc'], key: 'processDesc' },
    { keywords: ['부품명', 'part name'], key: 'partName' },
    { keywords: ['설비', '금형', 'jig', 'equip'], key: 'equipment' },
    { keywords: ['ep'], key: 'ep' },
    { keywords: ['자동검사', 'auto ins', 'auto'], key: 'autoDetector' },
    { keywords: ['no'], key: 'charNo' },
    { keywords: ['제품특성', 'prod. char', 'prod char'], key: 'productChar' },
    { keywords: ['공정특성', 'proc. char', 'proc char'], key: 'processChar' },
    { keywords: ['특별특성', 'sc', 'special'], key: 'specialChar' },
    { keywords: ['스펙', '공차', 'spec', 'tol'], key: 'spec' },
    { keywords: ['평가방법', '측정', 'eval'], key: 'evalMethod' },
    { keywords: ['샘플', 'sample'], key: 'sampleSize' },
    { keywords: ['주기', 'freq'], key: 'frequency' },
    { keywords: ['관리방법', 'ctrl', 'control method'], key: 'controlMethod' },
    { keywords: ['책임1', 'owner1'], key: 'owner1' },
    { keywords: ['책임2', 'owner2'], key: 'owner2' },
    { keywords: ['조치방법', 'reaction', '대응'], key: 'reactionPlan' },
];

/**
 * 헤더 행을 읽어 동적 columnMap 생성
 * partName 컬럼 유무에 관계없이 정확한 매핑 보장
 */
function buildColumnMap(
    sheet: ExcelJS.Worksheet,
    headerRow: number
): Record<number, string> {
    const row = sheet.getRow(headerRow);
    const dynamicMap: Record<number, string> = {};
    const usedKeys = new Set<string>();

    for (let col = 1; col <= 25; col++) {
        const cellValue = extractCellValue(row.getCell(col)).toLowerCase().trim();
        if (!cellValue) continue;

        for (const entry of HEADER_TO_KEY) {
            if (usedKeys.has(entry.key)) continue;
            const matched = entry.keywords.some(kw => cellValue.includes(kw));
            if (matched) {
                dynamicMap[col] = entry.key;
                usedKeys.add(entry.key);
                break;
            }
        }
    }

    // 최소 4개 이상 매핑되면 동적 맵 사용, 아니면 기본 맵 폴백
    if (Object.keys(dynamicMap).length >= 4) {
        return dynamicMap;
    }
    return DEFAULT_COLUMN_MAP;
}

/**
 * 셀 값 추출 (병합 셀 포함)
 */
function extractCellValue(cell: ExcelJS.Cell): string {
    if (!cell || cell.value === null || cell.value === undefined) return '';

    // RichText 처리
    if (typeof cell.value === 'object' && 'richText' in cell.value) {
        return cell.value.richText.map((rt: any) => rt.text || '').join('');
    }

    // 수식 결과 처리
    if (typeof cell.value === 'object' && 'result' in cell.value) {
        return String(cell.value.result || '');
    }

    return String(cell.value || '').trim();
}

/**
 * 병합된 CP 워크시트 Excel 파싱
 */
export async function parseWorksheetExcel(file: File): Promise<WorksheetParseResult> {
    const ExcelJS = (await import('exceljs')).default;
    try {
        const workbook = new ExcelJS.Workbook();
        const buffer = await file.arrayBuffer();
        await workbook.xlsx.load(buffer);

        // ★ "워크시트" 또는 "전체" 포함된 시트 찾기, 없으면 두 번째 시트, 그래도 없으면 첫 번째 시트
        let sheet = workbook.worksheets.find(ws =>
            ws.name.includes('워크시트') || ws.name.includes('전체') || ws.name.includes('Worksheet')
        );
        if (!sheet && workbook.worksheets.length >= 2) {
            sheet = workbook.worksheets[1];  // 두 번째 시트 (0: 등록정보, 1: 워크시트)
        }
        if (!sheet) {
            sheet = workbook.worksheets[0];  // 첫 번째 시트
        }
        if (!sheet) {
            return { success: false, rows: [], merges: [], headerRow: 0, dataStartRow: 0, error: '시트를 찾을 수 없습니다.' };
        }


        // 헤더 행 찾기 (Export 형식: 1행=CP정보, 2행=그룹헤더, 3행=컬럼헤더, 4행부터=데이터)
        let headerRow = 0;
        let dataStartRow = 0;

        for (let i = 1; i <= Math.min(10, sheet.rowCount); i++) {
            const row = sheet.getRow(i);
            const cell1 = extractCellValue(row.getCell(1)).toLowerCase();
            const cell2 = extractCellValue(row.getCell(2)).toLowerCase();

            // 1행: "CP No:" 또는 "cp no"가 포함된 메타 정보 행 → 건너뜀
            if (cell1.includes('cp no') || cell1.includes('cp:')) {
                continue;
            }

            // 2행: 그룹 헤더 ("공정현황", "관리항목" 등) → 건너뜀
            if (cell1.includes('공정현황') || cell1.includes('공정') && !cell1.includes('공정번호')) {
                continue;
            }

            // 3행: 컬럼 헤더 감지 ("공정번호", "공정명" 등)
            if (cell1.includes('공정번호') || cell1.includes('no') || cell1 === '번호' ||
                cell2.includes('공정명')) {
                headerRow = i;
                dataStartRow = i + 1;
                break;
            }

            // 실제 데이터 행: A열이 순수 숫자 (1, 2, 3...) 또는 공정번호 패턴 (10, 20, 030 등)
            const cellValue = extractCellValue(row.getCell(1));
            if (/^\d{1,3}$/.test(cellValue) || /^0?\d{2,3}$/.test(cellValue)) {
                // 단, "CP No"가 아닌 순수 공정번호인 경우에만
                if (!cell1.includes('cp') && !cell1.includes(':')) {
                    dataStartRow = i;
                    break;
                }
            }
        }

        // 헤더를 못 찾았으면 4행부터 시작 (일반적인 Export 양식)
        if (dataStartRow === 0) {
            dataStartRow = 4;
        }

        // ★ 헤더 기반 동적 COLUMN_MAP 생성 (partName 유무 자동 감지)
        const columnMap = headerRow > 0
            ? buildColumnMap(sheet, headerRow)
            : DEFAULT_COLUMN_MAP;

        // 병합 정보 추출
        const merges: MergeInfo[] = [];
        const excelMerges = sheet.model.merges || [];

        excelMerges.forEach((mergeRange: string) => {
            const match = mergeRange.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
            if (match) {
                const startCol = match[1];
                const startRow = parseInt(match[2], 10);
                const endRow = parseInt(match[4], 10);
                const colIndex = startCol.charCodeAt(0) - 64;
                const columnKey = columnMap[colIndex];

                if (columnKey && startRow !== endRow) {
                    merges.push({ startRow, endRow, column: columnKey });
                }
            }
        });

        // 병합 정보를 Map으로 변환 (행별/컬럼별 빠른 조회)
        const mergeMap = new Map<number, Map<string, { value: string; isFirst: boolean }>>();

        merges.forEach(merge => {
            // 병합 영역의 첫 번째 셀 값 읽기
            const colIndexStr = Object.entries(columnMap).find(([, v]) => v === merge.column)?.[0];
            const colIndex = colIndexStr ? parseInt(colIndexStr, 10) : 1;
            const firstCell = sheet.getRow(merge.startRow).getCell(colIndex);
            const value = extractCellValue(firstCell);

            for (let row = merge.startRow; row <= merge.endRow; row++) {
                if (!mergeMap.has(row)) {
                    mergeMap.set(row, new Map());
                }
                mergeMap.get(row)!.set(merge.column, {
                    value,
                    isFirst: row === merge.startRow,
                });
            }
        });

        // 데이터 행 추출
        // ★ 2026-01-31 수정: 병합 셀 및 이전 행 상속 로직 복원
        const rows: WorksheetRow[] = [];
        let prevRow: Partial<WorksheetRow> = {};  // 이전 행 값 저장

        for (let i = dataStartRow; i <= sheet.rowCount; i++) {
            const excelRow = sheet.getRow(i);

            // 빈 행 스킵 (모든 셀이 비어있으면)
            let hasData = false;
            for (let col = 1; col <= 20; col++) {
                if (extractCellValue(excelRow.getCell(col))) {
                    hasData = true;
                    break;
                }
            }
            if (!hasData) continue;

            const row: WorksheetRow = {
                rowIndex: i,
                processNo: '',
                processName: '',
            };

            // 각 컬럼의 값 추출
            Object.entries(columnMap).forEach(([colIdxStr, columnKey]) => {
                const colIdx = parseInt(colIdxStr, 10);
                let value = extractCellValue(excelRow.getCell(colIdx));

                // ★ 1차: Excel 병합 영역의 값 사용
                const mergeInfo = mergeMap.get(i)?.get(columnKey);
                if (!value && mergeInfo) {
                    value = mergeInfo.value;
                }

                // ★ 2차: 병합 컬럼(공정번호, 공정명, 레벨, 공정설명)만 이전 행 값 상속
                // ⚠️ 부품명, 설비는 상속하지 않음 (빈 값이면 빈 값 유지)
                const inheritColumns = ['processNo', 'processName', 'level', 'processDesc'];
                if (!value && inheritColumns.includes(columnKey)) {
                    value = (prevRow as any)[columnKey] || '';
                }

                if (value) {
                    (row as any)[columnKey] = value;
                }
            });

            // ★ processNo가 있는 행만 저장
            if (row.processNo) {
                rows.push(row);
                // 현재 행을 이전 행으로 저장 (상속용)
                prevRow = { ...row };
            }
        }


        // ★ 부품명/설비 파싱 결과 상세 로그
        rows.forEach((r, idx) => {
        });

        return {
            success: true,
            rows,
            merges,
            headerRow,
            dataStartRow,
        };

    } catch (error: any) {
        console.error('❌ [Worksheet Parser] 오류:', error);
        return {
            success: false,
            rows: [],
            merges: [],
            headerRow: 0,
            dataStartRow: 0,
            error: error.message || '파싱 오류',
        };
    }
}
