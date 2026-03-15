import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

// ★ 모듈별 설정 (모델명 → 테이블/필드 매핑)
const MODULE_CONFIG: Record<string, {
  model: string;
  docNoField: string;
  titleField: string;
  customerField: string;
}> = {
  APQP: { model: 'apqpRegistration', docNoField: 'apqpNo', titleField: 'subject', customerField: 'customerName' },
  PFMEA: { model: 'fmeaProject', docNoField: 'fmeaId', titleField: 'fmeaId', customerField: '' },
  DFMEA: { model: 'fmeaProject', docNoField: 'fmeaId', titleField: 'fmeaId', customerField: '' },
  CP: { model: 'cpRegistration', docNoField: 'cpNo', titleField: 'subject', customerField: 'customerName' },
  PFD: { model: 'pfdRegistration', docNoField: 'pfdNo', titleField: 'subject', customerField: 'customerName' },
  WS: { model: 'wsRegistration', docNoField: 'wsNo', titleField: 'subject', customerField: 'customerName' },
  PM: { model: 'pmRegistration', docNoField: 'pmNo', titleField: 'subject', customerField: 'customerName' },
};

interface TrashItem {
  id: string;
  module: string;
  docNo: string;
  title: string;
  customerName: string;
  deletedAt: string;
}

// ★ GET: 휴지통 목록 조회
export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const moduleFilter = searchParams.get('module');

  try {
    const items: TrashItem[] = [];

    // FMEA(PFMEA/DFMEA)는 fmeaType으로 구분
    const modulesToQuery = moduleFilter
      ? [moduleFilter]
      : Object.keys(MODULE_CONFIG);

    for (const mod of modulesToQuery) {
      const config = MODULE_CONFIG[mod];
      if (!config) continue;

      const prismaModel = (prisma as Record<string, any>)[config.model];
      if (!prismaModel) continue;

      // PFMEA/DFMEA 구분 처리
      const whereClause: Record<string, any> = {
        deletedAt: { not: null },
      };

      if (mod === 'PFMEA') {
        whereClause.fmeaType = { in: ['P', 'F'] };
      } else if (mod === 'DFMEA') {
        whereClause.fmeaType = 'D';
      }

      const records = await prismaModel.findMany({
        where: whereClause,
        orderBy: { deletedAt: 'desc' },
        take: 200,
      });

      for (const rec of records) {
        // FMEA 레코드에서 제목/고객사 가져오기 (registration 조인 필요)
        let title = rec[config.titleField] || '';
        let customerName = config.customerField ? (rec[config.customerField] || '') : '';

        // FmeaProject는 registration에서 제목/고객사 조회
        if (config.model === 'fmeaProject') {
          try {
            const reg = await (prisma as any).fmeaRegistration.findUnique({
              where: { fmeaId: rec.fmeaId },
              select: { subject: true, customerName: true },
            });
            if (reg) {
              title = reg.subject || rec.fmeaId;
              customerName = reg.customerName || '';
            }
          } catch { /* 무시 */ }
        }

        items.push({
          id: rec.id,
          module: mod,
          docNo: rec[config.docNoField],
          title,
          customerName,
          deletedAt: rec.deletedAt?.toISOString() || '',
        });
      }
    }

    // 삭제일 내림차순 정렬
    items.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

    return NextResponse.json({
      success: true,
      items,
      total: items.length,
    });
  } catch (error: any) {
    console.error('[Trash API] GET 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch trash items' },
      { status: 500 }
    );
  }
}

// ★ POST: 복원 또는 영구삭제
export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { action, items } = body as {
      action: 'restore' | 'permanentDelete';
      items: Array<{ module: string; docNo: string }>;
    };

    if (!action || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'action과 items 배열이 필요합니다.' },
        { status: 400 }
      );
    }

    let processed = 0;
    const errors: string[] = [];

    for (const item of items) {
      const config = MODULE_CONFIG[item.module];
      if (!config) {
        errors.push(`알 수 없는 모듈: ${item.module}`);
        continue;
      }

      const prismaModel = (prisma as Record<string, any>)[config.model];
      if (!prismaModel) {
        errors.push(`모델 없음: ${config.model}`);
        continue;
      }

      try {
        if (action === 'restore') {
          // ★ 복원: deletedAt을 null로 설정
          await prismaModel.updateMany({
            where: {
              [config.docNoField]: { equals: item.docNo, mode: 'insensitive' },
              deletedAt: { not: null },
            },
            data: { deletedAt: null },
          });
          // ★ FMEA 복원 시 ProjectLinkage status도 active로 복구
          if (item.module === 'PFMEA' || item.module === 'DFMEA') {
            const linkField = item.module === 'PFMEA' ? 'pfmeaId' : 'dfmeaId';
            try {
              await (prisma as any).projectLinkage.updateMany({
                where: { [linkField]: { equals: item.docNo, mode: 'insensitive' }, status: 'deleted' },
                data: { status: 'active' },
              });
            } catch { /* 무시 */ }
          }
          processed++;
        } else if (action === 'permanentDelete') {
          // ★ 영구삭제: 실제 삭제 + 관련 데이터 정리
          await permanentDelete(prisma, item.module, item.docNo, config);
          processed++;
        }
      } catch (err: any) {
        errors.push(`${item.module}/${item.docNo}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: action === 'restore'
        ? `${processed}건 복원 완료`
        : `${processed}건 영구삭제 완료`,
      processed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[Trash API] POST 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process trash action' },
      { status: 500 }
    );
  }
}

// ★ 영구삭제 처리 (Hard Delete + 연관 데이터 정리)
async function permanentDelete(
  prisma: any,
  module: string,
  docNo: string,
  config: typeof MODULE_CONFIG[string]
) {
  const prismaModel = prisma[config.model];

  // 레코드 찾기
  const record = await prismaModel.findFirst({
    where: {
      [config.docNoField]: { equals: docNo, mode: 'insensitive' },
      deletedAt: { not: null },
    },
  });

  if (!record) return;

  const actualDocNo = record[config.docNoField];

  // ★ 트랜잭션으로 모든 cascading delete 원자성 보장
  await prisma.$transaction(async (tx: any) => {
    // 모듈별 정리 작업
    switch (module) {
      case 'APQP':
        // ProjectLinkage 정리
        try {
          await tx.projectLinkage.deleteMany({
            where: { apqpNo: { equals: actualDocNo, mode: 'insensitive' } },
          });
        } catch { /* 무시 */ }
        await tx.apqpRegistration.delete({ where: { apqpNo: actualDocNo } });
        break;

      case 'PFMEA':
      case 'DFMEA':
        // 레거시 데이터 삭제
        try {
          await tx.fmeaLegacyData.deleteMany({
            where: { fmeaId: { in: [actualDocNo, actualDocNo.toLowerCase()] } },
          });
        } catch { /* 무시 */ }
        // ProjectLinkage 정리 (pfmeaId 또는 dfmeaId)
        try {
          await tx.projectLinkage.deleteMany({
            where: module === 'PFMEA'
              ? { pfmeaId: { equals: actualDocNo, mode: 'insensitive' } }
              : { dfmeaId: { equals: actualDocNo, mode: 'insensitive' } },
          });
        } catch { /* 무시 */ }
        // FmeaRegistration 정리
        try {
          await tx.fmeaRegistration.deleteMany({
            where: { fmeaId: { equals: actualDocNo, mode: 'insensitive' } },
          });
        } catch { /* 무시 */ }
        // FmeaCftMember 정리
        try {
          await tx.fmeaCftMember.deleteMany({
            where: { fmeaId: { equals: actualDocNo, mode: 'insensitive' } },
          });
        } catch { /* 무시 */ }
        // MasterFlatItem 정리 (sourceFmeaId 매칭) - PFMEA/DFMEA 분기
        try {
          if (module === 'PFMEA') {
            await tx.pfmeaMasterFlatItem.deleteMany({
              where: { sourceFmeaId: { equals: actualDocNo, mode: 'insensitive' } },
            });
          }
        } catch { /* 무시 */ }
        // MasterDataset 정리: flatItem이 0개인 고아 dataset 삭제
        try {
          if (module === 'PFMEA') {
            const orphaned = await tx.pfmeaMasterDataset.findMany({
              where: { flatItems: { none: {} } }, select: { id: true },
            });
            if (orphaned.length > 0) {
              await tx.pfmeaMasterDataset.deleteMany({
                where: { id: { in: orphaned.map((d: { id: string }) => d.id) } },
              });
            }
          }
        } catch { /* 무시 */ }
        // UnifiedProcessItem 정리
        try {
          await tx.unifiedProcessItem.deleteMany({
            where: { apqpNo: { equals: actualDocNo, mode: 'insensitive' } },
          });
        } catch { /* 무시 */ }
        // FmeaWorksheetData 정리
        try {
          await tx.fmeaWorksheetData.deleteMany({
            where: { fmeaId: { equals: actualDocNo, mode: 'insensitive' } },
          });
        } catch { /* 무시 */ }
        await tx.fmeaProject.delete({ where: { fmeaId: actualDocNo } });
        break;

      case 'CP':
        // ControlPlan 레거시도 삭제
        try {
          await tx.controlPlan.delete({ where: { cpNo: actualDocNo } });
        } catch { /* 무시 */ }
        // ProjectLinkage에서 cpNo 참조 정리
        try {
          await tx.projectLinkage.updateMany({
            where: { cpNo: { equals: actualDocNo, mode: 'insensitive' } },
            data: { cpNo: null },
          });
        } catch { /* 무시 */ }
        await tx.cpRegistration.delete({ where: { id: record.id } });
        break;

      case 'PFD':
        // DocumentLink 정리
        try {
          await tx.documentLink.deleteMany({
            where: {
              OR: [
                { sourceType: 'pfd', sourceId: record.id },
                { targetType: 'pfd', targetId: record.id },
              ],
            },
          });
        } catch { /* 무시 */ }
        // ProjectLinkage에서 pfdNo 참조 정리
        try {
          await tx.projectLinkage.updateMany({
            where: { pfdNo: { equals: actualDocNo, mode: 'insensitive' } },
            data: { pfdNo: null },
          });
        } catch { /* 무시 */ }
        await tx.pfdRegistration.delete({ where: { id: record.id } });
        break;

      case 'WS':
        await tx.wsRegistration.delete({ where: { wsNo: actualDocNo } });
        break;

      case 'PM':
        await tx.pmRegistration.delete({ where: { pmNo: actualDocNo } });
        break;
    }
  });
}
