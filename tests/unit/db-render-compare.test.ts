/**
 * DB ↔ 렌더링 비교 로직 단위 테스트
 *
 * compareDbVsRender, extractRenderCounts 함수의 정확성을 검증한다.
 */
import { describe, it, expect } from 'vitest';
import {
  compareDbVsRender,
  extractRenderCounts,
  renderCompareHtml,
} from '@/lib/fmea-core/db-render-compare';

describe('compareDbVsRender', () => {
  it('모든 카운트 일치 시 hasMismatch=false', () => {
    const db = { l2: 21, l3: 91, l2Func: 26, l3Func: 101, fm: 26, fe: 20, fc: 104, fl: 111, ra: 111, opt: 0 };
    const render = { ...db };
    const result = compareDbVsRender(db, render);
    expect(result.hasMismatch).toBe(false);
    expect(result.totalMismatch).toBe(0);
    expect(result.items).toHaveLength(10);
  });

  it('FC 불일치 시 hasMismatch=true + totalMismatch=1', () => {
    const db = { l2: 21, l3: 91, l2Func: 26, l3Func: 101, fm: 26, fe: 20, fc: 104, fl: 111, ra: 111, opt: 0 };
    const render = { ...db, fc: 101 }; // FC 3건 누락
    const result = compareDbVsRender(db, render);
    expect(result.hasMismatch).toBe(true);
    expect(result.totalMismatch).toBe(1);
    const fcItem = result.items.find(i => i.label === 'FC 고장원인');
    expect(fcItem?.dbCount).toBe(104);
    expect(fcItem?.renderCount).toBe(101);
  });

  it('여러 항목 불일치 시 totalMismatch 정확', () => {
    const db = { l2: 21, l3: 91, l2Func: 26, l3Func: 101, fm: 26, fe: 20, fc: 104, fl: 111, ra: 111, opt: 0 };
    const render = { l2: 21, l3: 90, l2Func: 26, l3Func: 100, fm: 26, fe: 20, fc: 101, fl: 110, ra: 110, opt: 0 };
    const result = compareDbVsRender(db, render);
    expect(result.totalMismatch).toBe(5); // l3, l3Func, fc, fl, ra
  });

  it('키 누락 시 0으로 처리', () => {
    const db = { l2: 21 };
    const render = {};
    const result = compareDbVsRender(db, render);
    const l2Item = result.items.find(i => i.label === 'L2 공정');
    expect(l2Item?.dbCount).toBe(21);
    expect(l2Item?.renderCount).toBe(0);
  });
});

describe('extractRenderCounts', () => {
  it('Atomic API 응답에서 카운트 정확 추출', () => {
    const atomicData = {
      l2Structures: new Array(21),
      l3Structures: new Array(91),
      l2Functions: new Array(26),
      l3Functions: new Array(101),
      failureModes: new Array(26),
      failureEffects: new Array(20),
      failureCauses: new Array(104),
      failureLinks: new Array(111),
      riskAnalyses: new Array(111),
      optimizations: new Array(0),
    };
    const counts = extractRenderCounts(atomicData);
    expect(counts.l2).toBe(21);
    expect(counts.l3).toBe(91);
    expect(counts.fm).toBe(26);
    expect(counts.fc).toBe(104);
    expect(counts.fl).toBe(111);
    expect(counts.ra).toBe(111);
    expect(counts.opt).toBe(0);
  });

  it('필드 누락 시 0 반환', () => {
    const counts = extractRenderCounts({});
    expect(counts.l2).toBe(0);
    expect(counts.fm).toBe(0);
    expect(counts.fl).toBe(0);
  });
});

describe('renderCompareHtml', () => {
  it('불일치 시 자동개선 버튼 포함', () => {
    const result = {
      items: [{ label: 'FC 고장원인', dbCount: 104, renderCount: 101 }],
      totalMismatch: 1,
      hasMismatch: true,
    };
    const html = renderCompareHtml(result, 'pfm26-m002');
    expect(html).toContain('자동개선 실행');
    expect(html).toContain('rebuild-atomic');
    expect(html).toContain('🔴');
    expect(html).toContain('pfm26-m002');
  });

  it('일치 시 자동개선 버튼 미포함', () => {
    const result = {
      items: [{ label: 'FC 고장원인', dbCount: 104, renderCount: 104 }],
      totalMismatch: 0,
      hasMismatch: false,
    };
    const html = renderCompareHtml(result, 'pfm26-m002');
    expect(html).not.toContain('자동개선 실행');
    expect(html).toContain('🟢');
    expect(html).toContain('전체 일치');
  });
});
