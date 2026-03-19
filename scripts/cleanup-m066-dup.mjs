import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });
const q = async (sql, p = []) => (await pool.query(sql, p)).rows;

async function main() {
  const fmeaId = 'pfm26-m066';
  const schema = 'pfmea_pfm26_m066';
  await q(`SET search_path TO "${schema}", public`);

  // M066 현재 FL/RA 수
  const [flCount] = await q(`SELECT count(*) as c FROM failure_links WHERE "fmeaId" = $1`, [fmeaId]);
  const [raCount] = await q(`SELECT count(*) as c FROM risk_analyses WHERE "fmeaId" = $1`, [fmeaId]);
  console.log(`M066 현재: FL=${flCount.c}, RA=${raCount.c}`);

  // auto-fix 잔재 FL 찾기 (process 040, auto-fix FC)
  const autoFLs = await q(`
    SELECT fl.id, fl."fmId", fl."fcId"
    FROM failure_links fl
    WHERE fl."fmeaId" = $1
      AND fl.id LIKE 'auto-fc-autofix%'
  `, [fmeaId]);
  console.log(`auto-fix FL: ${autoFLs.length}건`);
  for (const fl of autoFLs) console.log(`  ${fl.id} → fc=${fl.fcId}`);

  if (autoFLs.length === 0) {
    console.log('삭제 대상 없음');
    await pool.end();
    return;
  }

  // 삭제: RA → Optimization → FL → FC (참조 순서)
  for (const fl of autoFLs) {
    // Optimization 삭제 (RA의 자식)
    const ras = await q(`SELECT id FROM risk_analyses WHERE "linkId" = $1`, [fl.id]);
    for (const ra of ras) {
      await q(`DELETE FROM optimizations WHERE "riskId" = $1`, [ra.id]);
    }
    // RA 삭제
    await q(`DELETE FROM risk_analyses WHERE "linkId" = $1`, [fl.id]);
    // FL 삭제
    await q(`DELETE FROM failure_links WHERE id = $1`, [fl.id]);
    // FC 삭제 (다른 FL이 참조 안 하면)
    const [refCount] = await q(`SELECT count(*) as c FROM failure_links WHERE "fcId" = $1`, [fl.fcId]);
    if (parseInt(refCount.c) === 0) {
      await q(`DELETE FROM failure_causes WHERE id = $1`, [fl.fcId]);
      console.log(`  FC ${fl.fcId} 삭제 (고아)`);
    }
    console.log(`  FL ${fl.id} + RA 삭제 완료`);
  }

  // 최종 확인
  const [flAfter] = await q(`SELECT count(*) as c FROM failure_links WHERE "fmeaId" = $1`, [fmeaId]);
  const [raAfter] = await q(`SELECT count(*) as c FROM risk_analyses WHERE "fmeaId" = $1`, [fmeaId]);
  console.log(`\nM066 정리 후: FL=${flAfter.c}, RA=${raAfter.c}`);
}

main().catch(console.error).finally(() => pool.end());
