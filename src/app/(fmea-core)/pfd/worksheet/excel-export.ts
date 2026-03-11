// CODEFREEZE — 사용자 명시적 요청에 의해 시트1/행1 통일 수정 (2026-03-03)
/**
 * @file excel-export.ts
 * @description PFD 워크시트 엑셀 내보내기 (공정흐름 심볼 포함 + 셀 병합)
 * @version 2.1.0
 * @updated 2026-03-03 - 시트1 등록정보 추가, 시트2 행1 통일 (PFMEA/DFMEA/CP 동일 포맷)
 */

import type ExcelJS from 'exceljs';
import { PfdItem, PfdState } from './types';
import { fetchFmeaExportData, writeCftSection, writeRevisionSection } from '@/lib/excel-info-sections';

// =====================================================
// 스타일 정의
// =====================================================
const EXCEL_COLORS = {
    primary: '1565C0',
    secondary: '2E7D32',
    flow: 'F57C00',
    headerText: 'FFFFFF',
    borderColor: 'BDBDBD',
};

// 공정흐름 심볼
const FLOW_SYMBOLS: Record<string, string> = {
    flowWork: '●',
    flowTransport: '▶',
    flowStorage: '▲',
    flowInspect: '◆',
};

// ★ 엑셀 컬럼 정의 (화면과 동일한 순서)
interface ExcelColDef {
    key: string;
    name: string;
    group: string;
    width: number;
    align: 'left' | 'center' | 'right';
    groupColor: string;
}

const EXCEL_COLUMNS: ExcelColDef[] = [
    // 공정현황
    { key: 'processNo', name: 'P-No', group: '공정현황', width: 8, align: 'center', groupColor: EXCEL_COLORS.primary },
    { key: 'processName', name: '공정명', group: '공정현황', width: 14, align: 'center', groupColor: EXCEL_COLORS.primary },
    // 공정흐름
    { key: 'flowWork', name: '작업', group: '공정흐름', width: 6, align: 'center', groupColor: EXCEL_COLORS.flow },
    { key: 'flowTransport', name: '운반', group: '공정흐름', width: 6, align: 'center', groupColor: EXCEL_COLORS.flow },
    { key: 'flowStorage', name: '저장', group: '공정흐름', width: 6, align: 'center', groupColor: EXCEL_COLORS.flow },
    { key: 'flowInspect', name: '검사', group: '공정흐름', width: 6, align: 'center', groupColor: EXCEL_COLORS.flow },
    // 공정상세
    { key: 'processLevel', name: '레벨', group: '공정상세', width: 8, align: 'center', groupColor: EXCEL_COLORS.primary },
    { key: 'processDesc', name: '공정설명', group: '공정상세', width: 28, align: 'left', groupColor: EXCEL_COLORS.primary },
    { key: 'equipment', name: '설비/금형/JIG', group: '공정상세', width: 16, align: 'center', groupColor: EXCEL_COLORS.primary },
    // 관리항목
    { key: 'charNo', name: 'no', group: '관리항목', width: 5, align: 'center', groupColor: EXCEL_COLORS.secondary },
    { key: 'productSC', name: '제품SC', group: '관리항목', width: 6, align: 'center', groupColor: EXCEL_COLORS.secondary },
    { key: 'productChar', name: '제품특성', group: '관리항목', width: 22, align: 'left', groupColor: EXCEL_COLORS.secondary },
    { key: 'processSC', name: '공정SC', group: '관리항목', width: 6, align: 'center', groupColor: EXCEL_COLORS.secondary },
    { key: 'processChar', name: '공정특성', group: '관리항목', width: 22, align: 'left', groupColor: EXCEL_COLORS.secondary },
];

// =====================================================
// 스타일 유틸리티
// =====================================================
const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
    left: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
    bottom: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
    right: { style: 'thin', color: { argb: EXCEL_COLORS.borderColor } },
};

const applyHeaderStyle = (cell: ExcelJS.Cell, bgColor: string) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.font = { color: { argb: EXCEL_COLORS.headerText }, bold: true, size: 10, name: '맑은 고딕' };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder;
};

const applyDataStyle = (cell: ExcelJS.Cell, bgColor: string, align: 'left' | 'center' | 'right' = 'center') => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.font = { size: 9, name: '맑은 고딕' };
    cell.alignment = { vertical: 'middle', horizontal: align, wrapText: true };
    cell.border = thinBorder;
};

// 시트1용 스타일 (PFMEA/DFMEA/CP 통일)
const applyTitleStyle = (cell: ExcelJS.Cell) => {
    cell.font = { bold: true, size: 14, name: '맑은 고딕', color: { argb: '1565C0' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
};

const applyLabelStyle = (cell: ExcelJS.Cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E3F2FD' } };
    cell.font = { bold: true, size: 9, name: '맑은 고딕' };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = thinBorder;
};

const applyValueStyle = (cell: ExcelJS.Cell) => {
    cell.font = { size: 9, name: '맑은 고딕' };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = thinBorder;
};

// =====================================================
// RowSpan 계산 (단일 패스)
// =====================================================
interface SpanInfo { isFirst: boolean; span: number; }

function calculateRowSpan(items: PfdItem[], keyFn: (item: PfdItem) => string): SpanInfo[] {
    const result: SpanInfo[] = [];
    let i = 0;
    while (i < items.length) {
        const key = keyFn(items[i]);
        let span = 1;
        while (i + span < items.length && keyFn(items[i + span]) === key) span++;
        result[i] = { isFirst: true, span };
        for (let j = 1; j < span; j++) result[i + j] = { isFirst: false, span: 0 };
        i += span;
    }
    return result;
}

// =====================================================
// PFD 등록정보 인터페이스
// =====================================================
interface PFDInfo {
    pfdNo: string;
    fmeaId: string;
    cpNo: string;
    partName: string;
    customer: string;
    createdAt?: string;
    revisionNo?: string;
}

// =====================================================
// 시트1: PFD 등록정보 (PFMEA/DFMEA/CP 통일 15열 레이아웃)
// =====================================================
function createSheet1_PFDRegister(
    workbook: ExcelJS.Workbook,
    pfdInfo: PFDInfo
): void {
    const ws = workbook.addWorksheet('1. PFD 등록정보', {
        properties: { tabColor: { argb: EXCEL_COLORS.primary } }
    });

    // 15열 너비 설정 (PFMEA/DFMEA/CP 통일)
    ws.columns = [
        { width: 8 },  { width: 10 }, { width: 18 }, { width: 10 }, { width: 10 },
        { width: 10 }, { width: 10 }, { width: 8 },  { width: 12 }, { width: 10 },
        { width: 12 }, { width: 8 },  { width: 10 }, { width: 10 }, { width: 8 },
    ];

    let row = 1;
    ws.mergeCells(row, 1, row, 15);
    const titleCell = ws.getCell(row, 1);
    titleCell.value = 'PFD (공정흐름도)';
    applyTitleStyle(titleCell);
    ws.getRow(row).height = 35;

    row += 1;
    ws.getRow(row).height = 8;

    row += 1;
    const infoRows = [
        ['PFD No', pfdInfo.pfdNo, '품명', pfdInfo.partName, '고객명', pfdInfo.customer, '작성일자', pfdInfo.createdAt || new Date().toISOString().slice(0, 10)],
        ['FMEA ID', pfdInfo.fmeaId, 'CP No', pfdInfo.cpNo, '개정번호', pfdInfo.revisionNo || '1.00', '', ''],
    ];

    infoRows.forEach((data) => {
        const r = ws.getRow(row);
        const pairs = [
            { label: data[0], value: data[1], lStart: 1, lEnd: 2, vStart: 3, vEnd: 4 },
            { label: data[2], value: data[3], lStart: 5, lEnd: 6, vStart: 7, vEnd: 8 },
            { label: data[4], value: data[5], lStart: 9, lEnd: 10, vStart: 11, vEnd: 12 },
            { label: data[6], value: data[7], lStart: 13, lEnd: 13, vStart: 14, vEnd: 15 },
        ];

        pairs.forEach(p => {
            if (p.lStart !== p.lEnd) ws.mergeCells(row, p.lStart, row, p.lEnd);
            const lc = r.getCell(p.lStart);
            lc.value = p.label;
            applyLabelStyle(lc);
            for (let c = p.lStart + 1; c <= p.lEnd; c++) applyLabelStyle(r.getCell(c));

            if (p.vStart !== p.vEnd) ws.mergeCells(row, p.vStart, row, p.vEnd);
            const vc = r.getCell(p.vStart);
            vc.value = p.value;
            applyValueStyle(vc);
            for (let c = p.vStart + 1; c <= p.vEnd; c++) applyValueStyle(r.getCell(c));
        });

        r.height = 24;
        row += 1;
    });
}

// =====================================================
// 메인 내보내기 함수
// =====================================================
export async function exportPFDExcel(state: PfdState): Promise<void> {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FMEA On-Premise';
    workbook.created = new Date();

    // 시트1: PFD 등록정보
    const pfdInfo: PFDInfo = {
        pfdNo: state.pfdNo || 'NEW',
        fmeaId: state.fmeaId || '',
        cpNo: state.cpNo || '',
        partName: state.partName || '',
        customer: state.customer || '',
    };
    createSheet1_PFDRegister(workbook, pfdInfo);

    // 시트1에 CFT 현황 + 개정현황/승인 섹션 추가
    if (pfdInfo.fmeaId) {
        try {
            const { cftMembers, revisions } = await fetchFmeaExportData(pfdInfo.fmeaId);
            const ws1 = workbook.getWorksheet('1. PFD 등록정보');
            if (ws1) {
                let nextRow = writeCftSection(ws1, 6, cftMembers);
                writeRevisionSection(ws1, nextRow, revisions);
            }
        } catch (e) {
            console.error('[PFD Export] CFT/개정현황 로드 실패:', e);
        }
    }

    // 시트2: PFD 워크시트
    const ws = workbook.addWorksheet('2. PFD 워크시트', {
        properties: { tabColor: { argb: EXCEL_COLORS.secondary } },
        views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }],
    });

    // ★ 부품명 모드에 따라 컬럼 동적 결정
    const showPartName = state.partNameMode === 'B';
    const columns = showPartName
        ? [...EXCEL_COLUMNS.slice(0, 8), { key: 'partName', name: '부품명', group: '공정상세', width: 14, align: 'center' as const, groupColor: EXCEL_COLORS.primary }, ...EXCEL_COLUMNS.slice(8)]
        : EXCEL_COLUMNS;

    // 컬럼 너비 설정
    ws.columns = columns.map(col => ({ width: col.width }));

    // [1행] 라벨-값 쌍 (PFMEA/DFMEA/CP 통일 포맷)
    const row1Pairs = [
        { label: 'PFD No', value: state.pfdNo || 'NEW', lStart: 1, lEnd: 1, vStart: 2, vEnd: 3 },
        { label: '품명', value: state.partName || '', lStart: 4, lEnd: 4, vStart: 5, vEnd: 6 },
        { label: '고객', value: state.customer || '', lStart: 7, lEnd: 7, vStart: 8, vEnd: 8 },
        { label: 'FMEA/CP', value: `${state.fmeaId || '-'} / ${state.cpNo || '-'}`, lStart: 9, lEnd: 10, vStart: 11, vEnd: 13 },
    ];
    const r1 = ws.getRow(1);
    row1Pairs.forEach(p => {
        if (p.lStart !== p.lEnd) ws.mergeCells(1, p.lStart, 1, p.lEnd);
        const lc = r1.getCell(p.lStart);
        lc.value = p.label;
        applyLabelStyle(lc);
        for (let c = p.lStart + 1; c <= p.lEnd; c++) applyLabelStyle(r1.getCell(c));
        if (p.vStart !== p.vEnd) ws.mergeCells(1, p.vStart, 1, p.vEnd);
        const vc = r1.getCell(p.vStart);
        vc.value = p.value;
        applyValueStyle(vc);
        for (let c = p.vStart + 1; c <= p.vEnd; c++) applyValueStyle(r1.getCell(c));
    });
    ws.getRow(1).height = 22;

    // [2행] 그룹 헤더
    const groupRow = ws.getRow(2);
    const groups: { group: string; start: number; end: number; color: string }[] = [];
    let prevGroup = '';
    let groupStart = 1;
    columns.forEach((col, i) => {
        if (col.group !== prevGroup) {
            if (prevGroup) groups.push({ group: prevGroup, start: groupStart, end: i, color: columns[groupStart - 1].groupColor });
            prevGroup = col.group;
            groupStart = i + 1;
        }
    });
    groups.push({ group: prevGroup, start: groupStart, end: columns.length, color: columns[groupStart - 1].groupColor });

    groups.forEach(g => {
        if (g.end > g.start) ws.mergeCells(2, g.start, 2, g.end);
        const cell = groupRow.getCell(g.start);
        cell.value = g.group;
        applyHeaderStyle(cell, g.color);
        // 병합된 나머지 셀에도 스타일 적용
        for (let i = g.start + 1; i <= g.end; i++) applyHeaderStyle(groupRow.getCell(i), g.color);
    });
    groupRow.height = 25;

    // [3행] 컬럼 헤더
    const headerRow = ws.getRow(3);
    columns.forEach((col, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = col.name;
        applyHeaderStyle(cell, col.groupColor);
    });
    headerRow.height = 28;

    // RowSpan 계산
    const processSpan = calculateRowSpan(state.items, it => `${it.processNo || ''}_${it.processName || ''}`);
    const descSpan = calculateRowSpan(state.items, it => `${it.processNo || ''}_${it.processName || ''}_${it.processLevel || ''}_${it.processDesc || ''}`);
    const equipSpan = calculateRowSpan(state.items, it => `${it.processNo || ''}_${it.processName || ''}_${it.processLevel || ''}_${it.processDesc || ''}_${it.equipment || ''}`);

    // [4행~] 데이터
    const DATA_START = 4;
    const items = state.items;

    // ★ charNo 사전 계산
    const charNos: number[] = [];
    let charCounter = 1;
    let prevProcess = '';
    items.forEach((item, idx) => {
        const proc = `${item.processNo}_${item.processName}`;
        if (idx > 0 && proc !== prevProcess) charCounter = 1;
        charNos[idx] = charCounter++;
        prevProcess = proc;
    });

    items.forEach((item, idx) => {
        const row = ws.getRow(DATA_START + idx);
        const isEven = idx % 2 === 0;
        const bgColor = isEven ? 'FFFFFF' : 'F5F5F5';

        columns.forEach((col, colIdx) => {
            const cell = row.getCell(colIdx + 1);
            let value: string = '';

            // _ 로 시작하는 고유값은 빈 문자열로 치환
            const rawVal = (item as any)[col.key];
            const cleanVal = (rawVal && typeof rawVal === 'string' && rawVal.startsWith('_')) ? '' : (rawVal || '');

            switch (col.key) {
                case 'charNo':
                    value = String(charNos[idx]);
                    break;
                case 'flowWork':
                case 'flowTransport':
                case 'flowStorage':
                case 'flowInspect':
                    value = rawVal ? FLOW_SYMBOLS[col.key] : '';
                    break;
                default:
                    value = cleanVal;
                    break;
            }

            cell.value = value;

            // 공정흐름 심볼 특별 스타일
            if (['flowWork', 'flowTransport', 'flowStorage', 'flowInspect'].includes(col.key) && value) {
                applyDataStyle(cell, bgColor, 'center');
                cell.font = { size: 12, name: '맑은 고딕', bold: true, color: { argb: EXCEL_COLORS.primary } };
            } else {
                applyDataStyle(cell, bgColor, col.align);
            }
        });
        row.height = 22;
    });

    // ★ 셀 병합 적용 (컬럼 인덱스 동적 계산)
    const colIndex = (key: string) => columns.findIndex(c => c.key === key) + 1;

    const processNoCol = colIndex('processNo');
    const processNameCol = colIndex('processName');
    const levelCol = colIndex('processLevel');
    const descCol = colIndex('processDesc');
    const equipCol = colIndex('equipment');
    const partNameCol = colIndex('partName');
    // 공정흐름 컬럼들
    const flowCols = ['flowWork', 'flowTransport', 'flowStorage', 'flowInspect'].map(k => colIndex(k)).filter(c => c > 0);

    items.forEach((_, idx) => {
        const rowNum = DATA_START + idx;
        const pSpan = processSpan[idx];

        // 공정현황 + 공정흐름 병합 (processNo, processName, 흐름 4열 모두 공정 단위로 병합)
        if (pSpan?.isFirst && pSpan.span > 1) {
            [processNoCol, processNameCol, ...flowCols].forEach(col => {
                if (col > 0) {
                    try { ws.mergeCells(rowNum, col, rowNum + pSpan.span - 1, col); } catch { }
                }
            });
        }

        // 레벨/공정설명 병합
        const dSpan = descSpan[idx];
        if (dSpan?.isFirst && dSpan.span > 1) {
            [levelCol, descCol].forEach(col => {
                if (col > 0) {
                    try { ws.mergeCells(rowNum, col, rowNum + dSpan.span - 1, col); } catch { }
                }
            });
        }

        // 설비 병합
        const eSpan = equipSpan[idx];
        if (eSpan?.isFirst && eSpan.span > 1 && equipCol > 0) {
            try { ws.mergeCells(rowNum, equipCol, rowNum + eSpan.span - 1, equipCol); } catch { }
        }

        // 부품명 병합 (표시 모드일 때만)
        if (partNameCol > 0) {
            // partName 별도 span 계산은 desc span과 동일하게
            const dSpanPN = descSpan[idx];
            if (dSpanPN?.isFirst && dSpanPN.span > 1) {
                try { ws.mergeCells(rowNum, partNameCol, rowNum + dSpanPN.span - 1, partNameCol); } catch { }
            }
        }
    });

    // ★ 파일 다운로드 (showSaveFilePicker 사용)
    const buffer = await workbook.xlsx.writeBuffer();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `${state.pfdNo || 'PFD'}_PFD전체_${date}.xlsx`;
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
