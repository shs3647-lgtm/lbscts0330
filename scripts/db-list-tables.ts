import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  
  // 모든 스키마 조회
  const schemas = await p.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'pfmea_%' OR schema_name LIKE 'dfmea_%' ORDER BY schema_name");
  console.log('Project schemas:', schemas.rows.map((r: any) => r.schema_name));

  // DFMEA 관련 테이블에서 데이터 확인 (public schema)
  const dfmeaIds = ['c4348247-6bb9-4d82-83d7-7baf6528de6a', '36363eea-52ce-426c-84ef-15ae5ea57220'];
  
  const tables = ['l1_scopes', 'l2_structures', 'l3_structures', 'failure_modes', 'failure_effects', 'failure_causes',
                  'l1_functions', 'l2_functions', 'l3_functions', 'l1_requirements'];
  
  for (const t of tables) {
    for (const fid of dfmeaIds) {
      try {
        const r = await p.query(`SELECT count(*) FROM ${t} WHERE "fmeaId" = $1`, [fid]);
        const cnt = parseInt(r.rows[0].count);
        if (cnt > 0) {
          console.log(`\n${t}: ${cnt} rows for ${fid.slice(0,8)}`);
          const sample = await p.query(`SELECT id, name FROM ${t} WHERE "fmeaId" = $1 LIMIT 3`, [fid]);
          sample.rows.forEach((row: any) => {
            const garbled = row.name && (row.name.includes('Ã') || row.name.includes('Â'));
            console.log(`  ${garbled ? '⚠️' : '✅'} ${row.name?.slice(0, 60) || '(null)'}`);
          });
        }
      } catch {}
    }
  }

  await p.end();
}
main();
