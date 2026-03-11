/**
 * @file route.ts
 * @description FMEA 개정 복제 API — 기존 프로젝트를 복제하여 Rev N+1 생성
 * @created 2026-02-18
 *
 * POST /api/fmea/revision-clone
 * Body: { sourceFmeaId: string }
 * Response: { success, newFmeaId, revisionNo, message }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';
import { renameFmeaId } from './renameFmeaId';
import { cloneAtomicData } from './cloneAtomicData';
import { cloneLegacyData } from './cloneLegacyData';

// ── 개정번호 증가 ──
function incrementRevisionNo(revNo: string): string {
  const match = revNo.match(/^Rev\.?(\d+)$/i);
  if (match) {
    const num = parseInt(match[1], 10) + 1;
    return `Rev.${num.toString().padStart(2, '0')}`;
  }
  return 'Rev.01';
}

// ── 새 fmeaId 생성 (원본-rNN 형식) ──
// ★ isFirstRevision: 기존 개정이 없으면 true (원본에 -r00 리네임 필요)
interface GenerateResult {
  newFmeaId: string;
  baseId: string;
  isFirstRevision: boolean;
}

async function generateNewFmeaId(prisma: any, sourceFmeaId: string): Promise<GenerateResult> {
  // 이미 "-rNN"으로 끝나면 base 추출, 아니면 sourceFmeaId가 base
  const baseMatch = sourceFmeaId.match(/^(.+)-r(\d+)$/);
  const baseId = baseMatch ? baseMatch[1] : sourceFmeaId;

  // 기존 개정 번호 조회 (soft-deleted 포함 — ID 충돌 방지)
  const existing = await prisma.fmeaProject.findMany({
    where: {
      fmeaId: { startsWith: `${baseId}-r` },
    },
    select: { fmeaId: true },
  });

  let maxRev = 0;
  for (const p of existing) {
    const m = p.fmeaId.match(/-r(\d+)$/);
    if (m) maxRev = Math.max(maxRev, parseInt(m[1], 10));
  }

  // ★ 첫 개정 시: 원본이 -r00으로 리네임될 예정이므로 maxRev=0 → nextRev=01
  const isFirstRevision = maxRev === 0 && !baseMatch;
  const nextRev = (maxRev + 1).toString().padStart(2, '0');
  return {
    newFmeaId: `${baseId}-r${nextRev}`,
    baseId,
    isFirstRevision,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceFmeaId } = body;

    if (!sourceFmeaId) {
      return NextResponse.json(
        { success: false, error: 'sourceFmeaId is required' },
        { status: 400 }
      );
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const srcId = sourceFmeaId.toLowerCase();

    // ── 1. 원본 조회 ──
    const sourceProject = await prisma.fmeaProject.findUnique({
      where: { fmeaId: srcId },
      include: {
        registration: true,
        cftMembers: { orderBy: { order: 'asc' } },
        worksheetData: true,
      },
    });

    if (!sourceProject) {
      return NextResponse.json(
        { success: false, error: `원본 FMEA를 찾을 수 없습니다: ${srcId}` },
        { status: 404 }
      );
    }

    // ── 2. 새 ID, 개정번호 생성 ──
    const { newFmeaId, baseId, isFirstRevision } = await generateNewFmeaId(prisma, srcId);
    const newRevisionNo = incrementRevisionNo(sourceProject.revisionNo || 'Rev.00');
    const revMatch = newRevisionNo.match(/(\d+)/);
    const newRevMajor = revMatch ? parseInt(revMatch[1], 10) : 1;

    // ★ 첫 개정 시 원본 ID가 -r00으로 변경되므로, parentFmeaId도 변경된 ID 사용
    const renamedSourceId = isFirstRevision ? `${baseId}-r00` : srcId;

    // ── 3. 트랜잭션으로 복제 ──
    await prisma.$transaction(async (tx: any) => {
      // ★ 3-pre. 첫 개정: 원본 fmeaId를 -r00으로 리네임
      if (isFirstRevision) {
        await renameFmeaId(tx, srcId, `${baseId}-r00`);
      }

      // 3a. FmeaProject 생성
      await tx.fmeaProject.create({
        data: {
          fmeaId: newFmeaId,
          fmeaType: sourceProject.fmeaType,
          parentApqpNo: sourceProject.parentApqpNo,
          parentFmeaId: renamedSourceId,  // ★ 리네임된 원본 ID 참조
          parentFmeaType: sourceProject.fmeaType,
          status: 'active',
          step: 1, // 개정은 1단계부터 시작
          revisionNo: newRevisionNo,
          revMajor: newRevMajor,
          revMinor: 0,
        },
      });

      // 3b. FmeaRegistration 복사
      if (sourceProject.registration) {
        const reg = sourceProject.registration;
        await tx.fmeaRegistration.create({
          data: {
            fmeaId: newFmeaId,
            companyName: reg.companyName,
            engineeringLocation: reg.engineeringLocation,
            customerName: reg.customerName,
            modelYear: reg.modelYear,
            subject: reg.subject,
            fmeaStartDate: new Date().toISOString().split('T')[0],
            fmeaRevisionDate: reg.fmeaRevisionDate,
            fmeaProjectName: reg.fmeaProjectName,
            designResponsibility: reg.designResponsibility,
            confidentialityLevel: reg.confidentialityLevel,
            fmeaResponsibleName: reg.fmeaResponsibleName,
            partName: reg.partName,
            partNo: reg.partNo,
            linkedCpNo: reg.linkedCpNo,
            linkedPfdNo: reg.linkedPfdNo,
            linkedDfmeaNo: reg.linkedDfmeaNo,
            linkedPfmeaNo: reg.linkedPfmeaNo,
            remark: reg.remark,
          },
        });
      }

      // 3c. FmeaCftMember 복사
      if (sourceProject.cftMembers.length > 0) {
        for (const m of sourceProject.cftMembers) {
          await tx.fmeaCftMember.create({
            data: {
              fmeaId: newFmeaId,
              role: m.role,
              name: m.name,
              department: m.department,
              position: m.position,
              responsibility: m.responsibility,
              email: m.email,
              phone: m.phone,
              remarks: m.remarks,
              order: m.order,
            },
          });
        }
      }

      // 3d. FmeaWorksheetData 복사
      if (sourceProject.worksheetData) {
        const ws = sourceProject.worksheetData;
        await tx.fmeaWorksheetData.create({
          data: {
            fmeaId: newFmeaId,
            l1Data: ws.l1Data ?? undefined,
            l2Data: ws.l2Data ?? undefined,
            riskData: ws.riskData ?? undefined,
            failureLinks: ws.failureLinks ?? undefined,
            tab: ws.tab,
            version: ws.version,
          },
        });
      }

      // 3e. PfmeaMasterDataset 복사 (기초정보)
      try {
        const masterDatasets = await tx.pfmeaMasterDataset.findMany({
          where: { fmeaId: renamedSourceId },
        });
        for (const ds of masterDatasets) {
          await tx.pfmeaMasterDataset.create({
            data: {
              fmeaId: newFmeaId,
              name: ds.name,
              fmeaType: ds.fmeaType,
              dataJson: ds.dataJson,
            },
          });
        }
      } catch {
        // PfmeaMasterDataset 없으면 무시
      }

      // 3f. ProjectLinkage 복사
      try {
        const linkages = await tx.projectLinkage.findMany({
          where: { pfmeaId: renamedSourceId, status: 'active' },
        });
        for (const link of linkages) {
          await tx.projectLinkage.create({
            data: {
              pfmeaId: newFmeaId,
              dfmeaId: link.dfmeaId,
              cpNo: link.cpNo,
              pfdNo: link.pfdNo,
              apqpNo: link.apqpNo,
              subject: link.subject,
              customerName: link.customerName,
              companyName: link.companyName,
              modelYear: link.modelYear,
              engineeringLocation: link.engineeringLocation,
              partNo: link.partNo,
              responsibleName: link.responsibleName,
              status: 'active',
            },
          });
        }
      } catch {
        // ProjectLinkage 없으면 무시
      }

      // 3g. 개정 이력 복사 (원본 이력 전체 유지) + 신규 행 추가
      const sourceRevisions = await tx.fmeaRevisionHistory.findMany({
        where: { fmeaId: renamedSourceId },
        orderBy: { revisionNumber: 'asc' },
      });

      // 기존 이력 전체 복사 (최초 작성~이전 개정 내역 누적 유지)
      for (const rev of sourceRevisions) {
        await tx.fmeaRevisionHistory.create({
          data: {
            fmeaId: newFmeaId,
            revisionNumber: rev.revisionNumber,
            revisionDate: rev.revisionDate,
            revisionHistory: rev.revisionHistory,
            createPosition: rev.createPosition,
            createName: rev.createName,
            createDate: rev.createDate,
            createStatus: rev.createStatus,
            reviewPosition: rev.reviewPosition,
            reviewName: rev.reviewName,
            reviewDate: rev.reviewDate,
            reviewStatus: rev.reviewStatus,
            approvePosition: rev.approvePosition,
            approveName: rev.approveName,
            approveDate: rev.approveDate,
            approveStatus: rev.approveStatus,
          },
        });
      }

      // 신규 개정 행 추가
      await tx.fmeaRevisionHistory.create({
        data: {
          fmeaId: newFmeaId,
          revisionNumber: `${newRevMajor}.00`,
          revisionHistory: `${newRevisionNo} 개정 시작 (원본: ${renamedSourceId})`,
          createDate: new Date().toISOString().split('T')[0],
          createStatus: '진행',
        },
      });

      // ── 3h. 원자성 테이블 복제 + 최적화 승격 ──
      const cloneResult = await cloneAtomicData(tx, renamedSourceId, newFmeaId);

      // ── 3i. LegacyData 복제 (JSON 변환 + 승격) ──
      await cloneLegacyData(tx, renamedSourceId, newFmeaId, cloneResult.idMap, cloneResult.promotionMap);

      // ── 3j. FmeaConfirmedState 생성 (모든 confirmed = false, step 1 시작) ──
      try {
        await tx.fmeaConfirmedState.create({
          data: {
            fmeaId: newFmeaId,
            structureConfirmed: false,
            l1FunctionConfirmed: false,
            l2FunctionConfirmed: false,
            l3FunctionConfirmed: false,
            failureL1Confirmed: false,
            failureL2Confirmed: false,
            failureL3Confirmed: false,
            failureLinkConfirmed: false,
            riskConfirmed: false,
            optimizationConfirmed: false,
          },
        });
      } catch {
        // FmeaConfirmedState 테이블 미존재 시 무시
      }
    });

    return NextResponse.json({
      success: true,
      newFmeaId,
      revisionNo: newRevisionNo,
      sourceFmeaId: renamedSourceId,
      originalRenamed: isFirstRevision ? `${srcId} → ${baseId}-r00` : undefined,
      message: isFirstRevision
        ? `개정 복제 완료: 원본 ${srcId} → ${baseId}-r00 (Rev.00), 개정 ${newFmeaId} (${newRevisionNo})`
        : `개정 복제 완료: ${srcId} → ${newFmeaId} (${newRevisionNo})`,
    });
  } catch (err) {
    console.error('[revision-clone] Error:', err);

    // Prisma 에러 유형별 사용자 친화적 메시지
    const rawMsg = err instanceof Error ? err.message : String(err);
    let userMessage = '개정 생성 중 오류가 발생했습니다.';

    if (rawMsg.includes('Unique constraint')) {
      userMessage = '이미 동일한 개정이 존재합니다. 목록을 새로고침 후 다시 시도하세요.';
    } else if (rawMsg.includes('Foreign key constraint')) {
      userMessage = '참조 데이터 연결 오류입니다. 원본 FMEA 데이터를 확인하세요.';
    } else if (rawMsg.includes('Invalid') && rawMsg.includes('invocation')) {
      userMessage = '개정 데이터 생성 중 오류가 발생했습니다. 원본 FMEA의 등록정보가 완전한지 확인하세요.';
    }

    return NextResponse.json(
      {
        success: false,
        error: userMessage,
        detail: safeErrorMessage(err),
      },
      { status: 500 }
    );
  }
}
