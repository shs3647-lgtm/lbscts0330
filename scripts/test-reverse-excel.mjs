import ExcelJS from 'exceljs';
import fs from 'fs';

async function main() {
  const res = await fetch('http://localhost:3000/api/fmea/reverse-import/excel?fmeaId=pfm26-m066');
  const buf = await res.arrayBuffer();
  fs.writeFileSync('c:/autom-fmea/test-reverse-import.xlsx', Buffer.from(buf));
  
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('c:/autom-fmea/test-reverse-import.xlsx');
  
  console.log('=== Reverse Import Excel ===');
  wb.worksheets.forEach(ws => {
    console.log(`  ${ws.name}: ${ws.rowCount} rows`);
  });
  
  const fcSheet = wb.getWorksheet('FC 고장사슬');
  if (fcSheet) {
    console.log('\nFC 시트 데이터 행수:', fcSheet.rowCount - 1);
    if (fcSheet.rowCount > 1) {
      const h = fcSheet.getRow(1).values;
      console.log('헤더:', JSON.stringify(h));
      console.log('row2:', JSON.stringify(fcSheet.getRow(2).values).substring(0, 250));
    }
  } else {
    console.log('FC 시트 없음!');
  }
  
  // Now also generate client-side template Excel
  console.log('\n=== Client-side Template 시뮬레이션 ===');
  const masterRes = await fetch('http://localhost:3000/api/pfmea/master?fmeaId=pfm26-m066&includeItems=true');
  const masterData = await masterRes.json();
  const ds = masterData.dataset;
  console.log('flatItems:', ds?.flatItems?.length);
  console.log('failureChains:', ds?.failureChains?.length);
  
  if (ds?.failureChains?.length > 0) {
    const chains = ds.failureChains.map(ch => ({
      processNo: ch.processNo || '',
      m4: ch.m4 || undefined,
      fcValue: ch.fcValue || '',
      fmValue: ch.fmValue || '',
      feValue: ch.feValue || '',
      feScope: ch.feScope || undefined,
      workElement: ch.workElement || undefined,
      pcValue: ch.pcValue || undefined,
      dcValue: ch.dcValue || undefined,
      severity: ch.severity || undefined,
      occurrence: ch.occurrence || undefined,
      detection: ch.detection || undefined,
    }));
    
    // Build FC rows exactly like downloadDataTemplate line 464-477
    const sortedChains = [...chains].sort((a, b) => {
      const pCmp = (a.processNo || '').localeCompare(b.processNo || '', undefined, { numeric: true });
      if (pCmp !== 0) return pCmp;
      const fmCmp = (a.fmValue || '').localeCompare(b.fmValue || '');
      if (fmCmp !== 0) return fmCmp;
      return (a.feScope || '').localeCompare(b.feScope || '');
    });
    
    const fcRows = sortedChains.map(fc => [
      fc.feScope || '',
      fc.feValue || '',
      fc.processNo,
      fc.fmValue,
      fc.m4 || '',
      fc.workElement || '',
      fc.fcValue,
      fc.pcValue || '',
      fc.dcValue || '',
      fc.occurrence ? String(fc.occurrence) : '',
      fc.detection ? String(fc.detection) : '',
      fc.ap || '',
    ]);
    
    const wb2 = new ExcelJS.Workbook();
    const headers = ['FE구분', 'FE(고장영향)', 'L2-1.공정번호', 'FM(고장형태)', '4M', '작업요소(WE)', 'FC(고장원인)', 'B5.예방관리', 'A6.검출관리', 'O', 'D', 'AP'];
    const ws2 = wb2.addWorksheet('FC 고장사슬');
    ws2.columns = headers.map((h, i) => ({ header: h, key: `col${i}`, width: 20 }));
    
    fcRows.forEach(row => ws2.addRow(row));
    
    await wb2.xlsx.writeFile('c:/autom-fmea/test-client-template-fc.xlsx');
    
    // Verify
    const wb3 = new ExcelJS.Workbook();
    await wb3.xlsx.readFile('c:/autom-fmea/test-client-template-fc.xlsx');
    const fc3 = wb3.getWorksheet('FC 고장사슬');
    console.log('생성된 Template FC 행수:', fc3.rowCount - 1);
    console.log('row2:', JSON.stringify(fc3.getRow(2).values).substring(0, 250));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
