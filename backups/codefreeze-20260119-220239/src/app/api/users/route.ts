/**
 * 사용자 정보 API - 전체 프로젝트 공유 마스터 데이터
 * 
 * GET /api/users - 전체 사용자 목록 조회
 * GET /api/users?id=xxx - 특정 사용자 조회
 * POST /api/users - 사용자 생성
 * PUT /api/users - 사용자 수정
 * DELETE /api/users?id=xxx - 사용자 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// ============ GET: 사용자 목록 조회 ============
export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured', users: [] },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('id');

  try {
    if (userId) {
      // 특정 사용자 조회
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found', user: null },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          factory: user.factory,
          department: user.department,
          name: user.name,
          position: user.position,
          phone: user.phone || '',
          email: user.email || '',
          remark: user.remark || '',
          role: (user as any).role || 'viewer',
          permPfmea: (user as any).permPfmea || 'none',
          permDfmea: (user as any).permDfmea || 'none',
          permCp: (user as any).permCp || 'none',
          permPfd: (user as any).permPfd || 'none',
          isActive: (user as any).isActive ?? true,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        }
      });
    } else {
      // 전체 사용자 목록 조회
      // ✅ 테이블이 없을 수도 있으므로 try-catch로 처리
      let users;
      try {
        users = await prisma.user.findMany({
          orderBy: [
            { factory: 'asc' },
            { department: 'asc' },
            { name: 'asc' }
          ]
        });
      } catch (dbError: any) {
        // 테이블이 없거나 스키마 문제인 경우
        if (dbError.code === 'P2021' || dbError.message?.includes('does not exist') || dbError.message?.includes('table')) {
          console.warn('[Users API] users 테이블이 없습니다. 빈 배열 반환:', dbError.message);
          return NextResponse.json({
            success: true,
            users: []
          });
        }
        throw dbError; // 다른 에러는 재던지기
      }

      return NextResponse.json({
        success: true,
        users: users.map(user => ({
          id: user.id,
          factory: user.factory,
          department: user.department,
          name: user.name,
          position: user.position,
          phone: user.phone || '',
          email: user.email || '',
          remark: user.remark || '',
          role: (user as any).role || 'viewer',
          permPfmea: (user as any).permPfmea || 'none',
          permDfmea: (user as any).permDfmea || 'none',
          permCp: (user as any).permCp || 'none',
          permPfd: (user as any).permPfd || 'none',
          isActive: (user as any).isActive ?? true,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        }))
      });
    }
  } catch (error: any) {
    console.error('[Users API] GET 오류:', error);
    // ✅ 에러 상세 정보 포함하여 디버깅 용이하게
    const errorMessage = error.message || 'Failed to fetch users';
    const errorCode = error.code || 'UNKNOWN';
    console.error('[Users API] GET 오류 상세:', {
      message: errorMessage,
      code: errorCode,
      name: error.name,
      stack: error.stack?.substring(0, 500), // 스택 너무 길면 잘라내기
    });
    
    // 테이블이 없는 경우 빈 배열 반환 (에러 대신)
    if (errorCode === 'P2021' || errorMessage.includes('does not exist') || errorMessage.includes('table')) {
      console.warn('[Users API] users 테이블이 없습니다. 빈 배열 반환');
      return NextResponse.json({
        success: true,
        users: []
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        code: errorCode,
        users: [] 
      },
      { status: 500 }
    );
  }
}

// ============ POST: 사용자 생성 ============
export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { factory, department, name, position, phone, email, remark, role, password, permPfmea, permDfmea, permCp, permPfd } = body;

    if (!name || !factory || !department) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다 (공장, 부서, 성명)' },
        { status: 400 }
      );
    }

    // 이메일 중복 체크 (이메일이 있는 경우)
    if (email) {
      const existing = await prisma.user.findUnique({
        where: { email }
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: '이미 등록된 이메일입니다.' },
          { status: 400 }
        );
      }
    }

    // ✅ 2026-01-19: 비밀번호 해시 (crypto 사용)
    let hashedPassword = null;
    if (password) {
      const crypto = await import('crypto');
      hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    }

    const user = await prisma.user.create({
      data: {
        factory,
        department,
        name,
        position: position || '',
        phone: phone || null,
        email: email || null,
        remark: remark || null,
        role: role || 'viewer',
        permPfmea: permPfmea || 'none',
        permDfmea: permDfmea || 'none',
        permCp: permCp || 'none',
        permPfd: permPfd || 'none',
        password: hashedPassword,
      }
    });

    console.log(`✅ 사용자 생성 완료: ${user.name} (${user.id})`);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        factory: user.factory,
        department: user.department,
        name: user.name,
        position: user.position,
        phone: user.phone || '',
        email: user.email || '',
        remark: user.remark || '',
        role: (user as any).role || 'viewer',
        permPfmea: (user as any).permPfmea || 'none',
        permDfmea: (user as any).permDfmea || 'none',
        permCp: (user as any).permCp || 'none',
        permPfd: (user as any).permPfd || 'none',
        isActive: (user as any).isActive ?? true,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }
    });
  } catch (error: any) {
    console.error('[Users API] POST 오류:', error);
    
    // ✅ 에러 상세 정보 포함
    const errorMessage = error.message || 'Failed to create user';
    const errorCode = error.code || 'UNKNOWN';
    console.error('[Users API] POST 오류 상세:', {
      message: errorMessage,
      code: errorCode,
      stack: error.stack,
    });
    
    // PostgreSQL unique constraint 오류
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: '이미 등록된 이메일입니다.', code: 'P2002' },
        { status: 400 }
      );
    }

    // Prisma 테이블 없음 오류
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'users 테이블이 없습니다. Prisma 마이그레이션을 실행해주세요.',
          code: 'P2021'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        code: errorCode
      },
      { status: 500 }
    );
  }
}

// ============ PUT: 사용자 수정 ============
export async function PUT(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { id, factory, department, name, position, phone, email, remark, role, isActive, password, permPfmea, permDfmea, permCp, permPfd } = body;

    if (!id || !name || !factory || !department) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다 (ID, 공장, 부서, 성명)' },
        { status: 400 }
      );
    }

    // 사용자 존재 확인
    const existing = await prisma.user.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 이메일 중복 체크 (다른 사용자가 사용 중인 경우)
    if (email && email !== existing.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });

      if (emailExists) {
        return NextResponse.json(
          { success: false, error: '이미 등록된 이메일입니다.' },
          { status: 400 }
        );
      }
    }

    // ✅ 2026-01-19: 비밀번호 해시 (변경 시에만)
    let hashedPassword = undefined;
    if (password) {
      const crypto = await import('crypto');
      hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        factory,
        department,
        name,
        position: position || '',
        phone: phone || null,
        email: email || null,
        remark: remark || null,
        // ✅ 2026-01-19: 권한 및 상태 수정
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(permPfmea !== undefined && { permPfmea }),
        ...(permDfmea !== undefined && { permDfmea }),
        ...(permCp !== undefined && { permCp }),
        ...(permPfd !== undefined && { permPfd }),
        ...(hashedPassword && { password: hashedPassword }),
      }
    });

    console.log(`✅ 사용자 수정 완료: ${user.name} (${user.id})`);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        factory: user.factory,
        department: user.department,
        name: user.name,
        position: user.position,
        phone: user.phone || '',
        email: user.email || '',
        remark: user.remark || '',
        role: (user as any).role || 'viewer',
        permPfmea: (user as any).permPfmea || 'none',
        permDfmea: (user as any).permDfmea || 'none',
        permCp: (user as any).permCp || 'none',
        permPfd: (user as any).permPfd || 'none',
        isActive: (user as any).isActive ?? true,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }
    });
  } catch (error: any) {
    console.error('[Users API] PUT 오류:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: '이미 등록된 이메일입니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

// ============ DELETE: 사용자 삭제 ============
export async function DELETE(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('id');

  if (!userId) {
    return NextResponse.json(
      { success: false, error: '사용자 ID가 필요합니다.' },
      { status: 400 }
    );
  }

  try {
    // 사용자 존재 확인
    const existing = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    console.log(`✅ 사용자 삭제 완료: ${existing.name} (${userId})`);

    return NextResponse.json({
      success: true,
      message: '사용자가 삭제되었습니다.'
    });
  } catch (error: any) {
    console.error('[Users API] DELETE 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}

