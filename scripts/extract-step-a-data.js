/**
 * @file extract-step-a-data.js
 * @description STEP A 엑셀에서 C3(요구사항), A4(제품특성), B3(공정특성) 추출
 *
 * STEP A 열 구조 (행 9):
 *   [2] 완제품명    [3] 공정NO+공정명   [4] 4M   [5] 작업요소
 *   [6] 구분(C1)    [7] 완제품기능(C2)   [8] 요구사항(C3)
 *   [9] 공정기능(A3) [10] 제품특성(A4)
 *   [11] 4M  [12] 작업요소  [13] 작업요소기능(B2)  [14] 공정특성(B3)
 *   [15] 구분(FE)   [16] FE  [17] FM  [18] 4M  [19] 작업요소  [20] FC
 */

const XLSX = require('xlsx');

const file = 'D:\\00 SMART FMEA TUTOR\\티앤에프\\PFMEA STEP A (2).xls';
const wb = XLSX.readFile(file);
const ws = wb.Sheets['fmea result'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('=== STEP A 데이터 추출 ===');
console.log('전체 행: ' + data.length);

// Forward fill 변수
let lastC1 = '', lastC2 = '', lastC3 = '';
let lastA1 = '', lastA3 = '', lastA4 = '';
let lastM4_struct = '', lastWE_struct = '';
let lastM4_func = '', lastWE_func = '', lastB2 = '', lastB3 = '';

// 데이터 수집
const c3Items = new Map(); // processNo(C1) → Set<요구사항>
const a4Items = new Map(); // processNo(공정번호) → Set<제품특성>
const b3Items = new Map(); // processNo+m4 → Set<공정특성>

const dataStartRow = 10; // 행 10부터 데이터

for (let i = dataStartRow; i < data.length; i++) {
  const row = data[i];
  if (!row) continue;

  // Forward Fill 적용
  const c1 = (row[6] !== undefined && row[6] !== null && String(row[6]).trim()) ? String(row[6]).trim() : lastC1;
  const c2 = (row[7] !== undefined && row[7] !== null && String(row[7]).trim()) ? String(row[7]).trim() : lastC2;
  const c3 = (row[8] !== undefined && row[8] !== null && String(row[8]).trim()) ? String(row[8]).trim() : '';
  const procStr = (row[3] !== undefined && row[3] !== null && String(row[3]).trim()) ? String(row[3]).trim() : lastA1;
  const a3 = (row[9] !== undefined && row[9] !== null && String(row[9]).trim()) ? String(row[9]).trim() : '';
  const a4 = (row[10] !== undefined && row[10] !== null && String(row[10]).trim()) ? String(row[10]).trim() : '';
  const m4_func = (row[11] !== undefined && row[11] !== null && String(row[11]).trim()) ? String(row[11]).trim() : lastM4_func;
  const b2 = (row[13] !== undefined && row[13] !== null && String(row[13]).trim()) ? String(row[13]).trim() : '';
  const b3 = (row[14] !== undefined && row[14] !== null && String(row[14]).trim()) ? String(row[14]).trim() : '';

  // Forward Fill 업데이트
  if (row[6] !== undefined && row[6] !== null && String(row[6]).trim()) lastC1 = c1;
  if (row[7] !== undefined && row[7] !== null && String(row[7]).trim()) lastC2 = c2;
  if (row[3] !== undefined && row[3] !== null && String(row[3]).trim()) lastA1 = procStr;
  if (row[11] !== undefined && row[11] !== null && String(row[11]).trim()) lastM4_func = m4_func;

  // 공정번호 추출 (10번-자재입고 → 10)
  const procNo = procStr.match(/^(\d+)/)?.[1] || '';

  // C3 수집
  if (c3 && c1) {
    // C1 값을 processNo로 변환
    let procName = '';
    if (c1.includes('Your') || c1 === 'YP') procName = 'YP';
    else if (c1.includes('Ship') || c1 === 'SP') procName = 'SP';
    else if (c1.includes('End') || c1 === 'USER' || c1.toLowerCase().includes('user')) procName = 'USER';
    else procName = c1;

    if (procName) {
      if (!c3Items.has(procName)) c3Items.set(procName, new Set());
      c3Items.get(procName).add(c3);
    }
  }

  // A4 수집
  if (a4 && procNo) {
    const isPlaceholder = a4.includes('추가') || a4.includes('클릭') || a4.includes('선택') || a4 === '-';
    if (!isPlaceholder) {
      if (!a4Items.has(procNo)) a4Items.set(procNo, new Set());
      a4Items.get(procNo).add(a4);
    }
  }

  // B3 수집
  if (b3 && procNo && m4_func) {
    const isPlaceholder = b3.includes('추가') || b3.includes('클릭') || b3.includes('선택') || b3 === '-';
    if (!isPlaceholder) {
      const key = procNo + '_' + m4_func;
      if (!b3Items.has(key)) b3Items.set(key, new Set());
      b3Items.get(key).add(b3);
    }
  }
}

// 결과 출력
console.log('\n=== C3 (요구사항) ===');
for (const [proc, vals] of c3Items) {
  console.log('  [' + proc + '] ' + vals.size + '개');
  for (const v of vals) {
    console.log('    "' + v + '"');
  }
}

console.log('\n=== A4 (제품특성) ===');
for (const [proc, vals] of a4Items) {
  console.log('  [공정 ' + proc + '] ' + vals.size + '개');
  for (const v of vals) {
    console.log('    "' + v.substring(0, 80) + '"');
  }
}

console.log('\n=== B3 (공정특성) ===');
for (const [key, vals] of b3Items) {
  console.log('  [' + key + '] ' + vals.size + '개');
  for (const v of vals) {
    console.log('    "' + v.substring(0, 80) + '"');
  }
}

// 통계
console.log('\n=== 통계 ===');
let totalC3 = 0, totalA4 = 0, totalB3 = 0;
for (const v of c3Items.values()) totalC3 += v.size;
for (const v of a4Items.values()) totalA4 += v.size;
for (const v of b3Items.values()) totalB3 += v.size;
console.log('C3 (요구사항): ' + totalC3 + '개 (' + c3Items.size + '개 구분)');
console.log('A4 (제품특성): ' + totalA4 + '개 (' + a4Items.size + '개 공정)');
console.log('B3 (공정특성): ' + totalB3 + '개 (' + b3Items.size + '개 공정+4M)');

// JSON 형태로 출력 (DB 주입용)
console.log('\n=== JSON 출력 (DB 주입용) ===');
const c3Json = {};
for (const [k, v] of c3Items) c3Json[k] = [...v];
console.log('C3:', JSON.stringify(c3Json, null, 2));

const a4Json = {};
for (const [k, v] of a4Items) a4Json[k] = [...v];
console.log('\nA4:', JSON.stringify(a4Json, null, 2));

const b3Json = {};
for (const [k, v] of b3Items) b3Json[k] = [...v];
console.log('\nB3:', JSON.stringify(b3Json, null, 2));
