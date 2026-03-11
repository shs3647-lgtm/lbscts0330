/**
 * 고객사 샘플 데이터 시드 API
 * POST /api/admin/seed/customers - 샘플 고객사 데이터 생성
 */
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * 샘플 고객사 데이터
 * 순서: Qualcomm → 현대 → 기아 → BMW → VW → FORD → 스텔란티스 → GM
 * ★ 2026-01-13: 사용자 요청에 따라 순서 및 항목 수정
 * ★ 2026-03-10: Qualcomm 1순위 추가
 */
const SAMPLE_CUSTOMERS = [
  // 0. Qualcomm (최상위)
  { name: 'Qualcomm', code: 'QCOM-SD', factory: 'San Diego', description: 'Qualcomm Inc. 샌디에이고 본사', sortOrder: 0 },
  // 1. 현대자동차 (1순위)
  { name: '현대자동차', code: 'HMC-US', factory: '울산공장', description: '현대자동차 울산공장', sortOrder: 1 },
  { name: '현대자동차', code: 'HMC-AS', factory: '아산공장', description: '현대자동차 아산공장', sortOrder: 2 },
  { name: '현대자동차', code: 'HMC-JJ', factory: '전주공장', description: '현대자동차 전주공장', sortOrder: 3 },
  // 2. 기아자동차 (2순위)
  { name: '기아자동차', code: 'KIA-GW', factory: '광명공장', description: '기아자동차 광명공장', sortOrder: 10 },
  { name: '기아자동차', code: 'KIA-GJ', factory: '광주공장', description: '기아자동차 광주공장', sortOrder: 11 },
  { name: '기아자동차', code: 'KIA-HW', factory: '화성공장', description: '기아자동차 화성공장', sortOrder: 12 },
  // 3. BMW (3순위)
  { name: 'BMW', code: 'BMW-MU', factory: 'Munich', description: 'BMW Group 뮌헨 본사', sortOrder: 20 },
  // 4. Volkswagen (4순위)
  { name: 'Volkswagen', code: 'VW-WB', factory: 'Wolfsburg', description: 'Volkswagen AG 볼프스부르크', sortOrder: 30 },
  // 5. Ford (5순위)
  { name: 'Ford', code: 'FORD-DB', factory: 'Dearborn', description: 'Ford Motor Company 디어본', sortOrder: 40 },
  // 6. Stellantis (6순위)
  { name: 'Stellantis', code: 'STLA-AM', factory: 'Amsterdam', description: 'Stellantis N.V. 암스테르담', sortOrder: 50 },
  // 7. GM (맨 아래)
  { name: 'GM코리아', code: 'GMK-BP', factory: '부평공장', description: 'GM코리아 부평공장', sortOrder: 99 },
];

export async function POST(request: Request) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    // URL 파라미터로 reset 여부 확인
    const { searchParams } = new URL(request.url);
    const reset = searchParams.get('reset') === 'true';

    // 기존 데이터 확인
    const existingCount = await prisma.customer.count();
    
    if (existingCount > 0 && !reset) {
      return NextResponse.json({
        success: true,
        message: `이미 ${existingCount}개의 고객사 데이터가 있습니다. 재생성하려면 ?reset=true 추가`,
        created: 0,
        existing: existingCount
      });
    }

    // reset=true이면 기존 데이터 삭제
    if (reset && existingCount > 0) {
      await prisma.customer.deleteMany({});
    }

    // 샘플 데이터 생성
    const created = [];
    for (const customer of SAMPLE_CUSTOMERS) {
      try {
        const result = await prisma.customer.create({
          data: customer
        });
        created.push(result);
      } catch (error: unknown) {
        // 중복 코드 에러 무시
        const err = error as { code?: string };
        if (err.code === 'P2002') {
        } else {
          throw error;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${created.length}개의 고객사 샘플 데이터가 생성되었습니다.`,
      created: created.length,
      customers: created.map(c => ({ id: c.id, name: c.name, code: c.code }))
    });

  } catch (error: unknown) {
    console.error('[Seed Customers] 오류:', error);
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to seed customers' },
      { status: 500 }
    );
  }
}

