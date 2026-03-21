import pg from 'pg';
const client = new pg.Client('postgresql://postgres:1234@localhost:5432/fmea_db');
await client.connect();

const schema = 'pfmea_pfm26_m066';

// 1. FM별 연결된 FE/FC 수
const fmLinks = await client.query(`
  SELECT 
    fm."mode" AS fm,
    COUNT(DISTINCT fl."feId") AS fe_count,
    COUNT(DISTINCT fl."fcId") AS fc_count,
    COUNT(fl.id) AS link_count
  FROM "${schema}".failure_links fl
  JOIN "${schema}".failure_modes fm ON fl."fmId" = fm.id
  WHERE fl."deletedAt" IS NULL
  GROUP BY fm.id, fm."mode"
  ORDER BY fc_count DESC, fe_count DESC
`);

console.log('');
console.log('='.repeat(80));
console.log('  FM별 FE:FM:FC 연결 현황 (N:1:N)  — pfm26-m066');
console.log('='.repeat(80));
console.log(`${'FM(고장형태)'.padEnd(48)} FE수  FC수  Link수`);
console.log('-'.repeat(80));
let multiFECount = 0, multiFCCount = 0;
for (const r of fmLinks.rows) {
  const marker = [];
  if (Number(r.fe_count) > 1) { marker.push('N:FE'); multiFECount++; }
  if (Number(r.fc_count) > 1) { marker.push('N:FC'); multiFCCount++; }
  const tag = marker.length > 0 ? ` [${marker.join(',')}]` : '';
  console.log(`${r.fm.substring(0,46).padEnd(48)} ${String(r.fe_count).padStart(3)}   ${String(r.fc_count).padStart(3)}   ${String(r.link_count).padStart(4)}${tag}`);
}
console.log('-'.repeat(80));
console.log(`  복수 FE 연결 FM: ${multiFECount}개 | 복수 FC 연결 FM: ${multiFCCount}개`);

// 2. 복수 FE가 연결된 FM 상세
const multiFE = await client.query(`
  SELECT 
    fm."mode" AS fm,
    fe."effect" AS fe,
    l1f."functionName" AS fe_scope,
    COUNT(DISTINCT fl."fcId") AS fc_in_this_fe
  FROM "${schema}".failure_links fl
  JOIN "${schema}".failure_modes fm ON fl."fmId" = fm.id
  JOIN "${schema}".failure_effects fe ON fl."feId" = fe.id
  JOIN "${schema}".l1_functions l1f ON fe."l1FuncId" = l1f.id
  WHERE fl."deletedAt" IS NULL
  AND fl."fmId" IN (
    SELECT "fmId" FROM "${schema}".failure_links WHERE "deletedAt" IS NULL GROUP BY "fmId" HAVING COUNT(DISTINCT "feId") > 1
  )
  GROUP BY fm.id, fm."mode", fe.id, fe."effect", l1f."functionName"
  ORDER BY fm."mode", l1f."functionName"
`);

console.log('\n' + '='.repeat(80));
console.log('  ★ 복수 FE가 연결된 FM 상세 (FE:FM = N:1)');
console.log('='.repeat(80));
if (multiFE.rows.length === 0) {
  console.log('  (복수 FE 연결 없음 — 모든 FM이 1개 FE에만 연결)');
} else {
  let lastFm = '';
  for (const r of multiFE.rows) {
    if (r.fm !== lastFm) {
      console.log(`\n  FM: ${r.fm}`);
      lastFm = r.fm;
    }
    console.log(`    -> FE: [${r.fe_scope}] ${r.fe} (FC ${r.fc_in_this_fe}건)`);
  }
}

// 3. 복수 FC가 연결된 FM Top 10
const multiFC = await client.query(`
  SELECT 
    fm."mode" AS fm,
    l2."name" AS process_name,
    l2."no" AS process_no,
    COUNT(fl.id) AS fc_count
  FROM "${schema}".failure_links fl
  JOIN "${schema}".failure_modes fm ON fl."fmId" = fm.id
  JOIN "${schema}".l2_structures l2 ON fm."l2StructId" = l2.id
  WHERE fl."deletedAt" IS NULL
  GROUP BY fm.id, fm."mode", l2."name", l2."no"
  HAVING COUNT(fl.id) > 1
  ORDER BY COUNT(fl.id) DESC
  LIMIT 15
`);

console.log('\n' + '='.repeat(80));
console.log('  ★ 복수 FC가 연결된 FM Top 15 (FM:FC = 1:N)');
console.log('='.repeat(80));
for (const r of multiFC.rows) {
  console.log(`  [${r.process_no}] ${r.process_name.padEnd(18)} FM: ${r.fm.substring(0,38).padEnd(40)} FC: ${r.fc_count}건`);
}

// 4. 전체 통계
const stats = await client.query(`
  SELECT 
    (SELECT COUNT(*) FROM "${schema}".failure_modes) AS fm_total,
    (SELECT COUNT(*) FROM "${schema}".failure_effects) AS fe_total,
    (SELECT COUNT(*) FROM "${schema}".failure_causes) AS fc_total,
    (SELECT COUNT(*) FROM "${schema}".failure_links WHERE "deletedAt" IS NULL) AS link_total,
    (SELECT COUNT(*) FROM "${schema}".risk_analyses) AS ra_total,
    (SELECT COUNT(DISTINCT "fmId") FROM "${schema}".failure_links WHERE "deletedAt" IS NULL) AS linked_fm,
    (SELECT COUNT(DISTINCT "feId") FROM "${schema}".failure_links WHERE "deletedAt" IS NULL) AS linked_fe,
    (SELECT COUNT(DISTINCT "fcId") FROM "${schema}".failure_links WHERE "deletedAt" IS NULL) AS linked_fc
`);
const s = stats.rows[0];

console.log('\n' + '='.repeat(80));
console.log('  DB 저장 통계 (pfm26-m066)');
console.log('='.repeat(80));
console.log(`  FM(고장형태) : ${s.fm_total}개  (FailureLink 연결: ${s.linked_fm})`);
console.log(`  FE(고장영향) : ${s.fe_total}개  (FailureLink 연결: ${s.linked_fe})`);
console.log(`  FC(고장원인) : ${s.fc_total}개  (FailureLink 연결: ${s.linked_fc})`);
console.log(`  FailureLink  : ${s.link_total}건`);
console.log(`  RiskAnalysis : ${s.ra_total}건`);

// 5. 샘플 체인: 특정 FM 하나의 전체 연결
const sample = await client.query(`
  SELECT 
    fm."mode" AS fm,
    fe."effect" AS fe,
    l1f."functionName" AS fe_scope,
    fc."cause" AS fc,
    l3."name" AS work_element,
    l3."m4" AS m4,
    ra."severity" AS s, ra."occurrence" AS o, ra."detection" AS d,
    ra."preventionControl" AS pc,
    ra."detectionControl" AS dc
  FROM "${schema}".failure_links fl
  JOIN "${schema}".failure_modes fm ON fl."fmId" = fm.id
  JOIN "${schema}".failure_effects fe ON fl."feId" = fe.id
  JOIN "${schema}".l1_functions l1f ON fe."l1FuncId" = l1f.id
  JOIN "${schema}".failure_causes fc ON fl."fcId" = fc.id
  JOIN "${schema}".l3_structures l3 ON fc."l3StructId" = l3.id
  LEFT JOIN "${schema}".risk_analyses ra ON ra."linkId" = fl.id
  WHERE fl."deletedAt" IS NULL
  AND fm."mode" LIKE '%UBM%'
  ORDER BY fe."effect", fc."cause"
  LIMIT 10
`);

if (sample.rows.length > 0) {
  console.log('\n' + '='.repeat(80));
  console.log('  샘플 체인: FM="UBM 두께 부족" 전체 FE-FC 연결');
  console.log('='.repeat(80));
  for (const r of sample.rows) {
    console.log(`  FE: [${r.fe_scope}] ${r.fe}`);
    console.log(`    FC: [${r.m4}] ${r.work_element} > ${r.fc}`);
    console.log(`    S=${r.s||'-'} O=${r.o||'-'} D=${r.d||'-'}  PC: ${(r.pc||'-').substring(0,50)}`);
    console.log(`                         DC: ${(r.dc||'-').substring(0,50)}`);
    console.log('');
  }
}

// 6. FK 정합성 검증
const orphans = await client.query(`
  SELECT 'FM orphan' AS type, COUNT(*) AS cnt FROM "${schema}".failure_links fl
    LEFT JOIN "${schema}".failure_modes fm ON fl."fmId" = fm.id WHERE fm.id IS NULL AND fl."deletedAt" IS NULL
  UNION ALL
  SELECT 'FE orphan', COUNT(*) FROM "${schema}".failure_links fl
    LEFT JOIN "${schema}".failure_effects fe ON fl."feId" = fe.id WHERE fe.id IS NULL AND fl."deletedAt" IS NULL
  UNION ALL
  SELECT 'FC orphan', COUNT(*) FROM "${schema}".failure_links fl
    LEFT JOIN "${schema}".failure_causes fc ON fl."fcId" = fc.id WHERE fc.id IS NULL AND fl."deletedAt" IS NULL
  UNION ALL
  SELECT 'RA orphan', COUNT(*) FROM "${schema}".risk_analyses ra
    LEFT JOIN "${schema}".failure_links fl ON ra."linkId" = fl.id WHERE fl.id IS NULL
`);

console.log('='.repeat(80));
console.log('  FK 정합성 (orphan = 0이면 완벽)');
console.log('='.repeat(80));
for (const r of orphans.rows) {
  const icon = r.cnt === '0' || r.cnt === 0 ? 'PASS' : 'FAIL';
  console.log(`  ${r.type.padEnd(12)}: ${r.cnt}  ${icon}`);
}
console.log('');

await client.end();
