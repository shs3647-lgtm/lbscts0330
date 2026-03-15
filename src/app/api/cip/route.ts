/**
 * @file route.ts
 * @description CIP (Continuous Improvement Plan) API
 * - GET: CIP 목록 조회 (fmeaId 필터 가능)
 * - POST: CIP 항목 생성
 * - PUT: CIP 항목 수정
 * - DELETE: CIP 항목 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

/** CIP No 자동 생성: CIP{YY}-{NNN} */
async function generateCipNo(prisma: any): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `CIP${year}-`;

  const latest = await prisma.continuousImprovementPlan.findFirst({
    where: { cipNo: { startsWith: prefix } },
    orderBy: { cipNo: 'desc' },
  });

  if (!latest) return `${prefix}001`;

  const lastNum = parseInt(latest.cipNo.replace(prefix, ''), 10) || 0;
  return `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
}

// GET: CIP 목록 조회
export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured', items: [] }, { status: 500 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const fmeaId = searchParams.get('fmeaId');

    const where = fmeaId ? { fmeaId } : {};

    const items = await prisma.continuousImprovementPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, items });
  } catch (error: unknown) {
    console.error('[CIP] GET error:', safeErrorMessage(error));
    return NextResponse.json({ success: false, error: safeErrorMessage(error), items: [] }, { status: 500 });
  }
}

// POST: CIP 항목 생성 (단건 또는 일괄)
export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();

    // 일괄 저장 (items 배열)
    if (body.items && Array.isArray(body.items)) {
      const items = body.items as Array<Record<string, unknown>>;
      if (items.length === 0) {
        return NextResponse.json({ success: false, error: '저장할 데이터가 없습니다.' }, { status: 400 });
      }

      const results = [];
      for (const item of items) {
        const cipNo = (item.cipNo as string) || await generateCipNo(prisma);
        const fmeaId = item.fmeaId as string | null;

        if (fmeaId && !isValidFmeaId(fmeaId)) {
          return NextResponse.json({ success: false, error: `Invalid fmeaId: ${fmeaId}` }, { status: 400 });
        }

        const created = await prisma.continuousImprovementPlan.upsert({
          where: { cipNo },
          update: {
            fmeaId: fmeaId || null,
            apLevel: (item.apLevel as string) || null,
            category: (item.category as string) || '',
            failureMode: (item.failureMode as string) || '',
            cause: (item.cause as string) || '',
            improvement: (item.improvement as string) || '',
            responsible: (item.responsible as string) || null,
            targetDate: (item.targetDate as string) || null,
            completedDate: (item.completedDate as string) || null,
            status: (item.status as string) || 'R',
            s: item.s != null ? Number(item.s) : null,
            o: item.o != null ? Number(item.o) : null,
            d: item.d != null ? Number(item.d) : null,
          },
          create: {
            cipNo,
            fmeaId: fmeaId || null,
            apLevel: (item.apLevel as string) || null,
            category: (item.category as string) || '',
            failureMode: (item.failureMode as string) || '',
            cause: (item.cause as string) || '',
            improvement: (item.improvement as string) || '',
            responsible: (item.responsible as string) || null,
            targetDate: (item.targetDate as string) || null,
            completedDate: (item.completedDate as string) || null,
            status: (item.status as string) || 'R',
            s: item.s != null ? Number(item.s) : null,
            o: item.o != null ? Number(item.o) : null,
            d: item.d != null ? Number(item.d) : null,
          },
        });
        results.push(created);
      }

      return NextResponse.json({ success: true, count: results.length, message: `${results.length}건 저장 완료` });
    }

    // 단건 저장 (기존 호환)
    const { fmeaId, uniqueKey, apLevel, category, failureMode, cause, improvement, responsible, targetDate, status, s, o, d } = body;

    if (!category || !failureMode) {
      return NextResponse.json({ success: false, error: 'category and failureMode are required' }, { status: 400 });
    }

    if (fmeaId && !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }

    const cipNo = await generateCipNo(prisma);

    const item = await prisma.continuousImprovementPlan.create({
      data: {
        cipNo,
        fmeaId: fmeaId || null,
        uniqueKey: uniqueKey || null,
        apLevel: apLevel || null,
        category,
        failureMode,
        cause: cause || '',
        improvement: improvement || '',
        responsible: responsible || null,
        targetDate: targetDate || null,
        status: status || 'R',
        s: s != null ? Number(s) : null,
        o: o != null ? Number(o) : null,
        d: d != null ? Number(d) : null,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error: unknown) {
    console.error('[CIP] POST error:', safeErrorMessage(error));
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

// PUT: CIP 항목 수정
export async function PUT(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    // Convert numeric fields
    if (updates.s != null) updates.s = Number(updates.s);
    if (updates.o != null) updates.o = Number(updates.o);
    if (updates.d != null) updates.d = Number(updates.d);

    const item = await prisma.continuousImprovementPlan.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ success: true, item });
  } catch (error: unknown) {
    console.error('[CIP] PUT error:', safeErrorMessage(error));
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

// DELETE: CIP 항목 삭제
export async function DELETE(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    await prisma.continuousImprovementPlan.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[CIP] DELETE error:', safeErrorMessage(error));
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
