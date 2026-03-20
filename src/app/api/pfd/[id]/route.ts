/**
 * @file api/pfd/[id]/route.ts
 * @description PFD 단건 조회/수정/삭제 API
 * @module pfd/api
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma, getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { getPrismaForPfd, ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import { pickFields, safeErrorMessage } from '@/lib/security';
import { isValidPfdFormat, derivePfdNoFromFmeaId } from '@/lib/utils/derivePfdNo';

// ============================================================================
// GET: PFD 상세 조회
// ============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // ★ 잘못된 PFD ID 감지 → DB에서 fmeaId 기반으로 올바른 PFD 검색
    let correctedPfdNo: string | null = null;

    // PFD 조회 (ID 또는 pfdNo로)
    let pfd = await prisma.pfdRegistration.findFirst({
      where: {
        OR: [
          { id },
          { pfdNo: id },
        ],
        deletedAt: null,
      },
      include: {
        items: {
          where: { isDeleted: false },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    // 잘못된 PFD ID로 레코드를 찾았지만 아이템이 없는 경우 → fmeaId로 올바른 PFD 검색
    if (pfd && !isValidPfdFormat(pfd.pfdNo) && pfd.fmeaId) {
      correctedPfdNo = derivePfdNoFromFmeaId(pfd.fmeaId);

      // 교정된 ID로 다른 PFD가 존재하는지 확인
      if (correctedPfdNo !== pfd.pfdNo) {
        const correctPfd = await prisma.pfdRegistration.findFirst({
          where: { pfdNo: correctedPfdNo, deletedAt: null },
          include: {
            items: {
              where: { isDeleted: false },
              orderBy: { sortOrder: 'asc' },
            },
          },
        });
        if (correctPfd && correctPfd.items.length > 0) {
          pfd = correctPfd; // 올바른 PFD로 교체
        }
      }
    }

    if (!pfd) {
      return NextResponse.json(
        { success: false, error: 'PFD를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 연결된 문서 정보 조회
    const links = await prisma.documentLink.findMany({
      where: {
        OR: [
          { sourceType: 'pfd', sourceId: pfd.id },
          { targetType: 'pfd', targetId: pfd.id },
        ],
      },
    });

    // ★ processDesc 자동보충: FMEA 연결된 PFD의 빈 공정설명을 FMEA 함수명으로 채움
    const enrichedItems = await enrichProcessDesc(pfd.items, pfd.fmeaId, prisma);

    // 요청 ID와 실제 pfdNo가 다르면 교정 정보 포함
    const needsRedirect = pfd.pfdNo !== id && id !== pfd.id;

    return NextResponse.json({
      success: true,
      data: {
        ...pfd,
        items: enrichedItems,
        links,
        ...(needsRedirect ? { correctedPfdNo: pfd.pfdNo } : {}),
      },
    });

  } catch (error: any) {
    console.error('[API] PFD 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT: PFD 수정
// ============================================================================

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // 기존 PFD 확인 (활성 레코드만)
    const existing = await prisma.pfdRegistration.findFirst({
      where: {
        OR: [
          { id },
          { pfdNo: id },
        ],
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'PFD를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // PFD 업데이트 (허용 필드만 추출 — mass assignment 방지)
    const { items } = body;
    const PFD_ALLOWED_FIELDS = ['partName', 'partNo', 'processDescription', 'processType', 'status', 'subject', 'customer', 'customerPartNo', 'modelYear', 'engineeringLevel', 'revision', 'issueDate', 'preparedBy', 'approvedBy'];
    const pfdData = pickFields(body, PFD_ALLOWED_FIELDS);

    const pfd = await prisma.pfdRegistration.update({
      where: { id: existing.id },
      data: {
        ...pfdData,
        updatedAt: new Date(),
      },
    });

    // 항목 업데이트 (있는 경우)
    if (items && Array.isArray(items)) {
      // 기존 항목 soft delete
      await prisma.pfdItem.updateMany({
        where: { pfdId: existing.id },
        data: { isDeleted: true },
      });

      // 새 항목 upsert
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.id) {
          await prisma.pfdItem.update({
            where: { id: item.id },
            data: {
              ...item,
              sortOrder: i * 10,
              isDeleted: false,
              updatedAt: new Date(),
            },
          });
        } else {
          await prisma.pfdItem.create({
            data: {
              ...item,
              pfdId: existing.id,
              sortOrder: i * 10,
              isDeleted: false,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: pfd,
    });

  } catch (error: any) {
    console.error('[API] PFD 수정 실패:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE: PFD 삭제
// ============================================================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // 기존 PFD 확인
    const existing = await prisma.pfdRegistration.findFirst({
      where: {
        OR: [
          { id },
          { pfdNo: id },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'PFD를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // ★ Soft Delete (deletedAt 설정)
    await prisma.pfdRegistration.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      message: 'PFD가 삭제되었습니다',
    });

  } catch (error: any) {
    console.error('[API] PFD 삭제 실패:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}

// ============================================================================
// processDesc 자동보충 — FMEA 함수명으로 빈 공정설명 채움
// ============================================================================

async function enrichProcessDesc(
  items: any[],
  fmeaId: string | null | undefined,
  publicPrisma: any,
): Promise<any[]> {
  if (!items || items.length === 0) return items;

  const emptyDescItems = items.filter(
    (it: any) => !it.processDesc?.trim() && (it.fmeaL2Id || it.fmeaL3Id),
  );
  if (emptyDescItems.length === 0 || !fmeaId) return items;

  try {
    const baseUrl = getBaseDatabaseUrl();
    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const projectPrisma = getPrismaForSchema(schema);
    if (!projectPrisma) return items;

    const l2Ids = [...new Set(emptyDescItems.map((it: any) => it.fmeaL2Id).filter(Boolean))];
    const l3Ids = [...new Set(emptyDescItems.map((it: any) => it.fmeaL3Id).filter(Boolean))];

    const [l2Functions, l3Functions] = await Promise.all([
      l2Ids.length > 0
        ? projectPrisma.l2Function.findMany({
            where: { fmeaId, l2StructId: { in: l2Ids } },
            select: { l2StructId: true, functionName: true, productChar: true },
          })
        : [],
      l3Ids.length > 0
        ? projectPrisma.l3Function.findMany({
            where: { fmeaId, l3StructId: { in: l3Ids } },
            select: { l3StructId: true, functionName: true, processChar: true },
          })
        : [],
    ]);

    const l2FnMap = new Map<string, string>();
    for (const fn of l2Functions) {
      if (fn.functionName?.trim() && !l2FnMap.has(fn.l2StructId)) {
        l2FnMap.set(fn.l2StructId, fn.functionName.trim());
      }
    }

    const l3FnMap = new Map<string, string>();
    for (const fn of l3Functions) {
      if (fn.functionName?.trim() && !l3FnMap.has(fn.l3StructId)) {
        l3FnMap.set(fn.l3StructId, fn.functionName.trim());
      }
    }

    const updateIds: { id: string; processDesc: string }[] = [];

    const enriched = items.map((item: any) => {
      if (item.processDesc?.trim()) return item;

      let desc = '';
      if (item.fmeaL3Id && l3FnMap.has(item.fmeaL3Id)) {
        desc = l3FnMap.get(item.fmeaL3Id)!;
      } else if (item.fmeaL2Id && l2FnMap.has(item.fmeaL2Id)) {
        desc = l2FnMap.get(item.fmeaL2Id)!;
      }

      if (desc) {
        updateIds.push({ id: item.id, processDesc: desc });
        return { ...item, processDesc: desc };
      }
      return item;
    });

    if (updateIds.length > 0) {
      try {
        await Promise.all(
          updateIds.map((u) =>
            publicPrisma.pfdItem.update({
              where: { id: u.id },
              data: { processDesc: u.processDesc },
            }),
          ),
        );
      } catch {
        // DB 업데이트 실패해도 응답에는 보충된 값 반환
      }
    }

    return enriched;
  } catch (err) {
    console.error('[PFD] processDesc 자동보충 실패:', err);
    return items;
  }
}
