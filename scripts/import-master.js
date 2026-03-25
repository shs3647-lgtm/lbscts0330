/**
 * Master FMEA Import - ExcelJS 직접 파싱 → save-position-import API
 * 
 * position-parser.ts의 parsePositionBasedWorkbook() 사용
 */
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const FMEA_ID = 'pfm26-m001';
const EXCEL_PATH = 'D:\\00 fmea개발\\00_CELLuuid_FK_SYSTEM\\excel\\PFMEA_pfm26-p018-i18_샘플Down_최신본.xlsx';

async function main() {
  console.log('=== Master FMEA Import (ExcelJS) ===');
  console.log('fmeaId:', FMEA_ID);
  console.log('Excel:', EXCEL_PATH);

  if (!fs.existsSync(EXCEL_PATH)) {
    console.error('Excel file not found!');
    return;
  }

  // 1. Read Excel with ExcelJS
  console.log('\n1. ExcelJS로 엑셀 읽기...');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  console.log('  시트:', wb.worksheets.map(ws => ws.name).join(', '));

  // 2. Build PositionBasedJSON manually
  console.log('\n2. PositionBasedJSON 생성...');
  
  // Find sheet names
  const sheetNames = wb.worksheets.map(ws => ws.name);
  const findSheet = (prefix) => sheetNames.find(n => n.toUpperCase().startsWith(prefix.toUpperCase()));
  
  const l1Name = findSheet('L1');
  const l2Name = findSheet('L2');
  const l3Name = findSheet('L3');
  const fcName = findSheet('FC') || findSheet('FL');
  
  console.log('  L1:', l1Name);
  console.log('  L2:', l2Name);
  console.log('  L3:', l3Name);
  console.log('  FC:', fcName);

  if (!l1Name || !l2Name || !l3Name || !fcName) {
    console.error('Missing required sheets!');
    return;
  }

  function sheetToRows(ws) {
    const rows = [];
    ws.eachRow((row, rn) => {
      if (rn <= 1) return; // skip header
      const cells = {};
      row.eachCell((cell, colNumber) => {
        let val = '';
        if (cell.value != null) {
          if (typeof cell.value === 'object' && cell.value.richText) {
            val = cell.value.richText.map(r => r.text || '').join('').trim();
          } else {
            val = String(cell.value).trim();
          }
        }
        cells['col' + colNumber] = val;
      });
      rows.push({ excelRow: rn, posId: `R${rn}`, cells });
    });
    return rows;
  }

  // Build L1 sheet data
  const l1WS = wb.getWorksheet(l1Name);
  const l1Rows = [];
  l1WS.eachRow((row, rn) => {
    if (rn <= 1) return;
    l1Rows.push({
      excelRow: rn, posId: `L1-R${rn}`,
      cells: {
        C1: getCellStr(row, 1),
        C2: getCellStr(row, 2),
        C3: getCellStr(row, 3),
        C4: getCellStr(row, 4),
      }
    });
  });

  // Build L2 sheet data
  const l2WS = wb.getWorksheet(l2Name);
  const l2Rows = [];
  l2WS.eachRow((row, rn) => {
    if (rn <= 1) return;
    l2Rows.push({
      excelRow: rn, posId: `L2-R${rn}`,
      cells: {
        processNo: getCellStr(row, 1),
        processName: getCellStr(row, 2),
        A3: getCellStr(row, 3),
        A4: getCellStr(row, 4),
        A5: getCellStr(row, 5),
        SC: getCellStr(row, 6),
        A6: getCellStr(row, 7),
      }
    });
  });

  // Build L3 sheet data
  const l3WS = wb.getWorksheet(l3Name);
  const l3Rows = [];
  l3WS.eachRow((row, rn) => {
    if (rn <= 1) return;
    l3Rows.push({
      excelRow: rn, posId: `L3-R${rn}`,
      cells: {
        processNo: getCellStr(row, 1),
        m4: getCellStr(row, 2),
        B1: getCellStr(row, 3),
        B2: getCellStr(row, 4),
        B3: getCellStr(row, 5),
        SC: getCellStr(row, 6),
        B4: getCellStr(row, 7),
        B5: getCellStr(row, 8),
      }
    });
  });

  // Build FC sheet data
  const fcWS = wb.getWorksheet(fcName);
  const fcRows = [];
  let prevFEscope='', prevFE='', prevPno='', prevFM='';
  fcWS.eachRow((row, rn) => {
    if (rn <= 1) return;
    let feScope = getCellStr(row, 1) || prevFEscope;
    let fe = getCellStr(row, 2) || prevFE;
    let pno = getCellStr(row, 3) || prevPno;
    let fm = getCellStr(row, 4) || prevFM;
    if (feScope) prevFEscope = feScope;
    if (fe) prevFE = fe;
    if (pno) prevPno = pno;
    if (fm) prevFM = fm;
    
    fcRows.push({
      excelRow: rn, posId: `FC-R${rn}`,
      cells: {
        FE_scope: feScope,
        FE: fe,
        processNo: pno,
        FM: fm,
        m4: getCellStr(row, 5),
        WE: getCellStr(row, 6),
        FC: getCellStr(row, 7),
        PC: getCellStr(row, 8),
        DC: getCellStr(row, 9),
        S: getCellStr(row, 10),
        O: getCellStr(row, 11),
        D: getCellStr(row, 12),
      }
    });
  });

  // Filter empty FC rows (FC column empty)
  const validFcRows = fcRows.filter(r => r.cells.FC && r.cells.FC.trim());

  console.log('  L1 rows:', l1Rows.length);
  console.log('  L2 rows:', l2Rows.length);
  console.log('  L3 rows:', l3Rows.length);
  console.log('  FC rows:', validFcRows.length, '(total:', fcRows.length, ')');

  const json = {
    targetId: FMEA_ID,
    sheets: {
      L1: { sheetName: l1Name, headers: [], rows: l1Rows },
      L2: { sheetName: l2Name, headers: [], rows: l2Rows },
      L3: { sheetName: l3Name, headers: [], rows: l3Rows },
      FC: { sheetName: fcName, headers: [], rows: validFcRows },
    }
  };

  // 3. Call import-to-raw with save=true
  console.log('\n3. import-to-raw API 호출...');
  const res = await fetch('http://localhost:3000/api/fmea/import-to-raw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId: FMEA_ID, json, save: true, force: true }),
  });
  const result = await res.json();

  console.log('\n4. 결과:');
  console.log('  success:', result.success);
  if (result.error) console.log('  error:', result.error);
  if (result.stats) console.log('  stats:', JSON.stringify(result.stats, null, 2));
  if (result.quality) console.log('  quality:', result.quality.status);
  if (result.counts) console.log('  DB counts:', JSON.stringify(result.counts, null, 2));
  if (result.saved) console.log('  ✅ DB 저장 완료');
}

function getCellStr(row, col) {
  const cell = row.getCell(col);
  if (!cell || cell.value == null) return '';
  const v = cell.value;
  if (typeof v === 'object' && v !== null && v.richText) {
    return v.richText.map(r => r.text || '').join('').trim();
  }
  if (typeof v === 'object' && v !== null && v.error) return '';
  return String(v).trim();
}

main().catch(e => console.error('ERROR:', e.message, e.stack));
