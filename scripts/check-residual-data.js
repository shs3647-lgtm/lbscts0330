const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1); }

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });

async function main() {
  console.log('========== 잔존 데이터 점검 ==========\n');

  // 1. FmeaProject (soft-delete 포함)
  const projects = await p.fmeaProject.findMany({
    select: { id: true, fmeaId: true, fmeaType: true, status: true, deletedAt: true }
  });
  console.log(`[FmeaProject] ${projects.length}건`);
  projects.forEach(x => console.log(`  ${x.fmeaId} | type=${x.fmeaType} | status=${x.status} | deleted=${x.deletedAt ? 'YES' : 'no'}`));

  // 2. FmeaRegistration
  const regs = await p.fmeaRegistration.findMany({
    select: { id: true, subject: true, partName: true, partNo: true, project: { select: { fmeaId: true, fmeaType: true } } }
  });
  console.log(`\n[FmeaRegistration] ${regs.length}건`);
  regs.forEach(r => console.log(`  ${r.project?.fmeaId || '?'} | type=${r.project?.fmeaType || '?'} | subject=${r.subject} | part=${r.partName}`));

  // 3. PfmeaMasterDataset
  const datasets = await p.pfmeaMasterDataset.findMany({
    select: { id: true, fmeaId: true, fmeaType: true, version: true }
  });
  console.log(`\n[PfmeaMasterDataset] ${datasets.length}건`);
  datasets.forEach(d => console.log(`  ${d.fmeaId} | type=${d.fmeaType} | ver=${d.version}`));

  // 4. FlatItems count
  try {
    const flatCount = await p.$queryRaw`SELECT COUNT(*) as cnt FROM pfmea_master_flat_items`;
    console.log(`\n[PfmeaMasterFlatItem] ${flatCount[0].cnt}건`);
  } catch { console.log('\n[PfmeaMasterFlatItem] 테이블 없음'); }

  // 5. ProjectLinkage
  try {
    const linkages = await p.$queryRaw`SELECT id, "pfmeaId", "dfmeaId", "cpNo", "pfdNo", status FROM project_linkages`;
    console.log(`\n[ProjectLinkage] ${linkages.length}건`);
    linkages.forEach(l => console.log(`  pfmea=${l.pfmeaId} | dfmea=${l.dfmeaId} | cp=${l.cpNo} | pfd=${l.pfdNo} | status=${l.status}`));
  } catch { console.log('\n[ProjectLinkage] 조회 실패'); }

  // 6. FmeaCftMember
  try {
    const cft = await p.$queryRaw`SELECT COUNT(*) as cnt FROM fmea_cft_members`;
    console.log(`\n[FmeaCftMember] ${cft[0].cnt}건`);
  } catch { console.log('\n[FmeaCftMember] 조회 실패'); }

  // 7. FmeaWorksheetData
  try {
    const ws = await p.$queryRaw`SELECT COUNT(*) as cnt FROM fmea_worksheet_data`;
    console.log(`\n[FmeaWorksheetData] ${ws[0].cnt}건`);
  } catch { console.log('\n[FmeaWorksheetData] 조회 실패'); }

  // 8. FmeaLegacyData
  try {
    const legacy = await p.$queryRaw`SELECT "fmeaId", "version" FROM fmea_legacy_data`;
    console.log(`\n[FmeaLegacyData] ${legacy.length}건`);
    legacy.forEach(l => console.log(`  ${l.fmeaId} | ver=${l.version}`));
  } catch { console.log('\n[FmeaLegacyData] 조회 실패 또는 없음'); }

  // 9. CP/PFD Registration
  try {
    const cp = await p.$queryRaw`SELECT "cpNo", "deletedAt" FROM cp_registrations`;
    console.log(`\n[CpRegistration] ${cp.length}건`);
    cp.forEach(c => console.log(`  ${c.cpNo} | deleted=${c.deletedAt ? 'YES' : 'no'}`));
  } catch { console.log('\n[CpRegistration] 없음'); }

  try {
    const pfd = await p.$queryRaw`SELECT "pfdNo", "deletedAt" FROM pfd_registrations`;
    console.log(`\n[PfdRegistration] ${pfd.length}건`);
    pfd.forEach(f => console.log(`  ${f.pfdNo} | deleted=${f.deletedAt ? 'YES' : 'no'}`));
  } catch { console.log('\n[PfdRegistration] 없음'); }

  // 10. DFMEA datasets
  try {
    const dfDs = await p.dfmeaMasterDataset.findMany({
      select: { id: true, fmeaId: true, fmeaType: true }
    });
    console.log(`\n[DfmeaMasterDataset] ${dfDs.length}건`);
    dfDs.forEach(d => console.log(`  ${d.fmeaId} | type=${d.fmeaType}`));
  } catch { console.log('\n[DfmeaMasterDataset] 없음'); }

  // 11. project schemas 확인
  try {
    const schemas = await p.$queryRaw`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name LIKE 'pfmea_%' OR schema_name LIKE 'dfmea_%'
      ORDER BY schema_name`;
    console.log(`\n[Project Schemas] ${schemas.length}건`);
    schemas.forEach(s => console.log(`  ${s.schema_name}`));
  } catch { console.log('\n[Project Schemas] 조회 실패'); }

  console.log('\n========== 점검 완료 ==========');

  await p.$disconnect();
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
