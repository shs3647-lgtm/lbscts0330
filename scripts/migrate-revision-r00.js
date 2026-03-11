/**
 * @file migrate-revision-r00.js
 * @description 기존 데이터 마이그레이션: 개정이 있는 원본 FMEA에 -r00 접미사 부여
 *
 * 문제: pfm26-p004-l05-r01 (개정)은 있는데 pfm26-p004-l05-r00 (원본)은 없음
 * 해결: 접미사 없는 원본을 -r00으로 리네임
 *
 * 사용법:
 *   DATABASE_URL="postgresql://..." node scripts/migrate-revision-r00.js
 *   또는 .env에 DATABASE_URL 설정 후:
 *   node scripts/migrate-revision-r00.js
 *
 * --dry-run 옵션으로 실제 변경 없이 대상만 확인 가능:
 *   node scripts/migrate-revision-r00.js --dry-run
 *
 * @created 2026-02-20
 */

const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const isDryRun = process.argv.includes('--dry-run');

/** fmeaId를 참조하는 모든 테이블 (plain String, FK 없음) */
const FMEA_ID_TABLES = [
  'l1_structures', 'l2_structures', 'l3_structures',
  'l1_functions', 'l2_functions', 'l3_functions',
  'failure_effects', 'failure_modes', 'failure_causes',
  'failure_links', 'failure_analyses',
  'risk_analyses', 'optimizations',
  'fmea_legacy_data', 'fmea_confirmed_states',
  'fmea_revision_history', 'pfmea_master_datasets',
  'fmea_meeting_minutes', 'fmea_sod_history',
  'fmea_official_revisions', 'fmea_version_backups',
  'fmea_approvals', 'fmea_confirm_histories',
  'fmea_register_change_histories', 'shared_process_master',
  'pfmea_cp_mappings', 'pfmea_pfd_mappings',
  'dashboard_stats_cache', 'ep_devices',
  'lessons_learned', 'pfmea_state_history',
  'control_plans', 'cp_registrations', 'pfd_registrations',
];

/** FK 제약조건 테이블 */
const FK_TABLES = [
  { table: 'fmea_registrations', constraint: 'fmea_registrations_fmeaId_fkey' },
  { table: 'fmea_cft_members', constraint: 'fmea_cft_members_fmeaId_fkey' },
  { table: 'fmea_worksheet_data', constraint: 'fmea_worksheet_data_fmeaId_fkey' },
];

async function renameFmeaIdInTx(tx, oldId, newId) {
  let totalUpdated = 0;

  // FK 제약 제거
  for (const fk of FK_TABLES) {
    await tx.$executeRawUnsafe(`ALTER TABLE "${fk.table}" DROP CONSTRAINT IF EXISTS "${fk.constraint}"`);
  }

  // 메인 테이블
  totalUpdated += await tx.$executeRawUnsafe(
    `UPDATE fmea_projects SET "fmeaId" = $1 WHERE "fmeaId" = $2`, newId, oldId
  );

  // FK 자식 테이블
  for (const fk of FK_TABLES) {
    totalUpdated += await tx.$executeRawUnsafe(
      `UPDATE "${fk.table}" SET "fmeaId" = $1 WHERE "fmeaId" = $2`, newId, oldId
    );
  }

  // plain String 테이블
  for (const table of FMEA_ID_TABLES) {
    try {
      totalUpdated += await tx.$executeRawUnsafe(
        `UPDATE "${table}" SET "fmeaId" = $1 WHERE "fmeaId" = $2`, newId, oldId
      );
    } catch { /* 테이블 없으면 무시 */ }
  }

  // 교차 참조
  try { await tx.$executeRawUnsafe(`UPDATE fmea_projects SET "parentFmeaId" = $1 WHERE "parentFmeaId" = $2`, newId, oldId); } catch {}
  try { await tx.$executeRawUnsafe(`UPDATE project_linkages SET "pfmeaId" = $1 WHERE "pfmeaId" = $2`, newId, oldId); } catch {}
  for (const t of ['fmea_registrations', 'cp_registrations', 'pfd_registrations']) {
    try { await tx.$executeRawUnsafe(`UPDATE "${t}" SET "linkedPfmeaNo" = $1 WHERE "linkedPfmeaNo" = $2`, newId, oldId); } catch {}
  }

  // FK 재생성
  for (const fk of FK_TABLES) {
    await tx.$executeRawUnsafe(
      `ALTER TABLE "${fk.table}" ADD CONSTRAINT "${fk.constraint}" ` +
      `FOREIGN KEY ("fmeaId") REFERENCES fmea_projects("fmeaId") ` +
      `ON DELETE CASCADE ON UPDATE CASCADE`
    );
  }

  return totalUpdated;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('=== FMEA 개정번호 r00 마이그레이션 ===');
    console.log(isDryRun ? '[DRY RUN 모드 - 실제 변경 없음]\n' : '');

    // 1. 개정이 있는 프로젝트 찾기 (-rNN 패턴)
    const revisionProjects = await prisma.fmeaProject.findMany({
      where: {
        fmeaId: { contains: '-r' },
        deletedAt: null,
      },
      select: { fmeaId: true },
    });

    // 2. base ID 추출 (중복 제거)
    const baseIds = new Set();
    for (const p of revisionProjects) {
      const m = p.fmeaId.match(/^(.+)-r(\d+)$/);
      if (m) baseIds.add(m[1]);
    }

    if (baseIds.size === 0) {
      console.log('개정이 있는 프로젝트가 없습니다. 마이그레이션 대상 없음.');
      return;
    }

    console.log(`개정이 있는 base ID ${baseIds.size}개 발견:`);
    for (const baseId of baseIds) {
      console.log(`  - ${baseId}`);
    }

    // 3. 각 base ID에 대해 원본(접미사 없음) 확인
    const targets = [];
    for (const baseId of baseIds) {
      // 원본 (접미사 없음)이 존재하는지
      const original = await prisma.fmeaProject.findUnique({
        where: { fmeaId: baseId },
        select: { fmeaId: true, revisionNo: true },
      });

      // -r00이 이미 존재하는지
      const r00Exists = await prisma.fmeaProject.findUnique({
        where: { fmeaId: `${baseId}-r00` },
        select: { fmeaId: true },
      });

      if (original && !r00Exists) {
        targets.push({ oldId: baseId, newId: `${baseId}-r00`, revisionNo: original.revisionNo });
        console.log(`\n  ✓ ${baseId} → ${baseId}-r00 (대상) [${original.revisionNo}]`);
      } else if (r00Exists) {
        console.log(`\n  - ${baseId}-r00 이미 존재 (스킵)`);
      } else {
        console.log(`\n  - ${baseId} 원본 없음 (스킵)`);
      }
    }

    if (targets.length === 0) {
      console.log('\n마이그레이션 대상 없음.');
      return;
    }

    console.log(`\n총 ${targets.length}개 리네임 대상\n`);

    if (isDryRun) {
      console.log('[DRY RUN] 실제 변경 없이 종료합니다.');
      return;
    }

    // 4. 리네임 실행
    for (const target of targets) {
      console.log(`리네임 시작: ${target.oldId} → ${target.newId}`);
      try {
        const updated = await prisma.$transaction(async (tx) => {
          return await renameFmeaIdInTx(tx, target.oldId, target.newId);
        }, { timeout: 60000 });
        console.log(`  ✓ 완료: ${updated} rows 업데이트됨`);
      } catch (err) {
        console.error(`  ✗ 실패: ${err.message}`);
      }
    }

    console.log('\n=== 마이그레이션 완료 ===');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
