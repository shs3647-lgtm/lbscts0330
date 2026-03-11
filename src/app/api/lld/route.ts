/**
 * @file /api/lld/route.ts
 * @description LLD(필터코드) 통합 API — CRUD + 필터 조회
 * 정확 매칭: processNo + processName + productName
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

// 허용 분류값
const VALID_CLASSIFICATIONS = ['RMA', 'ABN', 'CIP', 'ECN', 'FieldIssue', 'DevIssue'] as const;
const VALID_APPLY_TO = ['prevention', 'detection'] as const;

// GET: LLD 목록 조회 (필터 지원)
export async function GET(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'DB 연결 실패', items: [] },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(request.url);
    const classification = searchParams.get('classification');
    const applyTo = searchParams.get('applyTo');
    const processNo = searchParams.get('processNo');
    const processName = searchParams.get('processName');
    const productName = searchParams.get('productName');
    const status = searchParams.get('status');
    const fmeaId = searchParams.get('fmeaId');

    // 동적 WHERE 조건 구성
    const where: Record<string, unknown> = {};
    if (classification) where.classification = classification;
    if (applyTo) where.applyTo = applyTo;
    if (processNo) where.processNo = processNo;
    if (processName) where.processName = { contains: processName };
    if (productName) where.productName = { contains: productName };
    if (status) where.status = status;
    if (fmeaId) where.fmeaId = fmeaId;

    const items = await prisma.lLDFilterCode.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { lldNo: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      items,
      count: items.length,
    }, {
      headers: { 'Cache-Control': 'no-cache' },
    });
  } catch (error) {
    console.error('[LLD API] GET 오류:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error), items: [] },
      { status: 200 }
    );
  }
}

// POST: LLD 저장 (일괄 upsert)
export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'DB 연결 실패' },
        { status: 200 }
      );
    }

    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: '저장할 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    // 입력 검증
    for (const item of items) {
      if (!item.lldNo || !item.processNo || !item.processName || !item.productName) {
        return NextResponse.json(
          { success: false, error: `필수 필드 누락: lldNo, processNo, processName, productName (${item.lldNo || 'unknown'})` },
          { status: 400 }
        );
      }
      if (!item.classification || !VALID_CLASSIFICATIONS.includes(item.classification)) {
        return NextResponse.json(
          { success: false, error: `잘못된 구분값: ${item.classification} (허용: ${VALID_CLASSIFICATIONS.join(', ')})` },
          { status: 400 }
        );
      }
      if (!item.applyTo || !VALID_APPLY_TO.includes(item.applyTo)) {
        return NextResponse.json(
          { success: false, error: `잘못된 적용대상: ${item.applyTo} (허용: ${VALID_APPLY_TO.join(', ')})` },
          { status: 400 }
        );
      }
    }

    const results = await prisma.$transaction(
      items.map((item: {
        lldNo: string;
        classification: string;
        applyTo: string;
        processNo: string;
        processName: string;
        productName: string;
        failureMode: string;
        cause: string;
        occurrence?: number;
        detection?: number;
        improvement: string;
        vehicle?: string;
        target?: string;
        m4Category?: string;
        location?: string;
        completedDate?: string;
        status?: string;
        sourceType?: string;
        priority?: number;
        fmeaId?: string;
        appliedDate?: string;
      }) =>
        prisma.lLDFilterCode.upsert({
          where: { lldNo: item.lldNo },
          update: {
            classification: item.classification,
            applyTo: item.applyTo,
            processNo: item.processNo,
            processName: item.processName,
            productName: item.productName,
            failureMode: item.failureMode || '',
            cause: item.cause || '',
            occurrence: item.occurrence ?? null,
            detection: item.detection ?? null,
            improvement: item.improvement || '',
            vehicle: item.vehicle || '',
            target: item.target || '제조',
            m4Category: item.m4Category || null,
            location: item.location || null,
            completedDate: item.completedDate || null,
            status: item.status || 'R',
            sourceType: item.sourceType || 'manual',
            priority: item.priority ?? 0,
            fmeaId: item.fmeaId || null,
            appliedDate: item.appliedDate || null,
          },
          create: {
            lldNo: item.lldNo,
            classification: item.classification,
            applyTo: item.applyTo,
            processNo: item.processNo,
            processName: item.processName,
            productName: item.productName,
            failureMode: item.failureMode || '',
            cause: item.cause || '',
            occurrence: item.occurrence ?? null,
            detection: item.detection ?? null,
            improvement: item.improvement || '',
            vehicle: item.vehicle || '',
            target: item.target || '제조',
            m4Category: item.m4Category || null,
            location: item.location || null,
            completedDate: item.completedDate || null,
            status: item.status || 'R',
            sourceType: item.sourceType || 'manual',
            priority: item.priority ?? 0,
            fmeaId: item.fmeaId || null,
            appliedDate: item.appliedDate || null,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      count: results.length,
      message: `${results.length}건 저장 완료`,
    });
  } catch (error) {
    console.error('[LLD API] POST 오류:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 200 }
    );
  }
}

// DELETE: LLD 삭제
export async function DELETE(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'DB 연결 실패' },
        { status: 500 }
      );
    }

    const { lldNo, ids } = await request.json();

    if (lldNo) {
      await prisma.lLDFilterCode.delete({ where: { lldNo } });
      return NextResponse.json({ success: true, message: `${lldNo} 삭제 완료` });
    }

    if (ids && Array.isArray(ids) && ids.length > 0) {
      const result = await prisma.lLDFilterCode.deleteMany({
        where: { id: { in: ids } },
      });
      return NextResponse.json({ success: true, message: `${result.count}건 삭제 완료` });
    }

    return NextResponse.json(
      { success: false, error: 'lldNo 또는 ids 필요' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[LLD API] DELETE 오류:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
