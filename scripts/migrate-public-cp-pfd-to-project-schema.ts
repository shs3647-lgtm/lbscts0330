/**
 * @file migrate-public-cp-pfd-to-project-schema.ts
 * @description 레거시: public.control_plans / control_plan_items / pfd_registrations / pfd_items
 *              → 해당 PFMEA 프로젝트 스키마 `pfmea_{fmeaId}` 동일 테이블로 이관.
 *
 * 배경: sync-cp-pfd·create-cp·워크시트는 프로젝트 스키마를 SSoT로 사용.
 *       예전에 public에만 쌓인 CP/PFD 행을 옮길 때 사용.
 *
 * 실행:
 *   dotenv -- npx tsx scripts/migrate-public-cp-pfd-to-project-schema.ts --dry-run
 *   dotenv -- npx tsx scripts/migrate-public-cp-pfd-to-project-schema.ts
 *
 * 주의: 대상 스키마에 이미 동일 cpNo/pfdNo가 있으면 해당 CP/PFD 헤더는 스킵하고 items만 검토(안전 우선).
 */

import { getPrisma, getPrismaForSchema, getBaseDatabaseUrl } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

const DRY = process.argv.includes('--dry-run');

function normFmeaId(raw: string | null | undefined): string {
  return String(raw || '')
    .trim()
    .toLowerCase();
}

async function migrateControlPlans(): Promise<{ copied: number; skipped: number }> {
  const publicPrisma = getPrisma();
  if (!publicPrisma) throw new Error('Prisma (public) unavailable');
  const baseUrl = getBaseDatabaseUrl();
  if (!baseUrl) throw new Error('DATABASE_URL / getBaseDatabaseUrl() missing');

  const plans = await publicPrisma.controlPlan.findMany({
    orderBy: { createdAt: 'asc' },
  });

  let copied = 0;
  let skipped = 0;

  for (const cp of plans) {
    const fmeaId = normFmeaId(cp.fmeaId || cp.linkedPfmeaNo);
    if (!fmeaId) {
      console.warn(`[migrate-cp] skip (no fmeaId): cpNo=${cp.cpNo}`);
      skipped++;
      continue;
    }

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const proj = getPrismaForSchema(schema);
    if (!proj) {
      console.warn(`[migrate-cp] skip (no project prisma): ${schema}`);
      skipped++;
      continue;
    }

    const existing = await proj.controlPlan.findFirst({
      where: { OR: [{ id: cp.id }, { cpNo: cp.cpNo }] },
    });
    if (existing) {
      console.log(`[migrate-cp] skip header (exists in project): ${cp.cpNo} → ${schema}`);
      skipped++;
      continue;
    }

    const items = await publicPrisma.controlPlanItem.findMany({
      where: { cpId: cp.id },
      orderBy: { sortOrder: 'asc' },
    });

    if (DRY) {
      console.log(`[dry-run] CP ${cp.cpNo}: ${items.length} items → ${schema}`);
      copied++;
      continue;
    }

    await proj.$transaction(async (tx: any) => {
      await tx.controlPlan.create({
        data: {
          id: cp.id,
          cpNo: cp.cpNo,
          fmeaId,
          fmeaNo: cp.fmeaNo,
          fmeaRev: cp.fmeaRev,
          projectName: cp.projectName,
          partName: cp.partName,
          partNo: cp.partNo,
          revNo: cp.revNo,
          revDate: cp.revDate,
          customer: cp.customer,
          processFrom: cp.processFrom,
          processTo: cp.processTo,
          preparedBy: cp.preparedBy,
          approvedBy: cp.approvedBy,
          linkedPfmeaNo: cp.linkedPfmeaNo ? normFmeaId(cp.linkedPfmeaNo) : null,
          linkedPfdNo: cp.linkedPfdNo,
          status: cp.status,
          step: cp.step,
          syncStatus: cp.syncStatus,
          lastSyncAt: cp.lastSyncAt,
          changeCount: cp.changeCount,
          createdAt: cp.createdAt,
          updatedAt: cp.updatedAt,
        },
      });

      for (const it of items) {
        await tx.controlPlanItem.create({
          data: {
            id: it.id,
            cpId: it.cpId,
            pfmeaRowUid: it.pfmeaRowUid,
            pfmeaProcessId: it.pfmeaProcessId,
            pfmeaWorkElemId: it.pfmeaWorkElemId,
            processNo: it.processNo,
            processName: it.processName,
            processLevel: it.processLevel,
            processDesc: it.processDesc,
            partName: it.partName,
            workElement: it.workElement,
            equipment: it.equipment,
            equipmentM4: it.equipmentM4,
            detectorNo: it.detectorNo,
            detectorEp: it.detectorEp,
            detectorAuto: it.detectorAuto,
            epDeviceIds: it.epDeviceIds,
            autoDeviceIds: it.autoDeviceIds,
            productChar: it.productChar,
            processChar: it.processChar,
            specialChar: it.specialChar,
            charIndex: it.charIndex,
            specTolerance: it.specTolerance,
            evalMethod: it.evalMethod,
            sampleSize: it.sampleSize,
            sampleFreq: it.sampleFreq,
            controlMethod: it.controlMethod,
            owner1: it.owner1,
            owner2: it.owner2,
            reactionPlan: it.reactionPlan,
            rowType: it.rowType,
            refSeverity: it.refSeverity,
            refOccurrence: it.refOccurrence,
            refDetection: it.refDetection,
            refAp: it.refAp,
            linkStatus: it.linkStatus,
            changeFlag: it.changeFlag,
            sortOrder: it.sortOrder,
            createdAt: it.createdAt,
            updatedAt: it.updatedAt,
            unifiedItemId: it.unifiedItemId,
            productCharId: it.productCharId,
            linkId: it.linkId,
            processCharId: it.processCharId,
          },
        });
      }
    });

    console.log(`[migrate-cp] OK ${cp.cpNo} (${items.length} items) → ${schema}`);
    copied++;
  }

  return { copied, skipped };
}

async function migratePfdRegistrations(): Promise<{ copied: number; skipped: number }> {
  const publicPrisma = getPrisma();
  if (!publicPrisma) throw new Error('Prisma (public) unavailable');
  const baseUrl = getBaseDatabaseUrl();
  if (!baseUrl) throw new Error('DATABASE_URL / getBaseDatabaseUrl() missing');

  const pfds = await publicPrisma.pfdRegistration.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });

  let copied = 0;
  let skipped = 0;

  for (const pfd of pfds) {
    const fmeaId = normFmeaId(pfd.fmeaId || pfd.linkedPfmeaNo);
    if (!fmeaId) {
      console.warn(`[migrate-pfd] skip (no fmeaId): pfdNo=${pfd.pfdNo}`);
      skipped++;
      continue;
    }

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const proj = getPrismaForSchema(schema);
    if (!proj) {
      console.warn(`[migrate-pfd] skip (no project prisma): ${schema}`);
      skipped++;
      continue;
    }

    const existing = await proj.pfdRegistration.findFirst({
      where: { OR: [{ id: pfd.id }, { pfdNo: pfd.pfdNo }] },
    });
    if (existing) {
      console.log(`[migrate-pfd] skip header (exists in project): ${pfd.pfdNo} → ${schema}`);
      skipped++;
      continue;
    }

    const items = await publicPrisma.pfdItem.findMany({
      where: { pfdId: pfd.id, isDeleted: false },
      orderBy: { sortOrder: 'asc' },
    });

    if (DRY) {
      console.log(`[dry-run] PFD ${pfd.pfdNo}: ${items.length} items → ${schema}`);
      copied++;
      continue;
    }

    await proj.$transaction(async (tx: any) => {
      await tx.pfdRegistration.create({
        data: {
          id: pfd.id,
          pfdNo: pfd.pfdNo,
          fmeaId,
          cpNo: pfd.cpNo,
          apqpProjectId: pfd.apqpProjectId,
          parentApqpNo: pfd.parentApqpNo,
          linkedDfmeaNo: pfd.linkedDfmeaNo,
          linkedPfmeaNo: pfd.linkedPfmeaNo ? normFmeaId(pfd.linkedPfmeaNo) : null,
          linkedCpNos: pfd.linkedCpNos,
          partName: pfd.partName,
          partNo: pfd.partNo,
          subject: pfd.subject,
          customerName: pfd.customerName,
          modelYear: pfd.modelYear,
          companyName: pfd.companyName,
          processOwner: pfd.processOwner,
          createdBy: pfd.createdBy,
          processResponsibility: pfd.processResponsibility,
          pfdResponsibleName: pfd.pfdResponsibleName,
          pfdStartDate: pfd.pfdStartDate,
          pfdRevisionDate: pfd.pfdRevisionDate,
          engineeringLocation: pfd.engineeringLocation,
          confidentialityLevel: pfd.confidentialityLevel,
          securityLevel: pfd.securityLevel,
          cftMembers: pfd.cftMembers,
          status: pfd.status,
          createdAt: pfd.createdAt,
          updatedAt: pfd.updatedAt,
          deletedAt: pfd.deletedAt,
          tripletGroupId: pfd.tripletGroupId,
        },
      });

      for (const it of items) {
        await tx.pfdItem.create({
          data: {
            id: it.id,
            pfdId: it.pfdId,
            fmeaL2Id: it.fmeaL2Id,
            fmeaL3Id: it.fmeaL3Id,
            productCharId: it.productCharId,
            processNo: it.processNo,
            processName: it.processName,
            processLevel: it.processLevel,
            processDesc: it.processDesc,
            productChar: it.productChar,
            processChar: it.processChar,
            productSC: it.productSC,
            processSC: it.processSC,
            specialChar: it.specialChar,
            partName: it.partName,
            workElement: it.workElement,
            equipment: it.equipment,
            equipmentM4: it.equipmentM4,
            cpItemId: it.cpItemId,
            sortOrder: it.sortOrder,
            isDeleted: it.isDeleted,
            createdAt: it.createdAt,
            updatedAt: it.updatedAt,
            unifiedItemId: it.unifiedItemId,
          },
        });
      }
    });

    console.log(`[migrate-pfd] OK ${pfd.pfdNo} (${items.length} items) → ${schema}`);
    copied++;
  }

  return { copied, skipped };
}

async function main(): Promise<void> {
  console.log(`[migrate-public-cp-pfd] DRY_RUN=${DRY}`);
  const cpRes = await migrateControlPlans();
  const pfdRes = await migratePfdRegistrations();
  console.log('[migrate-public-cp-pfd] CP:', cpRes);
  console.log('[migrate-public-cp-pfd] PFD:', pfdRes);
  console.log('[migrate-public-cp-pfd] done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
