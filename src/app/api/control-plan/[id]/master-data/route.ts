/**
 * @file master-data/route.ts
 * @description CP 마스터 데이터 조회 API (Import 페이지 복원용)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrismaForCp } from '@/lib/project-schema';

// GET: CP 마스터 데이터 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cpNo = id.trim();

    // ★ 프로젝트 스키마 Prisma 클라이언트 획득
    const cpPrisma = await getPrismaForCp(cpNo);
    if (!cpPrisma) {
      return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    // CpProcess, CpDetector, CpControlItem, CpControlMethod, CpReactionPlan 조회 (프로젝트 스키마)
    const processes = await cpPrisma.cpProcess.findMany({
      where: { cpNo },
      orderBy: { sortOrder: 'asc' },
    });

    if (processes.length === 0) {
      return NextResponse.json({ success: true, flatData: [] });
    }

    // ★ 4개 쿼리 병렬 실행 (프로젝트 스키마)
    const [detectors, controlItems, controlMethods, reactionPlans] = await Promise.all([
      cpPrisma.cpDetector.findMany({ where: { cpNo } }),
      cpPrisma.cpControlItem.findMany({ where: { cpNo } }),
      cpPrisma.cpControlMethod.findMany({ where: { cpNo } }),
      cpPrisma.cpReactionPlan.findMany({ where: { cpNo } }),
    ]);

    // flatData 형식으로 변환 (Import 페이지에서 사용하는 형식)
    const flatData: Array<{
      processNo: string;
      processName: string;
      category: string;
      itemCode: string;
      value: string;
    }> = [];

    // Map 기반 룩업 생성 (N² array.find() → O(1) Map.get())
    const detectorMap = new Map(detectors.map(d => [d.processNo, d]));
    const controlItemMap = new Map(controlItems.map(c => [c.processNo, c]));
    const controlMethodMap = new Map(controlMethods.map(m => [m.processNo, m]));
    const reactionPlanMap = new Map(reactionPlans.map(r => [r.processNo, r]));

    // processNo 기준으로 정렬
    const sortedProcesses = [...processes].sort((a, b) => {
      const numA = parseInt(a.processNo, 10);
      const numB = parseInt(b.processNo, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.processNo.localeCompare(b.processNo, undefined, { numeric: true });
    });

    for (const proc of sortedProcesses) {
      const pNo = proc.processNo;
      const pName = proc.processName || '';

      // processInfo 카테고리 (A1~A5)
      flatData.push({ processNo: pNo, processName: pName, category: 'processInfo', itemCode: 'A1', value: pNo });
      flatData.push({ processNo: pNo, processName: pName, category: 'processInfo', itemCode: 'A2', value: pName });
      flatData.push({ processNo: pNo, processName: pName, category: 'processInfo', itemCode: 'A3', value: proc.level || '' });
      flatData.push({ processNo: pNo, processName: pName, category: 'processInfo', itemCode: 'A4', value: proc.processDesc || '' });
      flatData.push({ processNo: pNo, processName: pName, category: 'processInfo', itemCode: 'A5', value: proc.equipment || '' });

      // detector 카테고리 (A6~A7)
      const det = detectorMap.get(pNo);
      if (det) {
        flatData.push({ processNo: pNo, processName: pName, category: 'detector', itemCode: 'A6', value: det.ep ? 'Y' : '' });
        flatData.push({ processNo: pNo, processName: pName, category: 'detector', itemCode: 'A7', value: det.autoDetector ? 'Y' : '' });
      }

      // controlItem 카테고리 (B1~B4)
      const ci = controlItemMap.get(pNo);
      if (ci) {
        flatData.push({ processNo: pNo, processName: pName, category: 'controlItem', itemCode: 'B1', value: ci.productChar || '' });
        flatData.push({ processNo: pNo, processName: pName, category: 'controlItem', itemCode: 'B2', value: ci.processChar || '' });
        flatData.push({ processNo: pNo, processName: pName, category: 'controlItem', itemCode: 'B3', value: ci.specialChar || '' });
        flatData.push({ processNo: pNo, processName: pName, category: 'controlItem', itemCode: 'B4', value: ci.spec || '' });
      }

      // controlMethod 카테고리 (B5~B9)
      const cm = controlMethodMap.get(pNo);
      if (cm) {
        flatData.push({ processNo: pNo, processName: pName, category: 'controlMethod', itemCode: 'B5', value: cm.evalMethod || '' });
        flatData.push({ processNo: pNo, processName: pName, category: 'controlMethod', itemCode: 'B6', value: cm.sampleSize || '' });
        flatData.push({ processNo: pNo, processName: pName, category: 'controlMethod', itemCode: 'B7', value: cm.frequency || '' });
        flatData.push({ processNo: pNo, processName: pName, category: 'controlMethod', itemCode: 'B7-1', value: cm.controlMethod || '' });
        flatData.push({ processNo: pNo, processName: pName, category: 'controlMethod', itemCode: 'B8', value: cm.owner1 || '' });
        flatData.push({ processNo: pNo, processName: pName, category: 'controlMethod', itemCode: 'B9', value: cm.owner2 || '' });
      }

      // reactionPlan 카테고리 (B10)
      const rp = reactionPlanMap.get(pNo);
      if (rp) {
        flatData.push({ processNo: pNo, processName: pName, category: 'reactionPlan', itemCode: 'B10', value: rp.reactionPlan || '' });
      }
    }


    return NextResponse.json({
      success: true,
      flatData,
      counts: {
        processes: processes.length,
        detectors: detectors.length,
        controlItems: controlItems.length,
        controlMethods: controlMethods.length,
        reactionPlans: reactionPlans.length,
      },
    });
  } catch (error) {
    console.error('CP Master Data 조회 오류:', error);
    return NextResponse.json({ success: false, error: 'CP Master Data 조회 실패' }, { status: 500 });
  }
}
