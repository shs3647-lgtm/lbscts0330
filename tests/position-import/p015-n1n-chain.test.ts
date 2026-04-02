/**
 * @file p015-n1n-chain.test.ts
 * @description pfm26-p015-i15 N:1:N 엑셀 Import 파싱 테스트
 *
 * 검증 대상:
 *   - FC시트(76행) > L3시트(67행) N:1:N 구조에서 교차공정 오탐 없이 FL 76건 생성
 *   - 모든 FL에 fmId + fcId + feId 3요소 완전
 *   - DC/PC NULL 0건
 */
import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import path from 'path';
import { parsePositionBasedWorkbook, isPositionBasedFormat } from '../../src/lib/fmea/position-parser';

const EXCEL_PATH = path.resolve('C:/Users/Administrator/Documents/00_lbscts0330/pfm26-p015-i15_import_sample.xlsx');

describe('pfm26-p015-i15 N:1:N Import', () => {
  let result: ReturnType<typeof parsePositionBasedWorkbook>;

  // 공통 파싱 (한 번만 실행)
  beforeAll(async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(EXCEL_PATH);
    result = parsePositionBasedWorkbook(wb, 'pfm26-p015-i15');
  });

  it('isPositionBasedFormat 판정 — true', async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(EXCEL_PATH);
    const names: string[] = [];
    wb.eachSheet((ws: any) => names.push(ws.name));
    expect(isPositionBasedFormat(names)).toBe(true);
  });

  it('L2 Structures = 12공정', () => {
    expect(result.l2Structures.length).toBe(12);
  });

  it('FailureModes = 15', () => {
    expect(result.failureModes.length).toBe(15);
  });

  it('FailureCauses = 67', () => {
    expect(result.failureCauses.length).toBe(67);
  });

  it('FailureEffects = 14', () => {
    expect(result.failureEffects.length).toBe(14);
  });

  it('FailureLinks = 76 (N:1:N 체인 — 교차공정 오탐 0건)', () => {
    expect(result.failureLinks.length).toBe(76);
  });

  it('모든 FL에 fmId 존재', () => {
    const noFm = result.failureLinks.filter(fl => !fl.fmId);
    expect(noFm.length).toBe(0);
  });

  it('모든 FL에 fcId 존재', () => {
    const noFc = result.failureLinks.filter(fl => !fl.fcId);
    expect(noFc.length).toBe(0);
  });

  it('모든 FL에 feId 존재', () => {
    const noFe = result.failureLinks.filter(fl => !fl.feId);
    expect(noFe.length).toBe(0);
  });

  it('완전한 FL (fm+fc+fe 3요소) = 76', () => {
    const valid = result.failureLinks.filter(fl => fl.fmId && fl.fcId && fl.feId);
    expect(valid.length).toBe(76);
  });

  it('RiskAnalyses = FL 수와 동일', () => {
    expect(result.riskAnalyses.length).toBe(result.failureLinks.length);
  });

  it('DC NULL = 0', () => {
    const nullDC = result.riskAnalyses.filter((r: any) => !r.detectionControl?.trim());
    expect(nullDC.length).toBe(0);
  });

  it('PC NULL = 0', () => {
    const nullPC = result.riskAnalyses.filter((r: any) => !r.preventionControl?.trim());
    expect(nullPC.length).toBe(0);
  });

  it('교차공정 FL 없음 — 모든 FL의 FM과 FC가 같은 공정', () => {
    for (const fl of result.failureLinks) {
      if (!fl.fmId || !fl.fcId) continue;
      const fm = result.failureModes.find(f => f.id === fl.fmId);
      const fc = result.failureCauses.find(f => f.id === fl.fcId);
      if (fm && fc) {
        expect(fm.l2StructId).toBe(fc.l2StructId);
      }
    }
  });
});
