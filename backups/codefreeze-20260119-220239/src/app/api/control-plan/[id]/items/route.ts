/**
 * @file items/route.ts
 * @description Control Plan Items CRUD API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

// GET: CP Items 조회
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
    
    // cpNo 또는 id로 CP 조회
    const cp = await prisma.controlPlan.findFirst({
      where: { OR: [{ id }, { cpNo: id }] },
    });

    if (!cp) {
      return NextResponse.json({ success: false, error: 'CP를 찾을 수 없습니다' }, { status: 404 });
    }

    const items = await prisma.controlPlanItem.findMany({
      where: { cpId: cp.id },
      orderBy: { sortOrder: 'asc' },
    });

    // CP 헤더 정보도 함께 반환 (fmeaId 포함)
    return NextResponse.json({ 
      success: true, 
      data: items,
      cp: {
        id: cp.id,
        cpNo: cp.cpNo,
        fmeaId: cp.fmeaId,
        fmeaNo: cp.fmeaNo,
        partName: cp.partName,
        partNo: cp.partNo,
        customer: cp.customer,
      }
    });
  } catch (error) {
    console.error('CP Items 조회 오류:', error);
    return NextResponse.json({ success: false, error: 'CP Items 조회 실패' }, { status: 500 });
  }
}

// PUT: CP Items 일괄 저장 (upsert)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    const { id } = await params;
    const { items } = await request.json();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'items 배열이 필요합니다' }, { status: 400 });
    }

    // cpNo 또는 id로 CP 조회
    const cp = await prisma.controlPlan.findFirst({
      where: { OR: [{ id }, { cpNo: id }] },
    });

    if (!cp) {
      return NextResponse.json({ success: false, error: 'CP를 찾을 수 없습니다' }, { status: 404 });
    }

    // 기존 아이템 삭제 후 새로 생성 (간단한 방식)
    await prisma.controlPlanItem.deleteMany({
      where: { cpId: cp.id },
    });

    // 새 아이템 생성 (원자성 데이터: charIndex 포함)
    const createPromises = items.map((item: any, idx: number) => 
      prisma.controlPlanItem.create({
        data: {
          cpId: cp.id,
          processNo: item.processNo || '',
          processName: item.processName || '',
          processLevel: item.processLevel || 'Main',
          processDesc: item.processDesc || '',
          workElement: item.workElement || '',
          detectorNo: item.detectorNo || false,
          detectorEp: item.detectorEp || false,
          detectorAuto: item.detectorAuto || false,
          productChar: item.productChar || '',  // 원자성: 한 셀에 하나만
          processChar: item.processChar || '',  // 원자성: 한 셀에 하나만
          specialChar: item.specialChar || '',
          charIndex: item.charIndex ?? idx,     // ★ 원자성 인덱스
          specTolerance: item.specTolerance || '',
          evalMethod: item.evalMethod || '',
          sampleSize: item.sampleSize || '',
          sampleFreq: item.sampleFreq || '',
          controlMethod: item.controlMethod || '',
          owner1: item.owner1 || '',
          owner2: item.owner2 || '',
          reactionPlan: item.reactionPlan || '',
          refSeverity: item.refSeverity || null,
          refOccurrence: item.refOccurrence || null,
          refDetection: item.refDetection || null,
          refAp: item.refAp || '',
          linkStatus: item.linkStatus || 'new',
          sortOrder: idx,
          pfmeaRowUid: item.pfmeaRowUid || null,
          pfmeaProcessId: item.pfmeaProcessId || null,
          pfmeaWorkElemId: item.pfmeaWorkElemId || null,
        },
      })
    );

    const createdItems = await Promise.all(createPromises);

    // CP 업데이트 시간 갱신
    await prisma.controlPlan.update({
      where: { id: cp.id },
      data: { syncStatus: 'modified' },
    });

    console.log(`✅ CP ${cp.cpNo} Items 저장 완료: ${createdItems.length}개`);

    return NextResponse.json({ 
      success: true, 
      data: createdItems,
      count: createdItems.length,
    });
  } catch (error) {
    console.error('CP Items 저장 오류:', error);
    return NextResponse.json({ success: false, error: 'CP Items 저장 실패' }, { status: 500 });
  }
}

// POST: 단일 Item 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    const { id } = await params;
    const item = await request.json();

    // cpNo 또는 id로 CP 조회
    const cp = await prisma.controlPlan.findFirst({
      where: { OR: [{ id }, { cpNo: id }] },
    });

    if (!cp) {
      return NextResponse.json({ success: false, error: 'CP를 찾을 수 없습니다' }, { status: 404 });
    }

    // 마지막 sortOrder 조회
    const lastItem = await prisma.controlPlanItem.findFirst({
      where: { cpId: cp.id },
      orderBy: { sortOrder: 'desc' },
    });

    const newItem = await prisma.controlPlanItem.create({
      data: {
        cpId: cp.id,
        processNo: item.processNo || '',
        processName: item.processName || '',
        processLevel: item.processLevel || 'Main',
        processDesc: item.processDesc || '',
        workElement: item.workElement || '',
        detectorNo: item.detectorNo || false,
        detectorEp: item.detectorEp || false,
        detectorAuto: item.detectorAuto || false,
        productChar: item.productChar || '',  // 원자성: 한 셀에 하나만
        processChar: item.processChar || '',  // 원자성: 한 셀에 하나만
        specialChar: item.specialChar || '',
        charIndex: item.charIndex ?? (lastItem?.sortOrder || 0) + 1,  // ★ 원자성 인덱스
        specTolerance: item.specTolerance || '',
        evalMethod: item.evalMethod || '',
        sampleSize: item.sampleSize || '',
        sampleFreq: item.sampleFreq || '',
        controlMethod: item.controlMethod || '',
        owner1: item.owner1 || '',
        owner2: item.owner2 || '',
        reactionPlan: item.reactionPlan || '',
        refSeverity: item.refSeverity || null,
        refOccurrence: item.refOccurrence || null,
        refDetection: item.refDetection || null,
        refAp: item.refAp || '',
        linkStatus: 'new',
        sortOrder: (lastItem?.sortOrder || 0) + 1,
      },
    });

    return NextResponse.json({ success: true, data: newItem });
  } catch (error) {
    console.error('CP Item 추가 오류:', error);
    return NextResponse.json({ success: false, error: 'CP Item 추가 실패' }, { status: 500 });
  }
}






