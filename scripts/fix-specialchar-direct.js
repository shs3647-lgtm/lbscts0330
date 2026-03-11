/**
 * specialChar 직접 수정 스크립트
 * 1. 사용자 엑셀에서 specialChar 읽기
 * 2. DB pfmea_master_flat_items 직접 업데이트
 * 3. legacyData 내 processChars/productChars specialChar 업데이트
 */
const ExcelJS = require('exceljs');
const { Pool } = require('pg');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public',
});

function cellValueToString(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object' && v.richText) return v.richText.map(r => r.text || '').join('').trim();
  return String(v).trim();
}

async function run() {
  const client = await pool.connect();

  try {
    // ── 1. 최근 dataset 확인 ──
    const dsRes = await client.query(
      `SELECT id, "fmeaId", name FROM pfmea_master_datasets ORDER BY "createdAt" DESC LIMIT 3`
    );
    console.log('=== 최근 Master Datasets ===');
    dsRes.rows.forEach(r => console.log(`  ${r.id} | ${r.fmeaId} | ${r.name}`));

    if (dsRes.rows.length === 0) { console.log('Dataset 없음'); return; }

    // 모든 최근 dataset에 대해 처리
    for (const ds of dsRes.rows) {
      console.log(`\n=== Dataset: ${ds.fmeaId} (${ds.name}) ===`);

      // 현재 specialChar 상태
      const scCheck = await client.query(
        `SELECT "itemCode", COUNT(*) as total,
         COUNT(CASE WHEN "specialChar" IS NOT NULL AND "specialChar" != '' THEN 1 END) as sc_count
         FROM pfmea_master_flat_items
         WHERE "datasetId" = $1 AND "itemCode" IN ('A4', 'B3')
         GROUP BY "itemCode"`,
        [ds.id]
      );
      console.log('  현재 DB specialChar:');
      scCheck.rows.forEach(r => console.log(`    ${r.itemCode}: ${r.total}건 중 SC=${r.sc_count}건`));
    }

    // ── 2. 사용자 엑셀 파일에서 specialChar 매핑 수집 ──
    const excelPath = path.join('c:\\Users\\Administrator\\Downloads', '클로드_PFMEA_기초정보_데이터_20260223_v2_7_2_4.xlsx');
    console.log('\n=== 엑셀 파일에서 specialChar 수집 ===');
    console.log('  파일:', excelPath);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(excelPath);

    // A4: processNo + value → specialChar
    const a4Map = new Map(); // key: "processNo|value" → specialChar
    const b3Map = new Map();

    wb.eachSheet((sheet) => {
      const name = sheet.name;
      const isA4 = name.includes('A4') || name.includes('제품특성');
      const isB3 = name.includes('B3') || name.includes('공정특성');
      if (!isA4 && !isB3) return;

      const headers = [];
      const hmap = [];
      sheet.getRow(1).eachCell((cell, col) => {
        headers.push(cellValueToString(cell.value));
        hmap.push(col);
      });

      // specialChar col 찾기
      let scCol = 0;
      for (let i = 0; i < headers.length; i++) {
        const h = (headers[i] || '').replace(/\s/g, '');
        if (h.includes('특별특성') || h.includes('특별')) {
          scCol = hmap[i];
          break;
        }
      }
      if (scCol === 0) return;

      // 데이터 컬럼 찾기
      let dataCol = isB3 ? 3 : 2; // B3: col3=공정특성, A4: col2=제품특성
      // B3의 경우 4M 다음이 공정특성
      if (isB3) {
        for (let i = 0; i < headers.length; i++) {
          const h = (headers[i] || '').replace(/\s/g, '').toLowerCase();
          if (h.includes('공정특성') || h.includes('l3-3')) {
            dataCol = hmap[i];
            break;
          }
        }
      } else {
        for (let i = 0; i < headers.length; i++) {
          const h = (headers[i] || '').replace(/\s/g, '').toLowerCase();
          if (h.includes('제품특성') || h.includes('l2-4')) {
            dataCol = hmap[i];
            break;
          }
        }
      }

      for (let r = 2; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        const processNo = cellValueToString(row.getCell(1).value);
        const value = cellValueToString(row.getCell(dataCol).value);
        const sc = cellValueToString(row.getCell(scCol).value);
        if (!processNo || !value) continue;
        if (sc) {
          const key = `${processNo}|${value}`;
          if (isA4) a4Map.set(key, sc);
          if (isB3) b3Map.set(key, sc);
        }
      }
    });

    console.log(`  A4 specialChar 맵: ${a4Map.size}건`);
    a4Map.forEach((v, k) => console.log(`    ${k} → "${v}"`));
    console.log(`  B3 specialChar 맵: ${b3Map.size}건`);
    b3Map.forEach((v, k) => console.log(`    ${k} → "${v}"`));

    // ── 3. DB flatItems 업데이트 ──
    console.log('\n=== DB pfmea_master_flat_items 업데이트 ===');
    let updatedA4 = 0, updatedB3 = 0;

    for (const ds of dsRes.rows) {
      // A4 업데이트
      const a4Items = await client.query(
        `SELECT id, "processNo", value FROM pfmea_master_flat_items
         WHERE "datasetId" = $1 AND "itemCode" = 'A4'`,
        [ds.id]
      );
      for (const item of a4Items.rows) {
        const key = `${item.processNo}|${item.value}`;
        const sc = a4Map.get(key);
        if (sc) {
          await client.query(
            `UPDATE pfmea_master_flat_items SET "specialChar" = $1 WHERE id = $2`,
            [sc, item.id]
          );
          updatedA4++;
        }
      }

      // B3 업데이트
      const b3Items = await client.query(
        `SELECT id, "processNo", value FROM pfmea_master_flat_items
         WHERE "datasetId" = $1 AND "itemCode" = 'B3'`,
        [ds.id]
      );
      for (const item of b3Items.rows) {
        const key = `${item.processNo}|${item.value}`;
        const sc = b3Map.get(key);
        if (sc) {
          await client.query(
            `UPDATE pfmea_master_flat_items SET "specialChar" = $1 WHERE id = $2`,
            [sc, item.id]
          );
          updatedB3++;
        }
      }
    }
    console.log(`  A4 업데이트: ${updatedA4}건`);
    console.log(`  B3 업데이트: ${updatedB3}건`);

    // ── 4. legacyData 업데이트 ──
    console.log('\n=== legacyData specialChar 업데이트 ===');

    const legRes = await client.query(
      `SELECT id, "fmeaId", data FROM fmea_legacy_data ORDER BY "updatedAt" DESC LIMIT 3`
    );

    let legacyUpdated = 0;
    for (const leg of legRes.rows) {
      const data = leg.data;
      if (!data || !data.l2) continue;

      let changed = false;

      for (const proc of data.l2) {
        const processNo = proc.no || '';

        // L2 functions → productChars
        for (const func of (proc.functions || [])) {
          for (const pc of (func.productChars || [])) {
            const key = `${processNo}|${pc.name}`;
            const sc = a4Map.get(key);
            if (sc && !pc.specialChar) {
              pc.specialChar = sc;
              changed = true;
              legacyUpdated++;
            }
          }
        }

        // L3 → functions → processChars
        for (const we of (proc.l3 || [])) {
          for (const func of (we.functions || [])) {
            for (const pc of (func.processChars || [])) {
              const key = `${processNo}|${pc.name}`;
              const sc = b3Map.get(key);
              if (sc && !pc.specialChar) {
                pc.specialChar = sc;
                changed = true;
                legacyUpdated++;
              }
            }
          }
        }
      }

      if (changed) {
        await client.query(
          `UPDATE fmea_legacy_data SET data = $1, "updatedAt" = NOW() WHERE id = $2`,
          [JSON.stringify(data), leg.id]
        );
        console.log(`  ${leg.fmeaId}: ${legacyUpdated}건 업데이트 → DB 저장 완료`);
      } else {
        console.log(`  ${leg.fmeaId}: 변경 없음`);
      }
    }

    // ── 5. L2Functions / L3Functions atomic DB 업데이트 ──
    console.log('\n=== Atomic DB (L2/L3 Functions) 업데이트 ===');

    let atomicUpdated = 0;

    // L2Functions: productChar 매칭으로 specialChar 업데이트
    for (const [key, sc] of a4Map) {
      const [processNo, value] = key.split('|');
      // processNo에 해당하는 L2Structure 찾기 → L2Function.productChar 매칭
      const res = await client.query(
        `UPDATE l2_functions SET "specialChar" = $1
         WHERE "productChar" = $2
         AND "specialChar" IS NULL
         AND "l2StructId" IN (
           SELECT id FROM l2_structures WHERE no = $3
         )`,
        [sc, value, processNo]
      );
      atomicUpdated += res.rowCount;
    }

    // L3Functions: processChar 매칭으로 specialChar 업데이트
    for (const [key, sc] of b3Map) {
      const [processNo, value] = key.split('|');
      const res = await client.query(
        `UPDATE l3_functions SET "specialChar" = $1
         WHERE "processChar" = $2
         AND "specialChar" IS NULL
         AND "l2StructId" IN (
           SELECT id FROM l2_structures WHERE no = $3
         )`,
        [sc, value, processNo]
      );
      atomicUpdated += res.rowCount;
    }

    console.log(`  Atomic DB 업데이트: ${atomicUpdated}건`);

    // ── 6. 검증 ──
    console.log('\n=== 최종 검증 ===');
    for (const ds of dsRes.rows) {
      const verify = await client.query(
        `SELECT "itemCode", COUNT(*) as total,
         COUNT(CASE WHEN "specialChar" IS NOT NULL AND "specialChar" != '' THEN 1 END) as sc_count
         FROM pfmea_master_flat_items
         WHERE "datasetId" = $1 AND "itemCode" IN ('A4', 'B3')
         GROUP BY "itemCode"`,
        [ds.id]
      );
      console.log(`  ${ds.fmeaId}:`);
      verify.rows.forEach(r => console.log(`    ${r.itemCode}: ${r.total}건 중 SC=${r.sc_count}건`));
    }

    // legacyData 검증
    for (const leg of legRes.rows) {
      const data = leg.data;
      if (!data || !data.l2) continue;
      let pcSC = 0, prcSC = 0;
      for (const proc of data.l2) {
        for (const f of (proc.functions || [])) {
          for (const pc of (f.productChars || [])) {
            if (pc.specialChar) pcSC++;
          }
        }
        for (const we of (proc.l3 || [])) {
          for (const f of (we.functions || [])) {
            for (const pc of (f.processChars || [])) {
              if (pc.specialChar) prcSC++;
            }
          }
        }
      }
      console.log(`  legacyData ${leg.fmeaId}: A4 SC=${pcSC}건, B3 SC=${prcSC}건`);
    }

    console.log('\n✅ 완료! 브라우저에서 새로고침하면 특별특성이 보입니다.');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
