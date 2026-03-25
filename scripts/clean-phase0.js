const { Client } = require('pg');

async function cleanAll() {
  const c = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea'
  });
  await c.connect();

  console.log('=== Phase 0: DB 정리 (사용자 28명 보존) ===\n');

  // 1. Drop all pfmea_* schemas
  console.log('--- 1. pfmea_* 스키마 삭제 ---');
  const schemas = await c.query(
    "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'pfmea_%'"
  );
  for (const r of schemas.rows) {
    console.log('  DROP SCHEMA', r.schema_name);
    await c.query('DROP SCHEMA IF EXISTS "' + r.schema_name + '" CASCADE');
  }
  console.log('  삭제 완료:', schemas.rows.length, '개 스키마\n');

  // 2. Delete project data from public tables (order matters for FK)
  console.log('--- 2. Public 프로젝트 데이터 삭제 ---');
  const deleteOrder = [
    // Master FMEA 계층
    'master_fmea_revisions',
    'master_fmea_controls',
    'master_fmea_failure_modes',
    'master_fmea_structures',
    'master_fmea_processes',
    'part_fmea_revisions',
    'part_control_plans',
    'part_pfds',
    'part_fmeas',
    'family_masters',
    'master_fmeas',
    'fmea_notifications',
    // Import/Worksheet 관련
    'pfmea_master_flat_items',
    'pfmea_master_datasets',
    'pfmea_state_histories',
    // 고장분석 (public에 잔존 가능)
    'optimizations',
    'risk_analyses',
    'failure_analyses',
    'failure_links',
    'failure_causes',
    'failure_modes',
    'failure_effects',
    // 구조
    'l3_special_chars',
    'l3_work_elements',
    'l3_four_ms',
    'l3_process_nos',
    'l3_process_chars',
    'l3_functions',
    'l3_structures',
    'l2_special_chars',
    'l2_process_names',
    'l2_process_nos',
    'l2_functions',
    'process_product_chars',
    'l2_structures',
    'l1_requirements',
    'l1_scopes',
    'l1_functions',
    'l1_structures',
    // Import 추적
    'import_validations',
    'import_mappings',
    'import_jobs',
    // 확정 상태
    'fmea_confirmed_states',
    'unified_process_items',
    // Legacy
    'fmea_legacy_data',
    // CP/PFD
    'cp_master_flat_items',
    'cp_master_datasets',
    'cp_master_reaction_plans',
    'cp_master_control_methods',
    'cp_master_control_items',
    'cp_master_detectors',
    'cp_master_processes',
    'cp_confirmed_states',
    'cp_atomic_reaction_plans',
    'cp_atomic_control_methods',
    'cp_atomic_control_items',
    'cp_atomic_detectors',
    'cp_atomic_processes',
    'cp_reaction_plans',
    'cp_control_methods',
    'cp_control_items',
    'cp_detectors',
    'cp_processes',
    'cp_revisions',
    'cp_cft_members',
    'cp_registrations',
    'control_plan_items',
    'control_plans',
    'pfd_master_flat_items',
    'pfd_master_datasets',
    'pfd_revisions',
    'pfd_items',
    'pfd_registrations',
    // 매핑
    'pfmea_cp_mappings',
    'pfmea_pfd_mappings',
    'document_links',
    'sync_logs',
    // 프로젝트 메타
    'fmea_cft_members',
    'fmea_registrations',
    'fmea_projects',
    // TripletGroup & APQP (조심)
    'project_linkages',
    'triplet_groups',
    // Master references
    'master_fmea_references',
    'master_processes',
  ];

  let deleted = 0;
  for (const t of deleteOrder) {
    try {
      const r = await c.query('DELETE FROM public."' + t + '"');
      if (r.rowCount > 0) {
        console.log('  ' + t + ':', r.rowCount, '건 삭제');
        deleted += r.rowCount;
      }
    } catch(e) {
      // table not found or FK constraint - skip silently
    }
  }
  console.log('  총 삭제:', deleted, '건\n');

  // 3. 보존 확인
  console.log('--- 3. 보존 데이터 확인 ---');
  const preserved = ['users', 'apqp_projects', 'pfmea_severity_criteria', 'pfmea_occurrence_criteria', 'pfmea_detection_criteria'];
  for (const t of preserved) {
    try {
      const r = await c.query('SELECT count(*) as cnt FROM public.' + t);
      console.log('  ' + t + ':', r.rows[0].cnt, '건 (보존됨)');
    } catch(e) {
      console.log('  ' + t + ': N/A');
    }
  }

  // 4. 최종 확인
  console.log('\n--- 4. 최종 상태 ---');
  const checkTables = ['master_fmeas','family_masters','part_fmeas','fmea_projects','fmea_registrations','l1_structures','l2_structures','failure_links'];
  for (const t of checkTables) {
    try {
      const r = await c.query('SELECT count(*) as cnt FROM public.' + t);
      console.log('  ' + t + ':', r.rows[0].cnt);
    } catch(e) {}
  }

  const s2 = await c.query("SELECT count(*) as cnt FROM information_schema.schemata WHERE schema_name LIKE 'pfmea_%'");
  console.log('  pfmea_* 스키마:', s2.rows[0].cnt, '개');

  await c.end();
  console.log('\n✅ 정리 완료! Phase 0 GATE 확인 준비됨');
}

cleanAll().catch(e => console.error('ERROR:', e.message));
