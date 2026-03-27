/**
 * m002 Import → DB 꽂아넣기 GAP 분석
 * 
 * Excel Import로 들어온 데이터 vs DB에 저장된 데이터 비교
 * 어디서 정보가 빠졌는지, 어디가 부족한지 전수 분석
 */
import pg from 'pg';
const c = new pg.Client('postgresql://postgres:1234@localhost:5432/fmea_db');
await c.connect();

const S = 'pfmea_pfm26_m002';

console.log('');
console.log('='.repeat(80));
console.log('  m002 Import→DB GAP 분석 — 부족한 정보 전수 조사');
console.log('='.repeat(80));

// ═══ 1. L1 (완제품) 분석 ═══
console.log('\n[1] L1 완제품 — 기능 / 요구사항 / 고장영향');
const l1f = await c.query(`
  SELECT l1f.id, l1f."functionName", l1f.category, l1f.requirement,
    (SELECT COUNT(*) FROM "${S}".failure_effects fe WHERE fe."l1FuncId" = l1f.id) AS fe_count
  FROM "${S}".l1_functions l1f ORDER BY l1f.category, l1f."functionName"
`);
let l1Missing = [];
for (const r of l1f.rows) {
  const issues = [];
  if (!r.functionName || r.functionName.trim() === '') issues.push('기능명 비어있음');
  if (!r.category || r.category.trim() === '') issues.push('구분(YP/SP/USER) 없음');
  if (!r.requirement || r.requirement.trim() === '') issues.push('요구사항 없음');
  if (parseInt(r.fe_count) === 0) issues.push('FE(고장영향) 0건');
  if (issues.length > 0) {
    l1Missing.push({ name: r.functionName, issues });
    console.log(`  ✗ [${r.category || '?'}] ${(r.functionName || '').substring(0, 50)} → ${issues.join(', ')}`);
  }
}
if (l1Missing.length === 0) console.log(`  ✓ L1 기능 ${l1f.rows.length}건 모두 완전`);
else console.log(`  → L1 부족: ${l1Missing.length}/${l1f.rows.length}건`);

// ═══ 2. L2 (공정) 분석 ═══
console.log('\n[2] L2 공정 — 공정기능 / 제품특성 / 고장형태');
const l2 = await c.query(`
  SELECT l2s.id, l2s.no, l2s.name,
    (SELECT COUNT(*) FROM "${S}".l2_functions l2f WHERE l2f."l2StructId" = l2s.id) AS func_count,
    (SELECT COUNT(*) FROM "${S}".failure_modes fm WHERE fm."l2StructId" = l2s.id) AS fm_count,
    (SELECT COUNT(*) FROM "${S}".process_product_chars pc WHERE pc."l2StructId" = l2s.id) AS pc_count
  FROM "${S}".l2_structures l2s ORDER BY l2s.no
`);
let l2Missing = [];
for (const r of l2.rows) {
  const issues = [];
  if (parseInt(r.func_count) === 0) issues.push('공정기능 0건');
  if (parseInt(r.fm_count) === 0) issues.push('FM 0건');
  if (parseInt(r.pc_count) === 0) issues.push('제품특성 0건');
  if (issues.length > 0) {
    l2Missing.push({ no: r.no, name: r.name, issues });
    console.log(`  ✗ [${r.no}] ${(r.name || '').padEnd(20)} → ${issues.join(', ')}`);
  }
}
if (l2Missing.length === 0) console.log(`  ✓ L2 공정 ${l2.rows.length}건 모두 완전`);
else console.log(`  → L2 부족: ${l2Missing.length}/${l2.rows.length}건`);

// ═══ 3. L3 (작업요소) 분석 ═══
console.log('\n[3] L3 작업요소 — 요소기능 / 공정특성 / 고장원인');
const l3 = await c.query(`
  SELECT l3s.id, l3s.name, l3s.m4, l2s.no AS process_no, l2s.name AS process_name,
    (SELECT COUNT(*) FROM "${S}".l3_functions l3f WHERE l3f."l3StructId" = l3s.id) AS func_count,
    (SELECT COUNT(*) FROM "${S}".failure_causes fc WHERE fc."l3StructId" = l3s.id) AS fc_count
  FROM "${S}".l3_structures l3s
  JOIN "${S}".l2_structures l2s ON l3s."l2Id" = l2s.id
  ORDER BY l2s.no, l3s.m4
`);
let l3NoFunc = 0, l3NoFC = 0, l3NoName = 0;
for (const r of l3.rows) {
  const issues = [];
  if (!r.name || r.name.trim() === '') { issues.push('이름 비어있음'); l3NoName++; }
  if (parseInt(r.func_count) === 0) { issues.push('요소기능 0건'); l3NoFunc++; }
  if (parseInt(r.fc_count) === 0) { issues.push('FC 0건'); l3NoFC++; }
  if (issues.length > 0 && issues.length < 3) { // 전부 비어있는건 placeholder
    console.log(`  ✗ [${r.process_no}/${r.m4}] ${(r.name || '(빈이름)').substring(0, 25).padEnd(27)} → ${issues.join(', ')}`);
  }
}
console.log(`  → L3 ${l3.rows.length}건 중: 이름없음=${l3NoName}, 기능없음=${l3NoFunc}, FC없음=${l3NoFC}`);

// ═══ 4. FailureLink 완전성 ═══
console.log('\n[4] FailureLink — FK 완전성');
const flGaps = await c.query(`
  SELECT 
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE "fmText" IS NULL OR "fmText" = '') AS no_fmText,
    COUNT(*) FILTER (WHERE "feText" IS NULL OR "feText" = '') AS no_feText,
    COUNT(*) FILTER (WHERE "fcText" IS NULL OR "fcText" = '') AS no_fcText,
    COUNT(*) FILTER (WHERE "feScope" IS NULL OR "feScope" = '') AS no_feScope,
    COUNT(*) FILTER (WHERE "fcWorkElem" IS NULL OR "fcWorkElem" = '') AS no_fcWE,
    COUNT(*) FILTER (WHERE "fcM4" IS NULL OR "fcM4" = '') AS no_fcM4,
    COUNT(*) FILTER (WHERE severity IS NULL) AS no_sev
  FROM "${S}".failure_links WHERE "deletedAt" IS NULL
`);
const fg = flGaps.rows[0];
console.log(`  총 FailureLink: ${fg.total}건`);
console.log(`  fmText 비어있음: ${fg.no_fmtext}건`);
console.log(`  feText 비어있음: ${fg.no_fetext}건`);
console.log(`  fcText 비어있음: ${fg.no_fctext}건`);
console.log(`  feScope(FE구분) 비어있음: ${fg.no_fescope}건`);
console.log(`  fcWorkElem(작업요소) 비어있음: ${fg.no_fcwe}건`);
console.log(`  fcM4(4M) 비어있음: ${fg.no_fcm4}건`);
console.log(`  severity 없음: ${fg.no_sev}건`);

// ═══ 5. RiskAnalysis 완전성 ═══
console.log('\n[5] RiskAnalysis — S/O/D/PC/DC 완전성');
const raGaps = await c.query(`
  SELECT 
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE severity IS NULL OR severity = 0) AS no_s,
    COUNT(*) FILTER (WHERE occurrence IS NULL OR occurrence = 0) AS no_o,
    COUNT(*) FILTER (WHERE detection IS NULL OR detection = 0) AS no_d,
    COUNT(*) FILTER (WHERE "preventionControl" IS NULL OR "preventionControl" = '') AS no_pc,
    COUNT(*) FILTER (WHERE "detectionControl" IS NULL OR "detectionControl" = '') AS no_dc,
    COUNT(*) FILTER (WHERE ap IS NULL OR ap = '') AS no_ap
  FROM "${S}".risk_analyses
`);
const rg = raGaps.rows[0];
console.log(`  총 RiskAnalysis: ${rg.total}건`);
console.log(`  Severity 없음: ${rg.no_s}건`);
console.log(`  Occurrence 없음: ${rg.no_o}건`);
console.log(`  Detection 없음: ${rg.no_d}건`);
console.log(`  PC(예방관리) 비어있음: ${rg.no_pc}건`);
console.log(`  DC(검출관리) 비어있음: ${rg.no_dc}건`);
console.log(`  AP 없음: ${rg.no_ap}건`);

// ═══ 6. L3Function → ProcessChar 매핑 ═══
console.log('\n[6] L3Function — processChar(공정특성) 연결');
const l3fGaps = await c.query(`
  SELECT 
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE "functionName" IS NULL OR "functionName" = '') AS no_name,
    COUNT(*) FILTER (WHERE "processChar" IS NULL OR "processChar" = '') AS no_pc
  FROM "${S}".l3_functions
`);
const lg = l3fGaps.rows[0];
console.log(`  총 L3Function: ${lg.total}건`);
console.log(`  기능명 비어있음: ${lg.no_name}건`);
console.log(`  공정특성(processChar) 비어있음: ${lg.no_pc}건`);

// ═══ 7. Optimization 완전성 ═══
console.log('\n[7] Optimization — 개선활동');
const optGaps = await c.query(`
  SELECT 
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE "recommendedAction" IS NULL OR "recommendedAction" = '') AS no_desc,
    COUNT(*) FILTER (WHERE responsible IS NULL OR responsible = '') AS no_resp,
    COUNT(*) FILTER (WHERE status IS NULL OR status = '') AS no_status
  FROM "${S}".optimizations
`);
const og = optGaps.rows[0];
console.log(`  총 Optimization: ${og.total}건`);
console.log(`  설명 비어있음: ${og.no_desc}건`);
console.log(`  담당자 비어있음: ${og.no_resp}건`);
console.log(`  상태 비어있음: ${og.no_status}건`);

// ═══ 8. 골든 베이스라인 대비 ═══
console.log('\n' + '='.repeat(80));
console.log('  골든 베이스라인 대비 현황 (CLAUDE.md 기준)');
console.log('='.repeat(80));
const baseline = {
  L2: { expected: 21, col: 'l2_structures' },
  L3: { expected: 91, col: 'l3_structures' },
  L1F: { expected: 17, col: 'l1_functions' },
  L2F: { expected: 26, col: 'l2_functions' },
  L3F: { expected: 103, col: 'l3_functions' },
  FM: { expected: 26, col: 'failure_modes' },
  FE: { expected: 20, col: 'failure_effects' },
  FC: { expected: 104, col: 'failure_causes' },
  FL: { expected: 104, col: 'failure_links' },
  RA: { expected: 104, col: 'risk_analyses' },
};

console.log(`  ${'항목'.padEnd(10)} ${'기대값'.padStart(8)} ${'실제값'.padStart(8)} ${'차이'.padStart(8)} 상태`);
console.log('  ' + '-'.repeat(50));
for (const [key, val] of Object.entries(baseline)) {
  const actual = await c.query(`SELECT COUNT(*) AS cnt FROM "${S}"."${val.col}"`);
  const act = parseInt(actual.rows[0].cnt);
  const diff = act - val.expected;
  const status = diff === 0 ? 'EXACT' : diff > 0 ? `+${diff} (초과)` : `${diff} (부족)`;
  console.log(`  ${key.padEnd(10)} ${String(val.expected).padStart(8)} ${String(act).padStart(8)} ${String(diff).padStart(8)} ${status}`);
}

// ═══ 9. 최종 요약 ═══
console.log('\n' + '='.repeat(80));
console.log('  GAP 요약 — Import Excel에서 보충 필요한 항목');
console.log('='.repeat(80));

const gaps = [];
if (parseInt(rg.no_pc) > 0) gaps.push(`PC(예방관리) ${rg.no_pc}건 비어있음`);
if (parseInt(rg.no_dc) > 0) gaps.push(`DC(검출관리) ${rg.no_dc}건 비어있음`);
if (parseInt(rg.no_s) > 0) gaps.push(`Severity ${rg.no_s}건 없음`);
if (parseInt(rg.no_o) > 0) gaps.push(`Occurrence ${rg.no_o}건 없음`);
if (parseInt(rg.no_d) > 0) gaps.push(`Detection ${rg.no_d}건 없음`);
if (parseInt(fg.no_fescope) > 0) gaps.push(`FE구분(YP/SP/USER) ${fg.no_fescope}건 비어있음`);
if (parseInt(fg.no_fcwe) > 0) gaps.push(`작업요소(WE) ${fg.no_fcwe}건 비어있음`);
if (parseInt(fg.no_fcm4) > 0) gaps.push(`4M ${fg.no_fcm4}건 비어있음`);
if (l3NoFunc > 0) gaps.push(`L3 요소기능 ${l3NoFunc}건 없음`);
if (parseInt(lg.no_pc) > 0) gaps.push(`공정특성 ${lg.no_pc}건 비어있음`);

if (gaps.length === 0) {
  console.log('  ★ 부족한 정보 없음 — Import 데이터 완전!');
} else {
  for (const g of gaps) console.log(`  → ${g}`);
}
console.log('');

await c.end();
