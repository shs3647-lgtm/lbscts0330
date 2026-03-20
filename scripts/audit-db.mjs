import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString: url });

async function main() {
  const client = await pool.connect();
  try {
    // 1. CP Audit
    const cpRes = await client.query(`
      SELECT cp.id, cp."cpNo", cp."fmeaId", cp."linkedPfmeaNo", cp."createdAt",
             (SELECT COUNT(*) FROM control_plan_items cpi WHERE cpi."cpId" = cp.id) as item_count
      FROM control_plans cp ORDER BY cp."fmeaId", cp."cpNo"
    `);
    const cpRegRes = await client.query(`SELECT "cpNo", "fmeaId", "tripletGroupId" FROM cp_registrations ORDER BY "fmeaId"`);

    const cpRegMap = {};
    for (const r of cpRegRes.rows) cpRegMap[r.fmeaId] = r.cpNo;

    console.log('=== ControlPlan Audit ===');
    const cpByFmea = {};
    for (const cp of cpRes.rows) {
      const key = cp.fmeaId || cp.linkedPfmeaNo || 'no-fmea';
      if (!cpByFmea[key]) cpByFmea[key] = [];
      cpByFmea[key].push(cp);
    }
    for (const [fmeaId, plans] of Object.entries(cpByFmea)) {
      const regCpNo = cpRegMap[fmeaId] || 'NONE';
      console.log(`fmeaId: ${fmeaId}  registeredCpNo: ${regCpNo}`);
      for (const pl of plans) {
        const isCorrect = pl.cpNo === regCpNo;
        console.log(`  cpNo: ${pl.cpNo}  items: ${pl.item_count}  created: ${pl.createdAt.toISOString().slice(0, 19)}  ${isCorrect ? '✅ CORRECT' : '❌ DUPLICATE'}`);
      }
    }
    const cpDups = Object.entries(cpByFmea).filter(([, v]) => v.length > 1);
    const cpOrphans = cpRes.rows.filter(c => parseInt(c.item_count) === 0);
    console.log('\n--- CP Summary ---');
    console.log('Total ControlPlans:', cpRes.rows.length);
    console.log('Total CpRegistrations:', cpRegRes.rows.length);
    console.log('fmeaIds with multiple CPs:', cpDups.length, cpDups.map(([k]) => k));
    console.log('CPs with 0 items:', cpOrphans.length, cpOrphans.map(c => c.cpNo));

    // 2. PFD Audit
    const pfdRes = await client.query(`
      SELECT pr.id, pr."pfdNo", pr."fmeaId", pr."linkedPfmeaNo", pr."tripletGroupId", pr."createdAt",
             (SELECT COUNT(*) FROM pfd_items pi2 WHERE pi2."pfdId" = pr.id AND (pi2."isDeleted" = false OR pi2."isDeleted" IS NULL)) as item_count
      FROM pfd_registrations pr ORDER BY pr."fmeaId", pr."pfdNo"
    `);
    const tgRes = await client.query(`SELECT id, "pfmeaId", "cpId", "pfdId" FROM triplet_groups`);
    const tgMap = {};
    for (const tg of tgRes.rows) { if (tg.pfmeaId) tgMap[tg.pfmeaId] = tg; }

    console.log('\n=== PFD Audit ===');
    const pfdByFmea = {};
    for (const pfd of pfdRes.rows) {
      const key = pfd.fmeaId || pfd.linkedPfmeaNo || 'no-fmea';
      if (!pfdByFmea[key]) pfdByFmea[key] = [];
      pfdByFmea[key].push(pfd);
    }
    for (const [fmeaId, pdfs] of Object.entries(pfdByFmea)) {
      const tg = tgMap[fmeaId];
      console.log(`fmeaId: ${fmeaId}  tripletPfdId: ${tg?.pfdId || 'NONE'}`);
      for (const pfd of pdfs) {
        const isCorrect = tg && pfd.pfdNo === tg.pfdId;
        console.log(`  pfdNo: ${pfd.pfdNo}  items: ${pfd.item_count}  triplet: ${pfd.tripletGroupId || 'NONE'}  ${isCorrect ? '✅ CORRECT' : '❌ AUTO-GEN'}`);
      }
    }
    const pfdDups = Object.entries(pfdByFmea).filter(([, v]) => v.length > 1);
    const pfdOrphans = pfdRes.rows.filter(p => parseInt(p.item_count) === 0);
    console.log('\n--- PFD Summary ---');
    console.log('Total PfdRegistrations:', pfdRes.rows.length);
    console.log('fmeaIds with multiple PFDs:', pfdDups.length, pfdDups.map(([k]) => k));
    console.log('PFDs with 0 items:', pfdOrphans.length, pfdOrphans.map(p => p.pfdNo));

    // 3. Registration ID Mismatch
    const fmeaRegRes = await client.query(`SELECT "fmeaId", "linkedCpNo", "linkedPfdNo" FROM fmea_registrations`);
    const fmeaMap = {};
    for (const r of fmeaRegRes.rows) fmeaMap[r.fmeaId] = r;

    const issues = [];
    for (const tg of tgRes.rows) {
      const fmea = fmeaMap[tg.pfmeaId];
      if (!fmea) { issues.push({ type: 'MISSING_FMEA_REG', pfmeaId: tg.pfmeaId }); continue; }
      if (fmea.linkedCpNo !== tg.cpId) issues.push({ type: 'CP_MISMATCH', fmeaId: tg.pfmeaId, tgCpId: tg.cpId, regCpNo: fmea.linkedCpNo });
      if (fmea.linkedPfdNo !== tg.pfdId) issues.push({ type: 'PFD_MISMATCH', fmeaId: tg.pfmeaId, tgPfdId: tg.pfdId, regPfdNo: fmea.linkedPfdNo });
    }
    for (const f of fmeaRegRes.rows) {
      if (!tgRes.rows.some(t => t.pfmeaId === f.fmeaId)) issues.push({ type: 'NO_TRIPLET', fmeaId: f.fmeaId });
    }

    console.log('\n=== Registration ID Mismatch ===');
    console.log(`TripletGroups: ${tgRes.rows.length}  FmeaRegs: ${fmeaRegRes.rows.length}  CpRegs: ${cpRegRes.rows.length}  PfdRegs: ${pfdRes.rows.length}`);
    console.log('Issues:', issues.length);
    for (const i of issues) console.log(JSON.stringify(i));

    const byType = {};
    for (const i of issues) byType[i.type] = (byType[i.type] || 0) + 1;
    console.log('\n--- Issue Summary ---');
    for (const [t, c] of Object.entries(byType)) console.log(`${t}: ${c}`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
