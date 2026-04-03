/**
 * @file generate-roundtrip-excel/route.ts
 * @description Atomic DB → 완벽한 14시트 Import Excel 생성 API
 *
 * GET /api/fmea/generate-roundtrip-excel?fmeaId=xxx
 * → Excel 파일 다운로드 (application/octet-stream)
 *
 * POST /api/fmea/generate-roundtrip-excel
 * body: { fmeaId }
 * → { success, flatDataCount, chainsCount } + Excel 파일 저장
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import ExcelJS from 'exceljs';
import { SHEET_COLUMNS, SHEET_DISPLAY_NAMES, SHEET_ORDER, applyHeaderStyle, applyDataStyle, applyDataLeftStyle, applySpecialCharStyle, BORDERS } from '@/app/(fmea-core)/pfmea/import/utils/excel-styles';

export const runtime = 'nodejs';

interface FlatItem {
  processNo: string;
  category: string;
  itemCode: string;
  value: string;
  m4?: string;
  specialChar?: string;
  parentItemId?: string;
}

async function loadAtomicDB(prisma: any, fmeaId: string) {
  const [
    l1Structure, l2Structures, l3Structures,
    l1Functions, l2Functions, l3Functions,
    failureEffects, failureModes, failureCauses,
    failureLinks, riskAnalyses,
  ] = await Promise.all([
    prisma.l1Structure.findFirst({ where: { fmeaId } }),
    prisma.l2Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } }),
    prisma.l3Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } }),
    prisma.l1Function.findMany({ where: { fmeaId } }),
    prisma.l2Function.findMany({ where: { fmeaId } }),
    prisma.l3Function.findMany({ where: { fmeaId } }),
    prisma.failureEffect.findMany({ where: { fmeaId } }),
    prisma.failureMode.findMany({ where: { fmeaId } }),
    prisma.failureCause.findMany({ where: { fmeaId } }),
    prisma.failureLink.findMany({ where: { fmeaId } }),
    prisma.riskAnalysis.findMany({ where: { fmeaId } }),
  ]);

  return {
    fmeaId, savedAt: new Date().toISOString(),
    l1Structure, l2Structures, l3Structures,
    l1Functions, l2Functions, l3Functions,
    failureEffects, failureModes, failureCauses,
    failureLinks, failureAnalyses: [], riskAnalyses, optimizations: [],
    confirmed: {},
  };
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const arr = map.get(key);
    if (arr) arr.push(item);
    else map.set(key, [item]);
  }
  return map;
}

async function generateExcel(db: any): Promise<{ buffer: Buffer; flatItems: FlatItem[] }> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FMEA Pipeline Verify';
  wb.created = new Date();

  const l2ById = new Map(db.l2Structures.map((l: any) => [l.id, l]));
  const l3ById = new Map(db.l3Structures.map((l: any) => [l.id, l]));
  const l2FuncsByL2 = groupBy(db.l2Functions, (f: any) => f.l2StructId);
  const l3FuncsByL3 = groupBy(db.l3Functions, (f: any) => f.l3StructId);
  const fmsByL2 = groupBy(db.failureModes, (fm: any) => fm.l2StructId);
  const fcsByL3 = groupBy(db.failureCauses, (fc: any) => fc.l3StructId);
  const riskByLink: Map<string, any> = new Map(db.riskAnalyses.map((r: any) => [r.linkId, r]));
  const l1FuncsByCategory = groupBy(db.l1Functions, (f: any) => f.category);

  const sortedL2 = [...db.l2Structures].sort((a: any, b: any) => a.order - b.order);
  const allFlat: FlatItem[] = [];

  // ─── 시트별 데이터 수집 ───

  // A12: 공정번호+공정명
  const a12Rows: any[] = [];
  for (const l2 of sortedL2) {
    a12Rows.push({ processNo: l2.no, processName: l2.name });
    allFlat.push({ processNo: l2.no, category: 'A', itemCode: 'A1', value: l2.no });
    allFlat.push({ processNo: l2.no, category: 'A', itemCode: 'A2', value: l2.name });
  }

  // A3: 공정기능
  const a3Rows: any[] = [];
  for (const l2 of sortedL2) {
    const funcs = l2FuncsByL2.get(l2.id) || [];
    const seen = new Set<string>();
    for (const f of funcs) {
      if (seen.has(f.functionName)) continue;
      seen.add(f.functionName);
      a3Rows.push({ processNo: l2.no, processName: l2.name, processFunction: f.functionName });
      allFlat.push({ processNo: l2.no, category: 'A', itemCode: 'A3', value: f.functionName });
    }
    if (funcs.length === 0) a3Rows.push({ processNo: l2.no, processName: l2.name, processFunction: '' });
  }

  // A4: 제품특성
  const a4Rows: any[] = [];
  for (const l2 of sortedL2) {
    const funcs = l2FuncsByL2.get(l2.id) || [];
    const seen = new Set<string>();
    const mainFunc = funcs[0]?.functionName || '';
    for (const f of funcs) {
      if (!f.productChar || seen.has(f.productChar)) continue;
      seen.add(f.productChar);
      a4Rows.push({ processNo: l2.no, processName: l2.name, mainFunction: mainFunc, productChar: f.productChar, specialChar: f.specialChar || '' });
      allFlat.push({ processNo: l2.no, category: 'A', itemCode: 'A4', value: f.productChar, specialChar: f.specialChar });
    }
    if (seen.size === 0) a4Rows.push({ processNo: l2.no, processName: l2.name, mainFunction: mainFunc, productChar: '', specialChar: '' });
  }

  // A5: 고장형태
  const a5Rows: any[] = [];
  for (const l2 of sortedL2) {
    const fms = fmsByL2.get(l2.id) || [];
    const funcs = l2FuncsByL2.get(l2.id) || [];
    const mainFunc = funcs[0]?.functionName || '';
    const mainPC = funcs.find((f: any) => f.productChar)?.productChar || '';
    const mainSC = funcs.find((f: any) => f.specialChar)?.specialChar || '';
    for (const fm of fms) {
      a5Rows.push({ processNo: l2.no, processName: l2.name, mainFunction: mainFunc, productChar: mainPC, specialChar: mainSC, failureMode: fm.mode });
      allFlat.push({ processNo: l2.no, category: 'A', itemCode: 'A5', value: fm.mode });
    }
    if (fms.length === 0) a5Rows.push({ processNo: l2.no, processName: l2.name, mainFunction: mainFunc, productChar: mainPC, specialChar: mainSC, failureMode: '' });
  }

  // A6: 검출관리
  const a6Rows: any[] = [];
  for (const l2 of sortedL2) {
    const fms = fmsByL2.get(l2.id) || [];
    const fmIds = new Set(fms.map((fm: any) => fm.id));
    const linkIds = db.failureLinks.filter((lk: any) => fmIds.has(lk.fmId)).map((lk: any) => lk.id);
    const dcSet = new Set<string>();
    for (const lid of linkIds) {
      const risk = riskByLink.get(lid);
      if (risk?.detectionControl?.trim()) dcSet.add(risk.detectionControl.trim());
    }
    const funcs = l2FuncsByL2.get(l2.id) || [];
    const mainPC = funcs.find((f: any) => f.productChar)?.productChar || '';
    const mainFM = fms[0]?.mode || '';
    if (dcSet.size > 0) {
      for (const dc of dcSet) {
        a6Rows.push({ processNo: l2.no, processName: l2.name, productChar: mainPC, failureMode: mainFM, detection: dc });
        allFlat.push({ processNo: l2.no, category: 'A', itemCode: 'A6', value: dc });
      }
    } else {
      a6Rows.push({ processNo: l2.no, processName: l2.name, productChar: mainPC, failureMode: mainFM, detection: '' });
    }
  }

  // B1~B5
  const b1Rows: any[] = [], b2Rows: any[] = [], b3Rows: any[] = [], b4Rows: any[] = [], b5Rows: any[] = [];
  for (const l2 of sortedL2) {
    const l3s = db.l3Structures.filter((l: any) => l.l2Id === l2.id).sort((a: any, b: any) => a.order - b.order);
    for (const l3 of l3s) {
      const m4 = l3.m4 || '';
      b1Rows.push({ processNo: l2.no, processName: l2.name, m4, workElement: l3.name });
      allFlat.push({ processNo: l2.no, category: 'B', itemCode: 'B1', value: l3.name, m4 });

      const l3Funcs = l3FuncsByL3.get(l3.id) || [];
      const seenFunc = new Set<string>();
      for (const fn of l3Funcs) {
        if (!fn.functionName || seenFunc.has(fn.functionName)) continue;
        seenFunc.add(fn.functionName);
        b2Rows.push({ processNo: l2.no, processName: l2.name, m4, workElement: l3.name, elementFunction: fn.functionName });
        allFlat.push({ processNo: l2.no, category: 'B', itemCode: 'B2', value: fn.functionName, m4 });
      }
      if (seenFunc.size === 0) b2Rows.push({ processNo: l2.no, processName: l2.name, m4, workElement: l3.name, elementFunction: '' });

      const seenPC = new Set<string>();
      for (const fn of l3Funcs) {
        if (!fn.processChar || seenPC.has(fn.processChar)) continue;
        seenPC.add(fn.processChar);
        const elemFunc = fn.functionName || '';
        b3Rows.push({ processNo: l2.no, processName: l2.name, m4, workElement: l3.name, elementFunction: elemFunc, processChar: fn.processChar, specialChar: fn.specialChar || '' });
        allFlat.push({ processNo: l2.no, category: 'B', itemCode: 'B3', value: fn.processChar, m4, specialChar: fn.specialChar });
      }
      if (seenPC.size === 0) b3Rows.push({ processNo: l2.no, processName: l2.name, m4, workElement: l3.name, elementFunction: '', processChar: '', specialChar: '' });

      const fcs = fcsByL3.get(l3.id) || [];
      const firstPC = l3Funcs.find((f: any) => f.processChar)?.processChar || '';
      const firstSC = l3Funcs.find((f: any) => f.specialChar)?.specialChar || '';
      for (const fc of fcs) {
        b4Rows.push({ processNo: l2.no, processName: l2.name, m4, workElement: l3.name, processChar: firstPC, specialChar: firstSC, failureCause: fc.cause });
        allFlat.push({ processNo: l2.no, category: 'B', itemCode: 'B4', value: fc.cause, m4 });
      }
      if (fcs.length === 0) b4Rows.push({ processNo: l2.no, processName: l2.name, m4, workElement: l3.name, processChar: firstPC, specialChar: firstSC, failureCause: '' });

      // B5: 예방관리
      const fcIds = new Set(fcs.map((fc: any) => fc.id));
      const pcSet = new Set<string>();
      for (const lk of db.failureLinks) {
        if (fcIds.has(lk.fcId)) {
          const risk = riskByLink.get(lk.id);
          if (risk?.preventionControl?.trim()) pcSet.add(risk.preventionControl.trim());
        }
      }
      if (pcSet.size > 0) {
        for (const pv of pcSet) {
          b5Rows.push({ processNo: l2.no, processName: l2.name, m4, processChar: firstPC, failureCause: fcs[0]?.cause || '', prevention: pv });
          allFlat.push({ processNo: l2.no, category: 'B', itemCode: 'B5', value: pv, m4 });
        }
      } else {
        b5Rows.push({ processNo: l2.no, processName: l2.name, m4, processChar: firstPC, failureCause: fcs[0]?.cause || '', prevention: '' });
      }
    }
  }

  // C1~C4
  const c1Rows: any[] = [], c2Rows: any[] = [], c3Rows: any[] = [], c4Rows: any[] = [];
  const l1Name = db.l1Structure?.name || '';
  for (const [category, funcs] of l1FuncsByCategory) {
    c1Rows.push({ category });
    allFlat.push({ processNo: category, category: 'C', itemCode: 'C1', value: category });

    const funcsByName = groupBy(funcs, (f: any) => f.functionName);
    for (const [funcName, reqs] of funcsByName) {
      c2Rows.push({ category, productFunction: funcName });
      allFlat.push({ processNo: category, category: 'C', itemCode: 'C2', value: funcName });

      for (const req of reqs) {
        c3Rows.push({ partName: l1Name, category, productFunction: funcName, requirement: req.requirement });
        allFlat.push({ processNo: category, category: 'C', itemCode: 'C3', value: req.requirement });
      }
    }
  }

  // FE → C4
  const fesByCategory = groupBy(db.failureEffects, (fe: any) => fe.category);
  for (const [category, fes] of fesByCategory) {
    const catFuncs = l1FuncsByCategory.get(category) || [];
    const funcsByName = groupBy(catFuncs, (f: any) => f.functionName);
    const firstFuncName = [...funcsByName.keys()][0] || '';
    const firstReq = catFuncs[0]?.requirement || '';

    for (const fe of fes) {
      c4Rows.push({ category, productFunction: firstFuncName, requirement: firstReq, failureEffect: fe.effect, severity: fe.severity ?? '' });
      allFlat.push({ processNo: category, category: 'C', itemCode: 'C4', value: fe.effect });
    }
  }

  // ─── Excel 생성 ───
  const sheetData: Record<string, any[]> = {
    'A12': a12Rows, 'A3': a3Rows, 'A4': a4Rows, 'A5': a5Rows, 'A6': a6Rows,
    'B1': b1Rows, 'B2': b2Rows, 'B3': b3Rows, 'B4': b4Rows, 'B5': b5Rows,
    'C1': c1Rows, 'C2': c2Rows, 'C3': c3Rows, 'C4': c4Rows,
  };

  for (const code of SHEET_ORDER) {
    const displayName = SHEET_DISPLAY_NAMES[code] || code;
    const columns = SHEET_COLUMNS[code] || [];
    const rows = sheetData[code] || [];
    const ws = wb.addWorksheet(displayName);

    // 헤더
    const headerRow = ws.addRow(columns.map(c => c.header));
    headerRow.eachCell((cell, colNum) => {
      applyHeaderStyle(cell);
      ws.getColumn(colNum).width = columns[colNum - 1]?.width || 15;
    });

    // 데이터
    for (const row of rows) {
      const r = ws.addRow(columns.map(c => {
        const val = row[c.key];
        return val !== undefined && val !== null ? String(val) : '';
      }));
      r.eachCell((cell, colNum) => {
        const colDef = columns[colNum - 1];
        if (colDef?.special) applySpecialCharStyle(cell);
        else if (colDef?.align === 'left') applyDataLeftStyle(cell);
        else applyDataStyle(cell);
      });
    }
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return { buffer: Buffer.from(arrayBuffer), flatItems: allFlat };
}

export async function GET(request: NextRequest) {
  try {
    const fmeaId = request.nextUrl.searchParams.get('fmeaId');
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'fmeaId 필요' }, { status: 400 });
    }

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) return NextResponse.json({ success: false, error: 'DB 미설정' }, { status: 500 });

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) return NextResponse.json({ success: false, error: 'Prisma 실패' }, { status: 500 });

    const db = await loadAtomicDB(prisma, fmeaId);
    const { buffer, flatItems } = await generateExcel(db);

    console.warn(`[generate-excel] ${fmeaId}: ${flatItems.length}건 flatData → Excel 생성 완료`);

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="roundtrip-${fmeaId}.xlsx"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}
