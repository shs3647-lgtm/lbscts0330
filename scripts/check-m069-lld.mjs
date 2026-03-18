import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL || 'postgresql://fmea_user:fmea_password@localhost:5432/fmea_onpremise' });
await c.connect();

const fmeaId = 'pfm26-m069';
const schema = 'pfmea_pfm26_m069';

// RiskAnalysis
const raCount = await c.query(`SELECT COUNT(*) as cnt FROM "${schema}".risk_analyses WHERE "fmeaId" = $1`, [fmeaId]);
const lldCount = await c.query(`SELECT COUNT(*) as cnt FROM "${schema}".risk_analyses WHERE "fmeaId" = $1 AND "lldReference" IS NOT NULL AND "lldReference" != ''`, [fmeaId]);
const dcCount = await c.query(`SELECT COUNT(*) as cnt FROM "${schema}".risk_analyses WHERE "fmeaId" = $1 AND "detectionControl" IS NOT NULL AND "detectionControl" != ''`, [fmeaId]);
const pcCount = await c.query(`SELECT COUNT(*) as cnt FROM "${schema}".risk_analyses WHERE "fmeaId" = $1 AND "preventionControl" IS NOT NULL AND "preventionControl" != ''`, [fmeaId]);

console.log('=== m069 RiskAnalysis (' + schema + ') ===');
console.log('총 RiskAnalysis:', raCount.rows[0].cnt);
console.log('preventionControl (PC 예방관리):', pcCount.rows[0].cnt);
console.log('detectionControl (DC 검출관리):', dcCount.rows[0].cnt);
console.log('lldReference (5ST LLD추천):', lldCount.rows[0].cnt);

// Optimization
const optDetail = await c.query(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN "recommendedAction" IS NOT NULL AND "recommendedAction" != '' THEN 1 END) as with_prev,
    COUNT(CASE WHEN "detectionAction" IS NOT NULL AND "detectionAction" != '' THEN 1 END) as with_det,
    COUNT(CASE WHEN "lldOptReference" IS NOT NULL AND "lldOptReference" != '' THEN 1 END) as with_lld_opt
  FROM "${schema}".optimizations WHERE "fmeaId" = $1
`, [fmeaId]);

console.log('\n=== m069 Optimization ===');
console.log('총 Optimization:', optDetail.rows[0].total);
console.log('recommendedAction (예방개선):', optDetail.rows[0].with_prev);
console.log('detectionAction (검출개선):', optDetail.rows[0].with_det);
console.log('lldOptReference (6ST LLD추천):', optDetail.rows[0].with_lld_opt);

// Legacy riskData
const legacyRes = await c.query(`SELECT data FROM "${schema}".fmea_legacy_data WHERE "fmeaId" = $1 LIMIT 1`, [fmeaId]);
if (legacyRes.rows.length > 0) {
  const data = legacyRes.rows[0].data;
  const rd = data?.riskData || {};
  const allKeys = Object.keys(rd);
  const lessonKeys = allKeys.filter(k => k.startsWith('lesson-') && !k.startsWith('lesson-opt-') && !k.startsWith('lesson-target-') && !k.startsWith('lesson-cls-'));
  const detOptKeys = allKeys.filter(k => k.startsWith('detection-opt-'));
  const lessonOptKeys = allKeys.filter(k => k.startsWith('lesson-opt-'));
  const prevOptKeys = allKeys.filter(k => k.startsWith('prevention-opt-'));
  console.log('\n=== m069 Legacy riskData ===');
  console.log('총 riskData 키:', allKeys.length);
  console.log('lesson-{uk} (5ST LLD):', lessonKeys.length);
  console.log('detection-opt-{uk} (검출개선):', detOptKeys.length);
  console.log('lesson-opt-{uk} (6ST LLD):', lessonOptKeys.length);
  console.log('prevention-opt-{uk} (예방개선):', prevOptKeys.length);
}

await c.end();
