/**
 * APQP 프로젝트 API — 경량 컨테이너 (DFMEA/PFMEA/CP/PFD 상위 프로젝트)
 *
 * GET  /api/apqp            — 전체 APQP 목록
 * GET  /api/apqp?apqpNo=xxx — 단일 조회
 * POST /api/apqp            — 생성/업데이트 (upsert)
 * PUT  /api/apqp            — 수정
 * DELETE /api/apqp?apqpNo=xxx — Soft Delete
 *
 * @created 2026-04-03 (SDD_FMEA 벤치마크)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// ============ GET ============
export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ success: false, error: 'DB not configured' }, { status: 500 });

  const apqpNo = request.nextUrl.searchParams.get('apqpNo');

  try {
    if (apqpNo) {
      // 단일 조회
      const apqp = await prisma.apqpRegistration.findFirst({
        where: { apqpNo: { equals: apqpNo, mode: 'insensitive' }, deletedAt: null },
        include: {
          cftMembers: { orderBy: { seq: 'asc' } },
          revisions: { orderBy: { createdAt: 'desc' } },
        },
      });
      if (!apqp) return NextResponse.json({ success: false, error: 'APQP 프로젝트를 찾을 수 없습니다.' }, { status: 404 });

      // ProjectLinkage 연동 정보
      const linkage = await prisma.projectLinkage.findFirst({
        where: { apqpNo: apqpNo.toLowerCase(), status: 'active' },
        orderBy: { updatedAt: 'desc' },
      });

      return NextResponse.json({
        success: true,
        apqp: {
          ...apqp,
          linkedFmea: linkage?.pfmeaId || (apqp as any).linkedFmea || null,
          linkedDfmea: linkage?.dfmeaId || (apqp as any).linkedDfmea || null,
          linkedCp: linkage?.cpNo || (apqp as any).linkedCp || null,
          linkedPfd: linkage?.pfdNo || (apqp as any).linkedPfd || null,
        },
      });
    }

    // 전체 목록
    const apqps = await prisma.apqpRegistration.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { cftMembers: { where: { role: '팀장' }, take: 1 } },
    });

    return NextResponse.json({
      success: true,
      apqps: apqps.map((a) => ({
        id: a.id,
        apqpNo: a.apqpNo,
        subject: a.subject,
        productName: a.productName,
        customerName: a.customerName,
        companyName: a.companyName,
        modelYear: a.modelYear,
        status: a.status,
        linkedFmea: (a as any).linkedFmea,
        linkedDfmea: (a as any).linkedDfmea,
        linkedCp: (a as any).linkedCp,
        linkedPfd: (a as any).linkedPfd,
        partNo: a.partNo,
        apqpResponsibleName: a.apqpResponsibleName,
        leader: a.cftMembers[0]?.name || '',
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('[APQP API] GET 오류:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============ POST ============
export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ success: false, error: 'DB not configured' }, { status: 500 });

  try {
    const body = await request.json();
    let { apqpNo } = body;
    const { apqpInfo, cftMembers, linkedFmea, linkedDfmea, linkedCp, linkedPfd } = body;

    if (!apqpInfo) return NextResponse.json({ success: false, error: '필수 정보가 누락되었습니다.' }, { status: 400 });

    // apqpNo 자동 생성
    if (!apqpNo) {
      const year = new Date().getFullYear().toString().slice(-2);
      const prefix = `pj${year}-`;
      const allApqps = await prisma.apqpRegistration.findMany({
        where: { apqpNo: { startsWith: prefix } },
        select: { apqpNo: true },
      });
      const allNums = new Set(allApqps.map((a) => {
        const m = a.apqpNo.match(/(\d{3})$/);
        return m ? parseInt(m[1]) : 0;
      }).filter((n) => n > 0));
      let nextNum = 1;
      while (allNums.has(nextNum)) nextNum++;
      apqpNo = `${prefix}${nextNum.toString().padStart(3, '0')}`;
    }

    // Upsert
    const existing = await prisma.apqpRegistration.findFirst({
      where: { apqpNo: { equals: apqpNo, mode: 'insensitive' } },
    });

    if (existing) {
      await prisma.apqpRegistration.update({
        where: { apqpNo: existing.apqpNo },
        data: {
          companyName: apqpInfo.companyName || null,
          customerName: apqpInfo.customerName || null,
          modelYear: apqpInfo.modelYear || null,
          subject: apqpInfo.subject || null,
          productName: apqpInfo.productName || apqpInfo.subject || null,
          partNo: apqpInfo.partNo || null,
          apqpResponsibleName: apqpInfo.apqpResponsibleName || null,
          engineeringLocation: apqpInfo.engineeringLocation || null,
          linkedFmea: linkedFmea || (existing as any).linkedFmea || null,
          linkedDfmea: linkedDfmea || (existing as any).linkedDfmea || null,
          linkedCp: linkedCp || (existing as any).linkedCp || null,
          linkedPfd: linkedPfd || (existing as any).linkedPfd || null,
          deletedAt: null,
        },
      });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.apqpRegistration.create({
          data: {
            apqpNo,
            companyName: apqpInfo.companyName || null,
            customerName: apqpInfo.customerName || null,
            modelYear: apqpInfo.modelYear || null,
            subject: apqpInfo.subject || null,
            productName: apqpInfo.productName || apqpInfo.subject || null,
            partNo: apqpInfo.partNo || null,
            apqpResponsibleName: apqpInfo.apqpResponsibleName || null,
            engineeringLocation: apqpInfo.engineeringLocation || null,
            status: 'planning',
            linkedFmea: linkedFmea || null,
            linkedDfmea: linkedDfmea || null,
            linkedCp: linkedCp || null,
            linkedPfd: linkedPfd || null,
          },
        });
        await tx.apqpRevision.create({
          data: {
            apqpNo,
            revNo: 'Rev.00',
            revDate: new Date().toISOString().split('T')[0],
            description: '최초 등록',
            author: apqpInfo.apqpResponsibleName || null,
          },
        });
        // CFT 멤버
        if (cftMembers?.length > 0) {
          const valid = cftMembers.filter((m: any) => m.name?.trim());
          if (valid.length > 0) {
            await tx.apqpCftMember.createMany({
              data: valid.map((m: any, i: number) => ({
                apqpNo, seq: i + 1,
                role: m.role || null, factory: m.factory || null,
                department: m.department || null, name: m.name || null,
                position: m.position || null, phone: m.phone || null,
                email: m.email || null, remark: m.remark || null,
              })),
            });
          }
        }
      });
    }

    // ProjectLinkage 동기화
    try {
      const linkageData = {
        companyName: apqpInfo.companyName || null,
        customerName: apqpInfo.customerName || null,
        modelYear: apqpInfo.modelYear || null,
        subject: apqpInfo.subject || null,
        projectName: apqpInfo.subject || null,
        partNo: apqpInfo.partNo || null,
        pfmeaId: linkedFmea || null,
        dfmeaId: linkedDfmea || null,
        cpNo: linkedCp || null,
        pfdNo: linkedPfd || null,
      };
      const existingLink = await prisma.projectLinkage.findFirst({ where: { apqpNo: apqpNo.toLowerCase() } });
      if (existingLink) {
        await prisma.projectLinkage.update({ where: { id: existingLink.id }, data: linkageData });
      } else {
        await prisma.projectLinkage.create({ data: { apqpNo: apqpNo.toLowerCase(), ...linkageData, status: 'active', linkType: 'auto' } });
      }
    } catch (e) { console.error('ProjectLinkage sync failed:', e); }

    return NextResponse.json({ success: true, apqpNo });
  } catch (error: any) {
    console.error('[APQP API] POST 오류:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============ PUT ============
export async function PUT(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ success: false, error: 'DB not configured' }, { status: 500 });

  try {
    const body = await request.json();
    const { apqpNo, apqpInfo, linkedFmea, linkedDfmea, linkedCp, linkedPfd } = body;
    if (!apqpNo) return NextResponse.json({ success: false, error: 'APQP 번호가 필요합니다.' }, { status: 400 });

    const existing = await prisma.apqpRegistration.findFirst({
      where: { apqpNo: { equals: apqpNo, mode: 'insensitive' }, deletedAt: null },
    });
    if (!existing) return NextResponse.json({ success: false, error: 'APQP 프로젝트를 찾을 수 없습니다.' }, { status: 404 });

    await prisma.apqpRegistration.update({
      where: { apqpNo: existing.apqpNo },
      data: {
        companyName: apqpInfo?.companyName,
        customerName: apqpInfo?.customerName,
        modelYear: apqpInfo?.modelYear,
        subject: apqpInfo?.subject,
        productName: apqpInfo?.productName || apqpInfo?.subject,
        partNo: apqpInfo?.partNo,
        apqpResponsibleName: apqpInfo?.apqpResponsibleName,
        engineeringLocation: apqpInfo?.engineeringLocation,
        linkedFmea: linkedFmea || null,
        linkedDfmea: linkedDfmea || null,
        linkedCp: linkedCp || null,
        linkedPfd: linkedPfd || null,
      },
    });

    return NextResponse.json({ success: true, apqpNo: existing.apqpNo });
  } catch (error: any) {
    console.error('[APQP API] PUT 오류:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============ DELETE ============
export async function DELETE(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ success: false, error: 'DB not configured' }, { status: 500 });

  const apqpNo = request.nextUrl.searchParams.get('apqpNo');
  if (!apqpNo) return NextResponse.json({ success: false, error: 'APQP 번호가 필요합니다.' }, { status: 400 });

  try {
    const existing = await prisma.apqpRegistration.findFirst({
      where: { apqpNo: { equals: apqpNo, mode: 'insensitive' } },
    });
    if (!existing) return NextResponse.json({ success: false, error: 'APQP 프로젝트를 찾을 수 없습니다.' }, { status: 404 });

    await prisma.apqpRegistration.update({
      where: { apqpNo: existing.apqpNo },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true, message: 'APQP 프로젝트가 삭제되었습니다.' });
  } catch (error: any) {
    console.error('[APQP API] DELETE 오류:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
