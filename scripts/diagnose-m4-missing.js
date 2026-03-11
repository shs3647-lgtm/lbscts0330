/**
 * @file diagnose-m4-missing.js
 * @description STEP B Excel에서 B1(작업요소) 항목의 4M 누락 진단
 *
 * "누락 1건" 근본 원인 분석용
 */

const XLSX = require('xlsx');

const INPUT_PATH = 'D:/00 SMART FMEA TUTOR/티앤에프/PFMEA STEP B_Import용.xlsx';
const ORIGINAL_PATH = 'D:/00 SMART FMEA TUTOR/티앤에프/PFMEA STEP B.xls';

function analyzeStepB(filePath) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`분석 파일: ${filePath}`);
  console.log('='.repeat(60));

  let wb;
  try {
    wb = XLSX.readFile(filePath);
  } catch (e) {
    console.log(`파일 읽기 실패: ${e.message}`);
    return;
  }

  const ws = wb.Sheets['fmea result'];
  if (!ws) {
    console.log('시트 "fmea result" 없음');
    return;
  }

  const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const HEADER_ROWS = 11;
  const dataRows = rawData.slice(HEADER_ROWS).map(r => [...r]);

  // Forward Fill (병합셀 복원)
  const ffCols = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  for (const c of ffCols) {
    let prev = '';
    for (let i = 0; i < dataRows.length; i++) {
      const v = String(dataRows[i][c] || '').trim();
      if (v) prev = v;
      else dataRows[i][c] = prev;
    }
  }

  // STEP B 컬럼 매핑 (fmea result 시트):
  // col 2 = 구분(L1-1)
  // col 3 = 공정번호+공정명
  // col 4 = 공정유형
  // col 5 = 4M (MN/MC/IM/EN)
  // col 6 = 작업요소명 (B1)
  // col 7 = 작업내용/기능 (B2)
  // col 8 = 공정특성 (B3)
  // ...

  // 실제 헤더 확인
  console.log('\n[헤더 행 확인]');
  for (let h = 8; h <= 10; h++) {
    const hRow = rawData[h] || [];
    console.log(`  행${h}: ${hRow.slice(0, 10).map((v, i) => `[${i}]${String(v).substring(0, 15)}`).join(' | ')}`);
  }

  // 4M + 작업요소 분석
  console.log('\n[4M + 작업요소(B1) 분석]');

  const processMap = new Map(); // processNo → { name, workElements: [{m4, name, rowIdx}] }
  const m4Stats = { MN: 0, MC: 0, IM: 0, EN: 0, empty: 0, other: 0 };
  const problemRows = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const procStr = String(r[3] || '').trim();
    const m4Raw = String(r[5] || '').trim().toUpperCase();
    const weName = String(r[6] || '').trim();

    if (!procStr) continue;

    // 공정번호 추출
    const pm = procStr.match(/^(\d+)번/);
    if (!pm) continue;
    const pNo = pm[1];

    // 4M 정규화
    let m4 = m4Raw;
    if (m4 === 'MD' || m4 === 'JG') m4 = 'MC';

    const isValid4M = ['MN', 'MC', 'IM', 'EN'].includes(m4);

    if (isValid4M) {
      m4Stats[m4]++;
    } else if (m4 === '') {
      m4Stats.empty++;
    } else {
      m4Stats.other++;
    }

    if (!processMap.has(pNo)) {
      processMap.set(pNo, { name: procStr, workElements: new Set() });
    }

    // 작업요소 (고유한 이름)
    if (weName && !weName.includes('공정번호') && !weName.includes('L2-') && !weName.includes('L3-')) {
      const weKey = `${pNo}|${m4}|${weName}`;
      const proc = processMap.get(pNo);
      if (!proc.workElements.has(weKey)) {
        proc.workElements.add(weKey);

        // 문제 감지: 작업요소명이 있지만 4M이 없거나 유효하지 않음
        if (!isValid4M) {
          problemRows.push({
            rowIdx: i + HEADER_ROWS + 1,
            processNo: pNo,
            processName: procStr,
            m4Raw: m4Raw || '(빈값)',
            m4Normalized: m4 || '(빈값)',
            weName: weName,
            isValid4M: false,
          });
        }
      }
    }
  }

  console.log('\n[4M 통계]');
  console.log(`  MN(사람): ${m4Stats.MN}건`);
  console.log(`  MC(설비): ${m4Stats.MC}건`);
  console.log(`  IM(부자재): ${m4Stats.IM}건`);
  console.log(`  EN(환경): ${m4Stats.EN}건`);
  console.log(`  빈값: ${m4Stats.empty}건`);
  console.log(`  기타: ${m4Stats.other}건`);

  console.log(`\n[공정별 작업요소 수]`);
  for (const [pNo, proc] of processMap) {
    console.log(`  ${pNo}번: ${proc.workElements.size}개 작업요소`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[문제 발견: 4M 누락 작업요소] — ${problemRows.length}건`);
  console.log('='.repeat(60));

  if (problemRows.length === 0) {
    console.log('  ✅ 모든 작업요소에 유효한 4M이 있습니다.');
    console.log('  → 문제는 Import 파이프라인 또는 DB 저장/로드 경로에 있을 수 있습니다.');
  } else {
    problemRows.forEach((p, idx) => {
      console.log(`  [${idx + 1}] 행${p.rowIdx}: 공정 ${p.processNo}번 "${p.processName}"`);
      console.log(`      작업요소명: "${p.weName}"`);
      console.log(`      4M 원본값: "${p.m4Raw}" → 정규화: "${p.m4Normalized}"`);
      console.log(`      → 이 항목이 "누락 1건"의 원인일 가능성 높음`);
    });
  }

  // STEP B에서 col 5의 모든 고유값 확인
  console.log('\n[col5 (4M 컬럼) 고유값 목록]');
  const uniqueM4 = new Set();
  for (let i = 0; i < dataRows.length; i++) {
    const v = String(dataRows[i][5] || '').trim();
    if (v) uniqueM4.add(v);
  }
  console.log(`  ${[...uniqueM4].join(', ')}`);
}

// 두 파일 모두 분석
analyzeStepB(ORIGINAL_PATH);
analyzeStepB(INPUT_PATH);
