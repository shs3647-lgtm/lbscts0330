/**
 * FK 매칭 진단 — L2Function.l2StructId vs L2Structure.id
 * 실행: npx tsx scripts/_check-fk-match.ts
 */
import { getBaseDatabaseUrl, getPrismaForSchema } from '../src/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '../src/lib/project-schema';

const fmeaId = 'pfm26-m009';

async function main() {
  const schema = getProjectSchemaName(fmeaId);
  await ensureProjectSchemaReady({ baseDatabaseUrl: getBaseDatabaseUrl(), schema });
  const prisma = getPrismaForSchema(schema);
  if (!prisma) throw new Error('No prisma');

  // L2Structure
  const l2s = await prisma.l2Structure.findMany({ where: { fmeaId } });
  const l2IdSet = new Set(l2s.map(r => r.id));
  console.log(`L2Structure: ${l2s.length}개`);

  // L2Function FK check
  const l2fs = await prisma.l2Function.findMany({ where: { fmeaId } });
  let l2f_m = 0, l2f_u = 0;
  for (const f of l2fs) {
    if (l2IdSet.has(f.l2StructId)) l2f_m++; else l2f_u++;
  }
  console.log(`L2Function: ${l2fs.length}개 → FK매칭 ${l2f_m}, FK불일치 ${l2f_u}`);
  if (l2f_u > 0) {
    const sample = l2fs.filter(f => !l2IdSet.has(f.l2StructId)).slice(0, 3);
    sample.forEach(f => console.log(`  ❌ l2StructId=${f.l2StructId.substring(0,16)}... fn=${f.functionName.substring(0,30)}`));
  }

  // FailureMode FK check
  const fms = await prisma.failureMode.findMany({ where: { fmeaId } });
  let fm_m = 0, fm_u = 0;
  for (const f of fms) {
    if (l2IdSet.has(f.l2StructId)) fm_m++; else fm_u++;
  }
  console.log(`\nFailureMode: ${fms.length}개 → FK매칭 ${fm_m}, FK불일치 ${fm_u}`);

  // L3Structure FK check
  const l3s = await prisma.l3Structure.findMany({ where: { fmeaId } });
  let l3_m = 0, l3_u = 0;
  for (const s of l3s) {
    if (l2IdSet.has(s.l2Id)) l3_m++; else l3_u++;
  }
  console.log(`\nL3Structure: ${l3s.length}개 → FK매칭 ${l3_m}, FK불일치 ${l3_u}`);

  // L3Function FK check (l3StructId → L3Structure)
  const l3IdSet = new Set(l3s.map(r => r.id));
  const l3fs = await prisma.l3Function.findMany({ where: { fmeaId } });
  let l3f_m = 0, l3f_u = 0;
  for (const f of l3fs) {
    if (l3IdSet.has(f.l3StructId)) l3f_m++; else l3f_u++;
  }
  console.log(`\nL3Function: ${l3fs.length}개 → FK매칭 ${l3f_m}, FK불일치 ${l3f_u}`);

  // FailureCause FK check
  const fcs = await prisma.failureCause.findMany({ where: { fmeaId } });
  let fc_m = 0, fc_u = 0;
  for (const f of fcs) {
    if (l3IdSet.has(f.l3StructId)) fc_m++; else fc_u++;
  }
  console.log(`\nFailureCause: ${fcs.length}개 → FK매칭 ${fc_m}, FK불일치 ${fc_u}`);

  // === 핵심 진단: atomicToFlatData와 동일한 groupBy 시뮬레이션 ===
  console.log('\n=== atomicToFlatData groupBy 시뮬레이션 ===');
  
  // A3: l2FuncsByL2
  const l2FuncsByL2 = new Map<string, number>();
  for (const f of l2fs) {
    l2FuncsByL2.set(f.l2StructId, (l2FuncsByL2.get(f.l2StructId) || 0) + 1);
  }
  let a3_total = 0;
  for (const l2 of l2s) {
    const count = l2FuncsByL2.get(l2.id) || 0;
    a3_total += count;
    if (count === 0) console.log(`  A3 누락: L2 ${l2.no} ${l2.name?.substring(0,20)} → L2Function 0개`);
  }
  console.log(`A3 flatData 예상: ${a3_total}개 (L2Function ${l2fs.length}개 중)`);

  // B1: l3s for l2
  let b1_total = 0;
  for (const l2 of l2s) {
    const count = l3s.filter(l3 => l3.l2Id === l2.id).length;
    b1_total += count;
  }
  console.log(`B1 flatData 예상: ${b1_total}개 (L3Structure ${l3s.length}개 중)`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
