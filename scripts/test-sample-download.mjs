/**
 * downloadSampleTemplate → downloadDataTemplate 경로 시뮬레이션
 * FC 고장사슬 시트에 데이터가 들어가는지 검증
 */
import ExcelJS from 'exceljs';

const FMEA_ID = 'pfm26-m002';

async function main() {
  // 1. Master API fetch (downloadSampleTemplate과 동일)
  const res = await fetch(`http://localhost:3000/api/pfmea/master?fmeaId=${FMEA_ID}&includeItems=true`);
  const data = await res.json();
  const ds = data.dataset;

  console.log('=== downloadSampleTemplate 시뮬레이션 ===');
  console.log('flatItems:', ds?.flatItems?.length || 0);
  console.log('failureChains:', ds?.failureChains?.length || 0);

  if (!ds?.flatItems?.length) {
    console.log('ERROR: flatItems가 비어있어 SAMPLE_DATA fallback으로 전환됨');
    process.exit(1);
  }

  // 2. chain 매핑 (downloadSampleTemplate line 1834-1847과 동일)
  const chains = (ds.failureChains || []).map((ch) => ({
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

  console.log('mapped chains:', chains.length);

  // 3. downloadDataTemplate 내부 로직 시뮬레이션 (line 454-477)
  const failureChains = chains;
  const sheetData = {};

  if (failureChains && failureChains.length > 0) {
    const sortedChains = [...failureChains].sort((a, b) => {
      const pCmp = (a.processNo || '').localeCompare(b.processNo || '', undefined, { numeric: true });
      if (pCmp !== 0) return pCmp;
      const fmCmp = (a.fmValue || '').localeCompare(b.fmValue || '');
      if (fmCmp !== 0) return fmCmp;
      const scopeCmp = (a.feScope || '').localeCompare(b.feScope || '');
      if (scopeCmp !== 0) return scopeCmp;
      return (a.feValue || '').localeCompare(b.feValue || '');
    });

    sheetData['FC 고장사슬'] = sortedChains.map(fc => [
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
    console.log('FC 시트 데이터 행:', sheetData['FC 고장사슬'].length);
  } else {
    console.log('ERROR: failureChains가 비어있어 FC 시트 데이터 없음');
  }

  // 4. ExcelJS 워크북 생성
  const wb = new ExcelJS.Workbook();
  const headers = ['FE구분', 'FE(고장영향)', 'L2-1.공정번호', 'FM(고장형태)', '4M', 'WE(작업요소)', 'FC(고장원인)', 'B5.예방관리', 'A6.검출관리', 'O', 'D', 'AP'];
  const ws = wb.addWorksheet('FC 고장사슬');
  ws.columns = headers.map(h => ({ header: h, width: 20 }));

  const rows = sheetData['FC 고장사슬'] || [];
  if (rows.length > 0) {
    rows.forEach(row => ws.addRow(row));
  }

  await wb.xlsx.writeFile('c:/autom-fmea/test-sample-fc.xlsx');

  // 5. 검증: 다시 읽어서 확인
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.readFile('c:/autom-fmea/test-sample-fc.xlsx');
  const fc = wb2.worksheets[0];
  console.log('\n=== 생성된 Excel 검증 ===');
  console.log('시트명:', fc.name);
  console.log('총 행수:', fc.rowCount);
  console.log('데이터 행수:', fc.rowCount - 1);
  if (fc.rowCount > 1) {
    console.log('row2:', JSON.stringify(fc.getRow(2).values).substring(0, 150));
    console.log('row50:', JSON.stringify(fc.getRow(50).values).substring(0, 150));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
