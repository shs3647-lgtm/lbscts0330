/**
 * 연결표(Linkage) UI보내기 10열 → parseFCSheet (2026-03-24)
 */
import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { parseFCSheet } from '@/app/(fmea-core)/pfmea/import/excel-parser-fc';
import * as fs from 'node:fs';

describe('parseFCSheet — 연결표(Linkage) 레이아웃', () => {
  it('헤더+1행: 공정번호·FM·FC·FE 파싱', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('연결표(Linkage)');
    ws.addRow(['FE No', 'Cat', 'FE', 'S', 'FM No', 'FM', 'FC No', 'Process', 'WE', 'FC']);
    ws.addRow(['FE1', 'YP', '고장영향텍스트', '5', 'M1', 'FM텍스트', 'FC1', '10', 'WE1', '원인A']);

    const chains = parseFCSheet(ws);
    expect(chains).toHaveLength(1);
    expect(chains[0].processNo).toBe('10');
    expect(chains[0].fmValue).toBe('FM텍스트');
    expect(chains[0].fcValue).toBe('원인A');
    expect(chains[0].feValue).toBe('고장영향텍스트');
    expect(chains[0].feScope).toBe('YP');
    expect(chains[0].severity).toBe(5);
  });

  it('Process 열 비어 있으면 동일 FM 내 이전 행 carry', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('연결표(Linkage)');
    ws.addRow(['FE No', 'Cat', 'FE', 'S', 'FM No', 'FM', 'FC No', 'Process', 'WE', 'FC']);
    ws.addRow(['FE1', '', 'FE본문', '5', 'M1', 'FM1', 'FC1', '20', '', '원인1']);
    ws.addRow(['FE1', '', 'FE본문', '5', 'M1', 'FM1', 'FC2', '', 'WE2', '원인2']);

    const chains = parseFCSheet(ws);
    expect(chains).toHaveLength(2);
    expect(chains[0].processNo).toBe('20');
    expect(chains[1].processNo).toBe('20');
    expect(chains[1].workElement).toBe('WE2');
  });

  it('실제 Downloads 연결표 파일이 있으면 체인 1건 이상', async () => {
    const p = 'C:/Users/Administrator/Downloads/FMEA_연결표 (4).xlsx';
    if (!fs.existsSync(p)) {
      return;
    }
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(p);
    const ws = wb.getWorksheet('연결표(Linkage)') || wb.worksheets[0];
    expect(ws).toBeTruthy();
    const chains = parseFCSheet(ws!);
    expect(chains.length).toBeGreaterThan(0);
    expect(chains.every(c => c.fmValue && c.fcValue)).toBe(true);
  });
});
