require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const schema = 'pfmea_pfm26_m004';
  const fmeaId = 'pfm26-m004';
  
  // 현재 상태
  const fl = await pool.query(`SELECT COUNT(*)::int as c FROM "${schema}".failure_links WHERE "fmeaId" = $1`, [fmeaId]);
  const ra = await pool.query(`SELECT COUNT(*)::int as c FROM "${schema}".risk_analyses WHERE "fmeaId" = $1`, [fmeaId]);
  console.log(`[삭제 전] FL=${fl.rows[0].c}, RA=${ra.rows[0].c}`);
  
  // 기존 FL/RA 삭제 (재Import 시 새 데이터로 대체)
  const delRA = await pool.query(`DELETE FROM "${schema}".risk_analyses WHERE "fmeaId" = $1`, [fmeaId]);
  const delFL = await pool.query(`DELETE FROM "${schema}".failure_links WHERE "fmeaId" = $1`, [fmeaId]);
  console.log(`[삭제] RA ${delRA.rowCount}건, FL ${delFL.rowCount}건`);
  
  // 기존 FC/FM/FE도 삭제 (새 엑셀에서 재생성)
  const delFC = await pool.query(`DELETE FROM "${schema}".failure_causes WHERE "fmeaId" = $1`, [fmeaId]);
  const delFM = await pool.query(`DELETE FROM "${schema}".failure_modes WHERE "fmeaId" = $1`, [fmeaId]);
  const delFE = await pool.query(`DELETE FROM "${schema}".failure_effects WHERE "fmeaId" = $1`, [fmeaId]);
  console.log(`[삭제] FC ${delFC.rowCount}건, FM ${delFM.rowCount}건, FE ${delFE.rowCount}건`);
  
  console.log(`\n✅ pfm26-m004 고장 데이터 초기화 완료 — 재Import 준비됨`);
  await pool.end();
}
main().catch(e => { console.error(e.message); pool.end(); });
