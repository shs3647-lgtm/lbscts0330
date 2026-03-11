/**
 * @file failure-link-pipeline.test.ts
 * @description FailureLink 생성 파이프라인 TDD 검증
 *
 * 검증 대상:
 * 1. failureChainInjector.injectFailureChains() — 체인→링크 변환
 * 2. useLinkData FC 추출 로직 — FC가 올바르게 추출되는지
 * 3. linkStats 계산 — FM/FE/FC 누락 카운트 정확성
 *
 * @created 2026-02-23
 */

import { injectFailureChains } from '@/app/(fmea-core)/pfmea/import/utils/failureChainInjector';
import type { MasterFailureChain } from '@/app/(fmea-core)/pfmea/import/types/masterFailureChain';
import { buildFailureChainsFromFlat } from '@/app/(fmea-core)/pfmea/import/types/masterFailureChain';
import type {
  WorksheetState,
  L1FailureScope,
  L2FailureMode,
  L3FailureCauseExtended,
  Process,
  WorkElement,
} from '@/app/(fmea-core)/pfmea/worksheet/constants';

// ─── 테스트 헬퍼: WorksheetState 빌더 ───

let _uidCounter = 0;
function testUid(): string {
  return `test_${++_uidCounter}`;
}

function makeProcess(no: string, name: string, opts: {
  failureModes?: L2FailureMode[];
  failureCauses?: L3FailureCauseExtended[];
  l3?: WorkElement[];
  functions?: any[];
} = {}): Process {
  return {
    id: testUid(),
    no,
    name,
    order: parseInt(no, 10) || 0,
    l3: opts.l3 || [],
    functions: opts.functions || [],
    failureModes: opts.failureModes || [],
    failureCauses: opts.failureCauses || [],
  };
}

function makeFM(name: string, processCharId?: string): L2FailureMode {
  return { id: testUid(), name, productCharId: processCharId };
}

function makeFC(name: string, processCharId?: string): L3FailureCauseExtended {
  return { id: testUid(), name, processCharId };
}

function makeFE(effect: string, scope?: string, severity?: number): L1FailureScope {
  return { id: testUid(), name: effect, effect, scope: scope || 'YP', severity };
}

function makeWorkElement(name: string, m4: string, opts: {
  functions?: any[];
  failureCauses?: any[];
} = {}): WorkElement {
  return {
    id: testUid(),
    m4,
    name,
    order: 0,
    functions: opts.functions || [],
    failureCauses: opts.failureCauses || [],
  };
}

function makeState(opts: {
  failureScopes?: L1FailureScope[];
  processes?: Process[];
} = {}): WorksheetState {
  return {
    l1: {
      id: testUid(),
      name: '완제품',
      types: [],
      failureScopes: opts.failureScopes || [],
    },
    l2: opts.processes || [],
    selected: { type: 'L1', id: null },
    tab: 'structure',
    levelView: 'all',
    search: '',
    visibleSteps: [2, 3, 4, 5, 6],
  };
}

function makeChain(overrides: Partial<MasterFailureChain> = {}): MasterFailureChain {
  return {
    id: 'chain-' + testUid(),
    processNo: '10',
    fmValue: '미조립',
    fcValue: '토크 부족',
    feValue: '안전 위험',
    ...overrides,
  };
}

// ─── useLinkData FC 추출 로직을 순수 함수로 추출하여 테스트 ───

/**
 * useLinkData.ts의 FC 추출 로직을 재현한 순수 함수
 * (React hook 의존성 없이 테스트 가능)
 */
function extractFCData(state: WorksheetState): { id: string; processName: string; m4: string; workElem: string; text: string }[] {
  const items: { id: string; processName: string; m4: string; workElem: string; text: string }[] = [];
  const seen = new Set<string>();

  const isMeaningful = (name: string): boolean => {
    if (!name || name.trim() === '') return false;
    const placeholders = ['클릭', '선택', '입력', '필요', '기능분석에서'];
    return !placeholders.some(p => name.includes(p));
  };

  const processes = (state.l2 || []).filter((p) => p.name && !p.name.includes('클릭'));

  processes.forEach((proc) => {
    const allCauses = proc.failureCauses || [];
    const workElements = (proc.l3 || []).filter((we) => we.name && !we.name.includes('클릭'));

    // PRIMARY: processCharId 기반 매칭
    workElements.forEach((we) => {
      const weName = we.name || '';
      const m4 = we.m4 || '';

      const functions = we.functions || [];
      const allProcessChars: any[] = [];

      functions.forEach((f: any) => {
        if (!isMeaningful(f.name)) return;
        (f.processChars || []).forEach((pc: any) => {
          if (!isMeaningful(pc.name)) return;
          allProcessChars.push({ ...pc, funcName: f.name });
        });
      });

      allProcessChars.forEach((pc: any) => {
        const linkedCauses = allCauses.filter((c: any) => c.processCharId === pc.id);
        linkedCauses.forEach((fc: any) => {
          if (!isMeaningful(fc.name)) return;
          const key = `${proc.name}|${weName}|${fc.name}`;
          if (seen.has(key)) return;
          seen.add(key);
          items.push({
            id: fc.id,
            processName: proc.name,
            m4,
            workElem: weName,
            text: fc.name,
          });
        });
      });
    });

    // FALLBACK: we.failureCauses (L3 level)
    workElements.forEach((we) => {
      const weName = we.name || '';
      const m4 = we.m4 || '';

      (we.failureCauses || []).forEach((fc: any) => {
        if (!isMeaningful(fc.name)) return;
        const key = `${proc.name}|${weName}|${fc.name}`;
        if (seen.has(key)) return;
        seen.add(key);
        items.push({
          id: fc.id,
          processName: proc.name,
          m4,
          workElem: weName,
          text: fc.name,
        });
      });
    });

    // ★ processCharId 없는 L2 레벨 FC (failureChainInjector 자동 생성 FC 포함)
    allCauses.forEach((fc: any) => {
      if (!isMeaningful(fc.name)) return;
      if (fc.processCharId) return; // 이미 primary path에서 처리됨
      const fcM4 = fc.m4 || '';
      const matchedWe = fcM4
        ? workElements.find((we) => (we.m4 || '') === fcM4)
        : undefined;
      const weName = matchedWe?.name || (workElements[0]?.name || '');
      const m4 = matchedWe?.m4 || fcM4 || (workElements[0]?.m4 || '');

      const key = `${proc.name}|${weName}|${fc.name}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({
        id: fc.id,
        processName: proc.name,
        m4,
        workElem: weName,
        text: fc.name,
      });
    });
  });

  return items;
}

/**
 * linkStats 계산 로직을 재현한 순수 함수
 */
function calculateLinkStats(
  savedLinks: { fmId: string; feId: string; fcId: string }[],
  fmData: { id: string }[],
  feData: { id: string }[],
  fcData: { id: string }[],
) {
  const feLinkedIds = new Set<string>();
  const fcLinkedIds = new Set<string>();
  const fmLinkCounts = new Map<string, { feCount: number; fcCount: number }>();

  savedLinks.forEach(link => {
    if (link.feId && link.feId.trim() !== '') feLinkedIds.add(link.feId);
    if (link.fcId && link.fcId.trim() !== '') fcLinkedIds.add(link.fcId);

    if (!fmLinkCounts.has(link.fmId)) {
      fmLinkCounts.set(link.fmId, { feCount: 0, fcCount: 0 });
    }
    const counts = fmLinkCounts.get(link.fmId)!;
    if (link.feId && link.feId.trim() !== '') counts.feCount++;
    if (link.fcId && link.fcId.trim() !== '') counts.fcCount++;
  });

  const feLinkedCount = feData.filter(fe => feLinkedIds.has(fe.id)).length;
  const fcLinkedCount = fcData.filter(fc => fcLinkedIds.has(fc.id)).length;
  const fmLinkedCount = fmData.filter(fm => {
    const counts = fmLinkCounts.get(fm.id);
    return counts && counts.feCount > 0 && counts.fcCount > 0;
  }).length;

  return {
    fmLinkedCount,
    fmMissingCount: fmData.length - fmLinkedCount,
    feLinkedCount,
    feMissingCount: feData.length - feLinkedCount,
    fcLinkedCount,
    fcMissingCount: fcData.length - fcLinkedCount,
  };
}

// ═══════════════════════════════════════════════
// 테스트 시작
// ═══════════════════════════════════════════════

describe('FailureLink 파이프라인 TDD', () => {
  beforeEach(() => {
    _uidCounter = 0;
  });

  // ── 1. injectFailureChains 기본 동작 ──

  describe('1. injectFailureChains — 체인→링크 변환', () => {
    it('1.1 기존 FE+FM+FC 모두 매칭 → 링크 생성', () => {
      const fe1 = makeFE('안전 위험', 'YP', 8);
      const fm1 = makeFM('미조립');
      const fc1 = makeFC('토크 부족');

      const state = makeState({
        failureScopes: [fe1],
        processes: [makeProcess('10', '조립', {
          failureModes: [fm1],
          failureCauses: [fc1],
        })],
      });

      const chains = [makeChain({
        processNo: '10',
        fmValue: '미조립',
        fcValue: '토크 부족',
        feValue: '안전 위험',
      })];

      const result = injectFailureChains(state, chains);

      expect(result.injectedCount).toBe(1);
      expect(result.skippedCount).toBe(0);
      expect(result.failureLinks).toHaveLength(1);
      expect(result.failureLinks[0].fmId).toBe(fm1.id);
      expect(result.failureLinks[0].feId).toBe(fe1.id);
      expect(result.failureLinks[0].fcId).toBe(fc1.id);
    });

    it('1.2 공정번호 불일치 → 스킵 (누락은 IMPORT/분석단계에서 검증)', () => {
      // ★ 공정번호가 state에 없으면 스킵해야 함
      // IMPORT 검증 + 구조분석~고장연결에서 모든 공정이 확보되므로
      // 여기서 누락이 발생하면 상위 검증이 불완전한 것 → 자동생성하면 안 됨
      const state = makeState({
        failureScopes: [makeFE('안전 위험')],
        processes: [makeProcess('10', '조립', {
          failureModes: [makeFM('미조립')],
          failureCauses: [makeFC('토크 부족')],
        })],
      });

      const chains = [makeChain({ processNo: '99' })]; // 없는 공정번호

      const result = injectFailureChains(state, chains);

      // 공정번호 불일치 → 스킵 (자동생성 금지)
      expect(result.injectedCount).toBe(0);
      expect(result.skippedCount).toBe(1);
    });

    it('1.3 빈 체인 배열 → 빈 결과', () => {
      const state = makeState();
      const result = injectFailureChains(state, []);
      expect(result.injectedCount).toBe(0);
      expect(result.failureLinks).toHaveLength(0);
    });

    it('1.4 다수 체인 → 각각 독립 링크 생성', () => {
      const fe1 = makeFE('기능 손실', 'YP', 9);
      const fe2 = makeFE('외관 불량', 'SP', 5);
      const fm1 = makeFM('미접착');
      const fm2 = makeFM('변형');
      const fc1 = makeFC('온도 초과');
      const fc2 = makeFC('압력 부족');

      const state = makeState({
        failureScopes: [fe1, fe2],
        processes: [
          makeProcess('10', '접착', {
            failureModes: [fm1],
            failureCauses: [fc1],
          }),
          makeProcess('20', '프레스', {
            failureModes: [fm2],
            failureCauses: [fc2],
          }),
        ],
      });

      const chains = [
        makeChain({ processNo: '10', fmValue: '미접착', fcValue: '온도 초과', feValue: '기능 손실' }),
        makeChain({ processNo: '20', fmValue: '변형', fcValue: '압력 부족', feValue: '외관 불량' }),
      ];

      const result = injectFailureChains(state, chains);

      expect(result.injectedCount).toBe(2);
      expect(result.failureLinks).toHaveLength(2);
      expect(result.failureLinks[0].fmId).toBe(fm1.id);
      expect(result.failureLinks[1].fmId).toBe(fm2.id);
    });

    it('1.5 SOD + AP → riskData 생성', () => {
      const state = makeState({
        failureScopes: [makeFE('안전 위험', 'YP', 8)],
        processes: [makeProcess('10', '조립', {
          failureModes: [makeFM('미조립')],
          failureCauses: [makeFC('토크 부족')],
        })],
      });

      const chains = [makeChain({
        processNo: '10',
        fmValue: '미조립',
        fcValue: '토크 부족',
        feValue: '안전 위험',
        severity: 8,
        occurrence: 4,
        detection: 6,
        ap: 'M',
      })];

      const result = injectFailureChains(state, chains);

      expect(result.injectedCount).toBe(1);
      // riskData 키 형식: risk-{fmId}-{fcId}-S/O/D (워크시트 표준 형식)
      const link = result.failureLinks[0];
      const uniqueKey = `${link.fmId}-${link.fcId}`;
      expect(result.riskData[`risk-${uniqueKey}-S`]).toBe(8);
      expect(result.riskData[`risk-${uniqueKey}-O`]).toBe(4);
      expect(result.riskData[`risk-${uniqueKey}-D`]).toBe(6);
    });
  });

  // ── 2. injectFailureChains — 매칭 실패 시 스킵 (원자성 DB 매칭만) ──

  describe('2. injectFailureChains — 매칭 실패 시 스킵 (자동생성 제거)', () => {
    it('2.1 FM 없음 → 스킵 (IMPORT/분석단계에서 확보 필요)', () => {
      const fe1 = makeFE('안전 위험');
      const fc1 = makeFC('토크 부족');

      const state = makeState({
        failureScopes: [fe1],
        processes: [makeProcess('10', '조립', {
          failureModes: [], // FM 없음 → 매칭 실패
          failureCauses: [fc1],
        })],
      });

      const chains = [makeChain({
        processNo: '10',
        fmValue: '미조립',
        fcValue: '토크 부족',
        feValue: '안전 위험',
      })];

      const result = injectFailureChains(state, chains);

      // FM 미매칭 → 스킵 (3개 모두 매칭해야 링크 생성)
      expect(result.injectedCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(result.autoCreated.fm).toBe(0);
    });

    it('2.2 FC 없음 → 스킵 (IMPORT/분석단계에서 확보 필요)', () => {
      const fe1 = makeFE('안전 위험');
      const fm1 = makeFM('미조립');

      const state = makeState({
        failureScopes: [fe1],
        processes: [makeProcess('10', '조립', {
          failureModes: [fm1],
          failureCauses: [], // FC 없음 → 매칭 실패
        })],
      });

      const chains = [makeChain({
        processNo: '10',
        fmValue: '미조립',
        fcValue: '토크 부족',
        feValue: '안전 위험',
        m4: 'MC',
      })];

      const result = injectFailureChains(state, chains);

      // FC 미매칭 → 스킵
      expect(result.injectedCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(result.autoCreated.fc).toBe(0);
    });

    it('2.3 FE 없음 → 스킵 (IMPORT/분석단계에서 확보 필요)', () => {
      const fm1 = makeFM('미조립');
      const fc1 = makeFC('토크 부족');

      const state = makeState({
        failureScopes: [], // FE 없음 → 매칭 실패
        processes: [makeProcess('10', '조립', {
          failureModes: [fm1],
          failureCauses: [fc1],
        })],
      });

      const chains = [makeChain({
        processNo: '10',
        fmValue: '미조립',
        fcValue: '토크 부족',
        feValue: '안전 위험',
      })];

      const result = injectFailureChains(state, chains);

      // FE 미매칭 → 스킵
      expect(result.injectedCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(result.autoCreated.fe).toBe(0);
    });
  });

  // ── 3. useLinkData FC 추출 로직 (핵심 버그 검증) ──

  describe('3. FC 추출 로직 (useLinkData 재현)', () => {
    it('3.1 processCharId가 있는 FC → PRIMARY 경로에서 추출', () => {
      const pcId = testUid();
      const fc = makeFC('토크 부족', pcId);

      const state = makeState({
        processes: [makeProcess('10', '조립', {
          failureCauses: [fc], // L2 레벨, processCharId 있음
          l3: [makeWorkElement('볼트 체결', 'MC', {
            functions: [{
              id: testUid(),
              name: '조임',
              processChars: [{ id: pcId, name: '조임토크' }],
            }],
          })],
        })],
      });

      const extracted = extractFCData(state);

      expect(extracted).toHaveLength(1);
      expect(extracted[0].id).toBe(fc.id);
      expect(extracted[0].text).toBe('토크 부족');
    });

    it('3.2 we.failureCauses (L3 레벨) → FALLBACK 경로에서 추출', () => {
      const fc = { id: testUid(), name: '진동 과다', occurrence: 3 };

      const state = makeState({
        processes: [makeProcess('10', '조립', {
          l3: [makeWorkElement('진동 검사', 'MC', {
            failureCauses: [fc], // L3 레벨 (fallback)
          })],
        })],
      });

      const extracted = extractFCData(state);

      expect(extracted).toHaveLength(1);
      expect(extracted[0].id).toBe(fc.id);
      expect(extracted[0].text).toBe('진동 과다');
    });

    it('3.3 ★ FIXED: processCharId 없는 L2 FC → 새 경로에서 추출됨', () => {
      // failureChainInjector가 자동 생성한 FC는 processCharId가 없고,
      // proc.failureCauses에 추가됨 (L2 레벨).
      // ★ 수정 후: 3번째 경로(processCharId 없는 allCauses)에서 추출됨
      const fc = makeFC('자동생성된 원인'); // processCharId = undefined

      const state = makeState({
        processes: [makeProcess('10', '조립', {
          failureCauses: [fc], // L2 레벨, processCharId 없음
          l3: [makeWorkElement('작업1', 'MN', {
            functions: [{
              id: testUid(),
              name: '기능1',
              processChars: [{ id: testUid(), name: '특성1' }],
            }],
          })],
        })],
      });

      const extracted = extractFCData(state);

      // ★ 수정 후: processCharId 없는 FC도 추출됨
      expect(extracted).toHaveLength(1);
      expect(extracted[0].id).toBe(fc.id);
      expect(extracted[0].text).toBe('자동생성된 원인');
    });

    it('3.4 ★ FIX 검증: processCharId 없는 L2 FC도 추출되어야 함', () => {
      // 이 테스트는 수정 후 PASS가 되어야 함
      const fc = makeFC('자동생성된 원인'); // processCharId = undefined

      const state = makeState({
        processes: [makeProcess('10', '조립', {
          failureCauses: [fc], // L2 레벨, processCharId 없음
          l3: [makeWorkElement('작업1', 'MN', {
            functions: [{
              id: testUid(),
              name: '기능1',
              processChars: [{ id: testUid(), name: '특성1' }],
            }],
          })],
        })],
      });

      const extracted = extractFCData(state);

      // ★ 수정 후: processCharId 없는 FC도 추출되어야 함
      // 현재 이 테스트는 FAIL (0 !== 1)
      expect(extracted).toHaveLength(1);
      expect(extracted[0].id).toBe(fc.id);
      expect(extracted[0].text).toBe('자동생성된 원인');
    });
  });

  // ── 4. linkStats 계산 로직 ──

  describe('4. linkStats — FM/FE/FC 누락 카운트', () => {
    it('4.1 모든 FM에 FE+FC 연결 → 누락 0', () => {
      const fmData = [{ id: 'fm1' }, { id: 'fm2' }];
      const feData = [{ id: 'fe1' }];
      const fcData = [{ id: 'fc1' }, { id: 'fc2' }];
      const links = [
        { fmId: 'fm1', feId: 'fe1', fcId: 'fc1' },
        { fmId: 'fm2', feId: 'fe1', fcId: 'fc2' },
      ];

      const stats = calculateLinkStats(links, fmData, feData, fcData);

      expect(stats.fmMissingCount).toBe(0);
      expect(stats.fmLinkedCount).toBe(2);
    });

    it('4.2 FM에 FE만 있고 FC 없음 → FM 누락', () => {
      const fmData = [{ id: 'fm1' }];
      const feData = [{ id: 'fe1' }];
      const fcData = [{ id: 'fc1' }];
      const links = [
        { fmId: 'fm1', feId: 'fe1', fcId: '' }, // FC 없음
      ];

      const stats = calculateLinkStats(links, fmData, feData, fcData);

      expect(stats.fmMissingCount).toBe(1); // FE+FC 둘 다 필요
      expect(stats.fcMissingCount).toBe(1); // fc1은 미연결
    });

    it('4.3 FM에 FC만 있고 FE 없음 → FM 누락', () => {
      const fmData = [{ id: 'fm1' }];
      const feData = [{ id: 'fe1' }];
      const fcData = [{ id: 'fc1' }];
      const links = [
        { fmId: 'fm1', feId: '', fcId: 'fc1' }, // FE 없음
      ];

      const stats = calculateLinkStats(links, fmData, feData, fcData);

      expect(stats.fmMissingCount).toBe(1); // FE+FC 둘 다 필요
      expect(stats.feMissingCount).toBe(1); // fe1은 미연결
    });

    it('4.4 savedLinks가 없는 FM → 누락', () => {
      const fmData = [{ id: 'fm1' }, { id: 'fm2' }, { id: 'fm3' }];
      const feData = [{ id: 'fe1' }];
      const fcData = [{ id: 'fc1' }];
      const links = [
        { fmId: 'fm1', feId: 'fe1', fcId: 'fc1' }, // fm1만 연결
      ];

      const stats = calculateLinkStats(links, fmData, feData, fcData);

      expect(stats.fmLinkedCount).toBe(1);
      expect(stats.fmMissingCount).toBe(2); // fm2, fm3 누락
    });

    it('4.5 링크에 있지만 fcData에 없는 FC → fcLinkedCount에 미포함', () => {
      // failureChainInjector가 자동 생성한 FC가 useLinkData에서 추출 안 되면
      // fcData에 없으므로 fcLinkedCount에서 빠짐
      const fmData = [{ id: 'fm1' }];
      const feData = [{ id: 'fe1' }];
      const fcData: { id: string }[] = []; // FC가 fcData에 없음!
      const links = [
        { fmId: 'fm1', feId: 'fe1', fcId: 'ghost_fc' }, // 유령 FC
      ];

      const stats = calculateLinkStats(links, fmData, feData, fcData);

      // FM은 linkStats 기준으로 "연결됨" (feId+fcId 모두 있으므로)
      expect(stats.fmLinkedCount).toBe(1);
      // FC는 fcData에 없으므로 fcLinkedCount=0
      expect(stats.fcLinkedCount).toBe(0);
      expect(stats.fcMissingCount).toBe(0); // fcData 자체가 비어있으므로
    });
  });

  // ── 5. 통합 시나리오: injectFailureChains → linkStats ──

  describe('5. 통합: 체인 주입 → 누락 카운트', () => {
    it('5.1 모든 FM에 대한 체인이 있으면 누락 0', () => {
      const fe1 = makeFE('안전 위험', 'YP', 8);
      const fm1 = makeFM('미조립');
      const fm2 = makeFM('변형');
      const fc1 = makeFC('토크 부족');
      const fc2 = makeFC('과압');

      const state = makeState({
        failureScopes: [fe1],
        processes: [makeProcess('10', '조립', {
          failureModes: [fm1, fm2],
          failureCauses: [fc1, fc2],
        })],
      });

      const chains = [
        makeChain({ processNo: '10', fmValue: '미조립', fcValue: '토크 부족', feValue: '안전 위험' }),
        makeChain({ processNo: '10', fmValue: '변형', fcValue: '과압', feValue: '안전 위험' }),
      ];

      const result = injectFailureChains(state, chains);

      const fmData = [{ id: fm1.id }, { id: fm2.id }];
      const feData = [{ id: fe1.id }];
      const fcData = [{ id: fc1.id }, { id: fc2.id }];

      const stats = calculateLinkStats(result.failureLinks, fmData, feData, fcData);

      expect(stats.fmMissingCount).toBe(0);
      expect(stats.fmLinkedCount).toBe(2);
    });

    it('5.2 일부 FM에만 체인 → 나머지 FM 누락', () => {
      const fe1 = makeFE('안전 위험');
      const fm1 = makeFM('미조립');
      const fm2 = makeFM('변형');  // 이 FM은 체인에 없음
      const fm3 = makeFM('누락');  // 이 FM도 체인에 없음
      const fc1 = makeFC('토크 부족');

      const state = makeState({
        failureScopes: [fe1],
        processes: [makeProcess('10', '조립', {
          failureModes: [fm1, fm2, fm3],
          failureCauses: [fc1],
        })],
      });

      const chains = [
        makeChain({ processNo: '10', fmValue: '미조립', fcValue: '토크 부족', feValue: '안전 위험' }),
        // fm2, fm3에 대한 체인 없음!
      ];

      const result = injectFailureChains(state, chains);

      const fmData = [{ id: fm1.id }, { id: fm2.id }, { id: fm3.id }];
      const feData = [{ id: fe1.id }];
      const fcData = [{ id: fc1.id }];

      const stats = calculateLinkStats(result.failureLinks, fmData, feData, fcData);

      expect(stats.fmLinkedCount).toBe(1);
      expect(stats.fmMissingCount).toBe(2); // fm2, fm3 누락
    });

    it('5.3 ★ FC 없으면 매칭 실패 → 스킵 (원자성 DB 매칭만)', () => {
      // ★ 2026-03-01: 자동생성 제거 — FC가 state에 없으면 링크 생성 불가
      const fe1 = makeFE('안전 위험');
      const fm1 = makeFM('미조립');

      const state = makeState({
        failureScopes: [fe1],
        processes: [makeProcess('10', '조립', {
          failureModes: [fm1],
          failureCauses: [], // FC 없음 → 매칭 실패 → 스킵
          l3: [makeWorkElement('작업1', 'MN', {
            functions: [{
              id: testUid(),
              name: '기능1',
              processChars: [{ id: testUid(), name: '특성1' }],
            }],
          })],
        })],
      });

      const chains = [makeChain({
        processNo: '10',
        fmValue: '미조립',
        fcValue: '토크 부족',
        feValue: '안전 위험',
        m4: 'MN',
      })];

      const result = injectFailureChains(state, chains);

      // FC 미매칭 → 스킵 (자동생성 없음)
      expect(result.autoCreated.fc).toBe(0);
      expect(result.injectedCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      // state에 FC 추가 안 됨
      expect(state.l2[0].failureCauses!.length).toBe(0);
    });
  });

  // ═══ 6. buildFailureChainsFromFlat fallback ═══
  describe('6. FC_고장사슬 시트 없을 때 fallback 체인 생성', () => {

    it('6.1 flatData에서 FM-FC-FE 체인이 자동 도출되어야 함', () => {
      // ★ buildFailureChainsFromFlat는 flatData 기반 (crossTab은 참조용)
      const flatData: any[] = [
        // A series (공정 10, 20)
        { processNo: '10', category: 'A', itemCode: 'A2', value: '자재입고' },
        { processNo: '10', category: 'A', itemCode: 'A3', value: '자재입고 기능' },
        { processNo: '10', category: 'A', itemCode: 'A4', value: '품번' },
        { processNo: '10', category: 'A', itemCode: 'A5', value: '품번 불일치' },
        { processNo: '10', category: 'A', itemCode: 'A6', value: '외관검사' },
        { processNo: '20', category: 'A', itemCode: 'A2', value: '조립' },
        { processNo: '20', category: 'A', itemCode: 'A3', value: '조립 기능' },
        { processNo: '20', category: 'A', itemCode: 'A4', value: '토크' },
        { processNo: '20', category: 'A', itemCode: 'A5', value: '토크 부족' },
        { processNo: '20', category: 'A', itemCode: 'A6', value: '토크검사' },
        // B series
        { processNo: '10', category: 'B', itemCode: 'B1', value: '운반', m4: 'MN' },
        { processNo: '10', category: 'B', itemCode: 'B2', value: '운반기능', m4: 'MN' },
        { processNo: '10', category: 'B', itemCode: 'B3', value: '운반특성', m4: 'MN' },
        { processNo: '10', category: 'B', itemCode: 'B4', value: '이종자재 투입', m4: 'MN' },
        { processNo: '10', category: 'B', itemCode: 'B5', value: '예방1', m4: 'MN' },
        { processNo: '10', category: 'B', itemCode: 'B1', value: '스캐너', m4: 'MC' },
        { processNo: '10', category: 'B', itemCode: 'B2', value: '스캔기능', m4: 'MC' },
        { processNo: '10', category: 'B', itemCode: 'B3', value: '스캔특성', m4: 'MC' },
        { processNo: '10', category: 'B', itemCode: 'B4', value: '인식율 저하', m4: 'MC' },
        { processNo: '10', category: 'B', itemCode: 'B5', value: '예방2', m4: 'MC' },
        { processNo: '20', category: 'B', itemCode: 'B1', value: '체결', m4: 'MN' },
        { processNo: '20', category: 'B', itemCode: 'B2', value: '체결기능', m4: 'MN' },
        { processNo: '20', category: 'B', itemCode: 'B3', value: '체결특성', m4: 'MN' },
        { processNo: '20', category: 'B', itemCode: 'B4', value: '체결 누락', m4: 'MN' },
        { processNo: '20', category: 'B', itemCode: 'B5', value: '예방3', m4: 'MN' },
        // C series (FE)
        { processNo: 'YP', category: 'C', itemCode: 'C4', value: '라인 재작업' },
        { processNo: 'SP', category: 'C', itemCode: 'C4', value: '고객 반품' },
      ];

      const crossTab = { aRows: [], bRows: [], cRows: [], total: 0 };
      const chains = buildFailureChainsFromFlat(flatData, crossTab);

      // 2 FMs: 품번불일치(2FC), 토크부족(1FC) = 3 chains
      expect(chains.length).toBe(3);

      // 첫 번째: processNo=10, FM=품번 불일치, FC=이종자재 투입, FE=라인 재작업
      expect(chains[0].processNo).toBe('10');
      expect(chains[0].fmValue).toBe('품번 불일치');
      expect(chains[0].fcValue).toBe('이종자재 투입');
      expect(chains[0].feValue).toBe('라인 재작업');

      // 두 번째: 같은 FM, 다른 FC
      expect(chains[1].processNo).toBe('10');
      expect(chains[1].fcValue).toBe('인식율 저하');
    });

    it('6.2 ★ Import 시 failureChains=[] 이면 derived chains가 fallback으로 사용되어야 함', () => {
      // ★ buildFailureChainsFromFlat는 flatData 기반
      const flatData: any[] = [
        { processNo: '10', category: 'A', itemCode: 'A2', value: '자재입고' },
        { processNo: '10', category: 'A', itemCode: 'A5', value: 'FM1' },
        { processNo: '10', category: 'B', itemCode: 'B1', value: 'WE1', m4: 'MN' },
        { processNo: '10', category: 'B', itemCode: 'B4', value: 'FC1', m4: 'MN' },
        { processNo: 'YP', category: 'C', itemCode: 'C4', value: 'FE1' },
      ];

      const crossTab = { aRows: [], bRows: [], cRows: [], total: 0 };

      // FC_고장사슬 시트 없음 → fallback 사용
      const failureChains: MasterFailureChain[] = [];

      const effectiveChains = failureChains.length > 0
        ? failureChains
        : buildFailureChainsFromFlat(flatData, crossTab);

      expect(effectiveChains.length).toBeGreaterThan(0);

      // 이 체인으로 injectFailureChains 호출하면 링크가 생성됨
      const fe1 = makeFE('FE1');
      const fm1 = makeFM('FM1');
      const state = makeState({
        failureScopes: [fe1],
        processes: [makeProcess('10', '자재입고', {
          failureModes: [fm1],
          failureCauses: [],
          l3: [makeWorkElement('WE1', 'MN', {
            failureCauses: [{ id: testUid(), name: 'FC1' } as L3FailureCauseExtended],
          })],
        })],
      });

      const result = injectFailureChains(state, effectiveChains);
      expect(result.injectedCount).toBeGreaterThan(0);
      expect(result.failureLinks.length).toBeGreaterThan(0);
    });
  });
});
