/**
 * fmea_sample DB 생성 — m066의 완전한 골든 레퍼런스 복제
 * 
 * 복제 대상: L1/L2/L3 구조+기능, FM/FE/FC, FailureLink, RiskAnalysis, Optimization
 * 용도: Import 시 누락 데이터 비교/보충용 마스터 레퍼런스
 */
import pg from 'pg';

const SRC = 'pfmea_pfm26_m066';
const DST = 'pfmea_fmea_sample';

const c = new pg.Client('postgresql://postgres:1234@localhost:5432/fmea_db');
await c.connect();

console.log('='.repeat(70));
console.log(`  fmea_sample DB 생성 — ${SRC} → ${DST}`);
console.log('='.repeat(70));

// 1. 기존 sample 스키마 삭제 후 재생성
console.log('\n[1/4] 스키마 생성...');
await c.query(`DROP SCHEMA IF EXISTS "${DST}" CASCADE`);
console.log(`  DROP 완료: ${DST}`);

// 소스 스키마의 모든 테이블 DDL 복제
const srcTables = await c.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = '${SRC}' ORDER BY table_name
`);

// 스키마 통째로 복제 (pg_dump 방식 대신 CREATE TABLE AS SELECT 사용)
await c.query(`CREATE SCHEMA "${DST}"`);
console.log(`  CREATE 완료: ${DST}`);

// 2. 핵심 테이블 복제 (구조 + 데이터)
console.log('\n[2/4] 테이블 복제...');
const tables = srcTables.rows.map(r => r.table_name);
let copied = 0, skipped = 0;

for (const tbl of tables) {
  try {
    // CREATE TABLE AS SELECT — 구조 + 데이터 한번에 복제
    await c.query(`CREATE TABLE "${DST}"."${tbl}" AS SELECT * FROM "${SRC}"."${tbl}"`);
    
    // 행 수 확인
    const cnt = await c.query(`SELECT COUNT(*) AS cnt FROM "${DST}"."${tbl}"`);
    const n = parseInt(cnt.rows[0].cnt);
    if (n > 0) {
      console.log(`  ✓ ${tbl.padEnd(30)} ${n}행`);
    }
    copied++;
  } catch (e) {
    console.log(`  ✗ ${tbl.padEnd(30)} 실패: ${e.message.substring(0, 50)}`);
    skipped++;
  }
}
console.log(`  복제 완료: ${copied}개 테이블 (스킵: ${skipped})`);

// 3. fmeaId를 'fmea-sample'로 변경
console.log('\n[3/4] fmeaId 변환 (pfm26-m066 → fmea-sample)...');
const fmeaIdTables = [
  'l1_structures', 'l1_functions', 'l2_structures', 'l2_functions',
  'l3_structures', 'l3_functions', 'failure_modes', 'failure_effects',
  'failure_causes', 'failure_links', 'risk_analyses', 'failure_analyses',
  'optimizations', 'process_product_chars',
];
for (const tbl of fmeaIdTables) {
  try {
    const cols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='${DST}' AND table_name='${tbl}' AND column_name='fmeaId'`);
    if (cols.rows.length > 0) {
      await c.query(`UPDATE "${DST}"."${tbl}" SET "fmeaId" = 'fmea-sample'`);
    }
  } catch { /* column doesn't exist */ }
}
console.log('  fmeaId 변환 완료');

// 4. 검증
console.log('\n[4/4] 검증...');
const verify = [
  ['l1_structures', 'L1 구조'],
  ['l2_structures', 'L2 공정'],
  ['l3_structures', 'L3 작업요소'],
  ['l1_functions', 'L1 기능'],
  ['l2_functions', 'L2 공정기능'],
  ['l3_functions', 'L3 요소기능'],
  ['failure_modes', 'FM 고장형태'],
  ['failure_effects', 'FE 고장영향'],
  ['failure_causes', 'FC 고장원인'],
  ['failure_links', 'FailureLink'],
  ['risk_analyses', 'RiskAnalysis'],
  ['optimizations', 'Optimization'],
  ['process_product_chars', 'ProductChar'],
];

console.log(`  ${'테이블'.padEnd(28)} ${'원본(m066)'.padStart(10)} ${'복제(sample)'.padStart(12)} 일치`);
console.log('  ' + '-'.repeat(65));
let allMatch = true;
for (const [tbl, label] of verify) {
  try {
    const src = await c.query(`SELECT COUNT(*) AS cnt FROM "${SRC}"."${tbl}"`);
    const dst = await c.query(`SELECT COUNT(*) AS cnt FROM "${DST}"."${tbl}"`);
    const s = parseInt(src.rows[0].cnt);
    const d = parseInt(dst.rows[0].cnt);
    const match = s === d ? 'OK' : 'MISMATCH';
    if (s !== d) allMatch = false;
    console.log(`  ${label.padEnd(28)} ${String(s).padStart(10)} ${String(d).padStart(12)} ${match}`);
  } catch {
    console.log(`  ${label.padEnd(28)} ${'?'.padStart(10)} ${'?'.padStart(12)} SKIP`);
  }
}

console.log('\n' + '='.repeat(70));
console.log(`  결과: ${allMatch ? 'ALL MATCH — fmea_sample DB 생성 완료!' : 'MISMATCH 있음 — 확인 필요'}`);
console.log(`  스키마: ${DST}`);
console.log(`  fmeaId: fmea-sample`);
console.log(`  DB Viewer: http://localhost:3000/api/fmea/db-viewer?fmeaId=fmea-sample`);
console.log('='.repeat(70));

await c.end();
