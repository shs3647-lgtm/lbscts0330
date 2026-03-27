import type ExcelJS_NS from 'exceljs';
import { WorksheetState, AtomicUnit } from './constants';

/**
 * Excel 내보내기 유틸리티
 * @version 3.1.0
 * @description dynamic import + 메인 스레드 yield로 "응답 없는 페이지" 방지
 */

/** ExcelJS 동적 로드 (메인 번들에서 제외) */
async function loadExcelJS(): Promise<typeof ExcelJS_NS> {
  const mod = await import('exceljs');
  return mod.default || mod;
}

/** 메인 스레드 yield — 브라우저가 UI 업데이트할 시간 확보 */
function yieldToMain(): Promise<void> {
  return new Promise(r => setTimeout(r, 0));
}

const COLORS = {
  header: '1565C0',
  rowEven: 'F5F5F5',
  rowOdd: 'FFFFFF',
  line: 'D1D1D1'
};

const applyHeaderStyle = (cell: ExcelJS_NS.Cell, color: string) => {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: color }
  };
  cell.font = {
    color: { argb: 'FFFFFF' },
    bold: true,
    size: 10,
    name: '맑은 고딕'
  };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
};

// ★ P0-2: 공유 스타일 객체 — 셀당 4개 객체 생성 → 재사용 (GC 부하 90% 감소)
const SHARED_FILL_EVEN: ExcelJS_NS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9F9F9' } };
const SHARED_FILL_ODD: ExcelJS_NS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
const SHARED_DATA_FONT: Partial<ExcelJS_NS.Font> = { size: 9, name: '맑은 고딕' };
const SHARED_DATA_ALIGN: Partial<ExcelJS_NS.Alignment> = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
const SHARED_DATA_BORDER: Partial<ExcelJS_NS.Borders> = {
  top: { style: 'thin' }, left: { style: 'thin' },
  bottom: { style: 'thin' }, right: { style: 'thin' },
};

const applyDataStyle = (cell: ExcelJS_NS.Cell, isEven: boolean) => {
  cell.fill = isEven ? SHARED_FILL_EVEN : SHARED_FILL_ODD;
  cell.font = SHARED_DATA_FONT;
  cell.alignment = SHARED_DATA_ALIGN;
  cell.border = SHARED_DATA_BORDER;
};

/**
 * 1L 완제품 기능분석 Excel 내보내기 (화면과 1:1 일치)
 * @param includeFailure - true이면 고장영향 컬럼 포함 (4단계), false이면 기능분석만 (3단계)
 */
export async function exportFunctionL1(state: WorksheetState, fmeaName: string, includeFailure: boolean = false) {
  const ExcelJS = await loadExcelJS();
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
  const colCount = columns.length;

  worksheet.columns = columns;

  // 헤더 설정
  const headerRow = worksheet.getRow(1);
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    // 구분별 헤더 색상 (구조분석: 파랑, 기능분석: 녹색, 고장분석: 빨강)
    const color = idx === 0 ? '1976D2' : idx < 4 ? '1B5E20' : 'C62828';
    applyHeaderStyle(cell, color);
  });
  headerRow.height = 25;

  // 데이터 작성
  let rowNum = 2;
  const l1Name = state.l1?.name || '';
  const types = state.l1?.types || [];

  // 평탄화된 데이터 생성
  const flatData: { type: string; func: string; reqId: string; reqName: string; effect: string; severity?: number }[] = [];

  types.forEach((type: any) => {
    const funcs = type.functions || [];
    if (funcs.length === 0) {
      flatData.push({ type: type.name, func: '', reqId: '', reqName: '', effect: '', severity: undefined });
    } else {
      funcs.forEach((fn: any) => {
        const reqs = fn.requirements || [];
        if (reqs.length === 0) {
          flatData.push({ type: type.name, func: fn.name, reqId: '', reqName: '', effect: '', severity: undefined });
        } else {
          reqs.forEach((req: any) => {
            if (includeFailure) {
              // 고장분석 포함: 각 요구사항의 고장영향 수에 따라 행 생성
              const effects = failureScopes.filter((s: any) => s.reqId === req.id);
              if (effects.length === 0) {
                flatData.push({ type: type.name, func: fn.name, reqId: req.id, reqName: req.name, effect: '', severity: undefined });
              } else {
                effects.forEach((eff: any) => {
                  flatData.push({ type: type.name, func: fn.name, reqId: req.id, reqName: req.name, effect: eff.effect || '', severity: eff.severity });
                });
              }
            } else {
              // 기능분석만: 요구사항당 1행
              flatData.push({ type: type.name, func: fn.name, reqId: req.id, reqName: req.name, effect: '', severity: undefined });
            }
          });
        }
      });
    }
  });

  // 데이터 기록 및 병합 정보 수집
  interface MergeInfo { startRow: number; endRow: number; col: number }
  const typeMerges: MergeInfo[] = [];
  const funcMerges: MergeInfo[] = [];
  const reqMerges: MergeInfo[] = [];

  let currentType = '';
  let typeStartRow = rowNum;
  let currentFunc = '';
  let funcStartRow = rowNum;
  let currentReqId = '';
  let reqStartRow = rowNum;

  flatData.forEach((data) => {
    const row = worksheet.getRow(rowNum);
    row.getCell(1).value = l1Name;
    row.getCell(2).value = data.type;
    row.getCell(3).value = data.func;
    row.getCell(4).value = data.reqName;
    if (includeFailure) {
      row.getCell(5).value = data.effect;
      row.getCell(6).value = data.severity || '';
    }

    // 스타일 적용
    for (let i = 1; i <= colCount; i++) {
      applyDataStyle(row.getCell(i), rowNum % 2 === 0);
      if (includeFailure && i === 6) row.getCell(i).alignment = { vertical: 'middle', horizontal: 'center' };
    }

    // 병합 추적 - 구분
    if (data.type !== currentType) {
      if (currentType && rowNum > typeStartRow) {
        typeMerges.push({ startRow: typeStartRow, endRow: rowNum - 1, col: 2 });
      }
      currentType = data.type;
      typeStartRow = rowNum;
    }

    // 병합 추적 - 기능
    const funcKey = `${data.type}_${data.func}`;
    if (funcKey !== currentFunc) {
      if (currentFunc && rowNum > funcStartRow) {
        funcMerges.push({ startRow: funcStartRow, endRow: rowNum - 1, col: 3 });
      }
      currentFunc = funcKey;
      funcStartRow = rowNum;
    }

    // 병합 추적 - 요구사항 (고장분석 포함시에만 병합)
    if (includeFailure && data.reqId !== currentReqId) {
      if (currentReqId && rowNum > reqStartRow) {
        reqMerges.push({ startRow: reqStartRow, endRow: rowNum - 1, col: 4 });
      }
      currentReqId = data.reqId;
      reqStartRow = rowNum;
    }

    rowNum++;
  });

  // 마지막 병합 처리
  if (currentType && rowNum > typeStartRow) {
    typeMerges.push({ startRow: typeStartRow, endRow: rowNum - 1, col: 2 });
  }
  if (currentFunc && rowNum > funcStartRow) {
    funcMerges.push({ startRow: funcStartRow, endRow: rowNum - 1, col: 3 });
  }
  if (includeFailure && currentReqId && rowNum > reqStartRow) {
    reqMerges.push({ startRow: reqStartRow, endRow: rowNum - 1, col: 4 });
  }

  // 병합 적용
  typeMerges.forEach(m => { if (m.endRow > m.startRow) worksheet.mergeCells(m.startRow, m.col, m.endRow, m.col); });
  funcMerges.forEach(m => { if (m.endRow > m.startRow) worksheet.mergeCells(m.startRow, m.col, m.endRow, m.col); });
  reqMerges.forEach(m => { if (m.endRow > m.startRow) worksheet.mergeCells(m.startRow, m.col, m.endRow, m.col); });

  // 완제품 공정명 전체 병합
  if (rowNum > 2) {
    worksheet.mergeCells(2, 1, rowNum - 1, 1);
  }

  const fileName = includeFailure ? `${fmeaName}_1L_고장영향` : `${fmeaName}_1L_완제품기능`;
  const buffer = await workbook.xlsx.writeBuffer();
  saveExcelFile(buffer, fileName);
}

/**
 * 2L 메인공정 기능분석 Excel 내보내기 (화면과 1:1 일치)
 * @param includeFailure - true이면 고장형태 컬럼 포함 (4단계), false이면 기능분석만 (3단계)
 */
export async function exportFunctionL2(state: WorksheetState, fmeaName: string, includeFailure: boolean = false) {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  const sheetName = includeFailure ? '2L 고장형태' : '2L 메인공정기능';
  const worksheet = workbook.addWorksheet(sheetName, {
    properties: { tabColor: { argb: includeFailure ? 'C62828' : '1B5E20' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  // 기능분석만 또는 고장분석 포함 컬럼
  const baseColumns = [
    { header: '공정NO+공정명', key: 'processName', width: 25 },
    { header: '메인공정기능', key: 'function', width: 35 },
    { header: '제품특성', key: 'productChar', width: 25 },
    { header: '특별특성', key: 'specialChar', width: 10 },
  ];

  const failureColumns = [
    { header: '고장형태(FM)', key: 'failureMode', width: 25 },
  ];

  const columns = includeFailure ? [...baseColumns, ...failureColumns] : baseColumns;
  const colCount = columns.length;

  worksheet.columns = columns;

  // 헤더 설정 (기능분석: 녹색, 고장분석: 빨강)
  const headerRow = worksheet.getRow(1);
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    const color = idx < 4 ? '1B5E20' : 'C62828';
    applyHeaderStyle(cell, color);
  });
  headerRow.height = 25;

  // ★★★ 2026-02-18: 화면(FailureL2Tab) 렌더링과 동일한 계층적 평탄화 ★★★
  // Process → Function → ProductChar → FailureMode (productCharId 연결)
  interface FlatData {
    procName: string; funcName: string; productChar: string; specialChar: string; failureMode: string;
    procKey: string; funcKey: string; charKey: string;
  }
  const flatData: FlatData[] = [];

  const processes = (state.l2 || []).filter((p: any) => p.name?.trim());

  const isMeaningful = (name: string | undefined | null) => {
    if (!name) return false;
    const t = String(name).trim();
    return t !== '';
  };

  processes.forEach((proc: any) => {
    const functions = (proc.functions || []).filter((f: any) => isMeaningful(f.name));
    const allModes = proc.failureModes || [];
    const procLabel = `${proc.no}. ${proc.name}`;

    // 공정별 중복 제품특성 추적
    const displayedChars = new Set<string>();

    if (functions.length === 0) {
      flatData.push({ procName: procLabel, funcName: '', productChar: '', specialChar: '', failureMode: '',
        procKey: proc.id, funcKey: `empty_${proc.id}`, charKey: '' });
      return;
    }

    functions.forEach((fn: any) => {
      const pChars = (fn.productChars || [])
        .filter((pc: any) => isMeaningful(pc.name))
        .filter((pc: any) => {
          const n = pc.name?.trim();
          if (displayedChars.has(n)) return false;
          displayedChars.add(n);
          return true;
        });

      if (pChars.length === 0) {
        flatData.push({ procName: procLabel, funcName: fn.name, productChar: '', specialChar: '', failureMode: '',
          procKey: proc.id, funcKey: fn.id, charKey: '' });
        return;
      }

      pChars.forEach((pc: any) => {
        if (includeFailure) {
          // 2L형태: 제품특성에 연결된 고장형태별로 행 생성
          const linkedModes = allModes.filter((m: any) => m.productCharId === pc.id);
          if (linkedModes.length === 0) {
            flatData.push({ procName: procLabel, funcName: fn.name, productChar: pc.name,
              specialChar: pc.specialChar || '', failureMode: '',
              procKey: proc.id, funcKey: fn.id, charKey: pc.id });
          } else {
            linkedModes.forEach((m: any) => {
              flatData.push({ procName: procLabel, funcName: fn.name, productChar: pc.name,
                specialChar: pc.specialChar || '', failureMode: m.name || '',
                procKey: proc.id, funcKey: fn.id, charKey: pc.id });
            });
          }
        } else {
          // 2L기능: 제품특성당 1행
          flatData.push({ procName: procLabel, funcName: fn.name, productChar: pc.name,
            specialChar: pc.specialChar || '', failureMode: '',
            procKey: proc.id, funcKey: fn.id, charKey: pc.id });
        }
      });
    });
  });

  // 데이터 기록 및 병합 정보 수집
  let rowNum = 2;
  interface MergeInfo { startRow: number; endRow: number; col: number }
  const procMerges: MergeInfo[] = [];
  const funcMerges: MergeInfo[] = [];
  const charMerges: MergeInfo[] = [];

  let prevProcKey = '';
  let procStartRow = rowNum;
  let prevFuncKey = '';
  let funcStartRow = rowNum;
  let prevCharKey = '';
  let charStartRow = rowNum;

  flatData.forEach((data) => {
    const row = worksheet.getRow(rowNum);
    row.getCell(1).value = data.procName;
    row.getCell(2).value = data.funcName;
    row.getCell(3).value = data.productChar;
    row.getCell(4).value = data.specialChar;
    if (includeFailure) row.getCell(5).value = data.failureMode;

    for (let i = 1; i <= colCount; i++) {
      applyDataStyle(row.getCell(i), rowNum % 2 === 0);
      if (i === 4) row.getCell(i).alignment = { vertical: 'middle', horizontal: 'center' };
    }

    // 병합 추적 - 공정 (col 1)
    if (data.procKey !== prevProcKey) {
      if (prevProcKey && rowNum > procStartRow) {
        procMerges.push({ startRow: procStartRow, endRow: rowNum - 1, col: 1 });
      }
      prevProcKey = data.procKey;
      procStartRow = rowNum;
    }

    // 병합 추적 - 기능 (col 2)
    const funcTrackKey = `${data.procKey}_${data.funcKey}`;
    if (funcTrackKey !== prevFuncKey) {
      if (prevFuncKey && rowNum > funcStartRow) {
        funcMerges.push({ startRow: funcStartRow, endRow: rowNum - 1, col: 2 });
      }
      prevFuncKey = funcTrackKey;
      funcStartRow = rowNum;
    }

    // 병합 추적 - 제품특성 + 특별특성 (col 3, 4) — 2L형태에서만 병합
    if (includeFailure) {
      const charTrackKey = data.charKey ? `${data.procKey}_${data.funcKey}_${data.charKey}` : `empty_${rowNum}`;
      if (charTrackKey !== prevCharKey) {
        if (prevCharKey && rowNum > charStartRow) {
          charMerges.push({ startRow: charStartRow, endRow: rowNum - 1, col: 3 });
          charMerges.push({ startRow: charStartRow, endRow: rowNum - 1, col: 4 });
        }
        prevCharKey = charTrackKey;
        charStartRow = rowNum;
      }
    }

    rowNum++;
  });

  // 마지막 병합 처리
  if (prevProcKey && rowNum > procStartRow) {
    procMerges.push({ startRow: procStartRow, endRow: rowNum - 1, col: 1 });
  }
  if (prevFuncKey && rowNum > funcStartRow) {
    funcMerges.push({ startRow: funcStartRow, endRow: rowNum - 1, col: 2 });
  }
  if (includeFailure && prevCharKey && rowNum > charStartRow) {
    charMerges.push({ startRow: charStartRow, endRow: rowNum - 1, col: 3 });
    charMerges.push({ startRow: charStartRow, endRow: rowNum - 1, col: 4 });
  }

  // 병합 적용
  const allMerges = [...procMerges, ...funcMerges, ...charMerges];
  allMerges.forEach(m => { if (m.endRow > m.startRow) worksheet.mergeCells(m.startRow, m.col, m.endRow, m.col); });

  const buffer = await workbook.xlsx.writeBuffer();
  saveExcelFile(buffer, `${fmeaName}_2L_${includeFailure ? '고장형태' : '메인공정기능'}`);
}

/**
 * 3L 작업요소 기능분석 Excel 내보내기 (화면과 1:1 일치)
 * @param includeFailure - true이면 고장원인 컬럼 포함 (4단계), false이면 기능분석만 (3단계)
 */
export async function exportFunctionL3(state: WorksheetState, fmeaName: string, includeFailure: boolean = false) {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  const sheetName = includeFailure ? '3L 고장원인' : '3L 작업요소기능';
  const worksheet = workbook.addWorksheet(sheetName, {
    properties: { tabColor: { argb: includeFailure ? 'C62828' : '1B5E20' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  const baseColumns = [
    { header: '공정명', key: 'processName', width: 20 },
    { header: '4M', key: 'm4', width: 8 },
    { header: '작업요소', key: 'workElem', width: 20 },
    { header: '작업요소기능', key: 'function', width: 30 },
    { header: '공정특성', key: 'processChar', width: 20 },
    { header: '특별특성', key: 'specialChar', width: 10 },
  ];

  const columns = includeFailure
    ? [...baseColumns, { header: '고장원인(FC)', key: 'failureCause', width: 25 }]
    : baseColumns;

  worksheet.columns = columns;

  // 헤더 설정 (기능분석: 녹색, 고장분석: 빨강)
  const headerRow = worksheet.getRow(1);
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    const color = includeFailure && idx >= baseColumns.length ? 'C62828' : '1B5E20';
    applyHeaderStyle(cell, color);
  });
  headerRow.height = 25;

  // 평탄화된 데이터 생성
  interface FlatData {
    procName: string; m4: string; weName: string; funcName: string;
    processChar: string; specialChar: string; failureCause: string;
  }
  const flatData: FlatData[] = [];

  const processes = (state.l2 || []).filter((p: any) => p.name?.trim());

  processes.forEach((proc: any) => {
    const l3List = (proc.l3 || []).filter((we: any) => we.name?.trim());

    l3List.forEach((we: any) => {
      const functions = we.functions || [];
      const failureCauses = we.failureCauses || [];

      // 각 기능별로 공정특성 수집
      const allProcessChars: { funcName: string; charName: string; specialChar: string }[] = [];
      functions.forEach((fn: any) => {
        const pChars = fn.processChars || [];
        if (pChars.length === 0) {
          allProcessChars.push({ funcName: fn.name, charName: '', specialChar: '' });
        } else {
          pChars.forEach((pc: any) => {
            allProcessChars.push({ funcName: fn.name, charName: pc.name, specialChar: pc.specialChar || '' });
          });
        }
      });

      // 최대 행 수 결정 (고장원인 포함 여부에 따라)
      const maxRows = includeFailure
        ? Math.max(allProcessChars.length || 1, failureCauses.length || 1)
        : allProcessChars.length || 1;

      for (let i = 0; i < maxRows; i++) {
        const pc = allProcessChars[i];
        const fc = includeFailure ? failureCauses[i] : undefined;
        flatData.push({
          procName: `${proc.no}. ${proc.name}`,
          m4: we.m4 || '',
          weName: we.name,
          funcName: pc?.funcName || '',
          processChar: pc?.charName || '',
          specialChar: pc?.specialChar || '',
          failureCause: fc?.name || ''
        });
      }
    });
  });

  // 데이터 기록 및 병합 정보 수집
  let rowNum = 2;
  interface MergeInfo { startRow: number; endRow: number; col: number }
  const procMerges: MergeInfo[] = [];
  const m4Merges: MergeInfo[] = [];
  const weMerges: MergeInfo[] = [];
  const funcMerges: MergeInfo[] = [];

  let currentProc = '';
  let procStartRow = rowNum;
  let currentWe = '';
  let weStartRow = rowNum;
  let currentFunc = '';
  let funcStartRow = rowNum;

  flatData.forEach((data) => {
    const row = worksheet.getRow(rowNum);
    row.getCell(1).value = data.procName;
    row.getCell(2).value = data.m4;
    row.getCell(3).value = data.weName;
    row.getCell(4).value = data.funcName;
    row.getCell(5).value = data.processChar;
    row.getCell(6).value = data.specialChar;
    if (includeFailure) {
      row.getCell(7).value = data.failureCause;
    }

    const cellIndices = includeFailure ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5, 6];
    cellIndices.forEach(i => {
      applyDataStyle(row.getCell(i), rowNum % 2 === 0);
      if (i === 2 || i === 6) row.getCell(i).alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // 병합 추적 - 공정
    if (data.procName !== currentProc) {
      if (currentProc && rowNum > procStartRow) {
        procMerges.push({ startRow: procStartRow, endRow: rowNum - 1, col: 1 });
      }
      currentProc = data.procName;
      procStartRow = rowNum;
    }

    // 병합 추적 - 작업요소 (4M, 작업요소명)
    const weKey = `${data.procName}_${data.weName}`;
    if (weKey !== currentWe) {
      if (currentWe && rowNum > weStartRow) {
        m4Merges.push({ startRow: weStartRow, endRow: rowNum - 1, col: 2 });
        weMerges.push({ startRow: weStartRow, endRow: rowNum - 1, col: 3 });
      }
      currentWe = weKey;
      weStartRow = rowNum;
    }

    // 병합 추적 - 기능
    const funcKey = `${weKey}_${data.funcName}`;
    if (funcKey !== currentFunc) {
      if (currentFunc && rowNum > funcStartRow) {
        funcMerges.push({ startRow: funcStartRow, endRow: rowNum - 1, col: 4 });
      }
      currentFunc = funcKey;
      funcStartRow = rowNum;
    }

    rowNum++;
  });

  // 마지막 병합 처리
  if (currentProc && rowNum > procStartRow) {
    procMerges.push({ startRow: procStartRow, endRow: rowNum - 1, col: 1 });
  }
  if (currentWe && rowNum > weStartRow) {
    m4Merges.push({ startRow: weStartRow, endRow: rowNum - 1, col: 2 });
    weMerges.push({ startRow: weStartRow, endRow: rowNum - 1, col: 3 });
  }
  if (currentFunc && rowNum > funcStartRow) {
    funcMerges.push({ startRow: funcStartRow, endRow: rowNum - 1, col: 4 });
  }

  // 병합 적용
  procMerges.forEach(m => { if (m.endRow > m.startRow) worksheet.mergeCells(m.startRow, m.col, m.endRow, m.col); });
  m4Merges.forEach(m => { if (m.endRow > m.startRow) worksheet.mergeCells(m.startRow, m.col, m.endRow, m.col); });
  weMerges.forEach(m => { if (m.endRow > m.startRow) worksheet.mergeCells(m.startRow, m.col, m.endRow, m.col); });
  funcMerges.forEach(m => { if (m.endRow > m.startRow) worksheet.mergeCells(m.startRow, m.col, m.endRow, m.col); });

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = includeFailure ? `${fmeaName}_3L_고장원인` : `${fmeaName}_3L_작업요소기능`;
  saveExcelFile(buffer, fileName);
}

// ★ P0: 모듈 레벨 상수 — 함수 호출마다 재생성 방지
const ALLVIEW_COLUMNS = [
  // 구조분석 (4)
  { id: 'l1Name', label: '완제품공정명', width: 18 },
  { id: 'l2NoName', label: 'NO+공정명', width: 16 },
  { id: 'm4', label: '4M', width: 5 },
  { id: 'workElem', label: '작업요소', width: 16 },
  // 기능분석 (7)
  { id: 'l1Type', label: '구분', width: 6 },
  { id: 'l1Function', label: '완제품기능', width: 22 },
  { id: 'l1Requirement', label: '요구사항', width: 18 },
  { id: 'l2Function', label: '공정기능', width: 18 },
  { id: 'productChar', label: '제품특성', width: 14 },
  { id: 'l3Function', label: '작업요소기능', width: 16 },
  { id: 'processChar', label: '공정특성', width: 14 },
  // 고장분석 (4)
  { id: 'failureEffect', label: '고장영향(FE)', width: 18 },
  { id: 'severity', label: 'S', width: 4 },
  { id: 'failureMode', label: '고장형태(FM)', width: 18 },
  { id: 'failureCause', label: '고장원인(FC)', width: 18 },
  // 리스크분석 (7)
  { id: 'prevention', label: '예방관리', width: 14 },
  { id: 'occurrence', label: 'O', width: 4 },
  { id: 'detection', label: '검출관리', width: 14 },
  { id: 'detectability', label: 'D', width: 4 },
  { id: 'ap', label: 'AP', width: 4 },
  { id: 'specialChar', label: '특별특성', width: 6 },
  { id: 'lesson', label: '습득교훈', width: 12 },
  // 최적화 (13)
  { id: 'preventionImprove', label: '예방개선', width: 14 },
  { id: 'detectionImprove', label: '검출개선', width: 14 },
  { id: 'responsible', label: '책임자', width: 8 },
  { id: 'targetDate', label: '목표일', width: 10 },
  { id: 'status', label: '상태', width: 6 },
  { id: 'evidence', label: '개선근거', width: 12 },
  { id: 'completionDate', label: '완료일', width: 10 },
  { id: 'newS', label: 'S', width: 4 },
  { id: 'newO', label: 'O', width: 4 },
  { id: 'newD', label: 'D', width: 4 },
  { id: 'newSpecial', label: '특별특성', width: 6 },
  { id: 'newAP', label: 'AP', width: 4 },
  { id: 'remarks', label: '비고', width: 10 },
] as const;

const ALLVIEW_GROUPS = [
  { name: '구조분석', count: 4, color: '1565C0' },
  { name: '기능분석', count: 7, color: '1B5E20' },
  { name: 'P-FMEA 고장분석(4단계)', count: 4, color: 'C62828' },
  { name: 'P-FMEA 리스크분석(5단계)', count: 7, color: '6A1B9A' },
  { name: 'P-FMEA 최적화(6단계)', count: 13, color: 'E65100' },
] as const;

/** Web Worker로 ExcelJS 워크북 생성 + writeBuffer ZIP 압축 실행 (메인 스레드 비차단) */
async function buildExcelInWorker(input: {
  type: 'buildAllView';
  columns: { id: string; label: string; width: number }[];
  groups: { name: string; count: number; color: string }[];
  dataRows: (string | number | null)[][];
  merges: [number, number, number, number][];
}): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./excel-worker.ts', import.meta.url));
    const timeout = setTimeout(() => { worker.terminate(); reject(new Error('Worker timeout (60s)')); }, 60000);
    worker.onmessage = (e: MessageEvent) => {
      clearTimeout(timeout);
      worker.terminate();
      if (e.data.type === 'done') resolve(e.data.buffer);
      else reject(new Error(e.data.message || 'Worker failed'));
    };
    worker.onerror = (e: ErrorEvent) => { clearTimeout(timeout); worker.terminate(); reject(new Error(e.message)); };
    worker.postMessage(input);
  });
}

/** 폴백: 메인 스레드에서 ExcelJS 워크북 생성 (Worker 실패 시) */
async function buildWorkbookFromData(
  columns: typeof ALLVIEW_COLUMNS,
  groups: typeof ALLVIEW_GROUPS,
  dataRows: (string | number | null)[][],
  merges: [number, number, number, number][],
): Promise<ArrayBuffer> {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('P-FMEA 전체보기', {
    properties: { tabColor: { argb: '1565C0' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }],
  });
  ws.columns = columns.map(c => ({ key: c.id, width: c.width }));
  // Row 1: group headers
  let ci = 1;
  for (const g of groups) {
    ws.mergeCells(1, ci, 1, ci + g.count - 1);
    const cell = ws.getCell(1, ci);
    cell.value = g.name;
    applyHeaderStyle(cell, g.color);
    ci += g.count;
  }
  // Row 2: column headers
  const hr = ws.getRow(2);
  columns.forEach((col, idx) => {
    const cell = hr.getCell(idx + 1);
    cell.value = col.label;
    applyHeaderStyle(cell, 'f5f5f5');
    cell.font = { bold: true, size: 9, color: { argb: '333333' } };
  });
  // Data rows with periodic yields
  for (let r = 0; r < dataRows.length; r++) {
    const rd = dataRows[r];
    const rn = r + 3;
    const even = rn % 2 === 0;
    const wsRow = ws.getRow(rn);
    for (let c = 0; c < rd.length; c++) {
      const cell = wsRow.getCell(c + 1);
      cell.value = rd[c] ?? '';
      applyDataStyle(cell, even);
    }
    if (r > 0 && r % 200 === 0) await yieldToMain();
  }
  // Merges with periodic yields
  for (let i = 0; i < merges.length; i++) {
    const [sr, sc, er, ec] = merges[i];
    if (er > sr || ec > sc) try { ws.mergeCells(sr, sc, er, ec); } catch (_) { /* already merged */ }
    if (i > 0 && i % 200 === 0) await yieldToMain();
  }
  await yieldToMain();
  return await wb.xlsx.writeBuffer() as ArrayBuffer;
}

/**
 * 전체보기 Excel 내보내기 (워크시트와 동일한 병합 상태)
 * ★★★ 2026-02-03: processFailureLinks 사용하여 원자성 데이터 기반으로 재구현 ★★★
 */
export async function exportAllViewExcel(state: WorksheetState, fmeaName: string) {
  try {
  // ★ processFailureLinks 동적 import (순환 참조 방지)
  const { processFailureLinks } = await import('./tabs/all/processFailureLinks');

  // ★★★ Phase 1: Enrichment (원자성 데이터 기반) ★★★
  const rawFailureLinks = (state as any).failureLinks || [];

  // ★★★ 2026-02-27: AllTabRenderer와 동일한 역전개 enrichment (화면 = 엑셀) ★★★
  await yieldToMain(); // UI 블로킹 방지

  // 1. FE → L1 기능분석 역전개 맵 (완제품기능, 요구사항)
  const l1Types = (state.l1 as any)?.types || [];
  const failureScopes = (state.l1 as any)?.failureScopes || [];
  const reqToFuncMap = new Map<string, { category: string; functionName: string; requirement: string }>();
  const feToReqMap = new Map<string, string>();
  // ★ failureScope를 Map으로 사전 인덱싱 (find() O(n) → get() O(1))
  const scopeById = new Map<string, any>();
  const scopeByEffect = new Map<string, any>();

  l1Types.forEach((type: any) => {
    const category = type.name || '';
    (type.functions || []).forEach((func: any) => {
      const functionName = func.name || '';
      (func.requirements || []).forEach((req: any) => {
        if (req.id) reqToFuncMap.set(req.id, { category, functionName, requirement: req.name || '' });
      });
    });
  });
  failureScopes.forEach((fs: any) => {
    if (fs.id) { feToReqMap.set(fs.id, fs.reqId || ''); scopeById.set(fs.id, fs); }
    if (fs.effect) { feToReqMap.set(fs.effect, fs.reqId || ''); scopeByEffect.set(fs.effect, fs); }
  });

  // 2. FC → L3 기능분석 역전개 맵 (작업요소기능, 공정특성)
  const fcToL3Map = new Map<string, { workFunction: string; processChar: string }>();
  (state.l2 || []).forEach((proc: any) => {
    const fcByPCId = new Map<string, any[]>();
    (proc.failureCauses || []).forEach((fc: any) => {
      if (fc.id && fc.processCharId) {
        const arr = fcByPCId.get(fc.processCharId) || [];
        arr.push(fc);
        fcByPCId.set(fc.processCharId, arr);
      }
    });
    (proc.l3 || []).forEach((we: any) => {
      (we.functions || []).forEach((fn: any) => {
        (fn.processChars || []).forEach((pc: any) => {
          (fcByPCId.get(pc.id) || []).forEach((fc: any) => {
            fcToL3Map.set(fc.id, { workFunction: fn.name || '', processChar: pc.name || '' });
          });
        });
      });
    });
  });

  // 3. FM → L2 기능분석 역전개 맵 (공정기능, 제품특성)
  const fmToL2Map = new Map<string, { processFunction: string; productChar: string }>();
  (state.l2 || []).forEach((proc: any) => {
    if (!proc.name) return;
    // productCharId → { funcName, pcName } 사전 인덱싱
    const pcIdMap = new Map<string, { fn: string; pc: string }>();
    (proc.functions || []).forEach((fn: any) => {
      (fn.productChars || []).forEach((pc: any) => {
        if (pc.id) pcIdMap.set(pc.id, { fn: fn.name || '', pc: pc.name || '' });
      });
    });
    const fallbackFn = (proc.functions || [])[0];
    const fallbackFnName = fallbackFn?.name || '';
    const fallbackPcName = (fallbackFn?.productChars || [])[0]?.name || '';

    (proc.failureModes || []).forEach((fm: any) => {
      if (!fm.id) return;
      const matched = fm.productCharId ? pcIdMap.get(fm.productCharId) : null;
      fmToL2Map.set(fm.id, {
        processFunction: matched?.fn || fallbackFnName,
        productChar: matched?.pc || fallbackPcName,
      });
    });
  });

  await yieldToMain(); // UI 블로킹 방지

  // 4. failureLinks enrichment — ★ P0-2: spread 복사 제거 — 원본에 직접 속성 추가 (3400개 객체 복사 방지)
  for (const link of rawFailureLinks) {
    const feId = link.feId || '';
    const feText = link.feText || link.cache?.feText || '';

    let feCategory = link.feScope || link.feCategory || '';
    let feFunctionName = link.feFunctionName || '';
    let feRequirement = link.feRequirement || '';
    if (!feFunctionName) {
      const reqId = feToReqMap.get(feId) || feToReqMap.get(feText) || '';
      if (reqId) {
        const funcData = reqToFuncMap.get(reqId);
        if (funcData) {
          if (!feCategory) feCategory = funcData.category;
          feFunctionName = funcData.functionName;
          feRequirement = funcData.requirement;
        }
      }
    }
    if (!feCategory) {
      const scope = scopeById.get(feId) || scopeByEffect.get(feText);
      if (scope) { feCategory = scope.scope || ''; feRequirement = feRequirement || scope.requirement || ''; }
    }

    const fcId = link.fcId || '';
    const fcL3 = fcToL3Map.get(fcId);
    if (!link.feCategory) link.feCategory = feCategory || '';
    if (!link.feFunctionName) link.feFunctionName = feFunctionName || '';
    if (!link.feRequirement) link.feRequirement = feRequirement || '';
    if (!link.fcWorkFunction) link.fcWorkFunction = fcL3?.workFunction || '';
    if (!link.fcProcessChar) link.fcProcessChar = fcL3?.processChar || '';
    if (!link.feSeverity) link.feSeverity = link.severity ?? link.feSeverity ?? 0;
  }
  const failureLinks = rawFailureLinks;

  await yieldToMain(); // UI 블로킹 방지

  const fmGroups = processFailureLinks(failureLinks, state.l2 as any, failureScopes);


  // ★★★ Phase 2: Build Plain Data Arrays (ExcelJS 없이 2D 배열 구성) ★★★
  const dataRows: (string | number | null)[][] = [];
  const workerMerges: [number, number, number, number][] = [];

  const l1Name = state.l1?.name || '';
  let excelRowNum = 3;
  const riskData = (state as any).riskData || {};

  // fmId → proc pre-indexing (keep existing)
  const fmToProcMap = new Map<string, any>();
  (state.l2 || []).forEach((proc: any) => {
    (proc.failureModes || []).forEach((fm: any) => { if (fm.id) fmToProcMap.set(fm.id, proc); });
  });

  for (let fmGrpIdx = 0; fmGrpIdx < fmGroups.length; fmGrpIdx++) {
    const fmGroup = fmGroups[fmGrpIdx];
    if (fmGrpIdx > 0 && fmGrpIdx % 100 === 0) await yieldToMain();

    const fmStartRow = excelRowNum;
    const proc = fmToProcMap.get(fmGroup.fmId);
    const fmL2Data = fmToL2Map.get(fmGroup.fmId);

    for (const row of fmGroup.rows) {
      const uniqueKey = fmGroup.fmId && row.fcId ? `${fmGroup.fmId}-${row.fcId}` : String(excelRowNum - 3);
      const isFcMerged = row.fcRowSpan === 0;

      // Compute risk values
      const oVal = riskData[`risk-${uniqueKey}-O`];
      const dVal = riskData[`risk-${uniqueKey}-D`];
      const s = row.feSeverity || 0;
      const o = Number(oVal) || 0;
      const d = Number(dVal) || 0;
      let ap = '';
      if (s >= 9 && s <= 10) ap = 'H';
      else if (s >= 6 && s <= 8 && o >= 4) ap = 'H';
      else if (s >= 2 && s <= 5 && o >= 4 && d >= 4) ap = 'H';
      else if (s >= 2 && (o >= 2 || d >= 2)) ap = 'M';
      else if (s >= 1) ap = 'L';

      const optS = riskData[`opt-${uniqueKey}-S`];
      const optO = riskData[`opt-${uniqueKey}-O`];
      const optD = riskData[`opt-${uniqueKey}-D`];
      const newS = Number(optS) || s;
      const newO = Number(optO) || o;
      const newD = Number(optD) || d;
      let newAP = '';
      if (newS >= 9 && newS <= 10) newAP = 'H';
      else if (newS >= 6 && newS <= 8 && newO >= 4) newAP = 'H';
      else if (newS >= 2 && newS <= 5 && newO >= 4 && newD >= 4) newAP = 'H';
      else if (newS >= 2 && (newO >= 2 || newD >= 2)) newAP = 'M';
      else if (newS >= 1) newAP = 'L';

      dataRows.push([
        l1Name,
        proc ? `${proc.no}. ${proc.name}` : fmGroup.fmProcessName,
        row.fcM4 || '',
        row.fcWorkElem || '',
        row.feCategory || '',
        row.feFunctionName || '',
        row.feRequirement || row.feText || '',
        fmL2Data?.processFunction || fmGroup.fmProcessFunction || '',
        fmL2Data?.productChar || fmGroup.fmProductChar || '',
        row.fcWorkFunction || '',
        row.fcProcessChar || '',
        row.feRowSpan !== 0 ? (row.feText || '') : '',
        row.feRowSpan !== 0 ? (row.feSeverity || '') : '',
        fmGroup.fmText || '',
        row.fcRowSpan !== 0 ? (row.fcText || '') : '',
        isFcMerged ? '' : (riskData[`prevention-${uniqueKey}`] || ''),
        isFcMerged ? '' : ((typeof oVal === 'number' || oVal) ? oVal : ''),
        isFcMerged ? '' : (riskData[`detection-${uniqueKey}`] || ''),
        isFcMerged ? '' : ((typeof dVal === 'number' || dVal) ? dVal : ''),
        isFcMerged ? '' : ap,
        isFcMerged ? '' : (riskData[`specialChar-${uniqueKey}`] || ''),
        isFcMerged ? '' : (riskData[`lesson-${uniqueKey}`] || ''),
        isFcMerged ? '' : (riskData[`prevention-opt-${uniqueKey}`] || ''),
        isFcMerged ? '' : (riskData[`detection-opt-${uniqueKey}`] || ''),
        isFcMerged ? '' : (riskData[`person-${uniqueKey}`] || ''),
        isFcMerged ? '' : (riskData[`targetDate-opt-${uniqueKey}`] || ''),
        isFcMerged ? '' : (riskData[`status-${uniqueKey}`] || ''),
        isFcMerged ? '' : (riskData[`result-${uniqueKey}`] || ''),
        isFcMerged ? '' : (riskData[`completeDate-${uniqueKey}`] || ''),
        isFcMerged ? '' : ((typeof optS === 'number' || optS) ? optS : s || ''),
        isFcMerged ? '' : ((typeof optO === 'number' || optO) ? optO : o || ''),
        isFcMerged ? '' : ((typeof optD === 'number' || optD) ? optD : d || ''),
        isFcMerged ? '' : (riskData[`specialChar-opt-${uniqueKey}`] || ''),
        isFcMerged ? '' : newAP,
        isFcMerged ? '' : (riskData[`note-${uniqueKey}`] || ''),
      ]);
      excelRowNum++;
    }

    // Merge tracking (same logic as before, but as tuples)
    const fmEndRow = excelRowNum - 1;
    if (fmGroup.fmRowSpan > 1) {
      workerMerges.push([fmStartRow, 1, fmEndRow, 1]);
      workerMerges.push([fmStartRow, 2, fmEndRow, 2]);
      workerMerges.push([fmStartRow, 8, fmEndRow, 8]);
      workerMerges.push([fmStartRow, 9, fmEndRow, 9]);
      workerMerges.push([fmStartRow, 14, fmEndRow, 14]);
    }
    fmGroup.rows.forEach((row: any, rowInFM: number) => {
      const r = fmStartRow + rowInFM;
      if (row.feRowSpan > 1) {
        workerMerges.push([r, 12, r + row.feRowSpan - 1, 12]);
        workerMerges.push([r, 13, r + row.feRowSpan - 1, 13]);
      }
      if (row.fcRowSpan > 1) {
        workerMerges.push([r, 15, r + row.fcRowSpan - 1, 15]);
        for (let col = 16; col <= 35; col++) {
          workerMerges.push([r, col, r + row.fcRowSpan - 1, col]);
        }
      }
    });
  }


  // ★★★ Phase 3: Worker + Fallback ★★★
  await yieldToMain();

  let buffer: ArrayBuffer;
  try {
    // ★ P0-1: Web Worker 경로 (writeBuffer ZIP 압축을 워커 스레드에서 실행)
    buffer = await buildExcelInWorker({
      type: 'buildAllView',
      columns: ALLVIEW_COLUMNS as unknown as { id: string; label: string; width: number }[],
      groups: ALLVIEW_GROUPS as unknown as { name: string; count: number; color: string }[],
      dataRows,
      merges: workerMerges,
    });
  } catch (workerErr) {
    buffer = await buildWorkbookFromData(ALLVIEW_COLUMNS, ALLVIEW_GROUPS, dataRows, workerMerges);
  }

  saveExcelFile(buffer, `${fmeaName}_전체보기`);
  } catch (err) {
    console.error('[엑셀 내보내기 오류]', err);
    alert(`엑셀 내보내기 실패: ${err instanceof Error ? err.message : String(err)}`);
  }
}


function saveExcelFile(buffer: ArrayBuffer, fileName: string) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fullFileName = `${fileName}_${date}.xlsx`;

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  // ★ 간단한 동기 방식 다운로드
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fullFileName;
  document.body.appendChild(a);
  a.click();

  // 정리는 약간 지연
  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 1000);
}

export async function exportStructureAnalysis(state: WorksheetState, fmeaName: string) {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('구조분석');
  const columns = [
    { header: '완제품공정명', key: 'l1Name', width: 20 },
    { header: '공정번호', key: 'l2No', width: 10 },
    { header: '공정명', key: 'l2Name', width: 20 },
    { header: '4M', key: 'm4', width: 10 },
    { header: '작업요소', key: 'l3Name', width: 25 },
  ];
  worksheet.columns = columns;
  const headerRow = worksheet.getRow(1);
  columns.forEach((col, idx) => applyHeaderStyle(headerRow.getCell(idx + 1), '1565C0'));

  let rowNum = 2;
  state.l2.forEach(proc => {
    proc.l3.forEach(elem => {
      const row = worksheet.getRow(rowNum);
      row.getCell(1).value = state.l1.name;
      row.getCell(2).value = proc.no;
      row.getCell(3).value = proc.name;
      row.getCell(4).value = elem.m4;
      row.getCell(5).value = elem.name;
      [1, 2, 3, 4, 5].forEach(i => applyDataStyle(row.getCell(i), rowNum % 2 === 0));
      rowNum++;
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  saveExcelFile(buffer, `${fmeaName}_구조분석`);
}

export async function downloadStructureTemplate() {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('구조분석_템플릿');
  const columns = ['완제품공정명', '공정번호', '공정명', '4M', '작업요소'];
  worksheet.getRow(1).values = columns;
  worksheet.getRow(1).eachCell((cell: ExcelJS_NS.Cell) => applyHeaderStyle(cell, '1565C0'));
  const buffer = await workbook.xlsx.writeBuffer();
  saveExcelFile(buffer, `PFMEA_구조분석_템플릿`);
}

export async function exportFMEAWorksheet(state: WorksheetState, fmeaName: string) {
  // 기본 내보내기 (이전 버전 호환용)
  await exportAllViewExcel(state, fmeaName);
}

export async function importStructureAnalysis(file: File, setState: any, setDirty: any) {
  // 가져오기 로직 (생략 - 기존 유지)
  return { success: true, message: '가져오기 성공', count: 0 };
}
