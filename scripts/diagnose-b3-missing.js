/**
 * @file diagnose-b3-missing.js
 * @description B3(공정특성) 55건 누락 원인 진단
 *
 * 확인 항목:
 * 1. Master DB에 B3 아이템 수
 * 2. Legacy DB에서 l3[].processChars 상태
 * 3. Worksheet에서 missingCounts 시뮬레이션
 * 4. STEP A에서 추출한 B3 vs Legacy에 반영된 B3 비교
 */

const { Pool } = require('pg');
const p = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });
const fmeaId = 'pfm26-p006-l07';
const dsId = '64a2c2e0-98f2-4bd4-b103-27375ef6038b';

function isMissing(val) {
  if (!val) return true;
  const t = (val + '').trim();
  if (t === '' || t === '-') return true;
  if (t.includes('클릭') || t.includes('추가') || t.includes('선택') || t.includes('입력') || t.includes('필요')) return true;
  return false;
}

function isValidName(name) {
  const n = (name || '').trim();
  if (n === '' || n === '-') return false;
  if (n.includes('추가') || n.includes('삭제') || n.includes('클릭') || n.includes('선택') || n.includes('없음')) return false;
  return true;
}

async function run() {
  console.log('=== B3(공정특성) 55건 누락 원인 진단 ===\n');

  // 1. Master DB B3 확인
  const masterB3 = await p.query(
    'SELECT "processNo", value, m4 FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = $2 ORDER BY "processNo"',
    [dsId, 'B3']
  );
  console.log('[1] Master DB B3: ' + masterB3.rows.length + '개');

  // 2. Legacy DB에서 B3 (processChars) 확인
  const legacy = await p.query(
    'SELECT data FROM fmea_legacy_data WHERE "fmeaId" = $1',
    [fmeaId]
  );

  if (legacy.rows.length === 0) {
    console.log('❌ Legacy 데이터 없음');
    await p.end();
    return;
  }

  const data = legacy.rows[0].data;
  console.log('\n[2] Legacy DB B3(processChars) 상태:');

  let totalWE = 0;
  let b3Present = 0;
  let b3Missing = 0;
  let b3MissingList = [];

  if (data.l2) {
    for (const proc of data.l2) {
      const procName = proc.name || '?';
      const procNo = proc.no || '?';

      for (const we of (proc.l3 || [])) {
        if (!isValidName(we.name)) continue;
        totalWE++;

        // B3 = processChars (공정특성)
        const processChars = we.processChars;
        const hasB3 = processChars && !isMissing(
          Array.isArray(processChars) ? processChars.join(',') : processChars
        );

        if (hasB3) {
          b3Present++;
        } else {
          b3Missing++;
          b3MissingList.push({
            procNo,
            procName: procName.substring(0, 25),
            weName: (we.name || '').substring(0, 30),
            m4: we.m4 || '?',
            processChars: processChars || '(없음)',
          });
        }
      }
    }
  }

  console.log('  유효 작업요소(WE): ' + totalWE + '개');
  console.log('  B3 있음: ' + b3Present + '개');
  console.log('  B3 없음: ' + b3Missing + '개 ← 이것이 "누락" 건수');

  if (b3MissingList.length > 0 && b3MissingList.length <= 60) {
    console.log('\n[3] B3 누락 상세 목록:');
    b3MissingList.forEach((item, i) => {
      console.log('  [' + (i+1) + '] 공정' + item.procNo + ' "' + item.procName + '" → ' + item.m4 + ' "' + item.weName + '" processChars=' + JSON.stringify(item.processChars));
    });
  }

  // 3. Master B3 vs Legacy B3 매칭 분석
  console.log('\n\n[4] Master B3 ↔ Legacy B3 매칭 분석:');

  // Master B3를 processNo+m4로 그룹핑
  const masterB3Map = {};
  for (const row of masterB3.rows) {
    const key = row.processNo + '_' + (row.m4 || '');
    if (!masterB3Map[key]) masterB3Map[key] = [];
    masterB3Map[key].push(row.value);
  }

  // Legacy에서 각 WE의 processNo+m4로 Master B3 매칭 시도
  let matchable = 0;
  let notMatchable = 0;

  if (data.l2) {
    for (const proc of data.l2) {
      const procNo = proc.no || '';
      for (const we of (proc.l3 || [])) {
        if (!isValidName(we.name)) continue;
        const m4 = we.m4 || '';
        const key = procNo + '_' + m4;

        if (masterB3Map[key]) {
          matchable++;
        } else {
          notMatchable++;
          // m4 없이 processNo만으로 검색
          const keyNoM4 = procNo + '_';
          const alternatives = Object.keys(masterB3Map).filter(k => k.startsWith(procNo + '_'));
          if (alternatives.length > 0) {
            // console.log('  ⚠️ m4 불일치: WE=' + we.name?.substring(0,20) + ' m4=' + m4 + ' → Master에 ' + alternatives.join(','));
          }
        }
      }
    }
  }
  console.log('  매칭 가능: ' + matchable + '개 (Master에 해당 공정+4M의 B3 있음)');
  console.log('  매칭 불가: ' + notMatchable + '개 (Master에 해당 공정+4M의 B3 없음)');

  // 4. Legacy의 L3 데이터 구조 확인 (processChars 필드 존재 여부)
  console.log('\n\n[5] Legacy L3 데이터 구조 샘플 (첫 3개 WE):');
  let sampleCount = 0;
  if (data.l2) {
    for (const proc of data.l2) {
      for (const we of (proc.l3 || [])) {
        if (!isValidName(we.name)) continue;
        if (sampleCount < 3) {
          console.log('  WE keys:', Object.keys(we).join(', '));
          console.log('  name="' + we.name + '"');
          console.log('  processChars=' + JSON.stringify(we.processChars));
          console.log('  functions=' + JSON.stringify(we.functions?.length || 0) + '개');
          console.log('  ---');
          sampleCount++;
        }
      }
    }
  }

  // 5. Worksheet FunctionL3Tab missingCounts 로직 확인을 위한 추가 분석
  console.log('\n\n[6] FunctionL3Tab 관점에서 누락 분석:');
  console.log('  B3(공정특성)는 L3 기능분석에서 작업요소별 공정특성을 의미');
  console.log('  Legacy data에서 l3[].processChars가 비어있으면 "누락"으로 카운트');
  console.log('  Master DB에 B3=' + masterB3.rows.length + '개 있지만 Legacy data에는 미반영');
  console.log('  → inject-step-a-data.js는 C3(요구사항)만 Legacy에 반영했고 B3는 Master에만 저장');

  // 6. STEP B에서 B3가 원래 있었는지 확인
  console.log('\n\n[7] STEP B에서 B3 원래 Import 여부:');
  const stepBB3 = await p.query(
    'SELECT COUNT(*) as cnt FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = $2 AND inherited = true',
    [dsId, 'B3']
  );
  console.log('  inherited=true B3: ' + stepBB3.rows[0].cnt + '개 (STEP B에서 온 것)');

  const stepAB3 = await p.query(
    'SELECT COUNT(*) as cnt FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = $2 AND (inherited IS NULL OR inherited = false)',
    [dsId, 'B3']
  );
  console.log('  inherited=false/null B3: ' + stepAB3.rows[0].cnt + '개 (STEP A에서 주입한 것)');

  await p.end();
}

run().catch(e => { console.error(e); p.end(); });
