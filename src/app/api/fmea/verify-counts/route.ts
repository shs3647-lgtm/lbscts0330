/**
 * @file verify-counts/route.ts
 * @description 12항목 DB 중심 검증 카운트 API
 *
 * GET /api/fmea/verify-counts?fmeaId=xxx
 *
 * Import(PfmeaMasterFlatItem) 건수 vs DB(원자성 테이블) 건수를
 * 12개 아이템코드별로 반환합니다.
 *
 * 파이프라인: Import(엑셀→DB) → 원자성DB(핸들러→테이블) → 워크시트(로드) → 연결(Link)
 * 이 API는 Import·DB 건수를 사실 그대로 반환하여
 * 핸들러 에러/API 에러를 진단할 수 있게 합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma, getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

/** 15개 검증 항목 아이템코드 (A1 공정번호 + A6 검출관리 + B5 예방관리 포함) */
const ITEM_CODES = ['A1', 'A2', 'B1', 'C1', 'C2', 'C3', 'A3', 'A4', 'B2', 'B3', 'C4', 'A5', 'B4', 'A6', 'B5'] as const;
type ItemCode = typeof ITEM_CODES[number];

/** ★ 공통공정 processNo 판별 (buildWorksheetState와 동일 로직) */
function isCommonProcessNo(pNo: string): boolean {
  const p = (pNo || '').trim().toLowerCase();
  return p === '0' || p === '00' || p.includes('공통');
}

/** A/B 카테고리 아이템코드 (공통공정 제외 대상) */
const AB_ITEM_CODES = ['A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4'];

interface VerifyCounts {
  import: Record<ItemCode | 'link', number>;
  db: Record<ItemCode | 'link', number>;
}

export async function GET(request: NextRequest) {
  try {
    const fmeaId = request.nextUrl.searchParams.get('fmeaId')?.toLowerCase();
    if (!fmeaId) {
      return NextResponse.json({ success: false, error: 'fmeaId required' }, { status: 400 });
    }

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) {
      return NextResponse.json({ success: false, error: 'DB not configured' }, { status: 500 });
    }

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });

    // ★ Dual-client 패턴: Import 데이터는 public, 원자성 데이터는 project schema
    const publicPrisma = getPrisma();         // Import 데이터 (PfmeaMasterDataset, PfmeaMasterFlatItem)
    const schemaPrisma = getPrismaForSchema(schema);  // 원자성 테이블 (L2Structure, FailureMode 등)
    if (!publicPrisma || !schemaPrisma) {
      return NextResponse.json({ success: false, error: 'Prisma not configured' }, { status: 500 });
    }
    // ★ 하위 코드에서 기존 'prisma' 변수명 유지 (원자성 DB 쿼리용)
    const prisma = schemaPrisma;

    // ─── 1. Import 건수: PfmeaMasterFlatItem 아이템코드별 레코드 수 ───
    // ★ Import 데이터는 public schema에만 존재 → publicPrisma 사용
    const dataset = await publicPrisma.pfmeaMasterDataset.findFirst({
      where: { fmeaId, isActive: true },
      select: { id: true, failureChains: true },
    });

    const importCounts: Record<string, number> = {};
    for (const code of ITEM_CODES) importCounts[code] = 0;

    if (dataset) {
      // ★★★ 2026-03-03: 공통공정이 00 독립 공정으로 DB에 포함 → 제외 불필요 ★★★
      const FLAT_CODES = ITEM_CODES.filter(c => c !== 'A6' && c !== 'B5');
      const DISTINCT_CODES = ['B1'];
      const FLAT_CODES_SIMPLE = FLAT_CODES.filter(c => !DISTINCT_CODES.includes(c));

      // 전체 아이템 카운트 (공통공정 포함 — DB에도 포함되므로)
      const grouped = await publicPrisma.pfmeaMasterFlatItem.groupBy({
        by: ['itemCode'],
        where: { datasetId: dataset.id, itemCode: { in: [...FLAT_CODES_SIMPLE] } },
        _count: { _all: true },
      });
      for (const g of grouped) {
        importCounts[g.itemCode] = g._count._all;
      }

      // ★★★ 2026-03-05: 자동생성 항목을 Import 카운트에서 제외 ★★★
      // buildWorksheetState 방어 로직이 생성한 "부적합" 항목이 feedback으로 flatData에 추가됨
      // DB 카운트에서도 제외하므로, Import에서도 동일하게 제외해야 일치
      const autoGenA4 = await publicPrisma.pfmeaMasterFlatItem.count({
        where: { datasetId: dataset.id, itemCode: 'A4', value: '(제품특성 미입력)' },
      });
      const autoGenA5 = await publicPrisma.pfmeaMasterFlatItem.count({
        where: { datasetId: dataset.id, itemCode: 'A5', value: { endsWith: '부적합' } },
      });
      const autoGenB4 = await publicPrisma.pfmeaMasterFlatItem.count({
        where: { datasetId: dataset.id, itemCode: 'B4', value: { endsWith: '부적합' } },
      });
      importCounts['A4'] = (importCounts['A4'] || 0) - autoGenA4;
      importCounts['A5'] = (importCounts['A5'] || 0) - autoGenA5;
      importCounts['B4'] = (importCounts['B4'] || 0) - autoGenB4;

      // ★ B1: DISTINCT(processNo, value)
      const b1DistinctRows = await publicPrisma.pfmeaMasterFlatItem.findMany({
        where: { datasetId: dataset.id, itemCode: 'B1', value: { not: '' } },
        distinct: ['processNo', 'value'],
        select: { processNo: true, value: true },
      });
      importCounts['B1'] = b1DistinctRows.length;
      // ★ B2: total count — 커밋 0a1032a8에서 검증 완료 (I=129, D=129)
      // B2는 groupBy에 포함되어 total count로 카운트됨 (DISTINCT 불필요)

      // ★ A6/B5: flatItem DISTINCT(processNo, value) 기반 — 엑셀 원본과 일치
      // chains 기반은 FC dedup으로 같은 PC/DC가 합쳐져 unique 카운트가 줄어듦
      const a6Distinct = await publicPrisma.pfmeaMasterFlatItem.findMany({
        where: { datasetId: dataset.id, itemCode: 'A6', value: { not: '' } },
        distinct: ['processNo', 'value'],
        select: { processNo: true, value: true },
      });
      const b5Distinct = await publicPrisma.pfmeaMasterFlatItem.findMany({
        where: { datasetId: dataset.id, itemCode: 'B5', value: { not: '' } },
        distinct: ['processNo', 'value'],
        select: { processNo: true, value: true },
      });
      importCounts['A6'] = a6Distinct.length;
      importCounts['B5'] = b5Distinct.length;
      // ★ Link: failureChains 총 건수 = Import 연결합계
      const chains = Array.isArray(dataset.failureChains) ? dataset.failureChains as Record<string, unknown>[] : [];
      importCounts['link'] = chains.length;
    }

    // ─── 2. DB 건수: 원자성 테이블 실제 레코드 수 ───
    // ★ C1/C2/C3: L1Function은 (category, functionName, requirement) 트리플로 저장됨
    //   → count(*)=12행이 아닌 DISTINCT 고유값 수를 반환해야 Import와 일치
    const [
      l2Cnt, l3Cnt,
      // ★ A3: DISTINCT(l2StructId, functionName) — Import는 공정기능 텍스트 수
      //   DB L2Function은 (functionName, productChar) 조합당 1행이므로
      //   함수명 기준 DISTINCT로 카운트해야 Import와 일치
      a3Distinct,
      // B2: DISTINCT(l3StructId, functionName) — Import 병합셀 기준
      b2Distinct,
      // ★ B3: DISTINCT(l3StructId, processChar) — Import는 공정특성 텍스트 수
      //   DB L3Function은 (functionName, processChar) 조합당 1행이므로
      //   공정특성 기준 DISTINCT로 카운트해야 Import와 일치
      b3Distinct,
      // C1/C2/C3: 행 수 카운트 (count → number)
      c1Cnt, c2Cnt, c3Cnt,
      // ★ A4: DISTINCT(l2StructId, productChar) — Import는 제품특성 텍스트 수
      a4Distinct,
      feCnt, fmCnt, fcCnt, linkCnt,
    ] = await Promise.all([
      // A2 공정명 → L2Structure
      prisma.l2Structure.count({ where: { fmeaId } }),
      // B1 작업요소명 → L3Structure (빈 이름 placeholder 제외)
      prisma.l3Structure.count({ where: { fmeaId, name: { not: '' } } }),
      // A3 공정기능 → DISTINCT(l2StructId, functionName) — 함수명 기준 중복제거
      prisma.l2Function.findMany({
        where: { fmeaId, functionName: { not: '' } },
        distinct: ['l2StructId', 'functionName'],
        select: { l2StructId: true, functionName: true },
      }),
      // B2 작업요소기능 → 공정(l2) 기준 DISTINCT functionName
      // ★★★ 2026-03-03: WE별(l3StructId) → 공정별(l2StructId) DISTINCT — Import 기준 일치
      prisma.l3Function.findMany({
        where: { fmeaId, functionName: { not: '' } },
        select: { l2StructId: true, functionName: true },
      }),
      // B3 공정특성 → 공정(l2) 기준 DISTINCT processChar
      // ★★★ 2026-03-03: WE별(l3StructId) → 공정별(l2StructId) DISTINCT — Import 기준 일치
      prisma.l3Function.findMany({
        where: { fmeaId, processChar: { not: '' } },
        select: { l2StructId: true, processChar: true },
      }),
      // C1 구분 → DISTINCT(category) — Import는 고유 구분 카운트
      // ★★★ 2026-03-10: L1Function은 (category, functionName, requirement) 트리플
      //   count(*)=행수인데, Import는 고유값 수 → DISTINCT로 통일
      prisma.l1Function.findMany({
        where: { fmeaId, category: { not: '' } },
        distinct: ['category'],
        select: { category: true },
      }),
      // C2 완제품기능 → DISTINCT(functionName) — Import는 고유 기능명 카운트
      prisma.l1Function.findMany({
        where: { fmeaId, functionName: { not: '' } },
        distinct: ['functionName'],
        select: { functionName: true },
      }),
      // C3 요구사항 → L1Function 행 수 (1행=1요구사항이므로 count 유지)
      prisma.l1Function.count({ where: { fmeaId, requirement: { not: '' } } }),
      // A4 제품특성 → 공정(l2) 기준 DISTINCT(productChar) — placeholder 제외
      // ★★★ 2026-03-03: placeholder "(제품특성 미입력)" 제외
      prisma.l2Function.findMany({
        where: { fmeaId, productChar: { not: '', notIn: ['(제품특성 미입력)'] } },
        select: { l2StructId: true, productChar: true },
      }),
      // C4 고장영향 → FailureEffect
      prisma.failureEffect.count({ where: { fmeaId } }),
      // A5 고장형태 → FailureMode (자동생성 "부적합" 제외)
      // ★★★ 2026-03-05: buildWorksheetState orphan PC 방어가 "{pc.name} 부적합" FM 자동생성
      //   → Import 원본에 없는 항목이므로 DB 카운트에서 제외
      prisma.failureMode.count({ where: { fmeaId, mode: { not: { endsWith: '부적합' } } } }),
      // B4 고장원인 → 공정(l2) 기준 DISTINCT(cause) — 자동생성 "부적합" 제외
      // ★★★ 2026-03-05: buildWorksheetState orphan processChar 방어가 "{pc.name} 부적합" FC 자동생성
      //   → Import 원본에 없는 항목이므로 DB 카운트에서 제외
      prisma.failureCause.findMany({
        where: { fmeaId, cause: { not: { endsWith: '부적합' } } },
        select: { l2StructId: true, cause: true },
      }),
      // 연결 → FailureLink (soft delete 제외)
      prisma.failureLink.count({ where: { fmeaId, deletedAt: null } }),
    ]);

    // ★ Link 진단: soft-deleted 건수 + 중복ID 건수 확인
    const linkTotalCnt = await prisma.failureLink.count({ where: { fmeaId } });
    const linkSoftDeleted = linkTotalCnt - linkCnt;  // soft-deleted 건수

    // ★ A6/B5 DB 카운트: flatItem DISTINCT(processNo, value) — Import와 동일 기준
    // A6/B5는 워크시트 원자성 테이블에 별도 저장되지 않으므로 flatItem 기반으로 통일

    // ★★★ 2026-03-03: B2/B3/B4/A4를 공정(l2StructId) 기준 DISTINCT로 카운트 ★★★
    // Import는 공정별 고유값이므로, DB도 공정별 DISTINCT로 카운트해야 일치
    const b2UniqueSet = new Set(b2Distinct.map((r: { l2StructId: string; functionName: string }) => `${r.l2StructId}|${r.functionName}`));
    const b3UniqueSet = new Set(b3Distinct.map((r: { l2StructId: string; processChar: string }) => `${r.l2StructId}|${r.processChar}`));
    const b4UniqueSet = new Set(fcCnt.map((r: { l2StructId: string; cause: string }) => `${r.l2StructId}|${r.cause}`));
    const a4UniqueSet = new Set(a4Distinct.map((r: { l2StructId: string; productChar: string }) => `${r.l2StructId}|${r.productChar}`));

    const dbCounts: Record<string, number> = {
      A1: l2Cnt,  // A1(공정번호) DB 대응 = L2Structure 공정 수
      A2: l2Cnt,
      B1: l3Cnt,
      C1: (c1Cnt as unknown[]).length,
      C2: (c2Cnt as unknown[]).length,
      C3: c3Cnt as number,
      A3: a3Distinct.length,
      A4: a4UniqueSet.size,       // ★ 공정별 DISTINCT(productChar) + placeholder 제외
      B2: b2UniqueSet.size,       // ★ 공정별 DISTINCT(functionName)
      B3: b3UniqueSet.size,       // ★ 공정별 DISTINCT(processChar)
      C4: feCnt,
      A5: fmCnt,
      B4: b4UniqueSet.size,       // ★ 공정별 DISTINCT(cause)
      link: linkCnt,
      A6: importCounts['A6'] || 0,  // ★ flatItem 기반 — Import와 동일
      B5: importCounts['B5'] || 0,  // ★ flatItem 기반 — Import와 동일
    };

    const result: VerifyCounts = {
      import: importCounts as Record<ItemCode | 'link', number>,
      db: dbCounts as Record<ItemCode | 'link', number>,
    };

    return NextResponse.json({
      success: true,
      fmeaId,
      ...result,
      // ★ Link 진단 정보 (Import≠DB 차이 원인 분석용)
      linkDiag: {
        active: linkCnt,          // deletedAt=null (표시되는 DB 카운트)
        softDeleted: linkSoftDeleted,  // deletedAt!=null (소프트 삭제됨)
        total: linkTotalCnt,      // 전체 DB 레코드 수
        importChains: importCounts['link'] || 0,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[verify-counts] error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
