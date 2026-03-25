import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fullPurge() {
  const fmeaId = 'pfm26-p018-i18';
  console.log('═══ 완전 삭제 (휴지통 포함): ' + fmeaId + ' ═══\n');

  const del = async (name: string, p: Promise<{count:number}>) => {
    try { const r = await p; console.log('  ' + name + ': ' + r.count + '건'); }
    catch { console.log('  ' + name + ': skip'); }
  };

  // 워크시트 데이터 (자식→부모)
  console.log('[워크시트]');
  await del('RiskAnalysis',  prisma.riskAnalysis.deleteMany({ where: { fmeaId } }));
  await del('FailureLink',   prisma.failureLink.deleteMany({ where: { fmeaId } }));
  await del('FailureCause',  prisma.failureCause.deleteMany({ where: { fmeaId } }));
  await del('FailureMode',   prisma.failureMode.deleteMany({ where: { fmeaId } }));
  await del('FailureEffect', prisma.failureEffect.deleteMany({ where: { fmeaId } }));
  await del('L3Function',    prisma.l3Function.deleteMany({ where: { fmeaId } }));
  await del('L2Function',    prisma.l2Function.deleteMany({ where: { fmeaId } }));
  await del('L1Function',    prisma.l1Function.deleteMany({ where: { fmeaId } }));
  await del('L3Structure',   prisma.l3Structure.deleteMany({ where: { fmeaId } }));
  await del('L2Structure',   prisma.l2Structure.deleteMany({ where: { fmeaId } }));
  await del('L1Structure',   prisma.l1Structure.deleteMany({ where: { fmeaId } }));

  // Master BD (휴지통 포함 — soft delete 무시하고 전부 삭제)
  console.log('\n[Master BD + 휴지통]');
  await del('MasterDatasetItem', prisma.masterDatasetItem.deleteMany({ where: { dataset: { fmeaId } } }));
  // soft deleted 포함하여 전부
  await del('MasterDataset(all)', prisma.masterDataset.deleteMany({ where: { fmeaId } }));

  // ImportJob
  console.log('\n[ImportJob]');
  await del('ImportMapping', prisma.importMapping.deleteMany({ where: { job: { fmeaId } } }));
  await del('ImportJob',     prisma.importJob.deleteMany({ where: { fmeaId } }));

  // 검증
  console.log('\n[최종 검증]');
  const counts = {
    L1: await prisma.l1Structure.count({ where: { fmeaId } }),
    L2: await prisma.l2Structure.count({ where: { fmeaId } }),
    L3: await prisma.l3Structure.count({ where: { fmeaId } }),
    L1F: await prisma.l1Function.count({ where: { fmeaId } }),
    L2F: await prisma.l2Function.count({ where: { fmeaId } }),
    L3F: await prisma.l3Function.count({ where: { fmeaId } }),
    FM: await prisma.failureMode.count({ where: { fmeaId } }),
    FC: await prisma.failureCause.count({ where: { fmeaId } }),
    FE: await prisma.failureEffect.count({ where: { fmeaId } }),
    FL: await prisma.failureLink.count({ where: { fmeaId } }),
    RA: await prisma.riskAnalysis.count({ where: { fmeaId } }),
    MasterDS: await prisma.masterDataset.count({ where: { fmeaId } }),
  };
  let total = 0;
  for (const [k,v] of Object.entries(counts)) {
    if (v > 0) console.log('  ❌ ' + k + ': ' + v);
    total += v;
  }
  console.log(total === 0 ? '  ✅ ALL ZERO — 완전 클린!' : '  ❌ 잔여: ' + total);

  await prisma.$disconnect();
}
fullPurge();
