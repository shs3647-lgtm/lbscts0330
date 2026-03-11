/**
 * @file inject-step-a-data.js
 * @description STEP A 엑셀에서 C3(요구사항), A4(제품특성), B3(공정특성) 추출 → DB 주입
 *
 * 사용법: node scripts/inject-step-a-data.js "D:\00 SMART FMEA TUTOR\티앤에프\PFMEA STEP A (2).xls" pfm26-p006-l07
 *
 * STEP A 열 구조 (행 9, 0-based):
 *   [2] 완제품명    [3] 공정NO+공정명   [4] 4M구조   [5] 작업요소
 *   [6] 구분(C1)    [7] 완제품기능(C2)   [8] 요구사항(C3)
 *   [9] 공정기능(A3) [10] 제품특성(A4)
 *   [11] 4M기능  [12] 작업요소  [13] 작업요소기능(B2)  [14] 공정특성(B3)
 *   [15] 구분(FE)  [16] FE  [17] FM  [18] 4M  [19] 작업요소  [20] FC
 */

const XLSX = require('xlsx');
const { Pool } = require('pg');
const crypto = require('crypto');

const uid = () => crypto.randomUUID().substring(0, 12);

// CLI 인자
const excelPath = process.argv[2] || 'D:\\00 SMART FMEA TUTOR\\티앤에프\\PFMEA STEP A (2).xls';
const fmeaId = process.argv[3] || 'pfm26-p006-l07';

const p = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

/**
 * STEP A 단일 시트에서 모든 아이템 추출 (Forward Fill 적용)
 */
function parseStepA(filePath) {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]]; // 첫 시트
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // 헤더 행 찾기 (공정번호/공정명/4M/작업요소 키워드)
  let headerRow = -1;
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const row = data[i] || [];
    const rowText = row.map(c => String(c || '')).join(' ').toLowerCase();
    if ((rowText.includes('4m') || rowText.includes('m4')) &&
        (rowText.includes('작업요소') || rowText.includes('공정')) &&
        (rowText.includes('구분') || rowText.includes('완제품'))) {
      headerRow = i;
      break;
    }
  }

  if (headerRow < 0) {
    console.error('❌ 헤더 행을 찾을 수 없습니다');
    return { items: [], c3Map: {}, a4Map: {}, b3Map: {} };
  }

  console.log('[파서] 헤더 행: ' + headerRow);
  const headers = (data[headerRow] || []).map(c => String(c || '').trim().toLowerCase());

  // 열 매핑 감지
  const colMap = {};
  const kwMap = [
    { kws: ['완제품명', '완제품 공정명', '완제품'], code: 'L1_NAME' },
    { kws: ['공정no', '공정번호'], code: 'A1' },
    { kws: ['구분'], code: 'C1', multiple: true },
    { kws: ['완제품기능', '제품기능'], code: 'C2' },
    { kws: ['요구사항'], code: 'C3' },
    { kws: ['메인공정 기능', '메인공정기능', '공정 기능', '공정기능'], code: 'A3' },
    { kws: ['제품특성'], code: 'A4' },
    { kws: ['작업요소기능', '요소기능'], code: 'B2' },
    { kws: ['공정특성'], code: 'B3' },
    { kws: ['고장영향'], code: 'C4' },
    { kws: ['고장형태'], code: 'A5' },
    { kws: ['고장원인'], code: 'B4' },
    { kws: ['예방관리'], code: 'B5' },
    { kws: ['검출관리'], code: 'A6' },
  ];

  // 4M 열과 작업요소 열 감지 (여러 개 있을 수 있음)
  const m4Cols = [];
  const weCols = [];

  headers.forEach((h, idx) => {
    if (h === '4m' || h === 'm4') m4Cols.push(idx);
    if (h === '작업요소') weCols.push(idx);

    for (const { kws, code, multiple } of kwMap) {
      if (kws.some(kw => h.includes(kw))) {
        if (multiple && colMap[code] !== undefined) {
          // 같은 코드가 여러 열에 있으면 (구분 등) — 첫 번째만 사용
        } else if (colMap[code] === undefined) {
          colMap[code] = idx;
        }
      }
    }
  });

  // 4M 열 할당: 구조용(첫번째), 기능용(두번째), 고장용(세번째)
  const m4Struct = m4Cols[0] !== undefined ? m4Cols[0] : -1;
  const m4Func = m4Cols[1] !== undefined ? m4Cols[1] : -1;
  const m4Failure = m4Cols[2] !== undefined ? m4Cols[2] : -1;

  // 작업요소 열 할당
  const weStruct = weCols[0] !== undefined ? weCols[0] : -1;
  const weFunc = weCols[1] !== undefined ? weCols[1] : -1;
  const weFailure = weCols[2] !== undefined ? weCols[2] : -1;

  console.log('[열 매핑]', JSON.stringify(colMap, null, 2));
  console.log('[4M 열]', { struct: m4Struct, func: m4Func, failure: m4Failure });

  // 데이터 파싱 (Forward Fill 적용)
  const items = [];
  const c3Map = {}; // processNo(C1) → Set<요구사항>
  const a4Map = {}; // processNo(공정번호) → Set<제품특성>
  const b3Map = {}; // processNo_m4 → Set<공정특성>

  // Forward Fill 변수
  let lastVals = {};

  const dataStart = headerRow + 1;
  for (let i = dataStart; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    // Forward Fill 적용 함수
    function getVal(colIdx, ffKey) {
      if (colIdx < 0) return '';
      const raw = row[colIdx];
      const val = (raw !== undefined && raw !== null) ? String(raw).trim() : '';
      if (val) {
        lastVals[ffKey] = val;
        return val;
      }
      return lastVals[ffKey] || '';
    }

    // 값 추출
    const procStr = getVal(colMap['A1'] !== undefined ? colMap['A1'] : 3, 'A1');
    const procNo = procStr.match(/^(\d+)/)?.[1] || '';

    const c1Raw = getVal(colMap['C1'] !== undefined ? colMap['C1'] : 6, 'C1');
    // C1 값을 표준화 (Your Plant → YP, Ship to Plant → SP, End User → USER)
    let c1 = c1Raw;
    if (c1Raw.includes('Your') || c1Raw === 'YP') c1 = 'YP';
    else if (c1Raw.includes('Ship') || c1Raw === 'SP') c1 = 'SP';
    else if (c1Raw.includes('End') || c1Raw.toLowerCase().includes('user') || c1Raw === 'USER') c1 = 'USER';

    const c2 = getVal(colMap['C2'] !== undefined ? colMap['C2'] : 7, 'C2');
    const c3 = (colMap['C3'] !== undefined && row[colMap['C3']]) ? String(row[colMap['C3']]).trim() : '';
    const a3 = (colMap['A3'] !== undefined && row[colMap['A3']]) ? String(row[colMap['A3']]).trim() : '';
    const a4 = (colMap['A4'] !== undefined && row[colMap['A4']]) ? String(row[colMap['A4']]).trim() : '';
    const m4FuncVal = m4Func >= 0 ? getVal(m4Func, 'm4Func') : '';
    const b2 = (colMap['B2'] !== undefined && row[colMap['B2']]) ? String(row[colMap['B2']]).trim() : '';
    const b3 = (colMap['B3'] !== undefined && row[colMap['B3']]) ? String(row[colMap['B3']]).trim() : '';
    const m4StructVal = m4Struct >= 0 ? getVal(m4Struct, 'm4Struct') : '';
    const weStructVal = weStruct >= 0 ? getVal(weStruct, 'weStruct') : '';

    // Placeholder 값 필터링
    function isPlaceholder(v) {
      if (!v) return true;
      const t = v.trim();
      return t === '' || t === '-' || t.includes('추가') || t.includes('클릭') ||
        t.includes('선택') || t.includes('입력') || t.includes('항목추가');
    }

    // C3 수집 (요구사항)
    if (c3 && !isPlaceholder(c3) && c1) {
      if (!c3Map[c1]) c3Map[c1] = new Set();
      c3Map[c1].add(c3);
      items.push({
        processNo: c1,
        category: 'C',
        itemCode: 'C3',
        value: c3,
      });
    }

    // A4 수집 (제품특성)
    if (a4 && !isPlaceholder(a4) && procNo) {
      if (!a4Map[procNo]) a4Map[procNo] = new Set();
      a4Map[procNo].add(a4);
      items.push({
        processNo: procNo,
        category: 'A',
        itemCode: 'A4',
        value: a4,
      });
    }

    // B3 수집 (공정특성)
    if (b3 && !isPlaceholder(b3) && procNo) {
      const m4 = ['MN', 'MC', 'IM', 'EN'].includes(m4FuncVal) ? m4FuncVal : '';
      const key = procNo + '_' + m4;
      if (!b3Map[key]) b3Map[key] = new Set();
      b3Map[key].add(b3);
      items.push({
        processNo: procNo,
        category: 'B',
        itemCode: 'B3',
        value: b3,
        m4: m4,
      });
    }
  }

  // 중복 제거
  const deduped = [];
  const seen = new Set();
  for (const item of items) {
    const key = item.itemCode + '|' + item.processNo + '|' + item.value + '|' + (item.m4 || '');
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  return { items: deduped, c3Map, a4Map, b3Map };
}

async function run() {
  console.log('=== STEP A → DB 주입 ===');
  console.log('파일: ' + excelPath);
  console.log('fmeaId: ' + fmeaId + '\n');

  // 1. STEP A 파싱
  const { items, c3Map, a4Map, b3Map } = parseStepA(excelPath);

  const c3Count = items.filter(i => i.itemCode === 'C3').length;
  const a4Count = items.filter(i => i.itemCode === 'A4').length;
  const b3Count = items.filter(i => i.itemCode === 'B3').length;
  console.log('\n[추출 결과]');
  console.log('  C3 (요구사항): ' + c3Count + '개');
  console.log('  A4 (제품특성): ' + a4Count + '개');
  console.log('  B3 (공정특성): ' + b3Count + '개');

  // 2. Dataset ID 조회
  const ds = await p.query(
    'SELECT id FROM pfmea_master_datasets WHERE "fmeaId" = $1',
    [fmeaId]
  );
  if (ds.rows.length === 0) {
    console.error('❌ Dataset 없음: ' + fmeaId);
    await p.end();
    return;
  }
  const dsId = ds.rows[0].id;

  // 3. 기존 C3/A4/B3 확인
  const existingC3 = await p.query(
    'SELECT COUNT(*) as cnt FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = $2',
    [dsId, 'C3']
  );
  const existingA4 = await p.query(
    'SELECT COUNT(*) as cnt FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = $2',
    [dsId, 'A4']
  );
  const existingB3 = await p.query(
    'SELECT COUNT(*) as cnt FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = $2',
    [dsId, 'B3']
  );

  console.log('\n[기존 DB]');
  console.log('  C3: ' + existingC3.rows[0].cnt + '개');
  console.log('  A4: ' + existingA4.rows[0].cnt + '개');
  console.log('  B3: ' + existingB3.rows[0].cnt + '개');

  // 4. Master DB에 C3/A4/B3 삽입 (기존 없으면)
  let inserted = 0;
  for (const item of items) {
    // 중복 체크
    const exists = await p.query(
      'SELECT id FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = $2 AND "processNo" = $3 AND value = $4 LIMIT 1',
      [dsId, item.itemCode, item.processNo, item.value]
    );
    if (exists.rows.length > 0) continue;

    const id = item.itemCode.toLowerCase() + '-' + uid();
    await p.query(
      'INSERT INTO pfmea_master_flat_items (id, "datasetId", "processNo", category, "itemCode", value, m4, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())',
      [id, dsId, item.processNo, item.category, item.itemCode, item.value, item.m4 || null]
    );
    inserted++;
  }
  console.log('\n[Master DB] ' + inserted + '개 삽입');

  // 5. Legacy DB에 requirements (C3) 업데이트
  console.log('\n[5] Legacy DB requirements 업데이트...');
  const legacy = await p.query(
    'SELECT id, data FROM fmea_legacy_data WHERE "fmeaId" = $1',
    [fmeaId]
  );

  if (legacy.rows.length > 0) {
    const data = legacy.rows[0].data;
    let reqUpdated = 0;

    if (data.l1?.types) {
      for (const type of data.l1.types) {
        const typeName = (type.name || '').toUpperCase();
        const c3Set = c3Map[typeName];
        if (!c3Set || c3Set.size === 0) continue;

        const c3Values = [...c3Set];

        for (const fn of (type.functions || [])) {
          if (!fn.requirements || fn.requirements.length === 0) {
            // C2 함수에 C3 요구사항 배분
            // 전략: 함수 인덱스에 따라 순환 배분
            const fnIdx = type.functions.indexOf(fn);
            const fnCount = type.functions.length;

            // 각 함수에 해당하는 C3 배분
            const reqsForFn = [];
            for (let j = 0; j < c3Values.length; j++) {
              if (j % fnCount === fnIdx) {
                reqsForFn.push({
                  id: 'req-' + uid(),
                  name: c3Values[j],
                });
              }
            }

            if (reqsForFn.length > 0) {
              fn.requirements = reqsForFn;
              reqUpdated += reqsForFn.length;
              console.log('  ✅ ' + typeName + '/' + (fn.name || '').substring(0, 30) + '... → ' + reqsForFn.length + '개 요구사항');
            }
          }
        }
      }
    }

    if (reqUpdated > 0) {
      await p.query(
        'UPDATE fmea_legacy_data SET data = $1, "updatedAt" = NOW() WHERE id = $2',
        [JSON.stringify(data), legacy.rows[0].id]
      );
      console.log('  Legacy DB 업데이트: ' + reqUpdated + '건');
    }
  }

  // 6. 검증
  console.log('\n=== 검증 ===');
  const verifyC3 = await p.query(
    'SELECT COUNT(*) as cnt FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = $2',
    [dsId, 'C3']
  );
  const verifyA4 = await p.query(
    'SELECT COUNT(*) as cnt FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = $2',
    [dsId, 'A4']
  );
  const verifyB3 = await p.query(
    'SELECT COUNT(*) as cnt FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = $2',
    [dsId, 'B3']
  );
  console.log('  C3: ' + verifyC3.rows[0].cnt + '개');
  console.log('  A4: ' + verifyA4.rows[0].cnt + '개');
  console.log('  B3: ' + verifyB3.rows[0].cnt + '개');

  // Legacy 요구사항 검증
  const verifyLegacy = await p.query(
    'SELECT data FROM fmea_legacy_data WHERE "fmeaId" = $1',
    [fmeaId]
  );
  if (verifyLegacy.rows.length > 0) {
    let totalReqs = 0;
    let emptyFuncs = 0;
    const vd = verifyLegacy.rows[0].data;
    for (const type of (vd.l1?.types || [])) {
      for (const fn of (type.functions || [])) {
        const reqs = fn.requirements || [];
        if (reqs.length > 0) totalReqs += reqs.length;
        else emptyFuncs++;
      }
    }
    console.log('  Legacy 요구사항: ' + totalReqs + '개 (빈 함수: ' + emptyFuncs + '개)');
  }

  console.log('\n✅ 완료!');
  await p.end();
}

run().catch(e => { console.error(e); p.end(); });
