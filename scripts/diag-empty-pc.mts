import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db?schema=public' });
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });

async function main() {
  const l3fs = await p.l3Function.findMany({
    where: { fmeaId: 'pfm26-m066' },
    select: { id: true, l3StructId: true, l2StructId: true, functionName: true, processChar: true },
    orderBy: { id: 'asc' }
  });
  const empty = l3fs.filter(f => !f.processChar?.trim());
  console.log('Total L3F:', l3fs.length);
  console.log('EmptyPC:', empty.length);
  for (const e of empty) {
    const l3 = await p.l3Structure.findUnique({ where: { id: e.l3StructId }, select: { name: true, processNo: true } });
    const l2 = await p.l2Structure.findUnique({ where: { id: e.l2StructId }, select: { name: true, processNo: true } });
    const fcs = await p.failureCause.findMany({ where: { l3FuncId: e.id, fmeaId: 'pfm26-m066' }, select: { id: true, cause: true } });
    console.log(JSON.stringify({ l3fId: e.id, funcName: e.functionName, processChar: e.processChar, l3: l3?.name, l2: l2?.name, l2ProcessNo: l2?.processNo, fcCount: fcs.length, fcs: fcs.map(f=>f.cause) }));
  }
  await p.$disconnect();
}
main();
