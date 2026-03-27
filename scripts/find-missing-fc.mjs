/**
 * FC 없는 L3 2건의 상세 정보 확인
 * - 어떤 공정 소속인지
 * - 그 공정의 FM은 무엇인지
 * - Excel에서 어떤 데이터를 넣으면 보충되는지
 */
import pg from 'pg';
const c = new pg.Client('postgresql://postgres:1234@localhost:5432/fmea_db');
await c.connect();
const S = 'pfmea_pfm26_m002';

console.log('═══ FC 없는 L3 상세 분석 ═══\n');

const noFC = await c.query(`
  SELECT l3s.id, l3s.name, l3s.m4, l3s."l2Id",
    l2s.no AS process_no, l2s.name AS process_name,
    (SELECT COUNT(*) FROM "${S}".l3_functions l3f WHERE l3f."l3StructId" = l3s.id) AS l3f_count
  FROM "${S}".l3_structures l3s
  JOIN "${S}".l2_structures l2s ON l3s."l2Id" = l2s.id
  WHERE NOT EXISTS (
    SELECT 1 FROM "${S}".failure_causes fc WHERE fc."l3StructId" = l3s.id
  )
  ORDER BY l2s.no
`);

for (const r of noFC.rows) {
  console.log(`━━ [공정${r.process_no}] ${r.process_name} ━━`);
  console.log(`   L3: ${r.name} (4M=${r.m4})`);
  console.log(`   L3Function 수: ${r.l3f_count}`);
  
  // 같은 공정의 FM 목록
  const fms = await c.query(`
    SELECT fm.id, fm.mode FROM "${S}".failure_modes fm 
    WHERE fm."l2StructId" = $1
  `, [r.l2Id]);
  console.log(`   이 공정의 FM: ${fms.rows.map(f => f.mode).join(', ')}`);
  
  // 같은 공정의 다른 L3에는 FC가 있는지
  const otherL3 = await c.query(`
    SELECT l3s.name, l3s.m4,
      (SELECT COUNT(*) FROM "${S}".failure_causes fc WHERE fc."l3StructId" = l3s.id) AS fc_count
    FROM "${S}".l3_structures l3s
    WHERE l3s."l2Id" = $1
    ORDER BY l3s.m4
  `, [r.l2Id]);
  console.log(`   같은 공정 L3 현황:`);
  for (const o of otherL3.rows) {
    const mark = parseInt(o.fc_count) === 0 ? '✗' : '✓';
    console.log(`     ${mark} ${o.name} (${o.m4}) → FC ${o.fc_count}건`);
  }
  
  // 같은 공정의 FC 예시 (다른 L3에서)
  const sampleFCs = await c.query(`
    SELECT fc.cause, l3s.name AS l3_name
    FROM "${S}".failure_causes fc
    JOIN "${S}".l3_structures l3s ON fc."l3StructId" = l3s.id
    WHERE l3s."l2Id" = $1
    LIMIT 5
  `, [r.l2Id]);
  if (sampleFCs.rows.length > 0) {
    console.log(`   참고 — 같은 공정의 FC 예시:`);
    for (const s of sampleFCs.rows) {
      console.log(`     "${s.cause}" (from ${s.l3_name})`);
    }
  }
  console.log('');
}

// 기존 FailureLink에서 이 L3들이 참조되는지
console.log('═══ 이 L3들의 FailureLink 참조 현황 ═══\n');
for (const r of noFC.rows) {
  const links = await c.query(`
    SELECT COUNT(*) AS cnt FROM "${S}".failure_links fl
    WHERE fl."fcWorkElem" = $1
  `, [r.name]);
  console.log(`  ${r.name}: FailureLink에서 fcWorkElem으로 참조 = ${links.rows[0].cnt}건`);
}

console.log('\n═══ 보충 방안 ═══');
console.log('1. Excel Import 시 이 2개 L3에 대한 B4(고장원인) 행 추가');
console.log('   → 파이프라인이 자동으로 FC 생성 + FailureLink FK 연결');
console.log('2. 또는 워크시트에서 수동으로 해당 L3에 FC 추가');
console.log('   → 저장 시 자동으로 Atomic DB에 반영');
console.log('');

await c.end();
