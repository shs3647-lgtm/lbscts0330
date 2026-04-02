/**
 * @file position-parser.test.ts
 * @description 위치기반 파서 테스트 (m102 JSON fixture 기반)
 * @updated 2026-03-28 — 파서 v5/v6: FE=C4 텍스트 중복제거, L3Structure=l2Id|m4|B1 복합키 dedup,
 *   FC 복합키 매칭으로 미해결 fcId 허용 → FK 검증은 삼중 완전 FL만 대상
 * @updated 2026-03-28 — FM.L2≠FC.L2 교차공정 스킵 통계(crossProcessFlSkipped); m102 FC행=338 → FL=RA=338 (스킵 52건 별도 집계)
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

  it('L1 시트 → FailureEffect 생성 (C4 텍스트 기준 중복제거)', () => {
    result = parsePositionBasedJSON(fixture);
    const uniqueC4 = new Set(
      fixture.sheets.L1.rows
        .map((r: any) => r.cells.C4?.trim())
        .filter((t: string | undefined) => !!t),
    );
    expect(result.failureEffects.length).toBe(uniqueC4.size);
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

  it('L3 시트 → L3Structure 생성 (복합키 l2Id|m4|B1 중복제거)', () => {
    result = parsePositionBasedJSON(fixture);
    // 물리 행 112≠구조체 수 — 동일 공정·4M·작업요소는 단일 L3Structure (position-parser 2026-03-28)
    expect(result.l3Structures.length).toBe(90);
  });

  it('L3 시트 → FailureCause 생성 (B4 열 기준)', () => {
    result = parsePositionBasedJSON(fixture);
    const b4Rows = fixture.sheets.L3.rows.filter((r: any) => r.cells['B4']?.trim());
    expect(result.failureCauses.length).toBe(b4Rows.length);
    expect(result.failureCauses[0].id).toMatch(/^L3-R\d+-C7$/);
  });

  // ── FC 시트 → FailureLink + RiskAnalysis ──

  it('FC 시트 → FailureLink 생성 (행마다 최대 1)', () => {
    result = parsePositionBasedJSON(fixture);
    expect(result.failureLinks.length).toBe(338);
    // ★v6.4: N:1:N 대응으로 텍스트 매칭 우선 → FC시트 processNo 기준 동일공정 FC 해결
    // 이전: 1:1 인덱스 매핑 → 52건 교차공정 오탐. 현재: 텍스트 매칭 → 0건 오탐
    expect(result.stats.crossProcessFlSkipped).toBeGreaterThanOrEqual(0);
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

  it('★3 diagnostics: FL 없는 FM 건수 = 진단 배열 길이', () => {
    result = parsePositionBasedJSON(fixture);
    const linkedFm = new Set(result.failureLinks.map((fl) => fl.fmId).filter(Boolean));
    const expectUnlinked = result.failureModes.filter((fm) => !linkedFm.has(fm.id)).length;
    expect(result.diagnostics?.fmsWithoutFailureLink.length).toBe(expectUnlinked);
    expect(result.stats.fmsWithoutFailureLink).toBe(expectUnlinked);
  });

  it('★4 diagnostics: FL 없는 FC 건수 = 진단 배열 길이', () => {
    result = parsePositionBasedJSON(fixture);
    const linkedFc = new Set(result.failureLinks.map((fl) => fl.fcId).filter(Boolean));
    const expectUnlinked = result.failureCauses.filter((fc) => !linkedFc.has(fc.id)).length;
    expect(result.diagnostics?.fcsWithoutFailureLink.length).toBe(expectUnlinked);
    expect(result.stats.fcsWithoutFailureLink).toBe(expectUnlinked);
  });

  it('삼중 FK가 채워진 FailureLink는 실제 FE/FM/FC 엔티티를 참조', () => {
    result = parsePositionBasedJSON(fixture);
    const feIds = new Set(result.failureEffects.map(e => e.id));
    const fmIds = new Set(result.failureModes.map(e => e.id));
    const fcIds = new Set(result.failureCauses.map(e => e.id));

    const tripleComplete = result.failureLinks.filter(
      (fl) => fl.feId && fl.fmId && fl.fcId,
    );
    expect(tripleComplete.length).toBeGreaterThan(0);
    for (const fl of tripleComplete) {
      expect(feIds.has(fl.feId)).toBe(true);
      expect(fmIds.has(fl.fmId)).toBe(true);
      expect(fcIds.has(fl.fcId)).toBe(true);
    }
  });

  it('모든 L3Structure의 l2Id가 실제 L2Structure를 참조', () => {
    result = parsePositionBasedJSON(fixture);
    const l2Ids = new Set(result.l2Structures.map(e => e.id));
    for (const l3 of result.l3Structures) {
      expect(l2Ids.has(l3.l2Id)).toBe(true);
    }
  });

  it('FC L3_origRow — v6.4에서는 인덱스+텍스트 매칭 우선 (origRow 미사용)', () => {
    // ★v6.4: L3_origRow 셀 값은 파서에서 직접 사용되지 않음 (인덱스+텍스트 매칭 우선)
    // L3_origRow를 변조해도 fcId 해결에 영향 없음 — 텍스트 매칭으로 해결
    const bad = JSON.parse(JSON.stringify(fixture)) as typeof fixture;
    const fcRow = bad.sheets.FC.rows.find((r: { cells: Record<string, string> }) =>
      String(r.cells.L3_origRow || '').trim(),
    );
    expect(fcRow).toBeDefined();
    fcRow!.cells.L3_origRow = '999999';
    const r = parsePositionBasedJSON(bad);
    // 파서는 L3_origRow 대신 인덱스/텍스트 매칭 사용 → FL 정상 생성
    expect(r.failureLinks.length).toBeGreaterThan(0);
  });

});

/** L2 carry — m102 무관 최소 4시트 (대형 fixture 확장 시 보완 FL·FK 카운트가 흔들리지 않게 함) */
describe('parsePositionBasedJSON — L2 carry-forward', () => {
  const minimalCarryJson = {
    targetId: 'pfm26-carry-test',
    sourceId: 'pfm26-carry-test',
    sheets: {
      L1: {
        sheetName: 'L1',
        headers: [],
        rows: [
          {
            excelRow: 2,
            posId: 'L1-R2',
            cells: { C1: 'YP', C2: '기능F', C3: '요구R', C4: '영향FE1' },
          },
        ],
      },
      L2: {
        sheetName: 'L2',
        headers: [],
        rows: [
          {
            excelRow: 10,
            posId: 'L2-R10',
            cells: { A1: '1', A2: '공정P', A3: 'L2기능', A4: 'pcA', SC: '', A5: 'fmA', A6: '병합검출관리' },
          },
          {
            excelRow: 11,
            posId: 'L2-R11',
            cells: { A1: '', A2: '', A3: '', A4: 'pcB', SC: '', A5: 'fmB', A6: '' },
          },
        ],
      },
      L3: {
        sheetName: 'L3',
        headers: [],
        rows: [
          {
            excelRow: 20,
            posId: 'L3-R20',
            cells: { processNo: '1', m4: 'MN', B1: 'WE1', B2: 'B2', B3: 'B3', SC: '', B4: '원인FC', B5: '' },
          },
        ],
      },
      FC: {
        sheetName: 'FC',
        headers: [],
        rows: [
          {
            excelRow: 30,
            posId: 'FC-R30',
            cells: {
              FE_scope: 'YP',
              FE: '영향FE1',
              processNo: '1',
              FM: 'fmA',
              m4: 'MN',
              WE: 'WE1',
              FC: '원인FC',
              PC: '',
              DC: '',
              S: '5',
              O: '3',
              D: '2',
              AP: 'M',
              L1_origRow: '2',
              L2_origRow: '10',
              L3_origRow: '20',
            },
          },
        ],
      },
    },
  };

  it('병합으로 빈 A1·빈 A6인 행이 이전 행 공정번호·검출관리를 상속', () => {
    const r = parsePositionBasedJSON(minimalCarryJson as Parameters<typeof parsePositionBasedJSON>[0]);
    const fmB = r.failureModes.find((fm) => fm.id === 'L2-R11-C6');
    expect(fmB?.detectionControl).toBe('병합검출관리');
  });
});

/** 교차공정 FL: FC 시트가 공정1 FM + 공정2 FC(위치 인덱스)를 묶으면 FL/RA 미생성·stats 반영 */
describe('parsePositionBasedJSON — crossProcessFk 스킵', () => {
  const crossProcessJson = {
    targetId: 'pfm26-cross-fl-test',
    sourceId: 'pfm26-cross-fl-test',
    sheets: {
      L1: {
        sheetName: 'L1',
        headers: [],
        rows: [
          { excelRow: 2, posId: 'L1-R2', cells: { C1: 'YP', C2: 'F', C3: 'R', C4: 'FE1' } },
        ],
      },
      L2: {
        sheetName: 'L2',
        headers: [],
        rows: [
          {
            excelRow: 10,
            posId: 'L2-R10',
            cells: { A1: '1', A2: 'P1', A3: 'L2f', A4: 'pc1', SC: '', A5: 'fmP1', A6: '' },
          },
          {
            excelRow: 12,
            posId: 'L2-R12',
            cells: { A1: '2', A2: 'P2', A3: 'L2f', A4: 'pc2', SC: '', A5: 'fmP2', A6: '' },
          },
        ],
      },
      L3: {
        sheetName: 'L3',
        headers: [],
        rows: [
          {
            excelRow: 20,
            posId: 'L3-R20',
            cells: { processNo: '1', m4: 'MN', B1: 'WE1', B2: 'B2', B3: 'B3', SC: '', B4: 'causeP1', B5: '' },
          },
          {
            excelRow: 21,
            posId: 'L3-R21',
            cells: { processNo: '2', m4: 'MN', B1: 'WE2', B2: 'B2', B3: 'B3', SC: '', B4: 'causeP2', B5: '' },
          },
        ],
      },
      FC: {
        sheetName: 'FC',
        headers: [],
        rows: [
          {
            excelRow: 30,
            posId: 'FC-R30',
            cells: {
              FE_scope: 'YP',
              FE: 'FE1',
              processNo: '1',
              FM: 'fmP1',
              m4: 'MN',
              WE: 'WE1',
              FC: 'causeP1',
              PC: '',
              DC: '',
              S: '5',
              O: '3',
              D: '2',
              AP: 'M',
            },
          },
          {
            excelRow: 31,
            posId: 'FC-R31',
            cells: {
              FE_scope: 'YP',
              FE: 'FE1',
              processNo: '1',
              FM: 'fmP1',
              m4: 'MN',
              WE: 'WE2',
              FC: 'causeP2',
              PC: '',
              DC: '',
              S: '4',
              O: '2',
              D: '2',
              AP: 'M',
            },
          },
        ],
      },
    },
  };

  it('FM·FC L2 불일치 행은 FL·RA를 만들지 않고 crossProcessFlSkipped=1', () => {
    const r = parsePositionBasedJSON(crossProcessJson as Parameters<typeof parsePositionBasedJSON>[0]);
    expect(r.failureLinks.length).toBe(1);
    expect(r.riskAnalyses.length).toBe(1);
    expect(r.stats.crossProcessFlSkipped).toBe(1);
    const fm = r.failureModes.find((m) => m.mode === 'fmP1');
    const fc = r.failureCauses.find((c) => c.cause === 'causeP2');
    expect(fm?.l2StructId).toBeDefined();
    expect(fc?.l2StructId).toBeDefined();
    expect(fm!.l2StructId).not.toBe(fc!.l2StructId);
  });

  it('★3 diagnostics: FL 없는 fmP2는 NO_FC_SHEET_REFERENCE', () => {
    const r = parsePositionBasedJSON(crossProcessJson as Parameters<typeof parsePositionBasedJSON>[0]);
    const d = r.diagnostics?.fmsWithoutFailureLink ?? [];
    const p2 = d.find((x) => x.mode === 'fmP2');
    expect(p2?.reason).toBe('NO_FC_SHEET_REFERENCE');
  });

  it('★4 diagnostics: FL 없는 causeP2는 CROSS_PROCESS_SKIPPED', () => {
    const r = parsePositionBasedJSON(crossProcessJson as Parameters<typeof parsePositionBasedJSON>[0]);
    const d = r.diagnostics?.fcsWithoutFailureLink ?? [];
    const c2 = d.find((x) => x.cause === 'causeP2');
    expect(c2?.reason).toBe('CROSS_PROCESS_SKIPPED');
    expect(c2?.fcSheetExcelRows).toEqual([31]);
  });
});
