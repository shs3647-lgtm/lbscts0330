/**
 * m002 DB에서 WE별 B2/B3/B4/B5 실제 데이터 구조 덤프
 * → sample-lookup API 설계를 위한 데이터 구조 확인
 */
import pg from 'pg';
const c = new pg.Client('postgresql://postgres:1234@localhost:5432/fmea_db');
await c.connect();
const S = 'pfmea_pfm26_m002';

// L3(WE) + L3Function + FC 구조 확인
const data = await c.query(`
  SELECT 
    l2s.no AS process_no, l2s.name AS process_name,
    l3s.id AS l3_id, l3s.name AS we_name, l3s.m4,
    l3f.id AS l3f_id, l3f."functionName" AS l3f_name, l3f."processChar" AS l3f_pc,
    fc.id AS fc_id, fc.cause AS fc_name,
    ra."preventionControl" AS pc, ra."detectionControl" AS dc
  FROM "${S}".l3_structures l3s
  JOIN "${S}".l2_structures l2s ON l3s."l2Id" = l2s.id
  LEFT JOIN "${S}".l3_functions l3f ON l3f."l3StructId" = l3s.id
  LEFT JOIN "${S}".failure_causes fc ON fc."l3StructId" = l3s.id
  LEFT JOIN "${S}".failure_links fl ON fl."fcId" = fc.id AND fl."deletedAt" IS NULL
  LEFT JOIN "${S}".risk_analyses ra ON ra."linkId" = fl.id
  ORDER BY l2s.no::int, l3s.m4, l3s.name
`);

// WE별 그룹핑
const weMap = new Map();
for (const r of data.rows) {
  const key = `${r.process_no}|${r.m4}|${r.we_name}`;
  if (!weMap.has(key)) {
    weMap.set(key, {
      processNo: r.process_no, processName: r.process_name,
      m4: r.m4, weName: r.we_name,
      b2: new Set(), b3: new Set(), b4: new Set(), b5: new Set(), a6: new Set(),
    });
  }
  const we = weMap.get(key);
  if (r.l3f_name) we.b2.add(r.l3f_name);
  if (r.l3f_pc) we.b3.add(r.l3f_pc);
  if (r.fc_name) we.b4.add(r.fc_name);
  if (r.pc) we.b5.add(r.pc);
  if (r.dc) we.a6.add(r.dc);
}

console.log(`\n═══ m002 WE별 데이터 구조 (${weMap.size}건) ═══\n`);

// m4별 통계
const m4Stats = new Map();
for (const [, we] of weMap) {
  if (!m4Stats.has(we.m4)) m4Stats.set(we.m4, { count: 0, withB4: 0, totalB4: 0 });
  const s = m4Stats.get(we.m4);
  s.count++;
  if (we.b4.size > 0) { s.withB4++; s.totalB4 += we.b4.size; }
}
console.log('m4별 통계:');
for (const [m4, s] of m4Stats) {
  console.log(`  ${m4}: WE ${s.count}건, B4있는WE ${s.withB4}건, B4합계 ${s.totalB4}건`);
}

// FC 없는 WE 상세
console.log('\n━━ FC 없는 WE (m002 기준) ━━');
let noFcCount = 0;
for (const [key, we] of weMap) {
  if (we.b4.size === 0) {
    noFcCount++;
    console.log(`  [${we.processNo}] ${we.weName} (${we.m4}) → B2=${we.b2.size} B3=${we.b3.size} B4=0 B5=${we.b5.size}`);
  }
}
if (noFcCount === 0) console.log('  (없음 — 모든 WE에 FC 존재)');

// m4별 대표 데이터 (다른 공정에서 같은 m4의 데이터를 가져올 수 있는지)
console.log('\n━━ m4별 대표 FC 데이터 (크로스공정 매칭용) ━━');
for (const m4 of ['MC', 'MN', 'IM', 'EN']) {
  const wes = [...weMap.values()].filter(w => w.m4 === m4 && w.b4.size > 0);
  if (wes.length === 0) continue;
  const sample = wes[0];
  console.log(`  ${m4} (${wes.length}개 WE):`);
  console.log(`    대표 B2: ${[...sample.b2].slice(0, 2).join(' | ')}`);
  console.log(`    대표 B3: ${[...sample.b3].slice(0, 2).join(' | ')}`);
  console.log(`    대표 B4: ${[...sample.b4].slice(0, 3).join(' | ')}`);
  console.log(`    대표 B5: ${[...sample.b5].slice(0, 2).join(' | ')}`);
}

// JSON으로 전체 구조 출력 (API 설계용)
const sampleOutput = [];
for (const [, we] of weMap) {
  if (we.b4.size === 0) continue;
  sampleOutput.push({
    processNo: we.processNo, m4: we.m4, weName: we.weName,
    b2: [...we.b2], b3: [...we.b3], b4: [...we.b4],
    b5: [...we.b5], a6: [...we.a6],
  });
}
console.log(`\n━━ API 응답 구조 샘플 (상위 3건) ━━`);
for (const s of sampleOutput.slice(0, 3)) {
  console.log(JSON.stringify(s, null, 2));
}

await c.end();
