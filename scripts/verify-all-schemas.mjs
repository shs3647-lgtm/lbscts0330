import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL || 'postgresql://fmea_user:fmea_password@localhost:5432/fmea_onpremise' });
await c.connect();

const schemas = ['public', 'pfmea_pfm26_m002', 'pfmea_pfm26_m069', 'pfmea_pfm26_m071'];
const checkCols = [
  { table: 'risk_analyses', col: 'lldReference' },
  { table: 'optimizations', col: 'detectionAction' },
  { table: 'optimizations', col: 'lldOptReference' },
];

console.log('=== 전체 스키마 컬럼 동기화 검증 ===\n');
let allOk = true;
for (const schema of schemas) {
  const results = [];
  for (const { table, col } of checkCols) {
    const res = await c.query(`SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND column_name = $3)`, [schema, table, col]);
    const exists = res.rows[0].exists;
    results.push(`${table}.${col}=${exists ? 'OK' : 'MISSING'}`);
    if (!exists) allOk = false;
  }
  console.log(`${schema}: ${results.join(' | ')}`);
}

console.log(`\n결과: ${allOk ? 'ALL OK' : 'FAIL — 누락 컬럼 있음'}`);

// m069 데이터 현황
console.log('\n=== m069 데이터 현황 ===');
const fmeaId = 'pfm26-m069';
const schema = 'pfmea_pfm26_m069';
const ra = await c.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN "lldReference" IS NOT NULL AND "lldReference" != '' THEN 1 END) as lld FROM "${schema}".risk_analyses WHERE "fmeaId" = $1`, [fmeaId]);
const opt = await c.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN "recommendedAction" IS NOT NULL AND "recommendedAction" != '' THEN 1 END) as prev, COUNT(CASE WHEN "detectionAction" IS NOT NULL AND "detectionAction" != '' THEN 1 END) as det, COUNT(CASE WHEN "lldOptReference" IS NOT NULL AND "lldOptReference" != '' THEN 1 END) as lld FROM "${schema}".optimizations WHERE "fmeaId" = $1`, [fmeaId]);

console.log(`RiskAnalysis: ${ra.rows[0].total}건 (lldReference: ${ra.rows[0].lld}건)`);
console.log(`Optimization: ${opt.rows[0].total}건 (예방개선: ${opt.rows[0].prev}건, 검출개선: ${opt.rows[0].det}건, 6ST LLD: ${opt.rows[0].lld}건)`);

await c.end();
