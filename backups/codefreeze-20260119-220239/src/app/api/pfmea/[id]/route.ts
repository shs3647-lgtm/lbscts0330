/**
 * @file /api/pfmea/[id]/route.ts
 * @description PFMEA 프로젝트 데이터 조회 API (CP 연동용)
 * - GET: PFMEA ID로 공정/작업요소/특성 데이터 조회
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

interface L2Process {
  id: string;
  no: string;
  name: string;
  function: string;
  productChars: Array<{
    id: string;
    name: string;
    specialChar: string;
    severity?: number;
  }>;
  processChars: Array<{
    id: string;
    name: string;
  }>;
  workElements: Array<{
    id: string;
    name: string;
    function: string;
  }>;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패' });
  }

  const { id: fmeaId } = await params;

  try {
    // 1. L2 구조 (공정) 조회
    const l2Structures = await prisma.l2Structure.findMany({
      where: { fmeaId },
      orderBy: { order: 'asc' },  // L2는 order 필드 사용
      include: {
        l3Structures: {
          orderBy: { order: 'asc' },  // L3에는 no 필드 없음, order 사용
          include: {
            l3Functions: true,
          },
        },
        l2Functions: true,
      },
    });

    // 2. 데이터 변환 (CP 연동용)
    // L2Functions에서 제품특성, L3Functions에서 공정특성 추출
    const l2Data: L2Process[] = l2Structures.map((l2: any) => {
      // L2Functions에서 제품특성 추출
      const productChars = (l2.l2Functions || [])
        .filter((f: any) => f.productChar)
        .map((f: any) => ({
          id: f.id,
          name: f.productChar || '',
          specialChar: f.specialChar || '',
          severity: undefined,
        }));

      // L3Functions에서 공정특성 추출
      const processChars: Array<{ id: string; name: string }> = [];
      (l2.l3Structures || []).forEach((l3: any) => {
        (l3.l3Functions || []).forEach((fn: any) => {
          if (fn.processChar) {
            processChars.push({
              id: fn.id,
              name: fn.processChar || '',
            });
          }
        });
      });

      // L3 작업요소
      const workElements = (l2.l3Structures || []).map((l3: any) => ({
        id: l3.id,
        name: l3.name || '',
        function: l3.l3Functions?.[0]?.name || '',
      }));

      return {
        id: l2.id,
        no: l2.no || '',
        name: l2.name || '',
        function: l2.l2Functions?.[0]?.name || '',
        productChars,
        processChars,
        workElements,
      };
    });

    // 4. FMEA 프로젝트 기본 정보 조회 (있으면)
    let projectInfo = null;
    try {
      const apqpProject = await prisma.aPQPProject.findFirst({
        where: { id: fmeaId },
      });
      if (apqpProject) {
        projectInfo = {
          id: apqpProject.id,
          name: apqpProject.name,
          productName: apqpProject.productName,
          customerName: apqpProject.customerName,
        };
      }
    } catch (e) {
      // APQPProject가 없을 수 있음
    }

    // 5. FMEA 등록 정보 조회 (있으면)
    let fmeaRegistration = null;
    try {
      const registration = await prisma.fmeaRegistration.findFirst({
        where: { fmeaId },
      });
      if (registration) {
        fmeaRegistration = {
          id: registration.id,
          fmeaId: registration.fmeaId,
          subject: registration.subject,
          customerName: registration.customerName,
          companyName: registration.companyName,
        };
      }
    } catch (e) {
      // FmeaRegistration이 없을 수 있음
    }

    console.log(`✅ PFMEA ${fmeaId} 데이터 조회: L2 ${l2Data.length}개`);

    return NextResponse.json({
      success: true,
      data: {
        fmeaId,
        fmeaNo: fmeaRegistration?.fmeaId || fmeaId,
        subject: fmeaRegistration?.subject || '',
        customerName: fmeaRegistration?.customerName || projectInfo?.customerName || '',
        companyName: fmeaRegistration?.companyName || '',
        project: projectInfo,
        l2: l2Data,
        totalProcesses: l2Data.length,
        totalProductChars: l2Data.reduce((sum, l2) => sum + l2.productChars.length, 0),
        totalProcessChars: l2Data.reduce((sum, l2) => sum + l2.processChars.length, 0),
      },
    });

  } catch (error: any) {
    console.error('PFMEA 조회 오류:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
