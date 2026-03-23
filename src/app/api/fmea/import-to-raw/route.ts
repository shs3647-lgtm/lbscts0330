/**
 * @file import-to-raw/route.ts
 * @description JSON 형태의 PositionBasedJSON (5시트 데이터)를 받아 파싱 + 품질 체크만 (DB 저장 없음)
 *
 * POST /api/fmea/import-to-raw
 * Body: { fmeaId: string, json: PositionBasedJSON }
 * Returns: { success, fmeaId, stats, quality: RawQualityResult }
 *
 * @version 1.0.0
 * @created 2026-03-23
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { parsePositionBasedJSON } from '@/lib/fmea/position-parser';
import { validateFKChain } from '@/lib/fmea-core/fk-chain-validator';
import { checkRawQuality } from '@/lib/fmea-core/raw-quality-checker';
import { saveAtomicFromPosition } from '@/lib/fmea-core/raw-to-atomic';
import { getProjectSchemaName, ensureProjectSchemaReady } from '@/lib/project-schema';
import { getPrismaForSchema } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fmeaId, json, save: doSave, force } = body as {
      fmeaId: string; json: unknown; save?: boolean; force?: boolean;
    };

    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }
    if (!json || typeof json !== 'object') {
      return NextResponse.json({ success: false, error: 'json parameter required (PositionBasedJSON)' }, { status: 400 });
    }

    const normalizedId = fmeaId.toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const atomicData = parsePositionBasedJSON(json as any);
    const report = validateFKChain(atomicData);
    const qualityResult = checkRawQuality(atomicData, report);

    console.log(`[import-to-raw] fmeaId=${normalizedId} quality=${qualityResult.status} FL=${atomicData.failureLinks.length} save=${doSave}`);

    // ★ save=true 이면 DB 저장까지 수행
    if (doSave) {
      const schema = getProjectSchemaName(normalizedId);
      const baseDatabaseUrl = process.env.DATABASE_URL || '';
      await ensureProjectSchemaReady({ baseDatabaseUrl, schema });
      const prisma = getPrismaForSchema(schema);
      if (!prisma) {
        return NextResponse.json({ success: false, error: 'Failed to get Prisma client' }, { status: 500 });
      }
      const saveResult = await saveAtomicFromPosition(prisma, atomicData, { force: force ?? true });
      return NextResponse.json({
        success: true, fmeaId: normalizedId,
        stats: atomicData.stats, quality: qualityResult,
        saved: true, counts: saveResult.counts, skippedFL: saveResult.skippedFL,
      });
    }

    return NextResponse.json({
      success: true, fmeaId: normalizedId,
      stats: atomicData.stats, quality: qualityResult,
    });

  } catch (err) {
    console.error('[import-to-raw] Error:', err);
    return NextResponse.json({ success: false, error: safeErrorMessage(err) }, { status: 500 });
  }
}
