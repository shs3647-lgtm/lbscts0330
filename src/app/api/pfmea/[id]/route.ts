/**
 * @file /api/pfmea/[id]/route.ts
 * @description PFMEA 프로젝트 데이터 조회 API (CP 연동용)
 * - GET: PFMEA ID로 공정/작업요소/특성 데이터 조회
 * 
 * ★★★ 2026-02-05: fmeaId 소문자 정규화 적용 ★★★
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma, getPrismaForSchema, getBaseDatabaseUrl } from '@/lib/prisma';
import { getProjectSchemaName, ensureProjectSchemaReady } from '@/lib/project-schema';
import { normalizeFmeaId } from '@/lib/constants';

export const runtime = 'nodejs';

interface L2Process {
  id: string;
  no: string;
  name: string;
  function: string;
  // ★★★ 2026-02-05: 원자성 필드 추가 ★★★
  rowIndex?: number;
  colIndex?: number;
  parentId?: string;
  mergeGroupId?: string;
  rowSpan?: number;
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
    m4?: string;
    function: string;
    rowIndex?: number;
    colIndex?: number;
    parentId?: string;
  }>;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ★★★ 2026-02-05: fmeaId 소문자 정규화 ★★★
  const fmeaId = normalizeFmeaId(id) || id;

  // ★★★ 2026-03-25: 프로젝트 스키마 전용 — public 폴백 금지 (Rule 0.8.1) ★★★
  // 이전: getPrisma() → public 스키마 조회 → 데이터 없음 (프로젝트 스키마에 저장됨)
  // 수정: getPrismaForSchema(getProjectSchemaName(fmeaId)) → 프로젝트 스키마 조회
  const schema = getProjectSchemaName(fmeaId);
  await ensureProjectSchemaReady({ baseDatabaseUrl: getBaseDatabaseUrl(), schema });
  const prisma = getPrismaForSchema(schema);
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
  }

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
      // ★★★ 2026-02-05: 원자성 필드 포함 ★★★
      const workElements = (l2.l3Structures || []).map((l3: any) => ({
        id: l3.id,
        name: l3.name || '',
        m4: l3.m4 || l3.fourM || '',  // ★ 4M 필드 추가
        function: l3.l3Functions?.[0]?.functionName || l3.l3Functions?.[0]?.name || '',
        rowIndex: l3.rowIndex,
        colIndex: l3.colIndex,
        parentId: l3.parentId,
        mergeGroupId: l3.mergeGroupId,
        rowSpan: l3.rowSpan,
      }));

      return {
        id: l2.id,
        no: l2.no || '',
        name: l2.name || '',
        function: l2.l2Functions?.[0]?.functionName || l2.l2Functions?.[0]?.name || '',
        // ★★★ 2026-02-05: 원자성 필드 추가 ★★★
        rowIndex: l2.rowIndex,
        colIndex: l2.colIndex,
        parentId: l2.parentId,
        mergeGroupId: l2.mergeGroupId,
        rowSpan: l2.rowSpan,
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

    // 5. FMEA 등록 정보 — public + 프로젝트 스키마 병합 (연동 ID는 프로젝트에만 있을 수 있음)
    let fmeaRegistration: {
      id: string;
      fmeaId: string;
      subject: string | null;
      customerName: string | null;
      companyName: string | null;
      linkedCpNo: string | null;
      linkedPfdNo: string | null;
      linkedDfmeaNo: string | null;
    } | null = null;
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
          linkedCpNo: registration.linkedCpNo,
          linkedPfdNo: registration.linkedPfdNo,
          linkedDfmeaNo: registration.linkedDfmeaNo,
        };
      }
    } catch (e) {
      // ignore
    }

    try {
      const baseUrl = getBaseDatabaseUrl();
      if (baseUrl) {
        const schema = getProjectSchemaName(fmeaId);
        await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
        const proj = getPrismaForSchema(schema);
        if (proj) {
          const regP = await proj.fmeaRegistration.findFirst({ where: { fmeaId } });
          if (regP) {
            fmeaRegistration = {
              id: fmeaRegistration?.id || regP.id,
              fmeaId: regP.fmeaId,
              subject: fmeaRegistration?.subject ?? regP.subject,
              customerName: fmeaRegistration?.customerName ?? regP.customerName,
              companyName: fmeaRegistration?.companyName ?? regP.companyName,
              linkedCpNo: fmeaRegistration?.linkedCpNo || regP.linkedCpNo || null,
              linkedPfdNo: fmeaRegistration?.linkedPfdNo || regP.linkedPfdNo || null,
              linkedDfmeaNo: fmeaRegistration?.linkedDfmeaNo || regP.linkedDfmeaNo || null,
            };
          }
        }
      }
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      success: true,
      data: {
        fmeaId,
        fmeaNo: fmeaRegistration?.fmeaId || fmeaId,
        subject: fmeaRegistration?.subject || '',
        customerName: fmeaRegistration?.customerName || projectInfo?.customerName || '',
        companyName: fmeaRegistration?.companyName || '',
        // ★★★ 연동 ID 추가 ★★★
        linkedCpNo: fmeaRegistration?.linkedCpNo || null,
        linkedPfdNo: fmeaRegistration?.linkedPfdNo || null,
        linkedDfmeaNo: fmeaRegistration?.linkedDfmeaNo || null,
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
    }, { status: 500 });
  }
}
