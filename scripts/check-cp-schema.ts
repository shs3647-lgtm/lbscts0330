import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  // 1. public schema CP
  const cp = await p.controlPlan.findFirst({ where: { cpNo: 'cp26-m002' } });
  console.log('public CP:', cp ? `FOUND fmeaId=${cp.fmeaId}` : 'NOT FOUND');
  if (cp) {
    const n = await p.controlPlanItem.count({ where: { cpId: cp.id } });
    console.log('public CP items:', n);
  }

  // 2. project schema check
  try {
    const result: any = await p.$queryRawUnsafe("SELECT count(*)::int as cnt FROM pfmea_pfm26_m002.control_plan_items");
    console.log('project schema CP items:', result[0]?.cnt);
  } catch (e: any) {
    console.log('project schema CP items error:', e.message?.slice(0, 100));
  }

  try {
    const result2: any = await p.$queryRawUnsafe("SELECT count(*)::int as cnt FROM pfmea_pfm26_m002.control_plans");
    console.log('project schema CPs:', result2[0]?.cnt);
  } catch (e: any) {
    console.log('project schema CPs error:', e.message?.slice(0, 100));
  }

  await p.$disconnect();
}

main().catch(e => console.error(e.message));
