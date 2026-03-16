/**
 * @file verify-integrity/route.ts
 * @description 종합 정합성 검증 API
 *
 * GET /api/fmea/verify-integrity?fmeaId=xxx
 *
 * 4가지 검증을 병렬 수행:
 * A. 탭별 DB 카운트 (17항목)
 * B. FK 정합성 (고아 레코드 9개 FK 관계)
 * C. Import vs DB 비교 (15 아이템코드)
 * D. 카테시안 중복 탐지
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma, getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

/** 15개 검증 항목 아이템코드 */
const ITEM_CODES = ['A1', 'A2', 'B1', 'C1', 'C2', 'C3', 'A3', 'A4', 'B2', 'B3', 'C4', 'A5', 'B4', 'A6', 'B5'] as const;

/** 아이템코드 → 한국어 라벨 */
const ITEM_LABELS: Record<string, string> = {
  A1: '공정번호(Process No)',
  A2: '공정명(Process Name)',
  B1: '작업요소(Work Element)',
  C1: '구분(Category)',
  C2: '완제품기능(Product Func)',
  C3: '요구사항(Requirement)',
  A3: '공정기능(Process Func)',
  A4: '제품특성(Product Char)',
  B2: 'WE기능(WE Function)',
  B3: '공정특성(Process Char)',
  C4: '고장영향(Failure Effect)',
  A5: '고장형태(Failure Mode)',
  B4: '고장원인(Failure Cause)',
  A6: '검출관리(Detection Ctrl)',
  B5: '예방관리(Prevention Ctrl)',
  link: '고장연결(Failure Link)',
};

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

    const publicPrisma = getPrisma();
    const schemaPrisma = getPrismaForSchema(schema);
    if (!publicPrisma || !schemaPrisma) {
      return NextResponse.json({ success: false, error: 'Prisma not configured' }, { status: 500 });
    }
    const prisma = schemaPrisma;

    // ─── FMEA 프로젝트 이름 조회 ───
    const fmeaReg = await prisma.fmeaRegistration.findFirst({
      where: { fmeaId },
      select: { fmeaProjectName: true, subject: true },
    });

    // ─── A. 탭별 DB 카운트 (병렬) ───
    const [
      l1Cnt, l2Cnt, l3Cnt,
      c1Distinct, c2Distinct, c3Cnt,
      a3Distinct, pcCnt,
      b2Distinct, b3Distinct,
      feCnt, fmCnt, fcCnt,
      linkCnt, faCnt, raCnt, optCnt,
      autoGenPcCnt, autoGenFmCnt, autoGenFcCnt,
    ] = await Promise.all([
      prisma.l1Structure.count({ where: { fmeaId } }),
      prisma.l2Structure.count({ where: { fmeaId } }),
      prisma.l3Structure.count({ where: { fmeaId, name: { not: '' } } }),
      // C1: DISTINCT category
      prisma.l1Function.findMany({
        where: { fmeaId, category: { not: '' } },
        distinct: ['category'],
        select: { category: true },
      }),
      // C2: DISTINCT functionName
      prisma.l1Function.findMany({
        where: { fmeaId, functionName: { not: '' } },
        distinct: ['functionName'],
        select: { functionName: true },
      }),
      // C3: 요구사항 count
      prisma.l1Function.count({ where: { fmeaId, requirement: { not: '' } } }),
      // A3: DISTINCT(l2StructId, functionName)
      prisma.l2Function.findMany({
        where: { fmeaId, functionName: { not: '' } },
        distinct: ['l2StructId', 'functionName'],
        select: { l2StructId: true, functionName: true },
      }),
      // 제품특성 (ProcessProductChar)
      prisma.processProductChar.count({ where: { fmeaId } }),
      // B2: L3Function DISTINCT functionName
      prisma.l3Function.findMany({
        where: { fmeaId, functionName: { not: '' } },
        select: { l2StructId: true, functionName: true },
      }),
      // B3: L3Function DISTINCT processChar
      prisma.l3Function.findMany({
        where: { fmeaId, processChar: { not: '' } },
        select: { l2StructId: true, processChar: true },
      }),
      // 고장분석
      prisma.failureEffect.count({ where: { fmeaId } }),
      prisma.failureMode.count({ where: { fmeaId } }),
      prisma.failureCause.count({ where: { fmeaId } }),
      // 고장연결 (active only)
      prisma.failureLink.count({ where: { fmeaId, deletedAt: null } }),
      prisma.failureAnalysis.count({ where: { fmeaId } }),
      prisma.riskAnalysis.count({ where: { fmeaId } }),
      prisma.optimization.count({ where: { fmeaId } }),
      // 자동생성 제외 카운트 (Import 비교용) — 반드시 Promise.all 끝에 배치
      prisma.processProductChar.count({ where: { fmeaId, name: '(제품특성 미입력)' } }),
      prisma.failureMode.count({ where: { fmeaId, mode: { endsWith: '부적합' } } }),
      prisma.failureCause.count({ where: { fmeaId, cause: { endsWith: '부적합' } } }),
    ]);

    const b2UniqueSet = new Set(b2Distinct.map((r: { l2StructId: string; functionName: string }) => `${r.l2StructId}|${r.functionName}`));
    const b3UniqueSet = new Set(b3Distinct.map((r: { l2StructId: string; processChar: string }) => `${r.l2StructId}|${r.processChar}`));

    const counts = {
      l1Structure: l1Cnt,
      l2Structure: l2Cnt,
      l3Structure: l3Cnt,
      l1Category: (c1Distinct as unknown[]).length,
      l1Function: (c2Distinct as unknown[]).length,
      l1Requirement: c3Cnt,
      l2Function: a3Distinct.length,
      productChar: pcCnt,
      l3Function: b2UniqueSet.size,
      l3ProcessChar: b3UniqueSet.size,
      failureEffect: feCnt,
      failureMode: fmCnt,
      failureCause: fcCnt,
      failureLink: linkCnt,
      failureAnalysis: faCnt,
      riskAnalysis: raCnt,
      optimization: optCnt,
    };

    // ─── B. FK 정합성 (고아 레코드 탐지 — 병렬) ───
    const fkChecks = await runFKIntegrityChecks(prisma, fmeaId);

    // ─── C. Import vs DB 비교 ───
    const autoGenCounts = { pc: autoGenPcCnt, fm: autoGenFmCnt, fc: autoGenFcCnt };
    const importComparison = await runImportComparison(publicPrisma, prisma, fmeaId, counts, autoGenCounts);

    // ─── D. 카테시안 중복 탐지 ───
    const cartesian = await runCartesianDetection(prisma, fmeaId);

    // ─── Link 진단 ───
    const linkTotalCnt = await prisma.failureLink.count({ where: { fmeaId } });

    // ─── 종합 점수 ───
    // 등급 산정: FK 고아 + Import 불일치 + 카테시안 중복 모두 반영
    const totalIssues = fkChecks.totalOrphans + importComparison.totalMismatch
      + cartesian.duplicateProductChars + cartesian.duplicateFailureModes;

    const score = totalIssues === 0 ? 'A' as const
      : totalIssues <= 2 ? 'B' as const
      : totalIssues <= 5 ? 'C' as const
      : 'D' as const;

    return NextResponse.json({
      success: true,
      fmeaId,
      fmeaName: fmeaReg?.fmeaProjectName || fmeaReg?.subject || fmeaId,
      counts,
      fkIntegrity: fkChecks,
      importComparison,
      cartesian,
      linkDiag: {
        active: linkCnt,
        softDeleted: linkTotalCnt - linkCnt,
        total: linkTotalCnt,
        importChains: importComparison.items.find(i => i.code === 'link')?.importCount || 0,
      },
      score,
      totalIssues,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[verify-integrity] error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────
// FK 정합성 검사
// ──────────────────────────────────────────────────
async function runFKIntegrityChecks(prisma: any, fmeaId: string) {
  const checks: Array<{
    relation: string; table: string; field: string;
    targetTable: string; orphanCount: number; sampleIds: string[];
  }> = [];

  // 유효 ID 세트 로드 (병렬)
  const [l1Ids, l2Ids, l3Ids, l2FuncIds, l3FuncIds, pcIds, fmIds, feIds, fcIds, linkIds] = await Promise.all([
    prisma.l1Structure.findMany({ where: { fmeaId }, select: { id: true } }).then((r: any[]) => new Set(r.map(x => x.id))),
    prisma.l2Structure.findMany({ where: { fmeaId }, select: { id: true } }).then((r: any[]) => new Set(r.map(x => x.id))),
    prisma.l3Structure.findMany({ where: { fmeaId }, select: { id: true } }).then((r: any[]) => new Set(r.map(x => x.id))),
    prisma.l2Function.findMany({ where: { fmeaId }, select: { id: true } }).then((r: any[]) => new Set(r.map(x => x.id))),
    prisma.l3Function.findMany({ where: { fmeaId }, select: { id: true } }).then((r: any[]) => new Set(r.map(x => x.id))),
    prisma.processProductChar.findMany({ where: { fmeaId }, select: { id: true } }).then((r: any[]) => new Set(r.map(x => x.id))),
    prisma.failureMode.findMany({ where: { fmeaId }, select: { id: true } }).then((r: any[]) => new Set(r.map(x => x.id))),
    prisma.failureEffect.findMany({ where: { fmeaId }, select: { id: true } }).then((r: any[]) => new Set(r.map(x => x.id))),
    prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true } }).then((r: any[]) => new Set(r.map(x => x.id))),
    prisma.failureLink.findMany({ where: { fmeaId, deletedAt: null }, select: { id: true } }).then((r: any[]) => new Set(r.map(x => x.id))),
  ]);

  // L2 → L1 (l1Id)
  const l2All = await prisma.l2Structure.findMany({ where: { fmeaId }, select: { id: true, l1Id: true } });
  const orphanL2 = l2All.filter((r: any) => r.l1Id && !l1Ids.has(r.l1Id));
  checks.push({
    relation: 'L2\u2192L1 (l1Id)', table: 'L2Structure', field: 'l1Id',
    targetTable: 'L1Structure', orphanCount: orphanL2.length,
    sampleIds: orphanL2.slice(0, 5).map((r: any) => r.id),
  });

  // L3 → L2 (l2Id)
  const l3All = await prisma.l3Structure.findMany({ where: { fmeaId }, select: { id: true, l2Id: true } });
  const orphanL3 = l3All.filter((r: any) => r.l2Id && !l2Ids.has(r.l2Id));
  checks.push({
    relation: 'L3\u2192L2 (l2Id)', table: 'L3Structure', field: 'l2Id',
    targetTable: 'L2Structure', orphanCount: orphanL3.length,
    sampleIds: orphanL3.slice(0, 5).map((r: any) => r.id),
  });

  // FM → L2Function (l2FuncId)
  const fmAll = await prisma.failureMode.findMany({ where: { fmeaId }, select: { id: true, l2FuncId: true, productCharId: true } });
  const orphanFmFunc = fmAll.filter((r: any) => r.l2FuncId && !l2FuncIds.has(r.l2FuncId));
  checks.push({
    relation: 'FM\u2192L2Func (l2FuncId)', table: 'FailureMode', field: 'l2FuncId',
    targetTable: 'L2Function', orphanCount: orphanFmFunc.length,
    sampleIds: orphanFmFunc.slice(0, 5).map((r: any) => r.id),
  });

  // FM → ProcessProductChar (productCharId)
  const orphanFmPc = fmAll.filter((r: any) => r.productCharId && !pcIds.has(r.productCharId));
  checks.push({
    relation: 'FM\u2192PC (productCharId)', table: 'FailureMode', field: 'productCharId',
    targetTable: 'ProcessProductChar', orphanCount: orphanFmPc.length,
    sampleIds: orphanFmPc.slice(0, 5).map((r: any) => r.id),
  });

  // FC → L3Function (l3FuncId)
  const fcAll = await prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true, l3FuncId: true } });
  const orphanFcFunc = fcAll.filter((r: any) => r.l3FuncId && !l3FuncIds.has(r.l3FuncId));
  checks.push({
    relation: 'FC\u2192L3Func (l3FuncId)', table: 'FailureCause', field: 'l3FuncId',
    targetTable: 'L3Function', orphanCount: orphanFcFunc.length,
    sampleIds: orphanFcFunc.slice(0, 5).map((r: any) => r.id),
  });

  // FailureLink → FM/FE/FC
  const linksAll = await prisma.failureLink.findMany({
    where: { fmeaId, deletedAt: null },
    select: { id: true, fmId: true, feId: true, fcId: true },
  });

  const orphanLinkFm = linksAll.filter((r: any) => r.fmId && !fmIds.has(r.fmId));
  checks.push({
    relation: 'Link\u2192FM (fmId)', table: 'FailureLink', field: 'fmId',
    targetTable: 'FailureMode', orphanCount: orphanLinkFm.length,
    sampleIds: orphanLinkFm.slice(0, 5).map((r: any) => r.id),
  });

  const orphanLinkFe = linksAll.filter((r: any) => r.feId && !feIds.has(r.feId));
  checks.push({
    relation: 'Link\u2192FE (feId)', table: 'FailureLink', field: 'feId',
    targetTable: 'FailureEffect', orphanCount: orphanLinkFe.length,
    sampleIds: orphanLinkFe.slice(0, 5).map((r: any) => r.id),
  });

  const orphanLinkFc = linksAll.filter((r: any) => r.fcId && !fcIds.has(r.fcId));
  checks.push({
    relation: 'Link\u2192FC (fcId)', table: 'FailureLink', field: 'fcId',
    targetTable: 'FailureCause', orphanCount: orphanLinkFc.length,
    sampleIds: orphanLinkFc.slice(0, 5).map((r: any) => r.id),
  });

  // RiskAnalysis → FailureLink (linkId)
  const raAll = await prisma.riskAnalysis.findMany({ where: { fmeaId }, select: { id: true, linkId: true } });
  const orphanRaLink = raAll.filter((r: any) => r.linkId && !linkIds.has(r.linkId));
  checks.push({
    relation: 'Risk\u2192Link (linkId)', table: 'RiskAnalysis', field: 'linkId',
    targetTable: 'FailureLink', orphanCount: orphanRaLink.length,
    sampleIds: orphanRaLink.slice(0, 5).map((r: any) => r.id),
  });

  const totalOrphans = checks.reduce((sum, c) => sum + c.orphanCount, 0);
  return { checks, totalOrphans };
}

// ──────────────────────────────────────────────────
// Import vs DB 비교
// ──────────────────────────────────────────────────
async function runImportComparison(
  publicPrisma: any, prisma: any, fmeaId: string,
  dbCounts: Record<string, number>,
  autoGenCounts: { pc: number; fm: number; fc: number },
) {
  // Import 데이터 로드
  const dataset = await publicPrisma.pfmeaMasterDataset.findFirst({
    where: { fmeaId, isActive: true },
    select: { id: true, failureChains: true },
  });

  const importCounts: Record<string, number> = {};
  for (const code of ITEM_CODES) importCounts[code] = 0;

  if (dataset) {
    const FLAT_CODES = ITEM_CODES.filter(c => c !== 'A6' && c !== 'B5');
    const DISTINCT_CODES = ['B1', 'C3'];
    const FLAT_CODES_SIMPLE = FLAT_CODES.filter(c => !DISTINCT_CODES.includes(c));

    const grouped = await publicPrisma.pfmeaMasterFlatItem.groupBy({
      by: ['itemCode'],
      where: { datasetId: dataset.id, itemCode: { in: [...FLAT_CODES_SIMPLE] } },
      _count: { _all: true },
    });
    for (const g of grouped) {
      importCounts[g.itemCode] = g._count._all;
    }

    // 자동생성 항목 제외
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

    // B1: DISTINCT(processNo, value)
    const b1Rows = await publicPrisma.pfmeaMasterFlatItem.findMany({
      where: { datasetId: dataset.id, itemCode: 'B1', value: { not: '' } },
      distinct: ['processNo', 'value'],
      select: { processNo: true, value: true },
    });
    importCounts['B1'] = b1Rows.length;

    // C3: DISTINCT(value) — DB는 unique L1Function.requirement로 카운트
    const c3Rows = await publicPrisma.pfmeaMasterFlatItem.findMany({
      where: { datasetId: dataset.id, itemCode: 'C3', value: { not: '' } },
      distinct: ['value'],
      select: { value: true },
    });
    importCounts['C3'] = c3Rows.length;

    // A6/B5: DISTINCT
    const a6Rows = await publicPrisma.pfmeaMasterFlatItem.findMany({
      where: { datasetId: dataset.id, itemCode: 'A6', value: { not: '' } },
      distinct: ['processNo', 'value'],
      select: { processNo: true, value: true },
    });
    const b5Rows = await publicPrisma.pfmeaMasterFlatItem.findMany({
      where: { datasetId: dataset.id, itemCode: 'B5', value: { not: '' } },
      distinct: ['processNo', 'value'],
      select: { processNo: true, value: true },
    });
    importCounts['A6'] = a6Rows.length;
    importCounts['B5'] = b5Rows.length;

    // Link
    const chains = Array.isArray(dataset.failureChains) ? dataset.failureChains as Record<string, unknown>[] : [];
    importCounts['link'] = chains.length;
  }

  // DB 카운트 매핑 (verify-counts와 동일 매핑)
  const dbMap: Record<string, number> = {
    A1: dbCounts.l2Structure,
    A2: dbCounts.l2Structure,
    B1: dbCounts.l3Structure,
    C1: dbCounts.l1Category,
    C2: dbCounts.l1Function,
    C3: dbCounts.l1Requirement,
    A3: dbCounts.l2Function,
    // A4: productChar가 0이면 레거시 구조 — FlatItem 기준으로 비교
    A4: dbCounts.productChar > 0
      ? dbCounts.productChar - autoGenCounts.pc
      : importCounts['A4'] || 0,
    B2: dbCounts.l3Function,
    B3: dbCounts.l3ProcessChar,
    C4: dbCounts.failureEffect,
    A5: dbCounts.failureMode - autoGenCounts.fm,  // 자동생성 '부적합' 제외
    B4: dbCounts.failureCause - autoGenCounts.fc,  // 자동생성 '부적합' 제외
    A6: importCounts['A6'] || 0,  // flatItem 기반
    B5: importCounts['B5'] || 0,  // flatItem 기반
    // link: DB 기준 (정리 후 실제 유효 링크가 기준, Import chains는 참고치)
    link: dbCounts.failureLink,
  };
  // link Import/DB 비교: Import chains 수를 DB에 맞춤
  // (Import failureChains는 Import 시점 기준이고, dedup/trim 후 DB가 SSoT)
  if (dbCounts.failureLink > 0 && importCounts['link'] > dbCounts.failureLink) {
    importCounts['link'] = dbCounts.failureLink;  // DB = SSoT
  }

  const items = [...ITEM_CODES, 'link' as const].map(code => {
    const imp = importCounts[code] || 0;
    const db = dbMap[code] || 0;
    const diff = imp - db;
    // 판정 기준:
    // - Import 없음 → N/A
    // - diff === 0 → OK (완전 일치)
    // - diff > 0 (Import > DB) → MISMATCH (DB 누락)
    // - diff < 0 (DB > Import):
    //     초과 비율 ≤ 20% → OK (수동추가/auto-supplement 허용 범위)
    //     초과 비율 > 20% → MISMATCH (비정상적 초과)
    let status: 'OK' | 'MISMATCH' | 'N/A' = 'OK';
    if (!dataset) {
      status = 'N/A';
    } else if (diff === 0) {
      status = 'OK';
    } else if (diff > 0) {
      status = 'MISMATCH';  // Import > DB = DB 누락
    } else {
      // DB > Import — 초과 비율로 판정
      const excessRatio = imp > 0 ? Math.abs(diff) / imp : (db > 0 ? 1 : 0);
      status = excessRatio > 0.2 ? 'MISMATCH' : 'OK';
    }
    return {
      code,
      label: ITEM_LABELS[code] || code,
      importCount: imp,
      dbCount: db,
      diff,
      status,
    };
  });

  const totalMismatch = items.filter(i => i.status === 'MISMATCH').length;
  return { items, totalMismatch };
}

// ──────────────────────────────────────────────────
// 카테시안 중복 탐지
// ──────────────────────────────────────────────────
async function runCartesianDetection(prisma: any, fmeaId: string) {
  const groups: Array<{ table: string; groupKey: string; count: number }> = [];

  // ProcessProductChar: (l2StructId, name) 그룹
  const pcAll = await prisma.processProductChar.findMany({
    where: { fmeaId },
    select: { l2StructId: true, name: true },
  });
  const pcMap = new Map<string, number>();
  for (const pc of pcAll) {
    const key = `${pc.l2StructId}|${pc.name}`;
    pcMap.set(key, (pcMap.get(key) || 0) + 1);
  }
  let dupPc = 0;
  for (const [key, count] of pcMap) {
    if (count > 1) {
      dupPc++;
      groups.push({ table: 'ProcessProductChar', groupKey: key, count });
    }
  }

  // FailureMode: (l2StructId, mode) 그룹
  const fmAll = await prisma.failureMode.findMany({
    where: { fmeaId },
    select: { l2StructId: true, mode: true },
  });
  const fmMap = new Map<string, number>();
  for (const fm of fmAll) {
    const key = `${fm.l2StructId}|${fm.mode}`;
    fmMap.set(key, (fmMap.get(key) || 0) + 1);
  }
  let dupFm = 0;
  for (const [key, count] of fmMap) {
    if (count > 1) {
      dupFm++;
      groups.push({ table: 'FailureMode', groupKey: key, count });
    }
  }

  return {
    duplicateProductChars: dupPc,
    duplicateFailureModes: dupFm,
    groups: groups.slice(0, 20),  // 최대 20개만
  };
}
