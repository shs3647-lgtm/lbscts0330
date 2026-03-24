import pg from 'pg';
const pool = new pg.Pool({host:'localhost',port:5432,user:'postgres',password:'1234',database:'fmea_db'});

async function main() {
  const S = 'pfmea_pfm26_p018_i18';
  const q = (t: string) => `"${S}".${t}`;
  
  console.log('=== L3 고아 (l2Id 빈값) 삭제 시작 ===');
  
  // 1. l2Id가 NULL 또는 빈 문자열인 L3 구조 찾기
  const orphanL3 = await pool.query(`
    SELECT l3.id FROM ${q('l3_structures')} l3 
    WHERE l3."l2Id" IS NULL OR l3."l2Id" = ''
  `);
  console.log(`  대상: ${orphanL3.rows.length}건`);
  
  if (orphanL3.rows.length > 0) {
    const ids = orphanL3.rows.map((r: any) => `'${r.id}'`).join(',');
    
    // 2. 종속 엔티티 삭제 (L3F → FC → FL → RA 순서)
    // RA 먼저 (FL에 의존)
    const raResult = await pool.query(`
      DELETE FROM ${q('risk_analyses')} ra
      WHERE ra."linkId" IN (
        SELECT fl.id FROM ${q('failure_links')} fl 
        WHERE fl."fcId" IN (
          SELECT fc.id FROM ${q('failure_causes')} fc WHERE fc."l3StructId" IN (${ids})
        )
      )
      RETURNING id
    `);
    console.log(`  RA 삭제: ${raResult.rowCount}건`);
    
    // FL (FC에 의존)
    const flResult = await pool.query(`
      DELETE FROM ${q('failure_links')} fl
      WHERE fl."fcId" IN (
        SELECT fc.id FROM ${q('failure_causes')} fc WHERE fc."l3StructId" IN (${ids})
      )
      RETURNING id
    `);
    console.log(`  FL 삭제: ${flResult.rowCount}건`);
    
    // FC
    const fcResult = await pool.query(`
      DELETE FROM ${q('failure_causes')} fc WHERE fc."l3StructId" IN (${ids})
      RETURNING id
    `);
    console.log(`  FC 삭제: ${fcResult.rowCount}건`);
    
    // L3F
    const l3fResult = await pool.query(`
      DELETE FROM ${q('l3_functions')} l3f WHERE l3f."l3StructId" IN (${ids})
      RETURNING id
    `);
    console.log(`  L3F 삭제: ${l3fResult.rowCount}건`);
    
    // L3 구조 삭제
    const l3Result = await pool.query(`
      DELETE FROM ${q('l3_structures')} l3 WHERE l3.id IN (${ids})
      RETURNING id
    `);
    console.log(`  L3 삭제: ${l3Result.rowCount}건`);
  }
  
  // 3. L3F l2StructId 고아 정리
  const l3fOrphan = await pool.query(`
    DELETE FROM ${q('l3_functions')} l3f 
    WHERE l3f."l2StructId" IS NOT NULL 
      AND l3f."l2StructId" != ''
      AND NOT EXISTS (SELECT 1 FROM ${q('l2_structures')} l2 WHERE l2.id = l3f."l2StructId")
    RETURNING id
  `);
  console.log(`  L3F→L2 고아 정리: ${l3fOrphan.rowCount}건`);
  
  // 4. FC l2StructId 고아 정리 (FL/RA 먼저)
  const fcOrphan = await pool.query(`
    SELECT fc.id FROM ${q('failure_causes')} fc
    WHERE fc."l2StructId" IS NOT NULL 
      AND fc."l2StructId" != ''
      AND NOT EXISTS (SELECT 1 FROM ${q('l2_structures')} l2 WHERE l2.id = fc."l2StructId")
  `);
  if (fcOrphan.rows.length > 0) {
    const fcIds = fcOrphan.rows.map((r: any) => `'${r.id}'`).join(',');
    await pool.query(`DELETE FROM ${q('risk_analyses')} WHERE "linkId" IN (SELECT id FROM ${q('failure_links')} WHERE "fcId" IN (${fcIds}))`);
    await pool.query(`DELETE FROM ${q('failure_links')} WHERE "fcId" IN (${fcIds})`);
    const delFc = await pool.query(`DELETE FROM ${q('failure_causes')} WHERE id IN (${fcIds}) RETURNING id`);
    console.log(`  FC→L2 고아 정리: ${delFc.rowCount}건`);
  }
  
  // 5. FC 중복 정리
  const fcDups = await pool.query(`
    DELETE FROM ${q('failure_causes')} fc1 
    WHERE EXISTS (
      SELECT 1 FROM ${q('failure_causes')} fc2 
      WHERE fc2."l2StructId" = fc1."l2StructId" 
        AND fc2.cause = fc1.cause 
        AND fc2.id > fc1.id
    )
    AND NOT EXISTS (SELECT 1 FROM ${q('failure_links')} fl WHERE fl."fcId" = fc1.id)
    RETURNING id
  `);
  console.log(`  FC 중복 정리: ${fcDups.rowCount}건`);

  // 6. 불완전 FL 정리
  const brokenFL = await pool.query(`
    DELETE FROM ${q('failure_links')} fl WHERE NOT EXISTS (SELECT 1 FROM ${q('failure_causes')} fc WHERE fc.id = fl."fcId") RETURNING id
  `);
  console.log(`  불완전 FL 정리: ${brokenFL.rowCount}건`);
  
  // 고아 RA 정리
  const orphanRA = await pool.query(`
    DELETE FROM ${q('risk_analyses')} ra WHERE NOT EXISTS (SELECT 1 FROM ${q('failure_links')} fl WHERE fl.id = ra."linkId") RETURNING id
  `);
  console.log(`  고아 RA 정리: ${orphanRA.rowCount}건`);

  // 최종 건수
  console.log('\n=== 최종 건수 ===');
  const counts = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM ${q('l2_structures')}`),
    pool.query(`SELECT COUNT(*) FROM ${q('l3_structures')}`),
    pool.query(`SELECT COUNT(*) FROM ${q('l3_functions')}`),
    pool.query(`SELECT COUNT(*) FROM ${q('failure_modes')}`),
    pool.query(`SELECT COUNT(*) FROM ${q('failure_causes')}`),
    pool.query(`SELECT COUNT(*) FROM ${q('failure_effects')}`),
    pool.query(`SELECT COUNT(*) FROM ${q('failure_links')}`),
    pool.query(`SELECT COUNT(*) FROM ${q('risk_analyses')}`),
  ]);
  const names = ['L2','L3','L3F','FM','FC','FE','FL','RA'];
  counts.forEach((c, i) => console.log(`  ${names[i]}: ${c.rows[0].count}`));
  
  // FK 검증
  console.log('\n=== FK 검증 ===');
  const checks = [
    ['L3→L2', `SELECT COUNT(*) FROM ${q('l3_structures')} l3 WHERE NOT EXISTS (SELECT 1 FROM ${q('l2_structures')} l2 WHERE l2.id = l3."l2Id")`],
    ['L3F→L2', `SELECT COUNT(*) FROM ${q('l3_functions')} l3f WHERE l3f."l2StructId" IS NOT NULL AND l3f."l2StructId" != '' AND NOT EXISTS (SELECT 1 FROM ${q('l2_structures')} l2 WHERE l2.id = l3f."l2StructId")`],
    ['FC→L2', `SELECT COUNT(*) FROM ${q('failure_causes')} fc WHERE fc."l2StructId" IS NOT NULL AND fc."l2StructId" != '' AND NOT EXISTS (SELECT 1 FROM ${q('l2_structures')} l2 WHERE l2.id = fc."l2StructId")`],
    ['FL→FM', `SELECT COUNT(*) FROM ${q('failure_links')} fl WHERE NOT EXISTS (SELECT 1 FROM ${q('failure_modes')} fm WHERE fm.id = fl."fmId")`],
    ['FL→FC', `SELECT COUNT(*) FROM ${q('failure_links')} fl WHERE NOT EXISTS (SELECT 1 FROM ${q('failure_causes')} fc WHERE fc.id = fl."fcId")`],
    ['FL→FE', `SELECT COUNT(*) FROM ${q('failure_links')} fl WHERE NOT EXISTS (SELECT 1 FROM ${q('failure_effects')} fe WHERE fe.id = fl."feId")`],
    ['RA→FL', `SELECT COUNT(*) FROM ${q('risk_analyses')} ra WHERE NOT EXISTS (SELECT 1 FROM ${q('failure_links')} fl WHERE fl.id = ra."linkId")`],
    ['미연결FC', `SELECT COUNT(*) FROM ${q('failure_causes')} fc WHERE NOT EXISTS (SELECT 1 FROM ${q('failure_links')} fl WHERE fl."fcId" = fc.id)`],
    ['미연결FM', `SELECT COUNT(*) FROM ${q('failure_modes')} fm WHERE NOT EXISTS (SELECT 1 FROM ${q('failure_links')} fl WHERE fl."fmId" = fm.id)`],
  ];
  let allPass = true;
  for (const [name, sql] of checks) {
    const r = await pool.query(sql);
    const cnt = +r.rows[0].count;
    const status = cnt === 0 ? '✅' : '❌';
    if (cnt > 0) allPass = false;
    console.log(`  ${name}: ${cnt} ${status}`);
  }
  console.log(`\n${allPass ? '✅ ALL PASS' : '❌ ISSUES REMAIN'}`);
  
  await pool.end();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
