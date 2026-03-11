const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const fmeas = await prisma.fmeaProject.findMany({
    select: { id: true, fmeaId: true, fmeaType: true, status: true }
  });
  console.log('=== FMEA Projects ===');
  fmeas.forEach(f => console.log(`  ${f.id} | fmeaId=${f.fmeaId} | type=${f.fmeaType} | ${f.status}`));

  const l2Count = await prisma.l2Structure.count();
  console.log(`\nL2 Structure count: ${l2Count}`);

  const l3s = await prisma.l3Structure.findMany({
    select: { id: true, name: true, m4: true, fmeaId: true },
    take: 30
  });
  console.log(`\n=== L3 Structures (first 30) ===`);
  l3s.forEach(l => console.log(`  ${l.fmeaId} | 4M=${l.m4 || '(none)'} | ${l.name}`));

  const m4Stats = {};
  const allL3 = await prisma.l3Structure.findMany({ select: { m4: true } });
  allL3.forEach(l => {
    const m4 = l.m4 || '(empty)';
    m4Stats[m4] = (m4Stats[m4] || 0) + 1;
  });
  console.log(`\n=== 4M Distribution ===`);
  Object.entries(m4Stats).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  const cps = await prisma.controlPlan.findMany({
    select: { id: true, cpNo: true, fmeaId: true, syncStatus: true }
  });
  console.log(`\n=== Control Plans ===`);
  if (cps.length === 0) console.log('  (none)');
  cps.forEach(c => console.log(`  ${c.id} | ${c.cpNo} | fmeaId=${c.fmeaId} | ${c.syncStatus}`));

  const cpItemCount = await prisma.controlPlanItem.count();
  console.log(`\nCP Items total: ${cpItemCount}`);
  if (cpItemCount > 0) {
    const cpItems = await prisma.controlPlanItem.findMany({
      select: { processNo: true, processName: true, equipment: true, workElement: true },
      take: 20
    });
    console.log('=== CP Items (first 20) ===');
    cpItems.forEach(ci => console.log(`  ${ci.processNo} | ${ci.processName} | equip=${ci.equipment} | we=${ci.workElement}`));
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
