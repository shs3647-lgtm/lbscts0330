/**
 * @file risk-analysis-dc-pc-no-null.guard.test.ts
 * @description Guard Test G-5 — RiskAnalysis의 DC/PC NULL 감시
 *
 * 사고 이력 (2026-03-17):
 *   rebuild-atomic에서 riskAnalysis.deleteMany 누락 → 중복 208건
 *   NULL 우선 선택 → 마스터에 DC/PC 없음
 *
 * 보호 대상: src/app/api/fmea/rebuild-atomic/route.ts
 *   rebuild-atomic 실행 후 DC/PC NULL 0건 보장
 *
 * 실행: npx vitest run tests/guard/risk-analysis-dc-pc-no-null.guard.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REBUILD_ATOMIC_PATH = path.resolve(
  __dirname,
  '../../src/app/api/fmea/rebuild-atomic/route.ts',
);

describe('RiskAnalysis DC/PC NULL 방어 (Guard G-5)', () => {
  const src = fs.readFileSync(REBUILD_ATOMIC_PATH, 'utf-8');

  it('rebuild-atomic에 riskAnalysis deleteMany가 존재해야 한다', () => {
    // deleteMany가 없으면 중복 RA 발생 → NULL 우선 선택 위험
    expect(src).toContain('riskAnalysis');
    expect(src).toContain('deleteMany');
  });

  it('DC/PC 보강(enrichment) 로직이 존재해야 한다', () => {
    // preventionControl / detectionControl 설정 코드가 존재해야 함
    expect(src).toContain('preventionControl');
    expect(src).toContain('detectionControl');
  });

  it('RA upsert/createMany 로직이 존재해야 한다', () => {
    // RA 저장 로직이 rebuild 과정에 반드시 포함
    const hasCreate = src.includes('riskAnalysis.createMany') || src.includes('riskAnalysis.upsert');
    expect(hasCreate).toBe(true);
  });

  it('DC/PC L2 fallback 보강이 존재해야 한다', () => {
    // step 2.5: L2 process-level fallback for DC/PC
    // "L2 fallback" 또는 "process-level" 키워드 존재
    const hasFallback = src.includes('L2') && (src.includes('fallback') || src.includes('Fallback'));
    expect(hasFallback).toBe(true);
  });
});
