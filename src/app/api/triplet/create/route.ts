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
  parentFmeaId?: string;
  familyCount?: number;
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
      parentFmeaId,
      familyCount = 0,
      partCount = 0,
      immediateCP = false,
      immediatePFD = false,
    } = body;
    let { parentTripletId } = body;

    if (!subject?.trim()) {
      return NextResponse.json({ success: false, error: '문서명을 입력해주세요.' }, { status: 400 });
    }

    if ((docType === 'family' || docType === 'part') && !parentTripletId && !parentFmeaId) {
      return NextResponse.json({ success: false, error: '상위 FMEA를 선택해주세요.' }, { status: 400 });
    }

    // ★ 기존 FMEA를 부모로 선택한 경우 → 자동 TripletGroup 래핑
    if (!parentTripletId && parentFmeaId && (docType === 'family' || docType === 'part')) {
      const existingProject = await prisma.fmeaProject.findUnique({
        where: { fmeaId: parentFmeaId },
        include: { registration: true },
      });
      if (!existingProject) {
        return NextResponse.json({ success: false, error: '상위 FMEA를 찾을 수 없습니다.' }, { status: 404 });
      }
      // 이미 TripletGroup에 연결된 경우 해당 ID 사용
      if (existingProject.tripletGroupId) {
        parentTripletId = existingProject.tripletGroupId;
      } else {
        // 자동 래핑: 기존 FMEA를 감싸는 TripletGroup 생성
        const parentTypeCode = (existingProject.fmeaType || 'M').toLowerCase();
        const wrapId = `tg-wrap-${parentFmeaId}`;
        const reg = existingProject.registration;
        await prisma.tripletGroup.create({
          data: {
            id: wrapId,
            year: new Date().getFullYear().toString().slice(-2),
            typeCode: parentTypeCode,
            pfmeaId: parentFmeaId,
            cpId: null,
            pfdId: null,
            subject: reg?.subject || existingProject.fmeaId,
            productName: reg?.partName || '',
            customerName: reg?.customerName || '',
            companyName: reg?.companyName || '',
            responsibleName: reg?.fmeaResponsibleName || '',
            partNo: reg?.partNo || '',
            syncStatus: 'synced',
          },
        });
        await prisma.fmeaProject.update({
          where: { fmeaId: parentFmeaId },
          data: { tripletGroupId: wrapId },
        });
        parentTripletId = wrapId;
      }
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

    // 기존 ID 조회 (시리얼 계산용 — soft-deleted 포함, Unique 충돌 방지)
    const [pfmeaIds, cpIds, pfdIds, tgData] = await Promise.all([
      prisma.fmeaProject.findMany({
        select: { fmeaId: true },
      }).then(rows => rows.map(r => r.fmeaId)),
      prisma.cpRegistration.findMany({
        select: { cpNo: true },
      }).then(rows => rows.map(r => r.cpNo)),
      prisma.pfdRegistration.findMany({
        select: { pfdNo: true },
      }).then(rows => rows.map(r => r.pfdNo)),
      prisma.tripletGroup.findMany({
        select: { id: true, linkGroup: true },
      }),
    ]);

    const tgIds = tgData.map(r => r.id);
    const existingLinkGroups = tgData
      .map(r => r.linkGroup)
      .filter((n): n is number => n != null && n > 0);

    if (docType === 'master') {
      return await createMasterTriplet(prisma, typeCode, pfmeaIds, cpIds, pfdIds, tgIds, headerData, familyCount, existingLinkGroups);
    } else if (docType === 'family') {
      return await createFamilyTriplet(prisma, typeCode, pfmeaIds, cpIds, pfdIds, tgIds, headerData, parentTripletId!, immediateCP, immediatePFD, partCount, existingLinkGroups);
    } else {
      return await createPartTriplet(prisma, pfmeaIds, cpIds, pfdIds, tgIds, headerData, parentTripletId!, existingLinkGroups);
    }
  } catch (error) {
    console.error('[triplet/create] 오류:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

/**
 * Master Triplet: PFMEA + CP + PFD 3개 즉시 생성
 * + 하위 Family 세트 (각 Family = FMEA + CP + PFD 즉시)
 */
async function createMasterTriplet(
  prisma: NonNullable<ReturnType<typeof getPrisma>>,
  typeCode: string,
  pfmeaIds: string[],
  cpIds: string[],
  pfdIds: string[],
  tgIds: string[],
  headerData: Record<string, string>,
  familyCount: number,
  existingLinkGroups: number[]
) {
  const serials = calcMFSerials(pfmeaIds, cpIds, pfdIds, typeCode, tgIds);
  const ids = generateMFTripletIds('m', serials);

  await prisma.$transaction(async (tx) => {
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

  // 하위 Family Triplet 생성 (familyCount > 0 시)
  // 각 Family = F-FMEA + F-CP + F-PFD 즉시 생성
  const childTriplets: Array<{ tripletGroupId: string; pfmeaId: string; cpId: string | null; pfdId: string | null }> = [];
  if (familyCount > 0) {
    const updatedPfmeaIds = [...pfmeaIds, ids.pfmeaId];
    const updatedCpIds = ids.cpId ? [...cpIds, ids.cpId] : cpIds;
    const updatedPfdIds = ids.pfdId ? [...pfdIds, ids.pfdId] : pfdIds;
    const updatedTgIds = [...tgIds, ids.tripletGroupId];
    const familyBaseSerials = calcMFSerials(updatedPfmeaIds, updatedCpIds, updatedPfdIds, 'f', updatedTgIds);

    for (let i = 0; i < Math.min(familyCount, 3); i++) {
      const familySerials = {
        pfmeaSerial: familyBaseSerials.pfmeaSerial + i,
        cpSerial: familyBaseSerials.cpSerial + i,
        pfdSerial: familyBaseSerials.pfdSerial + i,
        unifiedSerial: 0,
      };
      const familyIds = generateMFTripletIds('f', familySerials);
      await createFamilyTripletShell(prisma, familyIds, ids.tripletGroupId, ids.pfmeaId, headerData, i + 1);
      childTriplets.push({
        tripletGroupId: familyIds.tripletGroupId,
        pfmeaId: familyIds.pfmeaId,
        cpId: familyIds.cpId,
        pfdId: familyIds.pfdId,
      });
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
 * Family Triplet: PFMEA + CP + PFD 3개 즉시 생성
 */
async function createFamilyTriplet(
  prisma: NonNullable<ReturnType<typeof getPrisma>>,
  typeCode: string,
  pfmeaIds: string[],
  cpIds: string[],
  pfdIds: string[],
  tgIds: string[],
  headerData: Record<string, string>,
  parentTripletId: string,
  _immediateCP: boolean,
  _immediatePFD: boolean,
  partCount: number,
  existingLinkGroups: number[]
) {
  const serials = calcMFSerials(pfmeaIds, cpIds, pfdIds, typeCode, tgIds);
  const ids = generateMFTripletIds('f', serials);

  const cpId = ids.cpId;
  const pfdId = ids.pfdId;

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
    const updatedTgIds = [...tgIds, ids.tripletGroupId];
    let nextSerial = calcPartUnifiedSerial(updatedPfmeaIds, updatedCpIds, updatedPfdIds, updatedTgIds);
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
  tgIds: string[],
  headerData: Record<string, string>,
  parentTripletId: string,
  existingLinkGroups: number[]
) {
  const unifiedSerial = calcPartUnifiedSerial(pfmeaIds, cpIds, pfdIds, tgIds);
  const nextLinkGroup = calcNextLinkGroup(existingLinkGroups);
  const ids = generatePartTripletIds(unifiedSerial, nextLinkGroup);

  const parentTriplet = await prisma.tripletGroup.findUnique({
    where: { id: parentTripletId },
    select: { pfmeaId: true, typeCode: true },
  });

  const yearStr = new Date().getFullYear().toString().slice(-2);

  await prisma.$transaction(async (tx) => {
    await tx.tripletGroup.create({
      data: {
        id: ids.tripletGroupId,
        year: yearStr,
        typeCode: 'p',
        linkGroup: nextLinkGroup,
        pfmeaId: ids.pfmeaId,
        cpId: ids.cpId,
        pfdId: ids.pfdId,
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
            linkedCpNo: ids.cpId,
            linkedPfdNo: ids.pfdId,
          },
        },
      },
    });

    if (ids.cpId) {
      await tx.cpRegistration.create({
        data: {
          cpNo: ids.cpId,
          cpType: 'P',
          fmeaId: ids.pfmeaId,
          linkedPfmeaNo: ids.pfmeaId,
          linkedPfdNo: ids.pfdId,
          tripletGroupId: ids.tripletGroupId,
          subject: headerData.subject,
          customerName: headerData.customerName,
          companyName: headerData.companyName,
          partNo: headerData.partNo,
        },
      });
    }

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

  return NextResponse.json({
    success: true,
    tripletGroupId: ids.tripletGroupId,
    pfmeaId: ids.pfmeaId,
    cpId: ids.cpId,
    pfdId: ids.pfdId,
  });
}

/**
 * Family Triplet Shell 생성 (Master의 하위 Family 일괄 생성용)
 * FMEA + CP + PFD 모두 즉시 생성
 */
async function createFamilyTripletShell(
  prisma: NonNullable<ReturnType<typeof getPrisma>>,
  ids: { tripletGroupId: string; pfmeaId: string; cpId: string | null; pfdId: string | null },
  masterTripletGroupId: string,
  masterPfmeaId: string,
  headerData: Record<string, string>,
  index: number
) {
  const yearStr = new Date().getFullYear().toString().slice(-2);

  await prisma.$transaction(async (tx) => {
    await tx.tripletGroup.create({
      data: {
        id: ids.tripletGroupId,
        year: yearStr,
        typeCode: 'f',
        pfmeaId: ids.pfmeaId,
        cpId: ids.cpId,
        pfdId: ids.pfdId,
        parentTripletId: masterTripletGroupId,
        subject: `${headerData.subject} F#${index}`,
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
        parentFmeaId: masterPfmeaId,
        parentFmeaType: 'M',
        tripletGroupId: ids.tripletGroupId,
        status: 'active',
        registration: {
          create: {
            subject: `${headerData.subject} F#${index}`,
            customerName: headerData.customerName,
            companyName: headerData.companyName,
            partNo: headerData.partNo,
            fmeaResponsibleName: headerData.responsibleName,
            linkedCpNo: ids.cpId,
            linkedPfdNo: ids.pfdId,
          },
        },
      },
    });

    if (ids.cpId) {
      await tx.cpRegistration.create({
        data: {
          cpNo: ids.cpId,
          cpType: 'F',
          fmeaId: ids.pfmeaId,
          linkedPfmeaNo: ids.pfmeaId,
          linkedPfdNo: ids.pfdId,
          tripletGroupId: ids.tripletGroupId,
          subject: `${headerData.subject} F#${index}`,
          customerName: headerData.customerName,
          companyName: headerData.companyName,
          partNo: headerData.partNo,
        },
      });
    }

    if (ids.pfdId) {
      await tx.pfdRegistration.create({
        data: {
          pfdNo: ids.pfdId,
          fmeaId: ids.pfmeaId,
          linkedPfmeaNo: ids.pfmeaId,
          linkedCpNos: ids.cpId ? JSON.stringify([ids.cpId]) : null,
          tripletGroupId: ids.tripletGroupId,
          subject: `${headerData.subject} F#${index}`,
          customerName: headerData.customerName,
          companyName: headerData.companyName,
        },
      });
    }
  });
}

/**
 * Part Triplet Shell 생성 (Family의 하위 Part 일괄 생성용)
 * FMEA + CP + PFD 모두 즉시 생성
 */
async function createPartTripletShell(
  prisma: NonNullable<ReturnType<typeof getPrisma>>,
  ids: { tripletGroupId: string; pfmeaId: string; cpId: string | null; pfdId: string | null },
  parentTripletId: string,
  headerData: Record<string, string>,
  index: number
) {
  const parentTriplet = await prisma.tripletGroup.findUnique({
    where: { id: parentTripletId },
    select: { pfmeaId: true, typeCode: true, linkGroup: true },
  });

  const lgMatch = ids.pfmeaId.match(/-i(\d{2})$/i);
  const linkGroup = lgMatch ? parseInt(lgMatch[1], 10) : null;
  const yearStr = new Date().getFullYear().toString().slice(-2);
  const subjectName = `#${index}`;

  await prisma.$transaction(async (tx) => {
    await tx.tripletGroup.create({
      data: {
        id: ids.tripletGroupId,
        year: yearStr,
        typeCode: 'p',
        linkGroup,
        pfmeaId: ids.pfmeaId,
        cpId: ids.cpId,
        pfdId: ids.pfdId,
        parentTripletId,
        subject: subjectName,
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
            subject: subjectName,
            customerName: headerData.customerName,
            companyName: headerData.companyName,
            partNo: headerData.partNo,
            fmeaResponsibleName: headerData.responsibleName,
            linkedCpNo: ids.cpId,
            linkedPfdNo: ids.pfdId,
          },
        },
      },
    });

    if (ids.cpId) {
      await tx.cpRegistration.create({
        data: {
          cpNo: ids.cpId,
          cpType: 'P',
          fmeaId: ids.pfmeaId,
          linkedPfmeaNo: ids.pfmeaId,
          linkedPfdNo: ids.pfdId,
          tripletGroupId: ids.tripletGroupId,
          subject: subjectName,
          customerName: headerData.customerName,
          companyName: headerData.companyName,
          partNo: headerData.partNo,
        },
      });
    }

    if (ids.pfdId) {
      await tx.pfdRegistration.create({
        data: {
          pfdNo: ids.pfdId,
          fmeaId: ids.pfmeaId,
          linkedPfmeaNo: ids.pfmeaId,
          linkedCpNos: ids.cpId ? JSON.stringify([ids.cpId]) : null,
          tripletGroupId: ids.tripletGroupId,
          subject: subjectName,
          customerName: headerData.customerName,
          companyName: headerData.companyName,
        },
      });
    }
  });
}
