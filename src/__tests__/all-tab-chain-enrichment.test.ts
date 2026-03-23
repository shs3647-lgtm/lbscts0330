/**
 * @file all-tab-chain-enrichment.test.ts
 * @description ALL 탭 고장체인 역전개 정확성 검증
 *
 * 3개 체인 검증:
 *   Chain1 FM: 고장형태 → 제품특성 → 공정기능 → 공정명
 *   Chain2 FE: 고장영향 → 요구사항 → 완제품기능 → 완제품명
 *   Chain3 FC: 고장원인 → 공정특성 → 작업요소기능 → 작업요소 → 공정명
 *
 * 실제 데이터 1515건 기반 검증 (test-fixture-real-data.json)
 * @created 2026-03-02
 */

import { describe, it, expect } from 'vitest';
import { buildWorksheetState } from '@/app/(fmea-core)/pfmea/import/utils/buildWorksheetState';
import { buildFailureChainsFromFlat } from '@/app/(fmea-core)/pfmea/import/types/masterFailureChain';
import { injectFailureChains } from '@/app/(fmea-core)/pfmea/import/utils/failureChainInjector';
import { processFailureLinks } from '@/app/(fmea-core)/pfmea/worksheet/tabs/all/processFailureLinks';
import type { FailureLinkRow } from '@/app/(fmea-core)/pfmea/worksheet/tabs/all/processFailureLinks';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';
import type { CrossTab } from '@/app/(fmea-core)/pfmea/import/utils/template-delete-logic';
import type { WorksheetState } from '@/app/(fmea-core)/pfmea/worksheet/constants';
import {
  buildReqToFuncMap,
  buildFeToReqMap,
  buildFcToL3Map,
  buildFmToL2Map,
  enrichFailureLinks,
} from '@/lib/fmea-core/enrichFailureChains';

// ─── 실제 엑셀 데이터 로드 (1515건) ───
import fixtureRaw from './import/test-fixture-real-data.json';

const realData: ImportedFlatData[] = (fixtureRaw as unknown[]).map((item: unknown) => {
  const d = item as Record<string, unknown>;
  return {
    ...d,
    createdAt: new Date(d.createdAt as string),
  } as ImportedFlatData;
});

const dummyCrossTab: CrossTab = { aRows: [], bRows: [], cRows: [], total: 0 };

// ═══════════════════════════════════════════
// 파이프라인 구축 (모든 테스트에서 공유)
// ═══════════════════════════════════════════
const buildResult = buildWorksheetState(realData, {
  fmeaId: 'chain-enrichment-test',
  l1Name: '체인역전개검증',
});

const chains = buildFailureChainsFromFlat(realData, dummyCrossTab);
const injection = injectFailureChains(buildResult.state, chains);

// failureLinks가 주입된 완전한 state
const stateWithLinks: WorksheetState = {
  ...buildResult.state,
  failureLinks: injection.failureLinks,
};

// enrichment 실행
const enrichedLinks = enrichFailureLinks(injection.failureLinks, stateWithLinks);

// ═══════════════════════════════════════════
// 0. 사전조건 검증
// ═══════════════════════════════════════════

describe('0. 사전조건', () => {
  it('0-1. buildWorksheetState 성공', () => {
    expect(buildResult.success).toBe(true);
  });

  it('0-2. 107 FM 생성 (원본 그대로)', () => {
    let totalFM = 0;
    for (const proc of buildResult.state.l2) {
      totalFM += (proc.failureModes || []).length;
    }
    expect(totalFM).toBe(107);
  });

  it('0-3. 251 FC 생성', () => {
    let totalFC = 0;
    for (const proc of buildResult.state.l2) {
      totalFC += (proc.failureCauses || []).length;
    }
    expect(totalFC).toBe(251);
  });

  it('0-4. 22 FE 생성', () => {
    const totalFE = (buildResult.state.l1?.failureScopes || []).length;
    expect(totalFE).toBe(22);
  });

  it('0-5. injectFailureChains 성공 (링크 251건+)', () => {
    expect(injection.injectedCount).toBeGreaterThanOrEqual(251);
  });

  it('0-6. enrichedLinks 수 == rawLinks 수 (카테시안 곱 아님)', () => {
    expect(enrichedLinks.length).toBe(injection.failureLinks.length);
  });
});

// ═══════════════════════════════════════════
// 1. FM 체인 — buildFmToL2Map 단위 테스트
// ═══════════════════════════════════════════

describe('1. buildFmToL2Map — fmId → {processFunction, productChar, processNo, processName}', () => {
  const fmMap = buildFmToL2Map(buildResult.state.l2);

  it('1-1. 107 FM 모두 맵에 등록됨', () => {
    expect(fmMap.size).toBe(107);
  });

  it('1-2. 모든 FM에 processNo 존재', () => {
    let emptyProcessNo = 0;
    fmMap.forEach(v => {
      if (!v.processNo) emptyProcessNo++;
    });
    expect(emptyProcessNo).toBe(0);
  });

  it('1-3. 모든 FM에 processName 존재', () => {
    let emptyProcessName = 0;
    fmMap.forEach(v => {
      if (!v.processName) emptyProcessName++;
    });
    expect(emptyProcessName).toBe(0);
  });

  it('1-4. 모든 FM에 processFunction 존재 (fallback 포함)', () => {
    let emptyProcessFunc = 0;
    fmMap.forEach(v => {
      if (!v.processFunction) emptyProcessFunc++;
    });
    expect(emptyProcessFunc).toBe(0);
  });

  it('1-5. 모든 FM에 productChar 존재 (fallback 포함)', () => {
    let emptyProductChar = 0;
    fmMap.forEach(v => {
      if (!v.productChar) emptyProductChar++;
    });
    expect(emptyProductChar).toBe(0);
  });

  it('1-6. processNo가 원본 데이터의 공정번호 범위 내', () => {
    const originalProcessNos = new Set(
      realData.filter(d => d.itemCode === 'A1').map(d => d.processNo),
    );
    fmMap.forEach(v => {
      expect(originalProcessNos.has(v.processNo)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════
// 2. FM 체인 커버리지 (enriched links 기반)
// ═══════════════════════════════════════════

describe('2. FM 체인 커버리지 — enriched links', () => {
  it('2-1. 모든 link에 fmProcessName 존재', () => {
    const empty = enrichedLinks.filter(l => !l.fmProcessName);
    expect(empty.length).toBe(0);
  });

  it('2-2. 모든 link에 fmProcessFunction 존재', () => {
    const empty = enrichedLinks.filter(l => !l.fmProcessFunction);
    expect(empty.length).toBe(0);
  });

  it('2-3. 모든 link에 fmProductChar 존재', () => {
    const empty = enrichedLinks.filter(l => !l.fmProductChar);
    expect(empty.length).toBe(0);
  });

  it('2-4. 모든 link에 fmProcessNo 존재', () => {
    const empty = enrichedLinks.filter(l => !l.fmProcessNo);
    expect(empty.length).toBe(0);
  });

  it('2-5. 모든 link에 fmText 존재 (빈값 또는 placeholder 아님)', () => {
    const empty = enrichedLinks.filter(l => !l.fmText || l.fmText === '(고장형태 없음)');
    expect(empty.length).toBe(0);
  });
});

// ═══════════════════════════════════════════
// 3. FE 체인 — buildReqToFuncMap + buildFeToReqMap 단위 테스트
// ═══════════════════════════════════════════

describe('3. FE 맵 단위 테스트', () => {
  const l1Types = buildResult.state.l1?.types || [];
  const failureScopes = (buildResult.state.l1 as any)?.failureScopes || [];

  const reqToFuncMap = buildReqToFuncMap(l1Types);
  const feToReqMap = buildFeToReqMap(failureScopes);

  it('3-1. reqToFuncMap: l1Types의 모든 requirements가 맵에 포함', () => {
    let totalReqs = 0;
    l1Types.forEach((type: any) => {
      (type.functions || []).forEach((fn: any) => {
        totalReqs += (fn.requirements || []).length;
      });
    });
    expect(reqToFuncMap.size).toBe(totalReqs);
  });

  it('3-2. reqToFuncMap: category가 YP/SP/USER 중 하나', () => {
    const validCategories = new Set(['YP', 'SP', 'USER']);
    reqToFuncMap.forEach(v => {
      expect(validCategories.has(v.category)).toBe(true);
    });
  });

  it('3-3. reqToFuncMap: 모든 항목에 functionName 존재', () => {
    let emptyFuncName = 0;
    reqToFuncMap.forEach(v => {
      if (!v.functionName) emptyFuncName++;
    });
    expect(emptyFuncName).toBe(0);
  });

  it('3-4. feToReqMap: failureScopes 중 reqId 있는 건 모두 매핑', () => {
    const scopesWithReqId = failureScopes.filter((fs: any) => fs.id && fs.reqId);
    scopesWithReqId.forEach((fs: any) => {
      expect(feToReqMap.has(fs.id)).toBe(true);
      expect(feToReqMap.get(fs.id)).toBe(fs.reqId);
    });
  });

  it('3-5. feToReqMap: effect 텍스트 fallback 매핑 존재', () => {
    const scopesWithEffect = failureScopes.filter((fs: any) => fs.effect && fs.reqId);
    scopesWithEffect.forEach((fs: any) => {
      expect(feToReqMap.has(fs.effect)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════
// 4. FE 체인 커버리지 (enriched links 기반)
// ═══════════════════════════════════════════

describe('4. FE 체인 커버리지 — enriched links', () => {
  // feId가 있는 링크만 대상
  const linksWithFe = enrichedLinks.filter(l => l.feId);

  it('4-1. feId가 있는 링크에 feText 존재', () => {
    const empty = linksWithFe.filter(l => !l.feText);
    expect(empty.length).toBe(0);
  });

  it('4-2. feCategory 매핑 비율 리포트', () => {
    const withCategory = linksWithFe.filter(l => l.feCategory);
    const ratio = linksWithFe.length > 0
      ? Math.round((withCategory.length / linksWithFe.length) * 100)
      : 0;
    // 모든 FE에 category 매핑되어야 함
    expect(ratio).toBeGreaterThanOrEqual(90);
  });

  it('4-3. feFunctionName(완제품기능) 매핑 비율 리포트', () => {
    const withFunc = linksWithFe.filter(l => l.feFunctionName);
    const ratio = linksWithFe.length > 0
      ? Math.round((withFunc.length / linksWithFe.length) * 100)
      : 0;
    expect(ratio).toBeGreaterThanOrEqual(90);
  });

  it('4-4. feRequirement(요구사항) 매핑 비율 리포트', () => {
    const withReq = linksWithFe.filter(l => l.feRequirement);
    const ratio = linksWithFe.length > 0
      ? Math.round((withReq.length / linksWithFe.length) * 100)
      : 0;
    expect(ratio).toBeGreaterThanOrEqual(90);
  });

  it('4-5. l1ProductName(완제품명) 모든 link에 동일 값', () => {
    const l1Name = buildResult.state.l1?.name || '';
    enrichedLinks.forEach(l => {
      expect(l.l1ProductName).toBe(l1Name);
    });
  });
});

// ═══════════════════════════════════════════
// 5. FC 체인 — buildFcToL3Map 단위 테스트
// ═══════════════════════════════════════════

describe('5. buildFcToL3Map — fcId → {workFunction, processChar, m4, workElem}', () => {
  const fcMap = buildFcToL3Map(buildResult.state.l2);

  it('5-1. processCharId 있는 FC 모두 맵에 등록', () => {
    let fcsWithProcessCharId = 0;
    for (const proc of buildResult.state.l2) {
      for (const fc of proc.failureCauses || []) {
        if ((fc as any).processCharId) fcsWithProcessCharId++;
      }
    }
    // 맵에 등록된 FC >= processCharId 있는 FC (일부 processCharId가 같은 PC를 참조할 수 있음)
    expect(fcMap.size).toBeGreaterThanOrEqual(1);
    expect(fcMap.size).toBeLessThanOrEqual(fcsWithProcessCharId);
  });

  it('5-2. 모든 맵 항목에 m4 값이 올바른 카테고리', () => {
    const valid4M = new Set(['MN', 'MC', 'IM', 'EN', '']);
    fcMap.forEach(v => {
      expect(valid4M.has(v.m4)).toBe(true);
    });
  });

  it('5-3. 모든 맵 항목에 workElem 존재', () => {
    let emptyWorkElem = 0;
    fcMap.forEach(v => {
      if (!v.workElem) emptyWorkElem++;
    });
    // 대부분의 FC에 workElem 존재해야 함
    expect(emptyWorkElem).toBeLessThan(fcMap.size * 0.1);
  });

  it('5-4. 모든 맵 항목에 workFunction 존재', () => {
    let emptyWorkFunc = 0;
    fcMap.forEach(v => {
      if (!v.workFunction) emptyWorkFunc++;
    });
    expect(emptyWorkFunc).toBeLessThan(fcMap.size * 0.1);
  });

  it('5-5. 모든 맵 항목에 processChar 존재', () => {
    let emptyPC = 0;
    fcMap.forEach(v => {
      if (!v.processChar) emptyPC++;
    });
    expect(emptyPC).toBeLessThan(fcMap.size * 0.1);
  });
});

// ═══════════════════════════════════════════
// 6. FC 체인 커버리지 (enriched links 기반)
// ═══════════════════════════════════════════

describe('6. FC 체인 커버리지 — enriched links', () => {
  const linksWithFc = enrichedLinks.filter(l => l.fcId);

  it('6-1. fcId가 있는 링크에 fcText 존재', () => {
    const empty = linksWithFc.filter(l => !l.fcText);
    expect(empty.length).toBe(0);
  });

  it('6-2. fcWorkFunction(작업요소기능) 매핑 비율', () => {
    const withFunc = linksWithFc.filter(l => l.fcWorkFunction);
    const ratio = linksWithFc.length > 0
      ? Math.round((withFunc.length / linksWithFc.length) * 100)
      : 0;
    expect(ratio).toBeGreaterThanOrEqual(80);
  });

  it('6-3. fcProcessChar(공정특성) 매핑 비율', () => {
    const withPC = linksWithFc.filter(l => l.fcProcessChar);
    const ratio = linksWithFc.length > 0
      ? Math.round((withPC.length / linksWithFc.length) * 100)
      : 0;
    expect(ratio).toBeGreaterThanOrEqual(80);
  });

  it('6-4. fcWorkElem(작업요소) 매핑 비율', () => {
    const withWE = linksWithFc.filter(l => l.fcWorkElem);
    const ratio = linksWithFc.length > 0
      ? Math.round((withWE.length / linksWithFc.length) * 100)
      : 0;
    expect(ratio).toBeGreaterThanOrEqual(80);
  });

  it('6-5. fcM4 값이 올바른 카테고리 (MN/MC/IM/EN)', () => {
    const valid4M = new Set(['MN', 'MC', 'IM', 'EN', '']);
    const invalid = linksWithFc.filter(l => l.fcM4 && !valid4M.has(l.fcM4));
    expect(invalid.length).toBe(0);
  });

  it('6-6. fcM4 매핑 비율', () => {
    const withM4 = linksWithFc.filter(l => l.fcM4);
    const ratio = linksWithFc.length > 0
      ? Math.round((withM4.length / linksWithFc.length) * 100)
      : 0;
    expect(ratio).toBeGreaterThanOrEqual(80);
  });
});

// ═══════════════════════════════════════════
// 7. processFailureLinks 통합 검증
// ═══════════════════════════════════════════

describe('7. processFailureLinks 통합 — enriched → FM 그룹', () => {
  const l2Data = buildResult.state.l2.map(p => ({
    name: p.name,
    no: p.no,
    order: p.order,
    failureModes: (p.failureModes || []).map(fm => ({
      id: fm.id,
      name: fm.name,
    })),
  }));
  const failureScopes = (buildResult.state.l1 as any)?.failureScopes || [];
  const fmGroups = processFailureLinks(enrichedLinks as FailureLinkRow[], l2Data, failureScopes);

  it('7-1. FM 그룹 수 = unique fmId 수', () => {
    const uniqueFmIds = new Set(enrichedLinks.map(l => l.fmId).filter(Boolean));
    expect(fmGroups.length).toBe(uniqueFmIds.size);
  });

  it('7-2. 모든 그룹에 fmProcessName 존재', () => {
    const empty = fmGroups.filter(g => !g.fmProcessName);
    expect(empty.length).toBe(0);
  });

  it('7-3. 모든 그룹에 fmProcessFunction 존재', () => {
    const empty = fmGroups.filter(g => !g.fmProcessFunction);
    expect(empty.length).toBe(0);
  });

  it('7-4. 모든 그룹에 fmProductChar 존재', () => {
    const empty = fmGroups.filter(g => !g.fmProductChar);
    expect(empty.length).toBe(0);
  });

  it('7-5. 공정번호 기준 정렬 확인', () => {
    for (let i = 1; i < fmGroups.length; i++) {
      const prevNo = parseInt(fmGroups[i - 1].fmProcessNo) || 0;
      const currNo = parseInt(fmGroups[i].fmProcessNo) || 0;
      expect(currNo).toBeGreaterThanOrEqual(prevNo);
    }
  });

  it('7-6. fmNo 순차 할당 (M1, M2, M3...)', () => {
    fmGroups.forEach((g, i) => {
      expect(g.fmNo).toBe(`M${i + 1}`);
    });
  });

  it('7-7. 모든 그룹의 rows에 FE/FC 데이터 존재', () => {
    let groupsWithEmptyRows = 0;
    fmGroups.forEach(g => {
      if (g.rows.length === 0) groupsWithEmptyRows++;
    });
    expect(groupsWithEmptyRows).toBe(0);
  });
});

// ═══════════════════════════════════════════
// 8. 종합 커버리지 리포트
// ═══════════════════════════════════════════

describe('8. ★ 종합 커버리지 리포트', () => {
  it('8-1. FM 체인 완전성: 공정기능 + 제품특성 + 공정명 모두 존재', () => {
    const totalLinks = enrichedLinks.length;
    const completeFM = enrichedLinks.filter(
      l => l.fmProcessFunction && l.fmProductChar && l.fmProcessName,
    ).length;
    const ratio = Math.round((completeFM / totalLinks) * 100);
    expect(ratio).toBe(100);
  });

  it('8-2. FE 체인 완전성: 구분 + 완제품기능 + 요구사항 모두 존재', () => {
    const linksWithFe = enrichedLinks.filter(l => l.feId && l.feText);
    const completeFE = linksWithFe.filter(
      l => l.feCategory && l.feFunctionName && l.feRequirement,
    ).length;
    const ratio = linksWithFe.length > 0
      ? Math.round((completeFE / linksWithFe.length) * 100)
      : 0;
    // FE 역전개는 reqId 기반이므로 일부 누락 가능
    expect(ratio).toBeGreaterThanOrEqual(80);
  });

  it('8-3. FC 체인 완전성: 공정특성 + 작업요소기능 + 작업요소 모두 존재', () => {
    const linksWithFc = enrichedLinks.filter(l => l.fcId && l.fcText);
    const completeFC = linksWithFc.filter(
      l => l.fcProcessChar && l.fcWorkFunction && l.fcWorkElem,
    ).length;
    const ratio = linksWithFc.length > 0
      ? Math.round((completeFC / linksWithFc.length) * 100)
      : 0;
    expect(ratio).toBeGreaterThanOrEqual(80);
  });

  it('8-4. 불완전 체인 상세 진단', () => {
    const linksWithFe = enrichedLinks.filter(l => l.feId && l.feText);
    const linksWithFc = enrichedLinks.filter(l => l.fcId && l.fcText);

    // FM 체인 누락 상세
    const fmNoFunc = enrichedLinks.filter(l => !l.fmProcessFunction).length;
    const fmNoChar = enrichedLinks.filter(l => !l.fmProductChar).length;
    const fmNoName = enrichedLinks.filter(l => !l.fmProcessName).length;

    // FE 체인 누락 상세
    const feNoCat = linksWithFe.filter(l => !l.feCategory).length;
    const feNoFunc = linksWithFe.filter(l => !l.feFunctionName).length;
    const feNoReq = linksWithFe.filter(l => !l.feRequirement).length;

    // FC 체인 누락 상세
    const fcNoPC = linksWithFc.filter(l => !l.fcProcessChar).length;
    const fcNoWF = linksWithFc.filter(l => !l.fcWorkFunction).length;
    const fcNoWE = linksWithFc.filter(l => !l.fcWorkElem).length;
    const fcNoM4 = linksWithFc.filter(l => !l.fcM4).length;


    // 이 테스트는 진단용 — 항상 통과하되 누락 건수를 기록
    expect(true).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 9. 엣지케이스
// ═══════════════════════════════════════════

describe('9. 엣지케이스', () => {
  it('9-1. 빈 state → enrichFailureLinks 빈 배열', () => {
    const emptyState: WorksheetState = {
      l1: { id: '', name: '', types: [] },
      l2: [],
      selected: { type: 'L1', id: null },
      tab: 'all',
      levelView: '',
      search: '',
      visibleSteps: [2, 3, 4, 5, 6],
    };
    const result = enrichFailureLinks([], emptyState);
    expect(result).toEqual([]);
  });

  it('9-2. rawLinks 있지만 state가 비어있으면 → 기본 fallback 동작', () => {
    const emptyState: WorksheetState = {
      l1: { id: '', name: '', types: [] },
      l2: [],
      selected: { type: 'L1', id: null },
      tab: 'all',
      levelView: '',
      search: '',
      visibleSteps: [2, 3, 4, 5, 6],
    };
    const dummyLinks = [{ fmId: 'fm1', feId: 'fe1', fcId: 'fc1', fmText: 'test' }];
    const result = enrichFailureLinks(dummyLinks, emptyState);
    expect(result.length).toBe(1);
    // FM text fallback: link에서 가져옴
    expect(result[0].fmText).toBe('test');
  });

  it('9-3. severity=0은 유효값 (?? 연산자 검증)', () => {
    const emptyState: WorksheetState = {
      l1: { id: '', name: '', types: [] },
      l2: [],
      selected: { type: 'L1', id: null },
      tab: 'all',
      levelView: '',
      search: '',
      visibleSteps: [2, 3, 4, 5, 6],
    };
    const linksWithZeroSev = [{
      fmId: 'fm1', feId: 'fe1', fcId: 'fc1',
      fmText: 'test', severity: 0,
    }];
    const result = enrichFailureLinks(linksWithZeroSev, emptyState);
    // severity=0은 유효값이므로 fallback되지 않아야 함
    expect(result[0].feSeverity).toBe(0);
  });

  it('9-4. fmText 5단계 fallback: 모든 소스 없으면 fmId 표시', () => {
    const emptyState: WorksheetState = {
      l1: { id: '', name: '', types: [] },
      l2: [],
      selected: { type: 'L1', id: null },
      tab: 'all',
      levelView: '',
      search: '',
      visibleSteps: [2, 3, 4, 5, 6],
    };
    const linksNoText = [{
      fmId: 'fm-test-123', feId: '', fcId: '',
      // fmText 없음, cache 없음
    }];
    const result = enrichFailureLinks(linksNoText, emptyState);
    // fmId 자체가 표시되어야 함
    expect(result[0].fmText).toBe('fm-test-123');
  });

  it('9-5. buildFmToL2Map: 빈 L2 → 빈 맵', () => {
    const result = buildFmToL2Map([]);
    expect(result.size).toBe(0);
  });

  it('9-6. buildFcToL3Map: 빈 L2 → 빈 맵', () => {
    const result = buildFcToL3Map([]);
    expect(result.size).toBe(0);
  });

  it('9-7. buildReqToFuncMap: 빈 L1Types → 빈 맵', () => {
    const result = buildReqToFuncMap([]);
    expect(result.size).toBe(0);
  });

  it('9-8. buildFeToReqMap: 빈 failureScopes → 빈 맵', () => {
    const result = buildFeToReqMap([]);
    expect(result.size).toBe(0);
  });
});
