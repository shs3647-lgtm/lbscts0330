/**
 * 시드 데이터 관리 API — seed_master_items 전용 테이블
 * GET: 항목 목록
 * POST: 항목 추가
 * PATCH: 항목 수정
 * DELETE: 항목 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ success: false, error: 'DB 연결 실패' });

  try {
    const items = await (prisma as any).seedMasterItem.findMany({
      orderBy: [{ processNo: 'asc' }, { itemCode: 'asc' }, { orderIndex: 'asc' }],
    });
    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ success: false, error: 'DB 연결 실패' });

  try {
    const body = await req.json();
    const { itemCode, processNo, value, category, m4, parentItemId } = body;
    if (!itemCode || !value) return NextResponse.json({ success: false, error: '필수 값 누락' });

    const item = await (prisma as any).seedMasterItem.create({
      data: {
        itemCode,
        processNo: processNo || '',
        value,
        category: category || 'A',
        m4: m4 || undefined,
        parentItemId: parentItemId || undefined,
      },
    });
    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

export async function PATCH(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ success: false, error: 'DB 연결 실패' });

  try {
    const body = await req.json();
    const { id, value, m4, parentItemId } = body;
    if (!id) return NextResponse.json({ success: false, error: 'id 필요' });

    const data: any = {};
    if (value !== undefined) data.value = value;
    if (m4 !== undefined) data.m4 = m4;
    if (parentItemId !== undefined) data.parentItemId = parentItemId;

    await (prisma as any).seedMasterItem.update({ where: { id }, data });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

export async function DELETE(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ success: false, error: 'DB 연결 실패' });

  try {
    const body = await req.json();
    const { ids } = body;
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ success: false, error: '삭제할 id 필요' });

    const result = await (prisma as any).seedMasterItem.deleteMany({
      where: { id: { in: ids } },
    });
    return NextResponse.json({ success: true, deletedCount: result.count });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
