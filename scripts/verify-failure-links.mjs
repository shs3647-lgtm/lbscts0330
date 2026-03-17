#!/usr/bin/env node
/**
 * @file verify-failure-links.mjs
 * @description FailureLink DB 정합성 검증 — FE-FM-FC 관계성 확인
 *
 * Usage: node scripts/verify-failure-links.mjs [fmeaId]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fmeaId = process.argv[2];
  if (!fmeaId) {
    console.log('Usage: node scripts/verify-failure-links.mjs <fmeaId>');
    console.log('\nAvailable FMEA projects:');
    const projects = await prisma.fmeaProject.findMany({
      select: { id: true, projectName: true },
      take: 20,
    });
    for (const p of projects) {
      console.log(`  ${p.id}  ${p.projectName || '(unnamed)'}`);
    }
    process.exit(1);
  }

  console.log(`\n========== FailureLink DB 검증: ${fmeaId} ==========\n`);

  // 1. 기본 카운트
  const [fmCount, feCount, fcCount, linkCount] = await Promise.all([
    prisma.failureMode.count({ where: { fmeaId } }),
    prisma.failureEffect.count({ where: { fmeaId } }),
    prisma.failureCause.count({ where: { fmeaId } }),
    prisma.failureLink.count({ where: { fmeaId } }),
  ]);

  console.log(`FM: ${fmCount}건, FE: ${feCount}건, FC: ${fcCount}건, FailureLink: ${linkCount}건\n`);

  // 2. FailureLink FK 정합성 검증
  const links = await prisma.failureLink.findMany({
    where: { fmeaId },
    select: {
      id: true,
      fmId: true,
      feId: true,
      fcId: true,
      fmText: true,
      feText: true,
      fcText: true,
      deletedAt: true,
    },
  });

  const fmIds = new Set((await prisma.failureMode.findMany({ where: { fmeaId }, select: { id: true } })).map(r => r.id));
  const feIds = new Set((await prisma.failureEffect.findMany({ where: { fmeaId }, select: { id: true } })).map(r => r.id));
  const fcIds = new Set((await prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true } })).map(r => r.id));

  let orphanFm = 0, orphanFe = 0, orphanFc = 0, softDeleted = 0;
  const brokenLinks = [];
  for (const l of links) {
    if (l.deletedAt) { softDeleted++; continue; }
    const broken = [];
    if (!fmIds.has(l.fmId)) { orphanFm++; broken.push('FM'); }
    if (!feIds.has(l.feId)) { orphanFe++; broken.push('FE'); }
    if (!fcIds.has(l.fcId)) { orphanFc++; broken.push('FC'); }
    if (broken.length > 0) {
      brokenLinks.push({ id: l.id.substring(0, 12), missing: broken.join(','), fmText: (l.fmText || '').substring(0, 20), fcText: (l.fcText || '').substring(0, 20) });
    }
  }

  console.log(`[FailureLink FK 검증]`);
  console.log(`  활성 링크: ${links.length - softDeleted}건, soft-deleted: ${softDeleted}건`);
  console.log(`  고아 FM FK: ${orphanFm}건, 고아 FE FK: ${orphanFe}건, 고아 FC FK: ${orphanFc}건`);
  if (brokenLinks.length > 0) {
    console.log(`  ⚠️ 깨진 링크 ${brokenLinks.length}건:`);
    for (const b of brokenLinks.slice(0, 10)) {
      console.log(`    id=${b.id}... missing=${b.missing} fm="${b.fmText}" fc="${b.fcText}"`);
    }
  } else {
    console.log(`  ✅ FK 정합성 완벽`);
  }

  // 3. 미연결 FC 찾기
  const linkedFcIds = new Set(links.filter(l => !l.deletedAt).map(l => l.fcId));
  const allFcs = await prisma.failureCause.findMany({
    where: { fmeaId },
    select: { id: true, cause: true, l2StructId: true },
  });
  const unlinkedFcs = allFcs.filter(fc => !linkedFcIds.has(fc.id));

  console.log(`\n[미연결 FC]`);
  if (unlinkedFcs.length === 0) {
    console.log(`  ✅ 모든 FC가 FailureLink에 연결됨`);
  } else {
    console.log(`  ⚠️ 미연결 FC ${unlinkedFcs.length}건:`);
    // L2Structure 이름 매핑
    const l2Structs = await prisma.l2Structure.findMany({
      where: { fmeaId },
      select: { id: true, name: true, no: true },
    });
    const l2Map = new Map(l2Structs.map(s => [s.id, `${s.no || ''} ${s.name || ''}`]));

    for (const fc of unlinkedFcs) {
      const procName = l2Map.get(fc.l2StructId || '') || '(unknown)';
      console.log(`    FC id=${fc.id.substring(0, 12)}... [${procName.trim()}] ${fc.cause}`);
    }
  }

  // 4. 미연결 FM 찾기
  const linkedFmIds = new Set(links.filter(l => !l.deletedAt).map(l => l.fmId));
  const allFms = await prisma.failureMode.findMany({
    where: { fmeaId },
    select: { id: true, mode: true, l2StructId: true },
  });
  const unlinkedFms = allFms.filter(fm => !linkedFmIds.has(fm.id));

  console.log(`\n[미연결 FM]`);
  if (unlinkedFms.length === 0) {
    console.log(`  ✅ 모든 FM이 FailureLink에 연결됨`);
  } else {
    console.log(`  ⚠️ 미연결 FM ${unlinkedFms.length}건:`);
    const l2Structs2 = await prisma.l2Structure.findMany({
      where: { fmeaId },
      select: { id: true, name: true, no: true },
    });
    const l2Map2 = new Map(l2Structs2.map(s => [s.id, `${s.no || ''} ${s.name || ''}`]));
    for (const fm of unlinkedFms) {
      const procName = l2Map2.get(fm.l2StructId || '') || '(unknown)';
      console.log(`    FM id=${fm.id.substring(0, 12)}... [${procName.trim()}] ${fm.mode}`);
    }
  }

  // 5. 중복 링크 검출 (동일 fmId+feId+fcId)
  const linkKeys = new Map();
  let dupeCount = 0;
  for (const l of links.filter(l => !l.deletedAt)) {
    const key = `${l.fmId}|${l.feId}|${l.fcId}`;
    if (linkKeys.has(key)) {
      dupeCount++;
    } else {
      linkKeys.set(key, l.id);
    }
  }
  console.log(`\n[중복 링크]`);
  if (dupeCount === 0) {
    console.log(`  ✅ 중복 없음`);
  } else {
    console.log(`  ⚠️ 중복 링크 ${dupeCount}건`);
  }

  // 6. FM-FE-FC 관계 요약
  console.log(`\n[FM별 연결 요약]`);
  const fmLinkCounts = new Map();
  for (const l of links.filter(l => !l.deletedAt)) {
    if (!fmLinkCounts.has(l.fmId)) fmLinkCounts.set(l.fmId, { feSet: new Set(), fcSet: new Set() });
    const c = fmLinkCounts.get(l.fmId);
    if (l.feId) c.feSet.add(l.feId);
    if (l.fcId) c.fcSet.add(l.fcId);
  }
  const fmNames = new Map(allFms.map(fm => [fm.id, fm.mode]));
  for (const [fmId, counts] of fmLinkCounts) {
    const name = (fmNames.get(fmId) || '').substring(0, 30);
    console.log(`  ${name}: FE ${counts.feSet.size}개 × FC ${counts.fcSet.size}개`);
  }

  console.log(`\n========== 검증 완료 ==========\n`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
