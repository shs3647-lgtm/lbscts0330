const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

(async () => {
  try {
    // 1. 현재 실제 사용 중인 FMEA (deletedAt=null인 것)
    console.log('=== 활성 FMEA 프로젝트 (L2 데이터 있음) ===');
    const r1 = await pool.query(`
      SELECT fr."fmeaId", fr.subject, fr."linkedPfdNo", fr."linkedCpNo",
        (SELECT COUNT(*) FROM l2_structures WHERE "fmeaId" = fr."fmeaId") as l2_count,
        (SELECT COUNT(*) FROM l3_structures WHERE "fmeaId" = fr."fmeaId") as l3_count
      FROM fmea_registrations fr
      WHERE fr."deletedAt" IS NULL
        AND EXISTS (SELECT 1 FROM l2_structures WHERE "fmeaId" = fr."fmeaId")
      ORDER BY fr."updatedAt" DESC
      LIMIT 10
    `);
    r1.rows.forEach(r => {
      console.log(`  ${r.fmeaId} | subject="${r.subject}" | linkedPfd=${r.linkedPfdNo || 'null'} | linkedCp=${r.linkedCpNo || 'null'} | L2=${r.l2_count} L3=${r.l3_count}`);
    });

    // 2. 활성 PFD (deletedAt=null) 목록
    console.log('\n=== 활성 PFD (deletedAt=null, 브라우저에 표시됨) ===');
    const r2 = await pool.query(`
      SELECT pr."pfdNo", pr."fmeaId", pr."linkedPfmeaNo",
        (SELECT COUNT(*) FROM pfd_items WHERE "pfdId" = pr.id AND "isDeleted" = false) as items
      FROM pfd_registrations pr
      WHERE pr."deletedAt" IS NULL
      ORDER BY pr."pfdNo"
    `);
    r2.rows.forEach(r => {
      console.log(`  ${r.pfdNo} | fmeaId=${r.fmeaId || 'null'} | linked=${r.linkedPfmeaNo || 'null'} | items=${r.items}`);
    });

    // 3. PFMEA create-pfd API가 호출하는 경로 검증
    // create-pfd는 클라이언트가 l2Data를 보내야 하므로, useCpSync에서 어떻게 호출하는지 확인
    console.log('\n=== PFMEA에서 PFD 생성 호출 확인 ===');
    // PFMEA 워크시트의 useCpSync.ts에서 handleCreatePfd가 어떤 데이터를 보내는지
    // 이건 코드 레벨이라 DB로는 확인 불가

    // 4. PFD 워크시트에서 보이는 FMEA→PFD 버튼 조건 확인
    // 조건: fmeaId가 설정되어야 버튼이 보임
    console.log('\n=== PFD에서 FMEA→PFD 버튼 표시 조건 ===');
    console.log('  fmeaId가 있는 활성 PFD만 FMEA→PFD 버튼이 보임');
    r2.rows.forEach(r => {
      if (r.fmeaId) {
        console.log(`  ✅ ${r.pfdNo} → fmeaId=${r.fmeaId} (버튼 보임)`);
      } else {
        console.log(`  ❌ ${r.pfdNo} → fmeaId 없음 (버튼 안 보임)`);
      }
    });

  } catch(e) { console.error('Error:', e.message); }
  finally { pool.end(); }
})();
