/**
 * @file renameFmeaId.ts
 * @description FMEA ID 리네임 유틸리티 — 모든 관련 테이블의 fmeaId를 원자적으로 업데이트
 *
 * 사용처: revision-clone에서 첫 개정 생성 시 원본 ID에 -r00 접미사 부여
 *
 * 처리 순서:
 * 1. FK 제약조건 임시 제거 (3개 테이블)
 * 2. fmea_projects.fmeaId 업데이트 (메인)
 * 3. FK 자식 테이블 업데이트 (3개)
 * 4. plain String fmeaId 테이블 업데이트 (30+개)
 * 5. 교차 참조 필드 업데이트 (parentFmeaId, pfmeaId, linkedPfmeaNo)
 * 6. FK 제약조건 재생성 (ON UPDATE CASCADE 추가)
 *
 * @created 2026-02-20
 */

/**
 * fmeaId를 참조하는 모든 테이블 목록
 * (FK 제약 없는 plain String 필드)
 */
const FMEA_ID_TABLES = [
  'l1_structures',
  'l2_structures',
  'l3_structures',
  'l1_functions',
  'l2_functions',
  'l3_functions',
  'failure_effects',
  'failure_modes',
  'failure_causes',
  'failure_links',
  'failure_analyses',
  'risk_analyses',
  'optimizations',
  'fmea_legacy_data',
  'fmea_confirmed_states',
  'fmea_revision_history',
  'pfmea_master_datasets',
  'fmea_meeting_minutes',
  'fmea_sod_history',
  'fmea_official_revisions',
  'fmea_version_backups',
  'fmea_approvals',
  'fmea_confirm_histories',
  'fmea_register_change_histories',
  'shared_process_master',
  'pfmea_cp_mappings',
  'pfmea_pfd_mappings',
  'dashboard_stats_cache',
  'ep_devices',
  'lessons_learned',
  'pfmea_state_history',
  'control_plans',
  'cp_registrations',
  'pfd_registrations',
] as const;

/**
 * FK 제약조건이 있는 테이블 (fmea_projects.fmeaId 참조)
 */
const FK_TABLES = [
  { table: 'fmea_registrations', constraint: 'fmea_registrations_fmeaId_fkey' },
  { table: 'fmea_cft_members', constraint: 'fmea_cft_members_fmeaId_fkey' },
  { table: 'fmea_worksheet_data', constraint: 'fmea_worksheet_data_fmeaId_fkey' },
] as const;

/**
 * FMEA ID를 모든 관련 테이블에서 원자적으로 리네임
 *
 * @param tx - Prisma 트랜잭션 클라이언트 ($transaction 내부에서 호출)
 * @param oldId - 기존 fmeaId (예: pfm26-p004-l05)
 * @param newId - 새 fmeaId (예: pfm26-p004-l05-r00)
 * @returns 업데이트된 테이블 수
 */
export async function renameFmeaId(
  tx: { $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<number> },
  oldId: string,
  newId: string
): Promise<number> {
  if (!oldId || !newId || oldId === newId) {
    throw new Error(`renameFmeaId: invalid params (old=${oldId}, new=${newId})`);
  }

  let totalUpdated = 0;

  // ── Step 1: FK 제약조건 임시 제거 ──
  for (const fk of FK_TABLES) {
    await tx.$executeRawUnsafe(
      `ALTER TABLE "${fk.table}" DROP CONSTRAINT IF EXISTS "${fk.constraint}"`
    );
  }

  // ── Step 2: fmea_projects.fmeaId 업데이트 (메인 테이블) ──
  const mainCount = await tx.$executeRawUnsafe(
    `UPDATE fmea_projects SET "fmeaId" = $1 WHERE "fmeaId" = $2`,
    newId, oldId
  );
  totalUpdated += mainCount;

  // ── Step 3: FK 자식 테이블 업데이트 ──
  for (const fk of FK_TABLES) {
    const count = await tx.$executeRawUnsafe(
      `UPDATE "${fk.table}" SET "fmeaId" = $1 WHERE "fmeaId" = $2`,
      newId, oldId
    );
    totalUpdated += count;
  }

  // ── Step 4: plain String fmeaId 테이블 업데이트 ──
  for (const table of FMEA_ID_TABLES) {
    try {
      const count = await tx.$executeRawUnsafe(
        `UPDATE "${table}" SET "fmeaId" = $1 WHERE "fmeaId" = $2`,
        newId, oldId
      );
      totalUpdated += count;
    } catch {
      // 테이블이 아직 없거나 fmeaId 컬럼이 없는 경우 무시
    }
  }

  // ── Step 5: 교차 참조 필드 업데이트 ──
  // parentFmeaId (개정본이 원본을 참조)
  try {
    await tx.$executeRawUnsafe(
      `UPDATE fmea_projects SET "parentFmeaId" = $1 WHERE "parentFmeaId" = $2`,
      newId, oldId
    );
  } catch { /* ignore */ }

  // ProjectLinkage.pfmeaId
  try {
    await tx.$executeRawUnsafe(
      `UPDATE project_linkages SET "pfmeaId" = $1 WHERE "pfmeaId" = $2`,
      newId, oldId
    );
  } catch { /* ignore */ }

  // linkedPfmeaNo 필드들
  const linkedTables = ['fmea_registrations', 'cp_registrations', 'pfd_registrations'];
  for (const table of linkedTables) {
    try {
      await tx.$executeRawUnsafe(
        `UPDATE "${table}" SET "linkedPfmeaNo" = $1 WHERE "linkedPfmeaNo" = $2`,
        newId, oldId
      );
    } catch { /* ignore */ }
  }

  // ── Step 6: FK 제약조건 재생성 (ON UPDATE CASCADE 추가) ──
  for (const fk of FK_TABLES) {
    await tx.$executeRawUnsafe(
      `ALTER TABLE "${fk.table}" ADD CONSTRAINT "${fk.constraint}" ` +
      `FOREIGN KEY ("fmeaId") REFERENCES fmea_projects("fmeaId") ` +
      `ON DELETE CASCADE ON UPDATE CASCADE`
    );
  }

  return totalUpdated;
}
