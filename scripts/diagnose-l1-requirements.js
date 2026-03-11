/**
 * @file diagnose-l1-requirements.js
 * @description L1 요구사항(C3) 데이터 진단 — "누락 6건" 원인 분석
 *
 * 확인 항목:
 * 1. Legacy DB에서 l1.types[].functions[].requirements 데이터 존재 여부
 * 2. Master DB에서 C3 아이템 존재 여부
 * 3. missingCounts 로직 시뮬레이션
 */

const { Pool } = require('pg');
const p = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

async function run() {
  console.log('=== L1 요구사항 데이터 진단 ===\n');

  // 1. HUD PFMEA 프로젝트 legacy data 확인
  const fmeaId = 'pfm26-p006-l07';
  const legacy = await p.query('SELECT id, "fmeaId", data FROM fmea_legacy_data WHERE "fmeaId" = $1', [fmeaId]);

  if (legacy.rows.length === 0) {
    console.log('❌ Legacy 데이터 없음: ' + fmeaId);
    await p.end();
    return;
  }

  const data = legacy.rows[0].data;
  console.log('[1] Legacy 데이터 구조:');
  console.log('  l1 존재: ' + !!data.l1);
  console.log('  l1.name: ' + (data.l1?.name || '(없음)'));
  console.log('  l1.types 개수: ' + (data.l1?.types?.length || 0));

  // 2. L1 types → functions → requirements 상세 검사
  if (data.l1?.types) {
    for (const type of data.l1.types) {
      console.log('\n  [Type] name="' + type.name + '" id="' + (type.id || '?') + '"');
      console.log('    functions 개수: ' + (type.functions?.length || 0));

      if (type.functions) {
        for (const fn of type.functions) {
          const reqs = fn.requirements || [];
          console.log('    [Function] name="' + (fn.name || '(없음)') + '" requirements: ' + reqs.length + '개');
          if (reqs.length > 0) {
            reqs.forEach((r, i) => {
              console.log('      [Req ' + i + '] name="' + (r.name || '(없음)') + '" id="' + (r.id || '?') + '"');
            });
          } else {
            console.log('      ❌ 요구사항 없음 → "요구사항 선택" 표시됨');
          }
        }
      }
    }
  }

  // 3. missingCounts 시뮬레이션 (FunctionL1Tab 로직과 동일)
  console.log('\n\n=== [2] missingCounts 시뮬레이션 ===');
  let missingCount = 0;

  function isMissing(val) {
    if (!val) return true;
    const t = (val + '').trim();
    if (t === '' || t === '-') return true;
    if (t.includes('클릭') || t.includes('추가') || t.includes('선택') || t.includes('입력') || t.includes('필요')) return true;
    return false;
  }

  if (data.l1?.types) {
    for (const type of data.l1.types) {
      for (const fn of (type.functions || [])) {
        const reqs = fn.requirements || [];

        // 기능명 누락 체크
        if (isMissing(fn.name)) {
          missingCount++;
          console.log('  🔴 기능명 누락: type="' + type.name + '" fn.name="' + (fn.name || '(없음)') + '"');
        }

        // 요구사항 누락 체크 — 요구사항 0개 = 누락?
        if (reqs.length === 0) {
          missingCount++;
          console.log('  🔴 요구사항 없음: type="' + type.name + '" fn="' + (fn.name || '(없음)') + '"');
        } else {
          for (const r of reqs) {
            if (isMissing(r.name)) {
              missingCount++;
              console.log('  🔴 요구사항 이름 누락: type="' + type.name + '" fn="' + (fn.name || '?') + '" req="' + (r.name || '(없음)') + '"');
            }
          }
        }
      }
    }
  }
  console.log('\n시뮬레이션 누락 합계: ' + missingCount + '건');

  // 4. Master DB에서 C3 아이템 확인
  console.log('\n\n=== [3] Master DB C3 아이템 확인 ===');
  const masters = await p.query(
    'SELECT id, "fmeaId", "relationData" FROM pfmea_master_datasets WHERE "fmeaId" = $1',
    [fmeaId]
  );

  if (masters.rows.length === 0) {
    console.log('❌ Master 데이터 없음: ' + fmeaId);
  } else {
    const master = masters.rows[0];
    const relData = master.relationData;
    console.log('  Master ID: ' + master.id);

    // C3 아이템 찾기
    if (relData?.flatData) {
      const c3Items = relData.flatData.filter(item => item.itemCode === 'C3');
      console.log('  flatData에서 C3 아이템: ' + c3Items.length + '개');
      c3Items.forEach(item => {
        console.log('    C3: processNo="' + (item.processNo || '?') + '" value="' + (item.value || '?') + '"');
      });

      // C2 아이템도 확인
      const c2Items = relData.flatData.filter(item => item.itemCode === 'C2');
      console.log('  flatData에서 C2 아이템: ' + c2Items.length + '개');
      c2Items.forEach(item => {
        console.log('    C2: processNo="' + (item.processNo || '?') + '" value="' + (item.value || '?') + '"');
      });
    } else {
      console.log('  ❌ relData.flatData 없음');
      console.log('  relData 키: ' + (relData ? Object.keys(relData).join(', ') : '(null)'));
    }
  }

  // 5. 또한 워크시트 데이터에서도 확인
  console.log('\n\n=== [4] Worksheet DB 확인 ===');
  const ws = await p.query('SELECT id, "fmeaId", data FROM fmea_worksheet_data WHERE "fmeaId" = $1', [fmeaId]);
  if (ws.rows.length > 0) {
    const wsData = ws.rows[0].data;
    if (wsData?.l1?.types) {
      for (const type of wsData.l1.types) {
        console.log('  [WS Type] name="' + type.name + '"');
        for (const fn of (type.functions || [])) {
          const reqs = fn.requirements || [];
          console.log('    fn="' + (fn.name || '?') + '" requirements=' + reqs.length);
        }
      }
    } else {
      console.log('  WS l1.types 없음');
    }
  } else {
    console.log('  ❌ Worksheet 데이터 없음');
  }

  // 6. 모든 PFMEA 프로젝트 리스트
  console.log('\n\n=== [5] 모든 PFMEA 프로젝트 ===');
  const projs = await p.query(`
    SELECT fp."fmeaId", fr.subject, fr."partName"
    FROM fmea_projects fp
    LEFT JOIN fmea_registrations fr ON fp."fmeaId" = fr."fmeaId"
    WHERE fp."fmeaType" = 'P'
    ORDER BY fp."createdAt" DESC
  `);
  projs.rows.forEach(r => {
    console.log('  ' + r.fmeaId + ' — ' + (r.subject || r.partName || '(no name)'));
  });

  await p.end();
}

run().catch(e => { console.error(e); p.end(); });
