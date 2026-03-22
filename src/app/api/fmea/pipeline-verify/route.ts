/**
 * @file pipeline-verify/route.ts
 * 파이프라인 검증 v3 — 5단계 통합 검증 + 자동수정 루프
 *
 * GET  /api/fmea/pipeline-verify?fmeaId=xxx  → 현재 상태 조회 (읽기 전용)
 * POST /api/fmea/pipeline-verify             → 검증 + 자동수정 루프 실행
 *
 * 5단계: 구조(0) → UUID(1) → fmeaId(2) → FK(3) → 누락(4)
 * 엑셀 Import / 역설계 Import 공통 검증 구조
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import {
  type StepResult, type PipelineResult,
  verifyStructure, verifyUuid, verifyFmeaId, verifyFk, verifyMissing,
} from './verify-steps';
import { fixStructure, fixUuid, fixFk, fixMissing } from './auto-fix';

export const runtime = 'nodejs';

// ─── 메인 검증+수정 루프 ─────────────────────────────────────

async function runPipelineVerify(prisma: any, fmeaId: string, autoFix: boolean): Promise<PipelineResult> {
  const MAX_LOOPS = 3;
  let loopCount = 0;

  for (let i = 0; i < MAX_LOOPS; i++) {
    loopCount = i + 1;

    const steps: StepResult[] = [
      await verifyStructure(prisma, fmeaId),  // STEP 0: 구조
      await verifyUuid(prisma, fmeaId),        // STEP 1: UUID
      await verifyFmeaId(prisma, fmeaId),      // STEP 2: fmeaId
      await verifyFk(prisma, fmeaId),          // STEP 3: FK
      await verifyMissing(prisma, fmeaId),     // STEP 4: 누락
    ];

    if (!autoFix) {
      const allOk = steps.every(s => s.status === 'ok');
      return { fmeaId, steps, allGreen: allOk, loopCount, timestamp: new Date().toISOString() };
    }

    const allOk = steps.every(s => s.status === 'ok');
    if (allOk) {
      return { fmeaId, steps, allGreen: true, loopCount, timestamp: new Date().toISOString() };
    }

    // 자동수정 실행 (순서대로)
    const step0 = steps[0];
    if (step0.status === 'error') {
      step0.fixed = await fixStructure(prisma, fmeaId);
      if (step0.fixed.length > 0) step0.status = 'fixed';
    }

    const step1 = steps[1];
    if (step1.status !== 'ok') {
      const fixes = await fixUuid(prisma, fmeaId);
      step1.fixed = fixes;
      if (fixes.length > 0) step1.status = 'fixed';
    }

    // STEP 2 (fmeaId): 자동수정 불가 — 수동 대응 필요
    const step2 = steps[2];
    if (step2.status === 'error') {
      step2.fixed.push('[경고] fmeaId 불일치 — 수동 리매핑 필요');
    }

    const step3 = steps[3];
    if (step3.status !== 'ok') {
      const fixes = await fixFk(prisma, fmeaId);
      step3.fixed = fixes;
      if (fixes.length > 0) step3.status = 'fixed';
    }

    const step4 = steps[4];
    if (step4.status !== 'ok') {
      const fixes = await fixMissing(prisma, fmeaId);
      step4.fixed = fixes;
      if (fixes.length > 0) step4.status = 'fixed';
    }

    const anyFixed = steps.some(s => s.fixed.length > 0);
    if (!anyFixed) {
      const acceptable = steps.every(s => s.status === 'ok');
      return { fmeaId, steps, allGreen: acceptable, loopCount, timestamp: new Date().toISOString() };
    }
  }

  // 최종 검증
  const finalSteps: StepResult[] = [
    await verifyStructure(prisma, fmeaId),
    await verifyUuid(prisma, fmeaId),
    await verifyFmeaId(prisma, fmeaId),
    await verifyFk(prisma, fmeaId),
    await verifyMissing(prisma, fmeaId),
  ];

  const acceptable = finalSteps.every(s => s.status === 'ok' || s.status === 'warn');
  return {
    fmeaId,
    steps: finalSteps,
    allGreen: acceptable,
    loopCount,
    timestamp: new Date().toISOString(),
  };
}

// ─── HTTP handlers ───────────────────────────────────────────

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

    // ★★★ 2026-03-21 FIX: search_path 강제 설정 — 프로젝트 스키마 우선, public 폴백
    if (!/^[a-z][a-z0-9_]*$/.test(schema)) throw new Error(`Invalid schema: ${schema}`);
    await prisma.$executeRawUnsafe(`SET search_path TO ${schema}, public`);

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

    // ★★★ 2026-03-21 FIX: search_path 강제 설정
    if (!/^[a-z][a-z0-9_]*$/.test(schema)) throw new Error(`Invalid schema: ${schema}`);
    await prisma.$executeRawUnsafe(`SET search_path TO ${schema}, public`);

    const result = await runPipelineVerify(prisma, fmeaId, true);

    // ImportValidation 저장
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

// ─── Pipeline 검증 결과 → ImportValidation 저장 ──────────────

async function savePipelineResultAsValidation(
  prisma: any,
  fmeaId: string,
  result: PipelineResult,
): Promise<string | null> {
  let job = await prisma.importJob.findFirst({
    where: { fmeaId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  }).catch(() => null);

  if (!job) {
    const { randomUUID } = await import('crypto');
    job = await prisma.importJob.create({
      data: { id: randomUUID(), fmeaId, status: 'verifying', flatDataCount: 0, chainCount: 0 },
    });
  }

  const jobId = job.id;
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
    const rulePrefix = `PIPE_S${step.step}`;
    for (const issue of step.issues) {
      records.push({
        jobId, ruleId: `${rulePrefix}_${step.name}`, target: `step${step.step}`,
        level: step.status === 'error' ? 'ERROR' : 'WARN', message: issue, autoFixed: false,
      });
    }
    for (const fix of step.fixed) {
      records.push({
        jobId, ruleId: `${rulePrefix}_FIX`, target: `step${step.step}`,
        level: 'INFO', message: fix, autoFixed: true,
      });
    }
  }

  if (records.length > 0) {
    await prisma.importValidation.createMany({ data: records });
  }
  return jobId;
}
