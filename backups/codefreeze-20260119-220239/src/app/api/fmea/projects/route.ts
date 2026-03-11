/**
 * FMEA 프로젝트 API Route
 * 
 * 목적: HTTP 요청/응답 처리만 담당 (DB 로직은 서비스 레이어로 분리)
 * 규칙: 파일 크기 500줄 이하 유지
 * 
 * GET /api/fmea/projects - 프로젝트 목록 조회
 * GET /api/fmea/projects?id=xxx - 특정 프로젝트 조회
 * POST /api/fmea/projects - 프로젝트 생성/수정
 * DELETE /api/fmea/projects - 프로젝트 삭제
 * 
 * @created 2026-01-11
 */
import { NextRequest, NextResponse } from 'next/server';
import { 
  getProjects, 
  createOrUpdateProject, 
  deleteProject 
} from '@/lib/services/fmea-project-service';

export const runtime = 'nodejs';

// ============ GET: 프로젝트 목록 조회 ============
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const targetId = searchParams.get('id') || null;
    
    const projects = await getProjects(targetId);
    return NextResponse.json({ success: true, projects });
  } catch (error: any) {
    console.error('❌ FMEA 목록 조회 실패:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message, 
      projects: [] 
    }, { status: 500 });
  }
}

// ============ POST: 프로젝트 생성/수정 ============
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fmeaId, fmeaType, project, fmeaInfo, cftMembers, parentApqpNo, parentFmeaId, parentFmeaType } = body;

    if (!fmeaId) {
      return NextResponse.json({ 
        success: false, 
        error: 'fmeaId is required' 
      }, { status: 400 });
    }

    await createOrUpdateProject({
      fmeaId,
      fmeaType,
      project,
      fmeaInfo,
      cftMembers,
      parentApqpNo,  // ★ 상위 APQP
      parentFmeaId,
      parentFmeaType,
    });

    return NextResponse.json({
      success: true,
      fmeaId: fmeaId.toLowerCase(),
      message: 'FMEA 프로젝트가 저장되었습니다.',
    });
  } catch (error: any) {
    console.error('❌ FMEA 프로젝트 저장 실패:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// ============ DELETE: 프로젝트 삭제 ============
export async function DELETE(req: NextRequest) {
  try {
    const { fmeaId } = await req.json();
    
    if (!fmeaId) {
      return NextResponse.json({ 
        success: false, 
        error: 'fmeaId is required' 
      }, { status: 400 });
    }

    await deleteProject(fmeaId);

    return NextResponse.json({
      success: true,
      fmeaId: fmeaId.toLowerCase(),
      message: 'FMEA 프로젝트가 삭제되었습니다.',
    });
  } catch (error: any) {
    console.error('❌ FMEA 프로젝트 삭제 실패:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
