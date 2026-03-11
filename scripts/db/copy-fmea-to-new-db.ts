/**
 * Copy one FMEA (legacy + atomic + confirmed) from SOURCE DB to TARGET DB.
 *
 * Usage (PowerShell):
 *   $env:SOURCE_DATABASE_URL="postgresql://...";   # optional, defaults to DATABASE_URL
 *   $env:TARGET_DATABASE_URL="postgresql://...";
 *   npx tsx scripts/db/copy-fmea-to-new-db.ts --fmeaId PFM26-001
 *
 * Notes:
 * - Does NOT print DB URLs.
 * - Requires TARGET DB schema already applied (run `npx prisma db push --url "$env:TARGET_DATABASE_URL"`).
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

type Args = { fmeaId: string };

function parseArgs(argv: string[]): Args {
  const idx = argv.findIndex(a => a === '--fmeaId');
  const fmeaId = idx >= 0 ? argv[idx + 1] : process.env.TEST_FMEA_ID || 'PFM26-001';
  if (!fmeaId) throw new Error('Missing --fmeaId');
  return { fmeaId };
}

function makePrisma(url: string): PrismaClient {
  const pool = new Pool({ connectionString: url });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

async function main() {
  const { fmeaId } = parseArgs(process.argv.slice(2));

  const sourceUrl = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
  const targetUrl = process.env.TARGET_DATABASE_URL;

  if (!sourceUrl) throw new Error('SOURCE_DATABASE_URL or DATABASE_URL is required');
  if (!targetUrl) throw new Error('TARGET_DATABASE_URL is required');

  const src = makePrisma(sourceUrl);
  const dst = makePrisma(targetUrl);

  try {
    // Sanity: ensure target has required tables
    try {
      await dst.fmeaLegacyData.findFirst({ select: { fmeaId: true } });
    } catch (e: any) {
      if (e?.code === 'P2021') {
        throw new Error(
          'Target DB schema is not applied yet. Run: npx prisma db push --url "$env:TARGET_DATABASE_URL"'
        );
      }
      throw e;
    }

    // Fetch source records
    const [legacy, confirmed, apqp] = await Promise.all([
      src.fmeaLegacyData.findUnique({ where: { fmeaId } }),
      src.fmeaConfirmedState.findUnique({ where: { fmeaId } }),
      src.aPQPProject.findUnique({ where: { id: fmeaId } }).catch(() => null),
    ]);

    if (!legacy?.data) throw new Error(`No legacy data found in source DB for fmeaId=${fmeaId}`);

    const [
      l1,
      l2,
      l3,
      l1Func,
      l2Func,
      l3Func,
      fe,
      fm,
      fc,
      fl,
      risk,
      opt,
    ] = await Promise.all([
      src.l1Structure.findFirst({ where: { fmeaId } }),
      src.l2Structure.findMany({ where: { fmeaId } }),
      src.l3Structure.findMany({ where: { fmeaId } }),
      src.l1Function.findMany({ where: { fmeaId } }),
      src.l2Function.findMany({ where: { fmeaId } }),
      src.l3Function.findMany({ where: { fmeaId } }),
      src.failureEffect.findMany({ where: { fmeaId } }),
      src.failureMode.findMany({ where: { fmeaId } }),
      src.failureCause.findMany({ where: { fmeaId } }),
      src.failureLink.findMany({ where: { fmeaId } }),
      src.riskAnalysis.findMany({ where: { fmeaId } }),
      src.optimization.findMany({ where: { fmeaId } }),
    ]);

    // Write to target
    await dst.$transaction(async (tx: any) => {
      if (apqp) {
        await tx.aPQPProject.upsert({
          where: { id: apqp.id },
          create: apqp,
          update: {
            name: apqp.name,
            productName: apqp.productName,
            customerName: apqp.customerName,
            status: apqp.status,
            startDate: apqp.startDate,
            targetDate: apqp.targetDate,
          },
        });
      }

      await tx.fmeaLegacyData.upsert({
        where: { fmeaId },
        create: { fmeaId, data: legacy.data, version: legacy.version || '1.0.0' },
        update: { data: legacy.data, version: legacy.version || '1.0.0' },
      });

      if (confirmed) {
        await tx.fmeaConfirmedState.upsert({
          where: { fmeaId },
          create: {
            fmeaId,
            structureConfirmed: confirmed.structureConfirmed,
            l1FunctionConfirmed: confirmed.l1FunctionConfirmed,
            l2FunctionConfirmed: confirmed.l2FunctionConfirmed,
            l3FunctionConfirmed: confirmed.l3FunctionConfirmed,
            failureL1Confirmed: confirmed.failureL1Confirmed,
            failureL2Confirmed: confirmed.failureL2Confirmed,
            failureL3Confirmed: confirmed.failureL3Confirmed,
            failureLinkConfirmed: confirmed.failureLinkConfirmed,
            riskConfirmed: confirmed.riskConfirmed,
            optimizationConfirmed: confirmed.optimizationConfirmed,
          },
          update: {
            structureConfirmed: confirmed.structureConfirmed,
            l1FunctionConfirmed: confirmed.l1FunctionConfirmed,
            l2FunctionConfirmed: confirmed.l2FunctionConfirmed,
            l3FunctionConfirmed: confirmed.l3FunctionConfirmed,
            failureL1Confirmed: confirmed.failureL1Confirmed,
            failureL2Confirmed: confirmed.failureL2Confirmed,
            failureL3Confirmed: confirmed.failureL3Confirmed,
            failureLinkConfirmed: confirmed.failureLinkConfirmed,
            riskConfirmed: confirmed.riskConfirmed,
            optimizationConfirmed: confirmed.optimizationConfirmed,
          },
        });
      }

      // Purge atomic tables on target (cascade via l1Structure)
      await tx.l1Structure.deleteMany({ where: { fmeaId } });

      if (l1) await tx.l1Structure.create({ data: l1 });
      if (l2.length) await tx.l2Structure.createMany({ data: l2, skipDuplicates: true });
      if (l3.length) await tx.l3Structure.createMany({ data: l3, skipDuplicates: true });
      if (l1Func.length) await tx.l1Function.createMany({ data: l1Func, skipDuplicates: true });
      if (l2Func.length) await tx.l2Function.createMany({ data: l2Func, skipDuplicates: true });
      if (l3Func.length) await tx.l3Function.createMany({ data: l3Func, skipDuplicates: true });
      if (fe.length) await tx.failureEffect.createMany({ data: fe, skipDuplicates: true });
      if (fm.length) await tx.failureMode.createMany({ data: fm, skipDuplicates: true });
      if (fc.length) await tx.failureCause.createMany({ data: fc, skipDuplicates: true });
      if (fl.length) {
        await tx.failureLink.deleteMany({ where: { fmeaId } });
        await tx.failureLink.createMany({ data: fl, skipDuplicates: true });
      }
      if (risk.length) await tx.riskAnalysis.createMany({ data: risk, skipDuplicates: true });
      if (opt.length) await tx.optimization.createMany({ data: opt, skipDuplicates: true });
    });

    // Minimal verification in target
    const [tLegacy, tL1, tL2Cnt] = await Promise.all([
      dst.fmeaLegacyData.findUnique({ where: { fmeaId } }),
      dst.l1Structure.findFirst({ where: { fmeaId } }),
      dst.l2Structure.count({ where: { fmeaId } }),
    ]);

    if (!tLegacy?.data) throw new Error('Copy failed: legacy not found in target after transaction');
    if (!tL1) throw new Error('Copy failed: l1Structure not found in target after transaction');

    process.stdout.write(
      JSON.stringify(
        {
          ok: true,
          fmeaId,
          targetCheck: { legacy: true, l1Structure: true, l2Structures: tL2Cnt },
        },
        null,
        2
      ) + '\n'
    );
  } finally {
    await src.$disconnect().catch(() => {});
    await dst.$disconnect().catch(() => {});
  }
}

main().catch((e) => {
  console.error('[copy-fmea-to-new-db] ERROR:', e?.message || e);
  process.exit(1);
});














