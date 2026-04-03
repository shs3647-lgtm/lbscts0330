// CODEFREEZE
/**
 * @file master-structure/route.ts
 * @description 마스터 기초정보에서 워크시트 구조 자동 생성
 * - GET: 마스터 데이터에서 공정 목록 + 작업요소 조회
 * - 워크시트에 자동 렌더링할 수 있는 형식으로 반환
 * @created 2026-02-05
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { isValidFmeaId } from '@/lib/security';

export const runtime = 'nodejs';

interface WorkElement {
  id: string;
  name: string;
  m4: string;
  processNo: string;
}

interface ProcessData {
  no: string;
  name: string;
  workElements: WorkElement[];
}

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패' });
  }

  try {
    // ★ sourceFmeaId 파라미터: FMEA별 파티셔닝된 기초정보 조회
    const { searchParams } = new URL(req.url);
    const sourceFmeaId = searchParams.get('sourceFmeaId');
    if (sourceFmeaId && !isValidFmeaId(sourceFmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid sourceFmeaId', processes: [] }, { status: 400 });
    }

    // ★★★ 2026-02-16: 1 FMEA = 1 Dataset 아키텍처 대응 ★★★
    // sourceFmeaId가 있으면 해당 FMEA의 dataset을 직접 조회
    // 없으면 가장 최근 활성 dataset을 fallback으로 사용
    let activeDataset;
    if (sourceFmeaId) {
      activeDataset = await prisma.pfmeaMasterDataset.findUnique({
        where: { fmeaId: sourceFmeaId }
      });
      if (!activeDataset) {
        return NextResponse.json({
          success: false,
          error: '해당 FMEA의 기초정보가 없습니다. 먼저 기초정보를 Import해주세요.',
          processes: []
        });
      }
    } else {
      activeDataset = await prisma.pfmeaMasterDataset.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' }
      });
    }

    if (!activeDataset) {
      return NextResponse.json({
        success: false,
        error: '마스터 기초정보가 없습니다. 먼저 기초정보를 Import해주세요.',
        processes: []
      });
    }

    // datasetId만으로 필터 (dataset 자체가 FMEA에 1:1 매핑)
    const flatItemWhere = { datasetId: activeDataset.id };

    // 2. 공정 목록 조회 (A2 = 공정명)
    const processItems = await prisma.pfmeaMasterFlatItem.findMany({
      where: {
        ...flatItemWhere,
        itemCode: 'A2'  // A2 = 공정명
      },
      orderBy: { processNo: 'asc' }
    });

    // ★ 2026-02-16: sourceFmeaId에 해당 데이터 없으면 빈 배열 반환 (다른 FMEA 데이터 오염 방지)
    if (processItems.length === 0 && sourceFmeaId) {
    }

    // 3. 작업요소 조회 (B1 = 작업요소)
    let workElementItems = await prisma.pfmeaMasterFlatItem.findMany({
      where: {
        ...flatItemWhere,
        itemCode: 'B1'  // B1 = 작업요소
      },
      orderBy: { processNo: 'asc' }
    });

    // ★ 2026-02-16: B1도 동일 - 없으면 빈 배열 (다른 FMEA 데이터 오염 방지)
    if (workElementItems.length === 0 && sourceFmeaId) {
    }

    // ★★★ 2026-02-20: B2/B3 완전성 검증 — 누락 데이터 구조 임포트 차단 ★★★
    // B2(작업요소기능) 또는 B3(공정특성)이 없는 B1은 임포트하면 워크시트 구조가 깨짐
    if (workElementItems.length > 0) {
      const [b2Items, b3Items] = await Promise.all([
        prisma.pfmeaMasterFlatItem.findMany({
          where: { ...flatItemWhere, itemCode: 'B2' },
          select: { processNo: true, m4: true },
        }),
        prisma.pfmeaMasterFlatItem.findMany({
          where: { ...flatItemWhere, itemCode: 'B3' },
          select: { processNo: true, m4: true },
        }),
      ]);

      const makeKey = (pNo: string, m4: string | null | undefined) =>
        `${(pNo || '').trim()}|${(m4 || '').trim().toUpperCase()}`;
      const b2Set = new Set(b2Items.map((i: any) => makeKey(i.processNo, i.m4)));
      const b3Set = new Set(b3Items.map((i: any) => makeKey(i.processNo, i.m4)));

      const beforeCount = workElementItems.length;
      workElementItems = workElementItems.filter((item: any) => {
        const key = makeKey(item.processNo, item.m4);
        return b2Set.has(key) && b3Set.has(key);
      });
      const filtered = beforeCount - workElementItems.length;
      if (filtered > 0) {
      }
    }

    // 4. 공정별 데이터 구성
    const COMMON_PROCESS_VALUES = ['0', '00'];
    const isCommon = (pNo: string) => COMMON_PROCESS_VALUES.includes(pNo?.trim() || '');

    // 값 추출 헬퍼
    const extractValue = (val: unknown): string => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (typeof val === 'object' && 'name' in (val as Record<string, unknown>)) {
        return String((val as Record<string, unknown>).name || '');
      }
      return String(val);
    };

    // 4M 추론
    const infer4M = (pNo: string, name: string): string => {
      if (isCommon(pNo)) return 'MN';
      const imKeywords = ['자재', '재료', '부품', '소재', '원자재', '부자재'];
      if (imKeywords.some(kw => name.includes(kw))) return 'IM';
      const enKeywords = ['환경', '온도', '습도', '조건', '분위기', '조명'];
      if (enKeywords.some(kw => name.includes(kw))) return 'EN';
      return 'MC';
    };

    // 공정 맵 생성
    const processMap = new Map<string, ProcessData>();
    
    // 공통공정 작업요소 수집
    const commonWorkElements: WorkElement[] = [];

    // 공정 데이터 구성
    processItems.forEach((item: any) => {
      const pNo = item.processNo || '';
      if (isCommon(pNo)) return;  // 공통공정은 스킵

      const name = extractValue(item.value);
      if (!name || name.includes('입력') || /^\d+$/.test(name)) return;

      if (!processMap.has(pNo)) {
        processMap.set(pNo, {
          no: pNo,
          name: name,
          workElements: []
        });
      }
    });

    // ★ 4M 코드 목록 (B1 value 필터링용)
    const M4_CODES = new Set(['MN', 'MC', 'MD', 'JG', 'IM', 'EN']);

    // 작업요소 배치
    workElementItems.forEach((item: any, idx: number) => {
      const pNo = item.processNo || '';
      const rawName = extractValue(item.value);
      if (!rawName || rawName.includes('입력') || /^\d+$/.test(rawName)) return;
      // ★ 4M 코드가 작업요소 이름으로 잘못 저장된 경우 스킵
      if (M4_CODES.has(rawName.toUpperCase().trim())) return;

      const displayName = pNo && !rawName.startsWith(pNo) ? `${pNo} ${rawName}` : rawName;
      const m4 = item.m4 || infer4M(pNo, rawName);
      // MD, JG → MC 통합
      const normalizedM4 = (m4 === 'MD' || m4 === 'JG') ? 'MC' : m4;

      const workElement: WorkElement = {
        id: item.id || `we_${pNo}_${normalizedM4}_${idx}_${Date.now()}`,
        name: displayName,
        m4: normalizedM4,
        processNo: pNo
      };

      if (isCommon(pNo)) {
        commonWorkElements.push(workElement);
      } else if (processMap.has(pNo)) {
        processMap.get(pNo)!.workElements.push(workElement);
      }
    });

    // ★★★ 2026-02-17: 4M 순서 정렬 (MN→MC→IM→EN) ★★★
    const M4_ORDER: Record<string, number> = { MN: 0, MC: 1, IM: 2, EN: 3 };
    const m4SortVal = (m4: string) => M4_ORDER[m4?.toUpperCase()] ?? 99;

    // 배열로 변환 및 정렬
    const processes = Array.from(processMap.values())
      .sort((a, b) => {
        const numA = parseInt(a.no) || 0;
        const numB = parseInt(b.no) || 0;
        return numA - numB;
      });

    // 각 공정의 workElements를 4M 순서로 정렬
    processes.forEach(proc => {
      proc.workElements.sort((a, b) => m4SortVal(a.m4) - m4SortVal(b.m4));
    });
    commonWorkElements.sort((a, b) => m4SortVal(a.m4) - m4SortVal(b.m4));


    return NextResponse.json({
      success: true,
      processes,
      commonWorkElements,
      masterDatasetId: activeDataset.id,
      masterDatasetName: activeDataset.name
    });

  } catch (error) {
    console.error('❌ 마스터 구조 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: '마스터 구조 조회 중 오류 발생',
      processes: []
    });
  }
}
