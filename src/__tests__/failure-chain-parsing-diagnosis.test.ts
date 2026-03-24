/**
 * @file failure-chain-parsing-diagnosis.test.ts
 * @description FC(Failure Chain) 파싱 파이프라인 TDD 진단
 *
 * 진단 대상:
 * 1. buildFailureChainsFromFlat() — 카테시안 곱 제거 확인
 * 2. MasterFailureChain 완전성 — fmMergeSpan/feMergeSpan 필드 존재 여부
 * 3. excelRow 기반 행 매칭 정확성
 *
 * docs/DB중심의_고장연결구축.md 참조
 * @created 2026-02-28
 */

import { describe, it, expect } from 'vitest';
import { buildFailureChainsFromFlat } from '@/app/(fmea-core)/pfmea/import/types/masterFailureChain';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';
import type { CrossTab } from '@/app/(fmea-core)/pfmea/import/utils/template-delete-logic';

// ─── 헬퍼: flatData 아이템 생성 ───

let _id = 0;
function flat(
  processNo: string,
  itemCode: string,
  value: string,
  opts: { m4?: string; excelRow?: number; rowSpan?: number; category?: 'A' | 'B' | 'C'; id?: string } = {},
): ImportedFlatData {
  return {
    id: opts.id || `test-${++_id}`,
    processNo,
    category: opts.category || (itemCode.startsWith('A') ? 'A' : itemCode.startsWith('B') ? 'B' : 'C'),
    itemCode,
    value,
    m4: opts.m4,
    excelRow: opts.excelRow,
    rowSpan: opts.rowSpan,
    createdAt: new Date(),
  };
}

function emptyCrossTab(): CrossTab {
  return { aRows: [], bRows: [], cRows: [], total: 0 };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 진단 1: 카테시안 곱 제거 확인
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('진단 1: 카테시안 곱 제거', () => {

  it('같은 공정의 FM 2개 × FC 3개 → 카테시안(6)이 아닌 행기반 매칭', () => {
    // 엑셀 구조:
    // Row 10: FM1 (merged 2 rows) + FC1
    // Row 11:                     + FC2
    // Row 12: FM2 (merged 1 row)  + FC3
    const data: ImportedFlatData[] = [
      flat('10', 'A5', 'FM-손가락끼임', { excelRow: 10, rowSpan: 2 }),
      flat('10', 'A5', 'FM-정렬불량', { excelRow: 12, rowSpan: 1 }),
      flat('10', 'B4', 'FC-가이드마모', { m4: 'MC', excelRow: 10 }),
      flat('10', 'B4', 'FC-윤활부족', { m4: 'MC', excelRow: 11 }),
      flat('10', 'B4', 'FC-센서오류', { m4: 'MC', excelRow: 12 }),
      flat('YP', 'C4', 'FE-상해', { category: 'C' }),
    ];

    const chains = buildFailureChainsFromFlat(data, emptyCrossTab());

    // 카테시안이면 6건 (2 FM × 3 FC), 행기반이면 3건
    expect(chains.length).toBe(3);

    // FM1 → FC1, FC2 (row 10-11)
    const fm1Chains = chains.filter(c => c.fmValue === 'FM-손가락끼임');
    expect(fm1Chains.length).toBe(2);
    expect(fm1Chains.map(c => c.fcValue).sort()).toEqual(['FC-가이드마모', 'FC-윤활부족']);

    // FM2 → FC3 (row 12)
    const fm2Chains = chains.filter(c => c.fmValue === 'FM-정렬불량');
    expect(fm2Chains.length).toBe(1);
    expect(fm2Chains[0].fcValue).toBe('FC-센서오류');
  });

  it('excelRow 없으면 순차 분배 (카테시안 금지)', () => {
    // excelRow 없는 데이터 — fallback 순차 분배
    const data: ImportedFlatData[] = [
      flat('10', 'A5', 'FM-A'),
      flat('10', 'A5', 'FM-B'),
      flat('10', 'B4', 'FC-1', { m4: 'MC' }),
      flat('10', 'B4', 'FC-2', { m4: 'MC' }),
      flat('10', 'B4', 'FC-3', { m4: 'MC' }),
      flat('10', 'B4', 'FC-4', { m4: 'MC' }),
      flat('YP', 'C4', 'FE-기본'),
    ];

    const chains = buildFailureChainsFromFlat(data, emptyCrossTab());

    // 카테시안이면 8건 (2 FM × 4 FC), 순차분배면 4건
    expect(chains.length).toBe(4);

    // FM-A → FC-1, FC-2 (앞 절반)
    const fmAChains = chains.filter(c => c.fmValue === 'FM-A');
    expect(fmAChains.length).toBe(2);

    // FM-B → FC-3, FC-4 (뒷 절반)
    const fmBChains = chains.filter(c => c.fmValue === 'FM-B');
    expect(fmBChains.length).toBe(2);
  });

  it('FM만 있고 FC 없으면 FM 전용 사슬 1개', () => {
    const data: ImportedFlatData[] = [
      flat('10', 'A5', 'FM-단독', { excelRow: 10 }),
      flat('YP', 'C4', 'FE-영향'),
    ];

    const chains = buildFailureChainsFromFlat(data, emptyCrossTab());
    expect(chains.length).toBe(1);
    expect(chains[0].fmValue).toBe('FM-단독');
    expect(chains[0].fcValue).toBe('');
  });

  it('A5 행 번호 역순(파일상 M43>M48)이어도 구간 매칭으로 FC는 행 위치에 맞는 FM에 연결', () => {
    // 엑셀 위→아래: M48 행 100, M43 행 200 (공정번호 아님 — 표시용 이름). FC 한 줄 행 150.
    // 이전 max-row≤fc 로직은 배열 첫 순서·행 혼동 시 M43만 FC를 먹는 경우가 있음.
    const data: ImportedFlatData[] = [
      flat('30', 'A5', 'FM-M43-하단', { excelRow: 200 }),
      flat('30', 'A5', 'FM-M48-상단', { excelRow: 100 }),
      flat('30', 'B4', 'FC-중간행', { m4: 'MC', excelRow: 150 }),
      flat('YP', 'C4', 'FE-글로벌', { category: 'C' }),
    ];
    const chains = buildFailureChainsFromFlat(data, emptyCrossTab());
    // FC 1건(M48) + FC 없는 FM 1건(M43) = 2체인 (이전 max-row 규칙에서는 FC가 M43에만 몰릴 수 있음)
    expect(chains.length).toBe(2);
    const mid = chains.find(c => c.fcValue === 'FC-중간행');
    expect(mid?.fmValue).toBe('FM-M48-상단');
    const m43Only = chains.find(c => c.fmValue === 'FM-M43-하단');
    expect(m43Only?.fcValue).toBe('');
  });

  it('A5 없이 B4만 있는 공정도 체인 1건씩 생성 (FC-only 공정 누락 방지)', () => {
    const b4a = flat('99', 'B4', 'FC-고아공정-1', { m4: 'MC', excelRow: 20 });
    const b4b = flat('99', 'B4', 'FC-고아공정-2', { m4: 'MN', excelRow: 21 });
    const data: ImportedFlatData[] = [
      flat('99', 'A2', '공정명-테스트'),
      flat('99', 'A3', '기능'),
      b4a,
      b4b,
      flat('YP', 'C4', 'FE-글로벌', { category: 'C', excelRow: 1 }),
    ];

    const chains = buildFailureChainsFromFlat(data, emptyCrossTab());
    const p99 = chains.filter(c => normalizeProcessNoLocal(c.processNo) === '99');
    expect(p99.length).toBe(2);
    expect(p99.map(c => c.fcValue).sort()).toEqual(['FC-고아공정-1', 'FC-고아공정-2']);
    expect(p99.every(c => c.fmValue === '')).toBe(true);
    expect(chains.find(c => c.fcValue === 'FC-고아공정-1')?.fcFlatId).toBe(b4a.id);
    expect(chains.find(c => c.fcValue === 'FC-고아공정-2')?.fcFlatId).toBe(b4b.id);
  });
});

/** masterFailureChain.normalizeProcessNo 와 동일 (테스트 전용) */
function normalizeProcessNoLocal(pNo: string | undefined): string {
  if (!pNo) return '';
  let n = pNo.trim();
  n = n.replace(/^(공정|process|proc|p)[\s\-_]*/i, '');
  n = n.replace(/번$/, '');
  n = n.replace(/^0+(?=\d)/, '');
  return n;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 진단 2: rowSpan 추론 정확성
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('진단 2: rowSpan 추론 (FM 간 간격)', () => {

  it('FM 3개 — 간격으로 rowSpan 추론', () => {
    // Row 5: FM1 → Row 10: FM2 → Row 15: FM3
    // FC: row 5,6,7,8,9, 10,11,12,13,14, 15,16
    const data: ImportedFlatData[] = [
      flat('20', 'A5', 'FM-1', { excelRow: 5 }),
      flat('20', 'A5', 'FM-2', { excelRow: 10 }),
      flat('20', 'A5', 'FM-3', { excelRow: 15 }),
      // FM1 영역 (5-9)
      flat('20', 'B4', 'FC-A', { m4: 'MN', excelRow: 5 }),
      flat('20', 'B4', 'FC-B', { m4: 'MN', excelRow: 7 }),
      flat('20', 'B4', 'FC-C', { m4: 'MC', excelRow: 9 }),
      // FM2 영역 (10-14)
      flat('20', 'B4', 'FC-D', { m4: 'MC', excelRow: 10 }),
      flat('20', 'B4', 'FC-E', { m4: 'IM', excelRow: 12 }),
      // FM3 영역 (15-16)
      flat('20', 'B4', 'FC-F', { m4: 'EN', excelRow: 15 }),
      flat('20', 'B4', 'FC-G', { m4: 'EN', excelRow: 16 }),
      // FE
      flat('YP', 'C4', 'FE-테스트'),
    ];

    const chains = buildFailureChainsFromFlat(data, emptyCrossTab());

    // FM1 → FC-A, FC-B, FC-C (rows 5-9)
    const fm1 = chains.filter(c => c.fmValue === 'FM-1');
    expect(fm1.length).toBe(3);
    expect(fm1.map(c => c.fcValue).sort()).toEqual(['FC-A', 'FC-B', 'FC-C']);

    // FM2 → FC-D, FC-E (rows 10-14)
    const fm2 = chains.filter(c => c.fmValue === 'FM-2');
    expect(fm2.length).toBe(2);
    expect(fm2.map(c => c.fcValue).sort()).toEqual(['FC-D', 'FC-E']);

    // FM3 → FC-F, FC-G (rows 15-16)
    const fm3 = chains.filter(c => c.fmValue === 'FM-3');
    expect(fm3.length).toBe(2);
    expect(fm3.map(c => c.fcValue).sort()).toEqual(['FC-F', 'FC-G']);

    // 전체: 카테시안이면 21건(3×7), 행기반이면 7건
    expect(chains.length).toBe(7);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 진단 3: FE 할당 검증
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('진단 3: FE 할당', () => {

  it('FE가 여러 개면 carry-forward (L1 글로벌 — 첫 FE 유지)', () => {
    const data: ImportedFlatData[] = [
      flat('10', 'A5', 'FM-A', { excelRow: 5, rowSpan: 1 }),
      flat('10', 'A5', 'FM-B', { excelRow: 6, rowSpan: 1 }),
      flat('10', 'A5', 'FM-C', { excelRow: 7, rowSpan: 1 }),
      flat('10', 'B4', 'FC-1', { m4: 'MC', excelRow: 5 }),
      flat('10', 'B4', 'FC-2', { m4: 'MC', excelRow: 6 }),
      flat('10', 'B4', 'FC-3', { m4: 'MC', excelRow: 7 }),
      flat('YP', 'C4', 'FE-영향1'),
      flat('SP', 'C4', 'FE-영향2'),
    ];

    const chains = buildFailureChainsFromFlat(data, emptyCrossTab());

    expect(chains.length).toBe(3);

    // ★ 2026-03-14 I-1: carry-forward — 모든 FM이 첫 FE 사용
    // FE는 L1 글로벌 레벨이므로 round-robin이 아닌 carry-forward가 올바름
    const feValues = chains.map(c => c.feValue);
    expect(feValues.every(v => v === feValues[0])).toBe(true);
  });

  it('FE 없으면 빈 문자열로 생성', () => {
    const data: ImportedFlatData[] = [
      flat('10', 'A5', 'FM-단독', { excelRow: 5, rowSpan: 1 }),
      flat('10', 'B4', 'FC-원인', { m4: 'MC', excelRow: 5 }),
    ];

    const chains = buildFailureChainsFromFlat(data, emptyCrossTab());
    expect(chains.length).toBe(1);
    expect(chains[0].feValue).toBe('');
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 진단 4: 보조정보 매칭 (B1~B5)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('진단 4: 보조정보 매칭', () => {

  it('FC의 m4에 맞는 B1~B5 보조정보가 연결됨', () => {
    const data: ImportedFlatData[] = [
      flat('10', 'A3', '도장'),
      flat('10', 'A5', 'FM-도장불량', { excelRow: 5, rowSpan: 2 }),
      flat('10', 'B1', '도장건 조작', { m4: 'MN' }),
      flat('10', 'B2', '적정 도장', { m4: 'MN' }),
      flat('10', 'B4', 'FC-도포미숙', { m4: 'MN', excelRow: 5 }),
      flat('10', 'B1', '도장 로봇', { m4: 'MC' }),
      flat('10', 'B4', 'FC-노즐막힘', { m4: 'MC', excelRow: 6 }),
      flat('YP', 'C4', 'FE-외관불량'),
    ];

    const chains = buildFailureChainsFromFlat(data, emptyCrossTab());

    expect(chains.length).toBe(2);

    // MN FC → MN 작업요소
    const mnChain = chains.find(c => c.fcValue === 'FC-도포미숙');
    expect(mnChain?.m4).toBe('MN');
    expect(mnChain?.workElement).toBe('도장건 조작');

    // MC FC → MC 작업요소
    const mcChain = chains.find(c => c.fcValue === 'FC-노즐막힘');
    expect(mcChain?.m4).toBe('MC');
    expect(mcChain?.workElement).toBe('도장 로봇');
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 진단 5: MasterFailureChain 타입 완전성
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('진단 5: MasterFailureChain 타입 완전성', () => {

  it('MasterFailureChain에 fmMergeSpan/feMergeSpan 필드가 존재함', () => {
    // 타입 수준 검증 — 이 필드들이 없으면 컴파일 에러
    const chain = {
      id: 'test',
      processNo: '10',
      fmValue: 'FM',
      fcValue: 'FC',
      feValue: 'FE',
      fmMergeSpan: 3,  // FM이 3행 병합
      feMergeSpan: 5,  // FE가 5행 병합
      excelRow: 10,
    };
    expect(chain.fmMergeSpan).toBe(3);
    expect(chain.feMergeSpan).toBe(5);
  });

  it('buildFailureChainsFromFlat은 fmMergeSpan 미설정 (parseFCSheet에서만 설정)', () => {
    // buildFailureChainsFromFlat은 flatData 기반이므로 병합셀 정보 없음
    // fmMergeSpan은 parseFCSheet에서만 설정됨 (2026-02-28 P1 해결 완료)
    const data: ImportedFlatData[] = [
      flat('10', 'A5', 'FM-테스트', { excelRow: 5, rowSpan: 3 }),
      flat('10', 'B4', 'FC-원인1', { m4: 'MC', excelRow: 5 }),
      flat('10', 'B4', 'FC-원인2', { m4: 'MC', excelRow: 6 }),
      flat('10', 'B4', 'FC-원인3', { m4: 'MC', excelRow: 7 }),
      flat('YP', 'C4', 'FE-영향'),
    ];

    const chains = buildFailureChainsFromFlat(data, emptyCrossTab());

    // buildFailureChainsFromFlat은 fmMergeSpan을 설정하지 않음 (정상)
    // parseFCSheet에서 ExcelJS 병합셀 감지를 통해 직접 설정함
    chains.forEach(c => {
      expect(c.fmMergeSpan).toBeUndefined();
    });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 진단 6: 다중 공정 격리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('진단 6: 다중 공정 격리', () => {

  it('다른 공정의 FC가 섞이지 않음', () => {
    const data: ImportedFlatData[] = [
      flat('10', 'A5', 'FM-공정10', { excelRow: 5, rowSpan: 1 }),
      flat('10', 'B4', 'FC-공정10원인', { m4: 'MC', excelRow: 5 }),
      flat('20', 'A5', 'FM-공정20', { excelRow: 10, rowSpan: 1 }),
      flat('20', 'B4', 'FC-공정20원인', { m4: 'MN', excelRow: 10 }),
      flat('YP', 'C4', 'FE-공통영향'),
    ];

    const chains = buildFailureChainsFromFlat(data, emptyCrossTab());
    expect(chains.length).toBe(2);

    const proc10 = chains.filter(c => c.processNo === '10');
    expect(proc10.length).toBe(1);
    expect(proc10[0].fmValue).toBe('FM-공정10');
    expect(proc10[0].fcValue).toBe('FC-공정10원인');

    const proc20 = chains.filter(c => c.processNo === '20');
    expect(proc20.length).toBe(1);
    expect(proc20[0].fmValue).toBe('FM-공정20');
    expect(proc20[0].fcValue).toBe('FC-공정20원인');
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 진단 7: L1 C4 블록이 L2 A5보다 위 (MX5 / 통합시트) — feFlatId 필수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('진단 7: L1 위 / L2 아래 레이아웃 (canFeRowLink)', () => {
  it('max(C4행) < min(A5행)여도 FM 행 이하 최근 C4·feFlatId를 체인에 싣는다', () => {
    const c4a = flat('YP', 'C4', 'FE-초기', { category: 'C', excelRow: 5, id: 'flat-c4-5' });
    const c4b = flat('YP', 'C4', 'FE-후속', { category: 'C', excelRow: 12, id: 'flat-c4-12' });
    const data: ImportedFlatData[] = [
      c4a,
      c4b,
      flat('10', 'A5', 'FM-하단', { excelRow: 100 }),
      flat('10', 'B4', 'FC-연결', { m4: 'MC', excelRow: 101 }),
    ];

    const chains = buildFailureChainsFromFlat(data, emptyCrossTab());
    expect(chains.length).toBe(1);
    expect(chains[0].fmValue).toBe('FM-하단');
    expect(chains[0].fcValue).toBe('FC-연결');
    // FM 행 100 이하 최근 C4 = 행 12
    expect(chains[0].feValue).toBe('FE-후속');
    expect(chains[0].feFlatId).toBe('flat-c4-12');
  });
});
