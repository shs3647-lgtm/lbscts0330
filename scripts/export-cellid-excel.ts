/**
 * export-cellid-excel.ts
 * FMEA DB 데이터를 CellId 기반 엑셀 파일로 내보내기
 * 
 * 포함 시트:
 *   1. CellId_참조표 — 시트별 cellId 생성 공식
 *   2. IL2_구조분석 — L2 구조(공정) + A4제품특성 + A5고장형태
 *   3. IL3_작업요소 — L3 구조(WE) + B2기능 + B3공정특성 + B4원인
 *   4. IL1_고장영향 — C1구분 + C4고장영향
 *   5. FC_교차표   — FailureLink 교차표 (FM-FC-FE)
 *   6. DB_Summary  — 엔티티별 건수 요약
 */

const ExcelJS = require('exceljs');

const API_BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-p018-i18';
const OUTPUT = 'D:\\00 fmea개발\\00_CELLuuid_FK_SYSTEM\\excel\\FMEA_CellId_Export.xlsx';

async function main() {
  console.log('=== FMEA CellId 기반 엑셀 내보내기 ===\n');

  // 1. DB 데이터 로드
  const res = await fetch(`${API_BASE}/api/fmea?fmeaId=${FMEA_ID}&format=atomic`);
  const data = await res.json();
  
  const l1 = data.l1Structures || [];
  const l2 = data.l2Structures || [];
  const l3 = data.l3Structures || [];
  const l1f = data.l1Functions || [];
  const l2f = data.l2Functions || [];
  const l3f = data.l3Functions || [];
  const fm = data.failureModes || [];
  const fc = data.failureCauses || [];
  const fe = data.failureEffects || [];
  const fl = data.failureLinks || [];
  const ra = data.riskAnalyses || [];

  console.log(`L1=${l1.length} L2=${l2.length} L3=${l3.length}`);
  console.log(`L1F=${l1f.length} L2F=${l2f.length} L3F=${l3f.length}`);
  console.log(`FM=${fm.length} FC=${fc.length} FE=${fe.length}`);
  console.log(`FL=${fl.length} RA=${ra.length}\n`);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'FMEA CellId Pipeline';
  wb.created = new Date();

  // ── 헤더 스타일 ──
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  const borderThin = {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' },
  };

  function styleHeader(ws, colCount) {
    const headerRow = ws.getRow(1);
    for (let c = 1; c <= colCount; c++) {
      const cell = headerRow.getCell(c);
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.border = borderThin;
    }
    headerRow.height = 22;
  }

  // ═══════════════════════════════════════════
  // Sheet 1: CellId 참조표
  // ═══════════════════════════════════════════
  {
    const ws = wb.addWorksheet('CellId_참조표', { properties: { tabColor: { argb: 'FF1F4E79' } } });
    ws.columns = [
      { header: '시트', key: 'sheet', width: 8 },
      { header: 'cellId 공식', key: 'formula', width: 50 },
      { header: 'parentCellId', key: 'parent', width: 20 },
      { header: 'Map 키', key: 'mapKey', width: 35 },
      { header: 'colIdx', key: 'col', width: 8 },
    ];
    const rows = [
      { sheet: 'A1', formula: 'A1_{procNo}_{row}_001_{seq}_ROOT', parent: 'ROOT', mapKey: 'procNo', col: 1 },
      { sheet: 'A2', formula: 'A2_{procNo}_{row}_002_{seq}_{a1CellId}', parent: 'A1 cellId', mapKey: '-', col: 2 },
      { sheet: 'A3', formula: 'A3_{procNo}_{row}_003_{seq}_{a1CellId}', parent: 'A1 cellId', mapKey: '-', col: 3 },
      { sheet: 'A4', formula: 'A4_{procNo}_{row}_004_{seq}_{a1CellId}', parent: 'A1 cellId', mapKey: '${procNo}::${charName}', col: 4 },
      { sheet: 'A5', formula: 'A5_{procNo}_{row}_005_{seq}_{a4CellId}', parent: 'A4 cellId', mapKey: '${procNo}::${fmText}', col: 5 },
      { sheet: 'A6', formula: 'A6_{procNo}_{row}_006_001_{a1CellId}', parent: 'A1 cellId', mapKey: 'procNo', col: 6 },
      { sheet: 'B1', formula: 'B1_{procNo}_{row}_001_{seq}_{a1CellId}', parent: 'A1 cellId', mapKey: '${procNo}::${weName}', col: 1 },
      { sheet: 'B2', formula: 'B2_{procNo}_{row}_004_{seq}_{b1CellId}', parent: 'B1 cellId', mapKey: '-', col: 4 },
      { sheet: 'B3', formula: 'B3_{procNo}_{row}_005_{seq}_{b1CellId}', parent: 'B1 cellId', mapKey: '-', col: 5 },
      { sheet: 'B4', formula: 'B4_{procNo}_{row}_006_{seq}_{b1CellId}', parent: 'B1 cellId', mapKey: '${procNo}::${causeText}', col: 6 },
      { sheet: 'B5', formula: 'B5_{procNo}_{row}_007_{seq}_{b1CellId}', parent: 'B1 cellId', mapKey: '${procNo}::${weName}::${pcMethod}', col: 7 },
      { sheet: 'C1', formula: 'C1_00_{row}_001_{seq}_ROOT', parent: 'ROOT', mapKey: 'feCategory', col: 1 },
      { sheet: 'C2', formula: 'C2_00_{row}_002_{seq}_{c1CellId}', parent: 'C1 cellId', mapKey: '-', col: 2 },
      { sheet: 'C3', formula: 'C3_00_{row}_003_{seq}_{c1CellId}', parent: 'C1 cellId', mapKey: '-', col: 3 },
      { sheet: 'C4', formula: 'C4_00_{row}_004_{seq}_{c1CellId}', parent: 'C1 cellId', mapKey: '${feCategory}::${effectText}', col: 4 },
      { sheet: 'FC', formula: 'FC_{procNo}_{row}_004_{seq}_{fmCellId}', parent: 'A5 cellId', mapKey: '-', col: 4 },
      { sheet: 'FA', formula: 'FA_{procNo}_{row}_001_{seq}_{fcCellId}', parent: 'FC cellId', mapKey: '-', col: 1 },
    ];
    rows.forEach(r => ws.addRow(r));
    styleHeader(ws, 5);
    console.log('Sheet 1: CellId_참조표 ✅');
  }

  // ═══════════════════════════════════════════
  // Sheet 2: IL2_구조분석 (L2 + A4 + A5)
  // ═══════════════════════════════════════════
  {
    const ws = wb.addWorksheet('IL2_구조분석', { properties: { tabColor: { argb: 'FF2E75B6' } } });
    ws.columns = [
      { header: '공정번호(A1)', key: 'procNo', width: 14 },
      { header: '공정명(A2)', key: 'procName', width: 25 },
      { header: 'L2 ID', key: 'l2Id', width: 40 },
      { header: '공정기능(A3)', key: 'l2Func', width: 30 },
      { header: '제품특성(A4)', key: 'productChar', width: 30 },
      { header: '고장형태(A5)', key: 'fmMode', width: 30 },
      { header: 'FM ID', key: 'fmId', width: 40 },
    ];

    for (const s of l2) {
      const funcs = l2f.filter(f => f.l2StructId === s.id);
      const modes = fm.filter(m => m.l2StructId === s.id);
      const maxRows = Math.max(1, funcs.length, modes.length);
      for (let i = 0; i < maxRows; i++) {
        ws.addRow({
          procNo: i === 0 ? (s.no || '') : '',
          procName: i === 0 ? (s.name || '') : '',
          l2Id: i === 0 ? s.id : '',
          l2Func: funcs[i]?.functionName || '',
          productChar: funcs[i]?.productChar || '',
          fmMode: modes[i]?.mode || '',
          fmId: modes[i]?.id || '',
        });
      }
    }
    styleHeader(ws, 7);
    console.log('Sheet 2: IL2_구조분석 ✅');
  }

  // ═══════════════════════════════════════════
  // Sheet 3: IL3_작업요소 (L3 + B2 + B3 + B4)
  // ═══════════════════════════════════════════
  {
    const ws = wb.addWorksheet('IL3_작업요소', { properties: { tabColor: { argb: 'FF548235' } } });
    ws.columns = [
      { header: '공정번호', key: 'procNo', width: 12 },
      { header: '4M구분', key: 'm4', width: 10 },
      { header: '작업요소(B1)', key: 'weName', width: 25 },
      { header: 'L3 ID', key: 'l3Id', width: 40 },
      { header: '요소기능(B2)', key: 'funcName', width: 30 },
      { header: '공정특성(B3)', key: 'processChar', width: 30 },
      { header: '고장원인(B4)', key: 'cause', width: 30 },
      { header: 'FC ID', key: 'fcId', width: 40 },
    ];

    // L3 → L2 매핑으로 공정번호 역추적
    const l2ById = new Map(l2.map(s => [s.id, s]));

    for (const s of l3) {
      const parentL2 = l2ById.get(s.l2Id);
      const funcs = l3f.filter(f => f.l3StructId === s.id);
      const causes = fc.filter(c => c.l3StructId === s.id);
      const maxRows = Math.max(1, funcs.length, causes.length);
      for (let i = 0; i < maxRows; i++) {
        ws.addRow({
          procNo: i === 0 ? (parentL2?.no || '') : '',
          m4: i === 0 ? (s.m4 || '') : '',
          weName: i === 0 ? (s.name || '') : '',
          l3Id: i === 0 ? s.id : '',
          funcName: funcs[i]?.functionName || '',
          processChar: funcs[i]?.processChar || '',
          cause: causes[i]?.cause || '',
          fcId: causes[i]?.id || '',
        });
      }
    }
    styleHeader(ws, 8);
    console.log('Sheet 3: IL3_작업요소 ✅');
  }

  // ═══════════════════════════════════════════
  // Sheet 4: IL1_고장영향 (C1 + C4)
  // ═══════════════════════════════════════════
  {
    const ws = wb.addWorksheet('IL1_고장영향', { properties: { tabColor: { argb: 'FFBF8F00' } } });
    ws.columns = [
      { header: '구분(C1)', key: 'category', width: 15 },
      { header: 'L1기능', key: 'l1Func', width: 30 },
      { header: 'FE ID', key: 'feId', width: 40 },
      { header: '고장영향(C4)', key: 'effect', width: 40 },
      { header: '심각도(S)', key: 'severity', width: 10 },
    ];

    for (const eff of fe) {
      const l1Func = l1f.find(f => f.id === eff.l1FuncId);
      ws.addRow({
        category: eff.category || '',
        l1Func: l1Func?.functionName || '',
        feId: eff.id,
        effect: eff.effect || '',
        severity: eff.severity || '',
      });
    }
    styleHeader(ws, 5);
    console.log('Sheet 4: IL1_고장영향 ✅');
  }

  // ═══════════════════════════════════════════
  // Sheet 5: FC_교차표 (FailureLink)
  // ═══════════════════════════════════════════
  {
    const ws = wb.addWorksheet('FC_교차표', { properties: { tabColor: { argb: 'FFC00000' } } });
    ws.columns = [
      { header: '#', key: 'no', width: 5 },
      { header: '공정번호', key: 'procNo', width: 10 },
      { header: 'FE구분(C1)', key: 'feCategory', width: 12 },
      { header: 'FE고장영향(C4)', key: 'feEffect', width: 30 },
      { header: 'FE ID', key: 'feId', width: 36 },
      { header: 'FM고장형태(A5)', key: 'fmMode', width: 30 },
      { header: 'FM ID', key: 'fmId', width: 36 },
      { header: 'FC고장원인(B4)', key: 'fcCause', width: 30 },
      { header: 'FC ID', key: 'fcId', width: 36 },
      { header: 'Link ID', key: 'linkId', width: 36 },
      { header: 'S', key: 'sev', width: 5 },
      { header: 'O', key: 'occ', width: 5 },
      { header: 'D', key: 'det', width: 5 },
      { header: 'AP', key: 'ap', width: 8 },
    ];

    const fmById = new Map(fm.map(m => [m.id, m]));
    const fcById = new Map(fc.map(c => [c.id, c]));
    const feById = new Map(fe.map(e => [e.id, e]));
    const raByLink = new Map(ra.map(r => [r.linkId, r]));

    fl.forEach((link, idx) => {
      const fmData = fmById.get(link.fmId);
      const fcData = fcById.get(link.fcId);
      const feData = feById.get(link.feId);
      const raData = raByLink.get(link.id);
      
      // 공정번호 추출
      const l2s = fmData ? l2.find(s => s.id === fmData.l2StructId) : null;

      ws.addRow({
        no: idx + 1,
        procNo: l2s?.no || '',
        feCategory: feData?.category || '',
        feEffect: feData?.effect || '',
        feId: link.feId,
        fmMode: fmData?.mode || '',
        fmId: link.fmId,
        fcCause: fcData?.cause || '',
        fcId: link.fcId,
        linkId: link.id,
        sev: raData?.severity || '',
        occ: raData?.occurrence || '',
        det: raData?.detection || '',
        ap: raData?.ap || '',
      });
    });
    styleHeader(ws, 14);
    console.log('Sheet 5: FC_교차표 ✅');
  }

  // ═══════════════════════════════════════════
  // Sheet 6: DB_Summary
  // ═══════════════════════════════════════════
  {
    const ws = wb.addWorksheet('DB_Summary', { properties: { tabColor: { argb: 'FF7030A0' } } });
    ws.columns = [
      { header: '엔티티', key: 'entity', width: 25 },
      { header: '시트코드', key: 'code', width: 10 },
      { header: '건수', key: 'count', width: 10 },
      { header: '비고', key: 'note', width: 40 },
    ];
    const items = [
      { entity: 'L1 Structure', code: '-', count: l1.length, note: '최상위 구조' },
      { entity: 'L2 Structure (공정)', code: 'A1/A2', count: l2.length, note: '' },
      { entity: 'L3 Structure (WE)', code: 'B1', count: l3.length, note: '' },
      { entity: 'L1 Function', code: 'C1/C2', count: l1f.length, note: '완제품기능' },
      { entity: 'L2 Function (공정기능)', code: 'A3', count: l2f.length, note: '' },
      { entity: 'L3 Function (요소기능)', code: 'B2/B3', count: l3f.length, note: `processChar빈=${l3f.filter(f => !f.processChar?.trim()).length}` },
      { entity: 'FailureMode (FM)', code: 'A5', count: fm.length, note: '' },
      { entity: 'FailureCause (FC)', code: 'B4', count: fc.length, note: '' },
      { entity: 'FailureEffect (FE)', code: 'C4', count: fe.length, note: '' },
      { entity: 'FailureLink (FL)', code: 'FC시트', count: fl.length, note: '교차표' },
      { entity: 'RiskAnalysis (RA)', code: 'FC시트', count: ra.length, note: 'S×O×D' },
      { entity: '', code: '', count: '', note: '' },
      { entity: '총 엔티티 합계', code: '', count: l1.length+l2.length+l3.length+l1f.length+l2f.length+l3f.length+fm.length+fc.length+fe.length+fl.length+ra.length, note: 'ALL ENTITIES' },
    ];
    items.forEach(r => ws.addRow(r));
    styleHeader(ws, 4);
    
    // 합계행 강조
    const totalRow = ws.getRow(items.length + 1);
    totalRow.font = { bold: true, size: 12 };
    
    console.log('Sheet 6: DB_Summary ✅');
  }

  // ── 저장 ──
  await wb.xlsx.writeFile(OUTPUT);
  console.log(`\n✅ 엑셀 저장 완료: ${OUTPUT}`);
}

main().catch(err => {
  console.error('오류:', err.message);
  process.exit(1);
});
