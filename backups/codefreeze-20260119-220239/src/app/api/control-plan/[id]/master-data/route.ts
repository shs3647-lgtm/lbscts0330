/**
 * @file master-data/route.ts
 * @description CP 마스터 데이터 조회 API (Import 페이지 복원용)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

// GET: CP 마스터 데이터 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    const { id } = await params;
    const cpNo = id.trim();

    console.log('🔍 [CP Master Data] 조회 시작:', cpNo);

    // CpProcess, CpDetector, CpControlItem, CpControlMethod, CpReactionPlan 조회
    const processes = await prisma.cpProcess.findMany({
      where: { cpNo },
      orderBy: { sortOrder: 'asc' },
    });

    if (processes.length === 0) {
      console.log('⚠️ [CP Master Data] 데이터 없음:', cpNo);
      return NextResponse.json({ success: true, flatData: [] });
    }

    const detectors = await prisma.cpDetector.findMany({
      where: { cpNo },
    });

    const controlItems = await prisma.cpControlItem.findMany({
      where: { cpNo },
    });

    const controlMethods = await prisma.cpControlMethod.findMany({
      where: { cpNo },
    });

    const reactionPlans = await prisma.cpReactionPlan.findMany({
      where: { cpNo },
    });

    // flatData 형식으로 변환 (Import 페이지에서 사용하는 형식)
    const flatData: Array<{
      processNo: string;
      processName: string;
      category: string;
      itemCode: string;
      value: string;
    }> = [];

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
      const det = detectors.find(d => d.processNo === pNo);
      if (det) {
        flatData.push({ processNo: pNo, processName: pName, category: 'detector', itemCode: 'A6', value: det.ep ? 'Y' : '' });
        flatData.push({ processNo: pNo, processName: pName, category: 'detector', itemCode: 'A7', value: det.autoDetector ? 'Y' : '' });
      }

      // controlItem 카테고리 (B1~B4)
      const ci = controlItems.find(c => c.processNo === pNo);
      if (ci) {
        flatData.push({ processNo: pNo, processName: pName, category: 'controlItem', itemCode: 'B1', value: ci.productChar || '' });
        flatData.push({ processNo: pNo, processName: pName, category: 'controlItem', itemCode: 'B2', value: ci.processChar || '' });
        flatData.push({ processNo: pNo, processName: pName, category: 'controlItem', itemCode: 'B3', value: ci.specialChar || '' });
        flatData.push({ processNo: pNo, processName: pName, category: 'controlItem', itemCode: 'B4', value: ci.spec || '' });
      }

      // controlMethod 카테고리 (B5~B9)
      const cm = controlMethods.find(m => m.processNo === pNo);
      if (cm) {
        flatData.push({ processNo: pNo, processName: pName, category: 'controlMethod', itemCode: 'B5', value: cm.evalMethod || '' });
        flatData.push({ processNo: pNo, processName: pName, category: 'controlMethod', itemCode: 'B6', value: cm.sampleSize || '' });
        flatData.push({ processNo: pNo, processName: pName, category: 'controlMethod', itemCode: 'B7', value: cm.frequency || '' });
        flatData.push({ processNo: pNo, processName: pName, category: 'controlMethod', itemCode: 'B7-1', value: cm.controlMethod || '' });
        flatData.push({ processNo: pNo, processName: pName, category: 'controlMethod', itemCode: 'B8', value: cm.owner1 || '' });
        flatData.push({ processNo: pNo, processName: pName, category: 'controlMethod', itemCode: 'B9', value: cm.owner2 || '' });
      }

      // reactionPlan 카테고리 (B10)
      const rp = reactionPlans.find(r => r.processNo === pNo);
      if (rp) {
        flatData.push({ processNo: pNo, processName: pName, category: 'reactionPlan', itemCode: 'B10', value: rp.reactionPlan || '' });
      }
    }

    console.log('✅ [CP Master Data] 조회 완료:', {
      cpNo,
      processCount: processes.length,
      flatDataCount: flatData.length,
    });

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
