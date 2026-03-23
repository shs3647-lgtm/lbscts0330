/**
 * CFT·직원 공용 디렉터리 API (public.cft_public_members)
 * — 로그인 users 테이블(ADMIN)과 분리 · 연동 없음
 *
 * GET /api/cft-public-members — 전체
 * GET /api/cft-public-members?id= — 단건
 * POST / PUT / DELETE — CRUD
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { pickFields, safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

const SELECT_FIELDS = {
  id: true,
  factory: true,
  department: true,
  name: true,
  position: true,
  phone: true,
  email: true,
  photoUrl: true,
  remark: true,
  createdAt: true,
  updatedAt: true,
} as const;

function mapRow(m: {
  id: string;
  factory: string;
  department: string;
  name: string;
  position: string;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: m.id,
    factory: m.factory,
    department: m.department,
    name: m.name,
    position: m.position,
    phone: m.phone || '',
    email: m.email || '',
    photoUrl: m.photoUrl || null,
    remark: m.remark || '',
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured', members: [] }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('id');

  try {
    if (userId) {
      const m = await prisma.cftPublicMember.findUnique({
        where: { id: userId },
        select: SELECT_FIELDS,
      });
      if (!m) {
        return NextResponse.json({ success: false, error: 'Not found', member: null }, { status: 404 });
      }
      return NextResponse.json({ success: true, member: mapRow(m) });
    }

    const list = await prisma.cftPublicMember.findMany({
      orderBy: { createdAt: 'desc' },
      select: SELECT_FIELDS,
    });

    return NextResponse.json(
      { success: true, members: list.map(mapRow) },
      { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=30' } }
    );
  } catch (error: unknown) {
    console.error('[cft-public-members] GET:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error), members: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const raw = pickFields(body as Record<string, unknown>, [
      'factory',
      'department',
      'name',
      'position',
      'phone',
      'email',
      'photoUrl',
      'remark',
    ]);
    const name = String(raw.name ?? '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: '성명은 필수입니다.' }, { status: 400 });
    }

    const email = raw.email ? String(raw.email).trim() : '';
    if (email) {
      const dup = await prisma.cftPublicMember.findUnique({ where: { email } });
      if (dup) {
        return NextResponse.json({ success: false, error: '이미 등록된 이메일입니다.' }, { status: 400 });
      }
    }

    const m = await prisma.cftPublicMember.create({
      data: {
        factory: String(raw.factory ?? '').trim(),
        department: String(raw.department ?? '').trim(),
        name,
        position: String(raw.position ?? '').trim(),
        phone: raw.phone ? String(raw.phone).trim() : null,
        email: email || null,
        photoUrl: raw.photoUrl ? String(raw.photoUrl).trim() : null,
        remark: raw.remark ? String(raw.remark).trim() : null,
      },
      select: SELECT_FIELDS,
    });

    return NextResponse.json({ success: true, member: mapRow(m) });
  } catch (error: unknown) {
    console.error('[cft-public-members] POST:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ success: false, error: '이미 등록된 이메일입니다.' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const raw = pickFields(body as Record<string, unknown>, [
      'id',
      'factory',
      'department',
      'name',
      'position',
      'phone',
      'email',
      'photoUrl',
      'remark',
    ]);
    const id = String(raw.id ?? '').trim();
    const name = String(raw.name ?? '').trim();
    if (!id || !name) {
      return NextResponse.json({ success: false, error: 'ID, 성명은 필수입니다.' }, { status: 400 });
    }

    const existing = await prisma.cftPublicMember.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: '항목을 찾을 수 없습니다.' }, { status: 404 });
    }

    const email = raw.email !== undefined ? String(raw.email ?? '').trim() : existing.email || '';
    if (email && email !== (existing.email || '')) {
      const dup = await prisma.cftPublicMember.findUnique({ where: { email } });
      if (dup && dup.id !== id) {
        return NextResponse.json({ success: false, error: '이미 등록된 이메일입니다.' }, { status: 400 });
      }
    }

    const m = await prisma.cftPublicMember.update({
      where: { id },
      data: {
        factory: String(raw.factory ?? existing.factory).trim(),
        department: String(raw.department ?? existing.department).trim(),
        name,
        position: String(raw.position ?? existing.position).trim(),
        phone: raw.phone !== undefined ? (String(raw.phone ?? '').trim() || null) : existing.phone,
        email: raw.email !== undefined ? (email || null) : existing.email,
        photoUrl: raw.photoUrl !== undefined ? (String(raw.photoUrl ?? '').trim() || null) : existing.photoUrl,
        remark: raw.remark !== undefined ? (String(raw.remark ?? '').trim() || null) : existing.remark,
      },
      select: SELECT_FIELDS,
    });

    return NextResponse.json({ success: true, member: mapRow(m) });
  } catch (error: unknown) {
    console.error('[cft-public-members] PUT:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ success: false, error: '이미 등록된 이메일입니다.' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  const userId = request.nextUrl.searchParams.get('id');
  if (!userId) {
    return NextResponse.json({ success: false, error: 'id가 필요합니다.' }, { status: 400 });
  }

  try {
    const existing = await prisma.cftPublicMember.findUnique({ where: { id: userId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: '항목을 찾을 수 없습니다.' }, { status: 404 });
    }

    await prisma.cftPublicMember.delete({ where: { id: userId } });
    return NextResponse.json({ success: true, message: '삭제되었습니다.' });
  } catch (error: unknown) {
    console.error('[cft-public-members] DELETE:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
