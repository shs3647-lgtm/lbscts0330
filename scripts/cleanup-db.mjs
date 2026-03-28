import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // === 1. 중복 CP 삭제: cp-26-m002 (하이픈 포함, AUTO-GEN) ===
    const cpDupRes = await client.query(`SELECT id, "cpNo" FROM control_plans WHERE "cpNo" LIKE 'cp-%' AND "fmeaId" IS NOT NULL`);
    for (const cp of cpDupRes.rows) {
      const correctCpNo = cp.cpNo.replace(/^cp-/, 'cp');
      const correctExists = await client.query(`SELECT id FROM control_plans WHERE "cpNo" = $1`, [correctCpNo]);
      if (correctExists.rows.length > 0) {
        const itemDel = await client.query(`DELETE FROM control_plan_items WHERE "cpId" = $1`, [cp.id]);
        const cpDel = await client.query(`DELETE FROM control_plans WHERE id = $1`, [cp.id]);
        console.log(`✅ 삭제: CP ${cp.cpNo} (items: ${itemDel.rowCount}) → 정본: ${correctCpNo}`);
      }
    }

    // === 2. 중복 PFD 삭제: pfd-26-m002 (하이픈 포함, AUTO-GEN, tripletGroupId=NULL) ===
    const pfdDupRes = await client.query(`
      SELECT id, "pfdNo", "fmeaId" FROM pfd_registrations 
      WHERE "tripletGroupId" IS NULL AND "pfdNo" LIKE 'pfd-%'
    `);
    for (const pfd of pfdDupRes.rows) {
      const itemDel = await client.query(`DELETE FROM pfd_items WHERE "pfdId" = $1`, [pfd.id]);
      const pfdDel = await client.query(`DELETE FROM pfd_registrations WHERE id = $1`, [pfd.id]);
      console.log(`✅ 삭제: PFD ${pfd.pfdNo} (items: ${itemDel.rowCount})`);
    }

    // === 3. 테스트 잔여물 CP 삭제 (cp-e2e-test-*, items=0) ===
    const e2eRes = await client.query(`SELECT id, "cpNo" FROM control_plans WHERE "cpNo" LIKE 'cp-e2e-test-%'`);
    for (const cp of e2eRes.rows) {
      await client.query(`DELETE FROM control_plan_items WHERE "cpId" = $1`, [cp.id]);
      await client.query(`DELETE FROM control_plans WHERE id = $1`, [cp.id]);
    }
    console.log(`✅ 삭제: E2E 테스트 CP ${e2eRes.rows.length}건`);

    // === 4. 테스트 잔여물 CP 삭제 (cp-test-rt-*, default-fmea-id) ===
    const testRtRes = await client.query(`SELECT id, "cpNo" FROM control_plans WHERE "cpNo" LIKE 'cp-test-rt-%'`);
    for (const cp of testRtRes.rows) {
      await client.query(`DELETE FROM control_plan_items WHERE "cpId" = $1`, [cp.id]);
      await client.query(`DELETE FROM control_plans WHERE id = $1`, [cp.id]);
    }
    console.log(`✅ 삭제: 테스트 RT CP ${testRtRes.rows.length}건`);

    // === 5. test-cp-nav-e2e 삭제 ===
    const navRes = await client.query(`SELECT id FROM control_plans WHERE "cpNo" = 'test-cp-nav-e2e'`);
    for (const cp of navRes.rows) {
      await client.query(`DELETE FROM control_plan_items WHERE "cpId" = $1`, [cp.id]);
      await client.query(`DELETE FROM control_plans WHERE id = $1`, [cp.id]);
    }
    if (navRes.rows.length > 0) console.log(`✅ 삭제: test-cp-nav-e2e`);

    // === 6. FmeaRegistration.linkedCpNo/linkedPfdNo 복구 (TripletGroup 기준) ===
    const mismatchRes = await client.query(`
      SELECT tg."pfmeaId", tg."cpId", tg."pfdId", 
             fr."linkedCpNo", fr."linkedPfdNo"
      FROM triplet_groups tg
      JOIN fmea_registrations fr ON fr."fmeaId" = tg."pfmeaId"
      WHERE (fr."linkedCpNo" IS NULL OR fr."linkedCpNo" != tg."cpId")
         OR (fr."linkedPfdNo" IS NULL OR fr."linkedPfdNo" != tg."pfdId")
    `);
    for (const row of mismatchRes.rows) {
      await client.query(`
        UPDATE fmea_registrations 
        SET "linkedCpNo" = $1, "linkedPfdNo" = $2 
        WHERE "fmeaId" = $3
      `, [row.cpId, row.pfdId, row.pfmeaId]);
      console.log(`✅ 복구: ${row.pfmeaId} linkedCpNo=${row.linkedCpNo}→${row.cpId} linkedPfdNo=${row.linkedPfdNo}→${row.pfdId}`);
    }

    await client.query('COMMIT');

    // === 검증: 재감사 ===
    console.log('\n=== 정리 후 검증 ===');
    const cpCount = await client.query(`SELECT COUNT(*) FROM control_plans`);
    const cpItemCount = await client.query(`SELECT COUNT(*) FROM control_plan_items`);
    const pfdCount = await client.query(`SELECT COUNT(*) FROM pfd_registrations`);
    const dupCpCheck = await client.query(`
      SELECT "fmeaId", COUNT(*) as cnt FROM control_plans 
      WHERE "fmeaId" IS NOT NULL GROUP BY "fmeaId" HAVING COUNT(*) > 1
    `);
    const dupPfdCheck = await client.query(`
      SELECT "fmeaId", COUNT(*) as cnt FROM pfd_registrations 
      WHERE "fmeaId" IS NOT NULL GROUP BY "fmeaId" HAVING COUNT(*) > 1
    `);
    const mismatchCheck = await client.query(`
      SELECT COUNT(*) FROM triplet_groups tg
      JOIN fmea_registrations fr ON fr."fmeaId" = tg."pfmeaId"
      WHERE (fr."linkedCpNo" IS DISTINCT FROM tg."cpId")
         OR (fr."linkedPfdNo" IS DISTINCT FROM tg."pfdId")
    `);

    console.log(`ControlPlans: ${cpCount.rows[0].count}`);
    console.log(`ControlPlanItems: ${cpItemCount.rows[0].count}`);
    console.log(`PfdRegistrations: ${pfdCount.rows[0].count}`);
    console.log(`중복 CP (fmeaId 기준): ${dupCpCheck.rows.length}`);
    console.log(`중복 PFD (fmeaId 기준): ${dupPfdCheck.rows.length}`);
    console.log(`Registration ID 불일치: ${mismatchCheck.rows[0].count}`);

  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
