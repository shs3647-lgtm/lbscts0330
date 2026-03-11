/**
 * @file excel-export.ts
 * @description PFD 워크시트 엑셀 내보내기 (셀 병합 유지)
 * @version 1.0.0
 * @created 2026-01-25
 */

import ExcelJS from 'exceljs';
import { PfdItem, PfdState } from './types';
import { PFD_COLUMNS } from './pfdConstants';

// =====================================================
// 타입 정의
// =====================================================
interface PfdInfo {
    pfdNo: string;
    fmeaId: string;
    cpNo: string;
}

interface SpanInfo {
    isFirst: boolean;
    span: number;
}

// =====================================================
// 스타일 정의
// =====================================================
const EXCEL_COLORS = {
    primary: '1565C0',
    secondary: '2E7D32',
    headerText: 'FFFFFF',
    borderColor: 'BDBDBD',
};

const applyHeaderStyle = (cell: ExcelJS.Cell, bgColor: string) => {
    cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor.replace('#', '') }
    };
    cell.font = {
        color: { argb: EXCEL_COLORS.headerText },
        bold: true,
        size: 10,
        name: '맑은 고딕'
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
        top: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
        left: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
        bottom: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
        right: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } }
    };
};

const applyDataStyle = (cell: ExcelJS.Cell, bgColor: string) => {
    cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor.replace('#', '') }
    };
    cell.font = { size: 9, name: '맑은 고딕' };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
        top: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
        left: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
        bottom: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
        right: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } }
    };
};

// =====================================================
// RowSpan 계산 함수
// =====================================================
function calculateRowSpan(items: PfdItem[], keyFn: (item: PfdItem) => string): Map<number, SpanInfo> {
    const spanMap = new Map<number, SpanInfo>();
    let currentKey = '';
    let startIdx = 0;

    items.forEach((item, idx) => {
        const key = keyFn(item);

        if (key !== currentKey) {
            if (idx > 0) {
                for (let i = startIdx; i < idx; i++) {
                    spanMap.set(i, { isFirst: i === startIdx, span: i === startIdx ? idx - startIdx : 0 });
                }
            }
            currentKey = key;
            startIdx = idx;
        }
    });

    for (let i = startIdx; i < items.length; i++) {
        spanMap.set(i, { isFirst: i === startIdx, span: i === startIdx ? items.length - startIdx : 0 });
    }

    return spanMap;
}

// =====================================================
// 메인 내보내기 함수
// =====================================================
export async function exportPFDExcel(state: PfdState): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FMEA On-Premise';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('PFD 워크시트', {
        properties: { tabColor: { argb: EXCEL_COLORS.primary } },
        views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }]
    });

    // 컬럼 설정 (rowNo 제외)
    const dataColumns = PFD_COLUMNS.filter(c => c.key !== 'rowNo');
    ws.columns = dataColumns.map(col => ({ width: Math.ceil(col.width / 6) }));

    // 1행: 기본정보
    ws.mergeCells('A1:D1');
    ws.getCell('A1').value = `PFD No: ${state.pfdNo || 'NEW'}`;
    ws.getCell('A1').font = { bold: true, size: 11, name: '맑은 고딕' };
    ws.getRow(1).height = 25;

    // 2행: 그룹 헤더
    const groups = [
        { name: '공정현황', count: 6, color: '1565C0' },
        { name: '관리항목', count: 4, color: '2E7D32' },
    ];

    let colIdx = 1;
    const groupRow = ws.getRow(2);
    groups.forEach(g => {
        ws.mergeCells(2, colIdx, 2, colIdx + g.count - 1);
        const cell = groupRow.getCell(colIdx);
        cell.value = g.name;
        applyHeaderStyle(cell, g.color);
        for (let i = 1; i < g.count; i++) {
            applyHeaderStyle(groupRow.getCell(colIdx + i), g.color);
        }
        colIdx += g.count;
    });
    groupRow.height = 25;

    // 3행: 컬럼 헤더
    const headerRow = ws.getRow(3);
    dataColumns.forEach((col, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = col.name;
        const color = col.group === '공정현황' ? '1565C0' : '2E7D32';
        applyHeaderStyle(cell, color);
    });
    headerRow.height = 28;

    // RowSpan 계산
    const processSpan = calculateRowSpan(state.items, i => `${i.processNo || ''}_${i.processName || ''}`);
    const descSpan = calculateRowSpan(state.items, i => `${i.processNo || ''}_${i.processName || ''}_${i.processLevel || ''}_${i.processDesc || ''}`);
    const workSpan = calculateRowSpan(state.items, i => `${i.processNo || ''}_${i.processName || ''}_${i.processLevel || ''}_${i.processDesc || ''}_${i.workElement || ''}`);
    const equipSpan = calculateRowSpan(state.items, i => `${i.processNo || ''}_${i.processName || ''}_${i.processLevel || ''}_${i.processDesc || ''}_${i.workElement || ''}_${i.equipment || ''}`);

    // 데이터 행 작성 (4행부터)
    const startRow = 4;
    const items = state.items;

    items.forEach((item, idx) => {
        const row = ws.getRow(startRow + idx);
        const isEven = idx % 2 === 0;
        const bgColor = isEven ? 'FFFFFF' : 'FAFAFA';

        dataColumns.forEach((col, colIdx) => {
            const cell = row.getCell(colIdx + 1);

            let value: string = '';
            switch (col.key) {
                case 'processNo': value = item.processNo || ''; break;
                case 'processName': value = item.processName || ''; break;
                case 'processLevel': value = (item.processLevel?.startsWith('_') ? '' : item.processLevel) || ''; break;
                case 'processDesc': value = (item.processDesc?.startsWith('_') ? '' : item.processDesc) || ''; break;
                case 'workElement': value = (item.workElement?.startsWith('_') ? '' : item.workElement) || ''; break;
                case 'equipment': value = (item.equipment?.startsWith('_') ? '' : item.equipment) || ''; break;
                case 'productChar': value = (item.productChar?.startsWith('_') ? '' : item.productChar) || ''; break;
                case 'processChar': value = item.processChar || ''; break;
                case 'productSC': value = item.productSC || ''; break;
                case 'processSC': value = item.processSC || ''; break;
            }
            cell.value = value;
            applyDataStyle(cell, bgColor);
        });
        row.height = 22;
    });

    // 셀 병합 적용
    const mergedCells = new Set<string>();

    items.forEach((_, idx) => {
        const rowNum = startRow + idx;

        // 공정번호/공정명 병합 (A, B열)
        const pSpan = processSpan.get(idx);
        if (pSpan?.isFirst && pSpan.span > 1) {
            ['A', 'B'].forEach((letter, i) => {
                const key = `${letter}${rowNum}:${letter}${rowNum + pSpan.span - 1}`;
                if (!mergedCells.has(key)) {
                    try { ws.mergeCells(rowNum, i + 1, rowNum + pSpan.span - 1, i + 1); mergedCells.add(key); } catch { }
                }
            });
        }

        // 레벨/공정설명 병합 (C, D열)
        const dSpan = descSpan.get(idx);
        if (dSpan?.isFirst && dSpan.span > 1) {
            ['C', 'D'].forEach((letter, i) => {
                const key = `${letter}${rowNum}:${letter}${rowNum + dSpan.span - 1}`;
                if (!mergedCells.has(key)) {
                    try { ws.mergeCells(rowNum, i + 3, rowNum + dSpan.span - 1, i + 3); mergedCells.add(key); } catch { }
                }
            });
        }

        // 부품명 병합 (E열)
        const wSpan = workSpan.get(idx);
        if (wSpan?.isFirst && wSpan.span > 1) {
            const key = `E${rowNum}:E${rowNum + wSpan.span - 1}`;
            if (!mergedCells.has(key)) {
                try { ws.mergeCells(rowNum, 5, rowNum + wSpan.span - 1, 5); mergedCells.add(key); } catch { }
            }
        }

        // 설비 병합 (F열)
        const eSpan = equipSpan.get(idx);
        if (eSpan?.isFirst && eSpan.span > 1) {
            const key = `F${rowNum}:F${rowNum + eSpan.span - 1}`;
            if (!mergedCells.has(key)) {
                try { ws.mergeCells(rowNum, 6, rowNum + eSpan.span - 1, 6); mergedCells.add(key); } catch { }
            }
        }
    });

    // 파일 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    link.download = `${state.pfdNo || 'PFD'}_워크시트_${date}.xlsx`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
