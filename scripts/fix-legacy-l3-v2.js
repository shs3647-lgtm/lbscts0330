/**
 * pfm26-m001 레거시 데이터 수정:
 * 1. 잘못된 L3 항목(4M 코드가 이름) 삭제
 * 2. Master B1 정상 데이터에서 올바른 L3 재구성
 */
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public' });

async function main() {
  // 1. Master B1 정상 데이터 조회
  const ds = await pool.query(`SELECT id FROM pfmea_master_datasets WHERE "isActive" = true LIMIT 1`);
  const b1 = await pool.query(
    `SELECT "processNo", value, m4 FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = 'B1' ORDER BY "processNo"`,
    [ds.rows[0].id]
  );

  // 공정별 작업요소 맵 생성 (공통공정 00 제외)
  const M4_CODES = new Set(['MN', 'MC', 'MD', 'JG', 'IM', 'EN']);
  const weByProcess = new Map();
  const commonWE = []; // 공통공정(00) 작업요소

  b1.rows.forEach(r => {
    // 4M 코드가 value인 항목은 이미 마스터에서 삭제했으므로 없지만 방어
    if (M4_CODES.has((r.value || '').toUpperCase().trim())) return;

    const we = {
      id: `we_${r.processNo}_${r.m4 || 'MC'}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: r.value,
      m4: r.m4 || 'MC',
      order: 0
    };

    if (r.processNo === '0' || r.processNo === '00') {
      commonWE.push(we);
    } else {
      if (!weByProcess.has(r.processNo)) weByProcess.set(r.processNo, []);
      weByProcess.get(r.processNo).push(we);
    }
  });

  console.log('=== Master B1 정상 데이터 ===');
  console.log('공통 작업요소:', commonWE.length, '건');
  weByProcess.forEach((wes, pNo) => {
    console.log(`공정${pNo}: ${wes.map(w => `${w.name}(${w.m4})`).join(', ')}`);
  });

  // 2. Legacy 데이터 수정
  const res = await pool.query(`SELECT data FROM fmea_legacy_data WHERE "fmeaId" = $1`, ['pfm26-m001']);
  if (res.rows.length === 0) { console.log('No legacy data'); return; }

  const d = res.rows[0].data;

  (d.l2 || []).forEach((proc, idx) => {
    const pNo = proc.no || '';
    const processWE = weByProcess.get(pNo) || [];
    // 공통 작업요소(MN류) + 해당 공정 작업요소 합치기
    const allWE = [
      ...commonWE.map((w, i) => ({
        ...w,
        id: `we_${pNo}_${w.m4}_common_${i}_${Date.now()}`,
        name: `${pNo} ${w.name}`,  // "10 작업자" 형식
        order: i
      })),
      ...processWE.map((w, i) => ({
        ...w,
        id: `we_${pNo}_${w.m4}_proc_${i}_${Date.now()}`,
        name: `${pNo} ${w.name}`,  // "10 절단기" 형식
        order: commonWE.length + i
      }))
    ];

    console.log(`\n공정${pNo} ${proc.name}: ${proc.l3 ? proc.l3.length : 0}건(기존) → ${allWE.length}건(수정)`);
    allWE.forEach(w => console.log(`  ${w.name} (${w.m4})`));

    proc.l3 = allWE;
  });

  // 3. 저장
  await pool.query(`UPDATE fmea_legacy_data SET data = $1 WHERE "fmeaId" = $2`, [JSON.stringify(d), 'pfm26-m001']);
  console.log('\n✅ Legacy 데이터 수정 완료');

  // 4. 검증
  const verify = await pool.query(`SELECT data FROM fmea_legacy_data WHERE "fmeaId" = $1`, ['pfm26-m001']);
  const v = verify.rows[0].data;
  let total = 0;
  (v.l2 || []).forEach(p => {
    (p.l3 || []).forEach(we => {
      total++;
      const stripped = (we.name || '').replace(/^\d+\s+/, '').toUpperCase().trim();
      const isBad = M4_CODES.has(stripped);
      console.log((isBad ? '❌' : '✅') + ` 공정${p.no}: name=${JSON.stringify(we.name)} m4=${we.m4}`);
    });
  });
  console.log(`\n총 L3: ${total}건`);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
