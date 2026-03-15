/**
 * FE 순환 할당 마이그레이션 — legacyData failureLinks 수정
 *
 * 문제: 모든 링크가 동일한 1개 feId만 사용 → 19/20 FE 누락
 * 해결: FM 순서 기반 FE 순환 배정 (buildWorksheetState Phase 3와 동일 로직)
 *
 * Usage: npx tsx scripts/temp-fix-fe-assignment.ts
 * DRY RUN: npx tsx scripts/temp-fix-fe-assignment.ts --dry
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const isDryRun = process.argv.includes('--dry');
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`=== FE 순환 할당 마이그레이션 ${isDryRun ? '(DRY RUN)' : ''} ===\n`);

  const projects = await prisma.fmeaProject.findMany({
    select: { fmeaId: true, fmeaType: true },
    orderBy: { updatedAt: 'desc' },
  });

  for (const proj of projects) {
    const fmeaId = proj.fmeaId;

    const legacy = await prisma.fmeaLegacyData.findFirst({
      where: { fmeaId },
      select: { id: true, data: true },
    });
    if (!legacy?.data) continue;

    const d = legacy.data as any;
    const failureScopes = d?.l1?.failureScopes || [];
    const links = d?.failureLinks || [];
    if (failureScopes.length <= 1 || links.length === 0) continue;

    // feId 분포 확인
    const uniqueFeIds = new Set(links.map((l: any) => l.feId).filter(Boolean));
    if (uniqueFeIds.size > 1) {
      console.log(`[${fmeaId}] SKIP — 이미 ${uniqueFeIds.size}개 feId 분배됨 (links=${links.length})`);
      continue;
    }

    // ★ 수정 대상: feId 1종류만 사용하는 프로젝트
    console.log(`[${fmeaId}] FIX — FE ${failureScopes.length}개, Links ${links.length}개, feId 1종류`);

    // FM 순서 기반 FE 순환 배정
    const fmIds = [...new Set(links.map((l: any) => l.fmId).filter(Boolean))] as string[];
    const fmToFeId = new Map<string, string>();
    fmIds.forEach((fmId, i) => {
      const feIdx = i % failureScopes.length;
      fmToFeId.set(fmId, failureScopes[feIdx].id);
    });

    console.log(`  FM ${fmIds.length}개 → FE ${failureScopes.length}개 순환 배정:`);
    const feUsage = new Map<string, number>();
    fmIds.forEach((fmId) => {
      const feId = fmToFeId.get(fmId)!;
      feUsage.set(feId, (feUsage.get(feId) || 0) + 1);
    });
    for (const [feId, count] of feUsage) {
      const fe = failureScopes.find((f: any) => f.id === feId);
      const effect = (fe?.effect || fe?.name || '').substring(0, 50);
      console.log(`    ${count}FM → ${effect}`);
    }

    // 링크 업데이트
    let updatedCount = 0;
    const newLinks = links.map((l: any) => {
      if (!l.fmId) return l;
      const newFeId = fmToFeId.get(l.fmId);
      if (!newFeId || newFeId === l.feId) return l;

      // FE 텍스트도 업데이트
      const fe = failureScopes.find((f: any) => f.id === newFeId);
      updatedCount++;
      return {
        ...l,
        feId: newFeId,
        feText: fe?.effect || fe?.name || l.feText,
        feScope: fe?.scope || l.feScope,
        severity: fe?.severity || l.severity,
        fePath: fe?.scope ? `${fe.scope}/${fe.effect || fe.name}` : (fe?.effect || fe?.name || l.fePath),
      };
    });

    console.log(`  변경: ${updatedCount}/${links.length} 링크 feId 업데이트`);

    // 변경 후 검증
    const newUniqueFeIds = new Set(newLinks.map((l: any) => l.feId).filter(Boolean));
    const linkedFmIds = new Set(newLinks.map((l: any) => l.fmId));
    const linkedFcIds = new Set(newLinks.map((l: any) => l.fcId));

    // FM/FC/FE 전체 카운트
    let totalFM = 0, totalFC = 0;
    for (const proc of (d?.l2 || [])) {
      totalFM += (proc.failureModes || []).length;
      for (const we of (proc.l3 || [])) {
        totalFC += (we.failureCauses || []).length;
      }
      totalFC += (proc.failureCauses || []).length;
    }

    const allFmIds = new Set<string>();
    const allFcIds = new Set<string>();
    for (const proc of (d?.l2 || [])) {
      for (const fm of (proc.failureModes || [])) allFmIds.add(fm.id);
      for (const we of (proc.l3 || [])) {
        for (const fc of (we.failureCauses || [])) allFcIds.add(fc.id);
      }
      for (const fc of (proc.failureCauses || [])) allFcIds.add(fc.id);
    }

    const missingFMs = [...allFmIds].filter(id => {
      return !newLinks.some((l: any) => l.fmId === id && l.fcId);
    });
    const missingFCs = [...allFcIds].filter(id => !linkedFcIds.has(id));
    const missingFEs = failureScopes.filter((fe: any) => !newUniqueFeIds.has(fe.id));

    console.log(`\n  === 수정 후 예상 결과 ===`);
    console.log(`  FE: ${newUniqueFeIds.size}/${failureScopes.length} linked (was 1)`);
    console.log(`  FM: ${linkedFmIds.size}/${totalFM} linked`);
    console.log(`  FC: ${linkedFcIds.size}/${totalFC} linked`);
    console.log(`  Missing: FMs=${missingFMs.length} FCs=${missingFCs.length} FEs=${missingFEs.length} Total=${missingFMs.length + missingFCs.length + missingFEs.length}`);

    if (missingFMs.length > 0) {
      console.log(`  Missing FM:`);
      for (const fmId of missingFMs) {
        for (const proc of (d?.l2 || [])) {
          const fm = (proc.failureModes || []).find((f: any) => f.id === fmId);
          if (fm) { console.log(`    공정${proc.no} | "${(fm.name || '').substring(0, 50)}"`); break; }
        }
      }
    }

    if (!isDryRun) {
      // legacyData 업데이트
      const newData = { ...d, failureLinks: newLinks };
      await prisma.fmeaLegacyData.update({
        where: { id: legacy.id },
        data: { data: newData as any },
      });
      console.log(`\n  ✅ DB 업데이트 완료`);
    } else {
      console.log(`\n  🔍 DRY RUN — DB 변경 없음`);
    }
  }

  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
