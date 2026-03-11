/**
 * bizinfo_projects 테이블에 customers 테이블 기반 최신 데이터 생성
 * POST /api/admin/seed/bizinfo-projects
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// 최신 고객사 순서: Qualcomm, BMW, Ford, GM, Stellantis, VW, 기아
const SAMPLE_PROJECTS = [
  // 1. Qualcomm (1순위)
  { customerName: 'Qualcomm', customerCode: 'QCOM', factory: 'San Diego', modelYear: 'MY2025', program: 'Snapdragon', productName: '12INCH AU BUMP', partNo: 'AB-001' },
  // 현대자동차
  { customerName: '현대자동차', customerCode: 'HMC', factory: '울산공장', modelYear: 'MY2025', program: 'NE1', productName: '도어패널', partNo: 'DP-001' },
  { customerName: '현대자동차', customerCode: 'HMC', factory: '아산공장', modelYear: 'MY2025', program: 'NE2', productName: '후드', partNo: 'HD-002' },
  { customerName: '현대자동차', customerCode: 'HMC', factory: '전주공장', modelYear: 'MY2024', program: 'NE3', productName: '트렁크리드', partNo: 'TL-003' },
  // 기아자동차
  { customerName: '기아자동차', customerCode: 'KIA', factory: '광주공장', modelYear: 'MY2024', program: 'SP2i', productName: '범퍼', partNo: 'BP-004' },
  { customerName: '기아자동차', customerCode: 'KIA', factory: '화성공장', modelYear: 'MY2025', program: 'EV6', productName: '펜더', partNo: 'FD-005' },
  { customerName: '기아자동차', customerCode: 'KIA', factory: '소하리공장', modelYear: 'MY2025', program: 'EV9', productName: '사이드패널', partNo: 'SP-006' },
  // BMW
  { customerName: 'BMW', customerCode: 'BMW', factory: 'Munich', modelYear: 'MY2025', program: 'X5', productName: '프론트범퍼', partNo: 'FB-007' },
  // Volkswagen (4순위)
  { customerName: 'Volkswagen', customerCode: 'VW', factory: 'Wolfsburg', modelYear: 'MY2025', program: 'Golf', productName: '리어범퍼', partNo: 'RB-008' },
  // Ford (5순위)
  { customerName: 'Ford', customerCode: 'FORD', factory: 'Dearborn', modelYear: 'MY2025', program: 'F-150', productName: '후드패널', partNo: 'HP-009' },
  // Stellantis (6순위)
  { customerName: 'Stellantis', customerCode: 'STLA', factory: 'Amsterdam', modelYear: 'MY2025', program: 'Peugeot', productName: '사이드미러', partNo: 'SM-010' },
  // GM (7순위 - 맨 아래)
  { customerName: 'GM코리아', customerCode: 'GMK', factory: '부평공장', modelYear: 'MY2024', program: 'X1', productName: '루프패널', partNo: 'RP-011' },
];

export async function POST(request: NextRequest) {
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
    const existingCount = await prisma.bizInfoProject.count();
    
    if (existingCount > 0 && !reset) {
      return NextResponse.json({
        success: true,
        message: `이미 ${existingCount}개의 프로젝트 기초정보가 있습니다. 재생성하려면 ?reset=true 추가`,
        created: 0,
        existing: existingCount
      });
    }

    // reset=true이면 기존 데이터 삭제
    if (reset && existingCount > 0) {
      await prisma.bizInfoProject.deleteMany({});
    }

    // 샘플 데이터 생성
    const created = [];
    for (const project of SAMPLE_PROJECTS) {
      try {
        const result = await prisma.bizInfoProject.create({
          data: project
        });
        created.push(result);
      } catch (error: any) {
      }
    }

    return NextResponse.json({
      success: true,
      message: `${created.length}개의 프로젝트 기초정보 샘플 데이터가 생성되었습니다.`,
      created: created.length,
      projects: created.map(p => ({ id: p.id, customerName: p.customerName, productName: p.productName }))
    });

  } catch (error: any) {
    console.error('[Seed BizInfo Projects] 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to seed bizinfo projects' },
      { status: 500 }
    );
  }
}


