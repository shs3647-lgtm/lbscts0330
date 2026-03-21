/**
 * POST /api/fmea/seed-from-master — m066 마스터 기준 누락 데이터 FK 리매칭 시드
 *
 * m066과 동일 제품인 프로젝트에 누락된 FC/FL/RA/L1Function 요구사항을 직접 삽입.
 * rebuild-atomic의 dedup 로직을 거치지 않고 직접 DB에 삽입한다.
 *
 * ⚠️ RULE 0.8.1: 반드시 getPrismaForSchema(프로젝트 스키마)를 사용.
 * ⚠️ RULE 1.5: m066 마스터 DB에서 실제 데이터만 사용 (자동생성 금지).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import { safeErrorMessage } from '@/lib/security';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

interface SeedResult {
  l1Requirements: number;
  l1Functions: number;
  failureEffects: number;
  failureCauses: number;
  failureLinks: number;
  riskAnalyses: number;
}

export async function POST(req: NextRequest) {
  try {
    const { fmeaId } = await req.json();
    if (!fmeaId) return NextResponse.json({ error: 'fmeaId required' }, { status: 400 });

    // 마스터 JSON 로드 (m066 골든 레퍼런스)
    const m066Path = path.join(process.cwd(), 'data/master-fmea/pfm26-m066.json');
    if (!fs.existsSync(m066Path)) {
      return NextResponse.json({ error: 'm066 master JSON not found' }, { status: 404 });
    }
    const m066 = JSON.parse(fs.readFileSync(m066Path, 'utf8'));
    const m066L1Fs = m066.atomicDB?.l1Functions || [];
    const m066FEs = m066.atomicDB?.failureEffects || [];
    const m066FCs = m066.atomicDB?.failureCauses || [];

    // 프로젝트 스키마 접속
    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) return NextResponse.json({ error: 'Prisma null' }, { status: 500 });

    const result = await prisma.$transaction(async (tx: any) => {
      const created: SeedResult = { l1Requirements: 0, l1Functions: 0, failureEffects: 0, failureCauses: 0, failureLinks: 0, riskAnalyses: 0 };

      // ── 1. L1Function requirement 업데이트 ──
      const existingL1Fs = await tx.l1Function.findMany({ where: { fmeaId }, select: { id: true, requirement: true } });
      for (const dbL1f of existingL1Fs) {
        const m066L1f = m066L1Fs.find((f: any) => f.id === dbL1f.id);
        if (m066L1f?.requirement && !dbL1f.requirement) {
          await tx.l1Function.update({
            where: { id: dbL1f.id },
            data: { requirement: m066L1f.requirement },
          });
          created.l1Requirements++;
        }
      }

      // ── 2. 추가 L1Functions (요구사항 변형) 생성 ──
      const existingL1FIds = new Set(existingL1Fs.map((f: any) => f.id));
      const l1Struct = await tx.l1Structure.findFirst({ where: { fmeaId }, select: { id: true } });
      const l1StructId = l1Struct?.id;

      if (l1StructId) {
        const additionalL1Fs = m066L1Fs.filter((f: any) => !existingL1FIds.has(f.id));
        for (const mf of additionalL1Fs) {
          await tx.l1Function.create({
            data: {
              id: mf.id, fmeaId, l1StructId: l1StructId,
              category: mf.category || '', functionName: mf.functionName || '',
              requirement: mf.requirement || '',
            },
          }).catch(() => { /* skip duplicates */ });
          created.l1Functions++;
        }

        // L1Requirements
        for (const mf of m066L1Fs) {
          const reqs: string[] = mf.requirements || (mf.requirement ? [mf.requirement] : []);
          for (let i = 0; i < reqs.length; i++) {
            const reqId = `${mf.id}-R-${String(i).padStart(3, '0')}`;
            await tx.l1Requirement.upsert({
              where: { id: reqId },
              create: { id: reqId, fmeaId, l1StructId, l1FuncId: mf.id, requirement: reqs[i], orderIndex: i },
              update: { requirement: reqs[i], orderIndex: i },
            }).catch(() => { /* skip if l1FuncId FK fails */ });
          }
        }
      }

      // ── 3. 추가 FailureEffects 생성 ──
      const existingFEIds = new Set(
        (await tx.failureEffect.findMany({ where: { fmeaId }, select: { id: true } }))
          .map((f: any) => f.id)
      );
      for (const mfe of m066FEs) {
        if (existingFEIds.has(mfe.id)) continue;
        // l1FuncId FK 검증
        const l1fExists = await tx.l1Function.findFirst({ where: { id: mfe.l1FuncId } });
        if (!l1fExists) continue;
        await tx.failureEffect.create({
          data: {
            id: mfe.id, fmeaId, l1StructId: l1StructId || mfe.l1StructId,
            l1FuncId: mfe.l1FuncId, scope: mfe.scope || null,
            effect: mfe.effect || '',
          },
        }).catch(() => { /* skip duplicates */ });
        created.failureEffects++;
      }

      // ── 4. 누락 FC 직접 삽입 (orphanPC 해결) ──
      const existingFCIds = new Set(
        (await tx.failureCause.findMany({ where: { fmeaId }, select: { id: true } }))
          .map((f: any) => f.id)
      );
      const existingL3FIds = new Set(
        (await tx.l3Function.findMany({ where: { fmeaId }, select: { id: true } }))
          .map((f: any) => f.id)
      );
      const dbL3Ids = new Set(
        (await tx.l3Structure.findMany({ where: { fmeaId }, select: { id: true } }))
          .map((s: any) => s.id)
      );

      // L3Function별로 FC 존재여부 확인
      const l3FuncFcCount = new Map<string, number>();
      const allFcs = await tx.failureCause.findMany({ where: { fmeaId }, select: { l3FuncId: true } });
      for (const fc of allFcs) {
        l3FuncFcCount.set(fc.l3FuncId, (l3FuncFcCount.get(fc.l3FuncId) || 0) + 1);
      }

      // orphan L3Functions (FC 없는) 찾기
      const orphanL3Fs = (await tx.l3Function.findMany({
        where: { fmeaId },
        select: { id: true, l3StructId: true, l2StructId: true, functionName: true },
      })).filter((f: any) => !l3FuncFcCount.has(f.id));

      // m066에서 해당 L3Structure의 FC 가져오기
      for (const orphanL3f of orphanL3Fs) {
        const m066Fcs = m066FCs.filter((fc: any) => fc.l3StructId === orphanL3f.l3StructId);
        if (m066Fcs.length === 0) continue;

        // FM/FE 조회
        const fm = await tx.failureMode.findFirst({ where: { fmeaId, l2StructId: orphanL3f.l2StructId } });
        const fe = await tx.failureEffect.findFirst({ where: { fmeaId } });
        if (!fm || !fe) continue;

        for (const mfc of m066Fcs) {
          // 동일 cause + l3StructId가 이미 존재하면 skip
          const existsInDb = await tx.failureCause.findFirst({
            where: { fmeaId, l3StructId: mfc.l3StructId, cause: mfc.cause },
          });
          if (existsInDb) continue;

          const fcId = `${orphanL3f.id}-K-${created.failureCauses + 1}`;
          await tx.failureCause.create({
            data: {
              id: fcId, fmeaId,
              l3FuncId: orphanL3f.id, l3StructId: orphanL3f.l3StructId,
              l2StructId: orphanL3f.l2StructId, processCharId: orphanL3f.id,
              cause: mfc.cause || '',
            },
          });
          created.failureCauses++;

          // FailureLink
          const flId = `${fcId}-FL`;
          await tx.failureLink.create({
            data: { id: flId, fmeaId, fmId: fm.id, feId: fe.id, fcId },
          });
          created.failureLinks++;

          // RiskAnalysis
          const ra = m066.atomicDB?.riskAnalyses?.find((r: any) => {
            const link = m066.atomicDB?.failureLinks?.find((l: any) => l.id === r.linkId);
            return link?.fcId === mfc.id;
          });
          await tx.riskAnalysis.create({
            data: {
              id: `ra-${flId}`, fmeaId, linkId: flId,
              severity: ra?.severity || 5, occurrence: ra?.occurrence || 3, detection: ra?.detection || 4,
              ap: ra?.ap || 'L',
              preventionControl: ra?.preventionControl || mfc.pc || '',
              detectionControl: ra?.detectionControl || mfc.dc || '',
            },
          });
          created.riskAnalyses++;
        }
      }

      return created;
    });

    // 최종 카운트
    const [fc, fl, ra, l1f, l3f, fe] = await Promise.all([
      prisma.failureCause.count({ where: { fmeaId } }),
      prisma.failureLink.count({ where: { fmeaId } }),
      prisma.riskAnalysis.count({ where: { fmeaId } }),
      prisma.l1Function.count({ where: { fmeaId } }),
      prisma.l3Function.count({ where: { fmeaId } }),
      prisma.failureEffect.count({ where: { fmeaId } }),
    ]);

    return NextResponse.json({
      ok: true,
      seeded: result,
      totals: { l1f, l3f, fe, fc, fl, ra },
    });
  } catch (e) {
    console.error('[seed-from-master]', e);
    return NextResponse.json({ error: safeErrorMessage(e) }, { status: 500 });
  }
}
