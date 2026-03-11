/**
 * @file failure-chain-injector-seq.test.ts
 * @description TDD: failureChainInjector P5 수정 — fmSeq/feSeq/fcSeq 설정 검증
 *
 * P5 문제: FailureLink 저장 시 fmSeq/feSeq/fcSeq가 항상 null
 * 해결: injectFailureChains 에서 링크 생성 후 seq 값을 계산하여 설정
 *
 * seq 정의 (docs/DB중심의_고장연결구축.md):
 *   feSeq: 같은 공정 내 FE 순서 (1-based)
 *   fmSeq: 같은 FE 그룹 내 FM 순서 (1-based)
 *   fcSeq: 같은 FM 그룹 내 FC 순서 (1-based)
 *
 * @created 2026-02-28
 */

import { describe, it, expect } from 'vitest';
import { injectFailureChains } from '@/app/(fmea-core)/pfmea/import/utils/failureChainInjector';
import type { MasterFailureChain } from '@/app/(fmea-core)/pfmea/import/types/masterFailureChain';

// ─── 헬퍼 ───

/**
 * WorksheetState builder — 원자성 DB 사전등록 시뮬레이션
 * ★ 2026-03-01: 자동생성 완전 제거 → state에 FE/FM/FC 사전 등록 필수
 * IMPORT 파이프라인에서 모든 원자성 데이터가 확보되므로 state에 반드시 존재해야 함
 */
let _uid = 0;

interface ProcessDef {
  no: string;
  fms?: string[];         // 고장형태 이름들
  fcs?: { name: string; m4?: string }[];  // 고장원인 이름들
}

function buildState(
  fes: { name: string; scope?: string; severity?: number }[],
  processes: ProcessDef[],
): any {
  return {
    l1: {
      id: 'l1-test',
      name: '완제품',
      types: [],
      failureScopes: fes.map(fe => ({
        id: `fe-${++_uid}`,
        name: fe.name,
        effect: fe.name,
        scope: fe.scope || '',
        severity: fe.severity,
      })),
    },
    l2: processes.map((p, i) => ({
      id: `proc-${++_uid}`,
      no: p.no,
      name: `공정${p.no}`,
      order: i,
      functions: [],
      failureModes: (p.fms || []).map(fm => ({
        id: `fm-${++_uid}`,
        name: fm,
      })),
      failureCauses: (p.fcs || []).map(fc => ({
        id: `fc-${++_uid}`,
        name: fc.name,
        m4: fc.m4,
      })),
      l3: [],
    })),
  };
}

/** MasterFailureChain 생성 */
function chain(
  processNo: string,
  feValue: string,
  fmValue: string,
  fcValue: string,
  opts: {
    m4?: string;
    feScope?: string;
    severity?: number;
    feMergeSpan?: number;
    fmMergeSpan?: number;
    excelRow?: number;
  } = {},
): MasterFailureChain {
  return {
    processNo,
    feValue,
    fmValue,
    fcValue,
    m4: opts.m4,
    feScope: opts.feScope,
    severity: opts.severity,
    feMergeSpan: opts.feMergeSpan,
    fmMergeSpan: opts.fmMergeSpan,
    excelRow: opts.excelRow,
  } as MasterFailureChain;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// P5: seq 필드 설정 검증
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('P5: injectFailureChains — fcSeq (같은 FM 내 FC 순서)', () => {

  it('FM 1개에 FC 3개 → fcSeq = 1, 2, 3', () => {
    const state = buildState(
      [{ name: '상해' }],
      [{ no: '10', fms: ['손가락끼임'], fcs: [{ name: '가이드마모', m4: 'MC' }, { name: '윤활부족', m4: 'MC' }, { name: '작업미숙', m4: 'MN' }] }],
    );
    const chains = [
      chain('10', '상해', '손가락끼임', '가이드마모', { m4: 'MC' }),
      chain('10', '상해', '손가락끼임', '윤활부족', { m4: 'MC' }),
      chain('10', '상해', '손가락끼임', '작업미숙', { m4: 'MN' }),
    ];

    const result = injectFailureChains(state, chains);
    expect(result.injectedCount).toBe(3);

    // 모든 링크가 같은 fmId
    const fmIds = new Set(result.failureLinks.map(l => l.fmId));
    expect(fmIds.size).toBe(1);

    // fcSeq 순서 검증
    expect(result.failureLinks[0].fcSeq).toBe(1);
    expect(result.failureLinks[1].fcSeq).toBe(2);
    expect(result.failureLinks[2].fcSeq).toBe(3);
  });

  it('FM 2개 각각 독립 fcSeq', () => {
    const state = buildState(
      [{ name: '상해' }],
      [{ no: '10', fms: ['손가락끼임', '정렬불량'], fcs: [{ name: '가이드마모' }, { name: '윤활부족' }, { name: '센서오류' }, { name: '지그마모' }] }],
    );
    const chains = [
      chain('10', '상해', '손가락끼임', '가이드마모'),
      chain('10', '상해', '손가락끼임', '윤활부족'),
      chain('10', '상해', '정렬불량', '센서오류'),
      chain('10', '상해', '정렬불량', '지그마모'),
    ];

    const result = injectFailureChains(state, chains);
    expect(result.injectedCount).toBe(4);

    const fm1 = result.failureLinks.filter(l => l.fmText === '손가락끼임');
    expect(fm1[0].fcSeq).toBe(1);
    expect(fm1[1].fcSeq).toBe(2);

    const fm2 = result.failureLinks.filter(l => l.fmText === '정렬불량');
    expect(fm2[0].fcSeq).toBe(1);
    expect(fm2[1].fcSeq).toBe(2);
  });
});

describe('P5: injectFailureChains — fmSeq (같은 FE 내 FM 순서)', () => {

  it('FE 1개에 FM 2개 → fmSeq = 1, 2', () => {
    const state = buildState(
      [{ name: '상해' }],
      [{ no: '10', fms: ['손가락끼임', '정렬불량'], fcs: [{ name: '가이드마모' }, { name: '윤활부족' }, { name: '센서오류' }] }],
    );
    const chains = [
      chain('10', '상해', '손가락끼임', '가이드마모'),
      chain('10', '상해', '손가락끼임', '윤활부족'),
      chain('10', '상해', '정렬불량', '센서오류'),
    ];

    const result = injectFailureChains(state, chains);
    expect(result.injectedCount).toBe(3);

    // FM "손가락끼임" → fmSeq=1
    const fm1Links = result.failureLinks.filter(l => l.fmText === '손가락끼임');
    fm1Links.forEach(l => expect(l.fmSeq).toBe(1));

    // FM "정렬불량" → fmSeq=2
    const fm2Links = result.failureLinks.filter(l => l.fmText === '정렬불량');
    fm2Links.forEach(l => expect(l.fmSeq).toBe(2));
  });
});

describe('P5: injectFailureChains — feSeq (같은 공정 내 FE 순서)', () => {

  it('공정 1개에 FE 2개 → feSeq = 1, 2', () => {
    const state = buildState(
      [{ name: '상해' }, { name: '불량생산' }],
      [{ no: '10', fms: ['손가락끼임', '정렬불량'], fcs: [{ name: '가이드마모' }, { name: '센서오류' }] }],
    );
    const chains = [
      chain('10', '상해', '손가락끼임', '가이드마모'),
      chain('10', '불량생산', '정렬불량', '센서오류'),
    ];

    const result = injectFailureChains(state, chains);
    expect(result.injectedCount).toBe(2);

    const fe1 = result.failureLinks.find(l => l.feText === '상해');
    expect(fe1?.feSeq).toBe(1);

    const fe2 = result.failureLinks.find(l => l.feText === '불량생산');
    expect(fe2?.feSeq).toBe(2);
  });
});

describe('P5: injectFailureChains — 다중 공정 독립 seq', () => {

  it('공정 2개: 각 공정별 seq 독립 카운팅', () => {
    const state = buildState(
      [{ name: '상해' }, { name: '품질불량' }],
      [
        { no: '10', fms: ['손가락끼임'], fcs: [{ name: '가이드마모', m4: 'MC' }, { name: '윤활부족', m4: 'MC' }] },
        { no: '20', fms: ['치수초과'], fcs: [{ name: '금형마모', m4: 'MC' }, { name: '온도편차', m4: 'MC' }] },
      ],
    );
    const chains = [
      chain('10', '상해', '손가락끼임', '가이드마모', { m4: 'MC' }),
      chain('10', '상해', '손가락끼임', '윤활부족', { m4: 'MC' }),
      chain('20', '품질불량', '치수초과', '금형마모', { m4: 'MC' }),
      chain('20', '품질불량', '치수초과', '온도편차', { m4: 'MC' }),
    ];

    const result = injectFailureChains(state, chains);
    expect(result.injectedCount).toBe(4);

    // 공정 10
    const proc10 = result.failureLinks.filter(l => l.fmProcessNo === '10');
    expect(proc10.length).toBe(2);
    proc10.forEach(l => {
      expect(l.feSeq).toBe(1);  // 공정10 첫번째 FE
      expect(l.fmSeq).toBe(1);  // FE 내 첫번째 FM
    });
    expect(proc10[0].fcSeq).toBe(1);
    expect(proc10[1].fcSeq).toBe(2);

    // 공정 20: 독립적으로 seq=1부터
    const proc20 = result.failureLinks.filter(l => l.fmProcessNo === '20');
    expect(proc20.length).toBe(2);
    proc20.forEach(l => {
      expect(l.feSeq).toBe(1);  // 공정20 첫번째 FE
      expect(l.fmSeq).toBe(1);  // FE 내 첫번째 FM
    });
    expect(proc20[0].fcSeq).toBe(1);
    expect(proc20[1].fcSeq).toBe(2);
  });
});

describe('P5: injectFailureChains — path 필드', () => {

  it('fmPath, fePath, fcPath 설정 검증', () => {
    const state = buildState(
      [{ name: '상해', scope: 'YP', severity: 8 }],
      [{ no: '10', fms: ['손가락끼임'], fcs: [{ name: '가이드마모', m4: 'MC' }] }],
    );
    const chains = [
      chain('10', '상해', '손가락끼임', '가이드마모', { m4: 'MC', feScope: 'YP', severity: 8 }),
    ];

    const result = injectFailureChains(state, chains);
    expect(result.injectedCount).toBe(1);

    const link = result.failureLinks[0];

    // fmPath: 공정번호/FM텍스트
    expect(link.fmPath).toBe('10/손가락끼임');

    // fePath: FE scope/FE텍스트 (scope 있을 때)
    expect(link.fePath).toBe('YP/상해');

    // fcPath: 공정번호/4M/FC텍스트
    expect(link.fcPath).toBe('10/MC/가이드마모');
  });

  it('scope 없는 FE → fePath에 scope 생략', () => {
    const state = buildState(
      [{ name: '상해' }],
      [{ no: '10', fms: ['손가락끼임'], fcs: [{ name: '가이드마모', m4: 'MC' }] }],
    );
    const chains = [
      chain('10', '상해', '손가락끼임', '가이드마모', { m4: 'MC' }),
    ];

    const result = injectFailureChains(state, chains);
    const link = result.failureLinks[0];
    expect(link.fePath).toBe('상해');
  });

  it('m4 없는 FC → fcPath에 m4 생략', () => {
    const state = buildState(
      [{ name: '상해' }],
      [{ no: '10', fms: ['손가락끼임'], fcs: [{ name: '가이드마모' }] }],
    );
    const chains = [
      chain('10', '상해', '손가락끼임', '가이드마모'),
    ];

    const result = injectFailureChains(state, chains);
    const link = result.failureLinks[0];
    expect(link.fcPath).toBe('10/가이드마모');
  });
});

describe('P5: docs 완전 시나리오 — seq + path 통합 검증', () => {

  it('docs/DB중심의_고장연결구축.md 1.1 예시', () => {
    const state = buildState(
      [{ name: '상해', scope: 'YP', severity: 8 }],
      [{ no: '10', fms: ['손가락끼임', '정렬불량'], fcs: [
        { name: '가이드마모', m4: 'MC' }, { name: '윤활부족', m4: 'MC' }, { name: '작업미숙', m4: 'MN' },
        { name: '센서오류', m4: 'MC' }, { name: '지그마모', m4: 'MC' },
      ] }],
    );
    const chains = [
      chain('10', '상해', '손가락끼임', '가이드마모', { m4: 'MC', feScope: 'YP', severity: 8, fmMergeSpan: 3, feMergeSpan: 5, excelRow: 2 }),
      chain('10', '상해', '손가락끼임', '윤활부족', { m4: 'MC', severity: 8, fmMergeSpan: 3, feMergeSpan: 5, excelRow: 3 }),
      chain('10', '상해', '손가락끼임', '작업미숙', { m4: 'MN', severity: 8, fmMergeSpan: 3, feMergeSpan: 5, excelRow: 4 }),
      chain('10', '상해', '정렬불량', '센서오류', { m4: 'MC', severity: 7, fmMergeSpan: 2, feMergeSpan: 5, excelRow: 5 }),
      chain('10', '상해', '정렬불량', '지그마모', { m4: 'MC', severity: 7, fmMergeSpan: 2, feMergeSpan: 5, excelRow: 6 }),
    ];

    const result = injectFailureChains(state, chains);
    expect(result.injectedCount).toBe(5);

    const links = result.failureLinks;

    // ── feSeq: 공정10에 FE 1개 → 모두 feSeq=1 ──
    links.forEach(l => expect(l.feSeq).toBe(1));

    // ── fmSeq: "손가락끼임"=1, "정렬불량"=2 ──
    const fm1 = links.filter(l => l.fmText === '손가락끼임');
    expect(fm1.length).toBe(3);
    fm1.forEach(l => expect(l.fmSeq).toBe(1));

    const fm2 = links.filter(l => l.fmText === '정렬불량');
    expect(fm2.length).toBe(2);
    fm2.forEach(l => expect(l.fmSeq).toBe(2));

    // ── fcSeq: FM별 독립 카운팅 ──
    expect(fm1.map(l => l.fcSeq)).toEqual([1, 2, 3]);
    expect(fm2.map(l => l.fcSeq)).toEqual([1, 2]);

    // ── path 검증 ──
    expect(fm1[0].fmPath).toBe('10/손가락끼임');
    expect(fm1[0].fePath).toBe('YP/상해');
    expect(fm1[0].fcPath).toBe('10/MC/가이드마모');
  });
});
