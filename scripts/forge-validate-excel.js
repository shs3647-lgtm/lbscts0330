/**
 * 신규 엑셀 Import 파일 사전 검증 스크립트
 * 지침서 Section 7-5 데이터 무결성 체크리스트 기반
 */
const ExcelJS = require('exceljs');
const path = require('path');

const FILE = String.raw`D:\00 fmea개발\00_LB세미콘FMEA\등록양식\new115_00_260327_PFMEA_Master_v5.xlsx`;

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  
  console.log('═══════════════════════════════════════════');
  console.log('📋 시트 목록:');
  wb.eachSheet((ws, id) => console.log(`  ${id}: "${ws.name}" (${ws.rowCount}행)`));
  console.log('');
  
  // 시트 찾기 (패턴)
  let l1, l2, l3, fc;
  wb.eachSheet(ws => {
    const n = ws.name;
    if (n.includes('L1') && n.includes('통합')) l1 = ws;
    if (n.includes('L2') && n.includes('통합')) l2 = ws;
    if (n.includes('L3') && n.includes('통합')) l3 = ws;
    if (n.includes('FC') && n.includes('고장사슬')) fc = ws;
  });
  
  const errors = [];
  const warnings = [];
  
  // ── L1 검증 ──
  if (!l1) { errors.push('L1 시트 없음'); } else {
    const rows = [];
    l1.eachRow((row, rn) => {
      if (rn === 1) return; // 헤더
      const c1 = String(row.getCell(1).value || '').trim();
      const c2 = String(row.getCell(2).value || '').trim();
      const c3 = String(row.getCell(3).value || '').trim();
      const c4 = String(row.getCell(4).value || '').trim();
      if (c1) rows.push({ rn, c1, c2, c3, c4 });
    });
    console.log(`✅ L1: ${rows.length}행 (유효행, C1 notna 기준)`);
    
    // C4 고유 검증
    const c4Values = rows.filter(r => r.c4).map(r => r.c4);
    const c4Unique = new Set(c4Values);
    if (c4Values.length !== c4Unique.size) {
      const dupes = c4Values.filter((v, i, arr) => arr.indexOf(v) !== i);
      errors.push(`L1 C4 중복 발견 (${c4Values.length}행, ${c4Unique.size}고유): ${[...new Set(dupes)].slice(0, 3).join(', ')}`);
    } else {
      console.log(`  C4 고장영향: ${c4Values.length}행 = ${c4Unique.size}고유 ✅`);
    }
  }
  
  // ── L2 검증 ──
  if (!l2) { errors.push('L2 시트 없음'); } else {
    const rows = [];
    l2.eachRow((row, rn) => {
      if (rn === 1) return;
      const a1 = String(row.getCell(1).value || '').trim();
      const a4 = String(row.getCell(4).value || '').trim();
      const a5 = String(row.getCell(6).value || '').trim();
      const a6 = String(row.getCell(7).value || '').trim();
      if (a1) rows.push({ rn, a1, a4, a5, a6 });
    });
    console.log(`✅ L2: ${rows.length}행 (유효행, A1 notna 기준)`);
    
    // A5 고유 검증
    const a5Values = rows.filter(r => r.a5).map(r => r.a5);
    const a5Unique = new Set(a5Values);
    if (a5Values.length !== a5Unique.size) {
      const dupes = a5Values.filter((v, i, arr) => arr.indexOf(v) !== i);
      errors.push(`L2 A5 중복 발견 (${a5Values.length}행, ${a5Unique.size}고유): ${[...new Set(dupes)].slice(0, 3).join(', ')}`);
    } else {
      console.log(`  A5 고장형태: ${a5Values.length}행 = ${a5Unique.size}고유 ✅`);
    }
    
    // 공정번호 통계
    const pnos = new Set(rows.map(r => r.a1));
    console.log(`  A1 공정번호: ${pnos.size}고유/${rows.length}행`);
  }
  
  // ── L3 검증 ──
  if (!l3) { errors.push('L3 시트 없음'); } else {
    const rows = [];
    l3.eachRow((row, rn) => {
      if (rn === 1) return;
      const pno = String(row.getCell(1).value || '').trim();
      const m4 = String(row.getCell(2).value || '').trim();
      const b1 = String(row.getCell(3).value || '').trim();
      const b4 = String(row.getCell(7).value || '').trim();
      const b5 = String(row.getCell(8).value || '').trim();
      if (pno) rows.push({ rn, pno, m4, b1, b4, b5 });
    });
    console.log(`✅ L3: ${rows.length}행 (유효행, processNo notna 기준)`);
    
    // B4 통계
    const b4Rows = rows.filter(r => r.b4);
    const b4Texts = b4Rows.map(r => r.b4);
    const b4Unique = new Set(b4Texts);
    console.log(`  B4 고장원인: ${b4Rows.length}행, ${b4Unique.size}텍스트고유`);
    if (b4Rows.length < rows.length) {
      warnings.push(`L3 B4 빈값 ${rows.length - b4Rows.length}행 (${rows.length}행 중)`);
    }
    
    // B4 텍스트 Set (FC 매칭용)
    global.l3B4Set = new Set(b4Texts);
    global.l3B4Count = b4Rows.length;
  }
  
  // ── FC 검증 ──
  if (!fc) { errors.push('FC 시트 없음'); } else {
    // 헤더 확인
    const hdr = [];
    fc.getRow(1).eachCell((cell, col) => hdr.push({ col, val: String(cell.value || '').trim() }));
    console.log(`✅ FC 헤더: ${hdr.map(h => h.val).join(' | ')}`);
    
    const rows = [];
    let prevFE = '', prevFM = '', prevPno = '', prevScope = '';
    fc.eachRow((row, rn) => {
      if (rn === 1) return;
      let scope = String(row.getCell(1).value || '').trim();
      let fe = String(row.getCell(2).value || '').trim();
      let pno = String(row.getCell(3).value || '').trim();
      let fm = String(row.getCell(4).value || '').trim();
      const m4 = String(row.getCell(5).value || '').trim();
      const we = String(row.getCell(6).value || '').trim();
      const fcText = String(row.getCell(7).value || '').trim();
      const b5 = String(row.getCell(8).value || '').trim();
      const a6 = String(row.getCell(9).value || '').trim();
      
      // forward-fill
      if (!scope && prevScope) scope = prevScope;
      if (!fe && prevFE) fe = prevFE;
      if (!pno && prevPno) pno = prevPno;
      if (!fm && prevFM) fm = prevFM;
      if (String(row.getCell(1).value || '').trim()) prevScope = scope;
      if (String(row.getCell(2).value || '').trim()) prevFE = fe;
      if (String(row.getCell(3).value || '').trim()) prevPno = pno;
      if (String(row.getCell(4).value || '').trim()) prevFM = fm;
      
      if (fcText) rows.push({ rn, scope, fe, pno, fm, m4, we, fc: fcText, b5, a6 });
    });
    console.log(`  FC: ${rows.length} 유효행 (FC notna 기준)`);
    
    // FC↔L3.B4 매칭 검증
    if (global.l3B4Set) {
      const fcTexts = new Set(rows.map(r => r.fc));
      const missingInL3 = [...fcTexts].filter(t => !global.l3B4Set.has(t));
      const missingInFC = [...global.l3B4Set].filter(t => !fcTexts.has(t));
      
      if (missingInL3.length > 0) {
        errors.push(`FC에는 있지만 L3 B4에 없는 텍스트 ${missingInL3.length}건: ${missingInL3.slice(0, 5).join(' | ')}`);
      }
      if (missingInFC.length > 0) {
        errors.push(`L3 B4에는 있지만 FC에 없는 텍스트 ${missingInFC.length}건: ${missingInFC.slice(0, 5).join(' | ')}`);
      }
      if (missingInL3.length === 0 && missingInFC.length === 0) {
        console.log(`  FC↔L3.B4 텍스트 완전 매칭 ✅ (${fcTexts.size}고유 ↔ ${global.l3B4Set.size}고유)`);
      }
    }
    
    // FC 행수 = L3 B4 행수 검증
    if (global.l3B4Count && rows.length !== global.l3B4Count) {
      warnings.push(`FC 유효행(${rows.length}) ≠ L3 B4 행(${global.l3B4Count})`);
    } else if (global.l3B4Count) {
      console.log(`  FC 행수(${rows.length}) = L3 B4 행수(${global.l3B4Count}) ✅`);
    }
    
    // origRow 존재 여부
    const hasOrigRow = hdr.some(h => h.val.includes('origRow') || h.val.includes('원본행'));
    console.log(`  origRow 컬럼: ${hasOrigRow ? '있음 (행번호 매칭)' : '없음 (텍스트 매칭 모드)'}`);

    // ── FC↔L2 FM 교차검증 ──
    if (l2) {
      const l2FMs = [];
      l2.eachRow((row, rn) => {
        if (rn === 1) return;
        const a1 = String(row.getCell(1).value || '').trim();
        const a5 = String(row.getCell(6).value || '').trim();
        if (a1 && a5) l2FMs.push({ rn, pno: a1, fm: a5 });
      });
      const fcFMSet = new Set(rows.map(r => r.fm));
      const l2Only = l2FMs.filter(x => !fcFMSet.has(x.fm));
      const fcOnly = [...fcFMSet].filter(fm => !l2FMs.some(x => x.fm === fm));

      if (l2Only.length > 0) {
        errors.push(`L2에 있지만 FC에 없는 FM ${l2Only.length}건:`);
        l2Only.forEach(x => errors.push(`  L2 R${x.rn} 공정${x.pno}: "${x.fm.substring(0, 45)}"`));
      }
      if (fcOnly.length > 0) {
        warnings.push(`FC에 있지만 L2에 없는 FM ${fcOnly.length}건:`);
        fcOnly.forEach(fm => warnings.push(`  "${fm.substring(0, 45)}"`));
      }
      if (l2Only.length === 0 && fcOnly.length === 0) {
        console.log(`  FC↔L2 FM 완전 매칭 ✅ (${l2FMs.length}건)`);
      }
      console.log(`  L2 FM: ${l2FMs.length}건, FC FM 고유: ${fcFMSet.size}건`);
    }

    // ── FC↔L1 FE 교차검증 ──
    if (l1) {
      const l1FEs = [];
      l1.eachRow((row, rn) => {
        if (rn === 1) return;
        const c4 = String(row.getCell(4).value || '').trim();
        if (c4) l1FEs.push({ rn, fe: c4 });
      });
      const fcFESet = new Set(rows.map(r => r.fe));
      const l1Only = l1FEs.filter(x => !fcFESet.has(x.fe));
      const fcFeOnly = [...fcFESet].filter(fe => !l1FEs.some(x => x.fe === fe));

      if (l1Only.length > 0) {
        warnings.push(`L1에 있지만 FC에 없는 FE ${l1Only.length}건:`);
        l1Only.forEach(x => warnings.push(`  L1 R${x.rn}: "${x.fe.substring(0, 45)}"`));
      }
      if (fcFeOnly.length > 0) {
        warnings.push(`FC에 있지만 L1에 없는 FE ${fcFeOnly.length}건:`);
        fcFeOnly.forEach(fe => warnings.push(`  "${fe.substring(0, 45)}"`));
      }
      if (l1Only.length === 0 && fcFeOnly.length === 0) {
        console.log(`  FC↔L1 FE 완전 매칭 ✅ (${l1FEs.length}건)`);
      }
    }
  }
  
  // ── 결과 ──
  console.log('\n═══════════════════════════════════════════');
  if (errors.length > 0) {
    console.log('❌ 오류:');
    errors.forEach(e => console.log(`  ❌ ${e}`));
  }
  if (warnings.length > 0) {
    console.log('⚠️ 경고:');
    warnings.forEach(w => console.log(`  ⚠️ ${w}`));
  }
  if (errors.length === 0) {
    console.log('✅ Import 사전 검증 PASS — 오류 없음');
  }
}

main().catch(e => console.error('스크립트 오류:', e.message));
