import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });
const q = async (sql, p = []) => (await pool.query(sql, p)).rows;

async function main() {
  const fmeaId = 'pfm26-m066';
  await q(`SET search_path TO pfmea_pfm26_m066, public`);

  // FC PF-L3-040-IM-002-G-FC의 l3StructId를 IM-002로 바로잡고, l3FuncId도 연결
  const fcId = 'PF-L3-040-IM-002-G-FC';
  const correctL3 = 'PF-L3-040-IM-002';
  const l3fId = 'PF-L3-040-IM-002-L3F';

  const [before] = await q(`SELECT "l3StructId", "l3FuncId" FROM failure_causes WHERE id = $1`, [fcId]);
  console.log(`FC ${fcId} 수정 전: l3=${before?.l3StructId}, l3f=${before?.l3FuncId}`);

  await q(`UPDATE failure_causes SET "l3StructId" = $1, "l3FuncId" = $2 WHERE id = $3`, [correctL3, l3fId, fcId]);
  
  const [after] = await q(`SELECT "l3StructId", "l3FuncId" FROM failure_causes WHERE id = $1`, [fcId]);
  console.log(`FC ${fcId} 수정 후: l3=${after?.l3StructId}, l3f=${after?.l3FuncId}`);

  // pipeline-verify GET
  console.log('\n--- pipeline-verify GET ---');
  const res = await fetch(`http://localhost:3000/api/fmea/pipeline-verify?fmeaId=${fmeaId}`);
  const result = await res.json();
  console.log('allGreen:', result.allGreen);
  for (const step of result.steps) {
    const icon = step.status === 'ok' ? '✅' : step.status === 'warn' ? '⚠️' : '❌';
    console.log(`  STEP${step.step} ${step.name}: ${icon} ${step.status} ${(step.issues||[]).join(', ')}`);
  }
}
main().catch(console.error).finally(() => pool.end());
