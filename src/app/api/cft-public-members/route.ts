/**
 * CFT·직원 공용 디렉터리 API (public.cft_public_members)
 * — 로그인 users 테이블(ADMIN)과 분리 · 연동 없음
 *
 * ★ 2026-03-23: Prisma 모듈 캐시 문제 → raw pg 쿼리로 완전 대체
 *   이유: npx prisma generate 후 서버 재시작 없이 새 모델 사용하려면
 *         globalThis 캐시된 PrismaClient가 구버전이라 cftPublicMember=undefined
 *
 * GET /api/cft-public-members — 전체
 * GET /api/cft-public-members?id= — 단건
 * POST / PUT / DELETE — CRUD
 */
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { pickFields, safeErrorMessage } from '@/lib/security';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

function getPool(): Pool | null {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;
  // ★ baseUrl 추출 (schema 파라미터 제거)
  const baseUrl = dbUrl.replace(/\?.*$/, '');
  return new Pool({ connectionString: baseUrl, max: 3 });
}

function mapRow(r: Record<string, unknown>) {
  return {
    id: String(r.id || ''),
    factory: String(r.factory || ''),
    department: String(r.department || ''),
    name: String(r.name || ''),
    position: String(r.position || ''),
    phone: String(r.phone || ''),
    email: String(r.email || ''),
    photoUrl: r.photoUrl ? String(r.photoUrl) : null,
    remark: String(r.remark || ''),
    createdAt: r.createdAt ? new Date(String(r.createdAt)).toISOString() : new Date().toISOString(),
    updatedAt: r.updatedAt ? new Date(String(r.updatedAt)).toISOString() : new Date().toISOString(),
  };
}
// SQL 컬럼명: id, factory, department, name, position, phone, email, "photoUrl", remark, "createdAt", "updatedAt"
const COLS = `id, factory, department, name, position, phone, email, "photoUrl", remark, "createdAt", "updatedAt"`;

export async function GET(request: NextRequest) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ success: false, error: 'Database not configured', members: [] }, { status: 500 });

  const userId = request.nextUrl.searchParams.get('id');

  try {
    if (userId) {
      const res = await pool.query(
        `SELECT ${COLS} FROM public.cft_public_members WHERE id = $1`,
        [userId]
      );
      if (res.rows.length === 0) return NextResponse.json({ success: false, error: 'Not found', member: null }, { status: 404 });
      return NextResponse.json({ success: true, member: mapRow(res.rows[0]) });
    }

    const res = await pool.query(
      `SELECT ${COLS} FROM public.cft_public_members ORDER BY "createdAt" DESC`
    );
    return NextResponse.json(
      { success: true, members: res.rows.map(mapRow) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[cft-public-members] GET:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error), members: [] }, { status: 500 });
  } finally {
    await pool.end();
  }
}

export async function POST(request: NextRequest) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });

  try {
    const body = await request.json();
    const raw = pickFields(body as Record<string, unknown>, ['factory', 'department', 'name', 'position', 'phone', 'email', 'photoUrl', 'remark']);
    const name = String(raw.name ?? '').trim();
    if (!name) return NextResponse.json({ success: false, error: '성명은 필수입니다.' }, { status: 400 });

    const email = raw.email ? String(raw.email).trim() : null;
    if (email) {
      const dup = await pool.query('SELECT id FROM public.cft_public_members WHERE email = $1', [email]);
      if (dup.rows.length > 0) return NextResponse.json({ success: false, error: '이미 등록된 이메일입니다.' }, { status: 400 });
    }

    const id = uuidv4();
    const res = await pool.query(
      `INSERT INTO public.cft_public_members (id, factory, department, name, position, phone, email, "photoUrl", remark, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()) RETURNING ${COLS}`,
      [
        id,
        String(raw.factory ?? '').trim(),
        String(raw.department ?? '').trim(),
        name,
        String(raw.position ?? '').trim(),
        raw.phone ? String(raw.phone).trim() : null,
        email,
        raw.photoUrl ? String(raw.photoUrl).trim() : null,
        raw.remark ? String(raw.remark).trim() : null,
      ]
    );
    return NextResponse.json({ success: true, member: mapRow(res.rows[0]) });
  } catch (error) {
    console.error('[cft-public-members] POST:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  } finally {
    await pool.end();
  }
}

export async function PUT(request: NextRequest) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });

  try {
    const body = await request.json();
    const raw = pickFields(body as Record<string, unknown>, ['id', 'factory', 'department', 'name', 'position', 'phone', 'email', 'photoUrl', 'remark']);
    const id = String(raw.id ?? '').trim();
    const name = String(raw.name ?? '').trim();
    if (!id || !name) return NextResponse.json({ success: false, error: 'ID, 성명은 필수입니다.' }, { status: 400 });

    const existing = await pool.query('SELECT * FROM public.cft_public_members WHERE id = $1', [id]);
    if (existing.rows.length === 0) return NextResponse.json({ success: false, error: '항목을 찾을 수 없습니다.' }, { status: 404 });

    const email = raw.email !== undefined ? String(raw.email ?? '').trim() || null : existing.rows[0].email;
    if (email && email !== existing.rows[0].email) {
      const dup = await pool.query('SELECT id FROM public.cft_public_members WHERE email = $1 AND id != $2', [email, id]);
      if (dup.rows.length > 0) return NextResponse.json({ success: false, error: '이미 등록된 이메일입니다.' }, { status: 400 });
    }

    const res = await pool.query(
      `UPDATE public.cft_public_members
       SET factory=$2, department=$3, name=$4, position=$5, phone=$6, email=$7, "photoUrl"=$8, remark=$9, "updatedAt"=NOW()
       WHERE id=$1 RETURNING ${COLS}`,
      [
        id,
        raw.factory !== undefined ? String(raw.factory ?? '').trim() : existing.rows[0].factory,
        raw.department !== undefined ? String(raw.department ?? '').trim() : existing.rows[0].department,
        name,
        raw.position !== undefined ? String(raw.position ?? '').trim() : existing.rows[0].position,
        raw.phone !== undefined ? (String(raw.phone ?? '').trim() || null) : existing.rows[0].phone,
        email,
        raw.photoUrl !== undefined ? (String(raw.photoUrl ?? '').trim() || null) : existing.rows[0].photoUrl,
        raw.remark !== undefined ? (String(raw.remark ?? '').trim() || null) : existing.rows[0].remark,
      ]
    );
    return NextResponse.json({ success: true, member: mapRow(res.rows[0]) });
  } catch (error) {
    console.error('[cft-public-members] PUT:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  } finally {
    await pool.end();
  }
}

export async function DELETE(request: NextRequest) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });

  const userId = request.nextUrl.searchParams.get('id');
  if (!userId) return NextResponse.json({ success: false, error: 'id가 필요합니다.' }, { status: 400 });

  try {
    const existing = await pool.query('SELECT id FROM public.cft_public_members WHERE id = $1', [userId]);
    if (existing.rows.length === 0) return NextResponse.json({ success: false, error: '항목을 찾을 수 없습니다.' }, { status: 404 });
    await pool.query('DELETE FROM public.cft_public_members WHERE id = $1', [userId]);
    return NextResponse.json({ success: true, message: '삭제되었습니다.' });
  } catch (error) {
    console.error('[cft-public-members] DELETE:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  } finally {
    await pool.end();
  }
}
