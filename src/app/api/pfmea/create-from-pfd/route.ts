/**
 * @file create-from-pfd/route.ts
 * @description PFD에서 PFMEA 신규 생성 API
 * @version 2.1.0
 * @updated 2026-02-01
 * 
 * PFD 워크시트 데이터를 기반으로 새로운 PFMEA를 생성합니다.
 * - 공정번호, 공정명 → L2 (구조분석)
 * - 작업요소 → L3 (구조분석)
 * - 특성정보 → 기능분석 기초 데이터
 * 
 * ★★★ 2026-02-01 수정: DB에 직접 저장 (localStorage 임시, DB 영구) ★★★
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

interface PfdItem {
  processNo: string;
  processName: string;
  processLevel: string;
  processDesc: string;
  partName?: string;   // ★ 부품명 (PFD와 동일)
  workElement?: string; // 작업요소 (구버전 호환)
  equipment: string;
  productSC?: string;
  productChar: string;
  processSC?: string;
  processChar: string;
}

interface L3WorkElement {
  id: string;
  m4: string;
  name: string;
  order: number;
  functions: any[];
  processChars: string[];
}

interface L2Process {
  id: string;
  no: string;
  name: string;
  level: string;
  desc: string;
  order: number;
  functions: any[];
  productChars: string[];
  l3: L3WorkElement[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pfdNo, fmeaId, items, subject, customer } = body;

    if (!pfdNo) {
      return NextResponse.json(
        { success: false, error: 'pfdNo is required' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'items array is required' },
        { status: 400 }
      );
    }

    // PFD 데이터를 FMEA L2/L3 구조로 변환
    // ★ L1 = 품명(subject), L2 = 공정, L3 = 설비/금형/지그(equipment)
    const processMap = new Map<string, L2Process>();
    let processOrder = 10;

    items.forEach((item: PfdItem, idx: number) => {
      const processKey = `${item.processNo}-${item.processName}`;

      if (!processMap.has(processKey)) {
        processMap.set(processKey, {
          id: `l2-${Date.now()}-${idx}`,
          no: item.processNo || '',
          name: item.processName || '',
          level: item.processLevel || 'Main',
          desc: item.processDesc || '',
          order: processOrder,
          functions: [],
          productChars: [],
          l3: []
        });
        processOrder += 10;
      }

      const process = processMap.get(processKey)!;

      // 제품특성 추가 (중복 제거)
      if (item.productChar && item.productChar.trim()) {
        const productCharStr = item.productSC
          ? `[${item.productSC}] ${item.productChar}`
          : item.productChar;
        if (!process.productChars.includes(productCharStr)) {
          process.productChars.push(productCharStr);
        }
      }

      // ★ L3 = equipment (설비/금형/지그) - 사용자 요구사항
      const equipmentName = item.equipment || '';

      if (equipmentName.trim()) {
        const existingL3 = process.l3.find((l3) => l3.name === equipmentName);

        if (!existingL3) {
          const newL3: L3WorkElement = {
            id: `l3-${Date.now()}-${process.l3.length}`,
            m4: 'MC',  // ★ MC(Machine/설비) 고정
            name: equipmentName,
            order: (process.l3.length + 1) * 10,
            functions: [],
            processChars: []
          };

          // 공정특성 추가
          if (item.processChar && item.processChar.trim()) {
            const processCharStr = item.processSC
              ? `[${item.processSC}] ${item.processChar}`
              : item.processChar;
            newL3.processChars.push(processCharStr);
          }

          process.l3.push(newL3);
        } else {
          // 기존 L3에 공정특성 추가 (중복 제거)
          if (item.processChar && item.processChar.trim()) {
            const processCharStr = item.processSC
              ? `[${item.processSC}] ${item.processChar}`
              : item.processChar;
            if (!existingL3.processChars.includes(processCharStr)) {
              existingL3.processChars.push(processCharStr);
            }
          }
        }
      }
    });

    const l2Structures = Array.from(processMap.values());

    // 대상 FMEA ID 생성 (pfd-26-p001-l01 → pfm26-p001-l01)
    const targetFmeaId = fmeaId || pfdNo.replace(/^pfd-(\d+)-/i, 'pfm$1-').toLowerCase();

    // FMEA 워크시트 초기 상태 생성
    // ★ L1 = "품명 생산공정" 형식으로 표시 (예: 도어패널 생산공정)
    const l1Name = subject ? `${subject} 생산공정` : `PFD연동_${pfdNo}`;

    // ★★★ 2026-02-02: L1 기본 types/functions 추가 (CP→FMEA와 동일) ★★★
    const defaultL1Type = {
      id: `type-${Date.now()}`,
      name: 'YP',  // 기본 구분
      functions: [{
        id: `func-${Date.now()}`,
        name: '(기능 입력)',
        requirements: [{
          id: `req-${Date.now()}`,
          name: '(요구사항 입력)',
        }],
      }],
    };

    const worksheetState = {
      l1: {
        name: l1Name,  // ★ 품명+생산공정
        completedProductName: l1Name,
        type: '',
        productFunction: '',
        productFailure: '',
        types: [defaultL1Type],  // ★ 기본 구분 추가
        failureScopes: [],       // ★ 고장영향 배열 초기화
      },
      l2: l2Structures,
      tab: 'structure',  // 구조분석 탭으로 시작 (고장연결은 구조분석에서)
      search: '',
      visibleSteps: [2, 3, 4, 5, 6],
      _createdFromPfd: true,
      _pfdNo: pfdNo,
      _createdAt: new Date().toISOString(),
    };

    // ★★★ DB에 직접 저장 (영구 저장) ★★★
    let dbSaveSuccess = false;
    try {
      const baseUrl = getBaseDatabaseUrl();
      if (baseUrl) {
        const schema = getProjectSchemaName(targetFmeaId);
        await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
        const prisma = getPrismaForSchema(schema);

        if (prisma) {
          // FmeaLegacyData 테이블에 레거시 데이터 저장 (Single Source of Truth)
          await prisma.fmeaLegacyData.upsert({
            where: { fmeaId: targetFmeaId },
            create: {
              fmeaId: targetFmeaId,
              version: '1.0.0',
              data: JSON.parse(JSON.stringify(worksheetState)),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            update: {
              data: JSON.parse(JSON.stringify(worksheetState)),
              updatedAt: new Date(),
            },
          });

          dbSaveSuccess = true;
        }
      }
    } catch (dbError: any) {
    }

    // localStorage 저장 키 (클라이언트에서 처리 - 임시 저장용)
    const localStorageKey = `pfmea_worksheet_${targetFmeaId}`;

    return NextResponse.json({
      success: true,
      message: `PFD에서 새 FMEA를 생성했습니다. (${l2Structures.length}개 공정, ${l2Structures.reduce((sum, l2) => sum + l2.l3.length, 0)}개 작업요소)`,
      data: {
        fmeaId: targetFmeaId,
        pfdNo,
        l2Count: l2Structures.length,
        l3Count: l2Structures.reduce((sum, l2) => sum + l2.l3.length, 0),
        worksheetState,
        localStorageKey,
        redirectUrl: `/pfmea/worksheet?id=${targetFmeaId}&tab=structure&fromPfd=${pfdNo}`,
        createdAt: new Date().toISOString(),
        dbSaveSuccess,  // ★ DB 저장 성공 여부 반환
      }
    });

  } catch (error: any) {
    console.error('[PFD→FMEA 생성] 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}