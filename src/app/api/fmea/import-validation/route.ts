/**
 * @file import-validation/route.ts
 * @description Import 검증 결과 조회/실행 API
 *
 * GET  /api/fmea/import-validation?jobId=xxx   → 해당 job의 validation 전체 반환
 * GET  /api/fmea/import-validation?fmeaId=xxx  → 해당 fmea의 최신 job의 validation 반환
 * POST /api/fmea/import-validation             → 검증 실행 + 결과 저장
 *      body: { fmeaId, jobId? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaAny = any;

// ─── 검증 결과 타입 ───
interface ValidationRecord {
  ruleId: string;
  target: string;
  level: 'ERROR' | 'WARN' | 'INFO';
  message: string;
  autoFixed: boolean;
}

// ─── 16개 검증 규칙 실행 ───

async function runValidationRules(
  prisma: PrismaAny,
  fmeaId: string,
): Promise<ValidationRecord[]> {
  const records: ValidationRecord[] = [];

  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  const data = legacy?.data as Record<string, unknown> | null;
  const l2arr: PrismaAny[] = Array.isArray((data as PrismaAny)?.l2) ? (data as PrismaAny).l2 : [];

  // ── Legacy 기반 규칙 (EMPTY_*, DUP_*, MATCH_*, MIX_*) ──

  for (let pi = 0; pi < l2arr.length; pi++) {
    const proc = l2arr[pi];
    const procLabel = `L2_${pi}_${proc.processNo || proc.name || ''}`;

    // EMPTY_A1: 공정번호 빈값
    if (!proc.processNo?.toString().trim()) {
      records.push({ ruleId: 'EMPTY_A1', target: procLabel, level: 'ERROR', message: `공정번호 빈값 (index ${pi})`, autoFixed: false });
    }

    // EMPTY_A2: 공정명 빈값
    if (!proc.name?.trim()) {
      records.push({ ruleId: 'EMPTY_A2', target: procLabel, level: 'ERROR', message: `공정명 빈값 (index ${pi})`, autoFixed: false });
    }

    // EMPTY_A5: 고장형태 빈값
    const fms: PrismaAny[] = Array.isArray(proc.failureModes) ? proc.failureModes : [];
    if (fms.length === 0) {
      records.push({ ruleId: 'EMPTY_A5', target: procLabel, level: 'ERROR', message: `고장형태 0건`, autoFixed: false });
    }
    for (let fi = 0; fi < fms.length; fi++) {
      if (!fms[fi].name?.trim() && !fms[fi].mode?.trim()) {
        records.push({ ruleId: 'EMPTY_A5', target: `${procLabel}_FM${fi}`, level: 'ERROR', message: `고장형태 빈값`, autoFixed: false });
      }
    }

    // EMPTY_A4: 제품특성 빈값
    const procFuncs: PrismaAny[] = Array.isArray(proc.functions) ? proc.functions : [];
    for (const fn of procFuncs) {
      const pcs: PrismaAny[] = Array.isArray(fn.processChars || fn.productChars) ? (fn.processChars || fn.productChars) : [];
      if (pcs.length === 0) {
        records.push({ ruleId: 'EMPTY_A4', target: procLabel, level: 'WARN', message: `제품특성 0건`, autoFixed: false });
      }
      for (const pc of pcs) {
        if (!pc.name?.trim()) {
          records.push({ ruleId: 'EMPTY_A4', target: `${procLabel}_A4_${pc.id || ''}`, level: 'WARN', message: `제품특성 빈값`, autoFixed: false });
        }
      }
    }

    // DUP_A5: 같은 공정에 중복 고장형태
    const fmNames = fms.map((fm: PrismaAny) => (fm.name || fm.mode || '').trim()).filter(Boolean);
    const fmDups = findDuplicates(fmNames);
    for (const dup of fmDups) {
      records.push({ ruleId: 'DUP_A5', target: procLabel, level: 'WARN', message: `중복 고장형태: "${dup}"`, autoFixed: false });
    }

    // L3 (작업요소) 검증
    const l3arr: PrismaAny[] = Array.isArray(proc.l3) ? proc.l3 : [];
    for (let wi = 0; wi < l3arr.length; wi++) {
      const we = l3arr[wi];
      const weLabel = `${procLabel}_L3_${wi}_${we.name || ''}`;

      // EMPTY_B4: 고장원인 빈값
      const fcs: PrismaAny[] = Array.isArray(we.failureCauses) ? we.failureCauses : [];
      if (fcs.length === 0) {
        records.push({ ruleId: 'EMPTY_B4', target: weLabel, level: 'ERROR', message: `고장원인 0건`, autoFixed: false });
      }
      for (let ci = 0; ci < fcs.length; ci++) {
        if (!fcs[ci].name?.trim() && !fcs[ci].cause?.trim()) {
          records.push({ ruleId: 'EMPTY_B4', target: `${weLabel}_FC${ci}`, level: 'ERROR', message: `고장원인 빈값`, autoFixed: false });
        }
      }

      // EMPTY_B3: 공정특성 빈값
      const weFuncs: PrismaAny[] = Array.isArray(we.functions) ? we.functions : [];
      for (const fn of weFuncs) {
        const pcs: PrismaAny[] = Array.isArray(fn.processChars) ? fn.processChars : [];
        for (const pc of pcs) {
          if (!pc.name?.trim()) {
            records.push({ ruleId: 'EMPTY_B3', target: `${weLabel}_B3_${pc.id || ''}`, level: 'WARN', message: `공정특성 빈값`, autoFixed: false });
          }
        }
      }

      // DUP_B4: 같은 작업요소에 중복 고장원인
      const fcNames = fcs.map((fc: PrismaAny) => (fc.name || fc.cause || '').trim()).filter(Boolean);
      const fcDups = findDuplicates(fcNames);
      for (const dup of fcDups) {
        records.push({ ruleId: 'DUP_B4', target: weLabel, level: 'WARN', message: `중복 고장원인: "${dup}"`, autoFixed: false });
      }
    }

    // L2 직속 FC도 검사
    const procFcs: PrismaAny[] = Array.isArray(proc.failureCauses) ? proc.failureCauses : [];
    for (let ci = 0; ci < procFcs.length; ci++) {
      if (!procFcs[ci].name?.trim() && !procFcs[ci].cause?.trim()) {
        records.push({ ruleId: 'EMPTY_B4', target: `${procLabel}_FC${ci}`, level: 'ERROR', message: `고장원인 빈값 (L2 직속)`, autoFixed: false });
      }
    }
  }

  // EMPTY_C4: 고장영향 빈값
  const l1 = (data as PrismaAny)?.l1;
  const fes: PrismaAny[] = Array.isArray(l1?.failureScopes) ? l1.failureScopes : [];
  if (fes.length === 0 && l2arr.length > 0) {
    records.push({ ruleId: 'EMPTY_C4', target: 'L1', level: 'ERROR', message: `고장영향 0건`, autoFixed: false });
  }
  for (let i = 0; i < fes.length; i++) {
    if (!fes[i].name?.trim() && !fes[i].effect?.trim()) {
      records.push({ ruleId: 'EMPTY_C4', target: `L1_FE${i}`, level: 'ERROR', message: `고장영향 빈값`, autoFixed: false });
    }
  }

  // MATCH_B1_WE: B1 작업요소와 L3 이름 불일치
  const l3Structs = await prisma.l3Structure.findMany({ where: { fmeaId }, select: { id: true, name: true, l2Id: true } });
  if (l3Structs.length > 0) {
    const l3NameMap = new Map<string, string>();
    for (const s of l3Structs) {
      l3NameMap.set(s.id, (s.name || '').trim());
    }

    for (const proc of l2arr) {
      const l3s: PrismaAny[] = Array.isArray(proc.l3) ? proc.l3 : [];
      for (const we of l3s) {
        const legacyName = (we.name || '').trim();
        if (we.id && l3NameMap.has(we.id)) {
          const atomicName = l3NameMap.get(we.id)!;
          if (legacyName && atomicName && legacyName !== atomicName) {
            records.push({
              ruleId: 'MATCH_B1_WE', target: `L3_${we.id}`, level: 'ERROR',
              message: `Legacy="${legacyName}" ≠ Atomic="${atomicName}"`, autoFixed: false,
            });
          }
        }
      }
    }
  }

  // MIX_B5_A6: 예방관리/검출관리 혼입 가능성
  const riskData = (data as PrismaAny)?.riskData as Record<string, string | number> | undefined;
  if (riskData) {
    const detectionKeywords = ['예방', 'prevention', '방지', '대책'];
    const preventionKeywords = ['검출', 'detection', '측정', '검사', '시험'];

    for (const [key, val] of Object.entries(riskData)) {
      const text = String(val || '').trim();
      if (!text) continue;

      if (key.startsWith('detection-')) {
        for (const kw of detectionKeywords) {
          if (text.includes(kw)) {
            records.push({
              ruleId: 'MIX_B5_A6', target: key, level: 'WARN',
              message: `검출관리(A6)에 예방 키워드("${kw}") 포함: "${text.substring(0, 40)}"`, autoFixed: false,
            });
            break;
          }
        }
      }
      if (key.startsWith('prevention-')) {
        for (const kw of preventionKeywords) {
          if (text.includes(kw)) {
            records.push({
              ruleId: 'MIX_B5_A6', target: key, level: 'WARN',
              message: `예방관리(B5)에 검출 키워드("${kw}") 포함: "${text.substring(0, 40)}"`, autoFixed: false,
            });
            break;
          }
        }
      }
    }
  }

  // ── Atomic DB 기반 규칙 (ORPHAN_*, BROKEN_LINK, MISSING_RISK, COUNT_MISMATCH) ──

  const [links, atomicFcs, atomicFms, atomicFes, riskAnalyses] = await Promise.all([
    prisma.failureLink.findMany({ where: { fmeaId }, select: { id: true, fcId: true, fmId: true, feId: true } }),
    prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.failureMode.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.failureEffect.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.failureAnalysis.findMany({ where: { fmeaId }, select: { linkId: true } }),
  ]);

  const linkedFcIds = new Set(links.map((l: PrismaAny) => l.fcId));
  const linkedFmIds = new Set(links.map((l: PrismaAny) => l.fmId));
  const fcIdSet = new Set(atomicFcs.map((f: PrismaAny) => f.id));
  const fmIdSet = new Set(atomicFms.map((f: PrismaAny) => f.id));
  const feIdSet = new Set(atomicFes.map((f: PrismaAny) => f.id));
  const riskLinkIds = new Set(riskAnalyses.map((r: PrismaAny) => r.linkId));

  // ORPHAN_FC: FailureLink 없는 FC
  for (const fc of atomicFcs) {
    if (!linkedFcIds.has(fc.id)) {
      records.push({ ruleId: 'ORPHAN_FC', target: `FC_${fc.id}`, level: 'ERROR', message: `FailureLink 없는 FC`, autoFixed: false });
    }
  }

  // ORPHAN_FM: FailureLink 없는 FM
  for (const fm of atomicFms) {
    if (!linkedFmIds.has(fm.id)) {
      records.push({ ruleId: 'ORPHAN_FM', target: `FM_${fm.id}`, level: 'ERROR', message: `FailureLink 없는 FM`, autoFixed: false });
    }
  }

  // BROKEN_LINK: FailureLink의 FK가 존재하지 않는 엔티티 참조
  for (const link of links) {
    if (!fcIdSet.has(link.fcId)) {
      records.push({ ruleId: 'BROKEN_LINK', target: `Link_${link.id}_FC`, level: 'ERROR', message: `FK가 존재하지 않는 FC 참조: ${link.fcId}`, autoFixed: false });
    }
    if (!fmIdSet.has(link.fmId)) {
      records.push({ ruleId: 'BROKEN_LINK', target: `Link_${link.id}_FM`, level: 'ERROR', message: `FK가 존재하지 않는 FM 참조: ${link.fmId}`, autoFixed: false });
    }
    if (!feIdSet.has(link.feId)) {
      records.push({ ruleId: 'BROKEN_LINK', target: `Link_${link.id}_FE`, level: 'ERROR', message: `FK가 존재하지 않는 FE 참조: ${link.feId}`, autoFixed: false });
    }
  }

  // MISSING_RISK: RiskAnalysis 없는 FailureLink
  for (const link of links) {
    if (!riskLinkIds.has(link.id)) {
      records.push({ ruleId: 'MISSING_RISK', target: `Link_${link.id}`, level: 'WARN', message: `RiskAnalysis 없는 FailureLink`, autoFixed: false });
    }
  }

  // COUNT_MISMATCH: FlatData 개수와 Atomic DB 엔티티 개수 불일치
  const latestJob = await prisma.importJob.findFirst({
    where: { fmeaId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, flatDataCount: true },
  }).catch(() => null);

  if (latestJob && latestJob.flatDataCount > 0) {
    const mappingCount = await prisma.importMapping.count({ where: { jobId: latestJob.id } }).catch(() => 0);
    const atomicTotal = atomicFms.length + atomicFcs.length + atomicFes.length;

    if (mappingCount > 0 && Math.abs(mappingCount - atomicTotal) > 0) {
      records.push({
        ruleId: 'COUNT_MISMATCH', target: 'global', level: 'WARN',
        message: `매핑 ${mappingCount}건 ≠ Atomic 엔티티 ${atomicTotal}건 (FM=${atomicFms.length} FC=${atomicFcs.length} FE=${atomicFes.length})`,
        autoFixed: false,
      });
    }
  }

  return records;
}

function findDuplicates(arr: string[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const item of arr) {
    if (seen.has(item)) dups.add(item);
    seen.add(item);
  }
  return [...dups];
}

// ─── DB에 검증 결과 저장 ───

async function saveValidationRecords(
  prisma: PrismaAny,
  jobId: string,
  records: ValidationRecord[],
): Promise<number> {
  if (records.length === 0) return 0;

  await prisma.importValidation.deleteMany({ where: { jobId } });

  const result = await prisma.importValidation.createMany({
    data: records.map((r) => ({
      jobId,
      ruleId: r.ruleId,
      target: r.target,
      level: r.level,
      message: r.message,
      autoFixed: r.autoFixed,
    })),
  });

  return result.count;
}

// ─── HTTP: GET ───

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const jobId = searchParams.get('jobId');
    const fmeaId = searchParams.get('fmeaId');

    if (!jobId && !fmeaId) {
      return NextResponse.json({ success: false, error: 'jobId 또는 fmeaId 필요' }, { status: 400 });
    }

    if (fmeaId && !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: '유효하지 않은 fmeaId' }, { status: 400 });
    }

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) return NextResponse.json({ success: false, error: 'DB 미설정' }, { status: 500 });

    const targetFmeaId = fmeaId || '';
    let prisma: PrismaAny;

    if (fmeaId) {
      const schema = getProjectSchemaName(fmeaId);
      await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
      prisma = getPrismaForSchema(schema);
    } else {
      // jobId만 있는 경우 — public schema에서 job의 fmeaId를 먼저 찾아야 함
      const { getPrisma } = await import('@/lib/prisma');
      prisma = getPrisma();
    }

    if (!prisma) return NextResponse.json({ success: false, error: 'Prisma 실패' }, { status: 500 });

    let resolvedJobId = jobId;

    if (!resolvedJobId && targetFmeaId) {
      const latestJob = await prisma.importJob.findFirst({
        where: { fmeaId: targetFmeaId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (!latestJob) {
        return NextResponse.json({ success: true, validations: [], jobId: null, message: 'ImportJob 없음' });
      }
      resolvedJobId = latestJob.id;
    }

    const validations = await prisma.importValidation.findMany({
      where: { jobId: resolvedJobId! },
      orderBy: [{ level: 'asc' }, { ruleId: 'asc' }],
    });

    const summary = {
      total: validations.length,
      errors: validations.filter((v: PrismaAny) => v.level === 'ERROR').length,
      warns: validations.filter((v: PrismaAny) => v.level === 'WARN').length,
      infos: validations.filter((v: PrismaAny) => v.level === 'INFO').length,
    };

    return NextResponse.json({ success: true, jobId: resolvedJobId, summary, validations });
  } catch (e) {
    console.error('[import-validation] GET error:', e);
    return NextResponse.json({ success: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}

// ─── HTTP: POST ───

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fmeaId, jobId } = body;

    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'fmeaId 필요' }, { status: 400 });
    }

    const normalizedFmeaId = fmeaId.toLowerCase();
    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) return NextResponse.json({ success: false, error: 'DB 미설정' }, { status: 500 });

    const schema = getProjectSchemaName(normalizedFmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) return NextResponse.json({ success: false, error: 'Prisma 실패' }, { status: 500 });

    // ImportJob 찾거나 생성
    let targetJobId = jobId;
    if (!targetJobId) {
      const latestJob = await prisma.importJob.findFirst({
        where: { fmeaId: normalizedFmeaId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      if (latestJob) {
        targetJobId = latestJob.id;
      } else {
        const { randomUUID } = await import('crypto');
        const newJob = await prisma.importJob.create({
          data: {
            id: randomUUID(),
            fmeaId: normalizedFmeaId,
            status: 'verifying',
            flatDataCount: 0,
            chainCount: 0,
          },
        });
        targetJobId = newJob.id;
      }
    }

    // 검증 규칙 실행
    const records = await runValidationRules(prisma, normalizedFmeaId);

    // DB 저장
    const savedCount = await saveValidationRecords(prisma, targetJobId, records);

    const summary = {
      total: records.length,
      errors: records.filter((r) => r.level === 'ERROR').length,
      warns: records.filter((r) => r.level === 'WARN').length,
      infos: records.filter((r) => r.level === 'INFO').length,
    };

    console.info(`[import-validation] fmeaId=${normalizedFmeaId} jobId=${targetJobId} saved=${savedCount} errors=${summary.errors} warns=${summary.warns}`);

    return NextResponse.json({
      success: true,
      jobId: targetJobId,
      summary,
      validations: records,
    });
  } catch (e) {
    console.error('[import-validation] POST error:', e);
    return NextResponse.json({ success: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}
