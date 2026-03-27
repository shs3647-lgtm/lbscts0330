// m002 LLD/개선추천 데이터를 legacy riskData → atomic DB optimizations에 동기화
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const fmeaId = process.argv[2] || 'pfm26-m002';
const schema = `pfmea_${fmeaId.replace(/-/g, '_')}`;

console.log(`Syncing LLD/improvement data for ${fmeaId} (schema: ${schema})`);

// 1. Load legacy riskData
const legacyRes = await pool.query(
  `SELECT data FROM public.fmea_legacy_data WHERE "fmeaId" = $1 LIMIT 1`,
  [fmeaId]
);
if (!legacyRes.rows.length) {
  console.log('No legacy data found');
  process.exit(1);
}
const rd = legacyRes.rows[0].data?.riskData || {};

// 2. Load failure links
const linksRes = await pool.query(`SELECT id, "fmId", "fcId" FROM "${schema}".failure_links`);
const linkMap = new Map();
for (const l of linksRes.rows) {
  linkMap.set(`${l.fmId}-${l.fcId}`, l.id);
}

// 3. Load risk analyses (linkId → riskId)
const risksRes = await pool.query(`SELECT id, "linkId" FROM "${schema}".risk_analyses`);
const riskByLinkId = new Map();
for (const r of risksRes.rows) {
  riskByLinkId.set(r.linkId, r.id);
}

// 4. Load current optimizations (riskId → opt)
const optsRes = await pool.query(`SELECT id, "riskId", "lldOptReference", "detectionAction" FROM "${schema}".optimizations`);
const optByRiskId = new Map();
for (const o of optsRes.rows) {
  optByRiskId.set(o.riskId, o);
}

// 5. For each lesson-opt-* key, find the optimization and update
let updatedLld = 0;
let updatedDet = 0;

for (const link of linksRes.rows) {
  const uk = `${link.fmId}-${link.fcId}`;
  const riskId = riskByLinkId.get(link.id);
  if (!riskId) continue;
  const opt = optByRiskId.get(riskId);
  if (!opt) continue;

  const lessonVal = rd[`lesson-opt-${uk}`] || '';
  const detVal = rd[`detection-opt-${uk}`] || '';

  const needLld = lessonVal && !opt.lldOptReference;
  const needDet = detVal && !opt.detectionAction;

  if (needLld || needDet) {
    const sets = [];
    const vals = [];
    let paramIdx = 1;

    if (needLld) {
      sets.push(`"lldOptReference" = $${paramIdx++}`);
      vals.push(String(lessonVal));
      updatedLld++;
    }
    if (needDet) {
      sets.push(`"detectionAction" = $${paramIdx++}`);
      vals.push(String(detVal));
      updatedDet++;
    }

    vals.push(opt.id);
    await pool.query(
      `UPDATE "${schema}".optimizations SET ${sets.join(', ')}, "updatedAt" = NOW() WHERE id = $${paramIdx}`,
      vals
    );
  }
}

console.log(`Updated: lldOptReference=${updatedLld}, detectionAction=${updatedDet}`);

// Also sync lldReference to risk_analyses
let updatedRiskLld = 0;
for (const link of linksRes.rows) {
  const uk = `${link.fmId}-${link.fcId}`;
  const riskId = riskByLinkId.get(link.id);
  if (!riskId) continue;

  const lessonVal = rd[`lesson-${uk}`] || '';
  if (lessonVal) {
    const r = await pool.query(
      `SELECT "lldReference" FROM "${schema}".risk_analyses WHERE id = $1`,
      [riskId]
    );
    if (r.rows[0] && !r.rows[0].lldReference) {
      await pool.query(
        `UPDATE "${schema}".risk_analyses SET "lldReference" = $1, "updatedAt" = NOW() WHERE id = $2`,
        [String(lessonVal), riskId]
      );
      updatedRiskLld++;
    }
  }
}
console.log(`RiskAnalysis lldReference updated: ${updatedRiskLld}`);

// Verify
const verifyOpts = await pool.query(`
  SELECT COUNT(*) as total,
    COUNT(CASE WHEN "lldOptReference" IS NOT NULL AND "lldOptReference" != '' THEN 1 END) as lld,
    COUNT(CASE WHEN "detectionAction" IS NOT NULL AND "detectionAction" != '' THEN 1 END) as det
  FROM "${schema}".optimizations WHERE "fmeaId" = $1
`, [fmeaId]);
console.log('\nVerification:');
console.log('Optimizations total:', verifyOpts.rows[0].total, 'withLLD:', verifyOpts.rows[0].lld, 'withDetAction:', verifyOpts.rows[0].det);

const verifyRisks = await pool.query(`
  SELECT COUNT(CASE WHEN "lldReference" IS NOT NULL AND "lldReference" != '' THEN 1 END) as lld
  FROM "${schema}".risk_analyses WHERE "fmeaId" = $1
`, [fmeaId]);
console.log('RiskAnalyses withLLD:', verifyRisks.rows[0].lld);

await pool.end();
console.log('Done.');
