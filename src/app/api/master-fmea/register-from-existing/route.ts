/**
 * @file register-from-existing/route.ts
 * 기존 FMEA 프로젝트를 Master FMEA로 등록한다.
 * L2Structure(공정)를 MasterFmeaProcess로 복사.
 *
 * POST body: { fmeaId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma, getPrismaForSchema, getBaseDatabaseUrl } from '@/lib/prisma';
import { getProjectSchemaName, ensureProjectSchemaReady } from '@/lib/project-schema';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';

export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'DB 연결 실패' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { fmeaId } = body as { fmeaId?: string };

    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 fmeaId' },
        { status: 400 }
      );
    }

    // 1. 원본 FMEA 프로젝트 + Registration 확인
    const project = await (prisma as any).fmeaProject.findUnique({
      where: { fmeaId },
      include: { registration: true },
    });
    if (!project) {
      return NextResponse.json(
        { success: false, error: `FMEA 프로젝트 없음: ${fmeaId}` },
        { status: 404 }
      );
    }

    // 2. L2Structure (공정 목록) 로드 — 프로젝트 스키마에서 조회
    const schema = getProjectSchemaName(fmeaId);
    const baseUrl = getBaseDatabaseUrl();
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const projectPrisma = getPrismaForSchema(schema) || prisma;
    const l2Structures = await (projectPrisma as any).l2Structure.findMany({
      where: { fmeaId },
      orderBy: { order: 'asc' },
    });
    if (l2Structures.length === 0) {
      return NextResponse.json(
        { success: false, error: 'L2Structure(공정) 0건 — Import 필요' },
        { status: 400 }
      );
    }

    // 3. 트랜잭션: MasterFmea + FamilyMaster + MasterFmeaProcess 생성
    const result = await (prisma as any).$transaction(async (tx: any) => {
      // 3a. MasterFmea — 기존 있으면 재사용, 없으면 생성
      const partName = project.registration?.partName || fmeaId;
      const code = `MF-${fmeaId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase()}`;

      let masterFmea = await tx.masterFmea.findFirst({
        where: { status: 'ACTIVE' },
      });

      if (!masterFmea) {
        masterFmea = await tx.masterFmea.create({
          data: {
            code,
            name: `${partName} Master FMEA`,
            productName: partName,
            version: '1.0',
            status: 'ACTIVE',
          },
        });
      }

      // 3b. FamilyMaster — 기존 있으면 재사용, 없으면 생성
      let familyMaster = await tx.familyMaster.findUnique({
        where: { masterFmeaId: masterFmea.id },
      });

      if (!familyMaster) {
        const fmCode = `FM-${code.replace('MF-', '')}-00`;
        familyMaster = await tx.familyMaster.create({
          data: {
            masterFmeaId: masterFmea.id,
            code: fmCode,
            name: `${partName} Family FMEA Master-00`,
            version: '1.0',
            status: 'ACTIVE',
            fmeaId,
          },
        });
      } else if (!familyMaster.fmeaId) {
        // fmeaId가 없으면 업데이트
        familyMaster = await tx.familyMaster.update({
          where: { id: familyMaster.id },
          data: { fmeaId },
        });
      }

      // 3c. 기존 MasterFmeaProcess 삭제 후 재생성 (idempotent)
      await tx.masterFmeaProcess.deleteMany({
        where: { masterFmeaId: masterFmea.id },
      });

      const processData = l2Structures.map((l2: any, idx: number) => ({
        masterFmeaId: masterFmea.id,
        processNo: l2.no || String((idx + 1) * 10).padStart(3, '0'),
        processName: l2.name,
        orderIndex: idx,
        isActive: true,
      }));

      await tx.masterFmeaProcess.createMany({ data: processData });

      // 3d. version bump
      await tx.masterFmea.update({
        where: { id: masterFmea.id },
        data: { version: '1.1' },
      });

      return {
        masterFmea: {
          id: masterFmea.id,
          code: masterFmea.code,
          name: masterFmea.name,
          version: '1.1',
        },
        familyMaster: {
          id: familyMaster.id,
          code: familyMaster.code,
          fmeaId: familyMaster.fmeaId,
        },
        processCount: processData.length,
      };
    }, { timeout: 15000 });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[register-from-existing] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
