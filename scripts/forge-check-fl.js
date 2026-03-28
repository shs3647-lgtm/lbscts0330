require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const schema = 'pfmea_pfm26_m004';
  const fmeaId = 'pfm26-m004';
  
  // FL에 연결된 fcId 목록
  const flFcIds = await pool.query(`SELECT DISTINCT "fcId" FROM "${schema}".failure_links WHERE "fmeaId" = $1`, [fmeaId]);
  const linkedFcIds = new Set(flFcIds.rows.map(r => r.fcId));
  
  // 전체 FC
  const allFCs = await pool.query(`SELECT id, cause FROM "${schema}".failure_causes WHERE "fmeaId" = $1`, [fmeaId]);
  
  // 미연결 FC
  const unlinked = allFCs.rows.filter(fc => !linkedFcIds.has(fc.id));
  
  console.log(`전체 FC: ${allFCs.rows.length}건`);
  console.log(`FL 연결 FC: ${linkedFcIds.size}건`);
  console.log(`미연결 FC: ${unlinked.length}건`);
  console.log(`미연결 FC 목록 (처음 10건):`, unlinked.slice(0, 10).map(fc => `${fc.id}: ${fc.cause.substring(0, 30)}`));
  
  // FL에 연결된 fmId 목록
  const flFmIds = await pool.query(`SELECT DISTINCT "fmId" FROM "${schema}".failure_links WHERE "fmeaId" = $1`, [fmeaId]);
  const linkedFmIds = new Set(flFmIds.rows.map(r => r.fmId));
  const allFMs = await pool.query(`SELECT id, mode FROM "${schema}".failure_modes WHERE "fmeaId" = $1`, [fmeaId]);
  const unlinkedFMs = allFMs.rows.filter(fm => !linkedFmIds.has(fm.id));
  console.log(`\n전체 FM: ${allFMs.rows.length}건`);
  console.log(`FL 연결 FM: ${linkedFmIds.size}건`);
  console.log(`미연결 FM: ${unlinkedFMs.length}건`);
  if (unlinkedFMs.length > 0) {
    console.log(`미연결 FM:`, unlinkedFMs.map(fm => `${fm.id}: ${fm.mode.substring(0, 30)}`));
  }
  
  // FL에 연결된 feId 목록
  const flFeIds = await pool.query(`SELECT DISTINCT "feId" FROM "${schema}".failure_links WHERE "fmeaId" = $1`, [fmeaId]);
  const linkedFeIds = new Set(flFeIds.rows.map(r => r.feId));
  const allFEs = await pool.query(`SELECT id, effect FROM "${schema}".failure_effects WHERE "fmeaId" = $1`, [fmeaId]);
  const unlinkedFEs = allFEs.rows.filter(fe => !linkedFeIds.has(fe.id));
  console.log(`\n전체 FE: ${allFEs.rows.length}건`);
  console.log(`FL 연결 FE: ${linkedFeIds.size}건`);
  console.log(`미연결 FE: ${unlinkedFEs.length}건`);
  if (unlinkedFEs.length > 0) {
    console.log(`미연결 FE:`, unlinkedFEs.map(fe => `${fe.id}: ${fe.effect.substring(0, 40)}`));
  }
  
  await pool.end();
}
main().catch(e => { console.error(e.message); pool.end(); });
