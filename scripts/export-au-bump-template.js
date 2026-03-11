/**
 * AU BUMP 데이터를 B5/A6 포함 Import 양식으로 Export
 *
 * 생성 시트:
 *   1. SA(구조분석) — A0~A5, B1~B4, C1~C4 (공정별)
 *   2. FC(고장사슬) — FE구분, FE, 공정번호, FM, 4M, WE, FC, B5.예방관리, A6.검출관리, O, D, AP
 *
 * Usage: node scripts/export-au-bump-template.js
 */

const { Pool } = require('pg');
const ExcelJS = require('exceljs');
const path = require('path');

const DB_URL = 'postgresql://postgres:postgres@localhost:5432/fmea_db';

async function main() {
  const pool = new Pool({ connectionString: DB_URL });

  try {
    // ── 1. DB에서 데이터 조회 ──
    const flatResult = await pool.query(
      'SELECT "itemCode", value, m4, "processNo", "specialChar", "parentItemId" FROM pfmea_master_flat_items ORDER BY "processNo", "itemCode", m4'
    );
    const flatItems = flatResult.rows;

    const chainResult = await pool.query('SELECT "failureChains" FROM pfmea_master_datasets LIMIT 1');
    const chains = chainResult.rows[0]?.failureChains || [];

    console.log(`Flat items: ${flatItems.length}, Chains: ${chains.length}`);

    // ── 2. 공정별 데이터 정리 ──
    const processMap = new Map(); // processNo → { A0~A5, B1~B4 items }
    const feItems = [];           // C1~C4 items (FE-related)

    for (const item of flatItems) {
      const pNo = item.processNo;
      if (!pNo) continue;

      // FE 관련 (C1~C4) — 별도 처리
      if (item.itemCode?.startsWith('C')) {
        feItems.push(item);
        continue;
      }

      if (!processMap.has(pNo)) {
        processMap.set(pNo, { processNo: pNo, items: [] });
      }
      processMap.get(pNo).items.push(item);
    }

    // 공정번호 정렬 (숫자 순)
    const sortedProcessNos = [...processMap.keys()].sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (isNaN(na) && isNaN(nb)) return a.localeCompare(b);
      if (isNaN(na)) return 1;
      if (isNaN(nb)) return -1;
      return na - nb;
    });

    // ── 3. 엑셀 생성 ──
    const wb = new ExcelJS.Workbook();
    wb.creator = 'SMART FMEA';
    wb.created = new Date();

    // ═══════════════════════════════════════
    // Sheet 1: SA (구조분석)
    // ═══════════════════════════════════════
    const saSheet = wb.addWorksheet('SA 구조분석', { properties: { defaultColWidth: 20 } });

    // 헤더
    const saHeaders = [
      'L2-1.공정번호(A1)', 'L2-2.공정명(A2)', 'L2-3.공정기능(A3)', 'L2-4.제품특성(A4)',
      'L2-5.고장형태(A5)', 'L2-6.검출관리(A6)',
      '4M', 'L3-1.작업요소(B1)', 'L3-2.요소기능(B2)', 'L3-3.공정특성(B3)',
      'L3-4.고장원인(B4)', 'L3-5.예방관리(B5)', '특별특성'
    ];
    const headerRow = saSheet.addRow(saHeaders);
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    // 데이터 행
    for (const pNo of sortedProcessNos) {
      // 숫자 공정번호만 (YP, SP, USER 제외 — 이건 FE scope)
      if (isNaN(parseInt(pNo, 10))) continue;

      const proc = processMap.get(pNo);
      const items = proc.items;

      // 아이템코드별 정리
      const byCode = {};
      for (const it of items) {
        if (!byCode[it.itemCode]) byCode[it.itemCode] = [];
        byCode[it.itemCode].push(it);
      }

      const a1 = byCode['A1']?.[0]?.value || pNo;
      const a2 = byCode['A2']?.[0]?.value || '';
      const a3 = byCode['A3']?.[0]?.value || '';
      const a4List = byCode['A4'] || [];
      const a5List = byCode['A5'] || [];
      const b1List = byCode['B1'] || [];
      const b2List = byCode['B2'] || [];
      const b3List = byCode['B3'] || [];
      const b4List = byCode['B4'] || [];

      // 이 공정의 체인에서 A6/B5 값 수집
      const procChains = chains.filter(c => c.processNo === pNo);

      // B1 기준 (4M별) 행 생성
      const maxRows = Math.max(1, b4List.length, a5List.length, b1List.length);

      for (let i = 0; i < maxRows; i++) {
        const a4Val = a4List[Math.min(i, a4List.length - 1)]?.value || '';
        const a5Val = a5List[i]?.value || '';
        const a4SC = a4List[Math.min(i, a4List.length - 1)]?.specialChar || '';

        const b1 = b1List[i];
        const b1Val = b1?.value || '';
        const m4Val = b1?.m4 || b4List[i]?.m4 || '';
        const b2Val = b2List.find(x => x.m4 === m4Val)?.value || b2List[i]?.value || '';
        const b3Val = b3List.find(x => x.m4 === m4Val)?.value || b3List[i]?.value || '';
        const b4Val = b4List[i]?.value || '';

        // B5/A6: 해당 공정+4M 체인에서 찾기
        const matchChain = procChains.find(c => c.m4 === m4Val) || procChains[0];
        // B5/A6은 빈칸으로 남김 (사용자가 수동 입력)
        const b5Val = '';
        const a6Val = '';

        const row = saSheet.addRow([
          i === 0 ? a1 : '', // 공정번호 (첫행만)
          i === 0 ? a2 : '', // 공정명 (첫행만)
          i === 0 ? a3 : '', // 공정기능 (첫행만)
          a4Val,              // 제품특성
          a5Val,              // 고장형태
          a6Val,              // ★ 검출관리 (A6) - 사용자 입력
          m4Val,              // 4M
          b1Val,              // 작업요소
          b2Val,              // 요소기능
          b3Val,              // 공정특성
          b4Val,              // 고장원인
          b5Val,              // ★ 예방관리 (B5) - 사용자 입력
          a4SC,               // 특별특성
        ]);

        // 스타일
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
          };
          cell.alignment = { vertical: 'middle', wrapText: true };
          cell.font = { size: 10 };
        });

        // A6, B5 칸 강조 (노란색 — 사용자 입력 필요)
        const a6Cell = row.getCell(6);
        const b5Cell = row.getCell(12);
        a6Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        b5Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      }
    }

    // SA 시트 컬럼 너비
    saSheet.columns.forEach((col, idx) => {
      const widths = [8, 15, 35, 20, 25, 25, 6, 15, 25, 20, 30, 25, 8];
      col.width = widths[idx] || 15;
    });

    // ═══════════════════════════════════════
    // Sheet 2: FC (고장사슬)
    // ═══════════════════════════════════════
    const fcSheet = wb.addWorksheet('FC 고장사슬', { properties: { defaultColWidth: 18 } });

    const fcHeaders = [
      'FE구분', 'FE(고장영향)', 'L2-1.공정번호', 'FM(고장형태)',
      '4M', '작업요소(WE)', 'FC(고장원인)',
      'B5.예방관리', 'A6.검출관리',
      'O', 'D', 'AP'
    ];
    const fcHeaderRow = fcSheet.addRow(fcHeaders);
    fcHeaderRow.eachCell((cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };

      // B5, A6 헤더 강조
      if (colNum === 8 || colNum === 9) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6600' } };
      }
    });

    // 체인 데이터 → FC 시트 행
    for (const chain of chains) {
      const row = fcSheet.addRow([
        chain.feScope || '',
        chain.feValue || '',
        chain.processNo || '',
        chain.fmValue || '',
        chain.m4 || '',
        chain.workElement || '',
        chain.fcValue || '',
        '',  // ★ B5.예방관리 — 사용자 입력
        '',  // ★ A6.검출관리 — 사용자 입력
        '',  // O
        '',  // D
        '',  // AP
      ]);

      row.eachCell((cell, colNum) => {
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.font = { size: 10 };

        // B5, A6 칸 노란색 강조
        if (colNum === 8 || colNum === 9) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        }
      });
    }

    // FC 시트 컬럼 너비
    const fcWidths = [8, 25, 8, 30, 6, 15, 35, 25, 25, 5, 5, 5];
    fcSheet.columns.forEach((col, idx) => {
      col.width = fcWidths[idx] || 15;
    });

    // ═══════════════════════════════════════
    // Sheet 3: FE (고장영향) — 참고용
    // ═══════════════════════════════════════
    const feSheet = wb.addWorksheet('FE 고장영향', { properties: { defaultColWidth: 20 } });

    const feHeaders = ['FE구분(C1)', '차종(C2)', '범위(C3)', '고장영향(C4)'];
    const feHeaderRow = feSheet.addRow(feHeaders);
    feHeaderRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF548235' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    // FE 아이템을 processNo(=scope)별로 정리
    const feByScope = {};
    for (const fe of feItems) {
      const scope = fe.processNo || 'YP';
      if (!feByScope[scope]) feByScope[scope] = {};
      if (!feByScope[scope][fe.itemCode]) feByScope[scope][fe.itemCode] = [];
      feByScope[scope][fe.itemCode].push(fe.value);
    }

    for (const [scope, codes] of Object.entries(feByScope)) {
      const c1List = codes['C1'] || [];
      const c2List = codes['C2'] || [];
      const c3List = codes['C3'] || [];
      const c4List = codes['C4'] || [];
      const maxR = Math.max(1, c4List.length);
      for (let i = 0; i < maxR; i++) {
        const row = feSheet.addRow([
          i === 0 ? scope : '',
          c2List[i] || '',
          c3List[i] || '',
          c4List[i] || '',
        ]);
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
          };
          cell.font = { size: 10 };
        });
      }
    }

    feSheet.columns = [
      { width: 10 }, { width: 15 }, { width: 15 }, { width: 35 }
    ];

    // ── 4. 저장 ──
    const outputPath = path.join('C:', '00_LB세미콘FMEA', 'PFMEA_AU_BUMP_Import_v9.xlsx');
    await wb.xlsx.writeFile(outputPath);
    console.log(`\nExcel saved: ${outputPath}`);
    console.log(`  SA sheet: ${sortedProcessNos.filter(p => !isNaN(parseInt(p))).length} processes`);
    console.log(`  FC sheet: ${chains.length} chains (B5/A6 empty - fill in)`);
    console.log(`  FE sheet: ${feItems.length} items`);
    console.log(`\n★ B5.예방관리, A6.검출관리 칸은 노란색으로 표시됩니다.`);
    console.log(`  사용자가 값을 채운 후 Import하면 DB에 저장됩니다.`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
