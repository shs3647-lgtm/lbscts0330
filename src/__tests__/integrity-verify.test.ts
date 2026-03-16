/**
 * @file integrity-verify.test.ts
 * @description 통계검증 유틸리티 함수 단위 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  getScoreFromIssues,
  getScoreColor,
  getScoreLabel,
  getStatusIcon,
  formatItemCode,
  buildCountDisplayRows,
} from '@/app/(fmea-core)/pfmea/verify/utils';
import type { TabCounts } from '@/app/(fmea-core)/pfmea/verify/types';

describe('getScoreFromIssues', () => {
  it('0건이면 A등급', () => {
    expect(getScoreFromIssues(0)).toBe('A');
  });

  it('1~2건이면 B등급', () => {
    expect(getScoreFromIssues(1)).toBe('B');
    expect(getScoreFromIssues(2)).toBe('B');
  });

  it('3~5건이면 C등급', () => {
    expect(getScoreFromIssues(3)).toBe('C');
    expect(getScoreFromIssues(5)).toBe('C');
  });

  it('6건 이상이면 D등급', () => {
    expect(getScoreFromIssues(6)).toBe('D');
    expect(getScoreFromIssues(100)).toBe('D');
  });
});

describe('getScoreColor', () => {
  it('A등급은 green', () => {
    expect(getScoreColor('A')).toContain('green');
  });

  it('D등급은 red', () => {
    expect(getScoreColor('D')).toContain('red');
  });
});

describe('getScoreLabel', () => {
  it('A등급은 완벽', () => {
    expect(getScoreLabel('A')).toContain('완벽');
  });

  it('D등급은 심각', () => {
    expect(getScoreLabel('D')).toContain('심각');
  });
});

describe('getStatusIcon', () => {
  it('ok는 체크마크', () => {
    expect(getStatusIcon('ok')).toBeTruthy();
  });

  it('error는 X마크', () => {
    expect(getStatusIcon('error')).toBeTruthy();
  });
});

describe('formatItemCode', () => {
  it('A2는 공정명 라벨', () => {
    expect(formatItemCode('A2')).toContain('공정명');
  });

  it('A5는 고장형태 라벨', () => {
    expect(formatItemCode('A5')).toContain('고장형태');
  });

  it('link는 고장연결 라벨', () => {
    expect(formatItemCode('link')).toContain('고장연결');
  });

  it('알 수 없는 코드는 원본 반환', () => {
    expect(formatItemCode('ZZ')).toBe('ZZ');
  });
});

describe('buildCountDisplayRows', () => {
  const mockCounts: TabCounts = {
    l1Structure: 1,
    l2Structure: 5,
    l3Structure: 12,
    l1Category: 3,
    l1Function: 8,
    l1Requirement: 15,
    l2Function: 10,
    productChar: 23,
    l3Function: 24,
    l3ProcessChar: 24,
    failureEffect: 18,
    failureMode: 45,
    failureCause: 67,
    failureLink: 127,
    failureAnalysis: 127,
    riskAnalysis: 127,
    optimization: 15,
  };

  it('17개 행을 반환', () => {
    const rows = buildCountDisplayRows(mockCounts);
    expect(rows).toHaveLength(17);
  });

  it('각 행에 section, label, dbCount가 있음', () => {
    const rows = buildCountDisplayRows(mockCounts);
    for (const row of rows) {
      expect(row.section).toBeTruthy();
      expect(row.label).toBeTruthy();
      expect(typeof row.dbCount).toBe('number');
    }
  });

  it('DB건수가 0이면 warn 상태 (info 제외)', () => {
    const zeroCounts: TabCounts = {
      ...mockCounts,
      l2Structure: 0,
    };
    const rows = buildCountDisplayRows(zeroCounts);
    const l2Row = rows.find(r => r.labelEn === 'L2Structure');
    expect(l2Row?.status).toBe('warn');
  });

  it('L1 구분(Category)은 info 상태 (항상 3개 고정이므로)', () => {
    const rows = buildCountDisplayRows(mockCounts);
    const categoryRow = rows.find(r => r.labelEn === 'L1Function.category');
    expect(categoryRow?.status).toBe('info');
  });

  it('섹션이 올바르게 구분됨', () => {
    const rows = buildCountDisplayRows(mockCounts);
    const sections = [...new Set(rows.map(r => r.section))];
    expect(sections.length).toBeGreaterThanOrEqual(7);
  });
});
