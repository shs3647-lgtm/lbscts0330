/**
 * FK 미매칭 진단 — L2/L3 맵 매칭 실패 원인 분석
 */
import ExcelJS from 'exceljs';

const EXCEL_PATH = 'D:\\00 fmea개발\\00_CELLuuid_FK_SYSTEM\\excel\\PFMEA_pfm26-p018-i18_샘플Down_최신본.xlsx';

function getCellStr(row: any, col: number): string {
  const cell = row.getCell(col);
  if (!cell || cell.value == null) return '';
  const v = cell.value;
  if (typeof v === 'object' && v !== null && (v as any).richText) {
    return ((v as any).richText || []).map((r: any) => r.text || '').join('').trim();
  }
  return String(v).trim();
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);

  // L2 시트: col1=공정번호, col5=A5(고장형태)
  const l2WS = wb.getWorksheet('L2 통합(A1-A6)')!;
  const fmMap = new Map<string, number>();
  console.log('=== L2 시트: 공정번호 + A5(고장형태) ===');
  l2WS.eachRow((row, rn) => {
    if (rn <= 1) return;
    const pno = getCellStr(row, 1);
    const a5 = getCellStr(row, 5);
    if (a5) {
      const key = `${pno}::${a5}`;
      fmMap.set(key, rn);
      console.log(`  R${rn}: pno=${pno} A5="${a5.substring(0,30)}"`);
    }
  });
  console.log(`fmMap: ${fmMap.size}건\n`);

  // FC 시트: 공정번호(col3) + FM(col4)
  const fcWS = wb.getWorksheet('FC 고장사슬')!;
  console.log('=== FC 시트: 공정번호 + FM ===');
  let prevPno = '', prevFM = '';
  let matched = 0, missed = 0;
  fcWS.eachRow((row, rn) => {
    if (rn <= 1) return;
    let pno = getCellStr(row, 3) || prevPno;
    let fm = getCellStr(row, 4) || prevFM;
    if (pno) prevPno = pno;
    if (fm) prevFM = fm;

    const key = `${pno}::${fm}`;
    const l2Row = fmMap.get(key);
    if (l2Row) {
      matched++;
    } else {
      missed++;
      console.log(`  MISS R${rn}: key="${key.substring(0,60)}"`);
      // Try to find similar keys
      for (const [k, v] of fmMap) {
        if (k.includes(pno) && fm.substring(0, 10) && k.includes(fm.substring(0, 10))) {
          console.log(`    → similar: "${k.substring(0,60)}" at R${v}`);
        }
      }
    }
  });
  console.log(`\nL2 결과: matched=${matched} missed=${missed}`);

  // L3 시트: col1=공정번호, col7=B4(고장원인)
  const l3WS = wb.getWorksheet('L3 통합(B1-B5)')!;
  const fcCauseMap = new Map<string, number>();
  l3WS.eachRow((row, rn) => {
    if (rn <= 1) return;
    const pno = getCellStr(row, 1);
    const b4 = getCellStr(row, 7);
    if (b4) {
      const key = `${pno}::${b4}`;
      if (!fcCauseMap.has(key)) fcCauseMap.set(key, rn);
    }
  });

  console.log(`\n=== L3 매칭 ===`);
  let l3matched = 0, l3missed = 0;
  prevPno = '';
  fcWS.eachRow((row, rn) => {
    if (rn <= 1) return;
    let pno = getCellStr(row, 3) || prevPno;
    let fc = getCellStr(row, 7);
    if (pno) prevPno = pno;
    const key = `${pno}::${fc}`;
    if (fcCauseMap.has(key)) l3matched++; 
    else { l3missed++; console.log(`  MISS R${rn}: key="${key.substring(0,60)}"`); }
  });
  console.log(`L3 결과: matched=${l3matched} missed=${l3missed}`);
}

main().catch(e => console.error(e));
