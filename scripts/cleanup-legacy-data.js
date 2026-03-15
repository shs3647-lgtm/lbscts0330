/**
 * cleanup-legacy-data.js
 *
 * 레거시/테스트 데이터 일괄 삭제 스크립트
 * FK 역순 삭제 + 트랜잭션 원자성 + 삭제 전후 COUNT 검증
 *
 * 보호 대상 (절대 삭제 금지):
 *   - pfm26-m015 (ACTIVE FMEA)
 *   - cp26-m015 (ACTIVE CP)
 *   - pfd26-m014 (ACTIVE PFD)
 *   - Qualcomm 고객 (QCOM-SD)
 *
 * Usage: node scripts/cleanup-legacy-data.js
 */

const { Client } = require('pg');

const DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public";

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('=== DB Connected ===\n');

  // ── 삭제 단계 정의 (FK 역순) ──
  const steps = [
    {
      name: '1. fmea_revision_history — test-pfmea-* 또는 nonexistent fmeaId',
      countBefore: `SELECT COUNT(*) FROM fmea_revision_history WHERE "fmeaId" LIKE 'test-pfmea-%' OR "fmeaId" NOT IN (SELECT "fmeaId" FROM fmea_projects)`,
      deleteSql: `DELETE FROM fmea_revision_history WHERE "fmeaId" LIKE 'test-pfmea-%' OR "fmeaId" NOT IN (SELECT "fmeaId" FROM fmea_projects)`,
      countAfter: `SELECT COUNT(*) FROM fmea_revision_history WHERE "fmeaId" LIKE 'test-pfmea-%' OR "fmeaId" NOT IN (SELECT "fmeaId" FROM fmea_projects)`,
    },
    {
      name: '2. fmea_version_backups — pfm26-m014 소속',
      countBefore: `SELECT COUNT(*) FROM fmea_version_backups WHERE "fmeaId" = 'pfm26-m014'`,
      deleteSql: `DELETE FROM fmea_version_backups WHERE "fmeaId" = 'pfm26-m014'`,
      countAfter: `SELECT COUNT(*) FROM fmea_version_backups WHERE "fmeaId" = 'pfm26-m014'`,
    },
    {
      name: '3. continuous_improvement_plan — pfm26-m014 소속',
      countBefore: `SELECT COUNT(*) FROM continuous_improvement_plan WHERE "fmeaId" = 'pfm26-m014'`,
      deleteSql: `DELETE FROM continuous_improvement_plan WHERE "fmeaId" = 'pfm26-m014'`,
      countAfter: `SELECT COUNT(*) FROM continuous_improvement_plan WHERE "fmeaId" = 'pfm26-m014'`,
    },
    {
      name: '4. fmea_cft_members — pfm26-m014 소속 (pfm26-m015 유지!)',
      countBefore: `SELECT COUNT(*) FROM fmea_cft_members WHERE "fmeaId" = 'pfm26-m014'`,
      deleteSql: `DELETE FROM fmea_cft_members WHERE "fmeaId" = 'pfm26-m014'`,
      countAfter: `SELECT COUNT(*) FROM fmea_cft_members WHERE "fmeaId" = 'pfm26-m014'`,
    },
    {
      name: '5. control_plan_items — fmeaId=default-fmea-id인 CP 소속',
      countBefore: `SELECT COUNT(*) FROM control_plan_items WHERE "cpId" IN (SELECT id FROM control_plans WHERE "fmeaId" = 'default-fmea-id')`,
      deleteSql: `DELETE FROM control_plan_items WHERE "cpId" IN (SELECT id FROM control_plans WHERE "fmeaId" = 'default-fmea-id')`,
      countAfter: `SELECT COUNT(*) FROM control_plan_items WHERE "cpId" IN (SELECT id FROM control_plans WHERE "fmeaId" = 'default-fmea-id')`,
    },
    {
      name: '6. control_plans — fmeaId=default-fmea-id 전체 삭제',
      countBefore: `SELECT COUNT(*) FROM control_plans WHERE "fmeaId" = 'default-fmea-id'`,
      deleteSql: `DELETE FROM control_plans WHERE "fmeaId" = 'default-fmea-id'`,
      countAfter: `SELECT COUNT(*) FROM control_plans WHERE "fmeaId" = 'default-fmea-id'`,
    },
    {
      name: '7. cp_master_flat_items — E2E 테스트 소속 (cpNo LIKE cp-e2e-test-%)',
      countBefore: `SELECT COUNT(*) FROM cp_master_flat_items WHERE "datasetId" IN (SELECT id FROM cp_master_datasets WHERE "cpNo" LIKE 'cp-e2e-test-%')`,
      deleteSql: `DELETE FROM cp_master_flat_items WHERE "datasetId" IN (SELECT id FROM cp_master_datasets WHERE "cpNo" LIKE 'cp-e2e-test-%')`,
      countAfter: `SELECT COUNT(*) FROM cp_master_flat_items WHERE "datasetId" IN (SELECT id FROM cp_master_datasets WHERE "cpNo" LIKE 'cp-e2e-test-%')`,
    },
    {
      name: '8. cp_master_datasets — E2E 테스트 소속 (cpNo LIKE cp-e2e-test-%)',
      countBefore: `SELECT COUNT(*) FROM cp_master_datasets WHERE "cpNo" LIKE 'cp-e2e-test-%'`,
      deleteSql: `DELETE FROM cp_master_datasets WHERE "cpNo" LIKE 'cp-e2e-test-%'`,
      countAfter: `SELECT COUNT(*) FROM cp_master_datasets WHERE "cpNo" LIKE 'cp-e2e-test-%'`,
    },
    {
      name: '9. cp_registrations — cpNo LIKE cp-e2e-test-% 삭제 (cp26-m015 유지!)',
      countBefore: `SELECT COUNT(*) FROM cp_registrations WHERE "cpNo" LIKE 'cp-e2e-test-%'`,
      deleteSql: `DELETE FROM cp_registrations WHERE "cpNo" LIKE 'cp-e2e-test-%'`,
      countAfter: `SELECT COUNT(*) FROM cp_registrations WHERE "cpNo" LIKE 'cp-e2e-test-%'`,
    },
    {
      name: '10. document_links — test-pfmea-* 또는 cp-e2e-test-* 참조',
      countBefore: `SELECT COUNT(*) FROM document_links WHERE "sourceId" LIKE 'test-pfmea-%' OR "sourceId" LIKE 'cp-e2e-test-%' OR "targetId" LIKE 'test-pfmea-%' OR "targetId" LIKE 'cp-e2e-test-%'`,
      deleteSql: `DELETE FROM document_links WHERE "sourceId" LIKE 'test-pfmea-%' OR "sourceId" LIKE 'cp-e2e-test-%' OR "targetId" LIKE 'test-pfmea-%' OR "targetId" LIKE 'cp-e2e-test-%'`,
      countAfter: `SELECT COUNT(*) FROM document_links WHERE "sourceId" LIKE 'test-pfmea-%' OR "sourceId" LIKE 'cp-e2e-test-%' OR "targetId" LIKE 'test-pfmea-%' OR "targetId" LIKE 'cp-e2e-test-%'`,
    },
    {
      name: '11. sync_logs — 전체 삭제 (오래된 로그)',
      countBefore: `SELECT COUNT(*) FROM sync_logs`,
      deleteSql: `DELETE FROM sync_logs`,
      countAfter: `SELECT COUNT(*) FROM sync_logs`,
    },
    {
      name: '12. access_logs — 전체 삭제 (오래된 로그)',
      countBefore: `SELECT COUNT(*) FROM access_logs`,
      deleteSql: `DELETE FROM access_logs`,
      countAfter: `SELECT COUNT(*) FROM access_logs`,
    },
    {
      name: '13. project_linkages — test-pfmea-* / cp-e2e-test-* / pfm26-m014 (pfm26-m015 유지!)',
      countBefore: `SELECT COUNT(*) FROM project_linkages WHERE "pfmeaId" LIKE 'test-pfmea-%' OR "cpNo" LIKE 'cp-e2e-test-%' OR "pfmeaId" = 'pfm26-m014'`,
      deleteSql: `DELETE FROM project_linkages WHERE "pfmeaId" LIKE 'test-pfmea-%' OR "cpNo" LIKE 'cp-e2e-test-%' OR "pfmeaId" = 'pfm26-m014'`,
      countAfter: `SELECT COUNT(*) FROM project_linkages WHERE "pfmeaId" LIKE 'test-pfmea-%' OR "cpNo" LIKE 'cp-e2e-test-%' OR "pfmeaId" = 'pfm26-m014'`,
    },
    {
      name: '14. triplet_groups — id != tg26-m015 삭제 (자기참조 parentTripletId 먼저 null)',
      countBefore: `SELECT COUNT(*) FROM triplet_groups WHERE id != 'tg26-m015'`,
      deleteSql: [
        `UPDATE triplet_groups SET "parentTripletId" = NULL WHERE id != 'tg26-m015' AND "parentTripletId" IS NOT NULL`,
        `DELETE FROM triplet_groups WHERE id != 'tg26-m015'`,
      ],
      countAfter: `SELECT COUNT(*) FROM triplet_groups WHERE id != 'tg26-m015'`,
    },
    {
      name: '15. unified_process_items — 전체 삭제 (테스트 데이터)',
      countBefore: `SELECT COUNT(*) FROM unified_process_items`,
      deleteSql: `DELETE FROM unified_process_items`,
      countAfter: `SELECT COUNT(*) FROM unified_process_items`,
    },
    {
      name: '16a. pfmea_master_flat_items — pfm26-p001 / pfm-chain-test-01 소속',
      countBefore: `SELECT COUNT(*) FROM pfmea_master_flat_items WHERE "datasetId" IN (SELECT id FROM pfmea_master_datasets WHERE "fmeaId" IN ('pfm26-p001', 'pfm-chain-test-01'))`,
      deleteSql: `DELETE FROM pfmea_master_flat_items WHERE "datasetId" IN (SELECT id FROM pfmea_master_datasets WHERE "fmeaId" IN ('pfm26-p001', 'pfm-chain-test-01'))`,
      countAfter: `SELECT COUNT(*) FROM pfmea_master_flat_items WHERE "datasetId" IN (SELECT id FROM pfmea_master_datasets WHERE "fmeaId" IN ('pfm26-p001', 'pfm-chain-test-01'))`,
    },
    {
      name: '16b. pfmea_master_datasets — pfm26-p001 / pfm-chain-test-01 소속',
      countBefore: `SELECT COUNT(*) FROM pfmea_master_datasets WHERE "fmeaId" IN ('pfm26-p001', 'pfm-chain-test-01')`,
      deleteSql: `DELETE FROM pfmea_master_datasets WHERE "fmeaId" IN ('pfm26-p001', 'pfm-chain-test-01')`,
      countAfter: `SELECT COUNT(*) FROM pfmea_master_datasets WHERE "fmeaId" IN ('pfm26-p001', 'pfm-chain-test-01')`,
    },
    {
      name: '17. fmea_legacy_data — pfm-chain-test-01 삭제 (pfm26-m015, pfm26-m014 유지)',
      countBefore: `SELECT COUNT(*) FROM fmea_legacy_data WHERE "fmeaId" = 'pfm-chain-test-01'`,
      deleteSql: `DELETE FROM fmea_legacy_data WHERE "fmeaId" = 'pfm-chain-test-01'`,
      countAfter: `SELECT COUNT(*) FROM fmea_legacy_data WHERE "fmeaId" = 'pfm-chain-test-01'`,
    },
    {
      name: '18. pfd_registrations — status=DELETED 삭제 (pfd26-m014 ACTIVE 유지!)',
      countBefore: `SELECT COUNT(*) FROM pfd_registrations WHERE status = 'DELETED'`,
      deleteSql: `DELETE FROM pfd_registrations WHERE status = 'DELETED'`,
      countAfter: `SELECT COUNT(*) FROM pfd_registrations WHERE status = 'DELETED'`,
    },
    {
      name: '19a. fmea_registrations — test-pfmea-* 또는 pfm26-m014',
      countBefore: `SELECT COUNT(*) FROM fmea_registrations WHERE "fmeaId" LIKE 'test-pfmea-%' OR "fmeaId" = 'pfm26-m014'`,
      deleteSql: `DELETE FROM fmea_registrations WHERE "fmeaId" LIKE 'test-pfmea-%' OR "fmeaId" = 'pfm26-m014'`,
      countAfter: `SELECT COUNT(*) FROM fmea_registrations WHERE "fmeaId" LIKE 'test-pfmea-%' OR "fmeaId" = 'pfm26-m014'`,
    },
    {
      name: '19b. fmea_projects — test-pfmea-* 또는 pfm26-m014',
      countBefore: `SELECT COUNT(*) FROM fmea_projects WHERE "fmeaId" LIKE 'test-pfmea-%' OR "fmeaId" = 'pfm26-m014'`,
      deleteSql: `DELETE FROM fmea_projects WHERE "fmeaId" LIKE 'test-pfmea-%' OR "fmeaId" = 'pfm26-m014'`,
      countAfter: `SELECT COUNT(*) FROM fmea_projects WHERE "fmeaId" LIKE 'test-pfmea-%' OR "fmeaId" = 'pfm26-m014'`,
    },
    {
      name: '20. customers — 자동차 고객 삭제 (Qualcomm QCOM-SD 유지!)',
      countBefore: `SELECT COUNT(*) FROM customers WHERE code IN ('HMC-US','HMC-AS','HMC-JJ','KIA-GW','KIA-GJ','KIA-HW','BMW-MU','VW-WB','FORD-DB','STLA-AM','GMK-BP')`,
      deleteSql: `DELETE FROM customers WHERE code IN ('HMC-US','HMC-AS','HMC-JJ','KIA-GW','KIA-GJ','KIA-HW','BMW-MU','VW-WB','FORD-DB','STLA-AM','GMK-BP')`,
      countAfter: `SELECT COUNT(*) FROM customers WHERE code IN ('HMC-US','HMC-AS','HMC-JJ','KIA-GW','KIA-GJ','KIA-HW','BMW-MU','VW-WB','FORD-DB','STLA-AM','GMK-BP')`,
    },
  ];

  // ── Phase 1: 삭제 전 수량 확인 ──
  console.log('============================================================');
  console.log('  Phase 1: 삭제 전 대상 수량 확인');
  console.log('============================================================\n');

  let totalTarget = 0;
  const beforeCounts = [];

  for (const step of steps) {
    try {
      const res = await client.query(step.countBefore);
      const cnt = parseInt(res.rows[0].count, 10);
      beforeCounts.push(cnt);
      totalTarget += cnt;
      console.log(`  ${step.name}`);
      console.log(`    -> ${cnt}건\n`);
    } catch (err) {
      console.error(`  [ERROR] ${step.name}: ${err.message}`);
      beforeCounts.push(-1);
    }
  }

  console.log(`\n  >> 삭제 대상 총계: ${totalTarget}건\n`);

  // ── 안전 검증: 보호 대상 존재 확인 ──
  console.log('============================================================');
  console.log('  Safety Check: 보호 대상 존재 확인');
  console.log('============================================================\n');

  const safetyChecks = [
    { label: 'pfm26-m015 (ACTIVE FMEA)', sql: `SELECT COUNT(*) FROM fmea_projects WHERE "fmeaId" = 'pfm26-m015'` },
    { label: 'cp26-m015 (ACTIVE CP)', sql: `SELECT COUNT(*) FROM cp_registrations WHERE "cpNo" = 'cp26-m015'` },
    { label: 'pfd26-m014 (ACTIVE PFD)', sql: `SELECT COUNT(*) FROM pfd_registrations WHERE "pfdNo" = 'pfd26-m014'` },
    { label: 'tg26-m015 (ACTIVE TripletGroup)', sql: `SELECT COUNT(*) FROM triplet_groups WHERE id = 'tg26-m015'` },
    { label: 'Qualcomm (QCOM-SD)', sql: `SELECT COUNT(*) FROM customers WHERE code = 'QCOM-SD'` },
  ];

  for (const check of safetyChecks) {
    try {
      const res = await client.query(check.sql);
      const cnt = parseInt(res.rows[0].count, 10);
      const status = cnt > 0 ? '[OK]  ' : '[WARN]';
      console.log(`  ${status} ${check.label} (${cnt}건)`);
    } catch (err) {
      console.log(`  [SKIP] ${check.label}: ${err.message}`);
    }
  }

  // ── Phase 2: 트랜잭션 내 삭제 실행 ──
  console.log('\n============================================================');
  console.log('  Phase 2: 트랜잭션 삭제 실행');
  console.log('============================================================\n');

  let totalDeleted = 0;

  try {
    await client.query('BEGIN');

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (beforeCounts[i] === 0) {
        console.log(`  [SKIP] ${step.name} -- 0건`);
        continue;
      }
      if (beforeCounts[i] === -1) {
        console.log(`  [SKIP] ${step.name} -- count 실패`);
        continue;
      }
      try {
        // deleteSql can be string or array of strings
        const sqls = Array.isArray(step.deleteSql) ? step.deleteSql : [step.deleteSql];
        let deleted = 0;
        for (const sql of sqls) {
          const delRes = await client.query(sql);
          deleted += (delRes.rowCount || 0);
        }
        totalDeleted += deleted;
        console.log(`  [DEL]  ${step.name} -- ${deleted}건 삭제`);

        // 삭제 후 검증
        const afterRes = await client.query(step.countAfter);
        const remaining = parseInt(afterRes.rows[0].count, 10);
        if (remaining > 0) {
          console.log(`    !! 경고: 아직 ${remaining}건 남아있음`);
        }
      } catch (err) {
        console.error(`  [ERROR] ${step.name}: ${err.message}`);
        throw err; // 트랜잭션 롤백
      }
    }

    await client.query('COMMIT');
    console.log(`\n  >> 트랜잭션 COMMIT 완료 -- 총 ${totalDeleted}건 삭제\n`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`\n  [ROLLBACK] 트랜잭션 롤백 -- ${err.message}\n`);
    await client.end();
    process.exit(1);
  }

  // ── Phase 3: 삭제 후 보호 대상 재확인 ──
  console.log('============================================================');
  console.log('  Phase 3: 삭제 후 보호 대상 재확인');
  console.log('============================================================\n');

  for (const check of safetyChecks) {
    try {
      const res = await client.query(check.sql);
      const cnt = parseInt(res.rows[0].count, 10);
      const status = cnt > 0 ? '[SAFE]   ' : '[DANGER!]';
      console.log(`  ${status} ${check.label} (${cnt}건)`);
      if (cnt === 0) {
        console.error(`  *** 경고: 보호 대상이 삭제되었습니다! ***`);
      }
    } catch (err) {
      console.log(`  [SKIP] ${check.label}: ${err.message}`);
    }
  }

  // ── Phase 4: 주요 테이블 남은 레코드 수 ──
  console.log('\n============================================================');
  console.log('  Phase 4: 주요 테이블 남은 레코드 수');
  console.log('============================================================\n');

  const tablesToCheck = [
    'fmea_projects', 'fmea_registrations', 'fmea_revision_history',
    'fmea_version_backups', 'fmea_cft_members', 'fmea_legacy_data',
    'continuous_improvement_plan', 'control_plans', 'control_plan_items',
    'cp_registrations', 'cp_master_datasets', 'cp_master_flat_items',
    'pfd_registrations', 'project_linkages', 'triplet_groups',
    'unified_process_items', 'pfmea_master_datasets', 'pfmea_master_flat_items',
    'document_links', 'sync_logs', 'access_logs', 'customers',
  ];

  for (const table of tablesToCheck) {
    try {
      const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`  ${table}: ${res.rows[0].count}건`);
    } catch (err) {
      console.log(`  ${table}: [테이블 없음]`);
    }
  }

  console.log('\n=== 정리 완료 ===');
  await client.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
