import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL || 'postgresql://fmea_user:fmea_password@localhost:5432/fmea_onpremise' });
await c.connect();

const schemas = ['pfmea_pfm26_m066', 'pfmea_pfm26_m069', 'pfmea_pfm26_m071'];

for (const schema of schemas) {
  console.log(`\n=== ${schema} 컬럼 추가 ===`);

  // risk_analyses.lldReference
  try {
    await c.query(`ALTER TABLE "${schema}".risk_analyses ADD COLUMN IF NOT EXISTS "lldReference" TEXT`);
    console.log('  risk_analyses.lldReference: ADDED');
  } catch (e) {
    console.log('  risk_analyses.lldReference:', e.message);
  }

  // optimizations.detectionAction
  try {
    await c.query(`ALTER TABLE "${schema}".optimizations ADD COLUMN IF NOT EXISTS "detectionAction" TEXT`);
    console.log('  optimizations.detectionAction: ADDED');
  } catch (e) {
    console.log('  optimizations.detectionAction:', e.message);
  }

  // optimizations.lldOptReference
  try {
    await c.query(`ALTER TABLE "${schema}".optimizations ADD COLUMN IF NOT EXISTS "lldOptReference" TEXT`);
    console.log('  optimizations.lldOptReference: ADDED');
  } catch (e) {
    console.log('  optimizations.lldOptReference:', e.message);
  }
}

// 검증
console.log('\n=== 검증 ===');
for (const schema of schemas) {
  const raCols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'risk_analyses' AND column_name = 'lldReference'`, [schema]);
  const detCols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'optimizations' AND column_name = 'detectionAction'`, [schema]);
  const lldOptCols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'optimizations' AND column_name = 'lldOptReference'`, [schema]);
  
  const all = raCols.rows.length > 0 && detCols.rows.length > 0 && lldOptCols.rows.length > 0;
  console.log(`${schema}: lldReference=${raCols.rows.length > 0 ? 'OK' : 'FAIL'} detectionAction=${detCols.rows.length > 0 ? 'OK' : 'FAIL'} lldOptReference=${lldOptCols.rows.length > 0 ? 'OK' : 'FAIL'} → ${all ? 'ALL OK' : 'FAIL'}`);
}

await c.end();
console.log('\n완료: 3개 프로젝트 스키마에 LLD/개선추천 컬럼 추가됨');
