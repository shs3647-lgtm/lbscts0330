/**
 * m002 Atomic DB → 위치기반 JSON 추출
 * 4시트(L1/L2/L3/FC) 행 단위로 위치 UUID + FK를 미리 계산하여 저장.
 */
import * as fs from 'fs';

interface PosRow {
  excelRow: number;
  posId: string;
  cells: Record<string, string>;
  fk: Record<string, string>;
}

interface PosSheet { sheetName: string; headers: string[]; rows: PosRow[] }

interface PositionJson {
  sourceId: string;
  targetId: string;
  exportedAt: string;
  sheets: { L1: PosSheet; L2: PosSheet; L3: PosSheet; FC: PosSheet };
  stats: Record<string, number>;
}

function main() {
  const raw = fs.readFileSync('data/master-fmea/pfm26-m002.json', 'utf8');
  const d = JSON.parse(raw);
  const db = d.atomicDB;

  const l2Map = new Map<string, any>();
  for (const s of db.l2Structures) l2Map.set(s.id, s);

  const l3Map = new Map<string, any>();
  for (const s of db.l3Structures) l3Map.set(s.id, s);

  const l1fMap = new Map<string, any>();
  for (const f of db.l1Functions) l1fMap.set(f.id, f);

  const l2fMap = new Map<string, any>();
  for (const f of db.l2Functions) l2fMap.set(f.id, f);

  const l3fMap = new Map<string, any>();
  for (const f of db.l3Functions) l3fMap.set(f.id, f);

  const feMap = new Map<string, any>();
  for (const e of db.failureEffects) feMap.set(e.id, e);

  const fmMap = new Map<string, any>();
  for (const m of db.failureModes) fmMap.set(m.id, m);

  const fcMap = new Map<string, any>();
  for (const c of db.failureCauses) fcMap.set(c.id, c);

  const raByLink = new Map<string, any>();
  for (const r of db.riskAnalyses) raByLink.set(r.linkId || r.failureLinkId, r);

  // --- L1 시트 (C1~C4) ---
  const l1Rows: PosRow[] = [];
  const scopeOrder = ['YP', 'SP', 'USER'];

  function normScope(raw: string): string {
    const u = (raw || '').toUpperCase().trim();
    if (u.includes('YOUR')) return 'YP';
    if (u.includes('SHIP')) return 'SP';
    if (u.includes('USER') || u === 'US' || u.includes('END')) return 'USER';
    if (u === 'YP' || u === 'SP' || u === 'USER') return u;
    return raw || 'YP';
  }

  const l1FuncByScope = new Map<string, any[]>();
  for (const f of db.l1Functions) {
    const scope = normScope(f.category);
    if (!l1FuncByScope.has(scope)) l1FuncByScope.set(scope, []);
    l1FuncByScope.get(scope)!.push(f);
  }

  const feByL1Func = new Map<string, any[]>();
  for (const fe of db.failureEffects) {
    if (fe.l1FuncId) {
      if (!feByL1Func.has(fe.l1FuncId)) feByL1Func.set(fe.l1FuncId, []);
      feByL1Func.get(fe.l1FuncId)!.push(fe);
    }
  }

  let l1RowNum = 2;
  const feIdToL1Row = new Map<string, number>();
  const l1FuncIdToFirstRow = new Map<string, number>();

  for (const scope of scopeOrder) {
    const funcs = l1FuncByScope.get(scope) || [];
    for (const func of funcs) {
      const fes = feByL1Func.get(func.id) || [];
      if (!l1FuncIdToFirstRow.has(func.id)) {
        l1FuncIdToFirstRow.set(func.id, l1RowNum);
      }
      if (fes.length === 0) {
        l1Rows.push({
          excelRow: l1RowNum,
          posId: `L1-R${l1RowNum}`,
          cells: { C1: scope, C2: func.functionName || '', C3: func.requirement || '', C4: '' },
          fk: { origL1FuncId: func.id },
        });
        l1RowNum++;
        continue;
      }
      for (const fe of fes) {
        feIdToL1Row.set(fe.id, l1RowNum);
        l1Rows.push({
          excelRow: l1RowNum,
          posId: `L1-R${l1RowNum}`,
          cells: { C1: scope, C2: func.functionName || '', C3: func.requirement || '', C4: fe.effect || '' },
          fk: { origL1FuncId: func.id, origFeId: fe.id },
        });
        l1RowNum++;
      }
    }
  }

  // --- L2 시트 (A1~A6) : 공정당 FM 행 확장 ---
  const l2fByL2 = new Map<string, any>();
  for (const f of db.l2Functions) l2fByL2.set(f.l2StructId, f);

  const fmByL2 = new Map<string, any[]>();
  for (const fm of db.failureModes) {
    if (!fmByL2.has(fm.l2StructId)) fmByL2.set(fm.l2StructId, []);
    fmByL2.get(fm.l2StructId)!.push(fm);
  }

  const l2Rows: PosRow[] = [];
  let l2RowNum = 2;
  const fmIdToL2Row = new Map<string, number>();

  for (const l2 of db.l2Structures) {
    const l2f = l2fByL2.get(l2.id);
    const fms = fmByL2.get(l2.id) || [];
    if (fms.length === 0) {
      l2Rows.push({
        excelRow: l2RowNum,
        posId: `L2-R${l2RowNum}`,
        cells: {
          A1: l2.no || '',
          A2: l2.name || '',
          A3: l2f?.functionName || '',
          A4: l2f?.productChar || '',
          SC: '',
          A5: '',
          A6: '',
        },
        fk: { origL2Id: l2.id },
      });
      l2RowNum++;
      continue;
    }
    for (const fm of fms) {
      fmIdToL2Row.set(fm.id, l2RowNum);
      const pcL2f = l2fMap.get(fm.l2FuncId);
      l2Rows.push({
        excelRow: l2RowNum,
        posId: `L2-R${l2RowNum}`,
        cells: {
          A1: l2.no || '',
          A2: l2.name || '',
          A3: pcL2f?.functionName || l2f?.functionName || '',
          A4: pcL2f?.productChar || l2f?.productChar || '',
          SC: fm.specialChar ? 'Y' : '',
          A5: fm.mode || '',
          A6: '',
        },
        fk: { origL2Id: l2.id, origFmId: fm.id, origL2FuncId: fm.l2FuncId },
      });
      l2RowNum++;
    }
  }

  // --- L3 시트 (B1~B5): L2→L3→L3F→FC 확장 ---
  const l3sByL2 = new Map<string, any[]>();
  for (const l3 of db.l3Structures) {
    if (!l3sByL2.has(l3.l2Id)) l3sByL2.set(l3.l2Id, []);
    l3sByL2.get(l3.l2Id)!.push(l3);
  }

  const l3fByL3 = new Map<string, any[]>();
  for (const f of db.l3Functions) {
    if (!l3fByL3.has(f.l3StructId)) l3fByL3.set(f.l3StructId, []);
    l3fByL3.get(f.l3StructId)!.push(f);
  }

  const fcByL3f = new Map<string, any[]>();
  for (const fc of db.failureCauses) {
    if (!fcByL3f.has(fc.l3FuncId)) fcByL3f.set(fc.l3FuncId, []);
    fcByL3f.get(fc.l3FuncId)!.push(fc);
  }

  const l3Rows: PosRow[] = [];
  let l3RowNum = 2;
  const fcIdToL3Row = new Map<string, number>();

  for (const l2 of db.l2Structures) {
    const l3s = l3sByL2.get(l2.id) || [];
    for (const l3 of l3s) {
      const l3fs = l3fByL3.get(l3.id) || [];
      if (l3fs.length === 0) {
        l3Rows.push({
          excelRow: l3RowNum,
          posId: `L3-R${l3RowNum}`,
          cells: { processNo: l2.no, m4: l3.m4, B1: l3.name, B2: '', B3: '', SC: '', B4: '', B5: '' },
          fk: { origL3Id: l3.id },
        });
        l3RowNum++;
        continue;
      }
      for (const l3f of l3fs) {
        const fcs = fcByL3f.get(l3f.id) || [];
        if (fcs.length === 0) {
          l3Rows.push({
            excelRow: l3RowNum,
            posId: `L3-R${l3RowNum}`,
            cells: {
              processNo: l2.no, m4: l3.m4, B1: l3.name,
              B2: l3f.functionName || '', B3: l3f.processChar || '', SC: l3f.specialChar ? 'Y' : '',
              B4: '', B5: '',
            },
            fk: { origL3Id: l3.id, origL3FuncId: l3f.id },
          });
          l3RowNum++;
          continue;
        }
        for (const fc of fcs) {
          fcIdToL3Row.set(fc.id, l3RowNum);
          l3Rows.push({
            excelRow: l3RowNum,
            posId: `L3-R${l3RowNum}`,
            cells: {
              processNo: l2.no, m4: l3.m4, B1: l3.name,
              B2: l3f.functionName || '', B3: l3f.processChar || '', SC: l3f.specialChar ? 'Y' : '',
              B4: fc.cause || '', B5: '',
            },
            fk: { origL3Id: l3.id, origL3FuncId: l3f.id, origFcId: fc.id },
          });
          l3RowNum++;
        }
      }
    }
  }

  // --- FC 시트 (고장사슬 = FailureLink + RiskAnalysis) ---
  const fcSheetRows: PosRow[] = [];
  let fcRowNum = 2;
  const flDedup = new Set<string>();

  for (const fl of db.failureLinks) {
    if (fl.deletedAt) continue;
    const key = `${fl.fmId}|${fl.fcId}|${fl.feId}`;
    if (flDedup.has(key)) continue;
    flDedup.add(key);

    const fm = fmMap.get(fl.fmId);
    const fc = fcMap.get(fl.fcId);
    const fe = feMap.get(fl.feId);
    const ra = raByLink.get(fl.id);

    const feScope1 = fe ? normScope(fe.category || '') : '';
    const fmL2 = fm ? l2Map.get(fm.l2StructId) : null;
    const fcL3 = fc ? l3Map.get(fc.l3StructId) : null;

    const l1OrigRow = fe ? (feIdToL1Row.get(fe.id) || 0) : 0;
    const l2OrigRow = fm ? (fmIdToL2Row.get(fm.id) || 0) : 0;
    const l3OrigRow = fc ? (fcIdToL3Row.get(fc.id) || 0) : 0;

    fcSheetRows.push({
      excelRow: fcRowNum,
      posId: `FC-R${fcRowNum}`,
      cells: {
        FE_scope: feScope1,
        FE: fe?.effect || fl.feText || '',
        processNo: fmL2?.no || fl.fmProcess || '',
        FM: fm?.mode || fl.fmText || '',
        m4: fcL3?.m4 || fl.fcM4 || '',
        WE: fcL3?.name || fl.fcWorkElem || '',
        FC: fc?.cause || fl.fcText || '',
        PC: ra?.preventionControl || '',
        DC: ra?.detectionControl || '',
        S: String(ra?.severity || fe?.severity || fl.severity || 0),
        O: String(ra?.occurrence || 0),
        D: String(ra?.detection || 0),
        AP: ra?.ap || '',
        L1_origRow: String(l1OrigRow),
        L2_origRow: String(l2OrigRow),
        L3_origRow: String(l3OrigRow),
      },
      fk: {
        feId: l1OrigRow ? `L1-R${l1OrigRow}-C4` : 'UNRESOLVED',
        fmId: l2OrigRow ? `L2-R${l2OrigRow}-C6` : 'UNRESOLVED',
        fcId: l3OrigRow ? `L3-R${l3OrigRow}-C7` : 'UNRESOLVED',
        origFlId: fl.id,
        origFeId: fl.feId,
        origFmId: fl.fmId,
        origFcId: fl.fcId,
      },
    });
    fcRowNum++;
  }

  // --- L2 A6 보충: DC 가장 흔한 값
  const dcByProcess = new Map<string, string>();
  for (const row of fcSheetRows) {
    const pno = row.cells.processNo;
    if (pno && row.cells.DC && !dcByProcess.has(pno)) {
      dcByProcess.set(pno, row.cells.DC);
    }
  }
  for (const l2r of l2Rows) {
    if (!l2r.cells.A6) l2r.cells.A6 = dcByProcess.get(l2r.cells.A1) || '';
  }

  // --- L3 B5 보충: PC by processNo|m4|WE|FC
  const pcByKey = new Map<string, string>();
  for (const row of fcSheetRows) {
    const k = `${row.cells.processNo}|${row.cells.m4}|${row.cells.WE}|${row.cells.FC}`;
    if (row.cells.PC && !pcByKey.has(k)) pcByKey.set(k, row.cells.PC);
  }
  for (const l3r of l3Rows) {
    if (!l3r.cells.B5) {
      const k = `${l3r.cells.processNo}|${l3r.cells.m4}|${l3r.cells.B1}|${l3r.cells.B4}`;
      l3r.cells.B5 = pcByKey.get(k) || '';
    }
  }

  const result: PositionJson = {
    sourceId: 'pfm26-m002',
    targetId: 'pfm26-m102',
    exportedAt: new Date().toISOString(),
    sheets: {
      L1: { sheetName: 'L1 통합(C1-C4)', headers: ['C1.구분', 'C2.제품기능', 'C3.요구사항', 'C4.고장영향'], rows: l1Rows },
      L2: { sheetName: 'L2 통합(A1-A6)', headers: ['A1.공정번호', 'A2.공정명', 'A3.공정기능', 'A4.제품특성', '특별특성', 'A5.고장형태', 'A6.검출관리'], rows: l2Rows },
      L3: { sheetName: 'L3 통합(B1-B5)', headers: ['공정번호', '4M', 'B1.작업요소', 'B2.요소기능', 'B3.공정특성', '특별특성', 'B4.고장원인', 'B5.예방관리'], rows: l3Rows },
      FC: { sheetName: 'FC 고장사슬', headers: ['FE구분', 'FE(고장영향)', '공정번호', 'FM(고장형태)', '4M', '작업요소', 'FC(고장원인)', 'PC(예방관리)', 'DC(검출관리)', 'S', 'O', 'D', 'AP', 'L1원본행', 'L2원본행', 'L3원본행'], rows: fcSheetRows },
    },
    stats: {
      l1Rows: l1Rows.length,
      l2Rows: l2Rows.length,
      l3Rows: l3Rows.length,
      fcRows: fcSheetRows.length,
      unresolvedFE: fcSheetRows.filter(r => r.fk.feId === 'UNRESOLVED').length,
      unresolvedFM: fcSheetRows.filter(r => r.fk.fmId === 'UNRESOLVED').length,
      unresolvedFC: fcSheetRows.filter(r => r.fk.fcId === 'UNRESOLVED').length,
    },
  };

  const outPath = 'data/master-fmea/m102-position-based.json';
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`→ ${outPath}`);
  console.log('Stats:', JSON.stringify(result.stats));
}

main();
