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

  // ── Atomic DB 기반 규칙 (Legacy 제거 — 2026-03-20) ──

  const [l2arr, l3Structs, l2Funcs, l3Funcs, atomicFmsAll, atomicFesAll, atomicFcsAll, l1Funcs, raAll] = await Promise.all([
    prisma.l2Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } }),
    prisma.l3Structure.findMany({ where: { fmeaId } }),
    prisma.l2Function.findMany({ where: { fmeaId } }),
    prisma.l3Function.findMany({ where: { fmeaId } }),
    prisma.failureMode.findMany({ where: { fmeaId } }),
    prisma.failureEffect.findMany({ where: { fmeaId } }),
    prisma.failureCause.findMany({ where: { fmeaId } }),
    prisma.l1Function.findMany({ where: { fmeaId } }),
    prisma.riskAnalysis.findMany({ where: { fmeaId } }),
  ]);

  for (let pi = 0; pi < l2arr.length; pi++) {
    const proc = l2arr[pi];
    const procLabel = `L2_${pi}_${proc.no || proc.name || ''}`;

    // EMPTY_A1: 공정번호 빈값
    if (!proc.no?.toString().trim()) {
      records.push({ ruleId: 'EMPTY_A1', target: procLabel, level: 'ERROR', message: `공정번호 빈값 (index ${pi})`, autoFixed: false });
    }

    // EMPTY_A2: 공정명 빈값
    if (!proc.name?.trim()) {
      records.push({ ruleId: 'EMPTY_A2', target: procLabel, level: 'ERROR', message: `공정명 빈값 (index ${pi})`, autoFixed: false });
    }

    // EMPTY_A5: 고장형태 빈값
    const procFms = atomicFmsAll.filter((fm: PrismaAny) => fm.l2StructId === proc.id);
    if (procFms.length === 0) {
      records.push({ ruleId: 'EMPTY_A5', target: procLabel, level: 'ERROR', message: `고장형태 0건`, autoFixed: false });
    }
    for (let fi = 0; fi < procFms.length; fi++) {
      if (!procFms[fi].mode?.trim()) {
        records.push({ ruleId: 'EMPTY_A5', target: `${procLabel}_FM${fi}`, level: 'ERROR', message: `고장형태 빈값`, autoFixed: false });
      }
    }

    // EMPTY_A4: 제품특성 빈값
    const procL2Funcs = l2Funcs.filter((f: PrismaAny) => f.l2StructId === proc.id);
    const pcsWithValue = procL2Funcs.filter((f: PrismaAny) => f.productChar?.trim());
    if (pcsWithValue.length === 0 && procL2Funcs.length > 0) {
      records.push({ ruleId: 'EMPTY_A4', target: procLabel, level: 'WARN', message: `제품특성 0건`, autoFixed: false });
    }
    for (const f of procL2Funcs) {
      if (!f.productChar?.trim()) {
        records.push({ ruleId: 'EMPTY_A4', target: `${procLabel}_A4_${f.id || ''}`, level: 'WARN', message: `제품특성 빈값`, autoFixed: false });
      }
    }

    // DUP_A5: 같은 공정에 중복 고장형태
    const fmNames = procFms.map((fm: PrismaAny) => (fm.mode || '').trim()).filter(Boolean);
    const fmDups = findDuplicates(fmNames);
    for (const dup of fmDups) {
      records.push({ ruleId: 'DUP_A5', target: procLabel, level: 'WARN', message: `중복 고장형태: "${dup}"`, autoFixed: false });
    }

    // L3 (작업요소) 검증
    const procL3s = l3Structs.filter((l3: PrismaAny) => l3.l2Id === proc.id);
    for (let wi = 0; wi < procL3s.length; wi++) {
      const we = procL3s[wi];
      const weLabel = `${procLabel}_L3_${wi}_${we.name || ''}`;

      // EMPTY_B4: 고장원인 빈값
      const weFcs = atomicFcsAll.filter((fc: PrismaAny) => fc.l3StructId === we.id);
      if (weFcs.length === 0) {
        records.push({ ruleId: 'EMPTY_B4', target: weLabel, level: 'ERROR', message: `고장원인 0건`, autoFixed: false });
      }
      for (let ci = 0; ci < weFcs.length; ci++) {
        if (!weFcs[ci].cause?.trim()) {
          records.push({ ruleId: 'EMPTY_B4', target: `${weLabel}_FC${ci}`, level: 'ERROR', message: `고장원인 빈값`, autoFixed: false });
        }
      }

      // EMPTY_B3: 공정특성 빈값
      const weL3Funcs = l3Funcs.filter((f: PrismaAny) => f.l3StructId === we.id);
      for (const f of weL3Funcs) {
        if (!f.processChar?.trim()) {
          records.push({ ruleId: 'EMPTY_B3', target: `${weLabel}_B3_${f.id || ''}`, level: 'WARN', message: `공정특성 빈값`, autoFixed: false });
        }
      }

      // DUP_B4: 같은 작업요소에 중복 고장원인
      const fcNames = weFcs.map((fc: PrismaAny) => (fc.cause || '').trim()).filter(Boolean);
      const fcDups = findDuplicates(fcNames);
      for (const dup of fcDups) {
        records.push({ ruleId: 'DUP_B4', target: weLabel, level: 'WARN', message: `중복 고장원인: "${dup}"`, autoFixed: false });
      }
    }
  }

  // EMPTY_C4: 고장영향 빈값
  if (atomicFesAll.length === 0 && l2arr.length > 0) {
    records.push({ ruleId: 'EMPTY_C4', target: 'L1', level: 'ERROR', message: `고장영향 0건`, autoFixed: false });
  }
  for (let i = 0; i < atomicFesAll.length; i++) {
    if (!atomicFesAll[i].effect?.trim()) {
      records.push({ ruleId: 'EMPTY_C4', target: `L1_FE${i}`, level: 'ERROR', message: `고장영향 빈값`, autoFixed: false });
    }
  }

  // MIX_B5_A6: 예방관리/검출관리 혼입 가능성 (RiskAnalysis 기반)
  {
    const detectionKeywords = ['예방', 'prevention', '방지', '대책'];
    const preventionKeywords = ['검출', 'detection', '측정', '검사', '시험'];

    for (const ra of raAll) {
      const dcText = ((ra as PrismaAny).detectionControl || '').trim();
      const pcText = ((ra as PrismaAny).preventionControl || '').trim();

      if (dcText) {
        for (const kw of detectionKeywords) {
          if (dcText.includes(kw)) {
            records.push({
              ruleId: 'MIX_B5_A6', target: `RA_${(ra as PrismaAny).id}_DC`, level: 'WARN',
              message: `검출관리(A6)에 예방 키워드("${kw}") 포함: "${dcText.substring(0, 40)}"`, autoFixed: false,
            });
            break;
          }
        }
      }
      if (pcText) {
        for (const kw of preventionKeywords) {
          if (pcText.includes(kw)) {
            records.push({
              ruleId: 'MIX_B5_A6', target: `RA_${(ra as PrismaAny).id}_PC`, level: 'WARN',
              message: `예방관리(B5)에 검출 키워드("${kw}") 포함: "${pcText.substring(0, 40)}"`, autoFixed: false,
            });
            break;
          }
        }
      }
    }
  }

  // ── Atomic DB 기반 규칙 (ORPHAN_*, BROKEN_LINK, MISSING_RISK, COUNT_MISMATCH) ──

  const links = await prisma.failureLink.findMany({ where: { fmeaId }, select: { id: true, fcId: true, fmId: true, feId: true } });

  const linkedFcIds = new Set(links.map((l: PrismaAny) => l.fcId));
  const linkedFmIds = new Set(links.map((l: PrismaAny) => l.fmId));
  const fcIdSet = new Set(atomicFcsAll.map((f: PrismaAny) => f.id));
  const fmIdSet = new Set(atomicFmsAll.map((f: PrismaAny) => f.id));
  const feIdSet = new Set(atomicFesAll.map((f: PrismaAny) => f.id));
  const riskLinkIds = new Set(raAll.map((r: PrismaAny) => r.linkId));

  // ORPHAN_FC: FailureLink 없는 FC
  for (const fc of atomicFcsAll) {
    if (!linkedFcIds.has(fc.id)) {
      records.push({ ruleId: 'ORPHAN_FC', target: `FC_${fc.id}`, level: 'ERROR', message: `FailureLink 없는 FC`, autoFixed: false });
    }
  }

  // ORPHAN_FM: FailureLink 없는 FM
  for (const fm of atomicFmsAll) {
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
    const atomicTotal = atomicFmsAll.length + atomicFcsAll.length + atomicFesAll.length;

    if (mappingCount > 0 && Math.abs(mappingCount - atomicTotal) > 0) {
      records.push({
        ruleId: 'COUNT_MISMATCH', target: 'global', level: 'WARN',
        message: `매핑 ${mappingCount}건 ≠ Atomic 엔티티 ${atomicTotal}건 (FM=${atomicFmsAll.length} FC=${atomicFcsAll.length} FE=${atomicFesAll.length})`,
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
