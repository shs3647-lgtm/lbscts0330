/**
 * @file /api/special-char/route.ts
 * @description 특별특성 마스터 CRUD API — DB 영속화
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

// GET: 전체 목록 조회 (필터: customer, internalSymbol)
export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });

    const { searchParams } = new URL(req.url);
    const customer = searchParams.get('customer');
    const symbol = searchParams.get('symbol');

    const where: Record<string, unknown> = {};
    if (customer && customer !== '전체') where.customer = customer;
    if (symbol) where.internalSymbol = symbol;

    const items = await prisma.specialCharMasterItem.findMany({
      where,
      orderBy: [{ usageCount: 'desc' }, { updatedAt: 'desc' }],
    });

    return NextResponse.json({ success: true, data: items, count: items.length });
  } catch (error) {
    console.error('[special-char] GET error:', error);
    return NextResponse.json({ success: false, error: '특별특성 목록 조회 실패' }, { status: 500 });
  }
}

// POST: 신규 등록 또는 bulk upsert (localStorage → DB 마이그레이션 포함)
export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });

    const body = await req.json();

    // bulk 모드: { items: [...] }
    if (body.items && Array.isArray(body.items)) {
      const results = [];
      for (const item of body.items) {
        const data = {
          customer: item.customer || '',
          internalSymbol: item.internalSymbol || 'SC',
          customerSymbol: item.customerSymbol || '',
          meaning: item.meaning || '',
          color: item.color || '#f5f5f5',
          partName: item.partName || '',
          processName: item.processName || '',
          productChar: item.productChar || '',
          processChar: item.processChar || '',
          failureMode: item.failureMode || '',
          linkDFMEA: item.linkDFMEA ?? false,
          linkPFMEA: item.linkPFMEA ?? true,
          linkCP: item.linkCP ?? true,
          linkPFD: item.linkPFD ?? false,
          sourceFmeaId: item.sourceFmeaId || null,
        };
        const created = await prisma.specialCharMasterItem.upsert({
          where: { id: item.id || `temp-${Date.now()}-${Math.random()}` },
          update: data,
          create: data,
        });
        results.push(created);
      }
      return NextResponse.json({ success: true, data: results, count: results.length });
    }

    // 단일 등록
    const created = await prisma.specialCharMasterItem.create({
      data: {
        customer: body.customer || '',
        internalSymbol: body.internalSymbol || 'SC',
        customerSymbol: body.customerSymbol || '',
        meaning: body.meaning || '',
        color: body.color || '#f5f5f5',
        partName: body.partName || '',
        processName: body.processName || '',
        productChar: body.productChar || '',
        processChar: body.processChar || '',
        failureMode: body.failureMode || '',
        linkDFMEA: body.linkDFMEA ?? false,
        linkPFMEA: body.linkPFMEA ?? true,
        linkCP: body.linkCP ?? true,
        linkPFD: body.linkPFD ?? false,
        sourceFmeaId: body.sourceFmeaId || null,
      },
    });
    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error('[special-char] POST error:', error);
    return NextResponse.json({ success: false, error: '특별특성 등록 실패' }, { status: 500 });
  }
}

// PUT: 수정 (단일 또는 bulk)
export async function PUT(req: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });

    const body = await req.json();

    // bulk 모드
    if (body.items && Array.isArray(body.items)) {
      const results = [];
      for (const item of body.items) {
        if (!item.id) continue;
        const updated = await prisma.specialCharMasterItem.update({
          where: { id: item.id },
          data: {
            ...(item.customer !== undefined && { customer: item.customer }),
            ...(item.internalSymbol !== undefined && { internalSymbol: item.internalSymbol }),
            ...(item.customerSymbol !== undefined && { customerSymbol: item.customerSymbol }),
            ...(item.meaning !== undefined && { meaning: item.meaning }),
            ...(item.color !== undefined && { color: item.color }),
            ...(item.partName !== undefined && { partName: item.partName }),
            ...(item.processName !== undefined && { processName: item.processName }),
            ...(item.productChar !== undefined && { productChar: item.productChar }),
            ...(item.processChar !== undefined && { processChar: item.processChar }),
            ...(item.failureMode !== undefined && { failureMode: item.failureMode }),
            ...(item.linkDFMEA !== undefined && { linkDFMEA: item.linkDFMEA }),
            ...(item.linkPFMEA !== undefined && { linkPFMEA: item.linkPFMEA }),
            ...(item.linkCP !== undefined && { linkCP: item.linkCP }),
            ...(item.linkPFD !== undefined && { linkPFD: item.linkPFD }),
            ...(item.usageCount !== undefined && { usageCount: item.usageCount }),
            ...(item.lastUsedAt !== undefined && { lastUsedAt: item.lastUsedAt }),
            ...(item.sourceFmeaId !== undefined && { sourceFmeaId: item.sourceFmeaId }),
          },
        });
        results.push(updated);
      }
      return NextResponse.json({ success: true, data: results, count: results.length });
    }

    // 단일
    if (!body.id) return NextResponse.json({ success: false, error: 'id 필수' }, { status: 400 });
    const updated = await prisma.specialCharMasterItem.update({
      where: { id: body.id },
      data: {
        ...(body.customer !== undefined && { customer: body.customer }),
        ...(body.internalSymbol !== undefined && { internalSymbol: body.internalSymbol }),
        ...(body.customerSymbol !== undefined && { customerSymbol: body.customerSymbol }),
        ...(body.meaning !== undefined && { meaning: body.meaning }),
        ...(body.usageCount !== undefined && { usageCount: body.usageCount }),
        ...(body.lastUsedAt !== undefined && { lastUsedAt: body.lastUsedAt }),
      },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('[special-char] PUT error:', error);
    return NextResponse.json({ success: false, error: '특별특성 수정 실패' }, { status: 500 });
  }
}

// DELETE: 삭제 (단일 id 또는 ids 배열)
export async function DELETE(req: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });

    const body = await req.json();

    if (body.ids && Array.isArray(body.ids)) {
      const result = await prisma.specialCharMasterItem.deleteMany({
        where: { id: { in: body.ids } },
      });
      return NextResponse.json({ success: true, deleted: result.count });
    }

    if (!body.id) return NextResponse.json({ success: false, error: 'id 필수' }, { status: 400 });
    await prisma.specialCharMasterItem.delete({ where: { id: body.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[special-char] DELETE error:', error);
    return NextResponse.json({ success: false, error: '특별특성 삭제 실패' }, { status: 500 });
  }
}
