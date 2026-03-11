/**
 * PFMEA 마스터 데이터 시드 스크립트
 * NEW자전거기초정보.xlsx → flatData → POST /api/pfmea/master
 */
const XLSX = require('xlsx');
const path = require('path');
const http = require('http');

const FMEA_ID = process.argv[2] || 'PFM26-M001';
const FILE_PATH = path.join(__dirname, '..', 'NEW자전거기초정보.xlsx');

// 시트 이름 → itemCode 매핑
const SHEET_TO_CODE = {
  'L2-1 공정번호': 'A1',
  'L2-3 공정기능': 'A3',
  'L2-4 제품특성': 'A4',
  'L2-5 고장형태': 'A5',
  'L2-6 검출관리': 'A6',
  'L3-1 작업요소': 'B1',
  'L3-2 요소기능': 'B2',
  'L3-3 공정특성': 'B3',
  'L3-4 고장원인': 'B4',
  'L3-5 예방관리': 'B5',
  'L1-1 구분': 'C1',
  'L1-2 제품기능': 'C2',
  'L1-3 요구사항': 'C3',
  'L1-4 고장영향': 'C4',
};

// itemCode → category 매핑
function getCategory(code) {
  if (code.startsWith('A')) return 'A';
  if (code.startsWith('B')) return 'B';
  if (code.startsWith('C')) return 'C';
  return 'A';
}

// 무시할 값들
const SKIP_VALUES = new Set(['', 'null', 'undefined', '(필수)', '(선택)']);

function isSkipValue(v) {
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  return SKIP_VALUES.has(s) || s.includes('공정번호') || s.includes('구분');
}

// 엑셀 읽기
console.log(`Reading: ${FILE_PATH}`);
const wb = XLSX.readFile(FILE_PATH);
console.log(`Sheets: ${wb.SheetNames.length}`);

const flatData = [];

for (const sheetName of wb.SheetNames) {
  const itemCode = SHEET_TO_CODE[sheetName];
  if (!itemCode) {
    console.log(`  Skip: "${sheetName}" (no mapping)`);
    continue;
  }

  const category = getCategory(itemCode);
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // 첫 행은 헤더 → 스킵
  let lastProcessNo = '';
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    if (itemCode === 'C1') {
      // L1-1 구분: 1컬럼 (구분값)
      const val = String(row[0] || '').trim();
      if (!val || isSkipValue(val)) continue;
      flatData.push({ processNo: val, category, itemCode, value: val });
    } else if (itemCode === 'A1') {
      // L2-1 공정번호: col0=번호, col1=공정명 (→ A2)
      const pno = String(row[0] || '').trim();
      const pname = String(row[1] || '').trim();
      if (!pno || pno === '0') continue;
      // A1 = 공정번호 자체
      flatData.push({ processNo: pno, category: 'A', itemCode: 'A1', value: pno });
      // A2 = 공정명
      if (pname && !isSkipValue(pname)) {
        flatData.push({ processNo: pno, category: 'A', itemCode: 'A2', value: pname });
      }
    } else if (itemCode === 'B1') {
      // L3-1 작업요소: col0=공정번호, col1=4M, col2=작업요소 (3컬럼)
      //                또는 col0=공정번호, col1=작업요소 (2컬럼)
      let pno, m4, val;
      if (row.length >= 3 && ['MN', 'MC', 'MD', 'JG', 'IM', 'EN'].includes(String(row[1]).trim().toUpperCase())) {
        pno = String(row[0] || '').trim();
        m4 = String(row[1]).trim().toUpperCase();
        val = String(row[2] || '').trim();
      } else {
        pno = String(row[0] || '').trim();
        m4 = '';
        val = String(row[1] || '').trim();
      }
      // MD/JG → MC 변환
      if (m4 === 'MD' || m4 === 'JG') m4 = 'MC';
      if (pno) lastProcessNo = pno;
      else pno = lastProcessNo;
      if (!val || isSkipValue(val)) continue;
      const item = { processNo: pno || '00', category, itemCode, value: val };
      if (m4) item.m4 = m4;
      flatData.push(item);
    } else if (category === 'C') {
      // C2/C3/C4: col0=구분, col1~N=값
      let key = String(row[0] || '').trim();
      if (key) lastProcessNo = key;
      else key = lastProcessNo;
      for (let c = 1; c < row.length; c++) {
        const val = String(row[c] || '').trim();
        if (!val || isSkipValue(val)) continue;
        flatData.push({ processNo: key, category, itemCode, value: val });
      }
    } else {
      // A3~A6, B2~B5: col0=공정번호, col1~N=값
      let pno = String(row[0] || '').trim();
      if (pno) lastProcessNo = pno;
      else pno = lastProcessNo;
      for (let c = 1; c < row.length; c++) {
        const val = String(row[c] || '').trim();
        if (!val || isSkipValue(val)) continue;
        flatData.push({ processNo: pno || '00', category, itemCode, value: val });
      }
    }
  }
  console.log(`  ${sheetName} → ${itemCode}: processed`);
}

// 중복 제거
const seen = new Set();
const uniqueData = flatData.filter(item => {
  const key = `${item.processNo}|${item.itemCode}|${item.value.toLowerCase()}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

console.log(`\nTotal items: ${flatData.length} → deduplicated: ${uniqueData.length}`);

// itemCode별 카운트
const counts = {};
uniqueData.forEach(d => { counts[d.itemCode] = (counts[d.itemCode] || 0) + 1; });
console.log('Per itemCode:', JSON.stringify(counts));

// API 전송
const requestBody = {
  name: 'MASTER',
  setActive: true,
  replace: true,
  sourceFmeaId: FMEA_ID.toLowerCase(),
  flatData: uniqueData,
};

const body = JSON.stringify(requestBody);
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/pfmea/master',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  },
};

console.log(`\nSending to POST /api/pfmea/master (sourceFmeaId=${FMEA_ID})...`);

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    try {
      const json = JSON.parse(data);
      console.log('Success:', json.success);
      if (json.dataset) console.log('Dataset:', json.dataset.id, json.dataset.name);
      if (json.error) console.log('Error:', json.error);
    } catch (e) {
      console.log('Response:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(body);
req.end();
