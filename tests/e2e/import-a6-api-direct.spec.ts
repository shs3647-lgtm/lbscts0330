/**
 * @file import-a6-api-direct.spec.ts
 * @description A6(검출관리) save-from-import API 직접 호출로 riskData detection-* 검증
 *
 * Excel v4.0.0에서 FC 시트 + L2-6 시트 데이터를 추출 → save-from-import API 직접 POST
 * → riskData detection-* 키 존재 확인
 *
 * @created 2026-03-14
 */

import { test, expect } from '@playwright/test';

const EXCEL_FILE = 'C:\\00_LB세미콘FMEA\\FMEA&CP정보\\PFMEA_기초정보_샘플_v4.0.0_2026-03-14 (2).xlsx';
const FMEA_ID = 'pfm26-m010';
const BASE_URL = 'http://localhost:3000';

test.describe('A6 save-from-import API 직접 검증', () => {

  test('Excel FC시트+L2-6시트 → save-from-import → riskData detection-* 존재', async ({ request }) => {
    test.setTimeout(120000);

    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(EXCEL_FILE);

    // ── 1. 시트별 데이터 읽기 ──
    const readSheet = (namePattern: string, valueCols: number[]) => {
      const sheet = wb.worksheets.find((ws: { name: string }) => ws.name.includes(namePattern));
      if (!sheet) return [];
      const data: Record<string, string>[] = [];
      for (let r = 2; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        const pNo = String(row.getCell(1).value || '').trim();
        if (!pNo) continue;
        const entry: Record<string, string> = { processNo: pNo };
        valueCols.forEach((col, i) => {
          entry[`v${i}`] = String(row.getCell(col).value || '').trim();
        });
        data.push(entry);
      }
      return data;
    };

    const a1Data = readSheet('L2-1', []);        // 공정번호만
    const a2Data = readSheet('L2-2', [2]);        // 공정명
    const a3Data = readSheet('L2-3', [2]);        // 공정기능
    const a4Data = readSheet('L2-4', [2]);        // 제품특성
    const a5Data = readSheet('L2-5', [2]);        // 고장형태
    const a6Data = readSheet('L2-6', [2]);        // 검출관리
    const b1Data = readSheet('L3-1', [2, 3]);     // 4M, 작업요소
    const b4Data = readSheet('L3-4', [2, 3, 4]);  // 4M, WE, 고장원인

    console.log('시트 파싱 완료:');
    console.log(`  A1=${a1Data.length} A2=${a2Data.length} A3=${a3Data.length} A4=${a4Data.length} A5=${a5Data.length}`);
    console.log(`  A6=${a6Data.length} B1=${b1Data.length} B4=${b4Data.length}`);

    // ── 2. flatData 구성 ──
    const flatData: Record<string, unknown>[] = [];
    let idCounter = 0;
    const id = () => `gen-${++idCounter}`;

    // A1~A5
    for (const d of a1Data) {
      flatData.push({ id: id(), processNo: d.processNo, category: 'A', itemCode: 'A1', value: d.processNo, createdAt: new Date().toISOString() });
    }
    for (const d of a2Data) {
      flatData.push({ id: id(), processNo: d.processNo, category: 'A', itemCode: 'A2', value: d.v0, createdAt: new Date().toISOString() });
    }
    for (const d of a3Data) {
      flatData.push({ id: id(), processNo: d.processNo, category: 'A', itemCode: 'A3', value: d.v0, parentItemId: `${d.processNo}-A2-0`, createdAt: new Date().toISOString() });
    }
    for (const d of a4Data) {
      flatData.push({ id: id(), processNo: d.processNo, category: 'A', itemCode: 'A4', value: d.v0, parentItemId: `${d.processNo}-A3-0`, createdAt: new Date().toISOString() });
    }
    for (const d of a5Data) {
      flatData.push({ id: id(), processNo: d.processNo, category: 'A', itemCode: 'A5', value: d.v0, parentItemId: `${d.processNo}-A4-0`, createdAt: new Date().toISOString() });
    }
    // A6 (L2-6 전용 시트)
    for (const d of a6Data) {
      flatData.push({ id: `${d.processNo}-A6-tpl-${idCounter++}`, processNo: d.processNo, category: 'A', itemCode: 'A6', value: d.v0, parentItemId: `${d.processNo}-A5-0`, createdAt: new Date().toISOString() });
    }
    // B1
    for (const d of b1Data) {
      flatData.push({ id: id(), processNo: d.processNo, category: 'B', itemCode: 'B1', value: d.v1 || d.v0, m4: d.v0, createdAt: new Date().toISOString() });
    }
    // B4
    for (const d of b4Data) {
      flatData.push({ id: id(), processNo: d.processNo, category: 'B', itemCode: 'B4', value: d.v2 || d.v1, m4: d.v0, parentItemId: `${d.processNo}-B3-0`, createdAt: new Date().toISOString() });
    }
    // C1~C4
    flatData.push({ id: id(), processNo: 'YOUR PLANT', category: 'C', itemCode: 'C1', value: 'YOUR PLANT', createdAt: new Date().toISOString() });
    flatData.push({ id: id(), processNo: 'YOUR PLANT', category: 'C', itemCode: 'C2', value: '완제품기능', parentItemId: 'C1-0', createdAt: new Date().toISOString() });
    flatData.push({ id: id(), processNo: 'YOUR PLANT', category: 'C', itemCode: 'C3', value: '요구사항', parentItemId: 'C2-0', createdAt: new Date().toISOString() });
    flatData.push({ id: id(), processNo: 'YOUR PLANT', category: 'C', itemCode: 'C4', value: '고장영향', parentItemId: 'C3-0', createdAt: new Date().toISOString() });

    console.log(`flatData: ${flatData.length}항목 (A6=${flatData.filter(d => d.itemCode === 'A6').length})`);

    // ── 3. FC 시트 → failureChains 구성 ──
    const fcSheet = wb.worksheets.find((ws: { name: string }) => ws.name.includes('FC 고장사슬'));
    const chains: Record<string, unknown>[] = [];
    if (fcSheet) {
      for (let r = 2; r <= fcSheet.rowCount; r++) {
        const row = fcSheet.getRow(r);
        const feScope = String(row.getCell(1).value || '').trim();
        const feValue = String(row.getCell(2).value || '').trim();
        const processNo = String(row.getCell(3).value || '').trim();
        const fmValue = String(row.getCell(4).value || '').trim();
        const m4 = String(row.getCell(5).value || '').trim();
        const workElement = String(row.getCell(6).value || '').trim();
        const fcValue = String(row.getCell(7).value || '').trim();
        const pcValue = String(row.getCell(8).value || '').trim();
        const dcValue = String(row.getCell(9).value || '').trim();
        const occurrence = parseInt(String(row.getCell(10).value || '0'));
        const detection = parseInt(String(row.getCell(11).value || '0'));
        const ap = String(row.getCell(12).value || '').trim();

        if (!processNo || !fmValue) continue;
        chains.push({
          id: `fc-${r}`,
          processNo,
          feScope: feScope || 'YP',
          feValue: feValue || '고장영향',
          fmValue,
          fcValue: fcValue || '원인불명',
          m4: m4 || 'MC',
          workElement: workElement || '',
          pcValue: pcValue || '',
          dcValue: dcValue || '',
          occurrence: occurrence || 0,
          detection: detection || 0,
          ap: ap || '',
        });
      }
    }
    console.log(`failureChains: ${chains.length}건`);
    const chainsWithDC = chains.filter(c => (c.dcValue as string).trim());
    console.log(`  dcValue 비공백: ${chainsWithDC.length}건`);

    // ── 4. save-from-import API 호출 ──
    const saveRes = await request.post(`${BASE_URL}/api/fmea/save-from-import`, {
      data: {
        fmeaId: FMEA_ID,
        flatData,
        l1Name: 'AU BUMP',
        failureChains: chains,
      },
    });

    console.log(`\nsave-from-import: ${saveRes.status()}`);
    const saveBody = await saveRes.json().catch(() => null);
    if (saveBody) {
      console.log(`  success: ${saveBody.success}`);
      console.log(`  atomicCounts:`, JSON.stringify(saveBody.atomicCounts));
      if (saveBody.error) console.log(`  error: ${saveBody.error}`);
    }
    expect(saveRes.ok(), `save-from-import 실패: ${saveBody?.error}`).toBeTruthy();

    // ── 5. riskData 검증 ──
    const getRes = await request.get(`${BASE_URL}/api/fmea?fmeaId=${FMEA_ID}`);
    expect(getRes.ok()).toBeTruthy();

    const fmeaData = await getRes.json();
    const riskData = fmeaData.riskData || {};

    const detectionKeys = Object.keys(riskData).filter(k => k.startsWith('detection-'));
    const detectionValues: string[] = detectionKeys
      .map(k => riskData[k])
      .filter(v => typeof v === 'string' && v.trim());
    const uniqueDetections = [...new Set(detectionValues)];

    console.log(`\n=== riskData 검증 ===`);
    console.log(`detection-* 키: ${detectionKeys.length}`);
    console.log(`비공백 값: ${detectionValues.length}`);
    console.log(`고유 값: ${uniqueDetections.length}`);
    uniqueDetections.forEach(v => console.log(`  - "${v}"`));

    const preventionKeys = Object.keys(riskData).filter(k => k.startsWith('prevention-'));
    const preventionValues: string[] = preventionKeys
      .map(k => riskData[k])
      .filter(v => typeof v === 'string' && v.trim());
    console.log(`prevention-* 키: ${preventionKeys.length}, 비공백: ${preventionValues.length}`);

    // ★ 핵심 검증: detection-* 키 > 0
    expect(detectionKeys.length, 'detection-* 키 0 — A6 riskData 미저장').toBeGreaterThan(0);
    expect(detectionValues.length, 'detection-* 비공백 값 0').toBeGreaterThan(0);

    // L2-6 키워드 매칭
    const allDetText = detectionValues.join(' ');
    const keywords = ['파티클', 'SEM', 'KLA', '비전', '측정기', 'AVI', 'XRF', '광학현미경'];
    const found = keywords.filter(kw => allDetText.includes(kw));
    console.log(`\nL2-6 키워드 매칭: ${found.length}/${keywords.length} — ${found.join(', ')}`);
    expect(found.length, 'L2-6 키워드 매칭 0').toBeGreaterThan(0);

    console.log('\nA6 API 검증 완료');
  });
});
