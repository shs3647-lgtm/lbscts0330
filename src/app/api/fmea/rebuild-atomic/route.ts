// ██████████████████████████████████████████████████████████████████████████████
// ██  CODEFREEZE — 중복제거(dedup) 규칙 영구 보호 (2026-03-21)                  ██
// ██                                                                            ██
// ██  이 파일의 dedup 로직을 수정하려면 사용자에게 아래 문구로 허락을 받아야 합니다: ██
// ██  "rebuild-atomic dedup 공정번호 기반 중복제거 CODEFREEZE 해제를 허락합니다"   ██
// ██                                                                            ██
// ██  ═══ 중복제거 핵심 원칙 (절대 위반 금지) ═══                                ██
// ██                                                                            ██
// ██  1. 모든 dedup key에 공정번호(l2StructId) 필수 포함                          ██
// ██     - 공정이 다르면 동일 이름의 FC/FM/FE/L3F도 별개 엔티티                   ██
// ██     - 예: 공정10 "작업숙련도부족" ≠ 공정20 "작업숙련도부족"                   ██
// ██                                                                            ██
// ██  2. FC dedup key = l2StructId + l3StructId + l3FuncId + cause               ██
// ██     - 같은 공정이라도 다른 WE의 동일 원인은 별개                              ██
// ██     - 같은 WE라도 다른 L3Function의 동일 원인은 별개                          ██
// ██     - MN(작업자)은 모든 공정에 배치 → 모든 공정별 독립 FC                     ██
// ██                                                                            ██
// ██  3. FailureLink dedup key = fmId + fcId + feId (3요소 완전일치)              ██
// ██     - 같은 FM+FC라도 다른 FE에 연결되면 별개 FailureLink                     ██
// ██     - feId 누락 시 유효한 고장사슬 삭제 → 워크시트 빈칸 발생                  ██
// ██                                                                            ██
// ██  4. L1 dedup key에 구분(C1 category) 필수 포함                              ██
// ██     - 구분+요구사항, 구분+완제품기능, 구분+고장영향으로 중복 검증              ██
// ██                                                                            ██
// ██  5. 단어만 보고 중복삭제 절대 금지                                           ██
// ██     - 모든 중복 판단은 공정번호/구분과 매칭해서 검증                          ██
// ██     - 이 원칙 위반이 마스터 데이터 Import 시 반복적 누락의 근본 원인          ██
// ██                                                                            ██
// ██████████████████████████████████████████████████████████████████████████████
/**
 * @file rebuild-atomic/route.ts
 * @description Atomic DB 자체 정합성 재구성 (Legacy 의존성 제거)
 *
 * POST /api/fmea/rebuild-atomic?fmeaId=xxx
 *
 * 목적:
 * - Atomic DB 내부 정합성 검증 및 수복 (중복 FC, 미연결 FC, orphan RA 등)
 * - Legacy DB에 의존하지 않고 Atomic DB만으로 자체 수복
 * - 온프레미스 릴리즈 시 DB 정합성 확보
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBaseDatabaseUrl, getPrisma, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import * as fs from 'fs';
import * as path from 'path';


export const runtime = 'nodejs';

const AP_TABLE_LOCAL = [
  { s: '9-10', o: '8-10', d: ['H','H','H','H'] }, { s: '9-10', o: '6-7', d: ['H','H','H','H'] },
  { s: '9-10', o: '4-5', d: ['H','H','H','M'] }, { s: '9-10', o: '2-3', d: ['H','M','L','L'] },
  { s: '9-10', o: '1', d: ['L','L','L','L'] }, { s: '7-8', o: '8-10', d: ['H','H','H','H'] },
  { s: '7-8', o: '6-7', d: ['H','H','H','M'] }, { s: '7-8', o: '4-5', d: ['H','M','M','M'] },
  { s: '7-8', o: '2-3', d: ['M','M','L','L'] }, { s: '7-8', o: '1', d: ['L','L','L','L'] },
  { s: '4-6', o: '8-10', d: ['H','H','M','M'] }, { s: '4-6', o: '6-7', d: ['M','M','M','L'] },
  { s: '4-6', o: '4-5', d: ['M','L','L','L'] }, { s: '4-6', o: '2-3', d: ['L','L','L','L'] },
  { s: '4-6', o: '1', d: ['L','L','L','L'] }, { s: '2-3', o: '8-10', d: ['M','M','L','L'] },
  { s: '2-3', o: '6-7', d: ['L','L','L','L'] }, { s: '2-3', o: '4-5', d: ['L','L','L','L'] },
  { s: '2-3', o: '2-3', d: ['L','L','L','L'] }, { s: '2-3', o: '1', d: ['L','L','L','L'] },
];
function calculateAPLocal(s: number, o: number, d: number): string {
  if (s <= 0 || o <= 0 || d <= 0) return 'L';
  const sR = s >= 9 ? '9-10' : s >= 7 ? '7-8' : s >= 4 ? '4-6' : s >= 2 ? '2-3' : null;
  if (!sR) return 'L';
  const oR = o >= 8 ? '8-10' : o >= 6 ? '6-7' : o >= 4 ? '4-5' : o >= 2 ? '2-3' : '1';
  const dI = d >= 7 ? 0 : d >= 5 ? 1 : d >= 2 ? 2 : 3;
  const row = AP_TABLE_LOCAL.find(r => r.s === sR && r.o === oR);
  return row ? row.d[dI] : 'L';
}

export async function POST(request: NextRequest) {
  try {
    // ✅ FMEA ID는 항상 소문자로 정규화 (DB 정규화)
    const fmeaId = request.nextUrl.searchParams.get('fmeaId')?.toLowerCase();
    // ★★★ 2026-02-05: API 응답 형식 통일 (ok → success) ★★★
    if (!fmeaId) return NextResponse.json({ success: false, error: 'fmeaId parameter is required' }, { status: 400 });

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) return NextResponse.json({ success: false, error: 'Prisma not configured' }, { status: 200 });

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) return NextResponse.json({ success: false, error: 'Prisma not configured' }, { status: 200 });

    // ★★★ 2026-03-20: Atomic DB 존재 확인 — Legacy 의존성 완전 제거 ★★★
    const l2Count = await prisma.l2Structure.count({ where: { fmeaId } });
    if (l2Count === 0) {
      return NextResponse.json({ success: false, error: 'No Atomic DB data found for this fmeaId. Import data first.' }, { status: 404 });
    }

    // Atomic DB에서 기존 데이터 로드 (정합성 수복용)
    const [
      existingL1s, existingL2s, existingL3s,
      existingL1Funcs, existingL2Funcs, existingL3Funcs,
      existingFEs, existingFMs, existingFCs,
      existingFLs, existingRAs,
    ] = await Promise.all([
      prisma.l1Structure.findMany({ where: { fmeaId } }),
      prisma.l2Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } }),
      prisma.l3Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } }),
      prisma.l1Function.findMany({ where: { fmeaId } }),
      prisma.l2Function.findMany({ where: { fmeaId } }),
      prisma.l3Function.findMany({ where: { fmeaId } }),
      prisma.failureEffect.findMany({ where: { fmeaId } }),
      prisma.failureMode.findMany({ where: { fmeaId } }),
      prisma.failureCause.findMany({ where: { fmeaId } }),
      prisma.failureLink.findMany({ where: { fmeaId } }),
      prisma.riskAnalysis.findMany({ where: { fmeaId } }),
    ]);

    // Build atomic snapshot for integrity checks
    const atomic = {
      l1Structure: existingL1s[0] || null,
      l2Structures: existingL2s,
      l3Structures: existingL3s,
      l1Functions: existingL1Funcs,
      l2Functions: existingL2Funcs,
      l3Functions: existingL3Funcs,
      failureEffects: existingFEs,
      failureModes: existingFMs,
      failureCauses: existingFCs,
      failureLinks: existingFLs,
      riskAnalyses: existingRAs,
    };

    await prisma.$transaction(async (tx: any) => {

      // ═══════════════════════════════════════════════════════════════════════
      // PHASE: DB 다이렉트 꽂아넣기 — 마스터 JSON + ID 리매핑
      // 목적: 프로젝트 스키마에 누락된 엔티티를 마스터 JSON에서 복원한다.
      // 핵심: DB L3Structure ID(UUID v4)와 마스터 결정론적 ID를 리매핑한다.
      // 원칙: 기존 데이터 수정/삭제 없이 누락분만 추가 (skipDuplicates)
      // ═══════════════════════════════════════════════════════════════════════
      {
        const masterJsonPath = path.join(process.cwd(), 'data', 'master-fmea', `${fmeaId}.json`);
        let masterData: any = null;
        try {
          if (fs.existsSync(masterJsonPath)) {
            masterData = JSON.parse(fs.readFileSync(masterJsonPath, 'utf8'));
            console.info(`[rebuild-atomic] Master JSON loaded: ${masterJsonPath}`);
          }
        } catch (e: any) {
          console.warn(`[rebuild-atomic] Master JSON load failed: ${e?.message}`);
        }

        const now = new Date();

        // ── ID 리매핑 구축: 마스터 결정론적 ID → DB UUID v4 ──
        // L2Structure: DB도 결정론적 ID 사용 (PF-L2-xxx) → 리매핑 불필요
        // L3Structure: DB는 UUID v4, 마스터는 결정론적 → l2Id+m4+order로 매칭
        const l3IdMap = new Map<string, string>(); // masterL3Id → dbL3Id
        const l3ToL2Map = new Map<string, string>(); // dbL3Id → l2StructId

        if (masterData?.atomicDB) {
          const master = masterData.atomicDB;
          const masterL3s: any[] = master.l3Structures || [];
          const dbL3s = atomic.l3Structures;

          // l2Id+m4+order 기준 매칭
          for (const ml3 of masterL3s) {
            const match = dbL3s.find((dl3: any) =>
              dl3.l2Id === ml3.l2Id && dl3.m4 === ml3.m4 && dl3.order === ml3.order
            );
            if (match) {
              l3IdMap.set(ml3.id, (match as any).id);
            }
          }
          console.info(`[rebuild-atomic] L3 ID 리매핑: ${l3IdMap.size}/${masterL3s.length}`);
        }

        for (const l3 of atomic.l3Structures) {
          l3ToL2Map.set((l3 as any).id, (l3 as any).l2Id);
        }

        if (masterData?.atomicDB) {
          const master = masterData.atomicDB;

          // ── 1. L1Functions ──
          {
            const existingIds = new Set(atomic.l1Functions.map((f: any) => f.id));
            const missing = (master.l1Functions || []).filter((f: any) => !existingIds.has(f.id));
            const l1Id = atomic.l1Structure ? (atomic.l1Structure as any).id : null;
            if (missing.length > 0 && l1Id) {
              const valid = missing.filter((f: any) => f.l1StructId === l1Id || f.l1StructId === 'PF-L1-YP');
              if (valid.length > 0) {
                await tx.l1Function.createMany({
                  data: valid.map((f: any) => ({
                    id: f.id, fmeaId, l1StructId: l1Id,
                    category: f.category || '', functionName: f.functionName || '',
                    requirement: f.requirement || '', createdAt: now, updatedAt: now,
                  })),
                  skipDuplicates: true,
                });
                console.info(`[rebuild-atomic] L1Functions 생성: ${valid.length}`);
              }
            }
            // ── 1b. 기존 L1Function requirement 갱신 (마스터 JSON에 값이 있고 DB가 비어있는 경우) ──
            for (const mf of (master.l1Functions || [])) {
              if (mf.requirement && existingIds.has(mf.id)) {
                const existing = atomic.l1Functions.find((f: any) => f.id === mf.id);
                if (existing && !(existing as any).requirement) {
                  await tx.l1Function.update({
                    where: { id: mf.id },
                    data: { requirement: mf.requirement },
                  });
                }
              }
            }
            // ── 1c. L1Requirement 동기화 (마스터 JSON requirements 배열) ──
            if (l1Id) {
              for (const mf of (master.l1Functions || [])) {
                const reqs: string[] = mf.requirements || (mf.requirement ? [mf.requirement] : []);
                for (let i = 0; i < reqs.length; i++) {
                  const reqId = `${mf.id}-R-${String(i).padStart(3, '0')}`;
                  await tx.l1Requirement.upsert({
                    where: { id: reqId },
                    create: { id: reqId, fmeaId, l1StructId: l1Id, l1FuncId: mf.id, requirement: reqs[i], orderIndex: i },
                    update: { requirement: reqs[i], orderIndex: i },
                  });
                }
              }
              console.info(`[rebuild-atomic] L1Requirements 동기화 완료`);
            }
          }

          // ── 2. L2Functions (결정론적 ID → 직접 사용) ──
          {
            const existingIds = new Set(atomic.l2Functions.map((f: any) => f.id));
            const l2StructIds = new Set(atomic.l2Structures.map((s: any) => s.id));
            const missing = (master.l2Functions || []).filter((f: any) =>
              !existingIds.has(f.id) && l2StructIds.has(f.l2StructId)
            );
            if (missing.length > 0) {
              await tx.l2Function.createMany({
                data: missing.map((f: any) => ({
                  id: f.id, fmeaId, l2StructId: f.l2StructId,
                  functionName: f.functionName || '', productChar: f.productChar || 'N/A',
                  specialChar: f.specialChar || null, createdAt: now, updatedAt: now,
                })),
                skipDuplicates: true,
              });
              console.info(`[rebuild-atomic] L2Functions 생성: ${missing.length}`);
            }
          }

          // ── 3. L3Functions (ID 리매핑 적용) ──
          {
            const existingIds = new Set(atomic.l3Functions.map((f: any) => f.id));
            const dbL3Ids = new Set(atomic.l3Structures.map((s: any) => s.id));
            const l3fToCreate: any[] = [];

            for (const mf of (master.l3Functions || [])) {
              // 리매핑: 마스터 l3StructId → DB l3 UUID
              const dbL3Id = l3IdMap.get(mf.l3StructId) || mf.l3StructId;
              const dbL2Id = l3ToL2Map.get(dbL3Id) || mf.l2StructId;
              // 새 ID = DB L3 ID 기반 결정론적 생성
              const newId = `${dbL3Id}-G-${l3fToCreate.filter(x => x.l3StructId === dbL3Id).length + 1}`;

              if (!dbL3Ids.has(dbL3Id)) continue; // FK 없으면 스킵
              if (existingIds.has(mf.id) || existingIds.has(newId)) continue;

              l3fToCreate.push({
                id: newId, fmeaId, l3StructId: dbL3Id, l2StructId: dbL2Id,
                functionName: mf.functionName || '', processChar: mf.processChar || '',
                specialChar: mf.specialChar || null, createdAt: now, updatedAt: now,
              });
              existingIds.add(newId);
            }

            // L3Structure에 L3Function이 없는 경우 빈 함수 생성
            const l3sWithFunc = new Set([
              ...atomic.l3Functions.map((f: any) => f.l3StructId),
              ...l3fToCreate.map((f: any) => f.l3StructId),
            ]);
            for (const l3 of atomic.l3Structures) {
              const l3Id = (l3 as any).id;
              if (!l3sWithFunc.has(l3Id)) {
                const fallbackId = `${l3Id}-G`;
                if (!existingIds.has(fallbackId)) {
                  l3fToCreate.push({
                    id: fallbackId, fmeaId, l3StructId: l3Id,
                    l2StructId: l3ToL2Map.get(l3Id) || '',
                    functionName: (l3 as any).name || '', processChar: '',
                    specialChar: null, createdAt: now, updatedAt: now,
                  });
                }
              }
            }

            if (l3fToCreate.length > 0) {
              await tx.l3Function.createMany({ data: l3fToCreate, skipDuplicates: true });
              console.info(`[rebuild-atomic] L3Functions 생성: ${l3fToCreate.length}`);
            }
          }

          // ── 리프레시: 방금 생성한 L3F/L2F/L1F를 스냅샷에 반영 ──
          const [refL1Fs, refL2Fs, refL3Fs] = await Promise.all([
            tx.l1Function.findMany({ where: { fmeaId } }),
            tx.l2Function.findMany({ where: { fmeaId } }),
            tx.l3Function.findMany({ where: { fmeaId } }),
          ]);
          atomic.l1Functions = refL1Fs;
          atomic.l2Functions = refL2Fs;
          atomic.l3Functions = refL3Fs;

          // ── 4. FailureEffects ──
          {
            const existingIds = new Set(atomic.failureEffects.map((f: any) => f.id));
            const l1FuncIds = new Set(atomic.l1Functions.map((f: any) => f.id));
            const missing = (master.failureEffects || []).filter((f: any) =>
              !existingIds.has(f.id) && l1FuncIds.has(f.l1FuncId)
            );
            if (missing.length > 0) {
              await tx.failureEffect.createMany({
                data: missing.map((f: any) => ({
                  id: f.id, fmeaId, l1FuncId: f.l1FuncId,
                  category: f.category || '', effect: f.effect || '',
                  severity: f.severity || 1, createdAt: now, updatedAt: now,
                })),
                skipDuplicates: true,
              });
              console.info(`[rebuild-atomic] FailureEffects 생성: ${missing.length}`);
            }
          }

          // ── 5. ProcessProductChar (FM.productCharId FK용) ──
          {
            const pcDataMap = new Map<string, any>();
            for (const fm of (master.failureModes || [])) {
              if (fm.productCharId && !pcDataMap.has(fm.productCharId)) {
                pcDataMap.set(fm.productCharId, {
                  id: fm.productCharId, fmeaId, l2StructId: fm.l2StructId,
                  name: fm.productChar || fm.mode || '', specialChar: null,
                  orderIndex: 0, createdAt: now, updatedAt: now,
                });
              }
            }
            if (pcDataMap.size > 0) {
              await tx.processProductChar.createMany({
                data: [...pcDataMap.values()], skipDuplicates: true,
              });
              console.info(`[rebuild-atomic] ProcessProductChar 생성: ${pcDataMap.size}`);
            }
          }

          // ── 6. FailureModes (L2 결정론적 ID → 직접 사용) ──
          {
            const existingIds = new Set(atomic.failureModes.map((f: any) => f.id));
            const l2FuncIds = new Set(atomic.l2Functions.map((f: any) => f.id));
            const l2StructIds = new Set(atomic.l2Structures.map((s: any) => s.id));
            const missing = (master.failureModes || []).filter((f: any) =>
              !existingIds.has(f.id) && l2FuncIds.has(f.l2FuncId) && l2StructIds.has(f.l2StructId)
            );
            if (missing.length > 0) {
              await tx.failureMode.createMany({
                data: missing.map((f: any) => ({
                  id: f.id, fmeaId, l2FuncId: f.l2FuncId, l2StructId: f.l2StructId,
                  productCharId: f.productCharId || null, mode: f.mode || '',
                  specialChar: f.specialChar ?? false, createdAt: now, updatedAt: now,
                })),
                skipDuplicates: true,
              });
              console.info(`[rebuild-atomic] FailureModes 생성: ${missing.length}`);
            }
          }

          // ── 7. FailureCauses (ID 리매핑 적용) ──
          {
            const existingIds = new Set(atomic.failureCauses.map((f: any) => f.id));
            const l3FuncIds = new Set(atomic.l3Functions.map((f: any) => f.id));
            const dbL3Ids = new Set(atomic.l3Structures.map((s: any) => s.id));
            // L3Func을 l3StructId 기준으로 인덱싱
            const l3FuncByStruct = new Map<string, string>();
            for (const f of atomic.l3Functions) {
              if (!(f as any).l3StructId) continue;
              if (!l3FuncByStruct.has((f as any).l3StructId)) {
                l3FuncByStruct.set((f as any).l3StructId, (f as any).id);
              }
            }

            const fcToCreate: any[] = [];
            for (const mfc of (master.failureCauses || [])) {
              if (existingIds.has(mfc.id)) continue;

              // 리매핑
              const dbL3StructId = l3IdMap.get(mfc.l3StructId) || mfc.l3StructId;
              const dbL2Id = l3ToL2Map.get(dbL3StructId) || mfc.l2StructId;
              if (!dbL3Ids.has(dbL3StructId)) continue; // FK 없으면 스킵

              // L3FuncId 리매핑: 마스터 l3FuncId → DB의 해당 L3Struct 첫 L3Func
              let dbL3FuncId = l3FuncByStruct.get(dbL3StructId) || `${dbL3StructId}-G`;
              if (!l3FuncIds.has(dbL3FuncId)) {
                dbL3FuncId = `${dbL3StructId}-G`;
              }

              const newId = `${dbL3StructId}-K-${fcToCreate.filter(x => x.l3StructId === dbL3StructId).length + 1}`;
              fcToCreate.push({
                id: newId, fmeaId, l3FuncId: dbL3FuncId, l3StructId: dbL3StructId,
                l2StructId: dbL2Id, processCharId: dbL3FuncId,
                cause: mfc.cause || '', occurrence: mfc.occurrence || null,
                createdAt: now, updatedAt: now,
              });
              existingIds.add(newId);
            }

            if (fcToCreate.length > 0) {
              await tx.failureCause.createMany({ data: fcToCreate, skipDuplicates: true });
              console.info(`[rebuild-atomic] FailureCauses 생성: ${fcToCreate.length}`);
            }
          }

          // ── 8. FailureLinks + RiskAnalyses 복원 (ID 리매핑) ──
          {
            const existingFLIds = new Set(atomic.failureLinks.map((fl: any) => fl.id));
            // 리프레시: FM/FC/FE 최신
            const [curFMs, curFEs, curFCs] = await Promise.all([
              tx.failureMode.findMany({ where: { fmeaId }, select: { id: true } }),
              tx.failureEffect.findMany({ where: { fmeaId }, select: { id: true } }),
              tx.failureCause.findMany({ where: { fmeaId }, select: { id: true } }),
            ]);
            const fmIdSet = new Set(curFMs.map((f: { id: string }) => f.id));
            const feIdSet = new Set(curFEs.map((f: { id: string }) => f.id));
            const fcIdSet = new Set(curFCs.map((f: { id: string }) => f.id));

            // FC ID 리매핑: 마스터 FC ID → DB FC ID (cause 텍스트 + l3StructId 기준)
            const fcIdRemap = new Map<string, string>();
            const dbFCsByStruct = new Map<string, any[]>();
            const allDbFCs = await tx.failureCause.findMany({ where: { fmeaId } });
            for (const fc of allDbFCs) {
              const key = (fc as any).l3StructId;
              if (!dbFCsByStruct.has(key)) dbFCsByStruct.set(key, []);
              dbFCsByStruct.get(key)!.push(fc);
            }
            for (const mfc of (master.failureCauses || [])) {
              const dbL3Id = l3IdMap.get(mfc.l3StructId) || mfc.l3StructId;
              const candidates = dbFCsByStruct.get(dbL3Id) || [];
              const match = candidates.find((c: any) => c.cause === mfc.cause);
              if (match) fcIdRemap.set(mfc.id, (match as any).id);
            }

            const flsToCreate: any[] = [];
            const rasToCreate: any[] = [];
            const masterRAs = master.riskAnalyses || [];
            const raByLinkId = new Map<string, any>(masterRAs.map((r: any) => [r.linkId, r]));

            // Logical dedup: 기존 DB FL의 (fmId|fcId|feId) 조합 수집 (Rule 1.7.1)
            const existingFLKeys = new Set(
              atomic.failureLinks.map((fl: any) => `${fl.fmId}|${fl.fcId}|${fl.feId}`)
            );
            const newFLKeys = new Set<string>();

            for (const mfl of (master.failureLinks || [])) {
              if (existingFLIds.has(mfl.id)) continue;

              const fmId = mfl.fmId; // FM은 결정론적 → 그대로
              const feId = mfl.feId; // FE는 결정론적 → 그대로
              const fcId = fcIdRemap.get(mfl.fcId) || mfl.fcId; // FC는 리매핑

              if (!fmIdSet.has(fmId) || !feIdSet.has(feId) || !fcIdSet.has(fcId)) continue;

              // Logical dedup: fmId|fcId|feId 3요소 중복 체크 (Rule 1.7.1)
              const dedupKey = `${fmId}|${fcId}|${feId}`;
              if (existingFLKeys.has(dedupKey) || newFLKeys.has(dedupKey)) continue;
              newFLKeys.add(dedupKey);

              const newFlId = `FL-${fmeaId}-${flsToCreate.length + 1}`;
              flsToCreate.push({
                id: newFlId, fmeaId, fmId, feId, fcId,
                fmText: mfl.fmText || null, feText: mfl.feText || null,
                fcText: mfl.fcText || null, fmProcess: mfl.fmProcess || null,
                feScope: mfl.feScope || null, fcWorkElem: mfl.fcWorkElem || null,
                fcM4: mfl.fcM4 || null, severity: mfl.severity || null,
                fmSeq: mfl.fmSeq ?? null, feSeq: mfl.feSeq ?? null, fcSeq: mfl.fcSeq ?? null,
                fmPath: mfl.fmPath ?? null, fePath: mfl.fePath ?? null, fcPath: mfl.fcPath ?? null,
                createdAt: now, updatedAt: now,
              });

              // RA 연동
              const mra = raByLinkId.get(mfl.id);
              rasToCreate.push({
                id: `ra-${newFlId}`, fmeaId, linkId: newFlId,
                severity: mra?.severity || 1, occurrence: mra?.occurrence || 1,
                detection: mra?.detection || 1, ap: mra?.ap || 'L',
                preventionControl: mra?.preventionControl || null,
                detectionControl: mra?.detectionControl || null,
                createdAt: now, updatedAt: now,
              });
            }

            if (flsToCreate.length > 0) {
              await tx.failureLink.createMany({ data: flsToCreate, skipDuplicates: true });
              console.info(`[rebuild-atomic] FailureLinks 복원: ${flsToCreate.length}`);
            }
            if (rasToCreate.length > 0) {
              await tx.riskAnalysis.createMany({ data: rasToCreate, skipDuplicates: true });
              console.info(`[rebuild-atomic] RiskAnalyses 복원: ${rasToCreate.length}`);
            }
          }

          // ── 리프레시: 전체 스냅샷 갱신 ──
          const [refreshedFMs, refreshedFEs, refreshedFCs, refreshedL3Fs, refreshedFLs, refreshedRAs] = await Promise.all([
            tx.failureMode.findMany({ where: { fmeaId } }),
            tx.failureEffect.findMany({ where: { fmeaId } }),
            tx.failureCause.findMany({ where: { fmeaId } }),
            tx.l3Function.findMany({ where: { fmeaId } }),
            tx.failureLink.findMany({ where: { fmeaId } }),
            tx.riskAnalysis.findMany({ where: { fmeaId } }),
          ]);
          atomic.failureModes = refreshedFMs;
          atomic.failureEffects = refreshedFEs;
          atomic.failureCauses = refreshedFCs;
          atomic.l3Functions = refreshedL3Fs;
          atomic.failureLinks = refreshedFLs;
          atomic.riskAnalyses = refreshedRAs;

          console.info(`[rebuild-atomic] 꽂아넣기 완료: FM=${refreshedFMs.length} FE=${refreshedFEs.length} FC=${refreshedFCs.length} L3F=${refreshedL3Fs.length} FL=${refreshedFLs.length} RA=${refreshedRAs.length}`);
        } else {
          // 마스터 JSON 없이 DB 다이렉트 생성 — FlatItem B2/B3 데이터 활용
          const existingL3FStructIds = new Set(atomic.l3Functions.map((f: any) => f.l3StructId));
          const l3sWithoutFunc = atomic.l3Structures.filter((s: any) => !existingL3FStructIds.has(s.id));
          if (l3sWithoutFunc.length > 0) {
            // FlatItem B2/B3 로드 (public 스키마) → L3Function 데이터 소스
            const publicPrisma = getPrisma();
            type FlatRow = { processNo: string; itemCode: string; value: string; m4: string | null; specialChar: string | null };
            let flatB2: FlatRow[] = [];
            let flatB3: FlatRow[] = [];
            if (publicPrisma) {
              try {
                const dataset = await publicPrisma.pfmeaMasterDataset.findFirst({
                  where: { fmeaId },
                  select: { id: true },
                });
                if (dataset) {
                  flatB2 = (await publicPrisma.pfmeaMasterFlatItem.findMany({
                    where: { datasetId: dataset.id, itemCode: 'B2' },
                    select: { processNo: true, itemCode: true, value: true, m4: true, specialChar: true },
                  })) as FlatRow[];
                  flatB3 = (await publicPrisma.pfmeaMasterFlatItem.findMany({
                    where: { datasetId: dataset.id, itemCode: 'B3' },
                    select: { processNo: true, itemCode: true, value: true, m4: true, specialChar: true },
                  })) as FlatRow[];
                }
              } catch (e: any) {
                console.warn(`[rebuild-atomic] FlatItem B2/B3 로드 실패: ${e?.message}`);
              }
            }

            // processNo 추출: L2 ID "L2-PNO-040" → "40", "PF-L2-040" → "40"
            const extractPno = (l2Id: string): string => {
              const m = l2Id.match(/(\d+)$/);
              return m ? String(parseInt(m[1], 10)) : '';
            };

            // FlatItem B2/B3를 processNo+m4로 그룹화
            const b2Map = new Map<string, FlatRow[]>();
            for (const b of flatB2) {
              const key = `${parseInt(b.processNo, 10)}|${b.m4 || ''}`;
              if (!b2Map.has(key)) b2Map.set(key, []);
              b2Map.get(key)!.push(b);
            }
            const b3Map = new Map<string, FlatRow[]>();
            for (const b of flatB3) {
              const key = `${parseInt(b.processNo, 10)}|${b.m4 || ''}`;
              if (!b3Map.has(key)) b3Map.set(key, []);
              b3Map.get(key)!.push(b);
            }

            // 각 L3Structure별 FlatItem 매칭 카운터 (같은 pno+m4 내 순차 할당)
            const usedIdx = new Map<string, number>();
            const l3fToCreate: any[] = [];

            for (const l3 of l3sWithoutFunc) {
              const l3Id = (l3 as any).id;
              const l2Id = l3ToL2Map.get(l3Id) || (l3 as any).l2Id || '';
              const pno = extractPno(l2Id);
              const m4 = (l3 as any).m4 || '';
              const key = `${pno}|${m4}`;

              const b2Items = b2Map.get(key) || [];
              const b3Items = b3Map.get(key) || [];
              const idx = usedIdx.get(key) || 0;
              usedIdx.set(key, idx + 1);

              const b2 = b2Items[idx];
              const b3 = b3Items[idx];

              l3fToCreate.push({
                id: `${l3Id}-G`, fmeaId, l3StructId: l3Id, l2StructId: l2Id,
                functionName: b2?.value || (l3 as any).name || '',
                processChar: b3?.value || '',
                specialChar: b3?.specialChar || null,
                createdAt: now, updatedAt: now,
              });
            }

            if (l3fToCreate.length > 0) {
              await tx.l3Function.createMany({ data: l3fToCreate, skipDuplicates: true });
              const scFilled = l3fToCreate.filter((f: any) => f.specialChar).length;
              console.info(`[rebuild-atomic] DB 다이렉트 L3Functions: ${l3fToCreate.length} (SC=${scFilled})`);
            }
            const refreshedL3Fs = await tx.l3Function.findMany({ where: { fmeaId } });
            atomic.l3Functions = refreshedL3Fs;
          }

          // ★★★ 2026-03-22: 비마스터 경로 — FC/FL/RA 생성 (FlatItem B4/A6/B5 기반) ★★★
          {
            const publicPr = getPrisma();
            const ds = publicPr ? await publicPr.pfmeaMasterDataset.findFirst({ where: { fmeaId }, select: { id: true } }) : null;

            if (ds && publicPr) {
              const extractPnoLocal = (l2Id: string): string => {
                const mm = l2Id.match(/(\d+)$/);
                return mm ? String(parseInt(mm[1], 10)) : '';
              };

              // --- A) FailureCause 생성 (B4 FlatItem → FC) ---
              const existingFCCount = await tx.failureCause.count({ where: { fmeaId } });
              if (existingFCCount === 0) {
                const flatB4 = await publicPr.pfmeaMasterFlatItem.findMany({
                  where: { datasetId: ds.id, itemCode: 'B4' },
                  select: { processNo: true, value: true, m4: true },
                  orderBy: [{ processNo: 'asc' }, { m4: 'asc' }],
                });

                // L3Structure → m4 매핑 (L3Function에는 m4 없음)
                const l3StructM4 = new Map<string, string>();
                for (const l3s of atomic.l3Structures) {
                  l3StructM4.set((l3s as any).id, (l3s as any).m4 || '');
                }

                // L3Function을 l2StructId+m4(from L3Struct)로 그룹화
                const l3FuncByL2M4 = new Map<string, any[]>();
                const l3FuncByL2All = new Map<string, any[]>();
                for (const l3f of atomic.l3Functions) {
                  const l2Id = (l3f as any).l2StructId || '';
                  const m4 = l3StructM4.get((l3f as any).l3StructId) || '';
                  const key = `${l2Id}|${m4}`;
                  if (!l3FuncByL2M4.has(key)) l3FuncByL2M4.set(key, []);
                  l3FuncByL2M4.get(key)!.push(l3f);
                  if (!l3FuncByL2All.has(l2Id)) l3FuncByL2All.set(l2Id, []);
                  l3FuncByL2All.get(l2Id)!.push(l3f);
                }

                const fcToCreate: any[] = [];
                const fcByL2 = new Map<string, any[]>();
                const fcIdxByL2 = new Map<string, number>();
                const usedM4Idx = new Map<string, number>();

                for (const b4 of flatB4) {
                  if (!b4.value?.trim()) continue;
                  const pnoNum = parseInt(b4.processNo, 10);
                  const l2Id = `L2-PNO-${String(pnoNum).padStart(3, '0')}`;
                  const allL3F = l3FuncByL2All.get(l2Id) || [];
                  if (allL3F.length === 0) continue;

                  // m4 매칭: B4.m4 → L3Structure.m4 → L3Function
                  const m4Key = `${l2Id}|${b4.m4 || ''}`;
                  const m4Funcs = l3FuncByL2M4.get(m4Key) || [];
                  const m4Idx = usedM4Idx.get(m4Key) || 0;
                  usedM4Idx.set(m4Key, m4Idx + 1);

                  const matchedL3F = m4Funcs.length > 0
                    ? m4Funcs[Math.min(m4Idx, m4Funcs.length - 1)]
                    : allL3F[Math.min(m4Idx, allL3F.length - 1)];

                  // FC ID: L2별 글로벌 순번으로 고유성 보장
                  const globalIdx = fcIdxByL2.get(l2Id) || 0;
                  fcIdxByL2.set(l2Id, globalIdx + 1);
                  const fcId = `FC-${l2Id}-${globalIdx}`;

                  const fc = {
                    id: fcId, fmeaId,
                    l2StructId: l2Id,
                    l3StructId: (matchedL3F as any).l3StructId,
                    l3FuncId: (matchedL3F as any).id,
                    cause: b4.value,
                    occurrence: 1,
                    processCharId: (matchedL3F as any).id,
                    createdAt: now, updatedAt: now,
                  };
                  fcToCreate.push(fc);
                  if (!fcByL2.has(l2Id)) fcByL2.set(l2Id, []);
                  fcByL2.get(l2Id)!.push(fc);
                }

                if (fcToCreate.length > 0) {
                  await tx.failureCause.createMany({ data: fcToCreate, skipDuplicates: true });
                  console.info(`[rebuild-atomic] DB 다이렉트 FailureCause: ${fcToCreate.length}`);
                  atomic.failureCauses = await tx.failureCause.findMany({ where: { fmeaId } });
                }

                // --- B) FailureLink 생성 (FM × FC × FE, 같은 L2 기준) ---
                const existingFLCount = await tx.failureLink.count({ where: { fmeaId } });
                if (existingFLCount === 0 && fcToCreate.length > 0) {
                  const fmByL2 = new Map<string, any[]>();
                  for (const fm of atomic.failureModes) {
                    const l2Id = (fm as any).l2StructId || '';
                    if (!fmByL2.has(l2Id)) fmByL2.set(l2Id, []);
                    fmByL2.get(l2Id)!.push(fm);
                  }

                  const l2ToL1 = new Map<string, string>();
                  for (const l2 of atomic.l2Structures) {
                    l2ToL1.set((l2 as any).id, (l2 as any).l1Id || '');
                  }

                  const feByL1Func = new Map<string, any[]>();
                  for (const fe of atomic.failureEffects) {
                    const l1fId = (fe as any).l1FuncId || '';
                    if (!feByL1Func.has(l1fId)) feByL1Func.set(l1fId, []);
                    feByL1Func.get(l1fId)!.push(fe);
                  }

                  const l1FuncByL1 = new Map<string, any[]>();
                  for (const l1f of atomic.l1Functions) {
                    const l1Id = (l1f as any).l1StructId || '';
                    if (!l1FuncByL1.has(l1Id)) l1FuncByL1.set(l1Id, []);
                    l1FuncByL1.get(l1Id)!.push(l1f);
                  }

                  const flToCreate: any[] = [];
                  const flKeySet = new Set<string>();

                  for (const l2 of atomic.l2Structures) {
                    const l2Id = (l2 as any).id;
                    const l1Id = l2ToL1.get(l2Id) || '';
                    const fms = fmByL2.get(l2Id) || [];
                    const fcs = fcByL2.get(l2Id) || [];
                    if (fms.length === 0 || fcs.length === 0) continue;

                    const l1Funcs = l1FuncByL1.get(l1Id) || [];
                    const allFEs: any[] = [];
                    for (const l1f of l1Funcs) {
                      const fes = feByL1Func.get((l1f as any).id) || [];
                      allFEs.push(...fes);
                    }
                    if (allFEs.length === 0) continue;

                    for (const fc of fcs) {
                      const fm = fms.length === 1
                        ? fms[0]
                        : fms[Math.min(fcs.indexOf(fc) % fms.length, fms.length - 1)];

                      const feIdx = fcs.indexOf(fc) % allFEs.length;
                      const fe = allFEs[feIdx];

                      const flKey = `${(fm as any).id}|${fc.id}|${(fe as any).id}`;
                      if (flKeySet.has(flKey)) continue;
                      flKeySet.add(flKey);

                      flToCreate.push({
                        id: `FL-${l2Id}-${flToCreate.length}`,
                        fmeaId,
                        fmId: (fm as any).id,
                        feId: (fe as any).id,
                        fcId: fc.id,
                        fmText: (fm as any).mode || '',
                        feText: (fe as any).effect || '',
                        fcText: fc.cause || '',
                        createdAt: now, updatedAt: now,
                      });
                    }
                  }

                  if (flToCreate.length > 0) {
                    await tx.failureLink.createMany({ data: flToCreate, skipDuplicates: true });
                    console.info(`[rebuild-atomic] DB 다이렉트 FailureLink: ${flToCreate.length}`);
                    atomic.failureLinks = await tx.failureLink.findMany({ where: { fmeaId } });
                  }

                  // --- C) RiskAnalysis 생성 + A6(DC)/B5(PC) 동기화 ---
                  const existingRACount = await tx.riskAnalysis.count({ where: { fmeaId } });
                  if (existingRACount === 0 && flToCreate.length > 0) {
                    const flatA6 = await publicPr.pfmeaMasterFlatItem.findMany({
                      where: { datasetId: ds.id, itemCode: 'A6' },
                      select: { processNo: true, value: true },
                    });
                    const flatB5 = await publicPr.pfmeaMasterFlatItem.findMany({
                      where: { datasetId: ds.id, itemCode: 'B5' },
                      select: { processNo: true, value: true },
                    });

                    const dcByPno = new Map<string, string>();
                    for (const a6 of flatA6) {
                      const pno = String(parseInt(a6.processNo, 10));
                      if (!dcByPno.has(pno) && a6.value?.trim()) dcByPno.set(pno, a6.value);
                    }
                    const pcByPno = new Map<string, string>();
                    for (const b5 of flatB5) {
                      const pno = String(parseInt(b5.processNo, 10));
                      if (!pcByPno.has(pno) && b5.value?.trim()) pcByPno.set(pno, b5.value);
                    }

                    const raToCreate: any[] = [];
                    for (const fl of flToCreate) {
                      const l2Id = fl.id.split('-')[1] + '-' + fl.id.split('-')[2] + '-' + fl.id.split('-')[3];
                      const pno = extractPnoLocal(fl.fmId.includes('L2-PNO') ? fl.fmId : '');
                      const fmObj = atomic.failureModes.find((fm: any) => fm.id === fl.fmId);
                      const fmL2Id = (fmObj as any)?.l2StructId || '';
                      const pnoFromFm = extractPnoLocal(fmL2Id);

                      raToCreate.push({
                        id: `RA-${fl.id}`,
                        fmeaId,
                        linkId: fl.id,
                        severity: 1,
                        occurrence: 1,
                        detection: 1,
                        ap: '',
                        detectionControl: dcByPno.get(pnoFromFm) || null,
                        preventionControl: pcByPno.get(pnoFromFm) || null,
                        createdAt: now, updatedAt: now,
                      });
                    }

                    if (raToCreate.length > 0) {
                      await tx.riskAnalysis.createMany({ data: raToCreate, skipDuplicates: true });
                      console.info(`[rebuild-atomic] DB 다이렉트 RiskAnalysis: ${raToCreate.length} (DC=${[...dcByPno.values()].length} PC=${[...pcByPno.values()].length})`);
                    }
                  }
                }
              }
            }
          }
        }
      }

      // ★★★ 2026-03-20: Atomic DB 자체 정합성 수복 (Legacy 의존 제거) ★★★
      // 기존 Atomic 데이터를 그대로 유지하면서, FK 무결성 위반만 수복

      // FailureLink FK 검증 — 깨진 링크 삭제
      {
        const fmIdSet = new Set(atomic.failureModes.map((fm: any) => fm.id));
        const feIdSet = new Set(atomic.failureEffects.map((fe: any) => fe.id));
        const fcIdSet = new Set(atomic.failureCauses.map((fc: any) => fc.id));

        const invalidLinkIds: string[] = [];
        for (const l of atomic.failureLinks) {
          const hasFm = fmIdSet.has((l as any).fmId);
          const hasFe = feIdSet.has((l as any).feId);
          const hasFc = fcIdSet.has((l as any).fcId);
          if (!hasFm || !hasFe || !hasFc) {
            invalidLinkIds.push((l as any).id);
          }
        }
        if (invalidLinkIds.length > 0) {
          // Cascade: Optimization → RiskAnalysis → FailureLink
          const invalidRAs = await tx.riskAnalysis.findMany({
            where: { fmeaId, linkId: { in: invalidLinkIds } },
            select: { id: true },
          });
          const invalidRaIds = invalidRAs.map((r: { id: string }) => r.id);
          if (invalidRaIds.length > 0) {
            await tx.optimization.deleteMany({ where: { fmeaId, riskId: { in: invalidRaIds } } });
          }
          await tx.riskAnalysis.deleteMany({ where: { fmeaId, linkId: { in: invalidLinkIds } } });
          await tx.failureLink.deleteMany({ where: { id: { in: invalidLinkIds } } });
          console.warn(`[rebuild-atomic] FailureLink FK 검증: ${invalidLinkIds.length}건 무효 삭제 (Opt/RA 연쇄 정리)`);
        }
      }
      // ██████████████████████████████████████████████████████████████████████████
      // ██  CODEFREEZE — FL 중복제거 규칙 (2026-03-21)                          ██
      // ██  이 블록을 수정하려면 사용자에게 다음 문구로 허락을 받아야 합니다:       ██
      // ██  "FL dedup 공정번호 기반 중복제거 CODEFREEZE 해제를 허락합니다"         ██
      // ██                                                                      ██
      // ██  핵심 원칙:                                                           ██
      // ██  1. FL dedup key = fmId|fcId|feId (3요소 모두 포함)                    ██
      // ██  2. 같은 FM+FC라도 다른 FE에 연결되면 별개 FL (N:1:N 관계)             ██
      // ██  3. 공정이 다르면 동일 이름의 FM/FC/FE도 별개 엔티티                   ██
      // ██  4. MN(작업자) 등 모든 공정 공통 요소도 공정별 독립 유지                ██
      // ██                                                                      ██
      // ██  위반 시: 고장사슬 누락 → 워크시트 렌더링 빈칸 → 사용자 데이터 손실     ██
      // ██████████████████████████████████████████████████████████████████████████
      {
        const allFLsForDedup = await tx.failureLink.findMany({
          where: { fmeaId },
          select: { id: true, fmId: true, feId: true, fcId: true },
        });
        // ★ dedup key = fmId|fcId|feId — 3요소 모두 동일해야만 진정한 중복
        // ★ fmId|fcId만으로 dedup하면 다른 FE에 연결된 유효한 체인이 삭제됨
        const flGroups = new Map<string, string[]>();
        for (const fl of allFLsForDedup) {
          const key = `${fl.fmId}|${fl.fcId}|${fl.feId}`;
          if (!flGroups.has(key)) flGroups.set(key, []);
          flGroups.get(key)!.push(fl.id);
        }
        const dupFlIds: string[] = [];
        for (const [, ids] of flGroups) {
          if (ids.length <= 1) continue;
          // 완전 동일 FL(fmId+fcId+feId 모두 같음)만 중복 — 첫 번째 보존
          for (let i = 1; i < ids.length; i++) {
            dupFlIds.push(ids[i]);
          }
        }
        if (dupFlIds.length > 0) {
          // Cascade: Optimization → RiskAnalysis → FailureLink
          const dupFlRAs = await tx.riskAnalysis.findMany({
            where: { fmeaId, linkId: { in: dupFlIds } },
            select: { id: true },
          });
          const dupFlRaIds = dupFlRAs.map((r: { id: string }) => r.id);
          if (dupFlRaIds.length > 0) {
            await tx.optimization.deleteMany({ where: { fmeaId, riskId: { in: dupFlRaIds } } });
          }
          await tx.riskAnalysis.deleteMany({ where: { fmeaId, linkId: { in: dupFlIds } } });
          await tx.failureLink.deleteMany({ where: { id: { in: dupFlIds } } });
          console.warn(`[rebuild-atomic] FL dedup (fmId+fcId+feId 완전일치): ${dupFlIds.length}건 제거`);
        }
      }

      // ██████████████████████████████████████████████████████████████████████████
      // ██  CODEFREEZE — FC 중복제거 규칙 (2026-03-21)                          ██
      // ██  이 블록을 수정하려면 사용자에게 다음 문구로 허락을 받아야 합니다:       ██
      // ██  "FC dedup 공정번호 기반 중복제거 CODEFREEZE 해제를 허락합니다"         ██
      // ██                                                                      ██
      // ██  핵심 원칙:                                                           ██
      // ██  1. FC dedup key = l2StructId(공정) + l3StructId(WE) + l3FuncId(기능) + cause ██
      // ██  2. 공정이 다르면 동일 원인명도 별개 FC (예: 모든 공정의 "작업숙련도부족") ██
      // ██  3. 같은 공정이라도 다른 WE의 동일 원인은 별개 FC                       ██
      // ██  4. 같은 WE라도 다른 L3Function의 동일 원인은 별개 FC                   ██
      // ██  5. 단어만 보고 중복삭제 절대 금지 — 반드시 공정번호+WE+기능 포함        ██
      // ██                                                                      ██
      // ██  위반 시: FC 누락 → FailureLink 끊김 → 워크시트 고장원인 빈칸          ██
      // ██████████████████████████████████████████████████████████████████████████
      {
        const fcsByKey = new Map<string, string[]>();
        const allFcsForDedup = await tx.failureCause.findMany({
          where: { fmeaId },
          select: { id: true, cause: true, l2StructId: true, l3StructId: true, l3FuncId: true },
        });
        for (const fc of allFcsForDedup) {
          // ★ key = l2StructId(공정) + l3StructId(WE) + l3FuncId(기능) + cause(원인명)
          // ★ 공정번호 없이 cause만으로 dedup하면 다른 공정의 동일 원인이 삭제됨
          // ★ 예: 공정10 "작업숙련도부족" ≠ 공정20 "작업숙련도부족" (별개 FC)
          // ★ l3FuncId 포함: 같은 WE 내 다른 L3Function의 동일 원인도 별개 FC
          // ★ 예: Cu Target(l3Func-A) "Target 소진" ≠ Ti Target(l3Func-B) "Target 소진"
          // ★ NULL/empty l3StructId 또는 l3FuncId → FC.id를 key로 사용 (dedup 방지)
          const l3s = (fc as any).l3StructId || '';
          const l3f = (fc as any).l3FuncId || '';
          const key = (l3s && l3f)
            ? `${(fc as any).l2StructId}|${l3s}|${l3f}|${(fc as any).cause}`
            : `__unique__${(fc as any).id}`;
          if (!fcsByKey.has(key)) fcsByKey.set(key, []);
          fcsByKey.get(key)!.push((fc as any).id);
        }
        const dupFcIds: string[] = [];
        // ★★★ 2026-03-20: FC별 FailureLink 수 카운트 — 가장 많이 참조된 FC를 보존 ★★★
        // 비유: 여러 부서(FM)와 연결된 핵심 인재(FC)를 해고하면 안 된다. 가장 많이 연결된 FC를 보존.
        const allFlsForCount = await tx.failureLink.findMany({ where: { fmeaId }, select: { fcId: true } });
        const fcLinkCount = new Map<string, number>();
        for (const fl of allFlsForCount) {
          fcLinkCount.set(fl.fcId, (fcLinkCount.get(fl.fcId) || 0) + 1);
        }

        for (const [, ids] of fcsByKey) {
          if (ids.length > 1) {
            // Sort by link count descending — keep the FC with the most FailureLinks
            const sorted = [...ids].sort((a, b) => (fcLinkCount.get(b) || 0) - (fcLinkCount.get(a) || 0));
            // Keep the first (most-linked), delete the rest
            dupFcIds.push(...sorted.slice(1));
          }
        }
        if (dupFcIds.length > 0) {
          // Cascade: Optimization → RiskAnalysis → FailureLink → FailureCause
          const dupFcFLs = await tx.failureLink.findMany({
            where: { fmeaId, fcId: { in: dupFcIds } },
            select: { id: true },
          });
          const dupFlIds = dupFcFLs.map((l: { id: string }) => l.id);
          if (dupFlIds.length > 0) {
            const dupRAs = await tx.riskAnalysis.findMany({
              where: { fmeaId, linkId: { in: dupFlIds } },
              select: { id: true },
            });
            const dupRaIds = dupRAs.map((r: { id: string }) => r.id);
            if (dupRaIds.length > 0) {
              await tx.optimization.deleteMany({ where: { fmeaId, riskId: { in: dupRaIds } } });
            }
            await tx.riskAnalysis.deleteMany({ where: { fmeaId, linkId: { in: dupFlIds } } });
            await tx.failureLink.deleteMany({ where: { id: { in: dupFlIds } } });
          }
          await tx.failureCause.deleteMany({ where: { id: { in: dupFcIds } } });
          console.warn(`[rebuild-atomic] FC dedup: ${dupFcIds.length} duplicates removed`);
        }
      }

      // ★ 2026-03-20: 미연결 FC→FL, RA 부족 시 보충 로직 제거 (no-fallback 원칙)
      // Import 파이프라인에서 정확하게 생성된 데이터만 유지한다.
      // 미연결 FC가 있으면 경고만 출력한다.
      {
        const linkedFcIds = new Set(
          (await tx.failureLink.findMany({ where: { fmeaId }, select: { fcId: true } }))
            .map((l: any) => l.fcId)
        );
        const allFcsNow = await tx.failureCause.findMany({ where: { fmeaId }, select: { id: true, cause: true } });
        const unlinkedFcs = allFcsNow.filter((fc: any) => !linkedFcIds.has(fc.id));
        if (unlinkedFcs.length > 0) {
          console.warn(`[rebuild-atomic] 미연결 FC ${unlinkedFcs.length}건 감지 (자동생성 없음 — Import 데이터 점검 필요)`);
        }
      }

      // RA 부족 여부 경고 (자동 보충 없음)
      const savedLinks = await tx.failureLink.findMany({
        where: { fmeaId },
        select: { id: true },
      });
      const raCount = await tx.riskAnalysis.count({ where: { fmeaId } });
      if (raCount < savedLinks.length && savedLinks.length > 0) {
        console.warn(`[rebuild-atomic] RA 부족: FL=${savedLinks.length} RA=${raCount} (자동 보충 없음)`);
      }

      // ★★★ 2026-03-19 RA 중복 제거: 1 FL = 1 RA 원칙 강제 ★★★
      // 동일 linkId에 2개 이상의 RA가 생성될 수 있는 경로 차단
      // (migration RA + supplement RA ID 충돌, 또는 동일 FC가 다중 FL에 연결된 경우)
      {
        const allRAs = await tx.riskAnalysis.findMany({
          where: { fmeaId },
          select: { id: true, linkId: true, severity: true, occurrence: true, detection: true },
        });
        const raByLinkId = new Map<string, typeof allRAs>();
        for (const ra of allRAs) {
          const arr = raByLinkId.get(ra.linkId) || [];
          arr.push(ra);
          raByLinkId.set(ra.linkId, arr);
        }
        const dupRaIds: string[] = [];
        for (const [, ras] of raByLinkId) {
          if (ras.length <= 1) continue;
          ras.sort((a: any, b: any) =>
            ((b.severity || 0) + (b.occurrence || 0) + (b.detection || 0)) -
            ((a.severity || 0) + (a.occurrence || 0) + (a.detection || 0))
          );
          for (let i = 1; i < ras.length; i++) dupRaIds.push(ras[i].id);
        }
        if (dupRaIds.length > 0) {
          await tx.riskAnalysis.deleteMany({ where: { id: { in: dupRaIds } } });
          console.info(`[rebuild-atomic] RA 중복 제거: ${dupRaIds.length}건 (1 FL = 1 RA 원칙)`);
        }

        // RA가 어떤 FL에도 속하지 않는 고아 RA 제거
        const flIds = new Set(savedLinks.map((l: any) => l.id));
        const orphanRaIds = allRAs
          .filter((ra: any) => !flIds.has(ra.linkId) && !dupRaIds.includes(ra.id))
          .map((ra: any) => ra.id);
        if (orphanRaIds.length > 0) {
          await tx.riskAnalysis.deleteMany({ where: { id: { in: orphanRaIds } } });
          console.info(`[rebuild-atomic] 고아 RA 제거: ${orphanRaIds.length}건 (linkId가 FL에 없음)`);
        }

        // ★ SOD/DC/PC 빈값 RA 보충: (1) 동일 fcId 형제 RA → (2) 동일 fmId 피어 RA → (3) FE severity
        const emptyRAs = await tx.riskAnalysis.findMany({
          where: {
            fmeaId,
            OR: [
              { severity: { lte: 0 } },
              { occurrence: { lte: 0 } },
              { detection: { lte: 0 } },
              { preventionControl: null },
              { preventionControl: '' },
              { detectionControl: null },
              { detectionControl: '' },
            ],
          },
          include: { failureLink: { select: { fmId: true, fcId: true, feId: true } } },
        });
        if (emptyRAs.length > 0) {
          // (1) fcId 형제 RA 조회
          const fcIdsToCheck = [...new Set(emptyRAs.map((r: any) => r.failureLink?.fcId).filter(Boolean))];
          const siblingFLs = await tx.failureLink.findMany({
            where: { fmeaId, fcId: { in: fcIdsToCheck } },
            select: { id: true, fcId: true, feId: true },
          });
          const siblingRAMap = new Map<string, any>();
          const emptyRALinkIds = new Set(emptyRAs.map((r: any) => r.linkId));
          for (const sfl of siblingFLs) {
            // 자기 자신(emptyRA)의 FL은 제외
            if (emptyRALinkIds.has(sfl.id)) continue;
            const sra = await tx.riskAnalysis.findFirst({
              where: { linkId: sfl.id, fmeaId },
            });
            if (!sra) continue;
            const existing = siblingRAMap.get(sfl.fcId);
            // DC/PC 있는 형제를 우선 선택
            const hasGoodData = !!(sra.detectionControl?.trim() && sra.preventionControl?.trim());
            const existingHasGood = existing ? !!(existing.detectionControl?.trim() && existing.preventionControl?.trim()) : false;
            if (!existing || (hasGoodData && !existingHasGood) || ((sra.severity || 0) > 0 && !(existing.severity > 0))) {
              siblingRAMap.set(sfl.fcId, sra);
            }
          }

          // (2) fmId 피어 RA 조회 — 같은 FM의 다른 RA들에서 DC/PC/SOD 복사
          const fmIdsToCheck = [...new Set(emptyRAs.map((r: any) => r.failureLink?.fmId).filter(Boolean))];
          const peerFLs = await tx.failureLink.findMany({
            where: { fmeaId, fmId: { in: fmIdsToCheck } },
            select: { id: true, fmId: true },
          });
          const fmPeerDC = new Map<string, string[]>();
          const fmPeerPC = new Map<string, string[]>();
          const fmPeerSOD = new Map<string, { s: number; o: number; d: number }[]>();
          for (const pfl of peerFLs) {
            const pra = await tx.riskAnalysis.findFirst({ where: { linkId: pfl.id, fmeaId } });
            if (!pra) continue;
            const fm = pfl.fmId;
            if (pra.detectionControl?.trim()) {
              if (!fmPeerDC.has(fm)) fmPeerDC.set(fm, []);
              fmPeerDC.get(fm)!.push(pra.detectionControl.trim());
            }
            if (pra.preventionControl?.trim()) {
              if (!fmPeerPC.has(fm)) fmPeerPC.set(fm, []);
              fmPeerPC.get(fm)!.push(pra.preventionControl.trim());
            }
            if ((pra.severity || 0) > 0 && (pra.occurrence || 0) > 0 && (pra.detection || 0) > 0) {
              if (!fmPeerSOD.has(fm)) fmPeerSOD.set(fm, []);
              fmPeerSOD.get(fm)!.push({ s: pra.severity, o: pra.occurrence, d: pra.detection });
            }
          }
          const mostFreq = (arr: string[]) => {
            if (!arr || arr.length === 0) return '';
            const freq = new Map<string, number>();
            for (const v of arr) freq.set(v, (freq.get(v) || 0) + 1);
            let best = arr[0], bestC = 0;
            for (const [k, c] of freq) { if (c > bestC) { best = k; bestC = c; } }
            return best;
          };
          const medianSOD = (arr: { s: number; o: number; d: number }[]) => {
            if (!arr || arr.length === 0) return { s: 1, o: 1, d: 1 };
            const valid = arr.filter(x => x.s > 0 && x.o > 0 && x.d > 0);
            if (valid.length === 0) return { s: 1, o: 1, d: 1 };
            const sorted = [...valid].sort((a, b) => (a.s + a.o + a.d) - (b.s + b.o + b.d));
            return sorted[Math.floor(sorted.length / 2)];
          };

          const feMapEnrich = new Map<string, any>();
          for (const fe of atomic.failureEffects) feMapEnrich.set((fe as any).id, fe);

          let enriched = 0;
          for (const ra of emptyRAs) {
            const fmId = (ra as any).failureLink?.fmId;
            const fcId = (ra as any).failureLink?.fcId;
            const feId = (ra as any).failureLink?.feId;

            // (1) fcId 형제 RA에서 복사
            const donor = fcId ? siblingRAMap.get(fcId) : undefined;
            if (donor) {
              const sev = (ra.severity || 0) > 0 ? ra.severity : donor.severity;
              const occ = (ra.occurrence || 0) > 0 ? ra.occurrence : donor.occurrence;
              const det = (ra.detection || 0) > 0 ? ra.detection : donor.detection;
              const pc = ra.preventionControl || donor.preventionControl || null;
              const dc = ra.detectionControl || donor.detectionControl || null;
              const ap = (sev > 0 && occ > 0 && det > 0) ? calculateAPLocal(sev, occ, det) : 'L';
              await tx.riskAnalysis.update({
                where: { id: ra.id },
                data: { severity: sev, occurrence: occ, detection: det, ap, preventionControl: pc, detectionControl: dc },
              });
              enriched++;
              continue;
            }

            // (2) fmId 피어 RA에서 복사 (동일 FM의 최빈 DC/PC, 중간 SOD)
            if (fmId) {
              const peerDC = mostFreq(fmPeerDC.get(fmId) || []);
              const peerPC = mostFreq(fmPeerPC.get(fmId) || []);
              const peerS = medianSOD(fmPeerSOD.get(fmId) || []);
              const sev = ra.severity > 0 ? ra.severity : Math.max(1, peerS.s || (feMapEnrich.get(feId)?.severity ?? 1));
              const occ = ra.occurrence > 0 ? ra.occurrence : Math.max(1, peerS.o);
              const det = ra.detection > 0 ? ra.detection : Math.max(1, peerS.d);
              const pc = ra.preventionControl || peerPC || null;
              const dc = ra.detectionControl || peerDC || null;
              if (sev > 0 || occ > 0 || det > 0 || pc || dc) {
                const ap = (sev > 0 && occ > 0 && det > 0) ? calculateAPLocal(sev, occ, det) : 'L';
                await tx.riskAnalysis.update({
                  where: { id: ra.id },
                  data: { severity: sev, occurrence: occ, detection: det, ap, preventionControl: pc, detectionControl: dc },
                });
                enriched++;
                continue;
              }
            }

            // (3) FE severity fallback
            if (feId && (ra.severity || 0) <= 0) {
              const feSev = feMapEnrich.get(feId)?.severity || 1;
              if (feSev > 0) {
                await tx.riskAnalysis.update({
                  where: { id: ra.id },
                  data: { severity: feSev },
                });
                enriched++;
              }
            }
          }
          if (enriched > 0) {
            console.info(`[rebuild-atomic] RA SOD/DC/PC 보충: ${enriched}건 (형제/피어 RA에서 복사)`);
          }
        }
      }

      // ★★★ 2026-03-21 FIX: FK-only — 스키마 설계상 processCharId === l3FuncId 동일 ID 사용 ★★★
      // orphanPC 근본원인: FC.processCharId ≠ FC.l3FuncId → verify에서 매칭 안 됨
      // 현행 스키마에서 processCharId와 l3FuncId는 동일 UUID를 공유하는 설계.
      // 불일치 시 l3FuncId(FK 확정값)를 기준으로 processCharId를 동기화한다.
      {
        const mismatchFcs = await tx.failureCause.findMany({
          where: { fmeaId },
          select: { id: true, l3FuncId: true, processCharId: true },
        });
        let fixedCount = 0;
        for (const fc of mismatchFcs) {
          if (fc.l3FuncId && fc.processCharId !== fc.l3FuncId) {
            await tx.failureCause.update({
              where: { id: fc.id },
              data: { processCharId: fc.l3FuncId },
            });
            fixedCount++;
          }
        }
        if (fixedCount > 0) {
          console.info(`[rebuild-atomic] FC processCharId 동기화: ${fixedCount}건`);
        }
      }

      // ★ 고아 FC 정리: FL에 참조되지 않는 FC → 연쇄 삭제 (Optimization → RA → FL → FC)
      {
        const allFcIds = (await tx.failureCause.findMany({ where: { fmeaId }, select: { id: true } })).map((f: { id: string }) => f.id);
        const linkedFcIds = new Set(
          (await tx.failureLink.findMany({ where: { fmeaId }, select: { fcId: true } })).map((f: { fcId: string }) => f.fcId)
        );
        const orphanFcIds = allFcIds.filter((id: string) => !linkedFcIds.has(id));
        if (orphanFcIds.length > 0) {
          // Cascade delete: find FLs referencing orphan FCs (safety — should be 0 by definition)
          const orphanFcFLs = await tx.failureLink.findMany({
            where: { fmeaId, fcId: { in: orphanFcIds } },
            select: { id: true },
          });
          const orphanFlIds = orphanFcFLs.map((f: { id: string }) => f.id);

          if (orphanFlIds.length > 0) {
            // Delete Optimizations → RiskAnalyses → FailureLinks (reverse FK order)
            const orphanRAs = await tx.riskAnalysis.findMany({
              where: { fmeaId, linkId: { in: orphanFlIds } },
              select: { id: true },
            });
            const orphanRaIds = orphanRAs.map((r: { id: string }) => r.id);
            if (orphanRaIds.length > 0) {
              await tx.optimization.deleteMany({ where: { fmeaId, riskId: { in: orphanRaIds } } });
            }
            await tx.riskAnalysis.deleteMany({ where: { fmeaId, linkId: { in: orphanFlIds } } });
            await tx.failureLink.deleteMany({ where: { id: { in: orphanFlIds } } });
            console.info(`[rebuild-atomic] 고아 FC 연쇄 삭제: FL=${orphanFlIds.length} RA=${orphanRaIds.length} Opt 정리 완료`);
          }

          await tx.failureCause.deleteMany({ where: { id: { in: orphanFcIds } } });
          console.info(`[rebuild-atomic] 고아 FC 삭제: ${orphanFcIds.length}건 (FL에 미참조)`);
        }
      }

      // FK 정합성 교정 (자동생성 없이 기존 데이터만 교정)
      {

        // 2단계: FC.l3FuncId → FC.l3StructId 정합성 교정 + orphan L3Function 삭제
        const allL3Funcs = await tx.l3Function.findMany({
          where: { fmeaId },
          select: { id: true, l3StructId: true },
        });
        const allFcsForOrphan = await tx.failureCause.findMany({
          where: { fmeaId },
          select: { id: true, l3FuncId: true, l3StructId: true },
        });

        // 2-A: FC.l3FuncId가 FC.l3StructId의 L3Function을 가리키지 않는 경우 재배정
        const l3FuncsByStruct = new Map<string, string[]>();
        for (const f of allL3Funcs) {
          const arr = l3FuncsByStruct.get(f.l3StructId) || [];
          arr.push(f.id);
          l3FuncsByStruct.set(f.l3StructId, arr);
        }
        const l3FuncToStruct = new Map(allL3Funcs.map((f: any) => [f.id, f.l3StructId]));

        // ★★★ 2026-03-21 FIX: FK-only — positional pick 금지, 1:1 확정만 재배정 ★★★
        // L3Function이 1개일 때만 확정적 재배정. 2개 이상이면 자동선택 불가 → 경고만.
        let reassigned = 0;
        for (const fc of allFcsForOrphan) {
          if (!fc.l3FuncId || !fc.l3StructId) continue;
          const funcStruct = l3FuncToStruct.get(fc.l3FuncId);
          if (funcStruct === fc.l3StructId) continue;
          const correctFuncs = l3FuncsByStruct.get(fc.l3StructId);
          if (correctFuncs && correctFuncs.length === 1) {
            // 해당 L3Structure에 L3Function이 정확히 1개 → 확정적 FK 재배정
            await tx.failureCause.update({
              where: { id: fc.id },
              data: { l3FuncId: correctFuncs[0] },
            });
            reassigned++;
          } else if (correctFuncs && correctFuncs.length > 1) {
            // 2개 이상 → positional pick(correctFuncs[0]) 금지, 경고만 표시
            console.warn(
              `[rebuild-atomic] FC ${fc.id} → l3Struct ${fc.l3StructId} 에 L3Function ${correctFuncs.length}개 존재. 자동 재배정 불가 — 수동 지정 필요.`
            );
          }
        }
        if (reassigned > 0) {
          console.info(`[rebuild-atomic] FC→L3Function 재배정: ${reassigned}건 (l3StructId 정합성 교정)`);
        }

        // 2-B: orphan L3Function 삭제 (재배정 후 재계산)
        const allFcsAfter = await tx.failureCause.findMany({
          where: { fmeaId },
          select: { l3FuncId: true },
        });
        const linkedL3FuncIds = new Set(allFcsAfter.map((fc: { l3FuncId: string }) => fc.l3FuncId));

        // ★ 2026-03-22 FIX: L3Structure당 최소 1개 L3Function 보존 (orphanPC 방지)
        // L3Structure별로 연결된 L3Function 수를 계산 → 마지막 1개는 삭제하지 않음
        const l3StructFuncCount = new Map<string, number>();
        for (const f of allL3Funcs) {
          const sid = (f as any).l3StructId;
          l3StructFuncCount.set(sid, (l3StructFuncCount.get(sid) || 0) + 1);
        }

        const orphanIds: string[] = [];
        for (const f of allL3Funcs) {
          if (linkedL3FuncIds.has(f.id)) continue;
          // 이 L3Function이 속한 L3Structure의 남은 L3Function 수 확인
          const sid = (f as any).l3StructId;
          const remaining = l3StructFuncCount.get(sid) || 0;
          if (remaining <= 1) {
            // 마지막 L3Function → 삭제하면 L3Structure가 orphan됨 → SKIP
            console.info(`[rebuild-atomic] orphan L3Function ${f.id} SKIP — L3Structure ${sid}의 마지막 L3Function (보존)`);
            continue;
          }
          orphanIds.push(f.id);
          l3StructFuncCount.set(sid, remaining - 1); // 삭제 예정이므로 카운트 감소
        }

        if (orphanIds.length > 0) {
          // ★★★ SAFETY: onDelete:Cascade → L3Function 삭제 시 FC도 연쇄 삭제됨
          // FL이 참조하는 FC가 이 L3Function에 속하면 삭제하면 안 됨
          const fcsUnderOrphanL3F = await tx.failureCause.findMany({
            where: { fmeaId, l3FuncId: { in: orphanIds } },
            select: { id: true },
          });
          if (fcsUnderOrphanL3F.length > 0) {
            // CASCADE가 FC를 삭제할 수 있으므로 FL 참조 확인
            const fcIdsUnderOrphan = fcsUnderOrphanL3F.map((f: { id: string }) => f.id);
            const flsRefOrphanFcs = await tx.failureLink.findMany({
              where: { fmeaId, fcId: { in: fcIdsUnderOrphan } },
              select: { id: true },
            });
            if (flsRefOrphanFcs.length > 0) {
              // FL이 참조하는 FC가 있으므로 삭제하면 데이터 손실 → 경고만
              console.warn(
                `[rebuild-atomic] orphan L3Function ${orphanIds.length}건 감지, ` +
                `BUT ${flsRefOrphanFcs.length}건 FL이 참조하는 FC 존재 → 삭제 SKIP (데이터 보호)`
              );
            } else {
              // FL 참조 없음 → 안전하게 삭제 (CASCADE로 FC도 삭제됨)
              await tx.l3Function.deleteMany({ where: { id: { in: orphanIds } } });
              console.info(`[rebuild-atomic] orphan L3Function 삭제: ${orphanIds.length}건 (FL 미참조 확인됨)`);
            }
          } else {
            // FC도 없음 → 순수 orphan, 안전 삭제
            await tx.l3Function.deleteMany({ where: { id: { in: orphanIds } } });
            console.info(`[rebuild-atomic] orphan L3Function 삭제: ${orphanIds.length}건 (FC 0건)`);
          }
        }

        // ★ 2026-03-20: L3Function 폴백 재생성/emptyPC 보정 제거 — Atomic DB 원본 유지

        // Legacy sync removed — Atomic DB is SSoT
      }

      // ★★★ 2026-03-22 FIX: ProcessProductChar 보충 + specialChar 동기화 ★★★
      {
        let ppcCreated = 0;
        let ppcUpdated = 0;
        const now2 = new Date();

        const publicPrisma = getPrisma();
        if (publicPrisma) {
          try {
            const dataset = await publicPrisma.pfmeaMasterDataset.findFirst({ where: { fmeaId }, select: { id: true } });
            if (dataset) {
              const allA4 = await publicPrisma.pfmeaMasterFlatItem.findMany({
                where: { datasetId: dataset.id, itemCode: 'A4' },
                select: { processNo: true, value: true, specialChar: true },
              });

              const existingPPC = await tx.processProductChar.findMany({
                where: { fmeaId },
                select: { id: true, l2StructId: true, name: true, specialChar: true },
              });
              const ppcKeySet = new Set(existingPPC.map((p: any) => `${p.l2StructId}|${p.name}`));

              const ppcToCreate: any[] = [];
              for (const a4 of allA4) {
                if (!a4.value) continue;
                const pnoNum = parseInt(a4.processNo, 10);
                const l2Id = `L2-PNO-${String(pnoNum).padStart(3, '0')}`;
                const key = `${l2Id}|${a4.value}`;
                if (!ppcKeySet.has(key)) {
                  ppcToCreate.push({
                    id: `PPC-${l2Id}-${a4.value.replace(/[^a-zA-Z0-9가-힣]/g, '').slice(0, 20)}`,
                    fmeaId, l2StructId: l2Id, name: a4.value,
                    specialChar: a4.specialChar || null,
                    orderIndex: 0, createdAt: now2, updatedAt: now2,
                  });
                  ppcKeySet.add(key);
                }
              }
              if (ppcToCreate.length > 0) {
                await tx.processProductChar.createMany({ data: ppcToCreate, skipDuplicates: true });
                ppcCreated = ppcToCreate.length;
              }

              for (const a4 of allA4) {
                if (!a4.specialChar?.trim() || !a4.value) continue;
                const pnoNum = parseInt(a4.processNo, 10);
                const l2Id = `L2-PNO-${String(pnoNum).padStart(3, '0')}`;
                const updated = await tx.processProductChar.updateMany({
                  where: {
                    fmeaId, l2StructId: l2Id, name: a4.value,
                    OR: [{ specialChar: null }, { specialChar: '' }],
                  },
                  data: { specialChar: a4.specialChar },
                });
                ppcUpdated += updated.count;
              }
            }
          } catch (e: any) {
            console.warn(`[rebuild-atomic] PPC 보충/SC sync 실패: ${e?.message}`);
          }
        }

        if (ppcCreated > 0 || ppcUpdated > 0) {
          console.info(`[rebuild-atomic] PPC 보충=${ppcCreated} SC동기화=${ppcUpdated}`);
        }
      }

      // ★★★ 2026-03-18 FIX: Opt FK 수복 — riskId가 유효하지 않은 Optimization 삭제 ★★★
      {
        const validRAIds = new Set(
          (await tx.riskAnalysis.findMany({ where: { fmeaId }, select: { id: true } }))
            .map((r: any) => r.id)
        );
        const allOpts = await tx.optimization.findMany({ where: { fmeaId }, select: { id: true, riskId: true } });
        const orphanOpts = allOpts.filter((o: any) => !validRAIds.has(o.riskId));
        if (orphanOpts.length > 0) {
          await tx.optimization.deleteMany({
            where: { id: { in: orphanOpts.map((o: any) => o.id) } },
          });
          console.info(`[rebuild-atomic] Opt FK 고아 삭제: ${orphanOpts.length}건`);
        }
      }
    }, { timeout: 30000, isolationLevel: 'Serializable' });

    // ★ Living DB 지속 개선 루프: rebuild 완료 → Master 동기화
    try {
      const { syncMasterFromProject } = await import('@/lib/sync/master-chain-sync');
      // 별도 트랜잭션으로 Master 동기화 (rebuild 트랜잭션과 분리)
      await prisma.$transaction(async (syncTx: any) => {
        await syncTx.$executeRawUnsafe(`SET search_path TO "${schema}", public`);
        const result = await syncMasterFromProject(syncTx, fmeaId);
        console.info(`[rebuild-atomic] Living DB sync: chains=${result.chainCount}, refs=${result.refCount}`);
      }, { timeout: 15000 });
    } catch (syncErr: any) {
      // Master sync 실패는 rebuild 자체를 실패시키지 않음
      console.warn(`[rebuild-atomic] Living DB sync 실패 (무시): ${syncErr?.message || syncErr}`);
    }

    // 수복 후 최종 카운트 조회
    const [finalL2, finalL3, finalL1F, finalL2F, finalL3F, finalFE, finalFM, finalFC, finalFL, finalRA] = await Promise.all([
      prisma.l2Structure.count({ where: { fmeaId } }),
      prisma.l3Structure.count({ where: { fmeaId } }),
      prisma.l1Function.count({ where: { fmeaId } }),
      prisma.l2Function.count({ where: { fmeaId } }),
      prisma.l3Function.count({ where: { fmeaId } }),
      prisma.failureEffect.count({ where: { fmeaId } }),
      prisma.failureMode.count({ where: { fmeaId } }),
      prisma.failureCause.count({ where: { fmeaId } }),
      prisma.failureLink.count({ where: { fmeaId } }),
      prisma.riskAnalysis.count({ where: { fmeaId } }),
    ]);

    return NextResponse.json({
      ok: true,
      fmeaId,
      schema,
      rebuilt: {
        l2Structures: finalL2,
        l3Structures: finalL3,
        l1Functions: finalL1F,
        l2Functions: finalL2F,
        l3Functions: finalL3F,
        failureEffects: finalFE,
        failureModes: finalFM,
        failureCauses: finalFC,
        failureLinks: finalFL,
        riskAnalyses: finalRA,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}


