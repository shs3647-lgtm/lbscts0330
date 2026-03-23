/**
 * @file raw-to-atomic/route.ts
 * @description PositionAtomicData를 받아 DB에 저장 (import-to-raw + DB 저장 결합)
 *
 * POST /api/fmea/raw-to-atomic
 * Body: { fmeaId: string, atomicData: PositionAtomicData, force?: boolean }
 * Returns: { success, fmeaId, counts, quality, skippedFL }
 *
 * @version 1.0.0
 * @created 2026-03-23
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getProjectSchemaName, ensureProjectSchemaReady } from '@/lib/project-schema';
import { getPrismaForSchema } from '@/lib/prisma';
import { validateFKChain } from '@/lib/fmea-core/fk-chain-validator';
import { checkRawQuality } from '@/lib/fmea-core/raw-quality-checker';
import { saveAtomicFromPosition } from '@/lib/fmea-core/raw-to-atomic';
import type { PositionAtomicData } from '@/types/position-import';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fmeaId, atomicData, force } = body as {
      fmeaId: string;
      atomicData: PositionAtomicData;
      force?: boolean;
    };

    // 1. fmeaId 검증
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }

    // 2. atomicData 검증 (l1Structure 필수)
    if (!atomicData || !atomicData.l1Structure) {
      return NextResponse.json(
        { success: false, error: 'atomicData.l1Structure required' },
        { status: 400 },
      );
    }

    const normalizedId = fmeaId.toLowerCase();
    const schema = getProjectSchemaName(normalizedId);
    const baseDatabaseUrl = process.env.DATABASE_URL || '';

    // 3. 프로젝트 스키마 준비
    await ensureProjectSchemaReady({ baseDatabaseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Failed to get Prisma client' },
        { status: 500 },
      );
    }

    console.log(`[raw-to-atomic] schema=${schema}, fmeaId=${normalizedId}, force=${force}`);
    console.log(`[raw-to-atomic] stats:`, JSON.stringify(atomicData.stats));

    // 4. validateFKChain 호출
    const report = validateFKChain(atomicData);

    // 5. checkRawQuality 호출
    const qualityResult = checkRawQuality(atomicData, report);

    console.log(`[raw-to-atomic] quality=${qualityResult.status} summary=${qualityResult.summary}`);

    // 6. saveAtomicFromPosition 호출
    const result = await saveAtomicFromPosition(prisma, atomicData, { force: force ?? false });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error ?? 'DB 저장 실패' },
        { status: 500 },
      );
    }

    // 7. 응답
    return NextResponse.json({
      success: true,
      fmeaId: normalizedId,
      counts: result.counts,
      quality: {
        status: qualityResult.status,
        fkCoverage: qualityResult.fkCoverage,
      },
      skippedFL: result.skippedFL,
    });

  } catch (err) {
    console.error('[raw-to-atomic] Error:', err);
    return NextResponse.json({ success: false, error: safeErrorMessage(err) }, { status: 500 });
  }
}
