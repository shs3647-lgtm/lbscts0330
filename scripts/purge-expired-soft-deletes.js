/**
 * 소프트 삭제 데이터 정기 정리 스크립트
 *
 * - deletedAt이 30일 이상 경과한 레코드를 hard delete
 * - 연관 데이터(Registration, BD, Linkage, CFT, Worksheet, Schema 등) 연쇄 삭제
 * - 실행: node scripts/purge-expired-soft-deletes.js
 * - 권장 주기: 월 1회 (Windows Task Scheduler 또는 cron)
 *
 * 환경변수:
 *   DATABASE_URL (필수)
 *   PURGE_DAYS   (선택, 기본 30일)
 *   DRY_RUN      (선택, "true"면 삭제 없이 대상만 출력)
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1); }

const PURGE_DAYS = parseInt(process.env.PURGE_DAYS || '30', 10);
const DRY_RUN = process.env.DRY_RUN === 'true';

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function main() {
  const cutoff = daysAgo(PURGE_DAYS);
  const mode = DRY_RUN ? '[DRY-RUN]' : '[PURGE]';

  console.log(`========== ${mode} 소프트 삭제 정리 ==========`);
  console.log(`기준: deletedAt < ${cutoff.toISOString()} (${PURGE_DAYS}일 경과)`);
  console.log(`모드: ${DRY_RUN ? '미리보기 (삭제 안 함)' : '실제 삭제'}\n`);

  // 1. 삭제 대상 FmeaProject 조회
  const expiredProjects = await p.fmeaProject.findMany({
    where: { deletedAt: { not: null, lt: cutoff } },
    select: { id: true, fmeaId: true, fmeaType: true, deletedAt: true },
  });

  console.log(`[대상] FmeaProject: ${expiredProjects.length}건`);
  expiredProjects.forEach(x =>
    console.log(`  ${x.fmeaId} | type=${x.fmeaType} | deletedAt=${x.deletedAt.toISOString().slice(0, 10)}`)
  );

  if (expiredProjects.length === 0) {
    console.log('\n정리 대상 없음. 종료.');
    await cleanup();
    return;
  }

  if (DRY_RUN) {
    console.log('\n[DRY-RUN] 위 대상이 삭제됩니다. DRY_RUN=false로 실행하면 실제 삭제됩니다.');
    await cleanup();
    return;
  }

  const fmeaIds = expiredProjects.map(x => x.fmeaId);
  let totalDeleted = 0;

  // 2. WorksheetData 삭제
  try {
    const r = await p.$queryRaw`DELETE FROM fmea_worksheet_data WHERE "fmeaId" = ANY(${fmeaIds}::text[]) RETURNING id`;
    if (r.length > 0) console.log(`  [삭제] FmeaWorksheetData: ${r.length}건`);
    totalDeleted += r.length;
  } catch {}

  // 3. LegacyData 삭제
  try {
    const r = await p.$queryRaw`DELETE FROM fmea_legacy_data WHERE "fmeaId" = ANY(${fmeaIds}::text[]) RETURNING id`;
    if (r.length > 0) console.log(`  [삭제] FmeaLegacyData: ${r.length}건`);
    totalDeleted += r.length;
  } catch {}

  // 4. CftMember 삭제 (projectId 기반)
  try {
    const projectIds = expiredProjects.map(x => x.id);
    const r = await p.$queryRaw`DELETE FROM fmea_cft_members WHERE "projectId" = ANY(${projectIds}::text[]) RETURNING id`;
    if (r.length > 0) console.log(`  [삭제] FmeaCftMember: ${r.length}건`);
    totalDeleted += r.length;
  } catch {}

  // 5. ProjectLinkage 삭제
  try {
    const r = await p.$queryRaw`DELETE FROM project_linkages WHERE "pfmeaId" = ANY(${fmeaIds}::text[]) OR "dfmeaId" = ANY(${fmeaIds}::text[]) RETURNING id`;
    if (r.length > 0) console.log(`  [삭제] ProjectLinkage: ${r.length}건`);
    totalDeleted += r.length;
  } catch {}

  // 6. PfmeaMasterFlatItem → PfmeaMasterDataset 삭제
  try {
    const datasets = await p.pfmeaMasterDataset.findMany({ where: { fmeaId: { in: fmeaIds } }, select: { id: true } });
    if (datasets.length > 0) {
      const dsIds = datasets.map(d => d.id);
      const flatR = await p.$queryRaw`DELETE FROM pfmea_master_flat_items WHERE "datasetId" = ANY(${dsIds}::text[]) RETURNING id`;
      if (flatR.length > 0) console.log(`  [삭제] PfmeaMasterFlatItem: ${flatR.length}건`);
      totalDeleted += flatR.length;
      const dsR = await p.pfmeaMasterDataset.deleteMany({ where: { fmeaId: { in: fmeaIds } } });
      if (dsR.count > 0) console.log(`  [삭제] PfmeaMasterDataset: ${dsR.count}건`);
      totalDeleted += dsR.count;
    }
  } catch {}

  // 7. DfmeaMasterDataset 삭제
  try {
    const r = await p.dfmeaMasterDataset.deleteMany({ where: { fmeaId: { in: fmeaIds } } });
    if (r.count > 0) console.log(`  [삭제] DfmeaMasterDataset: ${r.count}건`);
    totalDeleted += r.count;
  } catch {}

  // 8. CP/PFD/WS/PM Registration 삭제 (soft-deleted된 것)
  for (const tbl of ['cp_registrations', 'pfd_registrations', 'ws_registrations', 'pm_registrations']) {
    try {
      const r = await p.$queryRaw`DELETE FROM ${p.$queryRawUnsafe(`"${tbl}"`)} WHERE "deletedAt" IS NOT NULL AND "deletedAt" < ${cutoff} RETURNING id`;
      if (r.length > 0) console.log(`  [삭제] ${tbl}: ${r.length}건`);
      totalDeleted += r.length;
    } catch {
      // raw로 재시도
      try {
        const r = await p.$queryRawUnsafe(`DELETE FROM "${tbl}" WHERE "deletedAt" IS NOT NULL AND "deletedAt" < $1 RETURNING id`, cutoff);
        if (r.length > 0) console.log(`  [삭제] ${tbl}: ${r.length}건`);
        totalDeleted += r.length;
      } catch {}
    }
  }

  // 9. FmeaRegistration 삭제 (project FK)
  try {
    const projectIds = expiredProjects.map(x => x.id);
    const r = await p.fmeaRegistration.deleteMany({ where: { projectId: { in: projectIds } } });
    if (r.count > 0) console.log(`  [삭제] FmeaRegistration: ${r.count}건`);
    totalDeleted += r.count;
  } catch {}

  // 10. FmeaProject hard delete
  try {
    const r = await p.fmeaProject.deleteMany({ where: { id: { in: expiredProjects.map(x => x.id) } } });
    console.log(`  [삭제] FmeaProject: ${r.count}건`);
    totalDeleted += r.count;
  } catch (e) { console.log(`  [실패] FmeaProject: ${e.message?.slice(0, 80)}`); }

  // 11. 고아 Project Schemas 삭제
  try {
    const schemas = await p.$queryRaw`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name LIKE 'pfmea_%' OR schema_name LIKE 'dfmea_%'
      ORDER BY schema_name`;

    // 현재 활성 프로젝트의 스키마만 유지
    const activeProjects = await p.fmeaProject.findMany({
      where: { deletedAt: null },
      select: { fmeaId: true },
    });
    const activeSchemaNames = new Set(
      activeProjects.map(ap => 'pfmea_' + ap.fmeaId.replace(/-/g, '_'))
    );

    let droppedCount = 0;
    for (const s of schemas) {
      if (!activeSchemaNames.has(s.schema_name)) {
        try {
          await p.$queryRawUnsafe(`DROP SCHEMA "${s.schema_name}" CASCADE`);
          droppedCount++;
        } catch {}
      }
    }
    if (droppedCount > 0) console.log(`  [삭제] 고아 Schemas: ${droppedCount}건`);
    totalDeleted += droppedCount;
  } catch {}

  console.log(`\n========== 정리 완료: 총 ${totalDeleted}건 삭제 ==========`);
  await cleanup();
}

async function cleanup() {
  await p.$disconnect();
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
