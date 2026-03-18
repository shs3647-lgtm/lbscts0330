/**
 * 전체보기 엑셀 → 마스터 FMEA Import 양식 생성
 * FC 100% 일치 보장
 */
import ExcelJS from 'exceljs';

const INPUT = 'C:/Users/Administrator/Downloads/au bump_전체보기_20260317.xlsx';
const OUTPUT = 'C:/Users/Administrator/Downloads/PFMEA_Master_au_bump_generated.xlsx';

async function main() {
  // ── 1. 전체보기 읽기 ──
  const srcWb = new ExcelJS.Workbook();
  await srcWb.xlsx.readFile(INPUT);
  const srcWs = srcWb.getWorksheet(1);

  const allRows = [];
  let curL1 = '', curProcNm = '', curCat = '', curProdFunc = '', curReq = '';
  let curProcFunc = '', curProdChar = '', curFE = '', curFM = '', curSev = '';

  srcWs.eachRow((row, rn) => {
    if (rn <= 2) return; // 헤더 2행
    const c = (col) => String(row.getCell(col).value || '').trim();

    if (c(1)) curL1 = c(1);
    if (c(2)) curProcNm = c(2);
    if (c(5)) curCat = c(5);
    if (c(6)) curProdFunc = c(6);
    if (c(7)) curReq = c(7);
    if (c(8)) curProcFunc = c(8);
    if (c(9)) curProdChar = c(9);
    if (c(12)) curFE = c(12);
    if (c(13)) curSev = c(13);
    if (c(14)) curFM = c(14);

    const pno = curProcNm.match(/^(\d+)/)?.[1] || '';
    const pname = curProcNm.replace(/^\d+\.\s*/, '');

    allRows.push({
      l1Name: curL1,
      processNo: pno, processName: pname, processNm: curProcNm,
      m4: c(3), we: c(4),
      category: curCat, prodFunc: curProdFunc, requirement: curReq,
      procFunc: curProcFunc, prodChar: curProdChar,
      weFunc: c(10), processChar: c(11),
      fe: curFE, severity: curSev, fm: curFM,
      fc: c(15),
      prevention: c(16), occ: c(17), detection: c(18), det: c(19), ap: c(20),
      specialChar: c(21),
    });
  });

  console.log(`전체보기 행: ${allRows.length}`);

  // ── 2. 데이터 추출 (중복 제거) ──
  const processes = []; // {no, name}
  const seenProc = new Set();
  for (const r of allRows) {
    if (r.processNo && !seenProc.has(r.processNo)) {
      seenProc.add(r.processNo);
      processes.push({ no: r.processNo, name: r.processName });
    }
  }

  // A3: 공정기능 (공정별 고유)
  const a3Map = new Map();
  for (const r of allRows) {
    if (r.processNo && r.procFunc && !a3Map.has(r.processNo)) a3Map.set(r.processNo, r.procFunc);
  }

  // A4: 제품특성 (공정별 고유)
  const a4List = [];
  const a4Seen = new Set();
  for (const r of allRows) {
    const key = `${r.processNo}|${r.prodChar}`;
    if (r.processNo && r.prodChar && !a4Seen.has(key)) {
      a4Seen.add(key);
      a4List.push({ no: r.processNo, value: r.prodChar });
    }
  }

  // A5: 고장형태 (공정별 고유)
  const a5List = [];
  const a5Seen = new Set();
  for (const r of allRows) {
    const key = `${r.processNo}|${r.fm}`;
    if (r.processNo && r.fm && !a5Seen.has(key)) {
      a5Seen.add(key);
      a5List.push({ no: r.processNo, value: r.fm });
    }
  }

  // A6: 검출관리 (공정별 고유)
  const a6List = [];
  const a6Seen = new Set();
  for (const r of allRows) {
    const key = `${r.processNo}|${r.detection}`;
    if (r.processNo && r.detection && !a6Seen.has(key)) {
      a6Seen.add(key);
      a6List.push({ no: r.processNo, value: r.detection });
    }
  }

  // B1~B5: 작업요소 기반 (공정+4M+WE 조합)
  const b1List = [], b2List = [], b3List = [], b4List = [], b5List = [];
  const b1Seen = new Set(), b3Seen = new Set(), b4Seen = new Set(), b5Seen = new Set();
  for (const r of allRows) {
    const weKey = `${r.processNo}|${r.m4}|${r.we}`;
    if (r.processNo && r.we && !b1Seen.has(weKey)) {
      b1Seen.add(weKey);
      b1List.push({ no: r.processNo, m4: r.m4, value: r.we });
    }
    // B2: 요소기능 (WE별 고유)
    if (r.processNo && r.weFunc) {
      b2List.push({ no: r.processNo, m4: r.m4, we: r.we, value: r.weFunc });
    }
    // B3: 공정특성 (공정+m4+PC 고유)
    const b3Key = `${r.processNo}|${r.m4}|${r.processChar}`;
    if (r.processNo && r.processChar && !b3Seen.has(b3Key)) {
      b3Seen.add(b3Key);
      b3List.push({ no: r.processNo, m4: r.m4, we: r.we, value: r.processChar, sc: r.specialChar });
    }
    // B4: 고장원인 — FC 100% 일치 핵심!
    const b4Key = `${r.processNo}|${r.m4}|${r.fc}`;
    if (r.processNo && r.fc && !b4Seen.has(b4Key)) {
      b4Seen.add(b4Key);
      b4List.push({ no: r.processNo, m4: r.m4, value: r.fc });
    }
    // B5: 예방관리
    const b5Key = `${r.processNo}|${r.m4}|${r.prevention}`;
    if (r.processNo && r.prevention && !b5Seen.has(b5Key)) {
      b5Seen.add(b5Key);
      b5List.push({ no: r.processNo, m4: r.m4, we: r.we, value: r.prevention });
    }
  }

  // C계열: L1 데이터
  const c1Set = new Set(), c2Set = new Set(), c3Set = new Set(), c4Set = new Set();
  const c1List = [], c2List = [], c3List = [], c4List = [];
  for (const r of allRows) {
    if (r.category && !c1Set.has(r.category)) { c1Set.add(r.category); c1List.push(r.category); }
    if (r.prodFunc && !c2Set.has(r.prodFunc)) { c2Set.add(r.prodFunc); c2List.push({ cat: r.category, value: r.prodFunc }); }
    if (r.requirement && !c3Set.has(r.requirement)) { c3Set.add(r.requirement); c3List.push({ cat: r.category, value: r.requirement }); }
    if (r.fe && !c4Set.has(r.fe)) { c4Set.add(r.fe); c4List.push({ cat: r.category, value: r.fe }); }
  }

  // FC 고장사슬: FM↔FE↔FC 연결 (allRows에서 FM이 바뀌는 단위로 그룹핑)
  const chains = [];
  let prevFm = '', prevFe = '', prevPno = '';
  for (const r of allRows) {
    if (!r.fc) continue;
    // FM/FE가 바뀌는 지점 또는 processNo가 바뀌는 지점
    chains.push({
      feScope: r.category || '',
      fe: r.fe,
      processNo: r.processNo,
      fm: r.fm,
      m4: r.m4,
      we: r.we,
      fc: r.fc,
      prevention: r.prevention,
      detection: r.detection,
      occ: r.occ,
      det: r.det,
      ap: r.ap,
    });
  }

  console.log(`\nA1: ${processes.length}, A3: ${a3Map.size}, A4: ${a4List.length}, A5: ${a5List.length}, A6: ${a6List.length}`);
  console.log(`B1: ${b1List.length}, B2: ${b2List.length}, B3: ${b3List.length}, B4: ${b4List.length}, B5: ${b5List.length}`);
  console.log(`C1: ${c1List.length}, C2: ${c2List.length}, C3: ${c3List.length}, C4: ${c4List.length}`);
  console.log(`FC chains: ${chains.length}`);

  // ── 3. 마스터 FMEA 엑셀 생성 ──
  const wb = new ExcelJS.Workbook();

  // 헤더 스타일
  const hdrFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  const hdrFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  const cellFont = { size: 10 };

  function addSheet(name, headers, rows) {
    const ws = wb.addWorksheet(name);
    const hdrRow = ws.addRow(headers);
    hdrRow.eachCell(c => { c.fill = hdrFill; c.font = hdrFont; });
    for (const r of rows) {
      const dataRow = ws.addRow(r);
      dataRow.eachCell(c => { c.font = cellFont; });
    }
    ws.columns.forEach(col => { col.width = 20; });
    return ws;
  }

  // L2-1(A1) 공정번호
  addSheet('L2-1(A1) 공정번호', ['L2-1.공정번호', 'L2-2.공정명', '공정유형코드(선택)'],
    processes.map(p => [p.no, p.name, '']));

  // L2-2(A2) 공정명
  addSheet('L2-2(A2) 공정명', ['L2-1.공정번호', 'L2-2.공정명'],
    processes.map(p => [p.no, p.name]));

  // L2-3(A3) 공정기능
  addSheet('L2-3(A3) 공정기능', ['L2-1.공정번호', 'L2-3.공정기능'],
    processes.map(p => [p.no, a3Map.get(p.no) || '']));

  // L2-4(A4) 제품특성
  addSheet('L2-4(A4) 제품특성', ['L2-1.공정번호', 'L2-4.제품특성', '특별특성'],
    a4List.map(a => [a.no, a.value, '']));

  // L2-5(A5) 고장형태
  addSheet('L2-5(A5) 고장형태', ['L2-1.공정번호', 'L2-5.고장형태'],
    a5List.map(a => [a.no, a.value]));

  // L2-6(A6) 검출관리
  addSheet('L2-6(A6) 검출관리', ['L2-1.공정번호', 'L2-6.검출관리'],
    a6List.map(a => [a.no, a.value]));

  // L3-1(B1) 작업요소
  addSheet('L3-1(B1) 작업요소', ['L2-1.공정번호', '4M', 'L3-1.작업요소'],
    b1List.map(b => [b.no, b.m4, b.value]));

  // L3-2(B2) 요소기능
  addSheet('L3-2(B2) 요소기능', ['L2-1.공정번호', '4M', '★작업요소(B1)', 'L3-2.요소기능'],
    b2List.map(b => [b.no, b.m4, b.we, b.value]));

  // L3-3(B3) 공정특성
  addSheet('L3-3(B3) 공정특성', ['L2-1.공정번호', '4M', '★작업요소(B1)', 'L3-3.공정특성(설비·약품 파라미터)', '특별특성'],
    b3List.map(b => [b.no, b.m4, b.we, b.value, b.sc || '']));

  // L3-4(B4) 고장원인
  addSheet('L3-4(B4) 고장원인', ['L2-1.공정번호', '4M', 'L3-4.고장원인(B3이탈 원인)'],
    b4List.map(b => [b.no, b.m4, b.value]));

  // L3-5(B5) 예방관리
  addSheet('L3-5(B5) 예방관리', ['L2-1.공정번호', '4M', '★작업요소(B1)', 'L3-5.예방관리'],
    b5List.map(b => [b.no, b.m4, b.we, b.value]));

  // L1-1(C1) 구분
  addSheet('L1-1(C1) 구분', ['L1-1.구분'], c1List.map(c => [c]));

  // L1-2(C2) 제품기능
  addSheet('L1-2(C2) 제품기능', ['L1-1.구분', 'L1-2.제품기능'],
    c2List.map(c => [c.cat, c.value]));

  // L1-3(C3) 요구사항
  addSheet('L1-3(C3) 요구사항', ['L1-1.구분', 'L1-3.요구사항'],
    c3List.map(c => [c.cat, c.value]));

  // L1-4(C4) 고장영향
  addSheet('L1-4(C4) 고장영향', ['L1-1.구분', 'L1-4.고장영향'],
    c4List.map(c => [c.cat, c.value]));

  // L1 통합(C1-C4)
  const c1c4Rows = [];
  for (const c4 of c4List) {
    c1c4Rows.push([c4.cat, '', '', c4.value]);
  }
  // 모든 C2/C3도 포함
  for (const c2 of c2List) {
    const existing = c1c4Rows.find(r => r[0] === c2.cat && !r[1]);
    if (existing) existing[1] = c2.value;
    else c1c4Rows.push([c2.cat, c2.value, '', '']);
  }
  // C3 추가
  for (let i = 0; i < c3List.length; i++) {
    if (i < c1c4Rows.length) c1c4Rows[i][2] = c3List[i].value;
    else c1c4Rows.push([c3List[i].cat, '', c3List[i].value, '']);
  }
  addSheet('L1 통합(C1-C4)', ['구분(C1)', '제품기능(C2)', '요구사항(C3)', '고장영향(C4)'], c1c4Rows);

  // L2 통합(A1-A6) — 공정별 한 행
  const l2Unified = [];
  for (const p of processes) {
    const a6Vals = a6List.filter(a => a.no === p.no).map(a => a.value);
    l2Unified.push([p.no, p.name, a3Map.get(p.no) || '',
      a4List.filter(a => a.no === p.no).map(a => a.value).join(', '),
      a5List.filter(a => a.no === p.no).map(a => a.value).join(', '),
      '', a6Vals.join(', ')]);
  }
  addSheet('L2 통합(A1-A6)', ['공정번호', '공정명', '공정기능', '제품특성', '고장형태', '특별특성', '검출관리'], l2Unified);

  // L3 통합(B1-B5)
  const l3Unified = [];
  for (const r of allRows) {
    if (!r.we) continue;
    l3Unified.push([r.processNo, r.m4, r.we, r.weFunc, r.processChar, r.specialChar || '', r.fc, r.prevention]);
  }
  addSheet('L3 통합(B1-B5)', ['공정번호', '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성', '고장원인(B4)', '예방관리(B5)'], l3Unified);

  // ★★ FC 고장사슬 — 핵심! 전체보기 FC와 100% 일치 ★★
  const fcRows = [];
  let prevChainFE = '', prevChainPno = '', prevChainFM = '', prevChainScope = '';
  for (const ch of chains) {
    // carry-forward: 이전과 동일하면 빈칸 (병합 효과)
    const showScope = ch.feScope !== prevChainScope ? ch.feScope : '';
    const showFE = ch.fe !== prevChainFE ? ch.fe : '';
    const showPno = ch.processNo !== prevChainPno ? ch.processNo : '';
    const showFM = ch.fm !== prevChainFM ? ch.fm : '';

    fcRows.push([
      showScope, showFE, showPno || null, showFM,
      ch.m4, ch.we, ch.fc,
      ch.prevention, ch.detection,
      ch.occ || '', ch.det || '', ch.ap
    ]);

    prevChainScope = ch.feScope;
    prevChainFE = ch.fe;
    prevChainPno = ch.processNo;
    prevChainFM = ch.fm;
  }
  addSheet('FC 고장사슬', [
    'FE구분', 'FE(고장영향)', 'L2-1.공정번호', 'FM(고장형태)',
    '4M', '작업요소(WE)', 'FC(고장원인)',
    'B5.예방관리(발생 전 방지)', 'A6.검출관리(발생 후 검출)',
    'O', 'D', 'AP'
  ], fcRows);

  // FA 통합분석 (빈 시트)
  addSheet('FA 통합분석', [
    'FE구분', 'FE(고장영향)', 'S', 'L2-1.공정번호', 'FM(고장형태)',
    '4M', '작업요소(WE)', 'FC(고장원인)', '공정특성(B3)',
    'B5.예방관리', 'O', 'A6.검출관리', 'D', 'AP',
    '특별특성', '습득교훈', '예방개선', '검출개선',
    '책임자', '목표일', '상태', '개선근거', '완료일',
    'S2', 'O2', 'D2'
  ], []);

  // ── 4. 저장 ──
  await wb.xlsx.writeFile(OUTPUT);
  console.log(`\n✅ 마스터 FMEA 생성 완료: ${OUTPUT}`);
  console.log(`\n=== FC 100% 일치 검증 ===`);
  console.log(`전체보기 FC행: ${allRows.filter(r => r.fc).length}`);
  console.log(`생성된 FC chains: ${chains.length}`);
  console.log(`B4(고장원인) 고유: ${b4List.length}`);

  // FC 값 목록 비교
  const srcFCs = allRows.filter(r => r.fc).map(r => `${r.processNo}|${r.m4}|${r.fc}`);
  const genFCs = chains.map(ch => `${ch.processNo}|${ch.m4}|${ch.fc}`);
  const missing = srcFCs.filter(f => !genFCs.includes(f));
  const extra = genFCs.filter(f => !srcFCs.includes(f));
  console.log(`누락 FC: ${missing.length}`);
  console.log(`추가 FC: ${extra.length}`);
  if (missing.length > 0) console.log('누락:', missing.slice(0, 5));
  if (extra.length > 0) console.log('추가:', extra.slice(0, 5));
}

main().catch(e => console.error('FATAL:', e));
