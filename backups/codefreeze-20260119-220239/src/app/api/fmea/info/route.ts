/**
 * @file route.ts
 * @description FMEA 등록정보 조회 API (Prisma 기반)
 * - GET: FMEA ID로 등록정보 조회 (작성자, 검토자, 승인자 정보 포함)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET: FMEA 등록정보 조회
export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured', fmeaInfo: null }, { status: 500 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    // ✅ FMEA ID는 항상 소문자로 정규화 (DB 일관성 보장)
    const fmeaId = searchParams.get('fmeaId')?.toLowerCase();
    
    if (!fmeaId) {
      return NextResponse.json({ success: false, error: 'fmeaId is required', fmeaInfo: null }, { status: 400 });
    }
    
    // Prisma로 FMEA 등록정보 조회
    const registration = await prisma.fmeaRegistration.findUnique({
      where: { fmeaId },
      select: {
        fmeaId: true,
        subject: true,
        customerName: true,
        modelYear: true,
        designResponsibility: true,
        confidentialityLevel: true,
        fmeaStartDate: true,
        fmeaRevisionDate: true,
        fmeaResponsibleName: true,
        engineeringLocation: true,  // ✅ 공장 필드 추가
        companyName: true,          // ✅ 회사명 필드 추가
      },
    });
    
    if (!registration) {
      return NextResponse.json({ 
        success: false, 
        error: 'FMEA registration not found',
        fmeaInfo: null 
      }, { status: 404 });
    }
    
    // FmeaProject에서 revisionNo 조회
    const project = await prisma.fmeaProject.findUnique({
      where: { fmeaId },
      select: { revisionNo: true },
    });
    
    // CFT 멤버에서 검토자/승인자 정보 조회 (역할별)
    const cftMembers = await prisma.fmeaCftMember.findMany({
      where: { fmeaId },
      select: {
        role: true,
        name: true,
        position: true,
      },
    });
    
    // 역할별로 매핑
    const reviewer = cftMembers.find(m => m.role === 'Reviewer' || m.role === '검토자');
    const approver = cftMembers.find(m => m.role === 'Approver' || m.role === '승인자');
    
    console.log(`✅ [FMEA Info] ${fmeaId} 등록정보 조회 성공`);
    
    return NextResponse.json({ 
      success: true, 
      fmeaInfo: {
        ...registration,
        // ✅ 개정관리 화면용 필드 매핑
        fmeaName: registration.subject,                    // FMEA명
        factory: registration.engineeringLocation,         // 공장
        responsible: registration.fmeaResponsibleName,     // FMEA책임자
        customer: registration.customerName,               // 고객
        productName: registration.subject,                 // 품명 (= FMEA명)
        // 기존 필드
        revisionNo: project?.revisionNo || 'Rev.01',
        fmeaResponsiblePosition: '', // FmeaRegistration에 없으므로 빈 문자열
        reviewResponsibleName: reviewer?.name || '',
        reviewResponsiblePosition: reviewer?.position || '',
        approvalResponsibleName: approver?.name || '',
        approvalResponsiblePosition: approver?.position || '',
      }
    });
  } catch (error: any) {
    console.error('❌ FMEA 등록정보 조회 실패:', error.message);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      fmeaInfo: null 
    }, { status: 500 });
  }
}
