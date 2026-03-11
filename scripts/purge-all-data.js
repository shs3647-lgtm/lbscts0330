const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1); }

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });

async function main() {
  console.log('========== 전체 데이터 PURGE 시작 ==========\n');

  // 1. FmeaWorksheetData 삭제
  try {
    const r = await p.$queryRaw`DELETE FROM fmea_worksheet_data RETURNING id`;
    console.log(`[1] FmeaWorksheetData: ${r.length}건 삭제`);
  } catch { console.log('[1] FmeaWorksheetData: skip'); }

  // 2. FmeaLegacyData 삭제
  try {
    const r = await p.$queryRaw`DELETE FROM fmea_legacy_data RETURNING id`;
    console.log(`[2] FmeaLegacyData: ${r.length}건 삭제`);
  } catch { console.log('[2] FmeaLegacyData: skip'); }

  // 3. FmeaCftMember 삭제
  try {
    const r = await p.$queryRaw`DELETE FROM fmea_cft_members RETURNING id`;
    console.log(`[3] FmeaCftMember: ${r.length}건 삭제`);
  } catch { console.log('[3] FmeaCftMember: skip'); }

  // 4. ProjectLinkage 삭제
  try {
    const r = await p.$queryRaw`DELETE FROM project_linkages RETURNING id`;
    console.log(`[4] ProjectLinkage: ${r.length}건 삭제`);
  } catch { console.log('[4] ProjectLinkage: skip'); }

  // 5. PfmeaMasterFlatItem 삭제 (FK cascade이지만 명시적으로)
  try {
    const r = await p.$queryRaw`DELETE FROM pfmea_master_flat_items RETURNING id`;
    console.log(`[5] PfmeaMasterFlatItem: ${r.length}건 삭제`);
  } catch { console.log('[5] PfmeaMasterFlatItem: skip'); }

  // 6. PfmeaMasterDataset 삭제
  try {
    const r = await p.pfmeaMasterDataset.deleteMany({});
    console.log(`[6] PfmeaMasterDataset: ${r.count}건 삭제`);
  } catch { console.log('[6] PfmeaMasterDataset: skip'); }

  // 7. DfmeaMasterDataset 삭제
  try {
    const r = await p.dfmeaMasterDataset.deleteMany({});
    console.log(`[7] DfmeaMasterDataset: ${r.count}건 삭제`);
  } catch { console.log('[7] DfmeaMasterDataset: skip'); }

  // 8. CpRegistration 삭제
  try {
    const r = await p.$queryRaw`DELETE FROM cp_registrations RETURNING id`;
    console.log(`[8] CpRegistration: ${r.length}건 삭제`);
  } catch { console.log('[8] CpRegistration: skip'); }

  // 9. PfdRegistration 삭제
  try {
    const r = await p.$queryRaw`DELETE FROM pfd_registrations RETURNING id`;
    console.log(`[9] PfdRegistration: ${r.length}건 삭제`);
  } catch { console.log('[9] PfdRegistration: skip'); }

  // 10. WsRegistration 삭제
  try {
    const r = await p.$queryRaw`DELETE FROM ws_registrations RETURNING id`;
    console.log(`[10] WsRegistration: ${r.length}건 삭제`);
  } catch { console.log('[10] WsRegistration: skip'); }

  // 11. PmRegistration 삭제
  try {
    const r = await p.$queryRaw`DELETE FROM pm_registrations RETURNING id`;
    console.log(`[11] PmRegistration: ${r.length}건 삭제`);
  } catch { console.log('[11] PmRegistration: skip'); }

  // 12. FmeaRegistration 삭제
  try {
    const r = await p.fmeaRegistration.deleteMany({});
    console.log(`[12] FmeaRegistration: ${r.count}건 삭제`);
  } catch(e) { console.log('[12] FmeaRegistration: skip -', e.message?.slice(0,80)); }

  // 13. FmeaProject 삭제 (hard delete)
  try {
    const r = await p.fmeaProject.deleteMany({});
    console.log(`[13] FmeaProject: ${r.count}건 삭제`);
  } catch(e) { console.log('[13] FmeaProject: skip -', e.message?.slice(0,80)); }

  // 14. Project Schemas 삭제 (DROP SCHEMA)
  try {
    const schemas = await p.$queryRaw`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name LIKE 'pfmea_%' OR schema_name LIKE 'dfmea_%'
      ORDER BY schema_name`;
    console.log(`\n[14] Project Schemas: ${schemas.length}건 삭제 시작`);
    for (const s of schemas) {
      try {
        await p.$queryRawUnsafe(`DROP SCHEMA "${s.schema_name}" CASCADE`);
        console.log(`  DROP: ${s.schema_name}`);
      } catch(e) { console.log(`  SKIP: ${s.schema_name} - ${e.message?.slice(0,60)}`); }
    }
  } catch { console.log('[14] Schema 조회 실패'); }

  // 15. 최종 확인
  console.log('\n========== PURGE 완료 - 최종 확인 ==========');
  const pCount = await p.fmeaProject.count();
  const rCount = await p.fmeaRegistration.count();
  const dCount = await p.pfmeaMasterDataset.count();
  console.log(`FmeaProject: ${pCount}건`);
  console.log(`FmeaRegistration: ${rCount}건`);
  console.log(`PfmeaMasterDataset: ${dCount}건`);

  try {
    const flatCount = await p.$queryRaw`SELECT COUNT(*) as cnt FROM pfmea_master_flat_items`;
    console.log(`PfmeaMasterFlatItem: ${flatCount[0].cnt}건`);
  } catch { console.log('PfmeaMasterFlatItem: 0건'); }

  try {
    const schemaCount = await p.$queryRaw`
      SELECT COUNT(*) as cnt FROM information_schema.schemata
      WHERE schema_name LIKE 'pfmea_%' OR schema_name LIKE 'dfmea_%'`;
    console.log(`Project Schemas: ${schemaCount[0].cnt}건`);
  } catch {}

  console.log('\n========== 완전 정리 완료 ==========');

  await p.$disconnect();
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
