/**
 * 엑셀 빈셀 fill-down + cross-sheet 참조 + 공정순서 정렬
 */
import ExcelJS from 'exceljs';

const INPUT = 'C:/Users/Administrator/Downloads/PFMEA_ReverseImport_pfm26-m101_2026-03-21 (4).xlsx';
const OUTPUT = 'C:/Users/Administrator/Downloads/PFMEA_ReverseImport_pfm26-m101_filled.xlsx';

const M4_ORDER: Record<string, number> = { MN: 1, MC: 2, IM: 3, EN: 4 };

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(INPUT);

  let totalFilled = 0;

  // Phase 1: fill-down
  for (const ws of wb.worksheets) {
    if (ws.name.includes('VERIFY')) continue;
    const colCount = ws.getRow(1).cellCount;
    let filled = 0;
    for (let c = 1; c <= colCount; c++) {
      let lastVal = '';
      ws.eachRow((row, rn) => {
        if (rn <= 1) return;
        const val = cellStr(row.getCell(c));
        if (val) { lastVal = val; }
        else if (lastVal) { row.getCell(c).value = lastVal; filled++; }
      });
    }
    // 특별특성 빈셀 → '비지정'
    for (let c = 1; c <= colCount; c++) {
      if (String(ws.getRow(1).getCell(c).value || '').includes('특별특성')) {
        ws.eachRow((row, rn) => {
          if (rn <= 1) return;
          if (!cellStr(row.getCell(c))) { row.getCell(c).value = '비지정'; filled++; }
        });
      }
    }
    if (filled > 0) { console.log(`${ws.name}: fill-down ${filled}건`); totalFilled += filled; }
  }

  // Phase 2: L3 공정순서 정렬
  const l3 = wb.worksheets.find(ws => ws.name.includes('L3'))!;
  const l2 = wb.worksheets.find(ws => ws.name.includes('L2'))!;

  // L2 공정순서 → 정렬 기준
  const l2PnoOrder = new Map<string, number>();
  let l2Idx = 0;
  l2.eachRow((row, rn) => {
    if (rn <= 1) return;
    const pno = cellStr(row.getCell(1));
    if (pno && !l2PnoOrder.has(pno)) l2PnoOrder.set(pno, l2Idx++);
  });

  // L3 데이터 추출 + 정렬
  const l3Headers: string[] = [];
  const l3ColCount = l3.getRow(1).cellCount;
  for (let c = 1; c <= l3ColCount; c++) {
    l3Headers.push(String(l3.getRow(1).getCell(c).value || ''));
  }

  const l3Rows: string[][] = [];
  l3.eachRow((row, rn) => {
    if (rn <= 1) return;
    const vals: string[] = [];
    for (let c = 1; c <= l3ColCount; c++) vals.push(cellStr(row.getCell(c)));
    l3Rows.push(vals);
  });

  // 공정번호(numeric) → 4M순서 → 원래 순서(안정 정렬)
  const pnoCol = 0; // 공정번호
  const m4Col = 1;  // 4M
  l3Rows.sort((a, b) => {
    const pA = l2PnoOrder.get(a[pnoCol]) ?? 999;
    const pB = l2PnoOrder.get(b[pnoCol]) ?? 999;
    if (pA !== pB) return pA - pB;
    const mA = M4_ORDER[a[m4Col].toUpperCase()] ?? 9;
    const mB = M4_ORDER[b[m4Col].toUpperCase()] ?? 9;
    return mA - mB;
  });

  // L3 시트에 정렬된 데이터 덮어쓰기
  for (let i = 0; i < l3Rows.length; i++) {
    const row = l3.getRow(i + 2);
    for (let c = 0; c < l3ColCount; c++) {
      row.getCell(c + 1).value = l3Rows[i][c];
    }
  }
  console.log(`L3 통합: ${l3Rows.length}행 공정순서 정렬 완료`);

  // Phase 3: FA 공정순서 정렬
  const fa = wb.worksheets.find(ws => ws.name.includes('FA'));
  if (fa) {
    const faColCount = fa.getRow(1).cellCount;
    const faHeaders: string[] = [];
    for (let c = 1; c <= faColCount; c++) {
      faHeaders.push(String(fa.getRow(1).getCell(c).value || ''));
    }

    // A1(공정No) 컬럼, 4M 컬럼 찾기
    let faPnoCol = -1, faM4Col = -1;
    faHeaders.forEach((h, i) => {
      if (h.includes('A1') || (h.includes('공정') && h.includes('No'))) faPnoCol = i;
      if (h === '4M') faM4Col = i;
    });

    const faRows: string[][] = [];
    fa.eachRow((row, rn) => {
      if (rn <= 1) return;
      const vals: string[] = [];
      for (let c = 1; c <= faColCount; c++) vals.push(cellStr(row.getCell(c)));
      faRows.push(vals);
    });

    if (faPnoCol >= 0) {
      faRows.sort((a, b) => {
        const pA = l2PnoOrder.get(a[faPnoCol]) ?? 999;
        const pB = l2PnoOrder.get(b[faPnoCol]) ?? 999;
        if (pA !== pB) return pA - pB;
        if (faM4Col >= 0) {
          const mA = M4_ORDER[a[faM4Col].toUpperCase()] ?? 9;
          const mB = M4_ORDER[b[faM4Col].toUpperCase()] ?? 9;
          if (mA !== mB) return mA - mB;
        }
        return 0;
      });

      for (let i = 0; i < faRows.length; i++) {
        const row = fa.getRow(i + 2);
        for (let c = 0; c < faColCount; c++) {
          row.getCell(c + 1).value = faRows[i][c];
        }
      }
      console.log(`FA 통합: ${faRows.length}행 공정순서 정렬 완료`);
    }

    // FA cross-sheet 채움
    const l1 = wb.worksheets.find(ws => ws.name.includes('L1'));
    const c1Map = new Map<string, { c2: string; c3: string }>();
    if (l1) {
      l1.eachRow((row, rn) => {
        if (rn <= 1) return;
        const c1 = cellStr(row.getCell(1));
        if (c1 && !c1Map.has(c1)) {
          c1Map.set(c1, { c2: cellStr(row.getCell(2)), c3: cellStr(row.getCell(3)) });
        }
      });
    }
    const pnoToName = new Map<string, string>();
    l2.eachRow((row, rn) => {
      if (rn <= 1) return;
      const pno = cellStr(row.getCell(1));
      const name = cellStr(row.getCell(2));
      if (pno && name) pnoToName.set(pno, name);
    });

    let faFilled = 0;
    const c2Col = faHeaders.findIndex(h => h.includes('C2') && h.includes('제품기능'));
    const c3Col = faHeaders.findIndex(h => h.includes('C3') && h.includes('요구사항'));
    const a2Col = faHeaders.findIndex(h => h.includes('A2') && h.includes('공정명'));
    const dc2Col = faHeaders.findIndex(h => h.includes('DC추천2'));
    const pc2Col = faHeaders.findIndex(h => h.includes('PC추천2'));
    const orCol = faHeaders.findIndex(h => h.includes('O추천'));
    const drCol = faHeaders.findIndex(h => h.includes('D추천'));

    fa.eachRow((row, rn) => {
      if (rn <= 1) return;
      // C2
      if (c2Col >= 0 && !cellStr(row.getCell(c2Col + 1))) {
        const c1 = cellStr(row.getCell(1));
        const ref = c1Map.get(c1);
        if (ref) { row.getCell(c2Col + 1).value = ref.c2; faFilled++; }
      }
      // C3
      if (c3Col >= 0 && !cellStr(row.getCell(c3Col + 1))) {
        const c1 = cellStr(row.getCell(1));
        const ref = c1Map.get(c1);
        if (ref) { row.getCell(c3Col + 1).value = ref.c3; faFilled++; }
      }
      // A2
      if (a2Col >= 0 && faPnoCol >= 0 && !cellStr(row.getCell(a2Col + 1))) {
        const pno = cellStr(row.getCell(faPnoCol + 1));
        const name = pnoToName.get(pno);
        if (name) { row.getCell(a2Col + 1).value = name; faFilled++; }
      }
      // 추천 빈 → '-'
      for (const col of [dc2Col, pc2Col, orCol, drCol]) {
        if (col >= 0 && !cellStr(row.getCell(col + 1))) {
          row.getCell(col + 1).value = '-';
          faFilled++;
        }
      }
    });
    if (faFilled > 0) { console.log(`FA: cross-sheet ${faFilled}건 채움`); totalFilled += faFilled; }
  }

  // FC 고장사슬 정렬 (공정번호 순)
  const fc = wb.worksheets.find(ws => ws.name.includes('FC') && ws.name.includes('고장사슬'));
  if (fc) {
    const fcColCount = fc.getRow(1).cellCount;
    const fcHeaders: string[] = [];
    for (let c = 1; c <= fcColCount; c++) fcHeaders.push(String(fc.getRow(1).getCell(c).value || ''));

    let fcPnoCol = -1, fcM4Col = -1;
    fcHeaders.forEach((h, i) => {
      if (h.includes('공정번호')) fcPnoCol = i;
      if (h === '4M') fcM4Col = i;
    });

    const fcRows: string[][] = [];
    fc.eachRow((row, rn) => {
      if (rn <= 1) return;
      const vals: string[] = [];
      for (let c = 1; c <= fcColCount; c++) vals.push(cellStr(row.getCell(c)));
      fcRows.push(vals);
    });

    if (fcPnoCol >= 0) {
      fcRows.sort((a, b) => {
        const pA = l2PnoOrder.get(a[fcPnoCol]) ?? 999;
        const pB = l2PnoOrder.get(b[fcPnoCol]) ?? 999;
        if (pA !== pB) return pA - pB;
        if (fcM4Col >= 0) {
          const mA = M4_ORDER[a[fcM4Col].toUpperCase()] ?? 9;
          const mB = M4_ORDER[b[fcM4Col].toUpperCase()] ?? 9;
          if (mA !== mB) return mA - mB;
        }
        return 0;
      });

      for (let i = 0; i < fcRows.length; i++) {
        const row = fc.getRow(i + 2);
        for (let c = 0; c < fcColCount; c++) row.getCell(c + 1).value = fcRows[i][c];
      }
      console.log(`FC 고장사슬: ${fcRows.length}행 공정순서 정렬 완료`);
    }
  }

  // 최종 검증
  console.log(`\n총 채움: ${totalFilled}건. 검증:`);
  for (const ws of wb.worksheets) {
    if (ws.name.includes('VERIFY')) continue;
    const colCount = ws.getRow(1).cellCount;
    let empty = 0;
    ws.eachRow((row, rn) => {
      if (rn <= 1) return;
      for (let c = 1; c <= colCount; c++) if (!cellStr(row.getCell(c))) empty++;
    });
    console.log(`  ${ws.name}: 빈셀=${empty}`);
  }

  // L3 공정순서 검증
  const l3Check: string[] = [];
  l3.eachRow((row, rn) => {
    if (rn <= 1) return;
    const pno = cellStr(row.getCell(1));
    if (!l3Check.includes(pno)) l3Check.push(pno);
  });
  console.log(`\nL3 공정순서: ${l3Check.join(' → ')}`);

  // 공정별 행 수
  const pnoCounts: Record<string, number> = {};
  l3.eachRow((row, rn) => {
    if (rn <= 1) return;
    const pno = cellStr(row.getCell(1));
    pnoCounts[pno] = (pnoCounts[pno] || 0) + 1;
  });
  console.log('공정별 행 수:');
  for (const p of l3Check) console.log(`  ${p}: ${pnoCounts[p]}행`);

  await wb.xlsx.writeFile(OUTPUT);
  console.log(`\n→ ${OUTPUT}`);
}

function cellStr(cell: ExcelJS.Cell): string {
  if (!cell || cell.value == null) return '';
  const v = cell.value;
  if (typeof v === 'object' && 'richText' in (v as any)) {
    return ((v as any).richText || []).map((r: any) => r.text || '').join('').trim();
  }
  const s = String(v).trim();
  return s === 'null' || s === 'undefined' ? '' : s;
}

main().catch(console.error);
