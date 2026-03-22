/**
 * @file position-parser.test.ts
 * @description TDD RED: 위치기반 파서 테스트 (m102 JSON fixture 기반)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  parsePositionBasedJSON,
  type PositionAtomicData,
} from '@/lib/fmea/position-parser';

// m102 fixture 로드
const fixturePath = path.resolve(__dirname, '../../data/master-fmea/m102-position-based.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

describe('parsePositionBasedJSON', () => {
  let result: PositionAtomicData;

  it('fixture 로드 성공', () => {
    expect(fixture.sheets).toBeDefined();
    expect(fixture.sheets.L1).toBeDefined();
    expect(fixture.sheets.L2).toBeDefined();
    expect(fixture.sheets.L3).toBeDefined();
    expect(fixture.sheets.FC).toBeDefined();
  });

  it('파서 실행 시 PositionAtomicData 반환', () => {
    result = parsePositionBasedJSON(fixture);
    expect(result).toBeDefined();
    expect(result.fmeaId).toBe(fixture.targetId || fixture.sourceId);
  });

  // ── L1 시트 → FailureEffect + L1Function ──

  it('L1 시트 → FailureEffect 생성 (행마다 독립)', () => {
    result = parsePositionBasedJSON(fixture);
    // 63행 중 C4가 비어있는 22행 제외 → 41개 FE
    const c4Rows = fixture.sheets.L1.rows.filter((r: any) => r.cells.C4?.trim());
    expect(result.failureEffects.length).toBe(c4Rows.length);
    // 각 FE의 id가 L1-R{n}-C4 형식
    expect(result.failureEffects[0].id).toMatch(/^L1-R\d+-C4$/);
  });

  it('L1 시트 → L1Function 중복제거 (같은 C1+C2+C3 = 같은 L1Function, 요구사항 보존)', () => {
    result = parsePositionBasedJSON(fixture);
    // C1+C2+C3 조합이 같으면 하나의 L1Function만 생성 (요구사항 누락 방지)
    const uniqueC2C3 = new Set(fixture.sheets.L1.rows.map((r: any) =>
      `${r.cells.C1}|${r.cells.C2}|${r.cells.C3}`
    ));
    expect(result.l1Functions.length).toBe(uniqueC2C3.size);
  });

  // ── L2 시트 → L2Structure + L2Function + ProductChar + FailureMode ──

  it('L2 시트 → L2Structure 생성 (공정번호별 1개)', () => {
    result = parsePositionBasedJSON(fixture);
    const uniquePnos = new Set(fixture.sheets.L2.rows.map((r: any) => r.cells['A1']));
    expect(result.l2Structures.length).toBe(uniquePnos.size);
  });

  it('L2 시트 → FailureMode 생성 (A5 행마다 독립)', () => {
    result = parsePositionBasedJSON(fixture);
    const a5Rows = fixture.sheets.L2.rows.filter((r: any) => r.cells['A5']?.trim());
    expect(result.failureModes.length).toBe(a5Rows.length);
    expect(result.failureModes[0].id).toMatch(/^L2-R\d+-C6$/);
  });

  // ── L3 시트 → L3Structure + L3Function + FailureCause ──

  it('L3 시트 → L3Structure 생성 (행마다 독립)', () => {
    result = parsePositionBasedJSON(fixture);
    expect(result.l3Structures.length).toBe(112);
  });

  it('L3 시트 → FailureCause 생성 (B4 열 기준)', () => {
    result = parsePositionBasedJSON(fixture);
    const b4Rows = fixture.sheets.L3.rows.filter((r: any) => r.cells['B4']?.trim());
    expect(result.failureCauses.length).toBe(b4Rows.length);
    expect(result.failureCauses[0].id).toMatch(/^L3-R\d+-C7$/);
  });

  // ── FC 시트 → FailureLink + RiskAnalysis ──

  it('FC 시트 → FailureLink 생성 (행마다 독립)', () => {
    result = parsePositionBasedJSON(fixture);
    expect(result.failureLinks.length).toBe(338);
    expect(result.failureLinks[0].id).toMatch(/^FC-R\d+$/);
  });

  it('FC 시트 → RiskAnalysis 생성 (FailureLink 1:1)', () => {
    result = parsePositionBasedJSON(fixture);
    expect(result.riskAnalyses.length).toBe(338);
    // 각 RA의 linkId = 해당 FL의 id
    for (let i = 0; i < result.riskAnalyses.length; i++) {
      expect(result.riskAnalyses[i].linkId).toBe(result.failureLinks[i].id);
    }
  });

  it('FC 시트 → 크로스시트 FK 해결 (L1원본행/L2원본행/L3원본행)', () => {
    result = parsePositionBasedJSON(fixture);
    // feId, fmId, fcId가 각각 L1-R{n}-C4, L2-R{n}-C6, L3-R{n}-C7 형식
    const fl0 = result.failureLinks[0];
    expect(fl0.feId).toMatch(/^L1-R\d+-C4$/);
    expect(fl0.fmId).toMatch(/^L2-R\d+-C6$/);
    expect(fl0.fcId).toMatch(/^L3-R\d+-C7$/);
  });

  it('FC 시트 → SOD 값 보존', () => {
    result = parsePositionBasedJSON(fixture);
    const ra0 = result.riskAnalyses[0];
    expect(typeof ra0.severity).toBe('number');
    expect(typeof ra0.occurrence).toBe('number');
    expect(typeof ra0.detection).toBe('number');
    expect(ra0.severity).toBeGreaterThanOrEqual(1);
    expect(ra0.severity).toBeLessThanOrEqual(10);
  });

  // ── 전체 정합성 ──

  it('모든 FailureLink의 FK가 실제 엔티티를 참조', () => {
    result = parsePositionBasedJSON(fixture);
    const feIds = new Set(result.failureEffects.map(e => e.id));
    const fmIds = new Set(result.failureModes.map(e => e.id));
    const fcIds = new Set(result.failureCauses.map(e => e.id));

    let brokenFE = 0, brokenFM = 0, brokenFC = 0;
    for (const fl of result.failureLinks) {
      if (!feIds.has(fl.feId)) brokenFE++;
      if (!fmIds.has(fl.fmId)) brokenFM++;
      if (!fcIds.has(fl.fcId)) brokenFC++;
    }
    expect(brokenFE).toBe(0);
    expect(brokenFM).toBe(0);
    expect(brokenFC).toBe(0);
  });

  it('모든 L3Structure의 l2Id가 실제 L2Structure를 참조', () => {
    result = parsePositionBasedJSON(fixture);
    const l2Ids = new Set(result.l2Structures.map(e => e.id));
    for (const l3 of result.l3Structures) {
      expect(l2Ids.has(l3.l2Id)).toBe(true);
    }
  });
});
