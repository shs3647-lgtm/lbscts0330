import ExcelJS from 'exceljs';

async function go() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('D:\\00 fmea개발\\00_CELLuuid_FK_SYSTEM\\excel\\PFMEA_MASTER_IMPORT_FIXED.xlsx');
  wb.eachSheet((ws, id) => console.log(`  [${id}] "${ws.name}"`));

  // L3 시트 찾기
  let l3WS: ExcelJS.Worksheet | undefined;
  wb.eachSheet(ws => { if (ws.name.includes('L3') || ws.name.includes('작업')) l3WS = ws; });
  if (!l3WS) { console.log('L3 시트 없음'); return; }
  console.log(`\nL3 시트: "${l3WS.name}"`);

  const hdr = l3WS.getRow(1);
  for (let col = 1; col <= 10; col++) {
    console.log(`  col${col}: "${hdr.getCell(col).value || ''}"`);
  }

  let total = 0, b3Empty = 0, b5Empty = 0;
  l3WS.eachRow((row, rn) => {
    if (rn <= 1) return;
    total++;
    const b3 = String(row.getCell(5).value || '').trim();
    const b5 = String(row.getCell(8).value || '').trim();
    if (!b3) b3Empty++;
    if (!b5) b5Empty++;
  });

  console.log(`\n총 행: ${total}, B3 빈값: ${b3Empty}, B5 빈값: ${b5Empty}`);

  // 샘플 — 공정번호별 B3/B5
  console.log('\n=== 전체 B3/B5 현황 ===');
  l3WS.eachRow((row, rn) => {
    if (rn <= 1) return;
    const pno = String(row.getCell(1).value || '').trim();
    const b3 = String(row.getCell(5).value || '').trim();
    const b4 = String(row.getCell(7).value || '').trim();
    const b5 = String(row.getCell(8).value || '').trim();
    if (b3 || b5 || rn <= 5) {
      console.log(`  R${rn}: pno="${pno}" B3="${b3.substring(0,40)}" B4="${b4.substring(0,20)}" B5="${b5.substring(0,30)}"`);
    }
  });
}
go();
