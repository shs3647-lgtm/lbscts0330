import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });
const q = async (sql, p = []) => (await pool.query(sql, p)).rows;

async function main() {
  const fmeaId = 'pfm26-m002';
  await q(`SET search_path TO pfmea_pfm26_m002, public`);

  // auto-fix FL 확인
  const autoFLs = await q(`SELECT id, "fmId", "fcId", "feId" FROM failure_links WHERE "fmeaId" = $1 AND id LIKE 'auto-%'`, [fmeaId]);
  console.log('auto-fix FLs:', autoFLs.length);
  for (const fl of autoFLs) {
    const [fc] = await q(`SELECT id, cause, "l3StructId" FROM failure_causes WHERE id = $1`, [fl.fcId]);
    console.log(`  FL ${fl.id}`);
    console.log(`    FC: ${fc?.id} → "${fc?.cause}" (l3=${fc?.l3StructId})`);
  }

  // WE PF-L3-040-IM-002 현재 상태
  const l3funcs = await q(`SELECT id, "functionName", "processChar" FROM l3_functions WHERE "l3StructId" = 'PF-L3-040-IM-002' AND "fmeaId" = $1`, [fmeaId]);
  console.log('\nL3 PF-L3-040-IM-002의 L3F:', l3funcs.length);

  const fcs = await q(`SELECT id, cause FROM failure_causes WHERE "l3StructId" = 'PF-L3-040-IM-002' AND "fmeaId" = $1`, [fmeaId]);
  console.log('L3 PF-L3-040-IM-002의 FC:', fcs.length);

  // pipeline-verify POST로 자동수정 시도
  console.log('\n→ pipeline-verify POST로 자동수정 실행...');
  const res = await fetch('http://localhost:3000/api/fmea/pipeline-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId }),
  });
  const result = await res.json();
  console.log('allGreen:', result.allGreen);
  for (const step of result.steps || []) {
    const icon = step.status === 'ok' ? '✅' : step.status === 'warn' ? '⚠️' : '❌';
    console.log(`  STEP ${step.step} ${step.name}: ${icon} ${step.status}`);
    if (step.issues?.length > 0) step.issues.forEach(i => console.log(`    - ${i}`));
    if (step.fixed?.length > 0) step.fixed.forEach(f => console.log(`    ✔ ${f}`));
  }
}
main().catch(console.error).finally(() => pool.end());
