/**
 * @file route.ts
 * @description CP 마스터 데이터 → 워크시트 테이블 저장 API
 * 
 * POST /api/control-plan/master-to-worksheet
 * - CP 마스터 데이터를 워크시트용 테이블(cp_processes, cp_detectors 등)로 변환 저장
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

interface MasterToWorksheetRequest {
  cpNo: string; // CP 번호
  flatData: Array<{
    processNo: string;
    processName?: string; // optional: fallback용
    category: string;
    itemCode: string;
    value: string;
  }>;
}

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ ok: false, error: 'DB 연결 실패' }, { status: 500 });
  }

  try {
    const body = (await req.json()) as MasterToWorksheetRequest;
    const { cpNo, flatData } = body;

    console.log('🔄 [CP Master→Worksheet] 저장 요청:', {
      cpNo,
      flatDataCount: flatData?.length || 0,
      flatDataSample: flatData?.slice(0, 10).map((d: any) => ({
        processNo: d.processNo,
        category: d.category,
        itemCode: d.itemCode,
        value: d.value?.substring(0, 30),
        hasProcessNo: !!d.processNo,
        hasValue: !!d.value,
      })),
      categories: flatData ? [...new Set(flatData.map((d: any) => d.category))] : [],
      itemCodes: flatData ? [...new Set(flatData.map((d: any) => d.itemCode))] : [],
      processNos: flatData ? [...new Set(flatData.map((d: any) => d.processNo).filter((p: any) => p))].slice(0, 10) : [],
    });

    if (!cpNo || !cpNo.trim()) {
      console.error('❌ [CP Master→Worksheet] cpNo 없음');
      return NextResponse.json({ ok: false, error: 'cpNo가 필요합니다' }, { status: 400 });
    }

    if (!flatData || !Array.isArray(flatData) || flatData.length === 0) {
      console.error('❌ [CP Master→Worksheet] flatData 비어있음');
      return NextResponse.json({ ok: false, error: 'flatData가 비어있습니다' }, { status: 400 });
    }

    // 데이터 샘플 로깅
    const categoryCounts = flatData.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('📊 [CP Master→Worksheet] 카테고리별 데이터 개수:', categoryCounts);

    // cpNo 정규화 (대소문자 통일)
    let normalizedCpNo = cpNo.trim();
    console.log('🔍 [CP Master→Worksheet] cpNo 정규화:', {
      original: cpNo,
      normalized: normalizedCpNo,
    });

    // CP 등록정보 확인 (대소문자 구분 없이 검색)
    let registration = await prisma.cpRegistration.findUnique({
      where: { cpNo: normalizedCpNo },
    });

    // 대소문자 불일치 시 재시도
    if (!registration) {
      console.warn('⚠️ [CP Master→Worksheet] 정확한 cpNo로 찾지 못함, 대소문자 변형 시도:', normalizedCpNo);
      const upperCpNo = normalizedCpNo.toUpperCase();
      const lowerCpNo = normalizedCpNo.toLowerCase();
      
      // PostgreSQL은 기본적으로 대소문자 구분하므로 직접 비교
      registration = await prisma.cpRegistration.findFirst({
        where: {
          OR: [
            { cpNo: upperCpNo },
            { cpNo: lowerCpNo },
            { cpNo: normalizedCpNo },
          ],
        },
      });
      
      if (registration) {
        console.log('✅ [CP Master→Worksheet] 대소문자 변형으로 찾음:', {
          searched: normalizedCpNo,
          found: registration.cpNo,
        });
        // 실제 DB의 cpNo로 업데이트
        normalizedCpNo = registration.cpNo;
      }
    }

    if (!registration) {
      console.error('❌ [CP Master→Worksheet] CP 등록정보 없음:', normalizedCpNo);
      // 모든 CP 목록 확인 (디버깅용)
      const allCps = await prisma.cpRegistration.findMany({
        take: 10,
        select: { cpNo: true, subject: true },
      });
      console.error('📋 [CP Master→Worksheet] 등록된 CP 목록:', allCps);
      
      return NextResponse.json({ 
        ok: false, 
        error: `CP 등록정보가 없습니다: ${normalizedCpNo}\n\n등록된 CP: ${allCps.map(cp => cp.cpNo).join(', ')}\n\n먼저 CP 등록 페이지에서 CP를 등록해주세요.` 
      }, { status: 404 });
    }

    console.log('✅ [CP Master→Worksheet] CP 등록정보 확인:', {
      cpNo: registration.cpNo,
      subject: registration.subject,
    });
    
    // 실제 DB의 cpNo 사용 (대소문자 일치)
    const actualCpNo = registration.cpNo;

    // ★ 중요: 카운터 변수를 트랜잭션 밖에서 선언 (스코프 문제 해결)
    let processCount = 0;
    let detectorCount = 0;
    let controlItemCount = 0;
    let controlMethodCount = 0;
    let reactionPlanCount = 0;

    await prisma.$transaction(async (tx: any) => {
      // 기존 워크시트 데이터 삭제 (replace 방식) - 실제 cpNo 사용
      console.log('🗑️ [CP Master→Worksheet] 기존 데이터 삭제:', actualCpNo);
      await tx.cpReactionPlan.deleteMany({ where: { cpNo: actualCpNo } });
      await tx.cpControlMethod.deleteMany({ where: { cpNo: actualCpNo } });
      await tx.cpControlItem.deleteMany({ where: { cpNo: actualCpNo } });
      await tx.cpDetector.deleteMany({ where: { cpNo: actualCpNo } });
      await tx.cpProcess.deleteMany({ where: { cpNo: actualCpNo } });

      // processNo별로 그룹핑 (공정번호 + 카테고리 + 행 인덱스 기준)
      type ProcessData = {
        processNo: string;
        processName: string;
        level?: string;
        processDesc?: string;
        equipment?: string;
        detectors: Array<{ ep?: string; autoDetector?: string }>;
        controlItems: Array<{ productChar?: string; processChar?: string; specialChar?: string; spec?: string }>;
        controlMethods: Array<{ evalMethod?: string; sampleSize?: string; frequency?: string; controlMethod?: string; owner1?: string; owner2?: string }>;
        reactionPlans: Array<{ productChar?: string; processChar?: string; reactionPlan?: string }>;
      };

      const processMap = new Map<string, ProcessData>();

      // 먼저 공정현황 데이터로 프로세스 기본 정보 설정
      // A1 (공정번호)와 A2 (공정명) 모두 확인
      // ★ FMEA 벤치마킹: category 필터링 + itemCode 기준
      const processInfoData = flatData.filter(item => 
        item.category === 'processInfo' && 
        (item.itemCode === 'A1' || item.itemCode === 'A2' || item.itemCode === 'A3' || item.itemCode === 'A4' || item.itemCode === 'A5')
      );
      
      console.log('📋 [CP Master→Worksheet] 공정현황 데이터:', {
        total: processInfoData.length,
        a1Count: processInfoData.filter(i => i.itemCode === 'A1').length,
        a2Count: processInfoData.filter(i => i.itemCode === 'A2').length,
        categories: [...new Set(flatData.map(i => i.category))],
        itemCodes: [...new Set(flatData.map(i => i.itemCode))],
        sample: processInfoData.slice(0, 10).map(i => ({
          processNo: i.processNo,
          category: i.category,
          itemCode: i.itemCode,
          value: i.value?.substring(0, 30),
        })),
        allDataSample: flatData.slice(0, 10).map(i => ({
          processNo: i.processNo,
          category: i.category,
          itemCode: i.itemCode,
          value: i.value?.substring(0, 30),
        })),
      });

      // ★ FMEA 벤치마킹: processNo 추출 방식 개선
      // A1 (공정번호)로 먼저 프로세스 맵 초기화
      // ★ 중요: CP Import에서는 모든 항목에 processNo가 이미 설정되어 있음
      // A1의 value는 공정번호이고, item.processNo도 공정번호임
      // 우선순위: 1) item.processNo (CP Import에서 설정됨), 2) item.value (A1의 경우)
      processInfoData
        .filter(item => item.itemCode === 'A1')
        .forEach((item) => {
          // processNo는 우선순위: 1) item.processNo (CP Import에서 설정), 2) item.value (A1의 값)
          let processNo = '';
          if (item.processNo && item.processNo.trim()) {
            processNo = item.processNo.trim();
          } else if (item.itemCode === 'A1' && item.value && item.value.trim()) {
            processNo = item.value.trim();
          }
          
          if (processNo && !processMap.has(processNo)) {
            processMap.set(processNo, {
              processNo,
              processName: '', // 나중에 A2로 채움
              detectors: [],
              controlItems: [],
              controlMethods: [],
              reactionPlans: [],
            });
            console.log(`📝 [CP Master→Worksheet] 프로세스 맵 추가 (A1):`, {
              processNo,
              fromProcessNo: item.processNo,
              fromValue: item.value,
            });
          }
        });
      
      // ★ 추가: processNo가 없는 경우 전체 flatData에서 processNo 추출 시도
      if (processMap.size === 0) {
        console.warn('⚠️ [CP Master→Worksheet] A1로 processNo를 찾지 못함, 전체 데이터에서 추출 시도');
        
        // 모든 데이터에서 고유한 processNo 추출
        const uniqueProcessNos = new Set<string>();
        flatData.forEach((item) => {
          if (item.processNo && item.processNo.trim()) {
            uniqueProcessNos.add(item.processNo.trim());
          }
          // A1의 value도 확인
          if (item.itemCode === 'A1' && item.value && item.value.trim()) {
            uniqueProcessNos.add(item.value.trim());
          }
        });
        
        console.log('📋 [CP Master→Worksheet] 추출된 processNo 목록:', Array.from(uniqueProcessNos));
        
        // 각 processNo에 대해 프로세스 맵 초기화
        uniqueProcessNos.forEach((processNo) => {
          if (!processMap.has(processNo)) {
            processMap.set(processNo, {
              processNo,
              processName: '',
              detectors: [],
              controlItems: [],
              controlMethods: [],
              reactionPlans: [],
            });
          }
        });
      }

      // A2 (공정명)으로 공정명 설정
      // ★ FMEA 벤치마킹: processNo와 공정명 매칭 로직 개선
      // ★ 중요: CP Import에서는 모든 항목에 processNo가 이미 설정되어 있음
      processInfoData
        .filter(item => item.itemCode === 'A2' && item.value && item.value.trim())
        .forEach((item) => {
          // processNo는 item.processNo (CP Import에서 설정됨)
          let processNo = item.processNo?.trim() || '';
          
          if (!processNo) {
            console.warn('⚠️ [CP Master→Worksheet] A2에 processNo 없음:', {
              itemCode: item.itemCode,
              value: item.value?.substring(0, 30),
              processNo: item.processNo,
              category: item.category,
              fullItem: item,
            });
            return;
          }
          
          const proc = processMap.get(processNo);
          if (proc) {
            proc.processName = item.value.trim();
            console.log(`📝 [CP Master→Worksheet] 공정명 설정:`, {
              processNo,
              processName: item.value.trim(),
              fromProcessNo: item.processNo,
              fromValue: item.value,
            });
          } else {
            // processNo가 없으면 새로 생성
            processMap.set(processNo, {
              processNo,
              processName: item.value.trim(),
              detectors: [],
              controlItems: [],
              controlMethods: [],
              reactionPlans: [],
            });
            console.log(`📝 [CP Master→Worksheet] 프로세스 맵 추가 (A2):`, {
              processNo,
              processName: item.value.trim(),
              fromProcessNo: item.processNo,
              fromValue: item.value,
            });
          }
        });
      
      // ★ 추가: processName이 ImportedData에 있는 경우 사용 (fallback)
      flatData
        .filter(item => item.processName && item.processName.trim() && item.processNo && item.processNo.trim())
        .forEach((item) => {
          const processNo = item.processNo.trim();
          const processName = item.processName!.trim(); // filter에서 이미 검증됨
          const proc = processMap.get(processNo);
          if (proc && !proc.processName) {
            proc.processName = processName;
            console.log(`📝 [CP Master→Worksheet] 공정명 설정 (fallback):`, processNo, '→', processName);
          } else if (!proc) {
            processMap.set(processNo, {
              processNo,
              processName,
              detectors: [],
              controlItems: [],
              controlMethods: [],
              reactionPlans: [],
            });
            console.log(`📝 [CP Master→Worksheet] 프로세스 맵 추가 (fallback):`, processNo, processName);
          }
        });
      
      // ★ 최종 검증: processMap 상태 확인
      console.log('📊 [CP Master→Worksheet] processMap 최종 상태:', {
        size: processMap.size,
        processes: Array.from(processMap.entries()).map(([no, proc]) => ({
          processNo: no,
          processName: proc.processName || '(없음)',
          hasName: !!proc.processName,
        })),
      });

      // 공정현황 다른 필드들 (A3, A4, A5)
      flatData
        .filter(item => item.category === 'processInfo' && item.processNo && item.processNo.trim())
        .forEach((item) => {
          const proc = processMap.get(item.processNo.trim());
          if (!proc) return;

          if (item.itemCode === 'A3' && item.value && item.value.trim()) {
            proc.level = item.value.trim();
          } else if (item.itemCode === 'A4' && item.value && item.value.trim()) {
            proc.processDesc = item.value.trim();
          } else if (item.itemCode === 'A5' && item.value && item.value.trim()) {
            proc.equipment = item.value.trim();
          }
        });

      // 검출장치 데이터 (공정번호별로 그룹핑 - 같은 공정번호의 검출장치 데이터는 하나의 레코드)
      // ★ FMEA 벤치마킹: processNo 추출 방식 개선
      const detectorMap = new Map<string, { ep?: string; autoDetector?: string }>();
      flatData
        .filter(item => item.category === 'detector' && (item.processNo || item.itemCode === 'A1'))
        .forEach((item) => {
          // processNo는 item.processNo 또는 A1의 value
          const processNo = item.processNo?.trim() || 
            (item.itemCode === 'A1' && item.value?.trim()) || '';
          
          if (!processNo) {
            console.warn('⚠️ [CP Master→Worksheet] 검출장치에 processNo 없음:', item);
            return;
          }
          
          const key = processNo;
          if (!detectorMap.has(key)) {
            detectorMap.set(key, {});
          }
          const det = detectorMap.get(key)!;
          if (item.itemCode === 'A6' && item.value && item.value.trim()) {
            det.ep = item.value.trim();
          } else if (item.itemCode === 'A7' && item.value && item.value.trim()) {
            det.autoDetector = item.value.trim();
          }
        });

      // 관리항목/관리방법/대응계획은 행별로 그룹핑 (같은 공정번호 + 카테고리 + 행 인덱스)
      // ★ FMEA 벤치마킹: processNo 추출 방식 개선
      const controlItemMap = new Map<string, { productChar?: string; processChar?: string; specialChar?: string; spec?: string }>();
      flatData
        .filter(item => item.category === 'controlItem' && (item.processNo || item.itemCode === 'A1'))
        .forEach((item) => {
          // processNo는 item.processNo 또는 A1의 value
          const processNo = item.processNo?.trim() || 
            (item.itemCode === 'A1' && item.value?.trim()) || '';
          
          if (!processNo) {
            console.warn('⚠️ [CP Master→Worksheet] 관리항목에 processNo 없음:', item);
            return;
          }
          
          const key = processNo;
          if (!controlItemMap.has(key)) {
            controlItemMap.set(key, {});
          }
          const ci = controlItemMap.get(key)!;
          if (item.itemCode === 'B1' && item.value && item.value.trim()) {
            ci.productChar = item.value.trim();
          } else if (item.itemCode === 'B2' && item.value && item.value.trim()) {
            ci.processChar = item.value.trim();
          } else if (item.itemCode === 'B3' && item.value && item.value.trim()) {
            ci.specialChar = item.value.trim();
          } else if (item.itemCode === 'B4' && item.value && item.value.trim()) {
            ci.spec = item.value.trim();
          }
        });

      const controlMethodMap = new Map<string, { evalMethod?: string; sampleSize?: string; frequency?: string; controlMethod?: string; owner1?: string; owner2?: string }>();
      flatData
        .filter(item => item.category === 'controlMethod' && (item.processNo || item.itemCode === 'A1'))
        .forEach((item) => {
          // processNo는 item.processNo 또는 A1의 value
          const processNo = item.processNo?.trim() || 
            (item.itemCode === 'A1' && item.value?.trim()) || '';
          
          if (!processNo) {
            console.warn('⚠️ [CP Master→Worksheet] 관리방법에 processNo 없음:', item);
            return;
          }
          
          const key = processNo;
          if (!controlMethodMap.has(key)) {
            controlMethodMap.set(key, {});
          }
          const cm = controlMethodMap.get(key)!;
          if (item.itemCode === 'B5' && item.value && item.value.trim()) {
            cm.evalMethod = item.value.trim();
          } else if (item.itemCode === 'B6' && item.value && item.value.trim()) {
            cm.sampleSize = item.value.trim();
          } else if (item.itemCode === 'B7' && item.value && item.value.trim()) {
            cm.frequency = item.value.trim();
          } else if (item.itemCode === 'B7-1' && item.value && item.value.trim()) {
            cm.controlMethod = item.value.trim(); // 관리방법
          } else if (item.itemCode === 'B8' && item.value && item.value.trim()) {
            cm.owner1 = item.value.trim();
          } else if (item.itemCode === 'B9' && item.value && item.value.trim()) {
            cm.owner2 = item.value.trim();
          }
        });

      const reactionPlanMap = new Map<string, { productChar?: string; processChar?: string; reactionPlan?: string }>();
      flatData
        .filter(item => item.category === 'reactionPlan' && (item.processNo || item.itemCode === 'A1'))
        .forEach((item) => {
          // processNo는 item.processNo 또는 A1의 value
          const processNo = item.processNo?.trim() || 
            (item.itemCode === 'A1' && item.value?.trim()) || '';
          
          if (!processNo) {
            console.warn('⚠️ [CP Master→Worksheet] 대응계획에 processNo 없음:', item);
            return;
          }
          
          const key = processNo;
          if (!reactionPlanMap.has(key)) {
            reactionPlanMap.set(key, {});
          }
          const rp = reactionPlanMap.get(key)!;
          if (item.itemCode === 'B1' && item.value && item.value.trim()) {
            rp.productChar = item.value.trim();
          } else if (item.itemCode === 'B2' && item.value && item.value.trim()) {
            rp.processChar = item.value.trim();
          } else if (item.itemCode === 'B10' && item.value && item.value.trim()) {
            rp.reactionPlan = item.value.trim();
          }
        });

      // 프로세스마다 검출장치/관리항목/관리방법/대응계획 연결
      processMap.forEach((proc) => {
        const det = detectorMap.get(proc.processNo);
        if (det && (det.ep || det.autoDetector)) {
          proc.detectors.push(det);
        }

        const ci = controlItemMap.get(proc.processNo);
        if (ci && (ci.productChar || ci.processChar || ci.specialChar || ci.spec)) {
          proc.controlItems.push(ci);
        }

        const cm = controlMethodMap.get(proc.processNo);
        if (cm && (cm.evalMethod || cm.sampleSize || cm.frequency || cm.owner1 || cm.owner2)) {
          proc.controlMethods.push(cm);
        }

        const rp = reactionPlanMap.get(proc.processNo);
        if (rp && (rp.productChar || rp.processChar || rp.reactionPlan)) {
          proc.reactionPlans.push(rp);
        }
      });

      // 워크시트 테이블에 저장
      // ★ 카운터는 트랜잭션 밖에서 선언되었으므로 여기서는 초기화만
      processCount = 0;
      detectorCount = 0;
      controlItemCount = 0;
      controlMethodCount = 0;
      reactionPlanCount = 0;
      
      console.log('📊 [CP Master→Worksheet] 저장 시작 전 카운터 초기화:', {
        processCount,
        detectorCount,
        controlItemCount,
        controlMethodCount,
        reactionPlanCount,
      });

      if (processMap.size === 0) {
        console.error('❌ [CP Master→Worksheet] 변환된 프로세스 데이터 없음');
        console.error('📋 [CP Master→Worksheet] 원본 데이터 샘플:', flatData.slice(0, 20));
        console.error('📋 [CP Master→Worksheet] 카테고리별 데이터:', {
          processInfo: flatData.filter(i => i.category === 'processInfo').length,
          detector: flatData.filter(i => i.category === 'detector').length,
          controlItem: flatData.filter(i => i.category === 'controlItem').length,
          controlMethod: flatData.filter(i => i.category === 'controlMethod').length,
          reactionPlan: flatData.filter(i => i.category === 'reactionPlan').length,
        });
        console.error('📋 [CP Master→Worksheet] itemCode별 데이터:', {
          A1: flatData.filter(i => i.itemCode === 'A1').length,
          A2: flatData.filter(i => i.itemCode === 'A2').length,
        });
        console.error('📋 [CP Master→Worksheet] processNo 추출 시도:', {
          withProcessNo: flatData.filter(i => i.processNo && i.processNo.trim()).length,
          withA1Value: flatData.filter(i => i.itemCode === 'A1' && i.value && i.value.trim()).length,
        });
        
        return NextResponse.json({ 
          ok: false, 
          error: `변환된 프로세스 데이터가 없습니다.\n\n원인 분석:\n- processInfo 데이터: ${flatData.filter(i => i.category === 'processInfo').length}건\n- A1 (공정번호): ${flatData.filter(i => i.itemCode === 'A1').length}건\n- A2 (공정명): ${flatData.filter(i => i.itemCode === 'A2').length}건\n- processNo 있는 데이터: ${flatData.filter(i => i.processNo && i.processNo.trim()).length}건\n\n공정번호(A1)와 공정명(A2) 데이터를 확인해주세요.` 
        }, { status: 400 });
      }

      console.log(`📊 [CP Master→Worksheet] 변환된 데이터:`, {
        processMapSize: processMap.size,
        processes: Array.from(processMap.values()).map(p => ({
          processNo: p.processNo,
          processName: p.processName,
          detectors: p.detectors.length,
          controlItems: p.controlItems.length,
          controlMethods: p.controlMethods.length,
          reactionPlans: p.reactionPlans.length,
        })),
      });

      console.log(`🚀 [CP Master→Worksheet] 저장 시작: processMap.size = ${processMap.size}, actualCpNo = ${actualCpNo}`);

      // ★ 중요: processNo 기준으로 정렬 (숫자 정렬 - "10" < "20" < "100")
      // Map을 배열로 변환 후 processNo 기준 오름차순 정렬
      const sortedProcessEntries = Array.from(processMap.entries()).sort((a, b) => {
        const numA = parseInt(a[0], 10);
        const numB = parseInt(b[0], 10);
        // 숫자로 변환 가능한 경우 숫자 비교, 아니면 문자열 비교
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a[0].localeCompare(b[0], undefined, { numeric: true });
      });

      console.log('📋 [CP Master→Worksheet] 정렬된 공정 순서:', sortedProcessEntries.map(([no, proc]) => ({
        processNo: no,
        processName: proc.processName,
      })));

      // ★ CP 등록정보/CFT 벤치마킹: 트랜잭션 전에 실제 cpNo 확인
      const verifyCpNo = await prisma.cpRegistration.findUnique({
        where: { cpNo: actualCpNo },
        select: { cpNo: true, id: true, subject: true },
      });
      
      if (!verifyCpNo) {
        console.error(`❌ [CP Master→Worksheet] CP 등록정보 없음: ${actualCpNo}`);
        
        // 등록된 CP 목록 확인
        const allCps = await prisma.cpRegistration.findMany({
          take: 10,
          select: { cpNo: true, subject: true },
        });
        
        return NextResponse.json({ 
          ok: false, 
          error: `CP 등록정보가 없습니다: ${actualCpNo}\n\n등록된 CP: ${allCps.map(cp => `${cp.cpNo} (${cp.subject || '제목 없음'})`).join(', ')}\n\n먼저 CP 등록 페이지에서 CP를 등록해주세요.`,
          debug: {
            requestedCpNo: actualCpNo,
            registeredCps: allCps.map(cp => cp.cpNo),
          }
        }, { status: 404 });
      }
      
      console.log(`✅ [CP Master→Worksheet] CP 등록정보 확인:`, {
        cpNo: verifyCpNo.cpNo,
        id: verifyCpNo.id,
        subject: verifyCpNo.subject,
      });
      
      // ★ 정렬된 순서대로 순회 (sortedProcessEntries 사용)
      for (const [processNo, proc] of sortedProcessEntries) {
        console.log(`📝 [CP Master→Worksheet] 처리 중: processNo=${processNo}, processName=${proc.processName || '(없음)'}`);
        
        // ★ 수정: 공정명이 없어도 공정번호가 있으면 저장 (공정번호를 이름으로 대체)
        const finalProcessName = (proc.processName && proc.processName.trim()) 
          ? proc.processName.trim() 
          : `공정 ${processNo}`;

        try {
          // CpProcess 저장 (실제 cpNo 사용)
          const savedProcess = await tx.cpProcess.create({
            data: {
              cpNo: actualCpNo,
              processNo: processNo.trim(),
              processName: finalProcessName,
              level: proc.level?.trim() || null,
              processDesc: proc.processDesc?.trim() || null,
              equipment: proc.equipment?.trim() || null,
              sortOrder: processCount++,
            },
          });
          console.log(`✅ [CP Master→Worksheet] CpProcess 저장 성공:`, {
            id: savedProcess.id,
            cpNo: savedProcess.cpNo,
            processNo: savedProcess.processNo,
            processName: savedProcess.processName,
            currentProcessCount: processCount,
          });

          // CpDetector 저장
          if (proc.detectors.length > 0) {
            for (const det of proc.detectors) {
              await tx.cpDetector.create({
                data: {
                  cpNo: actualCpNo,
                  processNo: processNo.trim(),
                  ep: det.ep?.trim() || null,
                  autoDetector: det.autoDetector?.trim() || null,
                  sortOrder: detectorCount++,
                },
              });
            }
            console.log(`✅ [CP Master→Worksheet] CpDetector 저장:`, processNo, proc.detectors.length, '개');
          }

          // CpControlItem 저장
          if (proc.controlItems.length > 0) {
            for (const ci of proc.controlItems) {
              await tx.cpControlItem.create({
                data: {
                  cpNo: actualCpNo,
                  processNo: processNo.trim(),
                  productChar: ci.productChar?.trim() || null,
                  processChar: ci.processChar?.trim() || null,
                  specialChar: ci.specialChar?.trim() || null,
                  spec: ci.spec?.trim() || null,
                  sortOrder: controlItemCount++,
                },
              });
            }
            console.log(`✅ [CP Master→Worksheet] CpControlItem 저장:`, processNo, proc.controlItems.length, '개');
          }

          // CpControlMethod 저장
          if (proc.controlMethods.length > 0) {
            for (const cm of proc.controlMethods) {
              await tx.cpControlMethod.create({
                data: {
                  cpNo: actualCpNo,
                  processNo: processNo.trim(),
                  evalMethod: cm.evalMethod?.trim() || null,
                  sampleSize: cm.sampleSize?.trim() || null,
                  frequency: cm.frequency?.trim() || null,
                  controlMethod: cm.controlMethod?.trim() || null, // 관리방법 (B7-1)
                  owner1: cm.owner1?.trim() || null,
                  owner2: cm.owner2?.trim() || null,
                  sortOrder: controlMethodCount++,
                },
              });
            }
            console.log(`✅ [CP Master→Worksheet] CpControlMethod 저장:`, processNo, proc.controlMethods.length, '개');
          }

          // CpReactionPlan 저장
          if (proc.reactionPlans.length > 0) {
            for (const rp of proc.reactionPlans) {
              await tx.cpReactionPlan.create({
                data: {
                  cpNo: actualCpNo,
                  processNo: processNo.trim(),
                  productChar: rp.productChar?.trim() || null,
                  processChar: rp.processChar?.trim() || null,
                  reactionPlan: rp.reactionPlan?.trim() || null,
                  sortOrder: reactionPlanCount++,
                },
              });
            }
            console.log(`✅ [CP Master→Worksheet] CpReactionPlan 저장:`, processNo, proc.reactionPlans.length, '개');
          }
        } catch (rowError: any) {
          console.error(`❌ [CP Master→Worksheet] 행 저장 오류 (processNo: ${processNo}):`, rowError);
          throw rowError; // 트랜잭션 롤백을 위해 에러 재발생
        }
      }

      console.log(`✅ [CP Master→Worksheet] 저장 완료:`, {
        cpNo: actualCpNo,
        processes: processCount,
        detectors: detectorCount,
        controlItems: controlItemCount,
        controlMethods: controlMethodCount,
        reactionPlans: reactionPlanCount,
      });

      // 저장 후 실제 DB에서 확인 (실제 cpNo 사용)
      const savedProcesses = await tx.cpProcess.findMany({
        where: { cpNo: actualCpNo },
        take: 5,
      });
      const savedDetectors = await tx.cpDetector.findMany({
        where: { cpNo: actualCpNo },
        take: 5,
      });
      const savedControlItems = await tx.cpControlItem.findMany({
        where: { cpNo: actualCpNo },
        take: 5,
      });
      const savedControlMethods = await tx.cpControlMethod.findMany({
        where: { cpNo: actualCpNo },
        take: 5,
      });
      const savedReactionPlans = await tx.cpReactionPlan.findMany({
        where: { cpNo: actualCpNo },
        take: 5,
      });

      console.log(`🔍 [CP Master→Worksheet] 저장 검증 (트랜잭션 내부):`, {
        cpNo: actualCpNo,
        processCount,
        detectorCount,
        controlItemCount,
        controlMethodCount,
        reactionPlanCount,
        processesInDB: savedProcesses.length,
        detectorsInDB: savedDetectors.length,
        controlItemsInDB: savedControlItems.length,
        controlMethodsInDB: savedControlMethods.length,
        reactionPlansInDB: savedReactionPlans.length,
        sampleProcess: savedProcesses[0] ? {
          id: savedProcesses[0].id,
          cpNo: savedProcesses[0].cpNo,
          processNo: savedProcesses[0].processNo,
          processName: savedProcesses[0].processName,
        } : null,
      });

      // 저장 실패 시 에러
      if (processCount === 0) {
        console.error('❌ [CP Master→Worksheet] processCount가 0입니다. 저장된 데이터가 없습니다.');
        throw new Error('공정 데이터가 저장되지 않았습니다. 데이터 변환 로직을 확인해주세요.');
      }
      
      // ★ 중요: DB에 실제로 저장되었는지 확인
      if (savedProcesses.length === 0) {
        console.error('❌ [CP Master→Worksheet] DB 조회 결과 저장된 데이터가 없습니다.');
        throw new Error('DB에 데이터가 저장되지 않았습니다. 트랜잭션 롤백되었을 수 있습니다.');
      }
      
      console.log(`✅ [CP Master→Worksheet] 트랜잭션 내부 검증 완료: ${savedProcesses.length}개 공정 저장 확인`);
    });
    
    // ★ 중요: 트랜잭션 외부에서 최종 카운터 확인
    console.log(`🔍 [CP Master→Worksheet] 트랜잭션 외부 최종 카운터:`, {
      processCount,
      detectorCount,
      controlItemCount,
      controlMethodCount,
      reactionPlanCount,
    });

    // ★ 중요: 트랜잭션 외부에서 실제 DB 조회로 최종 검증
    const finalProcesses = await prisma.cpProcess.findMany({
      where: { cpNo: actualCpNo },
    });
    const finalDetectors = await prisma.cpDetector.findMany({
      where: { cpNo: actualCpNo },
    });
    const finalControlItems = await prisma.cpControlItem.findMany({
      where: { cpNo: actualCpNo },
    });
    const finalControlMethods = await prisma.cpControlMethod.findMany({
      where: { cpNo: actualCpNo },
    });
    const finalReactionPlans = await prisma.cpReactionPlan.findMany({
      where: { cpNo: actualCpNo },
    });

    console.log(`✅ [CP Master→Worksheet] 트랜잭션 외부 최종 DB 검증:`, {
      cpNo: actualCpNo,
      processes: finalProcesses.length,
      detectors: finalDetectors.length,
      controlItems: finalControlItems.length,
      controlMethods: finalControlMethods.length,
      reactionPlans: finalReactionPlans.length,
      sampleProcess: finalProcesses[0] ? {
        id: finalProcesses[0].id,
        cpNo: finalProcesses[0].cpNo,
        processNo: finalProcesses[0].processNo,
        processName: finalProcesses[0].processName,
      } : null,
    });

    // 최종 검증 실패 시 에러
    if (finalProcesses.length === 0) {
      console.error('❌ [CP Master→Worksheet] 트랜잭션 외부 DB 조회 결과 저장된 데이터가 없습니다.');
      return NextResponse.json({
        ok: false,
        error: 'DB에 데이터가 저장되지 않았습니다. 트랜잭션이 롤백되었거나 저장에 실패했습니다.',
        debug: {
          cpNo: actualCpNo,
          processCount,
          finalProcessesCount: finalProcesses.length,
        }
      }, { status: 500 });
    }

    // ★ ControlPlanItem 테이블에도 저장 (워크시트 페이지에서 사용)
    // ControlPlan 조회 또는 생성
    let controlPlan = await prisma.controlPlan.findFirst({
      where: { cpNo: actualCpNo },
    });

    if (!controlPlan) {
      // ControlPlan이 없으면 생성
      // CpRegistration 필드: fmeaId, fmeaNo, subject, customerName
      controlPlan = await prisma.controlPlan.create({
        data: {
          cpNo: actualCpNo,
          fmeaId: registration.fmeaId || 'import', // fmeaId는 필수 필드
          fmeaNo: registration.fmeaNo || '',
          partName: registration.subject || '', // subject를 partName으로 사용
          partNo: '',
          customer: registration.customerName || '',
          syncStatus: 'synced',
        },
      });
      console.log(`✅ [CP Master→Worksheet] ControlPlan 생성:`, controlPlan.cpNo);
    }

    // 기존 ControlPlanItem 삭제
    await prisma.controlPlanItem.deleteMany({
      where: { cpId: controlPlan.id },
    });

    // ★ processNo 기준으로 정렬하여 ControlPlanItem 생성
    const sortedProcesses = [...finalProcesses].sort((a, b) => {
      const numA = parseInt(a.processNo, 10);
      const numB = parseInt(b.processNo, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.processNo.localeCompare(b.processNo, undefined, { numeric: true });
    });

    // ControlPlanItem 생성 (processNo 순서대로)
    let itemSortOrder = 0;
    for (const proc of sortedProcesses) {
      // 해당 공정의 검출장치/관리항목/관리방법/대응계획 조회
      const detector = finalDetectors.find(d => d.processNo === proc.processNo);
      const ci = finalControlItems.find(c => c.processNo === proc.processNo);
      const cm = finalControlMethods.find(m => m.processNo === proc.processNo);
      const rp = finalReactionPlans.find(r => r.processNo === proc.processNo);

      await prisma.controlPlanItem.create({
        data: {
          cpId: controlPlan.id,
          processNo: proc.processNo,
          processName: proc.processName || '',
          processLevel: proc.level || 'Main',
          processDesc: proc.processDesc || '',
          workElement: '',
          detectorNo: false,
          detectorEp: !!detector?.ep,
          detectorAuto: !!detector?.autoDetector,
          productChar: ci?.productChar || '',
          processChar: ci?.processChar || '',
          specialChar: ci?.specialChar || '',
          specTolerance: ci?.spec || '',
          evalMethod: cm?.evalMethod || '',
          sampleSize: cm?.sampleSize || '',
          sampleFreq: cm?.frequency || '',
          controlMethod: '', // controlMethod 필드는 별도 (관리방법)
          owner1: cm?.owner1 || '',
          owner2: cm?.owner2 || '',
          reactionPlan: rp?.reactionPlan || '',
          linkStatus: 'new',
          sortOrder: itemSortOrder++,
        },
      });
    }

    console.log(`✅ [CP Master→Worksheet] ControlPlanItem 저장 완료: ${itemSortOrder}개`);

    // 저장된 ControlPlanItem 확인
    const savedItems = await prisma.controlPlanItem.findMany({
      where: { cpId: controlPlan.id },
      orderBy: { sortOrder: 'asc' },
    });
    console.log(`✅ [CP Master→Worksheet] ControlPlanItem DB 확인: ${savedItems.length}개, 첫번째: ${savedItems[0]?.processNo} ${savedItems[0]?.processName}`);

    return NextResponse.json({
      ok: true,
      message: '워크시트 테이블 저장 완료',
      counts: {
        processes: finalProcesses.length,
        detectors: finalDetectors.length,
        controlItems: finalControlItems.length,
        controlMethods: finalControlMethods.length,
        reactionPlans: finalReactionPlans.length,
        worksheetItems: savedItems.length, // ★ 워크시트 아이템 수 추가
      },
      debug: {
        cpNo: actualCpNo,
        controlPlanId: controlPlan.id,
        processCount,
        finalProcessesCount: finalProcesses.length,
        worksheetItemsCount: savedItems.length,
        firstItem: savedItems[0] ? { processNo: savedItems[0].processNo, processName: savedItems[0].processName } : null,
      }
    });

  } catch (error: any) {
    console.error('❌ [CP Master→Worksheet] 저장 오류:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || '저장 실패' 
    }, { status: 500 });
  }
}

