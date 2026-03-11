/**
 * @file /api/fmea/backup/snapshot/route.ts
 * @description FMEA 프로젝트별 스냅샷 백업/복원 API
 * - POST: 스냅샷 생성 + retention 자동 정리
 * - GET: 스냅샷 목록 조회
 * - PUT: 실제 복원 (FmeaLegacyData 덮어쓰기)
 * - DELETE: 스냅샷 삭제
 * @created 2026-02-23
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

const MAX_AUTO = 20;
const MAX_MANUAL = 10;

// ============================================================================
// POST — 스냅샷 생성
// ============================================================================

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
  }

  try {
    const { fmeaId, version, triggerType, changeNote, backupData } = await req.json();

    if (!fmeaId || !version || !backupData) {
      return NextResponse.json({ success: false, error: 'fmeaId, version, backupData 필수' }, { status: 400 });
    }
    if (!isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }

    const normalizedId = fmeaId.toLowerCase();
    const [majorStr, minorStr] = version.split('.');
    const revMajor = majorStr === 'A' ? 0 : (majorStr === 'M' ? 1 : parseInt(majorStr, 10) || 0);
    const revMinor = parseInt(minorStr, 10) || 0;
    const jsonStr = JSON.stringify(backupData);
    const dataSize = Buffer.byteLength(jsonStr, 'utf-8');

    // 중복 버전 체크 — 덮어쓰기
    const existing = await prisma.fmeaVersionBackup.findUnique({
      where: { fmeaId_version: { fmeaId: normalizedId, version } },
    });

    if (existing) {
      await prisma.fmeaVersionBackup.update({
        where: { id: existing.id },
        data: { backupData: jsonStr, dataSize, changeNote, triggerType, createdAt: new Date() },
      });
    } else {
      await prisma.fmeaVersionBackup.create({
        data: {
          fmeaId: normalizedId,
          version,
          revMajor,
          revMinor,
          versionType: triggerType === 'MANUAL' ? 'MANUAL' : 'AUTO',
          backupData: jsonStr,
          dataSize,
          compressed: false,
          changeNote,
          triggerType: triggerType || 'MANUAL',
          createdBy: 'system',
        },
      });
    }

    // Retention enforcement — 자동/수동 각각 최대 보존
    await enforceRetention(prisma, normalizedId);


    return NextResponse.json({ success: true, version, dataSize });
  } catch (error) {
    console.error('[스냅샷 API] POST 오류:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

// ============================================================================
// GET — 스냅샷 목록 조회
// ============================================================================

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
  }

  try {
    const fmeaId = req.nextUrl.searchParams.get('fmeaId');
    if (!fmeaId) {
      return NextResponse.json({ success: false, error: 'fmeaId 필수' }, { status: 400 });
    }
    if (!isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }

    const normalizedId = fmeaId.toLowerCase();

    const backups = await prisma.fmeaVersionBackup.findMany({
      where: { fmeaId: normalizedId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fmeaId: true,
        version: true,
        triggerType: true,
        changeNote: true,
        dataSize: true,
        createdAt: true,
      },
    });

    // stats는 backupData에서 추출 (목록에서는 미포함 — 용량 절약)
    const snapshots = backups.map(b => ({
      id: b.id,
      fmeaId: b.fmeaId,
      version: b.version,
      triggerType: b.triggerType,
      changeNote: b.changeNote,
      dataSize: b.dataSize || 0,
      createdAt: b.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, snapshots });
  } catch (error) {
    console.error('[스냅샷 API] GET 오류:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

// ============================================================================
// PUT — 실제 복원 (FmeaLegacyData 덮어쓰기)
// ============================================================================

export async function PUT(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
  }

  try {
    const { fmeaId, version } = await req.json();
    if (!fmeaId || !version) {
      return NextResponse.json({ success: false, error: 'fmeaId, version 필수' }, { status: 400 });
    }
    if (!isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }

    const normalizedId = fmeaId.toLowerCase();

    // 1. 백업 데이터 조회
    const backup = await prisma.fmeaVersionBackup.findUnique({
      where: { fmeaId_version: { fmeaId: normalizedId, version } },
    });
    if (!backup) {
      return NextResponse.json({ success: false, error: `백업 없음: v${version}` }, { status: 404 });
    }

    let backupData: Record<string, unknown>;
    try {
      backupData = JSON.parse(backup.backupData);
    } catch {
      return NextResponse.json({ success: false, error: '백업 데이터 파싱 실패' }, { status: 500 });
    }

    // 2. 현재 legacyData 조회 → pre-restore 스냅샷 생성
    const currentLegacy = await prisma.fmeaLegacyData.findFirst({
      where: { fmeaId: normalizedId },
    });

    if (currentLegacy) {
      // pre-restore 스냅샷 (복원 전 안전망)
      const preRestoreVersion = `R.${Date.now()}`;
      const currentJsonStr = JSON.stringify(currentLegacy.data);
      await prisma.fmeaVersionBackup.create({
        data: {
          fmeaId: normalizedId,
          version: preRestoreVersion,
          revMajor: 9,
          revMinor: 0,
          versionType: 'RESTORE',
          backupData: currentJsonStr,
          dataSize: Buffer.byteLength(currentJsonStr, 'utf-8'),
          compressed: false,
          changeNote: `복원 전 자동백업 (v${version} 복원)`,
          triggerType: 'RESTORE',
          createdBy: 'system',
        },
      }).catch(() => {});
    }

    // 3. backupData에서 legacyData 추출
    // 스냅샷 구조: { state: { l1, l2, ... }, stats, triggerContext }
    const stateData = (backupData.state as Record<string, unknown>) || backupData;

    // 기존 legacyData와 병합 (스냅샷 state를 legacyData.data에 넣기)
    const currentData = (currentLegacy?.data as Record<string, unknown>) || {};
    const mergedData = { ...currentData, ...stateData };

    // 4. FmeaLegacyData 덮어쓰기 (public schema)
    await prisma.fmeaLegacyData.upsert({
      where: { fmeaId: normalizedId },
      create: { fmeaId: normalizedId, data: mergedData as object, version: '1.0.0' },
      update: { data: mergedData as object, updatedAt: new Date() },
    });

    // 5. 프로젝트 스키마에도 동기화
    try {
      const schema = getProjectSchemaName(normalizedId);
      const jsonStr = JSON.stringify(mergedData);
      await prisma.$executeRawUnsafe(
        `UPDATE "${schema}".fmea_legacy_data SET data = $1::jsonb, "updatedAt" = NOW() WHERE "fmeaId" = $2`,
        jsonStr,
        normalizedId,
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
    }


    return NextResponse.json({
      success: true,
      message: `v${version} 복원 완료`,
      restoredVersion: version,
      restoredData: mergedData,
    });
  } catch (error) {
    console.error('[스냅샷 API] PUT 오류:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

// ============================================================================
// DELETE — 스냅샷 삭제
// ============================================================================

export async function DELETE(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
  }

  try {
    const { fmeaId, version } = await req.json();
    if (!fmeaId || !version) {
      return NextResponse.json({ success: false, error: 'fmeaId, version 필수' }, { status: 400 });
    }
    if (!isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }

    const normalizedId = fmeaId.toLowerCase();

    await prisma.fmeaVersionBackup.deleteMany({
      where: { fmeaId: normalizedId, version },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[스냅샷 API] DELETE 오류:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

// ============================================================================
// 보존 정책 적용
// ============================================================================

async function enforceRetention(prisma: NonNullable<ReturnType<typeof getPrisma>>, fmeaId: string) {
  try {
    const all = await prisma.fmeaVersionBackup.findMany({
      where: { fmeaId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, version: true, triggerType: true },
    });

    const autoItems = all.filter(b => b.version.startsWith('A.'));
    const manualItems = all.filter(b => b.version.startsWith('M.'));

    // 자동: MAX_AUTO 초과분 삭제
    if (autoItems.length > MAX_AUTO) {
      const toDelete = autoItems.slice(MAX_AUTO);
      for (const item of toDelete) {
        await prisma.fmeaVersionBackup.delete({ where: { id: item.id } });
      }
    }

    // 수동: MAX_MANUAL 초과분 삭제
    if (manualItems.length > MAX_MANUAL) {
      const toDelete = manualItems.slice(MAX_MANUAL);
      for (const item of toDelete) {
        await prisma.fmeaVersionBackup.delete({ where: { id: item.id } });
      }
    }
  } catch (e) {
    console.error('[스냅샷] retention 정리 오류:', e);
  }
}
