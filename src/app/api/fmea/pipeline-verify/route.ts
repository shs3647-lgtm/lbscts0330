/**
 * @file pipeline-verify/route.ts
 * @description 5단계 파이프라인 검증 + 자동수정 루프 API
 *
 * GET  /api/fmea/pipeline-verify?fmeaId=xxx  → 현재 상태 조회
 * POST /api/fmea/pipeline-verify             → 검증 + 자동수정 루프 실행
 *
 * 5단계: IMPORT → 파싱 → UUID → FK → WS
 * 빨간불 → 자동수정 → 재검증 → 초록불 될 때까지 반복 (최대 3회)
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

type StepStatus = 'ok' | 'warn' | 'error' | 'fixed';

interface StepResult {
  step: number;
  name: string;
  status: StepStatus;
  details: Record<string, number | string>;
  issues: string[];
  fixed: string[];
}

interface PipelineResult {
  fmeaId: string;
  steps: StepResult[];
  allGreen: boolean;
  loopCount: number;
  timestamp: string;
}

// ─── STEP 1: IMPORT ───
async function verifyImport(prisma: any, fmeaId: string): Promise<StepResult> {
  const result: StepResult = { step: 1, name: 'IMPORT', status: 'ok', details: {}, issues: [], fixed: [] };

  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  const data = legacy?.data as any;
  const l2Count = Array.isArray(data?.l2) ? data.l2.length : 0;
  const l1Name = data?.l1?.name || '';

  result.details = { l2Count, l1Name: l1Name || '(없음)' };

  if (!legacy) { result.status = 'error'; result.issues.push('Legacy 데이터 없음 — Import 필요'); }
  else if (l2Count === 0) { result.status = 'error'; result.issues.push('공정(L2) 0건 — Import 필요'); }
  else if (!l1Name.trim()) { result.status = 'warn'; result.issues.push('완제품 공정명(L1) 미입력'); }

  return result;
}

// ─── STEP 2: 파싱 (SA 시스템분석 통합) ───
async function verifyParsing(prisma: any, fmeaId: string): Promise<StepResult> {
  const result: StepResult = { step: 2, name: '파싱', status: 'ok', details: {}, issues: [], fixed: [] };

  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  const data = legacy?.data as any;
  if (!data?.l2) { result.status = 'error'; result.issues.push('L2 데이터 없음'); return result; }

  // A1~A6, B1~B5, C1~C4 전체 파싱 통계 (SA 시스템분석 통합)
  const l2arr = data.l2 || [];
  let a1 = 0, a2 = 0, a3 = 0, a4 = 0, a5 = 0, a6 = 0;
  let b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
  let c1 = 0, c2 = 0, c3 = 0, c4 = 0;
  let emptyPc = 0;

  // L2 (A계열)
  for (const proc of l2arr) {
    a1++; // 공정번호
    if (proc.name?.trim()) a2++; // 공정명
    // A3: 공정기능 — functions at L2 level
    const procFuncs = Array.isArray(proc.functions) ? proc.functions : [];
    a3 += procFuncs.length;
    // A4: 제품특성 — product chars at L2 function level
    for (const fn of procFuncs) {
      const pcs = Array.isArray(fn.processChars || fn.productChars) ? (fn.processChars || fn.productChars) : [];
      a4 += pcs.length;
    }
    // A5: 고장형태
    a5 += Array.isArray(proc.failureModes) ? proc.failureModes.length : 0;

    // L3 (B계열)
    for (const we of (proc.l3 || [])) {
      b1++; // 작업요소
      for (const fn of (we.functions || [])) {
        if (fn.name?.trim() || fn.functionName?.trim()) b2++; // 요소기능
        for (const pc of (fn.processChars || [])) {
          b3++; // 공정특성
          if (!pc.name?.trim()) emptyPc++;
        }
      }
      // B4: 고장원인
      b4 += Array.isArray(we.failureCauses) ? we.failureCauses.length : 0;
    }
    // L2 직속 FC도 카운트
    b4 += Array.isArray(proc.failureCauses) ? proc.failureCauses.length : 0;
  }

  // A6/B5: riskData에서 카운트
  const riskData = data.riskData || {};
  for (const key of Object.keys(riskData)) {
    if (key.startsWith('detection-') && String(riskData[key]).trim()) a6++;
    if (key.startsWith('prevention-') && String(riskData[key]).trim()) b5++;
  }

  // C계열: L1
  const fes = data.l1?.failureScopes || [];
  c4 = fes.length;
  const l1Funcs = data.l1?.functions || [];
  const catSet = new Set<string>();
  const funcSet = new Set<string>();
  for (const fn of l1Funcs) {
    if (fn.category?.trim()) catSet.add(fn.category);
    if (fn.name?.trim()) funcSet.add(fn.name);
    c3++; // 요구사항 (각 L1Function = 1 requirement)
  }
  c1 = catSet.size;
  c2 = funcSet.size;

  // 상세 통계 — Import 페이지 SA 시스템분석과 동일한 정보
  result.details = {
    A1: a1, A2: a2, A3: a3, A4: a4, A5: a5, A6: a6,
    B1: b1, B2: b2, B3: b3, B4: b4, B5: b5,
    C1: c1, C2: c2, C3: c3, C4: c4,
    emptyPC: emptyPc,
  };

  // 이슈 판정
  if (a1 === 0) { result.status = 'error'; result.issues.push('A1(공정번호) 0건'); }
  if (a5 === 0) { result.status = 'error'; result.issues.push('A5(고장형태) 0건'); }
  if (b4 === 0) { result.status = 'error'; result.issues.push('B4(고장원인) 0건'); }
  if (c4 === 0) { result.status = 'error'; result.issues.push('C4(고장영향) 0건'); }
  if (b3 === 0) { result.status = result.status === 'error' ? 'error' : 'warn'; result.issues.push('B3(공정특성) 0건'); }
  if (emptyPc > 0) { result.status = result.status === 'error' ? 'error' : 'warn'; result.issues.push(`빈 공정특성 ${emptyPc}건`); }
  if (a6 === 0) { result.status = result.status === 'error' ? 'error' : 'warn'; result.issues.push('A6(검출관리) 0건 — 파싱 누락'); }
  if (b5 === 0) { result.status = result.status === 'error' ? 'error' : 'warn'; result.issues.push('B5(예방관리) 0건 — 파싱 누락'); }

  return result;
}

// ─── STEP 3: UUID ───
async function verifyUuid(prisma: any, fmeaId: string): Promise<StepResult> {
  const result: StepResult = { step: 3, name: 'UUID', status: 'ok', details: {}, issues: [], fixed: [] };

  const [l2Count, l3Count, l3FuncCount, fmCount, feCount, fcCount] = await Promise.all([
    prisma.l2Structure.count({ where: { fmeaId } }),
    prisma.l3Structure.count({ where: { fmeaId } }),
    prisma.l3Function.count({ where: { fmeaId } }),
    prisma.failureMode.count({ where: { fmeaId } }),
    prisma.failureEffect.count({ where: { fmeaId } }),
    prisma.failureCause.count({ where: { fmeaId } }),
  ]);

  result.details = { L2: l2Count, L3: l3Count, L3Func: l3FuncCount, FM: fmCount, FE: feCount, FC: fcCount };

  if (l2Count === 0) { result.status = 'error'; result.issues.push('Atomic L2 0건 — rebuild-atomic 필요'); }
  if (l3FuncCount === 0) { result.status = 'error'; result.issues.push('Atomic L3Function 0건'); }

  // orphan L3Function (FC가 없는 L3Func)
  if (l3FuncCount > 0 && fcCount > 0) {
    const fcs = await prisma.failureCause.findMany({ where: { fmeaId }, select: { processCharId: true, l3FuncId: true } });
    const fcPcIds = new Set(fcs.map((fc: any) => fc.processCharId).filter(Boolean));
    const fcL3Ids = new Set(fcs.map((fc: any) => fc.l3FuncId).filter(Boolean));
    const l3Funcs = await prisma.l3Function.findMany({ where: { fmeaId }, select: { id: true } });
    const orphanCount = l3Funcs.filter((f: any) => !fcPcIds.has(f.id) && !fcL3Ids.has(f.id)).length;
    result.details.orphanL3Func = orphanCount;
    if (orphanCount > 0) {
      result.status = 'warn';
      result.issues.push(`FC 없는 L3Function ${orphanCount}건`);
    }
  }

  return result;
}

// ─── STEP 4: FK ───
async function verifyFk(prisma: any, fmeaId: string): Promise<StepResult> {
  const result: StepResult = { step: 4, name: 'FK', status: 'ok', details: {}, issues: [], fixed: [] };

  const [links, fcs, fms, fes] = await Promise.all([
    prisma.failureLink.findMany({ where: { fmeaId }, select: { fcId: true, fmId: true, feId: true } }),
    prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.failureMode.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.failureEffect.findMany({ where: { fmeaId }, select: { id: true } }),
  ]);

  const fcSet = new Set(fcs.map((f: any) => f.id));
  const fmSet = new Set(fms.map((f: any) => f.id));
  const feSet = new Set(fes.map((f: any) => f.id));
  const linkedFcIds = new Set(links.map((l: any) => l.fcId));

  let brokenFc = 0, brokenFm = 0, brokenFe = 0;
  for (const lk of links) {
    if (!fcSet.has(lk.fcId)) brokenFc++;
    if (!fmSet.has(lk.fmId)) brokenFm++;
    if (!feSet.has(lk.feId)) brokenFe++;
  }

  const unlinkedFcs = fcs.filter((fc: any) => !linkedFcIds.has(fc.id)).length;

  result.details = { links: links.length, brokenFC: brokenFc, brokenFM: brokenFm, brokenFE: brokenFe, unlinkedFC: unlinkedFcs };

  if (brokenFc > 0) { result.status = 'error'; result.issues.push(`깨진 FC FK ${brokenFc}건`); }
  if (brokenFm > 0) { result.status = 'error'; result.issues.push(`깨진 FM FK ${brokenFm}건`); }
  if (brokenFe > 0) { result.status = 'error'; result.issues.push(`깨진 FE FK ${brokenFe}건`); }
  if (unlinkedFcs > 0) { result.status = 'warn'; result.issues.push(`FailureLink 없는 FC ${unlinkedFcs}건`); }
  if (links.length === 0 && fcs.length > 0) { result.status = 'error'; result.issues.push('FailureLink 0건 — FK 연결 필요'); }

  return result;
}

// ─── STEP 5: WS ───
async function verifyWs(prisma: any, fmeaId: string): Promise<StepResult> {
  const result: StepResult = { step: 5, name: 'WS', status: 'ok', details: {}, issues: [], fixed: [] };

  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  const data = legacy?.data as any;
  if (!data?.l2) { result.status = 'error'; result.issues.push('Legacy 데이터 없음'); return result; }

  let totalPc = 0, emptyPc = 0, totalFc = 0, orphanPc = 0;

  for (const proc of data.l2) {
    const procFcs = Array.isArray(proc.failureCauses) ? proc.failureCauses : [];
    totalFc += procFcs.length;
    const fcPcIds = new Set(procFcs.map((fc: any) => fc.processCharId).filter(Boolean));

    for (const we of (proc.l3 || [])) {
      totalFc += Array.isArray(we.failureCauses) ? we.failureCauses.length : 0;
      for (const fn of (we.functions || [])) {
        for (const pc of (fn.processChars || [])) {
          totalPc++;
          if (!pc.name?.trim()) emptyPc++;
          else if (!fcPcIds.has(pc.id)) orphanPc++;
        }
      }
    }
  }

  const linkCount = Array.isArray(data.failureLinks) ? data.failureLinks.length : 0;

  result.details = { totalPC: totalPc, emptyPC: emptyPc, orphanPC: orphanPc, totalFC: totalFc, legacyLinks: linkCount };

  if (emptyPc > 0) { result.status = 'error'; result.issues.push(`빈 공정특성 ${emptyPc}건 — 워크시트에 🔍 표시됨`); }
  if (orphanPc > 0) { result.status = 'warn'; result.issues.push(`FC 없는 공정특성 ${orphanPc}건 — "고장원인 선택" 표시됨`); }

  return result;
}

// ─── 자동수정 함수들 ───

async function fixStep3Uuid(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  const fcs = await prisma.failureCause.findMany({ where: { fmeaId }, select: { processCharId: true, l3FuncId: true } });
  const fcPcIds = new Set(fcs.map((fc: any) => fc.processCharId).filter(Boolean));
  const fcL3Ids = new Set(fcs.map((fc: any) => fc.l3FuncId).filter(Boolean));
  const l3Funcs = await prisma.l3Function.findMany({ where: { fmeaId } });
  const l3s = await prisma.l3Structure.findMany({ where: { fmeaId } });
  const l2s = await prisma.l2Structure.findMany({ where: { fmeaId } });
  const l2ById = new Map(l2s.map((l: any) => [l.id, l]));
  const l3ById = new Map(l3s.map((l: any) => [l.id, l]));

  const orphans = l3Funcs.filter((f: any) => !fcPcIds.has(f.id) && !fcL3Ids.has(f.id));

  for (const func of orphans) {
    const l3 = l3ById.get(func.l3StructId);
    const l2 = l3 ? l2ById.get((l3 as any).l2Id) : null;
    if (!l2) continue;

    const pcName = func.processChar?.trim() || func.functionName?.trim() || (l3 as any)?.name || '';
    const fcName = pcName ? `${pcName} 부적합` : `${(l3 as any)?.name || 'Unknown'} 부적합`;
    const fcId = `${func.id}-FC`;

    try {
      await prisma.failureCause.create({
        data: { id: fcId, fmeaId, l2StructId: (l2 as any).id, l3StructId: func.l3StructId, l3FuncId: func.id, processCharId: func.id, cause: fcName },
      });
      fixed.push(`FC 생성: "${fcName}"`);
    } catch { /* 이미 존재 */ }
  }

  return fixed;
}

async function fixStep4Fk(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  const [fcs, links, fms, fes, l2s] = await Promise.all([
    prisma.failureCause.findMany({ where: { fmeaId } }),
    prisma.failureLink.findMany({ where: { fmeaId } }),
    prisma.failureMode.findMany({ where: { fmeaId } }),
    prisma.failureEffect.findMany({ where: { fmeaId } }),
    prisma.l2Structure.findMany({ where: { fmeaId } }),
  ]);

  const linkedFcIds = new Set(links.map((lk: any) => lk.fcId));
  const fcSet = new Set(fcs.map((f: any) => f.id));
  const fmSet = new Set(fms.map((f: any) => f.id));
  const feSet = new Set(fes.map((f: any) => f.id));

  // 깨진 FK 삭제
  for (const lk of links) {
    if (!fcSet.has(lk.fcId) || !fmSet.has(lk.fmId) || !feSet.has(lk.feId)) {
      await prisma.failureLink.delete({ where: { id: lk.id } }).catch(() => {});
      fixed.push(`깨진 Link 삭제: fc=${lk.fcId}`);
    }
  }

  // FC에 FailureLink 없으면 생성
  for (const fc of fcs) {
    if (linkedFcIds.has(fc.id)) continue;

    const procFms = fms.filter((fm: any) => fm.l2StructId === fc.l2StructId);
    const existingLinks = links.filter((lk: any) => procFms.some((fm: any) => fm.id === lk.fmId));
    const procFeIds = new Set(existingLinks.map((lk: any) => lk.feId));
    const firstFm = procFms[0];
    const firstFe = fes.find((fe: any) => procFeIds.has(fe.id)) || fes[0];

    if (firstFm && firstFe) {
      try {
        await prisma.failureLink.create({
          data: { fmeaId, fcId: fc.id, fmId: firstFm.id, feId: firstFe.id },
        });
        fixed.push(`Link 생성: FC=${fc.cause?.substring(0, 20)}`);
      } catch { /* 이미 존재 */ }
    }
  }

  return fixed;
}

async function fixStep5Ws(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  if (!legacy) return fixed;

  const data = JSON.parse(JSON.stringify(legacy.data)) as any;
  let changed = false;

  for (const proc of (data.l2 || [])) {
    for (const we of (proc.l3 || [])) {
      for (const fn of (we.functions || [])) {
        for (const pc of (fn.processChars || [])) {
          if (!pc.name?.trim()) {
            // Atomic DB에서 L3Function processChar 이름 조회
            try {
              const l3Func = await prisma.l3Function.findFirst({
                where: { fmeaId, id: pc.id },
                select: { processChar: true, functionName: true },
              });
              if (l3Func?.processChar?.trim()) {
                pc.name = l3Func.processChar;
                fixed.push(`PC 이름 복원: "${l3Func.processChar}"`);
                changed = true;
              }
            } catch { /* 조회 실패 무시 */ }
          }
        }
      }
    }

    // orphan PC에 FC 보충
    const procFcs = proc.failureCauses || [];
    const fcPcIds = new Set(procFcs.map((fc: any) => fc.processCharId).filter(Boolean));
    for (const we of (proc.l3 || [])) {
      for (const fn of (we.functions || [])) {
        for (const pc of (fn.processChars || [])) {
          if (pc.name?.trim() && !fcPcIds.has(pc.id)) {
            procFcs.push({ id: `${pc.id}-FC`, name: `${pc.name} 부적합`, processCharId: pc.id });
            fcPcIds.add(pc.id);
            fixed.push(`FC 보충: "${pc.name} 부적합"`);
            changed = true;
          }
        }
      }
    }
    if (changed) proc.failureCauses = procFcs;
  }

  if (changed) {
    await prisma.fmeaLegacyData.update({ where: { fmeaId }, data: { data } });
  }

  return fixed;
}

// ─── 메인 검증+수정 루프 ───

async function runPipelineVerify(prisma: any, fmeaId: string, autoFix: boolean): Promise<PipelineResult> {
  const MAX_LOOPS = 3;
  let loopCount = 0;

  for (let i = 0; i < MAX_LOOPS; i++) {
    loopCount = i + 1;

    const steps: StepResult[] = [
      await verifyImport(prisma, fmeaId),
      await verifyParsing(prisma, fmeaId),
      await verifyUuid(prisma, fmeaId),
      await verifyFk(prisma, fmeaId),
      await verifyWs(prisma, fmeaId),
    ];

    const allGreen = steps.every(s => s.status === 'ok');
    if (allGreen || !autoFix) {
      return { fmeaId, steps, allGreen, loopCount, timestamp: new Date().toISOString() };
    }

    // STEP 1 (IMPORT) 에러면 → 사용자 개입 필요 (자동수정 불가)
    if (steps[0].status === 'error') {
      return { fmeaId, steps, allGreen: false, loopCount, timestamp: new Date().toISOString() };
    }

    // STEP 3 (UUID) 수정
    if (steps[2].status !== 'ok') {
      const fixes = await fixStep3Uuid(prisma, fmeaId);
      steps[2].fixed = fixes;
      if (fixes.length > 0) steps[2].status = 'fixed';
    }

    // STEP 4 (FK) 수정
    if (steps[3].status !== 'ok') {
      const fixes = await fixStep4Fk(prisma, fmeaId);
      steps[3].fixed = fixes;
      if (fixes.length > 0) steps[3].status = 'fixed';
    }

    // STEP 5 (WS) 수정
    if (steps[4].status !== 'ok') {
      const fixes = await fixStep5Ws(prisma, fmeaId);
      steps[4].fixed = fixes;
      if (fixes.length > 0) steps[4].status = 'fixed';
    }

    const anyFixed = steps.some(s => s.fixed.length > 0);
    if (!anyFixed) {
      return { fmeaId, steps, allGreen: false, loopCount, timestamp: new Date().toISOString() };
    }
  }

  // 최종 검증
  const finalSteps: StepResult[] = [
    await verifyImport(prisma, fmeaId),
    await verifyParsing(prisma, fmeaId),
    await verifyUuid(prisma, fmeaId),
    await verifyFk(prisma, fmeaId),
    await verifyWs(prisma, fmeaId),
  ];

  return {
    fmeaId,
    steps: finalSteps,
    allGreen: finalSteps.every(s => s.status === 'ok'),
    loopCount,
    timestamp: new Date().toISOString(),
  };
}

// ─── HTTP handlers ───

export async function GET(request: NextRequest) {
  try {
    const fmeaId = request.nextUrl.searchParams.get('fmeaId');
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'fmeaId 필요' }, { status: 400 });
    }

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) return NextResponse.json({ success: false, error: 'DB 미설정' }, { status: 500 });

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) return NextResponse.json({ success: false, error: 'Prisma 실패' }, { status: 500 });

    const result = await runPipelineVerify(prisma, fmeaId, false);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    return NextResponse.json({ success: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fmeaId = body.fmeaId;
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'fmeaId 필요' }, { status: 400 });
    }

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) return NextResponse.json({ success: false, error: 'DB 미설정' }, { status: 500 });

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) return NextResponse.json({ success: false, error: 'Prisma 실패' }, { status: 500 });

    const result = await runPipelineVerify(prisma, fmeaId, true);

    // ★ ImportValidation 저장: pipeline 검증 결과를 ImportValidation 테이블에 기록
    let validationJobId: string | null = null;
    try {
      validationJobId = await savePipelineResultAsValidation(prisma, fmeaId, result);
    } catch (valErr) {
      console.error('[pipeline-verify] ImportValidation 저장 실패 (비치명적):', valErr);
    }

    return NextResponse.json({ success: true, ...result, validationJobId });
  } catch (e) {
    return NextResponse.json({ success: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}

// ─── Pipeline 검증 결과 → ImportValidation 저장 ───

async function savePipelineResultAsValidation(
  prisma: any,
  fmeaId: string,
  result: PipelineResult,
): Promise<string | null> {
  // ImportJob 찾거나 생성
  let job = await prisma.importJob.findFirst({
    where: { fmeaId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  }).catch(() => null);

  if (!job) {
    const { randomUUID } = await import('crypto');
    job = await prisma.importJob.create({
      data: {
        id: randomUUID(),
        fmeaId,
        status: 'verifying',
        flatDataCount: 0,
        chainCount: 0,
      },
    });
  }

  const jobId = job.id;

  // 기존 validation 삭제 후 새로 저장
  await prisma.importValidation.deleteMany({ where: { jobId } });

  interface ValidationData {
    jobId: string;
    ruleId: string;
    target: string;
    level: string;
    message: string;
    autoFixed: boolean;
  }
  const records: ValidationData[] = [];

  for (const step of result.steps) {
    const rulePrefix = `PIPELINE_S${step.step}`;

    for (const issue of step.issues) {
      records.push({
        jobId,
        ruleId: `${rulePrefix}_${step.name}`,
        target: `step${step.step}`,
        level: step.status === 'error' ? 'ERROR' : 'WARN',
        message: issue,
        autoFixed: false,
      });
    }

    for (const fix of step.fixed) {
      records.push({
        jobId,
        ruleId: `${rulePrefix}_FIX`,
        target: `step${step.step}`,
        level: 'INFO',
        message: fix,
        autoFixed: true,
      });
    }
  }

  if (records.length > 0) {
    await prisma.importValidation.createMany({ data: records });
  }

  return jobId;
}
