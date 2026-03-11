/**
 * 고객사 정보 API - 전체 프로젝트 공유 마스터 데이터
 * 
 * GET /api/customers - 전체 고객사 목록 조회
 * GET /api/customers?id=xxx - 특정 고객사 조회
 * POST /api/customers - 고객사 생성
 * PUT /api/customers - 고객사 수정
 * DELETE /api/customers?id=xxx - 고객사 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// ============ GET: 고객사 목록 조회 ============
export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured', customers: [] },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const customerId = searchParams.get('id');

  try {
    if (customerId) {
      // 특정 고객사 조회
      const customer = await prisma.customer.findUnique({
        where: { id: customerId }
      });

      if (!customer) {
        return NextResponse.json(
          { success: false, error: 'Customer not found', customer: null },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        customer: {
          id: customer.id,
          name: customer.name,
          code: customer.code || '',
          factory: customer.factory || '',
          description: customer.description || '',
          createdAt: customer.createdAt.toISOString(),
          updatedAt: customer.updatedAt.toISOString(),
        }
      });
    } else {
      // 전체 고객사 목록 조회
      let customers;
      try {
        customers = await prisma.customer.findMany({
          orderBy: [
            { name: 'asc' }
          ]
        });
      } catch (dbError: any) {
        // 테이블이 없거나 스키마 문제인 경우
        if (dbError.code === 'P2021' || dbError.message?.includes('does not exist') || dbError.message?.includes('table')) {
          console.warn('[Customers API] customers 테이블이 없습니다. 빈 배열 반환:', dbError.message);
          return NextResponse.json({
            success: true,
            customers: []
          });
        }
        throw dbError;
      }

      return NextResponse.json({
        success: true,
        customers: customers.map(customer => ({
          id: customer.id,
          name: customer.name,
          code: customer.code || '',
          factory: customer.factory || '',
          description: customer.description || '',
          createdAt: customer.createdAt.toISOString(),
          updatedAt: customer.updatedAt.toISOString(),
        }))
      });
    }
  } catch (error: any) {
    console.error('[Customers API] GET 오류:', error);
    const errorMessage = error.message || 'Failed to fetch customers';
    const errorCode = error.code || 'UNKNOWN';
    
    // 테이블이 없는 경우 빈 배열 반환
    if (errorCode === 'P2021' || errorMessage.includes('does not exist') || errorMessage.includes('table')) {
      console.warn('[Customers API] customers 테이블이 없습니다. 빈 배열 반환');
      return NextResponse.json({
        success: true,
        customers: []
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        code: errorCode,
        customers: [] 
      },
      { status: 500 }
    );
  }
}

// ============ POST: 고객사 생성 ============
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
    const { name, code, factory, description } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다 (고객명)' },
        { status: 400 }
      );
    }

    // 코드 중복 체크 (코드가 있는 경우)
    if (code) {
      const existing = await prisma.customer.findUnique({
        where: { code }
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: '이미 등록된 고객 코드입니다.' },
          { status: 400 }
        );
      }
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        code: code || null,
        factory: factory || null,
        description: description || null,
      }
    });

    console.log(`✅ 고객사 생성 완료: ${customer.name} (${customer.id})`);

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        code: customer.code || '',
        factory: customer.factory || '',
        description: customer.description || '',
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
      }
    });
  } catch (error: any) {
    console.error('[Customers API] POST 오류:', error);
    
    const errorMessage = error.message || 'Failed to create customer';
    const errorCode = error.code || 'UNKNOWN';
    
    // PostgreSQL unique constraint 오류
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: '이미 등록된 고객 코드입니다.', code: 'P2002' },
        { status: 400 }
      );
    }

    // Prisma 테이블 없음 오류
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'customers 테이블이 없습니다. Prisma 마이그레이션을 실행해주세요.',
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

// ============ PUT: 고객사 수정 ============
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
    const { id, name, code, factory, description } = body;

    if (!id || !name) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다 (ID, 고객명)' },
        { status: 400 }
      );
    }

    // 고객사 존재 확인
    const existing = await prisma.customer.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '고객사를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 코드 중복 체크 (다른 고객사가 사용 중인 경우)
    if (code && code !== existing.code) {
      const codeExists = await prisma.customer.findUnique({
        where: { code }
      });

      if (codeExists) {
        return NextResponse.json(
          { success: false, error: '이미 등록된 고객 코드입니다.' },
          { status: 400 }
        );
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        code: code || null,
        factory: factory || null,
        description: description || null,
      }
    });

    console.log(`✅ 고객사 수정 완료: ${customer.name} (${customer.id})`);

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        code: customer.code || '',
        factory: customer.factory || '',
        description: customer.description || '',
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
      }
    });
  } catch (error: any) {
    console.error('[Customers API] PUT 오류:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: '이미 등록된 고객 코드입니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update customer' },
      { status: 500 }
    );
  }
}

// ============ DELETE: 고객사 삭제 ============
export async function DELETE(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const customerId = searchParams.get('id');

  if (!customerId) {
    return NextResponse.json(
      { success: false, error: '고객사 ID가 필요합니다.' },
      { status: 400 }
    );
  }

  try {
    // 고객사 존재 확인
    const existing = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '고객사를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    await prisma.customer.delete({
      where: { id: customerId }
    });

    console.log(`✅ 고객사 삭제 완료: ${existing.name} (${customerId})`);

    return NextResponse.json({
      success: true,
      message: '고객사가 삭제되었습니다.'
    });
  } catch (error: any) {
    console.error('[Customers API] DELETE 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete customer' },
      { status: 500 }
    );
  }
}








