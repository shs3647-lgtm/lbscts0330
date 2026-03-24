/**
 * @file aiag-vda-severity-mapping.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  headerCellToField,
  buildColumnMapFromHeaders,
  matchAiagVdaSeverityRow,
  AIAG_VDA_YIELD_RECOMMENDATION_ROWS,
  mapYieldRecommendationsToRows,
  type AiagVdaSeverityMappingRow,
} from '@/lib/fmea/aiag-vda-severity-mapping';

describe('headerCellToField', () => {
  it('maps standard Korean/English headers', () => {
    expect(headerCellToField('Scope')).toBe('scope');
    expect(headerCellToField('제품기능(C2)')).toBe('productFunction');
    expect(headerCellToField('요구사항(C3)')).toBe('requirement');
    expect(headerCellToField('고장영향(FE/C4)')).toBe('failureEffect');
    expect(headerCellToField('심각도(S)')).toBe('severity');
    expect(headerCellToField('AIAG-VDA 근거')).toBe('basis');
  });

  it('does not treat "life" as failure effect column', () => {
    expect(headerCellToField('Shelf life')).toBeNull();
  });
});

describe('buildColumnMapFromHeaders', () => {
  it('builds 1-based column map', () => {
    const headers = [
      'Scope',
      '제품기능(C2)',
      '요구사항(C3)',
      '고장영향(FE/C4)',
      '심각도(S)',
      'AIAG-VDA 근거',
    ];
    const m = buildColumnMapFromHeaders(headers);
    expect(m.get(1)).toBe('scope');
    expect(m.get(5)).toBe('severity');
    expect(m.get(6)).toBe('basis');
  });
});

describe('AIAG_VDA_YIELD_RECOMMENDATION_ROWS', () => {
  it('모든 행이 S=6 또는 S=7', () => {
    expect(AIAG_VDA_YIELD_RECOMMENDATION_ROWS.length).toBeGreaterThan(20);
    for (const r of AIAG_VDA_YIELD_RECOMMENDATION_ROWS) {
      expect([6, 7]).toContain(r.severity);
      expect(r.failureEffect.length).toBeGreaterThan(0);
    }
  });

  it('mapYieldRecommendationsToRows가 id를 부여한다', () => {
    let n = 0;
    const rows = mapYieldRecommendationsToRows(() => `id-${++n}`);
    expect(rows.length).toBe(AIAG_VDA_YIELD_RECOMMENDATION_ROWS.length);
    expect(rows[0].id).toBe('id-1');
  });
});

describe('matchAiagVdaSeverityRow', () => {
  const rows: AiagVdaSeverityMappingRow[] = [
    {
      id: '1',
      scope: 'USER',
      productFunction: 'PF',
      requirement: 'R1',
      failureEffect: '제품 손실',
      severity: 8,
      basis: 'test basis',
    },
  ];

  it('matches full key', () => {
    const hit = matchAiagVdaSeverityRow(rows, {
      scope: 'USER',
      productFunction: 'PF',
      requirement: 'R1',
      failureEffect: '제품 손실',
    });
    expect(hit?.severity).toBe(8);
    expect(hit?.basis).toBe('test basis');
  });

  it('falls back to scope + FE', () => {
    const hit = matchAiagVdaSeverityRow(rows, {
      scope: 'USER',
      productFunction: 'x',
      requirement: 'y',
      failureEffect: '제품 손실',
    });
    expect(hit?.severity).toBe(8);
  });

  it('same scope: longer Import FE contains 표 기본 FE → 매칭 (부분일치)', () => {
    const rowsSp: AiagVdaSeverityMappingRow[] = [
      {
        id: 'sp-y',
        scope: 'SP',
        productFunction: '품질',
        requirement: 'R',
        failureEffect: '수율 감소/저하',
        severity: 6,
        basis: '고객 생산 편의기능 저하',
      },
    ];
    const hit = matchAiagVdaSeverityRow(rowsSp, {
      scope: 'SP',
      productFunction: '',
      requirement: '',
      failureEffect: 'PKG 공정 수율 감소/저하 및 편차',
    });
    expect(hit?.severity).toBe(6);
    expect(hit?.basis).toContain('고객');
  });

  it('동일 scope: 문구가 달라도 공통 토큰 2개 이상이면 매칭 (완화)', () => {
    const rowsTok: AiagVdaSeverityMappingRow[] = [
      {
        id: 't1',
        scope: 'YP',
        productFunction: 'x',
        requirement: 'y',
        failureEffect: 'Wafer 스크래치 수율 저하',
        severity: 6,
        basis: '자사 수율',
      },
    ];
    const hit = matchAiagVdaSeverityRow(rowsTok, {
      scope: 'YP',
      failureEffect: '입고 Wafer에 스크래치 발생 시 공정 수율이 저하된다',
    });
    expect(hit?.severity).toBe(6);
    expect(hit?.basis).toContain('자사');
  });
});
