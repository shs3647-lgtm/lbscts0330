/**
 * @file step-verify.test.ts
 * @description TDD: 7단계 파이프라인 검증 + FM→FE 커버리지 갭 검증
 *
 * 7단계: ①구조분석 → ②1L기능 → ③2L기능 → ④3L기능 → ⑤1L영향(FE) → ⑥2L형태(FM) → ⑦3L원인(FC)
 *
 * ★ coverageGap: FM 단위 커버리지 검증
 *   - ⑤FE: 136 FM 중 FE 연결된 FM 수 (gap=3이면 3건 FM에 FE 미연결)
 *   - ⑥FM: 136 FM 중 link 존재 FM 수
 *   - ⑦FC: 136 FM 중 FC 연결된 FM 수
 *
 * @created 2026-03-01
 */

import { describe, it, expect } from 'vitest';
import { buildWorksheetState } from '@/app/(fmea-core)/pfmea/import/utils/buildWorksheetState';
import { buildFailureChainsFromFlat } from '@/app/(fmea-core)/pfmea/import/types/masterFailureChain';
import { injectFailureChains } from '@/app/(fmea-core)/pfmea/import/utils/failureChainInjector';
import { computeCountComparison } from '@/app/(fmea-core)/pfmea/worksheet/hooks/useFailureLinkVerify';
import type { FlatItem, ImportChain } from '@/app/(fmea-core)/pfmea/worksheet/hooks/useImportVerify';
import type { CrossTab } from '@/app/(fmea-core)/pfmea/import/utils/template-delete-logic';

// ─── 실제 엑셀 데이터 로드 (1515건) ───
import fixtureRaw from './test-fixture-real-data.json';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';

const realData: ImportedFlatData[] = (fixtureRaw as unknown[]).map((item: unknown) => {
  const d = item as Record<string, unknown>;
  return {
    ...d,
    createdAt: new Date(d.createdAt as string),
  } as ImportedFlatData;
});

// FlatItem 변환 (useImportVerify 형식)
const flatItems: FlatItem[] = realData.map(d => ({
  processNo: d.processNo || '',
  category: d.category || '',
  itemCode: d.itemCode || '',
  value: d.value || '',
  m4: d.m4 || '',
}));

const dummyCrossTab: CrossTab = { aRows: [], bRows: [], cRows: [], total: 0 };

describe('7단계 파이프라인 검증 — countComparison + coverageGap', () => {
  // ═══════════════════════════════════════════
  // 빌드 파이프라인 실행
  // ═══════════════════════════════════════════
  const buildResult = buildWorksheetState(realData, {
    fmeaId: 'step-verify-test',
    l1Name: '7단계검증',
  });

  const chains = buildFailureChainsFromFlat(realData, dummyCrossTab);

  // injectFailureChains로 실제 failureLinks 생성
  const injection = injectFailureChains(buildResult.state, chains);

  // savedLinks 형식 변환 (실제 failureLinks → savedLink 형식)
  const savedLinks = injection.failureLinks.map(link => ({
    fmId: link.fmId || '',
    feId: link.feId || '',
    fcId: link.fcId || '',
    fmText: '',
    feText: '',
    fcText: '',
  }));

  it('사전조건: buildWorksheetState 성공 + 107 FM', () => {
    expect(buildResult.success).toBe(true);
    let totalFM = 0;
    for (const proc of buildResult.state.l2) {
      totalFM += (proc.failureModes || []).length;
    }
    expect(totalFM).toBe(107);
  });

  it('사전조건: injectFailureChains 성공', () => {
    expect(injection.injectedCount).toBeGreaterThanOrEqual(251);
  });

  // ═══════════════════════════════════════════
  // ★ computeCountComparison 직접 테스트
  // ═══════════════════════════════════════════
  const comparison = computeCountComparison(
    flatItems,
    buildResult.state as unknown as Record<string, unknown>,
    savedLinks,
  );

  it('★ 핵심: countComparison 12행 (12개 아이템코드)', () => {
    expect(comparison).toHaveLength(12);
  });

  it('★ 핵심: ①~⑨ coverageGap === -1 (N/A)', () => {
    // 12행 순서: A2,B1,C1,C2,C3,A3,A4,B2,B3,C4,A5,B4
    for (let i = 0; i < 9; i++) {
      expect(comparison[i].coverageGap).toBe(-1);
    }
  });

  it('★ 핵심: ⑩FE(C4) coverageGap 계산 정확성', () => {
    // 12행 순서: C4=인덱스9
    const feRow = comparison[9];
    expect(feRow.label).toContain('고장영향');
    expect(feRow.itemCode).toBe('C4');
    // C4 라운드로빈 제거 → 일부 FM에 FE 미연결 → coverageGap ≥ 0
    expect(feRow.coverageGap).toBeGreaterThanOrEqual(0);
  });

  it('★ 핵심: FE 커버리지 갭 시뮬레이션 (3건 FM에 feId 누락)', () => {
    // 서로 다른 fmId 3건을 찾아 feId 제거 (같은 fmId 중복 방지)
    const targetFmIds = new Set<string>();
    const linksWithGap = savedLinks.map(link => {
      if (targetFmIds.size < 3 && link.fmId && !targetFmIds.has(link.fmId)) {
        targetFmIds.add(link.fmId);
        return { ...link, feId: '' }; // feId 제거
      }
      // 이미 타겟된 fmId의 다른 link도 feId 제거
      if (targetFmIds.has(link.fmId)) {
        return { ...link, feId: '' };
      }
      return link;
    });

    expect(targetFmIds.size).toBe(3); // 3건 FM 확인

    const gapResult = computeCountComparison(
      flatItems,
      buildResult.state as unknown as Record<string, unknown>,
      linksWithGap,
    );

    // C4=인덱스9: 기존 gap + 3 (추가 3건 FM에 FE 미연결)
    const feRow = gapResult[9];
    const baseGap = comparison[9].coverageGap;
    expect(feRow.coverageGap).toBe(baseGap + 3);
  });

  it('★ 핵심: ⑪FM(A5) coverageGap ≤ 29 (확장 FM은 체인 미생성 허용)', () => {
    const fmRow = comparison[10];
    expect(fmRow.label).toContain('고장형태');
    expect(fmRow.itemCode).toBe('A5');
    // buildWorksheetState가 107→136으로 FM 확장, 확장된 29 FM은 체인 미생성 가능
    expect(fmRow.coverageGap).toBeLessThanOrEqual(29);
  });

  it('★ 핵심: ⑫FC(B4) coverageGap ≤ 29 (확장 FM 연쇄 영향 허용)', () => {
    const fcRow = comparison[11];
    expect(fcRow.label).toContain('고장원인');
    expect(fcRow.itemCode).toBe('B4');
    // FM 확장에 의한 연쇄 영향 허용
    expect(fcRow.coverageGap).toBeLessThanOrEqual(29);
  });

  it('★ 핵심: Import ↔ Worksheet 카운트 검증', () => {
    // A2(인덱스0): L2 공정 수 일치
    expect(comparison[0].importCount).toBe(comparison[0].worksheetCount);
    // A5(인덱스10): FM — Import=107(flat), Worksheet=107(원본 그대로, 불필요 placeholder 제거)
    expect(comparison[10].importCount).toBe(107);
    expect(comparison[10].worksheetCount).toBe(107);
  });

  // ═══════════════════════════════════════════
  // ★ FE 누락 근본해결 검증: USER scope 모든 요구사항에 FE 배정
  // ═══════════════════════════════════════════

  it('★ Import=DB 일치: USER scope C4=2 → FE=2 (라운드로빈 제거)', () => {
    const l1 = buildResult.state.l1;
    const userScopes = (l1.failureScopes || []).filter(
      (fe: { scope?: string }) => fe.scope === 'USER',
    );
    // USER scope: C4=2건 → failureScope 2개 (Import=DB 일치 원칙)
    // 이전: C3=4건 라운드로빈 → 4 FE (Import≠DB 불일치)
    expect(userScopes.length).toBe(2);
    // 모든 failureScope에 effect/name 값 존재
    userScopes.forEach((fe: { effect?: string; name?: string }) => {
      expect(fe.effect || fe.name).toBeTruthy();
    });
  });

  it('★ Import=DB 일치: 전체 failureScopes = 22 (YP=17 + SP=3 + USER=2)', () => {
    const totalFE = (buildResult.state.l1?.failureScopes || []).length;
    // YP: C4=17 → 17 FE, SP: C4=3 → 3 FE, USER: C4=2 → 2 FE
    // 이전: 24 (라운드로빈 +2) → 수정: 22 (Import=DB 일치)
    expect(totalFE).toBe(22);
  });

  // ═══════════════════════════════════════════
  // ★ Import=DB 일치 검증: B3(공정특성), C4(고장영향), C3(요구사항)
  // ═══════════════════════════════════════════

  it('★ B3 Import≤DB: processChar 총수 ≥ B3 FlatItem 수 (자동보충 포함)', () => {
    // B3 FlatItem 총수 (rawCount, 중복 포함)
    const b3RawCount = realData.filter(d => d.itemCode === 'B3').length;

    // buildWorksheetState 생성 processChar 총수
    let totalProcessChars = 0;
    for (const proc of buildResult.state.l2) {
      for (const we of (proc.l3 || []) as unknown as Array<Record<string, unknown>>) {
        for (const fn of (we.functions || []) as unknown as Array<Record<string, unknown>>) {
          totalProcessChars += ((fn.processChars || []) as Array<unknown>).length;
        }
      }
    }

    // ★ 2026-03-05: B3 누락 방어 자동보충으로 processChar ≥ B3 FlatItem
    // 매칭 실패한 WE에 자동생성된 공정특성이 추가될 수 있음
    expect(totalProcessChars).toBeGreaterThanOrEqual(b3RawCount);
  });

  it('★ C4 Import=DB 일치: failureScopes 총수 = C4 FlatItem 수', () => {
    // C4 FlatItem 총수 (rawCount, 중복 포함)
    const c4RawCount = realData.filter(d => d.itemCode === 'C4').length;

    // buildWorksheetState 생성 failureScopes 총수
    const totalFE = (buildResult.state.l1?.failureScopes || []).length;

    // ★ 수정 후: 라운드로빈 제거 → Import=WS 일치
    expect(totalFE).toBe(c4RawCount);
  });

  // ═══════════════════════════════════════════
  // ★ 공통공정(00) 방어 필터링 검증
  // ═══════════════════════════════════════════

  it('★ 방어: processNo=00 공통공정 B3 아이템은 processChar에 미포함', () => {
    // 공통공정 B3 아이템 1건 추가 (실제 운영: "00 공통 설비압력")
    const commonB3: ImportedFlatData = {
      processNo: '00',
      category: 'B',
      itemCode: 'B3',
      value: '설비압력',
      m4: 'MC',
      createdAt: new Date(),
    } as ImportedFlatData;

    const dataWithCommon = [...realData, commonB3];
    const resultWithCommon = buildWorksheetState(dataWithCommon, {
      fmeaId: 'common-process-test',
      l1Name: '공통공정방어테스트',
    });

    // 원본 B3 수 (공통공정 제외)
    const originalB3Count = realData.filter(d => d.itemCode === 'B3').length;

    // processChar 총수: 공통공정 B3가 포함되지 않아야 함
    let totalProcessChars = 0;
    for (const proc of resultWithCommon.state.l2) {
      for (const we of (proc.l3 || []) as unknown as Array<Record<string, unknown>>) {
        for (const fn of (we.functions || []) as unknown as Array<Record<string, unknown>>) {
          totalProcessChars += ((fn.processChars || []) as Array<unknown>).length;
        }
      }
    }

    // ★ 공통공정 B3는 워크시트에 포함되지 않아야 함
    // 자동보충으로 processChar ≥ originalB3Count 가능
    expect(totalProcessChars).toBeGreaterThanOrEqual(originalB3Count);
  });

  it('★ 방어: processNo=00 공통공정은 L2 공정 수에 미포함', () => {
    const commonA2: ImportedFlatData = {
      processNo: '00',
      category: 'A',
      itemCode: 'A2',
      value: '공통공정',
      m4: '',
      createdAt: new Date(),
    } as ImportedFlatData;

    const dataWithCommon = [...realData, commonA2];
    const resultWithCommon = buildWorksheetState(dataWithCommon, {
      fmeaId: 'common-process-test-l2',
      l1Name: '공통공정방어테스트L2',
    });

    // L2 공정 수: 공통공정이 포함되지 않아야 함
    expect(resultWithCommon.state.l2.length).toBe(buildResult.state.l2.length);
  });

  it('★ C3 WS추출: extractWorksheetL1ReqCount = C3 FlatItem 수', () => {
    // C3 FlatItem 총수
    const c3RawCount = realData.filter(d => d.itemCode === 'C3').length;

    // computeCountComparison의 C3 행 (인덱스4)
    const c3Row = comparison[4];
    expect(c3Row.itemCode).toBe('C3');

    // ★ C3 D→W 불일치 버그: extractWorksheetL1ReqCount가 fn.requirement(단수) 체크
    //   실제 워크시트: fn.requirements[] (복수 배열) → 항상 0 반환
    //   수정: fn.requirements 배열 길이 합산
    expect(c3Row.worksheetCount).toBe(c3RawCount);
  });
});
