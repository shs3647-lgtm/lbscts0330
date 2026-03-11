/**
 * @file excel-export-linkage.ts
 * @description 연결표(고장연결 FM-FE-FC) 엑셀 내보내기
 * @version 1.0.0
 * @created 2026-03-08
 *
 * 컬럼 구성 (UI와 동일):
 * FE: No | Cat | FE(Text) | S
 * FM: No | FM(Text)
 * FC: No | Process | WE | FC(Text)
 */

import { WorksheetState } from './constants';
import { groupFailureLinksByFM, calculateLastRowMerge } from './utils';

// ExcelJS 네임스페이스 타입 (동적 import)
type ExcelJS_NS = typeof import('exceljs');

/** UI 스레드 양보 — 100행마다 호출하여 브라우저 응답성 유지 */
function yieldToMain(): Promise<void> {
  return new Promise(r => setTimeout(r, 0));
}

/** ExcelJS 동적 로드 (초기 번들 제외) */
async function loadExcelJS(): Promise<ExcelJS_NS> {
  const mod = await import('exceljs');
  return (mod.default || mod) as ExcelJS_NS;
}

// =====================================================
// 색상 & 스타일 정의 (연결표 UI 색상 기반)
// =====================================================
const COLORS = {
  // FE 영역 (파란색 계열)
  feHeader: '1A3050',
  feHeaderBorder: '2A4A6A',
  feEven: 'E3F2FD',
  feOdd: 'BBDEFB',

  // FM 영역 (주황색 계열)
  fmHeader: '3A2A10',
  fmHeaderBorder: '5A4A2A',
  fmEven: 'FFF3E0',
  fmOdd: 'FFE0B2',

  // FC 영역 (초록색 계열)
  fcHeader: '1A3520',
  fcHeaderBorder: '2A5530',
  fcEven: 'E8F5E9',
  fcOdd: 'C8E6C9',

  // 공통
  white: 'FFFFFF',
  borderColor: '90CAF9',
  severityHigh: 'F57C00',
  severityMid: 'F57F17',
  severityLow: '333333',
};

// 공유 스타일 (GC 부하 감소)
const SHARED_BORDER: Partial<import('exceljs').Borders> = {
  top: { style: 'thin', color: { argb: COLORS.borderColor } },
  left: { style: 'thin', color: { argb: COLORS.borderColor } },
  bottom: { style: 'thin', color: { argb: COLORS.borderColor } },
  right: { style: 'thin', color: { argb: COLORS.borderColor } },
};

const SHARED_FONT: Partial<import('exceljs').Font> = {
  name: '맑은 고딕',
  size: 10,
  color: { argb: '333333' },
};

const SHARED_ALIGN_CENTER: Partial<import('exceljs').Alignment> = {
  vertical: 'middle',
  horizontal: 'center',
  wrapText: true,
};

const SHARED_ALIGN_LEFT: Partial<import('exceljs').Alignment> = {
  vertical: 'middle',
  horizontal: 'left',
  wrapText: true,
};

// =====================================================
// 그룹 데이터 구조 (FailureLinkResult.tsx 동일 로직)
// =====================================================
interface FMGroupForExcel {
  fmId: string;
  fmText: string;
  fmProcess: string;
  fmNo: string;
  fes: { feNo: string; scope: string; text: string; severity: number }[];
  fcs: { fcNo: string; processName: string; workElem: string; text: string }[];
}

/**
 * state.failureLinks를 FM별 그룹으로 변환 (FailureLinkResult.tsx와 동일 로직)
 */
function buildGroupsFromState(state: WorksheetState): FMGroupForExcel[] {
  const links = state.failureLinks || [];
  if (links.length === 0) return [];

  // LinkResult 형태로 변환
  const linkResults = links.map(link => ({
    fmId: link.fmId,
    fmNo: link.fmText ? '' : '',
    fmText: link.fmText || '',
    fmProcess: link.fmProcessName || link.fmProcess || '',
    fmProcessNo: link.fmProcessNo || '',
    feId: link.feId || '',
    feNo: '',
    feScope: link.feScope || link.feCategory || '',
    feText: link.feText || '',
    severity: link.severity || 0,
    fcId: link.fcId || '',
    fcNo: '',
    fcProcess: link.fcProcess || '',
    fcM4: link.fcM4 || '',
    fcWorkElem: link.fcWorkElem || '',
    fcText: link.fcText || '',
  }));

  const fmGroupsMap = groupFailureLinksByFM(linkResults);

  // fmData 재구성 (state에서 FM 정보 가져오기)
  const fmDataMap = new Map<string, { text: string; processName: string; fmNo: string }>();
  for (const l2 of (state.l2 || [])) {
    const failureModes = l2.failureModes || [];
    failureModes.forEach((fm, fmIdx) => {
      if (fm.id) {
        fmDataMap.set(fm.id, {
          text: fm.name || '',
          processName: l2.name || '',
          fmNo: `M${fmIdx + 1}`,
        });
      }
    });
  }

  const result: FMGroupForExcel[] = [];
  let fmCounter = 0;

  fmGroupsMap.forEach((group) => {
    fmCounter++;
    const fmInfo = fmDataMap.get(group.fmId);

    let feCounter = 0;
    let fcCounter = 0;

    result.push({
      fmId: group.fmId,
      fmText: fmInfo?.text || group.fmText,
      fmProcess: fmInfo?.processName || group.fmProcess,
      fmNo: fmInfo?.fmNo || group.fmNo || `M${fmCounter}`,
      fes: group.fes.map(fe => {
        feCounter++;
        return {
          feNo: fe.no || `FE${feCounter}`,
          scope: fe.scope,
          text: fe.text,
          severity: fe.severity,
        };
      }),
      fcs: group.fcs.map(fc => {
        fcCounter++;
        return {
          fcNo: fc.no || `FC${fcCounter}`,
          processName: fc.process,
          workElem: fc.workElem,
          text: fc.text,
        };
      }),
    });
  });

  // FM 번호 기준 정렬
  const parseFmNo = (fmNo: string) => {
    const match = fmNo.match(/\d+/);
    return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
  };
  result.sort((a, b) => parseFmNo(a.fmNo) - parseFmNo(b.fmNo));

  return result;
}

/**
 * scope를 Cat 약어로 변환 (UI와 동일)
 */
function scopeToCat(scope: string): string {
  if (scope === 'Your Plant') return 'YP';
  if (scope === 'Ship to Plant') return 'SP';
  if (scope === 'User') return 'USER';
  return scope || '';
}

/**
 * 심각도에 따른 폰트 색상
 */
function severityColor(s: number): string {
  if (s >= 8) return COLORS.severityHigh;
  if (s >= 5) return COLORS.severityMid;
  return COLORS.severityLow;
}

// =====================================================
// 메인 Export 함수
// =====================================================

/**
 * 연결표(고장연결) 엑셀 내보내기
 *
 * @param state - 워크시트 상태 (failureLinks, l2 데이터)
 * @param fmeaName - FMEA 프로젝트명 (파일명에 사용)
 */
export async function exportLinkageExcel(
  state: WorksheetState,
  fmeaName: string
): Promise<void> {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();

  const ws = workbook.addWorksheet('연결표(Linkage)', {
    properties: { tabColor: { argb: 'FF6F00' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  // ── 컬럼 정의 (10개, UI와 동일) ──
  ws.columns = [
    { header: 'FE No',    key: 'feNo',    width: 7 },
    { header: 'Cat',      key: 'cat',     width: 7 },
    { header: 'FE',       key: 'feText',  width: 28 },
    { header: 'S',        key: 'sev',     width: 5 },
    { header: 'FM No',    key: 'fmNo',    width: 7 },
    { header: 'FM',       key: 'fmText',  width: 24 },
    { header: 'FC No',    key: 'fcNo',    width: 7 },
    { header: 'Process',  key: 'fcProc',  width: 16 },
    { header: 'WE',       key: 'fcWE',    width: 16 },
    { header: 'FC',       key: 'fcText',  width: 28 },
  ];

  // ── 헤더 스타일 ──
  const headerRow = ws.getRow(1);
  headerRow.height = 22;
  for (let col = 1; col <= 10; col++) {
    const cell = headerRow.getCell(col);
    // FE(1-4), FM(5-6), FC(7-10) 영역별 배경 색상
    let bgColor: string;
    let borderColor: string;
    if (col <= 4) {
      bgColor = COLORS.feHeader;
      borderColor = COLORS.feHeaderBorder;
    } else if (col <= 6) {
      bgColor = COLORS.fmHeader;
      borderColor = COLORS.fmHeaderBorder;
    } else {
      bgColor = COLORS.fcHeader;
      borderColor = COLORS.fcHeaderBorder;
    }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: COLORS.white } };
    cell.alignment = SHARED_ALIGN_CENTER;
    cell.border = {
      top: { style: 'thin', color: { argb: borderColor } },
      left: { style: 'thin', color: { argb: borderColor } },
      bottom: { style: 'thin', color: { argb: borderColor } },
      right: { style: 'thin', color: { argb: borderColor } },
    };
  }

  // ── 데이터 행 생성 ──
  const groups = buildGroupsFromState(state);

  if (groups.length === 0) {
    // 빈 데이터
    const emptyRow = ws.addRow(['', '', '연결된 고장이 없습니다', '', '', '', '', '', '', '']);
    ws.mergeCells(emptyRow.number, 1, emptyRow.number, 10);
    const cell = emptyRow.getCell(1);
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.font = { ...SHARED_FONT, color: { argb: '999999' }, italic: true };
  } else {
    let globalRowIdx = 0;

    for (const group of groups) {
      const feCount = group.fes.length;
      const fcCount = group.fcs.length;
      const totalRows = Math.max(feCount, fcCount, 1);

      const startExcelRow = ws.rowCount + 1; // 다음 행 번호

      for (let rowIdx = 0; rowIdx < totalRows; rowIdx++) {
        const mergeConfig = calculateLastRowMerge(feCount, fcCount, rowIdx, totalRows);
        const isOdd = globalRowIdx % 2 === 1;

        const feItem = (mergeConfig.showFe && rowIdx < feCount) ? group.fes[rowIdx] : null;
        const fcItem = (mergeConfig.showFc && rowIdx < fcCount) ? group.fcs[rowIdx] : null;

        const rowData = [
          feItem?.feNo || '',
          feItem ? scopeToCat(feItem.scope) : '',
          feItem?.text || '',
          feItem ? (feItem.severity || '') : '',
          rowIdx === 0 ? group.fmNo : '',
          rowIdx === 0 ? group.fmText : '',
          fcItem?.fcNo || '',
          fcItem?.processName || '',
          fcItem?.workElem || '',
          fcItem?.text || '',
        ];

        const excelRow = ws.addRow(rowData);
        excelRow.height = 18;

        // 셀 스타일 적용
        for (let col = 1; col <= 10; col++) {
          const cell = excelRow.getCell(col);
          cell.border = SHARED_BORDER;

          let bgColor: string;
          if (col <= 4) {
            bgColor = isOdd ? COLORS.feOdd : COLORS.feEven;
          } else if (col <= 6) {
            bgColor = isOdd ? COLORS.fmOdd : COLORS.fmEven;
          } else {
            bgColor = isOdd ? COLORS.fcOdd : COLORS.fcEven;
          }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };

          // S(심각도) 컬럼 폰트 색상
          if (col === 4 && feItem) {
            cell.font = { ...SHARED_FONT, bold: true, color: { argb: severityColor(feItem.severity) } };
          } else if (col === 5) {
            cell.font = { ...SHARED_FONT, bold: true };
          } else {
            cell.font = SHARED_FONT;
          }

          // 정렬: No/Cat/S/Process 센터, Text 왼쪽
          if (col === 3 || col === 6 || col === 9 || col === 10) {
            cell.alignment = SHARED_ALIGN_LEFT;
          } else {
            cell.alignment = SHARED_ALIGN_CENTER;
          }
        }

        globalRowIdx++;
      }

      // ── 셀 병합 (FM은 전체 행, FE/FC는 마지막 항목이 남은 행 차지) ──
      const endExcelRow = startExcelRow + totalRows - 1;

      // FM 컬럼(5,6) 병합: 항상 전체 행
      if (totalRows > 1) {
        ws.mergeCells(startExcelRow, 5, endExcelRow, 5);
        ws.mergeCells(startExcelRow, 6, endExcelRow, 6);
      }

      // FE 컬럼(1-4) 병합: 마지막 FE가 남은 행 차지
      if (feCount > 0 && feCount < totalRows) {
        const lastFeRow = startExcelRow + feCount - 1;
        for (const col of [1, 2, 3, 4]) {
          ws.mergeCells(lastFeRow, col, endExcelRow, col);
        }
      } else if (feCount === 0 && totalRows > 1) {
        for (const col of [1, 2, 3, 4]) {
          ws.mergeCells(startExcelRow, col, endExcelRow, col);
        }
      }

      // FC 컬럼(7-10) 병합: 마지막 FC가 남은 행 차지
      if (fcCount > 0 && fcCount < totalRows) {
        const lastFcRow = startExcelRow + fcCount - 1;
        for (const col of [7, 8, 9, 10]) {
          ws.mergeCells(lastFcRow, col, endExcelRow, col);
        }
      } else if (fcCount === 0 && totalRows > 1) {
        for (const col of [7, 8, 9, 10]) {
          ws.mergeCells(startExcelRow, col, endExcelRow, col);
        }
      }

      // 100행마다 UI 스레드 양보
      if (globalRowIdx % 100 === 0) {
        await yieldToMain();
      }
    }

    // ── 통계 푸터 행 ──
    const feTotal = groups.reduce((sum, g) => sum + g.fes.length, 0);
    const fcTotal = groups.reduce((sum, g) => sum + g.fcs.length, 0);

    const footerRow = ws.addRow([
      `연결 현황: FM ${groups.length}개 | FE ${feTotal}개 | FC ${fcTotal}개`,
      '', '', '', '', '', '', '', '', '',
    ]);
    ws.mergeCells(footerRow.number, 1, footerRow.number, 10);
    const footerCell = footerRow.getCell(1);
    footerCell.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: '1A3050' } };
    footerCell.alignment = { vertical: 'middle', horizontal: 'left' };
    footerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8EAF6' } };
    footerCell.border = SHARED_BORDER;
  }

  // ── 파일 다운로드 ──
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const safeName = (fmeaName || 'FMEA').replace(/[\\/:*?"<>|]/g, '_');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}_연결표.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
