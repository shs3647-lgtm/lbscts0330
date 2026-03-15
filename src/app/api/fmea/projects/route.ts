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
  getProjectsPaginated,
  createOrUpdateProject,
  deleteProject,
  updateProjectRemark,
  restoreProject,
} from '@/lib/services/fmea-project-service';

export const runtime = 'nodejs';

// ============ GET: 프로젝트 목록 조회 ============
// page 파라미터 존재 시 → 서버사이드 페이지네이션 모드
// page 파라미터 없음 → 레거시 모드 (전체 반환, 하위호환)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const targetId = searchParams.get('id') || null;
    const fmeaType = searchParams.get('type') || null;  // ★ D/P 유형 필터
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const pageParam = searchParams.get('page');

    // ★ 페이지네이션 모드: page 파라미터가 있으면 서버사이드 페이징
    if (pageParam && !targetId) {
      const page = Math.max(1, parseInt(pageParam, 10) || 1);
      const size = Math.min(200, Math.max(1, parseInt(searchParams.get('size') || '50', 10)));
      const sortField = searchParams.get('sortField') || 'createdAt';
      const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
      const search = searchParams.get('search') || '';

      const result = await getProjectsPaginated(fmeaType, page, size, sortField, sortOrder, search, { includeDeleted });

      return NextResponse.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    }

    // ★ 레거시 모드: 전체 데이터 반환 (하위호환)
    const projects = await getProjects(targetId, fmeaType, { includeDeleted });

    return NextResponse.json({ success: true, projects });
  } catch (error: any) {
    console.error('[FMEA 프로젝트] 목록 조회 실패:', error.message);

    // DB 연결 실패 시에도 빈 배열 반환 (클라이언트에서 localStorage 폴백 사용)
    return NextResponse.json({
      success: false,
      error: error.message,
      dbError: true,  // ★ DB 에러 플래그 추가
      projects: []
    }, { status: 200 });  // ★ 200으로 변경하여 클라이언트에서 처리 가능하게
  }
}

// ============ POST: 프로젝트 생성/수정 ============
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fmeaId, fmeaType, project, fmeaInfo, cftMembers, parentApqpNo, parentFmeaId, parentFmeaType, revisionNo } = body;

    if (!fmeaId) {
      return NextResponse.json({ 
        success: false, 
        error: 'fmeaId is required' 
      }, { status: 400 });
    }

    const normalizedId = fmeaId.toLowerCase();

    try {
      await createOrUpdateProject({
        fmeaId,
        fmeaType,
        project,
        fmeaInfo,
        cftMembers,
        parentApqpNo,  // ★ 상위 APQP
        parentFmeaId,
        parentFmeaType,
        revisionNo,    // ★ 개정번호 DB 저장
      });

      // ★ 저장 후 즉시 검증 - DB에서 다시 조회
      const savedProjects = await getProjects(normalizedId);
      const verified = savedProjects.find(p => p.id?.toLowerCase() === normalizedId);
      
      if (!verified) {
        return NextResponse.json({
          success: true,
          fmeaId: normalizedId,
          verified: false,
          dbSaved: true,
          message: 'DB 저장은 되었으나 검증 실패. localStorage 사용 권장.',
        });
      }
      
      return NextResponse.json({
        success: true,
        fmeaId: normalizedId,
        verified: true,
        dbSaved: true,
        message: 'FMEA 프로젝트가 DB에 저장되었습니다.',
      });
    } catch (dbError: any) {
      console.error('[FMEA 프로젝트] DB 저장 실패:', dbError.message);
      return NextResponse.json({
        success: false,
        fmeaId: normalizedId,
        verified: false,
        dbSaved: false,
        dbError: dbError.message,
        message: 'DB 연결 실패. 로컬에 저장됩니다.',
      }, { status: 503 });
    }
  } catch (error: any) {
    console.error('[FMEA 프로젝트] 저장 요청 실패:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// ============ PATCH: 비고(remark) 업데이트 ============
// body: { fmeaId: string, remark: string }
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    // ★ 복원 액션 (admin 휴지통에서 복원)
    if (body.action === 'restore' && body.fmeaId) {
      await restoreProject(body.fmeaId);
      return NextResponse.json({
        success: true,
        fmeaId: body.fmeaId.toLowerCase(),
        message: '프로젝트가 복원되었습니다.(Project restored.)',
      });
    }

    // ★ 기존: 비고(remark) 업데이트
    const { fmeaId, remark } = body;
    if (!fmeaId) {
      return NextResponse.json({ success: false, error: 'fmeaId is required' }, { status: 400 });
    }
    await updateProjectRemark(fmeaId, remark ?? '');
    return NextResponse.json({ success: true, fmeaId: fmeaId.toLowerCase() });
  } catch (error: any) {
    console.error('[FMEA 프로젝트] PATCH 실패:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============ DELETE: 프로젝트 삭제 ============
// body: { fmeaId: string, deleteModules?: string[] }
// deleteModules 예시: ['FMEA','CP','PFD'] → 선택한 모듈만 삭제
// deleteModules 미전달 → 전체 연쇄 삭제 (하위호환)
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { fmeaId, deleteModules, permanentDelete } = body as { fmeaId: string; deleteModules?: string[]; permanentDelete?: boolean };

    if (!fmeaId) {
      return NextResponse.json({
        success: false,
        error: 'fmeaId is required'
      }, { status: 400 });
    }

    await deleteProject(fmeaId, {
      deleteModules: deleteModules || undefined,
      permanentDelete: permanentDelete || false,
    });

    return NextResponse.json({
      success: true,
      fmeaId: fmeaId.toLowerCase(),
      deleteModules: deleteModules || 'all',
      message: 'FMEA 프로젝트가 삭제되었습니다.',
    });
  } catch (error: any) {
    console.error('[FMEA 프로젝트] 삭제 실패:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
