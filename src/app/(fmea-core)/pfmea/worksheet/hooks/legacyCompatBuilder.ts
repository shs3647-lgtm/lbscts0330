/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file legacyCompatBuilder.ts
 * @description atomicToLegacy 대체 — 최소 호환 빌더 (2026-03-27)
 *
 * atomicToLegacyAdapter.ts (526줄) 완전 삭제 후,
 * 아직 마이그레이션되지 않은 탭(StructureTab, AllTab 등)이
 * state.l1/l2/riskData/failureLinks를 참조하므로 최소 호환 빌드.
 *
 * ★ 이 파일은 모든 탭이 useAtomicLookup으로 마이그레이션되면 삭제 예정.
 * ★ 새 코드는 반드시 useAtomicLookup 훅을 사용하세요.
 */

import type { FMEAWorksheetDB } from '../schema';
import { SCOPE_YP } from '@/lib/fmea/scope-constants';

export function buildLegacyCompat(db: FMEAWorksheetDB, projectL1Name: string) {
  // L1 빌드
  const l1Funcs = db.l1Functions || [];
  const categoryMap = new Map<string, any[]>();
  for (const f of l1Funcs) {
    const cat = f.category || SCOPE_YP;
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(f);
  }

  const types = categoryMap.size > 0
    ? Array.from(categoryMap.entries()).map(([cat, funcs]) => ({
        id: `type-${cat}`,
        name: cat,
        functions: funcs.map(f => ({
          id: f.id,
          name: f.functionName || '',
          requirements: [{ id: `req-${f.id}`, name: f.requirement || '' }],
        })),
      }))
    : [
        { id: 'type-YP', name: 'YP', functions: [{ id: 'func-yp', name: '', requirements: [] }] },
        { id: 'type-SP', name: 'SP', functions: [{ id: 'func-sp', name: '', requirements: [] }] },
        { id: 'type-USER', name: 'USER', functions: [{ id: 'func-user', name: '', requirements: [] }] },
      ];

  const failureScopes = (db.failureEffects || []).map(fe => ({
    id: fe.id,
    category: fe.category || SCOPE_YP,
    effect: fe.effect || '',
    severity: fe.severity || 0,
    l1FuncId: fe.l1FuncId || '',
  }));

  const l1Name = projectL1Name || db.l1Structure?.name || '';
  const l1: any = {
    id: db.l1Structure?.id || 'l1-root',
    name: l1Name,
    types,
    failureScopes,
  };

  // L2 빌드 (중첩 트리)
  const l3sByL2 = new Map<string, any[]>();
  for (const l3 of db.l3Structures || []) {
    if (!l3sByL2.has(l3.l2Id)) l3sByL2.set(l3.l2Id, []);
    l3sByL2.get(l3.l2Id)!.push(l3);
  }

  const l2FuncsByL2 = new Map<string, any[]>();
  for (const f of db.l2Functions || []) {
    if (!l2FuncsByL2.has(f.l2StructId)) l2FuncsByL2.set(f.l2StructId, []);
    l2FuncsByL2.get(f.l2StructId)!.push(f);
  }

  const l3FuncsByL3 = new Map<string, any[]>();
  for (const f of db.l3Functions || []) {
    if (!l3FuncsByL3.has(f.l3StructId)) l3FuncsByL3.set(f.l3StructId, []);
    l3FuncsByL3.get(f.l3StructId)!.push(f);
  }

  const fmsByL2 = new Map<string, any[]>();
  for (const fm of db.failureModes || []) {
    if (!fmsByL2.has(fm.l2StructId)) fmsByL2.set(fm.l2StructId, []);
    fmsByL2.get(fm.l2StructId)!.push(fm);
  }

  const fcsByL2 = new Map<string, any[]>();
  for (const fc of db.failureCauses || []) {
    if (!fcsByL2.has(fc.l2StructId)) fcsByL2.set(fc.l2StructId, []);
    fcsByL2.get(fc.l2StructId)!.push(fc);
  }

  const pcsByL2 = new Map<string, any[]>();
  for (const pc of db.processProductChars || []) {
    if (!pcsByL2.has(pc.l2StructId)) pcsByL2.set(pc.l2StructId, []);
    pcsByL2.get(pc.l2StructId)!.push(pc);
  }

  const l2: any[] = (db.l2Structures || []).map(l2s => {
    const l3s = (l3sByL2.get(l2s.id) || []).map(l3s => {
      const l3Funcs = (l3FuncsByL3.get(l3s.id) || []).map((f: any) => ({
        id: f.id,
        name: f.functionName || '',
        processChars: [{ id: f.id, name: f.processChar || '', specialChar: f.specialChar || '' }],
      }));
      return {
        id: l3s.id,
        m4: l3s.m4 || '',
        name: l3s.name || '',
        order: l3s.order || 0,
        functions: l3Funcs,
        processChars: l3Funcs.flatMap((f: any) => f.processChars),
      };
    });

    const l2Funcs = (l2FuncsByL2.get(l2s.id) || []).map((f: any) => ({
      id: f.id,
      name: f.functionName || '',
      productChar: f.productChar || '',
      specialChar: f.specialChar || '',
    }));

    const fms = (fmsByL2.get(l2s.id) || []).map((fm: any) => ({
      id: fm.id,
      name: fm.mode || '',
      specialChar: fm.specialChar || false,
      l2FuncId: fm.l2FuncId || '',
      productCharId: fm.productCharId || '',
    }));

    const fcs = (fcsByL2.get(l2s.id) || []).map((fc: any) => ({
      id: fc.id,
      name: fc.cause || '',
      processCharId: fc.l3FuncId || fc.processCharId || '',
      l3FuncId: fc.l3FuncId || '',
      l3StructId: fc.l3StructId || '',
      occurrence: fc.occurrence || 0,
    }));

    const pcs = (pcsByL2.get(l2s.id) || []).map((pc: any) => ({
      id: pc.id,
      name: pc.name || '',
      specialChar: pc.specialChar || '',
    }));

    return {
      id: l2s.id,
      no: l2s.no || '',
      name: l2s.name || '',
      order: l2s.order || 0,
      l3: l3s,
      functions: l2Funcs,
      productChars: pcs,
      failureModes: fms,
      failureCauses: fcs,
    };
  });

  // riskData 빌드
  const riskData: Record<string, number | string> = {};
  const riskByLinkId = new Map<string, any>();
  for (const ra of db.riskAnalyses || []) {
    riskByLinkId.set(ra.linkId, ra);
  }

  for (const link of db.failureLinks || []) {
    const ra = riskByLinkId.get(link.id);
    if (!ra) continue;
    const uk = link.id;
    riskData[`risk-${uk}-S`] = ra.severity || 0;
    riskData[`risk-${uk}-O`] = ra.occurrence || 0;
    riskData[`risk-${uk}-D`] = ra.detection || 0;
    if (ra.preventionControl) riskData[`prevention-${uk}`] = ra.preventionControl;
    if (ra.detectionControl) riskData[`detection-${uk}`] = ra.detectionControl;
  }

  // failureLinks 빌드
  const fmMap = new Map<string, any>();
  for (const fm of db.failureModes || []) fmMap.set(fm.id, fm);
  const feMap = new Map<string, any>();
  for (const fe of db.failureEffects || []) feMap.set(fe.id, fe);
  const fcMap = new Map<string, any>();
  for (const fc of db.failureCauses || []) fcMap.set(fc.id, fc);

  const failureLinks = (db.failureLinks || []).map(link => {
    const fm = fmMap.get(link.fmId);
    const fe = feMap.get(link.feId);
    const fc = fcMap.get(link.fcId);
    return {
      id: link.id,
      fmId: link.fmId,
      feId: link.feId,
      fcId: link.fcId,
      fmText: fm?.mode || '',
      feText: fe?.effect || '',
      fcText: fc?.cause || '',
      severity: fe?.severity || 0,
      feCategory: fe?.category || '',
    };
  });

  return { l1, l2, riskData, failureLinks };
}
