/**
 * POST /api/fmea/repair-fk
 * rebuild-atomic 없이 FK만 결정론적으로 정리 (삭제·null 정리).
 * 사전 검증: GET /api/fmea/validate-fk?fmeaId=
 *
 * Body JSON:
 * - fmeaId (필수)
 * - dryRun?: boolean — true면 DB 변경 없이 예정 작업만 messages에
 * - clearInvalidProductCharOnFm?: boolean — 기본 true, 무효 productCharId → null
 * - deleteCrossProcessFailureLinks?: boolean — 기본 true (crossProcessFk 해당 FL 삭제)
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import { repairFkIntegrity } from '@/lib/fmea-core/fk-repair';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const fmeaId = typeof body.fmeaId === 'string' ? body.fmeaId : '';
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'fmeaId 필요 (예: pfm26-m066)' }, { status: 400 });
    }

    const dryRun = body.dryRun === true;
    const clearInvalidProductCharOnFm = body.clearInvalidProductCharOnFm !== false;
    const deleteCrossProcessFailureLinks = body.deleteCrossProcessFailureLinks !== false;

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) {
      return NextResponse.json({ success: false, error: 'DATABASE_URL 미설정' }, { status: 500 });
    }

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Prisma 클라이언트 초기화 실패' }, { status: 500 });
    }

    const result = await repairFkIntegrity(prisma, fmeaId, {
      dryRun,
      clearInvalidProductCharOnFm,
      deleteCrossProcessFailureLinks,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (e) {
    console.error('[repair-fk] POST error:', e);
    return NextResponse.json({ success: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}
