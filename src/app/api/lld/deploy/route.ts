/**
 * @file /api/lld/deploy/route.ts
 * @description LLD(필터코드) 수평전개 API
 * 유사제품의 LLD를 다른 FMEA/제품에 복사 적용
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

// POST: 수평전개 — 소스 제품의 LLD를 대상 제품으로 복사
export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'DB 연결 실패' },
        { status: 500 }
      );
    }

    const { sourceProductName, targetProductName, targetFmeaId, processNames } = await request.json();

    if (!sourceProductName || !targetProductName) {
      return NextResponse.json(
        { success: false, error: 'sourceProductName, targetProductName 필수' },
        { status: 400 }
      );
    }

    // 소스 제품의 LLD 조회
    const where: Record<string, unknown> = {
      productName: sourceProductName,
      status: 'G', // 완료 상태만 전개
    };

    // 특정 공정명만 전개하는 경우
    if (processNames && Array.isArray(processNames) && processNames.length > 0) {
      where.processName = { in: processNames };
    }

    const sourceLlds = await prisma.lLDFilterCode.findMany({ where });

    if (sourceLlds.length === 0) {
      return NextResponse.json({
        success: false,
        error: `${sourceProductName}에 전개 가능한 LLD가 없습니다. (완료 상태만 전개 가능)`,
      });
    }

    // 기존 대상 제품 LLD 번호 최대값 조회 (번호 충돌 방지)
    const existingMax = await prisma.lLDFilterCode.findFirst({
      where: { productName: targetProductName },
      orderBy: { lldNo: 'desc' },
      select: { lldNo: true },
    });

    // LLD 번호 생성: LLD{YY}-{NNN} 형식
    const year = new Date().getFullYear().toString().slice(2);
    let nextNum = 1;
    if (existingMax?.lldNo) {
      const match = existingMax.lldNo.match(/LLD\d{2}-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }

    // 복사 생성
    const created = await prisma.$transaction(
      sourceLlds.map((src, idx) =>
        prisma.lLDFilterCode.create({
          data: {
            lldNo: `LLD${year}-${String(nextNum + idx).padStart(3, '0')}`,
            classification: src.classification,
            applyTo: src.applyTo,
            processNo: src.processNo,
            processName: src.processName,
            productName: targetProductName,
            failureMode: src.failureMode,
            cause: src.cause,
            occurrence: src.occurrence,
            detection: src.detection,
            improvement: src.improvement,
            vehicle: src.vehicle,
            target: src.target,
            m4Category: src.m4Category,
            location: src.location,
            status: 'R', // 전개 후 미완료로 시작
            sourceType: 'manual',
            priority: src.priority,
            fmeaId: targetFmeaId || null,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `${created.length}건 수평전개 완료 (${sourceProductName} → ${targetProductName})`,
      count: created.length,
      deployedLldNos: created.map(c => c.lldNo),
    });
  } catch (error) {
    console.error('[LLD Deploy API] 오류:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}

// GET: 수평전개 가능 목록 조회
export async function GET(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'DB 연결 실패', products: [] },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(request.url);
    const processName = searchParams.get('processName');

    // 공정명 기준으로 전개 가능한 제품 목록
    const where: Record<string, unknown> = { status: 'G' };
    if (processName) where.processName = { contains: processName };

    const items = await prisma.lLDFilterCode.findMany({
      where,
      select: { productName: true, processName: true, processNo: true },
      distinct: ['productName', 'processName'],
      orderBy: [{ productName: 'asc' }, { processName: 'asc' }],
    });

    // 제품별 그룹핑
    const products = new Map<string, string[]>();
    for (const item of items) {
      const existing = products.get(item.productName) || [];
      existing.push(item.processName);
      products.set(item.productName, existing);
    }

    return NextResponse.json({
      success: true,
      products: Array.from(products.entries()).map(([name, processes]) => ({
        productName: name,
        processNames: [...new Set(processes)],
        count: processes.length,
      })),
    });
  } catch (error) {
    console.error('[LLD Deploy API] GET 오류:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error), products: [] },
      { status: 200 }
    );
  }
}
