/**
 * 전체보기 엑셀 → 마스터 FMEA Import 양식 생성 (v2 — 전수 검증)
 * FC 100%, C4 심각도 분리, 제품특성/고장형태 전수 정합성
 */
import ExcelJS from 'exceljs';

const INPUT = 'C:/Users/Administrator/Downloads/au bump_전체보기_20260317.xlsx';
const OUTPUT = 'C:/Users/Administrator/Downloads/PFMEA_Master_au_bump_generated.xlsx';

async function main() {
  const srcWb = new ExcelJS.Workbook();
  await srcWb.xlsx.readFile(INPUT);
  const srcWs = srcWb.getWorksheet(1);

  // ── 1. 전체보기 → carry-forward 적용 완전 데이터 ──
  const allRows = [];
  const cf = {};
  srcWs.eachRow((row, rn) => {
    if (rn <= 2) return;
    const c = (col) => {
      const v = row.getCell(col).value;
      return v !== null && v !== undefined ? String(v).trim() : '';
    };
    if (c(1)) cf.l1 = c(1);
    if (c(2)) cf.procNm = c(2);
    if (c(5)) cf.cat = c(5);
    if (c(6)) cf.prodFunc = c(6);
    if (c(7)) cf.req = c(7);
    if (c(8)) cf.procFunc = c(8);
    if (c(9)) cf.prodChar = c(9);
    if (c(12)) cf.fe = c(12);
    if (c(13)) cf.sev = c(13);
    if (c(14)) cf.fm = c(14);

    const pno = cf.procNm?.match(/^(\d+)/)?.[1] || '';
    const pname = cf.procNm?.replace(/^\d+\.\s*/, '') || '';
    allRows.push({
      pno, pname, procNm: cf.procNm,
      m4: c(3), we: c(4),
      cat: cf.cat || '', prodFunc: cf.prodFunc || '', req: cf.req || '',
      procFunc: cf.procFunc || '', prodChar: cf.prodChar || '',
      weFunc: c(10), pc: c(11),
      fe: cf.fe || '', sev: cf.sev || '', fm: cf.fm || '',
      fc: c(15), prevention: c(16), occ: c(17),
      detection: c(18), det: c(19), ap: c(20), sc: c(21),
    });
  });
  console.log(`전체보기 행: ${allRows.length}`);

  // ── 2. 데이터 추출 (중복 제거, 정합성 보장) ──

  // 공정 목록 (순서 유지)
  const processes = [];
  const seenProc = new Set();
  for (const r of allRows) {
    if (r.pno && !seenProc.has(r.pno)) {
      seenProc.add(r.pno);
      processes.push({ no: r.pno, name: r.pname });
    }
  }

  // A3: 공정기능 (공정별 1개)
  const a3Map = new Map();
  for (const r of allRows) {
    if (r.pno && r.procFunc && !a3Map.has(r.pno)) a3Map.set(r.pno, r.procFunc);
  }

  // A4: 제품특성 (공정+prodChar 고유)
  const a4List = [];
  const a4Seen = new Set();
  for (const r of allRows) {
    const key = `${r.pno}|${r.prodChar}`;
    if (r.pno && r.prodChar && !a4Seen.has(key)) {
      a4Seen.add(key);
      a4List.push({ no: r.pno, value: r.prodChar });
    }
  }

  // A5: 고장형태 (공정+fm 고유)
  const a5List = [];
  const a5Seen = new Set();
  for (const r of allRows) {
    const key = `${r.pno}|${r.fm}`;
    if (r.pno && r.fm && !a5Seen.has(key)) {
      a5Seen.add(key);
      a5List.push({ no: r.pno, value: r.fm });
    }
  }

  // A6: 검출관리 (공정별 고유 — "D:" prefix 있으면 제거)
  const a6List = [];
  const a6Seen = new Set();
  for (const r of allRows) {
    const dcRaw = r.detection.replace(/^D:/, '').trim();
    const key = `${r.pno}|${dcRaw}`;
    if (r.pno && dcRaw && !a6Seen.has(key)) {
      a6Seen.add(key);
      a6List.push({ no: r.pno, value: dcRaw });
    }
  }

  // B1~B5 (L3 통합용)
  const l3Rows = []; // 통합 시트용 전체 행
  const b1Seen = new Set();
  let b1Count = 0, b3Count = 0, b4Count = 0, b5Count = 0;
  for (const r of allRows) {
    if (!r.pno || !r.we) continue;
    const weKey = `${r.pno}|${r.m4}|${r.we}`;
    if (!b1Seen.has(weKey)) {
      b1Seen.add(weKey);
      b1Count++;
    }
    const pcVal = r.pc;
    const fcVal = r.fc;
    const pvVal = r.prevention.replace(/^P:/, '').trim();
    l3Rows.push({
      pno: r.pno, m4: r.m4, we: r.we, weFunc: r.weFunc,
      pc: pcVal, sc: r.sc, fc: fcVal, pv: pvVal,
    });
    if (pcVal) b3Count++;
    if (fcVal) b4Count++;
    if (pvVal) b5Count++;
  }

  // C계열: 카테고리별 매핑
  const c1List = []; // 고유 카테고리
  const c2List = []; // 완제품기능
  const c3List = []; // 요구사항
  const c4List = []; // 고장영향 + 심각도
  const c1Seen = new Set(), c2Seen = new Set(), c3Seen = new Set(), c4Seen = new Set();
  for (const r of allRows) {
    if (r.cat && !c1Seen.has(r.cat)) { c1Seen.add(r.cat); c1List.push(r.cat); }
    if (r.prodFunc && !c2Seen.has(r.prodFunc)) { c2Seen.add(r.prodFunc); c2List.push({ cat: r.cat, value: r.prodFunc }); }
    if (r.req && !c3Seen.has(r.req)) { c3Seen.add(r.req); c3List.push({ cat: r.cat, value: r.req }); }
    if (r.fe && !c4Seen.has(r.fe)) {
      c4Seen.add(r.fe);
      c4List.push({ cat: r.cat, fe: r.fe, sev: r.sev });
    }
  }

  // FC 고장사슬: 전체보기의 모든 FC 행
  const chains = [];
  for (const r of allRows) {
    if (!r.fc) continue;
    chains.push({
      cat: r.cat, fe: r.fe, sev: r.sev,
      pno: r.pno, fm: r.fm,
      m4: r.m4, we: r.we, fc: r.fc,
      pv: r.prevention.replace(/^P:/, '').trim(),
      dc: r.detection.replace(/^D:/, '').trim(),
      occ: r.occ, det: r.det, ap: r.ap,
    });
  }

  // ── 전수 검증 ──
  console.log(`\nA1(공정): ${processes.length} (기대 21)`);
  console.log(`A3(공정기능): ${a3Map.size} (기대 21)`);
  console.log(`A4(제품특성): ${a4List.length} (기대 26)`);
  console.log(`A5(고장형태): ${a5List.length} (기대 26)`);
  console.log(`A6(검출관리): ${a6List.length}`);
  console.log(`B1(작업요소): ${b1Count} (기대 91+)`);
  console.log(`B3(공정특성): ${b3Count} (기대 102+)`);
  console.log(`B4(고장원인): ${b4Count} (기대 104)`);
  console.log(`B5(예방관리): ${b5Count}`);
  console.log(`C1(구분): ${c1List.length} (기대 3)`);
  console.log(`C2(완제품기능): ${c2List.length} (기대 7)`);
  console.log(`C3(요구사항): ${c3List.length} (기대 17)`);
  console.log(`C4(고장영향): ${c4List.length} (기대 20)`);
  console.log(`FC 고장사슬: ${chains.length} (기대 104)`);

  // ── 3. 엑셀 생성 ──
  const wb = new ExcelJS.Workbook();
  const hFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  const hFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  const dFont = { size: 10 };

  function addSheet(name, headers, rows) {
    const ws = wb.addWorksheet(name);
    const hr = ws.addRow(headers);
    hr.eachCell(c => { c.fill = hFill; c.font = hFont; });
    for (const r of rows) {
      const dr = ws.addRow(r);
      dr.eachCell(c => { c.font = dFont; });
    }
    ws.columns.forEach(col => { col.width = 25; });
    return ws;
  }

  // 개별 시트들
  addSheet('L2-1(A1) 공정번호', ['L2-1.공정번호', 'L2-2.공정명', '공정유형코드(선택)'],
    processes.map(p => [p.no, p.name, '']));

  addSheet('L2-2(A2) 공정명', ['L2-1.공정번호', 'L2-2.공정명'],
    processes.map(p => [p.no, p.name]));

  addSheet('L2-3(A3) 공정기능', ['L2-1.공정번호', 'L2-3.공정기능'],
    processes.map(p => [p.no, a3Map.get(p.no) || '']));

  addSheet('L2-4(A4) 제품특성', ['L2-1.공정번호', 'L2-4.제품특성', '특별특성'],
    a4List.map(a => [a.no, a.value, '']));

  addSheet('L2-5(A5) 고장형태', ['L2-1.공정번호', 'L2-5.고장형태'],
    a5List.map(a => [a.no, a.value]));

  addSheet('L2-6(A6) 검출관리', ['L2-1.공정번호', 'L2-6.검출관리'],
    a6List.map(a => [a.no, a.value]));

  // B 개별 시트
  const b1Items = [];
  const b1UniSeen = new Set();
  for (const r of l3Rows) {
    const key = `${r.pno}|${r.m4}|${r.we}`;
    if (!b1UniSeen.has(key)) { b1UniSeen.add(key); b1Items.push([r.pno, r.m4, r.we]); }
  }
  addSheet('L3-1(B1) 작업요소', ['L2-1.공정번호', '4M', 'L3-1.작업요소'], b1Items);

  addSheet('L3-2(B2) 요소기능', ['L2-1.공정번호', '4M', '★작업요소(B1)', 'L3-2.요소기능'],
    l3Rows.filter(r => r.weFunc).map(r => [r.pno, r.m4, r.we, r.weFunc]));

  const b3Items = [];
  const b3Seen = new Set();
  for (const r of l3Rows) {
    const key = `${r.pno}|${r.m4}|${r.pc}`;
    if (r.pc && !b3Seen.has(key)) { b3Seen.add(key); b3Items.push([r.pno, r.m4, r.we, r.pc, r.sc || '']); }
  }
  addSheet('L3-3(B3) 공정특성', ['L2-1.공정번호', '4M', '★작업요소(B1)', 'L3-3.공정특성(설비·약품 파라미터)', '특별특성'], b3Items);

  const b4Items = [];
  const b4Seen = new Set();
  for (const r of l3Rows) {
    const key = `${r.pno}|${r.m4}|${r.fc}`;
    if (r.fc && !b4Seen.has(key)) { b4Seen.add(key); b4Items.push([r.pno, r.m4, r.fc]); }
  }
  addSheet('L3-4(B4) 고장원인', ['L2-1.공정번호', '4M', 'L3-4.고장원인(B3이탈 원인)'], b4Items);

  const b5Items = [];
  const b5Seen = new Set();
  for (const r of l3Rows) {
    const key = `${r.pno}|${r.m4}|${r.pv}`;
    if (r.pv && !b5Seen.has(key)) { b5Seen.add(key); b5Items.push([r.pno, r.m4, r.we, r.pv]); }
  }
  addSheet('L3-5(B5) 예방관리', ['L2-1.공정번호', '4M', '★작업요소(B1)', 'L3-5.예방관리'], b5Items);

  // C 개별 시트
  addSheet('L1-1(C1) 구분', ['L1-1.구분'], c1List.map(c => [c]));

  addSheet('L1-2(C2) 제품기능', ['L1-1.구분', 'L1-2.제품기능'],
    c2List.map(c => [c.cat, c.value]));

  addSheet('L1-3(C3) 요구사항', ['L1-1.구분', 'L1-3.요구사항'],
    c3List.map(c => [c.cat, c.value]));

  // ★ C4 고장영향 — 심각도 분리! (이전 버그 수정)
  addSheet('L1-4(C4) 고장영향', ['L1-1.구분', 'L1-4.고장영향', 'S(심각도)'],
    c4List.map(c => [c.cat, c.fe, parseInt(c.sev) || '']));

  // L1 통합(C1-C4) — 심각도 제외, FE만
  const l1UniRows = [];
  for (const c4 of c4List) {
    l1UniRows.push([c4.cat, '', '', c4.fe]);
  }
  // C2/C3 채우기
  const c2Used = new Set(), c3Used = new Set();
  for (let i = 0; i < l1UniRows.length; i++) {
    const cat = l1UniRows[i][0];
    const matchC2 = c2List.find(c => c.cat === cat && !c2Used.has(c.value));
    if (matchC2) { l1UniRows[i][1] = matchC2.value; c2Used.add(matchC2.value); }
    const matchC3 = c3List.find(c => c.cat === cat && !c3Used.has(c.value));
    if (matchC3) { l1UniRows[i][2] = matchC3.value; c3Used.add(matchC3.value); }
  }
  // 미사용 C2/C3 추가
  for (const c2 of c2List) {
    if (!c2Used.has(c2.value)) l1UniRows.push([c2.cat, c2.value, '', '']);
  }
  for (const c3 of c3List) {
    if (!c3Used.has(c3.value)) l1UniRows.push([c3.cat, '', c3.value, '']);
  }
  addSheet('L1 통합(C1-C4)', ['구분(C1)', '제품기능(C2)', '요구사항(C3)', '고장영향(C4)'], l1UniRows);

  // L2 통합(A1-A6)
  addSheet('L2 통합(A1-A6)', ['공정번호', '공정명', '공정기능', '제품특성', '고장형태', '특별특성', '검출관리'],
    processes.map(p => [
      p.no, p.name, a3Map.get(p.no) || '',
      a4List.filter(a => a.no === p.no).map(a => a.value).join('\n'),
      a5List.filter(a => a.no === p.no).map(a => a.value).join('\n'),
      '',
      a6List.filter(a => a.no === p.no).map(a => a.value).join('\n'),
    ]));

  // L3 통합(B1-B5)
  addSheet('L3 통합(B1-B5)', ['공정번호', '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성', '고장원인(B4)', '예방관리(B5)'],
    l3Rows.map(r => [r.pno, r.m4, r.we, r.weFunc, r.pc, r.sc || '', r.fc, r.pv]));

  // ★★ FC 고장사슬 — 104건 전수 (carry-forward 병합 적용) ★★
  const fcSheetRows = [];
  let prevCat = '', prevFe = '', prevPno = '', prevFm = '';
  for (const ch of chains) {
    const showCat = ch.cat !== prevCat ? ch.cat : '';
    const showFe = ch.fe !== prevFe ? ch.fe : '';
    const showPno = ch.pno !== prevPno ? ch.pno : null;
    const showFm = ch.fm !== prevFm ? ch.fm : '';
    fcSheetRows.push([
      showCat, showFe, showPno, showFm,
      ch.m4, ch.we, ch.fc,
      ch.pv, ch.dc,
      parseInt(ch.occ) || '', parseInt(ch.det) || '', ch.ap,
    ]);
    prevCat = ch.cat; prevFe = ch.fe; prevPno = ch.pno; prevFm = ch.fm;
  }
  addSheet('FC 고장사슬', [
    'FE구분', 'FE(고장영향)', 'L2-1.공정번호', 'FM(고장형태)',
    '4M', '작업요소(WE)', 'FC(고장원인)',
    'B5.예방관리(발생 전 방지)', 'A6.검출관리(발생 후 검출)',
    'O', 'D', 'AP',
  ], fcSheetRows);

  // FA 통합분석 (빈 시트 — 헤더만)
  addSheet('FA 통합분석', [
    'FE구분', 'FE(고장영향)', 'S', 'L2-1.공정번호', 'FM(고장형태)',
    '4M', '작업요소(WE)', 'FC(고장원인)', '공정특성(B3)',
    'B5.예방관리', 'O', 'A6.검출관리', 'D', 'AP',
    '특별특성', '습득교훈', '예방개선', '검출개선',
    '책임자', '목표일', '상태', '개선근거', '완료일',
    'S2', 'O2', 'D2',
  ], []);

  await wb.xlsx.writeFile(OUTPUT);

  // ── 4. 최종 전수 검증 ──
  console.log('\n=== 생성 완료 — 전수 검증 ===');
  console.log(`파일: ${OUTPUT}`);
  console.log(`시트 수: ${wb.worksheets.length}`);

  // 생성된 엑셀 다시 읽어서 검증
  const vWb = new ExcelJS.Workbook();
  await vWb.xlsx.readFile(OUTPUT);

  const vFC = vWb.getWorksheet('FC 고장사슬');
  const fcRowCount = vFC ? vFC.rowCount - 1 : 0; // 헤더 제외
  console.log(`FC 고장사슬 행: ${fcRowCount} (기대 104)`);

  const vC4 = vWb.getWorksheet('L1-4(C4) 고장영향');
  const c4RowCount = vC4 ? vC4.rowCount - 1 : 0;
  console.log(`C4 고장영향 행: ${c4RowCount} (기대 20)`);

  // C4 심각도 분리 검증
  let c4HasNumber = false;
  vC4?.eachRow((row, rn) => {
    if (rn === 1) return;
    const fe = String(row.getCell(2).value || '').trim();
    if (/^\d+$/.test(fe)) c4HasNumber = true;
  });
  console.log(`C4에 숫자만 있는 행: ${c4HasNumber ? 'ERROR ❌' : 'CLEAN ✅'}`);

  const vA4 = vWb.getWorksheet('L2-4(A4) 제품특성');
  console.log(`A4 제품특성 행: ${vA4 ? vA4.rowCount - 1 : 0} (기대 26)`);

  const vA5 = vWb.getWorksheet('L2-5(A5) 고장형태');
  console.log(`A5 고장형태 행: ${vA5 ? vA5.rowCount - 1 : 0} (기대 26)`);

  // FC 일치 검증
  const srcFCs = allRows.filter(r => r.fc).map(r => `${r.pno}|${r.m4}|${r.fc}`);
  const genFCs = chains.map(ch => `${ch.pno}|${ch.m4}|${ch.fc}`);
  const missing = srcFCs.filter(f => !genFCs.includes(f));
  const extra = genFCs.filter(f => !srcFCs.includes(f));
  console.log(`FC 누락: ${missing.length} | FC 추가: ${extra.length}`);

  const allPass = fcRowCount === 104 && c4RowCount === 20 && !c4HasNumber && missing.length === 0;
  console.log(`\n전수 검증: ${allPass ? 'ALL PASS ✅' : 'FAIL ❌'}`);
}

main().catch(e => console.error('FATAL:', e));
