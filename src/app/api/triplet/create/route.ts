/**
 * @file POST /api/triplet/create
 * @description Triplet(PFMEA+CP+PFD 세트) 생성 API
 *
 * Master: PFMEA + CP + PFD 3개 즉시 생성
 * Family: PFMEA만 즉시, CP/PFD는 Lazy (null)
 * Part:   PFMEA만 즉시, CP/PFD는 Lazy (null)
 *
 * @created 2026-03-13
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import {
  calcMFSerials,
  calcPartUnifiedSerial,
  calcNextLinkGroup,
  generateMFTripletIds,
  generatePartTripletIds,
  generateLazyDocId,
  getMaxSerial,
} from '@/lib/utils/tripletIdGenerator';
import { safeErrorMessage } from '@/lib/security';
import { hasTripletModel, tripletNotReadyErrorResponse } from '@/lib/utils/tripletGuard';

export const runtime = 'nodejs';

interface CreateTripletBody {
  docType: 'master' | 'family' | 'part';
  subject: string;
  productName?: string;
  customerName?: string;
  companyName?: string;
  responsibleName?: string;
  partNo?: string;
  parentTripletId?: string;
  partCount?: number;
  immediateCP?: boolean;
  immediatePFD?: boolean;
}

export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma || !hasTripletModel(prisma)) {
    return tripletNotReadyErrorResponse();
  }

  try {
    const body: CreateTripletBody = await request.json();
    const {
      docType,
      subject,
      productName,
      customerName,
      companyName,
      responsibleName,
      partNo,
      parentTripletId,
      partCount = 0,
      immediateCP = false,
      immediatePFD = false,
    } = body;

    if (!subject?.trim()) {
      return NextResponse.json({ success: false, error: '문서명을 입력해주세요.' }, { status: 400 });
    }

    if ((docType === 'family' || docType === 'part') && !parentTripletId) {
      return NextResponse.json({ success: false, error: '상위 Triplet을 선택해주세요.' }, { status: 400 });
    }

    const typeCode = docType === 'master' ? 'm' : docType === 'family' ? 'f' : 'p';
    const headerData = {
      subject: subject.trim(),
      productName: productName?.trim() || '',
      customerName: customerName?.trim() || '',
      companyName: companyName?.trim() || '',
      responsibleName: responsibleName?.trim() || '',
      partNo: partNo?.trim() || '',
    };

    // 기존 ID 조회 (시리얼 계산용)
    const [pfmeaIds, cpIds, pfdIds] = await Promise.all([
      prisma.fmeaProject.findMany({
        where: { deletedAt: null },
        select: { fmeaId: true },
      }).then(rows => rows.map(r => r.fmeaId)),
      prisma.cpRegistration.findMany({
        where: { deletedAt: null },
        select: { cpNo: true },
      }).then(rows => rows.map(r => r.cpNo)),
      prisma.pfdRegistration.findMany({
        where: { deletedAt: null },
        select: { pfdNo: true },
      }).then(rows => rows.map(r => r.pfdNo)),
    ]);

    // linkGroup 조회 (Part 용)
    const existingLinkGroups = await prisma.tripletGroup.findMany({
      where: { linkGroup: { not: null } },
      select: { linkGroup: true },
    }).then(rows => rows.map(r => r.linkGroup!).filter(n => n > 0));

    if (docType === 'master') {
      return await createMasterTriplet(prisma, typeCode, pfmeaIds, cpIds, pfdIds, headerData, partCount, existingLinkGroups);
    } else if (docType === 'family') {
      return await createFamilyTriplet(prisma, typeCode, pfmeaIds, cpIds, pfdIds, headerData, parentTripletId!, immediateCP, immediatePFD, partCount, existingLinkGroups);
    } else {
      return await createPartTriplet(prisma, pfmeaIds, cpIds, pfdIds, headerData, parentTripletId!, existingLinkGroups);
    }
  } catch (error) {
    console.error('[triplet/create] 오류:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

/**
 * Master Triplet: PFMEA + CP + PFD 3개 즉시 생성
 */
async function createMasterTriplet(
  prisma: NonNullable<ReturnType<typeof getPrisma>>,
  typeCode: string,
  pfmeaIds: string[],
  cpIds: string[],
  pfdIds: string[],
  headerData: Record<string, string>,
  partCount: number,
  existingLinkGroups: number[]
) {
  const serials = calcMFSerials(pfmeaIds, cpIds, pfdIds, typeCode);
  const ids = generateMFTripletIds('m', serials);

  await prisma.$transaction(async (tx) => {
    // TripletGroup 생성
    await tx.tripletGroup.create({
      data: {
        id: ids.tripletGroupId,
        year: new Date().getFullYear().toString().slice(-2),
        typeCode: 'm',
        pfmeaId: ids.pfmeaId,
        cpId: ids.cpId,
        pfdId: ids.pfdId,
        subject: headerData.subject,
        productName: headerData.productName,
        customerName: headerData.customerName,
        companyName: headerData.companyName,
        responsibleName: headerData.responsibleName,
        partNo: headerData.partNo,
        syncStatus: 'synced',
      },
    });

    // PFMEA 생성
    await tx.fmeaProject.create({
      data: {
        fmeaId: ids.pfmeaId,
        fmeaType: 'M',
        parentFmeaId: ids.pfmeaId,
        parentFmeaType: 'M',
        tripletGroupId: ids.tripletGroupId,
        status: 'active',
        registration: {
          create: {
            subject: headerData.subject,
            customerName: headerData.customerName,
            companyName: headerData.companyName,
            partNo: headerData.partNo,
            fmeaResponsibleName: headerData.responsibleName,
          },
        },
      },
    });

    // Master CP 즉시 생성
    if (ids.cpId) {
      await tx.cpRegistration.create({
        data: {
          cpNo: ids.cpId,
          cpType: 'M',
          fmeaId: ids.pfmeaId,
          linkedPfmeaNo: ids.pfmeaId,
          linkedPfdNo: ids.pfdId,
          tripletGroupId: ids.tripletGroupId,
          subject: headerData.subject,
          customerName: headerData.customerName,
          companyName: headerData.companyName,
          partNo: headerData.partNo,
          cpResponsibleName: headerData.responsibleName,
        },
      });
    }

    // Master PFD 즉시 생성
    if (ids.pfdId) {
      await tx.pfdRegistration.create({
        data: {
          pfdNo: ids.pfdId,
          fmeaId: ids.pfmeaId,
          linkedPfmeaNo: ids.pfmeaId,
          linkedCpNos: ids.cpId ? JSON.stringify([ids.cpId]) : null,
          tripletGroupId: ids.tripletGroupId,
          subject: headerData.subject,
          customerName: headerData.customerName,
          companyName: headerData.companyName,
        },
      });
    }
  });

  // 하위 Part Triplet 생성 (partCount > 0 시)
  const childTriplets: Array<{ tripletGroupId: string; pfmeaId: string }> = [];
  if (partCount > 0) {
    const updatedPfmeaIds = [...pfmeaIds, ids.pfmeaId];
    const updatedCpIds = ids.cpId ? [...cpIds, ids.cpId] : cpIds;
    const updatedPfdIds = ids.pfdId ? [...pfdIds, ids.pfdId] : pfdIds;
    let nextSerial = calcPartUnifiedSerial(updatedPfmeaIds, updatedCpIds, updatedPfdIds);
    let nextLinkGroup = calcNextLinkGroup(existingLinkGroups);

    for (let i = 0; i < Math.min(partCount, 10); i++) {
      const partIds = generatePartTripletIds(nextSerial, nextLinkGroup);
      await createPartTripletShell(prisma, partIds, ids.tripletGroupId, headerData, i + 1);
      childTriplets.push({ tripletGroupId: partIds.tripletGroupId, pfmeaId: partIds.pfmeaId });
      nextSerial++;
      nextLinkGroup++;
    }
  }

  return NextResponse.json({
    success: true,
    tripletGroupId: ids.tripletGroupId,
    pfmeaId: ids.pfmeaId,
    cpId: ids.cpId,
    pfdId: ids.pfdId,
    childTriplets,
  });
}

/**
 * Family Triplet: PFMEA만 즉시, CP/PFD는 Lazy
 */
async function createFamilyTriplet(
  prisma: NonNullable<ReturnType<typeof getPrisma>>,
  typeCode: string,
  pfmeaIds: string[],
  cpIds: string[],
  pfdIds: string[],
  headerData: Record<string, string>,
  parentTripletId: string,
  immediateCP: boolean,
  immediatePFD: boolean,
  partCount: number,
  existingLinkGroups: number[]
) {
  const serials = calcMFSerials(pfmeaIds, cpIds, pfdIds, typeCode);
  const ids = generateMFTripletIds('f', serials);

  // Lazy: 기본 null, 체크하면 즉시 생성
  const cpId = immediateCP ? ids.cpId : null;
  const pfdId = immediatePFD ? ids.pfdId : null;

  // 상위 PFMEA ID 조회 (parentFmeaId로 사용)
  const parentTriplet = await prisma.tripletGroup.findUnique({
    where: { id: parentTripletId },
    select: { pfmeaId: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.tripletGroup.create({
      data: {
        id: ids.tripletGroupId,
        year: new Date().getFullYear().toString().slice(-2),
        typeCode: 'f',
        pfmeaId: ids.pfmeaId,
        cpId,
        pfdId,
        parentTripletId,
        subject: headerData.subject,
        productName: headerData.productName,
        customerName: headerData.customerName,
        companyName: headerData.companyName,
        responsibleName: headerData.responsibleName,
        partNo: headerData.partNo,
        syncStatus: 'synced',
      },
    });

    await tx.fmeaProject.create({
      data: {
        fmeaId: ids.pfmeaId,
        fmeaType: 'F',
        parentFmeaId: parentTriplet?.pfmeaId || null,
        parentFmeaType: 'M',
        tripletGroupId: ids.tripletGroupId,
        status: 'active',
        registration: {
          create: {
            subject: headerData.subject,
            customerName: headerData.customerName,
            companyName: headerData.companyName,
            partNo: headerData.partNo,
            fmeaResponsibleName: headerData.responsibleName,
            linkedCpNo: cpId,
            linkedPfdNo: pfdId,
          },
        },
      },
    });

    if (cpId) {
      await tx.cpRegistration.create({
        data: {
          cpNo: cpId,
          cpType: 'F',
          fmeaId: ids.pfmeaId,
          linkedPfmeaNo: ids.pfmeaId,
          linkedPfdNo: pfdId,
          tripletGroupId: ids.tripletGroupId,
          subject: headerData.subject,
          customerName: headerData.customerName,
          companyName: headerData.companyName,
          partNo: headerData.partNo,
        },
      });
    }

    if (pfdId) {
      await tx.pfdRegistration.create({
        data: {
          pfdNo: pfdId,
          fmeaId: ids.pfmeaId,
          linkedPfmeaNo: ids.pfmeaId,
          linkedCpNos: cpId ? JSON.stringify([cpId]) : null,
          tripletGroupId: ids.tripletGroupId,
          subject: headerData.subject,
          customerName: headerData.customerName,
          companyName: headerData.companyName,
        },
      });
    }
  });

  // 하위 Part 생성
  const childTriplets: Array<{ tripletGroupId: string; pfmeaId: string }> = [];
  if (partCount > 0) {
    const updatedPfmeaIds = [...pfmeaIds, ids.pfmeaId];
    const updatedCpIds = cpId ? [...cpIds, cpId] : cpIds;
    const updatedPfdIds = pfdId ? [...pfdIds, pfdId] : pfdIds;
    let nextSerial = calcPartUnifiedSerial(updatedPfmeaIds, updatedCpIds, updatedPfdIds);
    let nextLinkGroup = calcNextLinkGroup(existingLinkGroups);

    for (let i = 0; i < Math.min(partCount, 10); i++) {
      const partIds = generatePartTripletIds(nextSerial, nextLinkGroup);
      await createPartTripletShell(prisma, partIds, ids.tripletGroupId, headerData, i + 1);
      childTriplets.push({ tripletGroupId: partIds.tripletGroupId, pfmeaId: partIds.pfmeaId });
      nextSerial++;
      nextLinkGroup++;
    }
  }

  return NextResponse.json({
    success: true,
    tripletGroupId: ids.tripletGroupId,
    pfmeaId: ids.pfmeaId,
    cpId,
    pfdId,
    childTriplets,
  });
}

/**
 * Part Triplet: PFMEA만 즉시, CP/PFD Lazy
 */
async function createPartTriplet(
  prisma: NonNullable<ReturnType<typeof getPrisma>>,
  pfmeaIds: string[],
  cpIds: string[],
  pfdIds: string[],
  headerData: Record<string, string>,
  parentTripletId: string,
  existingLinkGroups: number[]
) {
  const unifiedSerial = calcPartUnifiedSerial(pfmeaIds, cpIds, pfdIds);
  const nextLinkGroup = calcNextLinkGroup(existingLinkGroups);
  const ids = generatePartTripletIds(unifiedSerial, nextLinkGroup);

  const parentTriplet = await prisma.tripletGroup.findUnique({
    where: { id: parentTripletId },
    select: { pfmeaId: true, typeCode: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.tripletGroup.create({
      data: {
        id: ids.tripletGroupId,
        year: new Date().getFullYear().toString().slice(-2),
        typeCode: 'p',
        linkGroup: nextLinkGroup,
        pfmeaId: ids.pfmeaId,
        cpId: null,
        pfdId: null,
        parentTripletId,
        subject: headerData.subject,
        productName: headerData.productName,
        customerName: headerData.customerName,
        companyName: headerData.companyName,
        responsibleName: headerData.responsibleName,
        partNo: headerData.partNo,
        syncStatus: 'synced',
      },
    });

    await tx.fmeaProject.create({
      data: {
        fmeaId: ids.pfmeaId,
        fmeaType: 'P',
        parentFmeaId: parentTriplet?.pfmeaId || null,
        parentFmeaType: parentTriplet?.typeCode?.toUpperCase() || null,
        tripletGroupId: ids.tripletGroupId,
        status: 'active',
        registration: {
          create: {
            subject: headerData.subject,
            customerName: headerData.customerName,
            companyName: headerData.companyName,
            partNo: headerData.partNo,
            fmeaResponsibleName: headerData.responsibleName,
          },
        },
      },
    });
  });

  return NextResponse.json({
    success: true,
    tripletGroupId: ids.tripletGroupId,
    pfmeaId: ids.pfmeaId,
    cpId: null,
    pfdId: null,
  });
}

/**
 * Part Triplet Shell 생성 (M/F의 하위 Part 일괄 생성용)
 * PFMEA만 즉시, CP/PFD는 Lazy
 */
async function createPartTripletShell(
  prisma: NonNullable<ReturnType<typeof getPrisma>>,
  ids: { tripletGroupId: string; pfmeaId: string },
  parentTripletId: string,
  headerData: Record<string, string>,
  index: number
) {
  const parentTriplet = await prisma.tripletGroup.findUnique({
    where: { id: parentTripletId },
    select: { pfmeaId: true, typeCode: true, linkGroup: true },
  });

  // linkGroup 추출 (pfmeaId에서)
  const lgMatch = ids.pfmeaId.match(/-i(\d{2})$/i);
  const linkGroup = lgMatch ? parseInt(lgMatch[1], 10) : null;

  await prisma.$transaction(async (tx) => {
    await tx.tripletGroup.create({
      data: {
        id: ids.tripletGroupId,
        year: new Date().getFullYear().toString().slice(-2),
        typeCode: 'p',
        linkGroup,
        pfmeaId: ids.pfmeaId,
        cpId: null,
        pfdId: null,
        parentTripletId,
        subject: `${headerData.subject} #${index}`,
        productName: headerData.productName,
        customerName: headerData.customerName,
        companyName: headerData.companyName,
        responsibleName: headerData.responsibleName,
        partNo: headerData.partNo,
        syncStatus: 'synced',
      },
    });

    await tx.fmeaProject.create({
      data: {
        fmeaId: ids.pfmeaId,
        fmeaType: 'P',
        parentFmeaId: parentTriplet?.pfmeaId || null,
        parentFmeaType: parentTriplet?.typeCode?.toUpperCase() || null,
        tripletGroupId: ids.tripletGroupId,
        status: 'active',
        registration: {
          create: {
            subject: `${headerData.subject} #${index}`,
            customerName: headerData.customerName,
            companyName: headerData.companyName,
            partNo: headerData.partNo,
            fmeaResponsibleName: headerData.responsibleName,
          },
        },
      },
    });
  });
}
