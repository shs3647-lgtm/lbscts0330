/**
 * m066 vs m102 Atomic DB 1:1 비교 — 차이점 출력
 */
import { PrismaClient } from '@prisma/client';

async function main() {
  const { getPrismaForSchema } = await import('../src/lib/prisma');
  
  const p066 = getPrismaForSchema('pfmea_pfm26_m066');
  const p102 = getPrismaForSchema('pfmea_pfm26_m102');
  if (!p066 || !p102) { console.error('Schema not found'); return; }

  const tables = [
    ['l2Structure', 'L2 Structures'],
    ['l3Structure', 'L3 Structures'],
    ['l1Function', 'L1 Functions'],
    ['l2Function', 'L2 Functions'],
    ['l3Function', 'L3 Functions'],
    ['failureEffect', 'Failure Effects'],
    ['failureMode', 'Failure Modes'],
    ['failureCause', 'Failure Causes'],
    ['failureLink', 'Failure Links'],
    ['riskAnalysis', 'Risk Analyses'],
  ] as const;

  console.log('=== m066 vs m102 Atomic DB Comparison ===\n');
  console.log('| Entity | m066 | m102 | Diff | Status |');
  console.log('|--------|------|------|------|--------|');

  for (const [table, label] of tables) {
    const c066 = await (p066 as any)[table].count({ where: { fmeaId: 'pfm26-m066' } }).catch(() => 0);
    const c102 = await (p102 as any)[table].count({ where: { fmeaId: 'pfm26-m102' } }).catch(() => 0);
    const diff = c102 - c066;
    const status = diff === 0 ? '✅' : Math.abs(diff) <= 2 ? '≈' : '❌';
    console.log(`| ${label.padEnd(16)} | ${String(c066).padStart(4)} | ${String(c102).padStart(4)} | ${(diff >= 0 ? '+' : '') + diff} | ${status} |`);
  }

  // 고장사슬 FK 비교
  const fl066 = await p066.failureLink.findMany({ where: { fmeaId: 'pfm26-m066', deletedAt: null } });
  const fl102 = await p102.failureLink.findMany({ where: { fmeaId: 'pfm26-m102', deletedAt: null } });

  const fl066Set = new Set(fl066.map(f => `${f.fmText}|${f.fcText}|${f.feText}`));
  const fl102Set = new Set(fl102.map(f => `${f.fmText}|${f.fcText}|${f.feText}`));

  const in066only = [...fl066Set].filter(k => !fl102Set.has(k));
  const in102only = [...fl102Set].filter(k => !fl066Set.has(k));

  console.log(`\n=== FailureLink Text Match ===`);
  console.log(`m066 unique text chains: ${fl066Set.size}`);
  console.log(`m102 unique text chains: ${fl102Set.size}`);
  console.log(`Common: ${[...fl066Set].filter(k => fl102Set.has(k)).length}`);
  console.log(`In m066 only: ${in066only.length}`);
  console.log(`In m102 only: ${in102only.length}`);
  if (in066only.length > 0) {
    console.log('\nFirst 5 m066-only chains:');
    in066only.slice(0, 5).forEach(k => console.log(`  ${k}`));
  }

  // FE 비교
  const fe066 = await p066.failureEffect.findMany({ where: { fmeaId: 'pfm26-m066' } });
  const fe102 = await p102.failureEffect.findMany({ where: { fmeaId: 'pfm26-m102' } });
  const feText066 = new Set(fe066.map(f => f.effect));
  const feText102 = new Set(fe102.map(f => f.effect));
  console.log(`\n=== FE text comparison ===`);
  console.log(`m066 unique effect texts: ${feText066.size}`);
  console.log(`m102 unique effect texts: ${feText102.size}`);

  // FC 비교 
  const fc066 = await p066.failureCause.findMany({ where: { fmeaId: 'pfm26-m066' } });
  const fc102 = await p102.failureCause.findMany({ where: { fmeaId: 'pfm26-m102' } });
  console.log(`\n=== FC count by L3 (processNo) ===`);
  console.log(`m066: ${fc066.length} causes across ${new Set(fc066.map(f => f.l3StructId)).size} L3s`);
  console.log(`m102: ${fc102.length} causes across ${new Set(fc102.map(f => f.l3StructId)).size} L3s`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
