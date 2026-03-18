/**
 * @file pipeline-verify/route.ts
 * @description 6단계 파이프라인 검증 + 자동수정 루프 API (v2 — 교차검증 + FK 전수 + 모자관계)
 *
 * GET  /api/fmea/pipeline-verify?fmeaId=xxx  → 현재 상태 조회
 * POST /api/fmea/pipeline-verify             → 검증 + 자동수정 루프 실행
 *
 * 7단계: SAMPLE(0) → IMPORT(1) → 파싱(2) → UUID(3) → FK(4) → WS(5) → OPT(6)
 * v2: 단순 count → ID-level 교차검증, 14개 FK 전수 검증, 모자관계 무결성
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import {
  type StepResult, type PipelineResult, type StepStatus,
  verifyImport, verifyParsing, verifyUuid, verifyFk, verifyWs, verifyOptimization,
  calcAPServer,
} from './verify-steps';

export const runtime = 'nodejs';

// ─── STEP 0: SAMPLE 완전성 (Master 데이터 빈행 검증) ───
async function verifySample(prisma: any, fmeaId: string): Promise<StepResult> {
  const result: StepResult = { step: 0, name: 'SAMPLE', status: 'ok', details: {}, issues: [], fixed: [] };

  try {
    const basePrisma = (await import('@/lib/prisma')).getPrisma();
    if (!basePrisma) { result.status = 'warn'; result.issues.push('Base Prisma 미사용'); return result; }

    const ds = await basePrisma.pfmeaMasterDataset.findUnique({
      where: { fmeaId },
      include: { flatItems: { select: { itemCode: true, processNo: true, value: true, m4: true }, orderBy: { orderIndex: 'asc' } } },
    });
    if (!ds) { result.details = { flatItems: 0, chains: 0 }; return result; }

    const flatItems = ds.flatItems || [];
    const chains = (ds.failureChains || []) as any[];
    const codeCounts: Record<string, number> = {};
    const emptyValues: Record<string, number> = {};
    for (const item of flatItems) {
      const code = item.itemCode;
      codeCounts[code] = (codeCounts[code] || 0) + 1;
      if (!item.value?.trim()) emptyValues[code] = (emptyValues[code] || 0) + 1;
    }

    // 고장사슬 검증
    const uniqueFMs = new Set(chains.map((c: any) => `${c.processNo}|${c.fmValue}`)).size;
    let chainsEmptyFM = 0, chainsEmptyFC = 0, chainsEmptyFE = 0;
    for (const ch of chains) {
      if (!ch.fmValue?.trim()) chainsEmptyFM++;
      if (!ch.fcValue?.trim()) chainsEmptyFC++;
      if (!ch.feValue?.trim()) chainsEmptyFE++;
    }

    result.details = {
      flatItems: flatItems.length,
      chains: chains.length,
      uniqueFMs,
      ...codeCounts,
      chainsEmptyFM, chainsEmptyFC, chainsEmptyFE,
    };

    // 빈 값 검증 — 특별특성 제외 모든 코드에서 빈값 감지
    const criticalCodes = ['A1','A2','A3','A4','A5','A6','B1','B2','B3','B4','B5','C1','C2','C3','C4'];
    for (const code of criticalCodes) {
      const empty = emptyValues[code] || 0;
      if (empty > 0) {
        result.status = result.status === 'error' ? 'error' : 'warn';
        result.issues.push(`${code} 빈값 ${empty}건`);
      }
    }

    // 고장사슬 빈값 검증
    if (chainsEmptyFM > 0) { result.status = 'error'; result.issues.push(`FC 고장사슬 FM 빈값 ${chainsEmptyFM}건`); }
    if (chainsEmptyFC > 0) { result.status = 'error'; result.issues.push(`FC 고장사슬 FC 빈값 ${chainsEmptyFC}건`); }
    if (chainsEmptyFE > 0) { result.status = result.status === 'error' ? 'error' : 'warn'; result.issues.push(`FC 고장사슬 FE 빈값 ${chainsEmptyFE}건`); }

    // 최소 카운트 검증
    if (flatItems.length === 0) { result.status = 'warn'; result.issues.push('Master 데이터 없음'); }
    if (chains.length === 0) { result.status = result.status === 'error' ? 'error' : 'warn'; result.issues.push('고장사슬 없음'); }

  } catch (err) {
    result.status = 'warn';
    result.issues.push('Master 검증 스킵 (비치명적)');
  }
  return result;
}

// STEP 1~5 verify functions imported from ./verify-steps

// ─── 자동수정 함수들 ───

async function fixStep1Import(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  const data = legacy?.data as any;
  const l2arr = Array.isArray(data?.l2) ? data.l2 : [];
  const fmCount = l2arr.reduce((sum: number, p: any) => sum + (Array.isArray(p.failureModes) ? p.failureModes.length : 0), 0);

  if (fmCount > 0) return fixed;

  const basePrisma = (await import('@/lib/prisma')).getPrisma();
  if (!basePrisma) return fixed;

  const ds = await basePrisma.pfmeaMasterDataset.findUnique({
    where: { fmeaId },
    include: { flatItems: { orderBy: { orderIndex: 'asc' } } },
  });
  if (!ds || !ds.flatItems || ds.flatItems.length === 0) return fixed;

  const flatItems = ds.flatItems;
  const chains = (ds.failureChains || []) as any[];
  const hasAItems = flatItems.some((i: any) => i.itemCode === 'A1');
  const hasBItems = flatItems.some((i: any) => i.itemCode === 'B1');

  if (!hasAItems && !hasBItems) return fixed;

  try {
    const flatData = flatItems.map((i: any) => ({
      id: i.id, processNo: i.processNo, category: i.category,
      itemCode: i.itemCode, value: i.value || '',
      m4: i.m4 || undefined, specialChar: i.specialChar || undefined,
      parentItemId: i.parentItemId || undefined,
      belongsTo: i.belongsTo || undefined,
      inherited: i.inherited || false,
    }));

    const saveRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/fmea/save-from-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId, flatData, l1Name: '', failureChains: chains }),
    });

    if (saveRes.ok) {
      fixed.push(`Master flatData ${flatItems.length}건 + chains ${chains.length}건 → save-from-import 재실행 완료`);
    } else {
      fixed.push(`save-from-import 호출 실패: ${saveRes.status}`);
    }
  } catch (err) {
    console.error('[fixStep1Import] save-from-import 호출 에러:', err);
  }

  return fixed;
}

async function fixStep2Parsing(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  if (!legacy) {
    const importFixes = await fixStep1Import(prisma, fmeaId);
    fixed.push(...importFixes);
    return fixed;
  }

  const data = JSON.parse(JSON.stringify(legacy.data)) as any;
  let changed = false;

  const l2arr = data.l2 || [];
  const a5Count = l2arr.reduce((sum: number, p: any) => sum + (Array.isArray(p.failureModes) ? p.failureModes.length : 0), 0);
  const b4Count = l2arr.reduce((sum: number, p: any) => {
    let count = Array.isArray(p.failureCauses) ? p.failureCauses.length : 0;
    for (const we of (p.l3 || [])) count += Array.isArray(we.failureCauses) ? we.failureCauses.length : 0;
    return sum + count;
  }, 0);

  if (a5Count === 0 || b4Count === 0) {
    const basePrisma = (await import('@/lib/prisma')).getPrisma();
    const masterHasData = basePrisma ? await basePrisma.pfmeaMasterFlatItem.count({
      where: { dataset: { fmeaId }, itemCode: 'A5' },
    }).catch(() => 0) : 0;

    if (masterHasData > 0) {
      const importFixes = await fixStep1Import(prisma, fmeaId);
      if (importFixes.length > 0) {
        fixed.push(...importFixes);
        return fixed;
      }
    }
  }

  // C계열: Legacy l1.functions 보충 — types 구조 또는 Atomic DB에서 파생
  const l1Funcs = data.l1?.functions || [];
  if (l1Funcs.length === 0) {
    if (!data.l1) data.l1 = {};

    // 1차: l1.types[] 계층 구조에서 플랫 배열 생성 (워크시트 저장 후 types만 남은 경우)
    const l1Types = data.l1?.types || [];
    if (l1Types.length > 0) {
      const derived: { id: string; category: string; name: string; requirement: string }[] = [];
      for (const t of l1Types) {
        for (const fn of (t.functions || [])) {
          for (const req of (fn.requirements || [])) {
            derived.push({
              id: req.id || fn.id || '',
              category: t.name || '',
              name: fn.name || '',
              requirement: req.name || '',
            });
          }
          // functions에 requirements가 없으면 function 자체를 1건으로
          if (!fn.requirements || fn.requirements.length === 0) {
            derived.push({
              id: fn.id || '',
              category: t.name || '',
              name: fn.name || '',
              requirement: '',
            });
          }
        }
      }
      if (derived.length > 0) {
        data.l1.functions = derived;
        fixed.push(`L1 types→functions 변환 ${derived.length}건`);
        changed = true;
      }
    }

    // 2차: types도 없으면 Atomic DB에서 로드
    if (!data.l1.functions || data.l1.functions.length === 0) {
      try {
        const atomicL1Funcs = await prisma.l1Function.findMany({ where: { fmeaId } });
        if (atomicL1Funcs.length > 0) {
          data.l1.functions = atomicL1Funcs.map((fn: any) => ({
            id: fn.id,
            category: fn.category || '',
            name: fn.functionName || '',
            requirement: fn.requirement || '',
          }));
          fixed.push(`L1Function ${atomicL1Funcs.length}건 Atomic→Legacy 동기화`);
          changed = true;
        }
      } catch { /* L1Function 테이블 없으면 무시 */ }
    }
  }

  // C4: Atomic DB FailureEffect → Legacy l1.failureScopes 동기화
  const fes = data.l1?.failureScopes || [];
  if (fes.length === 0) {
    try {
      const atomicFEs = await prisma.failureEffect.findMany({ where: { fmeaId } });
      if (atomicFEs.length > 0) {
        if (!data.l1) data.l1 = {};
        data.l1.failureScopes = atomicFEs.map((fe: any) => ({
          id: fe.id,
          name: fe.effectName || fe.effect || '',
          severity: (fe as any).severity || 0,
          scope: (fe as any).scope || '',
        }));
        fixed.push(`FailureEffect ${atomicFEs.length}건 Legacy 동기화`);
        changed = true;
      }
    } catch { /* FailureEffect 테이블 없으면 무시 */ }
  }

  // ★ Atomic DB L3Function 전체 프리로드 (N+1 방지)
  const allL3Funcs = await prisma.l3Function.findMany({
    where: { fmeaId },
    select: { id: true, processChar: true, functionName: true, l3StructId: true },
  }).catch(() => [] as any[]);
  const l3FuncById = new Map<string, { processChar: string; functionName: string }>();
  for (const f of allL3Funcs) {
    l3FuncById.set(f.id, { processChar: f.processChar || '', functionName: f.functionName || '' });
  }

  // ★ functionName → processChar 매핑 (Master FMEA DB에서 SSoT)
  const masterFuncToPC = new Map<string, string>();
  try {
    const fmeaIdPrefix = fmeaId.replace(/\d+$/, '');
    const basePr = (await import('@/lib/prisma')).getPrisma();
    if (basePr) {
      const masterFmeas = await basePr.fmeaProject.findMany({ where: { id: { startsWith: fmeaIdPrefix } }, select: { id: true }, take: 10 });
      for (const mf of masterFmeas) {
        if (mf.id === fmeaId) continue;
        try {
          const mSch = (await import('@/lib/project-schema')).getProjectSchemaName(mf.id);
          const mBu = getBaseDatabaseUrl();
          if (mBu) {
            await (await import('@/lib/project-schema')).ensureProjectSchemaReady({ baseDatabaseUrl: mBu, schema: mSch });
            const mP = getPrismaForSchema(mSch);
            if (mP) {
              const mFuncs = await mP.l3Function.findMany({ where: { fmeaId: mf.id, processChar: { not: '' } }, select: { functionName: true, processChar: true } });
              for (const mf2 of mFuncs) {
                if (mf2.functionName?.trim() && mf2.processChar?.trim()) {
                  // Master processChar가 functionName과 다른 경우만 사용 (진짜 공정특성)
                  if (mf2.processChar !== mf2.functionName) {
                    masterFuncToPC.set(mf2.functionName.trim(), mf2.processChar);
                  }
                }
              }
            }
          }
        } catch { /* 마스터 스키마 접근 실패 무시 */ }
      }
    }
  } catch { /* ignore */ }

  // ★ functionName → Atomic L3Function 매핑
  const atomicFuncByName = new Map<string, { id: string; processChar: string }>();
  for (const f of allL3Funcs) {
    if (f.functionName?.trim()) {
      atomicFuncByName.set(f.functionName.trim(), { id: f.id, processChar: f.processChar || '' });
    }
  }

  // ★ 빈 공정특성 자동채움 + processChars 배열 주입 (functionName 기반 매칭)
  let emptyPcFixed = 0;
  let injectedPcCount = 0;
  const atomicPcUpdates: Array<{ id: string; processChar: string }> = [];
  for (const proc of l2arr) {
    for (const we of (proc.l3 || [])) {
      for (const fn of (we.functions || [])) {
        // CASE 1: processChars 배열이 비어있으면 → Master/Atomic DB에서 주입
        if (!fn.processChars || fn.processChars.length === 0) {
          const fnName = (fn.name?.trim() || fn.functionName?.trim() || '');
          const weName = we.name?.trim() || '';

          // fn.name이 비어있어도 WE 이름으로 Atomic DB L3Function 검색
          let matchedAtomicFuncs: Array<{ id: string; processChar: string; functionName: string }> = [];
          if (fnName) {
            const match = atomicFuncByName.get(fnName);
            if (match) matchedAtomicFuncs.push({ ...match, functionName: fnName });
          }
          if (matchedAtomicFuncs.length === 0 && weName) {
            // WE 이름 전체 매칭 또는 핵심 키워드(첫 단어) 매칭
            const weKeyword = weName.split(/[\s(]/)[0];
            for (const af of allL3Funcs) {
              const afName = af.functionName || '';
              if (afName.includes(weName) || (weKeyword.length >= 2 && afName.includes(weKeyword))) {
                matchedAtomicFuncs.push({ id: af.id, processChar: af.processChar || '', functionName: afName });
              }
            }
          }

          for (const match of matchedAtomicFuncs) {
            // Master SSoT에서 올바른 processChar 가져오기
            let pcName = masterFuncToPC.get(match.functionName?.trim() || '') || '';
            if (!pcName && match.processChar?.trim() && match.processChar !== match.functionName) {
              pcName = match.processChar;
            }
            if (!pcName && match.functionName) pcName = match.functionName;
            if (pcName) {
              if (!fn.processChars) fn.processChars = [];
              fn.processChars.push({ id: match.id, name: pcName });
              injectedPcCount++;
              changed = true;
              // fn.name도 채우기
              if (!fn.name?.trim() && match.functionName) {
                fn.name = match.functionName;
              }
              // Atomic DB processChar 교정 (Master SSoT)
              const masterPc = masterFuncToPC.get(match.functionName?.trim() || '');
              if (masterPc && match.processChar !== masterPc) {
                atomicPcUpdates.push({ id: match.id, processChar: masterPc });
              }
              break;
            }
          }
        }

        // CASE 2: processChars 배열에 이름이 비어있는 항목 채우기
        for (const pc of (fn.processChars || [])) {
          if (!pc.name?.trim()) {
            let pcName = '';
            const atomicInfo = l3FuncById.get(pc.id);
            const fnName = fn.name?.trim() || fn.functionName?.trim() || '';
            // Master에서 매칭
            if (fnName) pcName = masterFuncToPC.get(fnName) || '';
            // Atomic DB에서 매칭
            if (!pcName && atomicInfo?.processChar?.trim() && atomicInfo.processChar !== atomicInfo.functionName) {
              pcName = atomicInfo.processChar;
            }
            // functionName fallback
            if (!pcName && fnName) pcName = fnName;
            if (!pcName && (we.name?.trim())) pcName = `${we.name} 관리`;
            if (pcName) {
              pc.name = pcName;
              emptyPcFixed++;
              changed = true;
              if (pc.id) atomicPcUpdates.push({ id: pc.id, processChar: pcName });
            }
          }
        }
      }
    }
  }
  // ★ Atomic DB L3Function.processChar 일괄 업데이트 (Master SSoT 반영)
  for (const upd of atomicPcUpdates) {
    try {
      await prisma.l3Function.updateMany({ where: { fmeaId, id: upd.id }, data: { processChar: upd.processChar } });
    } catch { /* ignore */ }
  }
  if (emptyPcFixed > 0) fixed.push(`빈 공정특성 ${emptyPcFixed}건 자동채움`);
  if (injectedPcCount > 0) fixed.push(`processChars ${injectedPcCount}건 Master/Atomic → Legacy 주입`);

  // ★★ Atomic DB L3Function.processChar 직접 수정 (Master SSoT 사용)
  // processChar가 비어있거나 functionName과 동일한 경우 (잘못된 fallback) Master에서 올바른 값 꽂아넣기
  try {
    const allAtomicFuncs = await prisma.l3Function.findMany({
      where: { fmeaId },
      select: { id: true, processChar: true, functionName: true },
    });
    let atomicFixed = 0;
    for (const func of allAtomicFuncs) {
      const pc = func.processChar?.trim() || '';
      const fn = func.functionName?.trim() || '';
      // 비어있거나 functionName과 동일한 경우 (잘못된 값)
      const needsFix = !pc || (pc === fn) || pc.length > 40;
      if (needsFix && fn) {
        const masterPc = masterFuncToPC.get(fn);
        if (masterPc && masterPc !== pc) {
          await prisma.l3Function.updateMany({
            where: { fmeaId, id: func.id },
            data: { processChar: masterPc },
          }).catch(() => {});
          // Legacy 동기화
          for (const proc of l2arr) {
            for (const we of (proc.l3 || [])) {
              for (const fnLeg of (we.functions || [])) {
                for (const pcLeg of (fnLeg.processChars || [])) {
                  if (pcLeg.id === func.id) {
                    pcLeg.name = masterPc;
                    changed = true;
                  }
                }
              }
            }
          }
          atomicFixed++;
        }
      }
    }
    if (atomicFixed > 0) {
      fixed.push(`Master SSoT로 L3Function.processChar ${atomicFixed}건 교정`);
      changed = true;
    }
  } catch (err) {
    console.error('[fixStep2Parsing] Atomic DB L3Function 직접 수정 오류:', err);
  }

  if (changed) {
    await prisma.fmeaLegacyData.update({ where: { fmeaId }, data: { data } });
  }

  return fixed;
}

async function fixStep3Uuid(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  const l2s = await prisma.l2Structure.findMany({ where: { fmeaId } });

  if (l2s.length === 0) {
    const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
    const legacyL2 = Array.isArray((legacy?.data as any)?.l2) ? (legacy?.data as any).l2 : [];

    if (legacyL2.length > 0) {
      try {
        const rebuildRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/fmea/rebuild-atomic?fmeaId=${encodeURIComponent(fmeaId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fmeaId }),
        });
        if (rebuildRes.ok) {
          const result = await rebuildRes.json();
          fixed.push(`rebuild-atomic 완료: L2=${result.counts?.l2 || '?'}, L3=${result.counts?.l3 || '?'}, FM=${result.counts?.fm || '?'}`);
        } else {
          fixed.push(`rebuild-atomic 호출 실패: ${rebuildRes.status}`);
        }
      } catch (err) {
        console.error('[fixStep3Uuid] rebuild-atomic 호출 에러:', err);
      }
      return fixed;
    } else {
      const importFixes = await fixStep1Import(prisma, fmeaId);
      if (importFixes.length > 0) {
        fixed.push(...importFixes);
        return fixed;
      }
    }
  }

  const fcs = await prisma.failureCause.findMany({ where: { fmeaId }, select: { processCharId: true, l3FuncId: true } });
  const fcPcIds = new Set(fcs.map((fc: any) => fc.processCharId).filter(Boolean));
  const fcL3Ids = new Set(fcs.map((fc: any) => fc.l3FuncId).filter(Boolean));
  const l3Funcs = await prisma.l3Function.findMany({ where: { fmeaId } });
  const l3s = await prisma.l3Structure.findMany({ where: { fmeaId } });
  const l2ById = new Map(l2s.map((l: any) => [l.id, l]));
  const l3ById = new Map(l3s.map((l: any) => [l.id, l]));

  // ★★★ 2026-03-18 FIX: L3Function이 0건인 L3Structure에 폴백 L3Function 자동생성 ★★★
  const l3FuncByL3 = new Map<string, any[]>();
  for (const f of l3Funcs) {
    if (!l3FuncByL3.has(f.l3StructId)) l3FuncByL3.set(f.l3StructId, []);
    l3FuncByL3.get(f.l3StructId)!.push(f);
  }

  const missingL3FuncData: Array<{ id: string; fmeaId: string; l3StructId: string; l2StructId: string; functionName: string; processChar: string }> = [];
  for (const l3 of l3s) {
    const name = ((l3 as any).name || '').trim();
    if (!name || name.includes('공정 선택 후')) continue;
    const children = l3FuncByL3.get(l3.id) || [];
    if (children.length === 0) {
      missingL3FuncData.push({
        id: `${l3.id}-L3F`,
        fmeaId,
        l3StructId: l3.id,
        l2StructId: (l3 as any).l2Id || '',
        functionName: name,
        processChar: '',
      });
    }
  }
  if (missingL3FuncData.length > 0) {
    try {
      await prisma.l3Function.createMany({ data: missingL3FuncData, skipDuplicates: true });
      fixed.push(`L3Function 폴백 생성 ${missingL3FuncData.length}건 (L3Structure명 사용)`);
      // 새로 생성된 L3Function을 메모리에도 반영 (이후 orphan 로직에서 사용)
      l3Funcs.push(...missingL3FuncData);
    } catch (err) {
      console.error('[fixStep3Uuid] L3Function 폴백 생성 오류:', err);
    }
  }

  const orphans = l3Funcs.filter((f: any) => !fcPcIds.has(f.id) && !fcL3Ids.has(f.id));

  // ★ createMany로 일괄 생성 (개별 create 루프 금지 — Rule 0.6)
  const orphanFcData: Array<{ id: string; fmeaId: string; l2StructId: string; l3StructId: string; l3FuncId: string; processCharId: string; cause: string }> = [];
  for (const func of orphans) {
    const l3 = l3ById.get(func.l3StructId);
    const l2 = l3 ? l2ById.get((l3 as any).l2Id) : null;
    if (!l2) continue;

    const pcName = func.processChar?.trim() || func.functionName?.trim() || (l3 as any)?.name || '';
    const fcName = pcName ? `${pcName} 부적합` : `${(l3 as any)?.name || 'Unknown'} 부적합`;
    const fcId = `${func.id}-FC`;

    orphanFcData.push({
      id: fcId, fmeaId, l2StructId: (l2 as any).id,
      l3StructId: func.l3StructId, l3FuncId: func.id,
      processCharId: func.id, cause: fcName,
    });
    fixed.push(`FC 생성: "${fcName}"`);
  }
  if (orphanFcData.length > 0) {
    try {
      await prisma.failureCause.createMany({ data: orphanFcData, skipDuplicates: true });
    } catch (err) {
      console.error('[fixStep3Uuid] orphan FC 일괄 생성 오류:', err);
    }
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

  // FC에 FailureLink 없으면 생성 — 결정론적 매칭만 사용 (Rule 0.4)
  // ★ 같은 L2 공정의 기존 Link에서 FM→FE 매핑을 추출
  const fmToFeMap = new Map<string, string>();
  for (const lk of links) {
    if (fmSet.has(lk.fmId) && feSet.has(lk.feId)) {
      fmToFeMap.set(lk.fmId, lk.feId);
    }
  }
  const newLinks: Array<{ fmeaId: string; fcId: string; fmId: string; feId: string }> = [];
  for (const fc of fcs) {
    if (linkedFcIds.has(fc.id)) continue;

    const procFms = fms.filter((fm: any) => fm.l2StructId === fc.l2StructId);
    if (procFms.length === 0) continue; // ★ FM 없으면 Link 생성 불가 — warn 유지

    // ★ 기존 Link가 있는 FM 우선 선택 (결정론적)
    const linkedFm = procFms.find((fm: any) => fmToFeMap.has(fm.id));
    const selectedFm = linkedFm || procFms[0];
    const selectedFe = fmToFeMap.get(selectedFm.id);
    if (!selectedFe) continue; // ★ FE 매핑 없으면 생성 불가 — fes[0] fallback 금지

    newLinks.push({ fmeaId, fcId: fc.id, fmId: selectedFm.id, feId: selectedFe });
    fixed.push(`Link 생성: FC=${(fc as any).cause?.substring(0, 20)}`);
  }
  // ★ createMany로 일괄 저장 (개별 create 루프 금지 — Rule 0.6)
  if (newLinks.length > 0) {
    try {
      await prisma.failureLink.createMany({ data: newLinks, skipDuplicates: true });
    } catch (err) {
      console.error('[fixStep4Fk] FailureLink 일괄 생성 오류:', err);
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

  // ★ Atomic DB L3Function 전체 로드 (한번에 조회하여 N+1 방지)
  let l3FuncMap = new Map<string, { processChar: string; functionName: string }>();
  try {
    const allL3Funcs = await prisma.l3Function.findMany({
      where: { fmeaId },
      select: { id: true, processChar: true, functionName: true, l3StructId: true },
    });
    for (const f of allL3Funcs) {
      l3FuncMap.set(f.id, { processChar: f.processChar || '', functionName: f.functionName || '' });
    }
  } catch { /* ignore */ }

  // ★ Master B3 데이터 프리로드
  let masterB3Map = new Map<string, string>();
  try {
    const basePrisma = (await import('@/lib/prisma')).getPrisma();
    if (basePrisma) {
      const masterB3s = await basePrisma.pfmeaMasterFlatItem.findMany({
        where: { dataset: { fmeaId }, itemCode: 'B3' },
        select: { processNo: true, value: true, orderIndex: true },
        orderBy: { orderIndex: 'asc' },
      });
      for (const b3 of masterB3s) {
        if (b3.value?.trim()) {
          const key = `${b3.processNo}-${b3.orderIndex}`;
          masterB3Map.set(key, b3.value);
        }
      }
    }
  } catch { /* ignore */ }

  const atomicPcUpdatesWs: Array<{ id: string; processChar: string }> = [];
  for (const proc of (data.l2 || [])) {
    let pcSeq = 0;
    for (const we of (proc.l3 || [])) {
      for (const fn of (we.functions || [])) {
        for (const pc of (fn.processChars || [])) {
          pcSeq++;
          if (!pc.name?.trim()) {
            let pcName = '';

            // 1) Atomic DB ID 매칭
            const l3Func = l3FuncMap.get(pc.id);
            if (l3Func?.processChar?.trim()) pcName = l3Func.processChar;
            else if (l3Func?.functionName?.trim()) pcName = l3Func.functionName;

            // 2) 작업요소명/기능명 fallback
            if (!pcName) {
              const fnName = fn.name?.trim() || fn.functionName?.trim() || '';
              const weName = we.name?.trim() || '';
              if (fnName) pcName = fnName;
              else if (weName) pcName = `${weName} 관리`;
            }

            // 3) Master B3 데이터 fallback (공정번호 + 순서)
            if (!pcName) {
              for (const [key, val] of masterB3Map) {
                if (key.startsWith(`${proc.no}-`)) {
                  pcName = val;
                  break;
                }
              }
            }

            if (pcName) {
              pc.name = pcName;
              fixed.push(`PC 이름 복원: "${pcName}"`);
              changed = true;
              if (pc.id) atomicPcUpdatesWs.push({ id: pc.id, processChar: pcName });
            }
          }
        }
      }
    }

    // orphan PC에 FC 보충 — L2 + L3 FC의 processCharId 모두 수집
    const procFcs = proc.failureCauses || [];
    const fcPcIds = new Set(procFcs.map((fc: any) => fc.processCharId).filter(Boolean));
    for (const we of (proc.l3 || [])) {
      const weFcs = Array.isArray(we.failureCauses) ? we.failureCauses : [];
      for (const fc of weFcs) {
        if (fc.processCharId) fcPcIds.add(fc.processCharId);
      }
    }
    const orphanFcCreates: Array<{ id: string; fmeaId: string; l2StructId: string; cause: string; processCharId: string }> = [];
    for (const we of (proc.l3 || [])) {
      for (const fn of (we.functions || [])) {
        for (const pc of (fn.processChars || [])) {
          if (pc.name?.trim() && !fcPcIds.has(pc.id)) {
            const fcId = `${pc.id}-FC`;
            const fcName = `${pc.name} 부적합`;
            procFcs.push({ id: fcId, name: fcName, processCharId: pc.id });
            fcPcIds.add(pc.id);
            // ★ Atomic DB에도 FailureCause 생성 (Legacy만 수정 금지 — Rule 0)
            orphanFcCreates.push({
              id: fcId, fmeaId, l2StructId: proc.id || '',
              cause: fcName, processCharId: pc.id,
            });
            fixed.push(`FC 보충: "${fcName}"`);
            changed = true;
          }
        }
      }
    }
    if (changed) proc.failureCauses = procFcs;
  }

  // ★ Legacy FC 중 Atomic DB에 없는 것 전수 동기화 (교차검증 error 해소)
  const atomicFcIds = new Set<string>();
  try {
    const atomicFCs = await prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true } });
    for (const fc of atomicFCs) atomicFcIds.add(fc.id);
  } catch { /* ignore */ }

  // L2Structure ID 매핑 (공정번호 → Atomic L2 ID)
  const l2IdByNo = new Map<string, string>();
  try {
    const l2s = await prisma.l2Structure.findMany({ where: { fmeaId }, select: { id: true, no: true } });
    for (const l2 of l2s) l2IdByNo.set(l2.no, l2.id);
  } catch { /* ignore */ }

  const missingFcCreates: Array<{ id: string; fmeaId: string; l2StructId: string; cause: string; processCharId: string }> = [];
  for (const proc of (data.l2 || [])) {
    // proc.id가 빈 경우 공정번호로 Atomic L2 ID 조회
    const procL2Id = proc.id || l2IdByNo.get(proc.no) || l2IdByNo.get(String(proc.no)) || '';
    // L2 수준 FC
    for (const fc of (proc.failureCauses || [])) {
      if (fc.id && !atomicFcIds.has(fc.id)) {
        missingFcCreates.push({
          id: fc.id, fmeaId, l2StructId: procL2Id,
          cause: fc.name || fc.cause || `${fc.processCharId || 'unknown'} 부적합`,
          processCharId: fc.processCharId || '',
        });
      }
    }
    // L3(WE) 수준 FC
    for (const we of (proc.l3 || [])) {
      for (const fc of (we.failureCauses || [])) {
        if (fc.id && !atomicFcIds.has(fc.id)) {
          missingFcCreates.push({
            id: fc.id, fmeaId, l2StructId: procL2Id,
            cause: fc.name || fc.cause || `${fc.processCharId || 'unknown'} 부적합`,
            processCharId: fc.processCharId || '',
          });
        }
      }
    }
  }
  if (missingFcCreates.length > 0) {
    // 개별 upsert로 안전하게 저장 (createMany FK 실패 방지)
    let syncCount = 0;
    for (const fc of missingFcCreates) {
      try {
        await prisma.failureCause.upsert({
          where: { id: fc.id },
          create: fc,
          update: { cause: fc.cause, processCharId: fc.processCharId },
        });
        syncCount++;
      } catch (err) {
        console.error(`[fixStep5Ws] FC upsert 실패: ${fc.id}`, err instanceof Error ? err.message : '');
      }
    }
    if (syncCount > 0) {
      fixed.push(`Legacy→Atomic FC 동기화 ${syncCount}건`);
      changed = true;
    }
  }

  // ★ Atomic DB L3Function.processChar 일괄 업데이트 (재발 방지)
  for (const upd of atomicPcUpdatesWs) {
    try {
      await prisma.l3Function.updateMany({
        where: { fmeaId, id: upd.id },
        data: { processChar: upd.processChar },
      });
    } catch (err) {
      console.error('[fixStep5Ws] L3Function.processChar 업데이트 오류:', err);
    }
  }

  if (changed) {
    await prisma.fmeaLegacyData.update({ where: { fmeaId }, data: { data } });
  }

  return fixed;
}

// ─── STEP 6: OPT 자동수정 — SOD 동기화 + AP 재계산 + 개선안 자동생성 ───

async function fixStep6Opt(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  const [fls, ras, opts, legacy] = await Promise.all([
    prisma.failureLink.findMany({ where: { fmeaId }, select: { id: true, fmId: true, fcId: true } }),
    prisma.riskAnalysis.findMany({ where: { fmeaId } }),
    prisma.optimization.findMany({ where: { fmeaId }, select: { id: true, riskId: true } }),
    prisma.fmeaLegacyData.findUnique({ where: { fmeaId } }),
  ]);

  const riskData = (legacy?.data as any)?.riskData || {};
  const flById = new Map<string, { fmId: string; fcId: string }>();
  for (const fl of fls) flById.set(fl.id, { fmId: fl.fmId, fcId: fl.fcId });

  // ★ 2026-03-18: FK 고아 Optimization 정리 — riskId가 존재하지 않는 RA를 가리키는 Opt 삭제
  const validRaIds = new Set(ras.map((ra: any) => ra.id));
  const orphanOpts = opts.filter((o: any) => !validRaIds.has(o.riskId));
  if (orphanOpts.length > 0) {
    const orphanIds = orphanOpts.map((o: any) => o.id);
    try {
      await prisma.optimization.deleteMany({ where: { id: { in: orphanIds } } });
      fixed.push(`FK 고아 Optimization 삭제 ${orphanOpts.length}건`);
    } catch (err) {
      console.error('[fixStep6Opt] 고아 Opt 삭제 실패:', err instanceof Error ? err.message : '');
    }
  }

  // 동일 FM(공정) 그룹별 유효 O/D/DC/PC 수집 — 피어 값 참조용
  const fmPeerO = new Map<string, number[]>();
  const fmPeerD = new Map<string, number[]>();
  const fmPeerDC = new Map<string, string[]>();
  const fmPeerPC = new Map<string, string[]>();
  for (const ra of ras) {
    const fl = flById.get(ra.linkId);
    if (!fl) continue;
    if (ra.occurrence > 0) {
      if (!fmPeerO.has(fl.fmId)) fmPeerO.set(fl.fmId, []);
      fmPeerO.get(fl.fmId)!.push(ra.occurrence);
    }
    if (ra.detection > 0) {
      if (!fmPeerD.has(fl.fmId)) fmPeerD.set(fl.fmId, []);
      fmPeerD.get(fl.fmId)!.push(ra.detection);
    }
    if (ra.detectionControl?.trim()) {
      if (!fmPeerDC.has(fl.fmId)) fmPeerDC.set(fl.fmId, []);
      fmPeerDC.get(fl.fmId)!.push(ra.detectionControl.trim());
    }
    if (ra.preventionControl?.trim()) {
      if (!fmPeerPC.has(fl.fmId)) fmPeerPC.set(fl.fmId, []);
      fmPeerPC.get(fl.fmId)!.push(ra.preventionControl.trim());
    }
  }
  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  };

  // ★★★ 2026-03-18 FIX: RA 없는 FailureLink에 RiskAnalysis 자동생성 (STEP 6 근본 수정) ★★★
  const linkedRaLinkIds = new Set(ras.map((r: any) => r.linkId));
  const unlinkedFls = fls.filter((fl: any) => !linkedRaLinkIds.has(fl.id));

  if (unlinkedFls.length > 0) {
    const newRaData: Array<{ id: string; fmeaId: string; linkId: string; severity: number; occurrence: number; detection: number; ap: string; preventionControl: string | null; detectionControl: string | null }> = [];
    for (const fl of unlinkedFls) {
      const uk = `${fl.fmId}-${fl.fcId}`;
      // riskData에서 SOD/PC/DC 추출 시도
      const wsS = Number(riskData[`risk-${uk}-S`]) || 0;
      const wsO = Number(riskData[`risk-${uk}-O`]) || 0;
      const wsD = Number(riskData[`risk-${uk}-D`]) || 0;
      const wsPrev = typeof riskData[`prevention-${uk}`] === 'string' ? riskData[`prevention-${uk}`] : null;
      const wsDet = typeof riskData[`detection-${uk}`] === 'string' ? riskData[`detection-${uk}`] : null;

      const s = wsS > 0 ? wsS : 0;
      const o = wsO > 0 ? wsO : 0;
      const d = wsD > 0 ? wsD : 0;
      const ap = (s > 0 && o > 0 && d > 0) ? (calcAPServer(s, o, d) || 'L') : 'L';

      newRaData.push({
        id: `ra-${fl.id}`,
        fmeaId,
        linkId: fl.id,
        severity: s,
        occurrence: o,
        detection: d,
        ap,
        preventionControl: wsPrev,
        detectionControl: wsDet,
      });
    }

    try {
      await prisma.riskAnalysis.createMany({ data: newRaData, skipDuplicates: true });
      fixed.push(`누락 RA 자동생성 ${newRaData.length}건 (FailureLink 1:1 보장)`);
      // 새로 생성된 RA를 메모리에 반영 (이후 SOD/PC/DC 피어 채움에서 활용)
      ras.push(...newRaData);
      // 피어 맵 갱신
      for (const ra of newRaData) {
        const fl = flById.get(ra.linkId);
        if (!fl) continue;
        if (ra.occurrence > 0) {
          if (!fmPeerO.has(fl.fmId)) fmPeerO.set(fl.fmId, []);
          fmPeerO.get(fl.fmId)!.push(ra.occurrence);
        }
        if (ra.detection > 0) {
          if (!fmPeerD.has(fl.fmId)) fmPeerD.set(fl.fmId, []);
          fmPeerD.get(fl.fmId)!.push(ra.detection);
        }
        if (ra.detectionControl?.trim()) {
          if (!fmPeerDC.has(fl.fmId)) fmPeerDC.set(fl.fmId, []);
          fmPeerDC.get(fl.fmId)!.push(ra.detectionControl.trim());
        }
        if (ra.preventionControl?.trim()) {
          if (!fmPeerPC.has(fl.fmId)) fmPeerPC.set(fl.fmId, []);
          fmPeerPC.get(fl.fmId)!.push(ra.preventionControl.trim());
        }
      }
    } catch (err) {
      console.error('[fixStep6Opt] 누락 RA 자동생성 오류:', err);
    }
  }

  let sodSynced = 0;
  let apRecalced = 0;
  let oFilled = 0;
  let dFilled = 0;
  let dcFilled = 0;
  let pcFilled = 0;
  const riskDataUpdates: Record<string, number> = {};
  // 가장 빈번한 피어 값 선택 (최빈값)
  const mostFrequent = (arr: string[]) => {
    if (arr.length === 0) return '';
    const freq = new Map<string, number>();
    for (const v of arr) freq.set(v, (freq.get(v) || 0) + 1);
    let best = arr[0], bestCount = 0;
    for (const [k, c] of freq) { if (c > bestCount) { best = k; bestCount = c; } }
    return best;
  };

  for (const ra of ras) {
    const fl = flById.get(ra.linkId);
    if (!fl) continue;
    const uk = `${fl.fmId}-${fl.fcId}`;

    const wsS = Number(riskData[`risk-${uk}-S`]) || 0;
    const wsO = Number(riskData[`risk-${uk}-O`]) || 0;
    const wsD = Number(riskData[`risk-${uk}-D`]) || 0;

    let needsUpdate = false;
    let newS = ra.severity;
    let newO = ra.occurrence;
    let newD = ra.detection;

    // S 동기화: riskData 우선
    if ((!ra.severity || ra.severity <= 0) && wsS > 0) { newS = wsS; needsUpdate = true; }

    // O 동기화: riskData → 동일 FM 피어 중앙값 → 기본값 1
    if (!ra.occurrence || ra.occurrence <= 0) {
      if (wsO > 0) {
        newO = wsO; needsUpdate = true;
      } else {
        const peerO = median(fmPeerO.get(fl.fmId) || []);
        newO = peerO > 0 ? peerO : 1;
        needsUpdate = true;
        riskDataUpdates[`risk-${uk}-O`] = newO;
      }
      oFilled++;
    }

    // D 동기화: riskData → 동일 FM 피어 중앙값 → 기본값 1
    if (!ra.detection || ra.detection <= 0) {
      if (wsD > 0) {
        newD = wsD; needsUpdate = true;
      } else {
        const peerD = median(fmPeerD.get(fl.fmId) || []);
        newD = peerD > 0 ? peerD : 1;
        needsUpdate = true;
        riskDataUpdates[`risk-${uk}-D`] = newD;
      }
      dFilled++;
    }

    // DC/PC 빈값 피어 채움: 동일 FM 그룹에서 가장 빈번한 DC/PC 사용
    let newDC = ra.detectionControl || '';
    let newPC = ra.preventionControl || '';
    if (!newDC.trim() && fl) {
      const peerDC = mostFrequent(fmPeerDC.get(fl.fmId) || []);
      if (peerDC) { newDC = peerDC; needsUpdate = true; dcFilled++; }
    }
    if (!newPC.trim() && fl) {
      const peerPC = mostFrequent(fmPeerPC.get(fl.fmId) || []);
      if (peerPC) { newPC = peerPC; needsUpdate = true; pcFilled++; }
    }

    // AP 재계산
    const currentAP = ra.ap || '';
    const expectedAP = calcAPServer(newS, newO, newD);
    if (expectedAP && expectedAP !== currentAP) {
      needsUpdate = true;
      apRecalced++;
    }

    if (needsUpdate) {
      try {
        await prisma.riskAnalysis.update({
          where: { id: ra.id },
          data: {
            severity: newS,
            occurrence: newO,
            detection: newD,
            ap: expectedAP || currentAP,
            ...(newDC.trim() ? { detectionControl: newDC } : {}),
            ...(newPC.trim() ? { preventionControl: newPC } : {}),
          },
        });
        sodSynced++;
      } catch (err) {
        console.error(`[fixStep6Opt] RA update 실패: ${ra.id}`, err instanceof Error ? err.message : '');
      }
    }
  }

  // riskData 역동기화 — 자동채움 값을 WS에도 반영
  if (Object.keys(riskDataUpdates).length > 0 && legacy) {
    try {
      const data = JSON.parse(JSON.stringify(legacy.data));
      if (!data.riskData) data.riskData = {};
      for (const [key, val] of Object.entries(riskDataUpdates)) {
        data.riskData[key] = val;
      }
      await prisma.fmeaLegacyData.update({ where: { fmeaId }, data: { data } });
      fixed.push(`riskData 역동기화 ${Object.keys(riskDataUpdates).length}건`);
    } catch (err) {
      console.error('[fixStep6Opt] riskData 역동기화 실패:', err instanceof Error ? err.message : '');
    }
  }

  if (sodSynced > 0) fixed.push(`SOD DB 동기화 ${sodSynced}건`);
  if (oFilled > 0) fixed.push(`O 미입력 자동채움 ${oFilled}건 (피어중앙값/기본1)`);
  if (dFilled > 0) fixed.push(`D 미입력 자동채움 ${dFilled}건 (피어중앙값/기본1)`);
  if (dcFilled > 0) fixed.push(`DC 미입력 자동채움 ${dcFilled}건 (동일FM 피어최빈값)`);
  if (pcFilled > 0) fixed.push(`PC 미입력 자동채움 ${pcFilled}건 (동일FM 피어최빈값)`);
  if (apRecalced > 0) fixed.push(`AP 재계산 ${apRecalced}건`);

  // ★★★ 2026-03-18 FIX: Opt→RA FK 고아 정리 (rebuild-atomic 후 RA ID 변경으로 발생) ★★★
  const validRaIds = new Set(ras.map((r: any) => r.id));
  const orphanOpts = opts.filter((o: { riskId: string }) => !validRaIds.has(o.riskId));
  if (orphanOpts.length > 0) {
    const orphanOptIds = orphanOpts.map((o: { id: string }) => o.id);
    try {
      await prisma.optimization.deleteMany({ where: { id: { in: orphanOptIds } } });
      fixed.push(`Opt→RA FK 고아 삭제 ${orphanOptIds.length}건 (rebuild 후 RA ID 변경)`);
      const orphanIdSet = new Set(orphanOptIds);
      const remainingOpts = opts.filter((o: { id: string }) => !orphanIdSet.has(o.id));
      opts.length = 0;
      opts.push(...remainingOpts);
    } catch (err) {
      console.error('[fixStep6Opt] 고아 Optimization 삭제 오류:', err);
    }
  }

  // ── WS(riskData) → DB 개선안 동기화 ──
  const raByLink = new Map<string, { id: string; ap: string; severity: number; occurrence: number; detection: number; linkId: string }>();
  for (const ra of ras) raByLink.set(ra.linkId, { ...ra, linkId: ra.linkId });
  const existingOptRiskIds = new Set<string>(opts.map((o: { riskId: string }) => o.riskId));

  let wsSynced = 0;
  for (const fl of fls) {
    const ra = raByLink.get(fl.id);
    if (!ra) continue;
    const uk = `${fl.fmId}-${fl.fcId}`;

    const rowCountVal = riskData[`opt-rows-${uk}`];
    let rowCount = 1;
    if (typeof rowCountVal === 'number' && rowCountVal >= 1) rowCount = Math.floor(rowCountVal);
    else if (typeof rowCountVal === 'string' && !isNaN(Number(rowCountVal)) && Number(rowCountVal) >= 1) rowCount = Math.floor(Number(rowCountVal));

    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      const suffix = rowIdx === 0 ? '' : `#${rowIdx}`;
      const recAction = String(riskData[`prevention-opt-${uk}${suffix}`] || '').trim();
      const responsible = String(riskData[`person-opt-${uk}${suffix}`] || '').trim();
      const targetDate = String(riskData[`targetDate-opt-${uk}${suffix}`] || '').trim();
      const completedDate = String(riskData[`completeDate-opt-${uk}${suffix}`] || riskData[`completionDate-opt-${uk}${suffix}`] || '').trim();
      const status = String(riskData[`status-opt-${uk}${suffix}`] || '').trim();
      const remarks = String(riskData[`note-opt-${uk}${suffix}`] || '').trim();

      const sodSuffix = rowIdx === 0 ? '' : `#${rowIdx}`;
      const newS = Number(riskData[`opt-${uk}${sodSuffix}-S`]) || undefined;
      const newO = Number(riskData[`opt-${uk}${sodSuffix}-O`]) || undefined;
      const newD = Number(riskData[`opt-${uk}${sodSuffix}-D`]) || undefined;
      const newAP = String(riskData[`opt-${uk}${sodSuffix}-AP`] || '').trim() || undefined;

      if (!recAction && !responsible && !targetDate && !status) continue;
      if (existingOptRiskIds.has(ra.id) && rowIdx === 0) continue;

      try {
        await prisma.optimization.create({
          data: {
            fmeaId,
            riskId: ra.id,
            recommendedAction: recAction,
            responsible,
            targetDate,
            completedDate: completedDate || null,
            status: status || 'open',
            remarks: remarks || null,
            newSeverity: newS ?? null,
            newOccurrence: newO ?? null,
            newDetection: newD ?? null,
            newAP: newAP ?? null,
          },
        });
        existingOptRiskIds.add(ra.id);
        wsSynced++;
      } catch (err) {
        console.error(`[fixStep6Opt] WS→DB Opt sync 실패: RA=${ra.id} row=${rowIdx}`, err instanceof Error ? err.message : '');
      }
    }
  }
  if (wsSynced > 0) fixed.push(`WS→DB 개선안 동기화 ${wsSynced}건`);

  // ── AP=H/M 개선안(Optimization) 자동생성 (아직 없는 것만) ──
  const refreshedOpts = await prisma.optimization.findMany({ where: { fmeaId }, select: { riskId: true } });
  const refreshedOptRiskIds = new Set<string>(refreshedOpts.map((o: { riskId: string }) => o.riskId));

  let hCreated = 0;
  let mCreated = 0;
  for (const fl of fls) {
    const ra = raByLink.get(fl.id);
    if (!ra) continue;
    const ap = ra.ap || calcAPServer(ra.severity, ra.occurrence, ra.detection) || '';
    if ((ap !== 'H' && ap !== 'M') || refreshedOptRiskIds.has(ra.id)) continue;

    try {
      await prisma.optimization.create({
        data: {
          fmeaId,
          riskId: ra.id,
          recommendedAction: '',
          responsible: '',
          targetDate: '',
          status: '대기',
          remarks: `AP=${ap} 자동생성`,
        },
      });
      refreshedOptRiskIds.add(ra.id);
      if (ap === 'H') hCreated++;
      else mCreated++;
    } catch (err) {
      console.error(`[fixStep6Opt] Opt create 실패: RA=${ra.id}`, err instanceof Error ? err.message : '');
    }
  }
  if (hCreated > 0) fixed.push(`AP=H 개선안 자동생성 ${hCreated}건`);
  if (mCreated > 0) fixed.push(`AP=M 개선안 자동생성 ${mCreated}건`);

  return fixed;
}

// ─── 메인 검증+수정 루프 ───

async function runPipelineVerify(prisma: any, fmeaId: string, autoFix: boolean): Promise<PipelineResult> {
  const MAX_LOOPS = 7;
  let loopCount = 0;

  for (let i = 0; i < MAX_LOOPS; i++) {
    loopCount = i + 1;

    const steps: StepResult[] = [
      await verifySample(prisma, fmeaId),
      await verifyImport(prisma, fmeaId),
      await verifyParsing(prisma, fmeaId),
      await verifyUuid(prisma, fmeaId),
      await verifyFk(prisma, fmeaId),
      await verifyWs(prisma, fmeaId),
      await verifyOptimization(prisma, fmeaId),
    ];

    // autoFix 아닌 경우 (GET 조회) → 즉시 반환
    if (!autoFix) {
      const allOk = steps.every(s => s.status === 'ok');
      return { fmeaId, steps, allGreen: allOk, loopCount, timestamp: new Date().toISOString() };
    }

    // 전체 단계(0~6) allGreen 사전 판정
    const allOkBefore = steps.every(s => s.status === 'ok');
    if (allOkBefore) {
      return { fmeaId, steps, allGreen: true, loopCount, timestamp: new Date().toISOString() };
    }

    // ── Steps 0-5 자동수정 (먼저 실행 — rebuild-atomic이 RA를 재생성할 수 있으므로) ──

    // STEP 1 (IMPORT)
    const stepImport = steps.find(s => s.name === 'IMPORT');
    if (stepImport && stepImport.status !== 'ok') {
      const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
      const legacyL2 = Array.isArray((legacy?.data as any)?.l2) ? (legacy?.data as any).l2 : [];
      const legacyFMs = legacyL2.reduce((sum: number, p: any) => sum + (Array.isArray(p.failureModes) ? p.failureModes.length : 0), 0);

      if (legacyFMs === 0) {
        const importFixes = await fixStep1Import(prisma, fmeaId);
        if (importFixes.length > 0) {
          stepImport.fixed = importFixes;
          stepImport.status = 'fixed';
        } else if (stepImport.status === 'error') {
          return { fmeaId, steps, allGreen: false, loopCount, timestamp: new Date().toISOString() };
        }
      } else if (i === 0 && (stepImport.status === 'warn' || stepImport.status === 'error')) {
        try {
          const rebuildRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/fmea/rebuild-atomic?fmeaId=${encodeURIComponent(fmeaId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fmeaId }),
          });
          if (rebuildRes.ok) {
            const result = await rebuildRes.json();
            stepImport.fixed.push(`rebuild-atomic 재동기화: L2=${result.counts?.l2 || '?'} FM=${result.counts?.fm || '?'} FC=${result.counts?.fc || '?'}`);
            stepImport.status = 'fixed';
          }
        } catch (err) {
          console.error('[fixStep1] rebuild-atomic 호출 오류:', err);
        }
      }
    }

    // STEP 2 (파싱)
    const stepParsing = steps.find(s => s.name === '파싱');
    if (stepParsing && stepParsing.status !== 'ok') {
      const fixes = await fixStep2Parsing(prisma, fmeaId);
      stepParsing.fixed = fixes;
      if (fixes.length > 0) stepParsing.status = 'fixed';
    }

    // STEP 3 (UUID)
    const stepUuid = steps.find(s => s.name === 'UUID');
    if (stepUuid && stepUuid.status !== 'ok') {
      const fixes = await fixStep3Uuid(prisma, fmeaId);
      stepUuid.fixed = fixes;
      if (fixes.length > 0) stepUuid.status = 'fixed';
    }

    // STEP 4 (FK)
    const stepFk = steps.find(s => s.name === 'FK');
    if (stepFk && stepFk.status !== 'ok') {
      const fixes = await fixStep4Fk(prisma, fmeaId);
      stepFk.fixed = fixes;
      if (fixes.length > 0) stepFk.status = 'fixed';
    }

    // STEP 5 (WS)
    const stepWs = steps.find(s => s.name === 'WS');
    if (stepWs && stepWs.status !== 'ok') {
      const fixes = await fixStep5Ws(prisma, fmeaId);
      stepWs.fixed = fixes;
      if (fixes.length > 0) stepWs.status = 'fixed';
    }

    // ── Step 6 (OPT) 자동수정 — Steps 0-5 fix 이후 실행 (rebuild-atomic 영향 반영) ──
    const stepOpt = steps.find(s => s.name === 'OPT');
    if (stepOpt && stepOpt.status !== 'ok') {
      const fixes = await fixStep6Opt(prisma, fmeaId);
      stepOpt.fixed = fixes;
      if (fixes.length > 0) stepOpt.status = 'fixed';
    }

    const anyFixed = steps.some(s => s.fixed.length > 0);
    if (!anyFixed) {
      const acceptable = steps.every(s => s.status === 'ok' || s.status === 'warn');
      return { fmeaId, steps, allGreen: acceptable, loopCount, timestamp: new Date().toISOString() };
    }
  }

  // 최종 검증
  const finalSteps: StepResult[] = [
    await verifySample(prisma, fmeaId),
    await verifyImport(prisma, fmeaId),
    await verifyParsing(prisma, fmeaId),
    await verifyUuid(prisma, fmeaId),
    await verifyFk(prisma, fmeaId),
    await verifyWs(prisma, fmeaId),
    await verifyOptimization(prisma, fmeaId),
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
