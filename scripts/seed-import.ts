/**
 * @file seed-import.ts
 * @description Import 엑셀 시드 — 프로젝트 생성 + 위치기반 Import + DB 저장 자동 실행
 *
 * 사용법: npx tsx scripts/seed-import.ts [fmeaId] [excelPath]
 * 기본값: fmeaId=pfm26-m001, excelPath=data/master-fmea/seed_import_12inch_AuBump_v5.xlsx
 */

const BASE = 'http://localhost:3000/api';

async function seed() {
  const fmeaId = process.argv[2] || 'pfm26-m001';
  const excelPath = process.argv[3] || 'data/master-fmea/seed_import_12inch_AuBump_v5.xlsx';

  console.log(`\n=== SEED IMPORT ===`);
  console.log(`fmeaId: ${fmeaId}`);
  console.log(`excel: ${excelPath}`);

  // 1. 프로젝트 존재 확인
  console.log('\n[1/5] 프로젝트 확인...');
  const projRes = await fetch(`${BASE}/fmea/projects`);
  const projData = await projRes.json();
  const exists = (projData.projects || []).some((p: any) => p.id === fmeaId);

  if (!exists) {
    console.log(`  프로젝트 ${fmeaId} 없음 → 생성`);
    const createRes = await fetch(`${BASE}/triplet/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        docType: 'master',
        subject: '12 INCH AU BUMP (Seed)',
        productName: '12 INCH AU BUMP',
        customerName: 'LBS',
        companyName: 'LBS',
      }),
    });
    const createData = await createRes.json();
    if (createData.success) {
      console.log(`  생성 완료: ${createData.pfmeaId}`);
      // fmeaId가 다를 수 있으므로 업데이트
      if (createData.pfmeaId !== fmeaId) {
        console.log(`  ⚠️ 생성된 ID: ${createData.pfmeaId} (요청: ${fmeaId})`);
      }
    } else {
      console.log(`  생성 실패: ${createData.error}`);
    }
  } else {
    console.log(`  프로젝트 ${fmeaId} 존재 ✓`);
  }

  // 2. 엑셀 파싱 (position-parser)
  console.log('\n[2/5] 엑셀 파싱...');
  const ExcelJS = (await import('exceljs')).default;
  const { parsePositionBasedWorkbook, atomicToFlatData } = await import('../src/lib/fmea/position-parser');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath);
  const atomicData = parsePositionBasedWorkbook(wb, fmeaId);

  console.log(`  L2: ${atomicData.l2Structures.length}`);
  console.log(`  L3: ${atomicData.l3Structures.length}`);
  console.log(`  FM: ${atomicData.failureModes.length}`);
  console.log(`  FE: ${atomicData.failureEffects.length}`);
  console.log(`  FC: ${atomicData.failureCauses.length}`);
  console.log(`  FL: ${atomicData.failureLinks.length}`);
  console.log(`  RA: ${atomicData.riskAnalyses.length}`);

  // 3. DB 저장 (save-position-import)
  console.log('\n[3/5] DB 저장...');
  const saveRes = await fetch(`${BASE}/fmea/save-position-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId, atomicData, force: true }),
  });
  const saveData = await saveRes.json();
  if (saveData.success) {
    console.log(`  저장 성공:`, JSON.stringify(saveData.atomicCounts));
  } else {
    console.log(`  저장 실패: ${saveData.error}`);
    return;
  }

  // 4. verify-counts 검증
  console.log('\n[4/5] DB 검증...');
  const vcRes = await fetch(`${BASE}/fmea/verify-counts?fmeaId=${fmeaId}`);
  const vcData = await vcRes.json();
  if (vcData.success) {
    const c = vcData.counts;
    console.log(`  A1=${c.A1} A5=${c.A5} A6=${c.A6}`);
    console.log(`  B1=${c.B1} B3=${c.B3} B4=${c.B4} B5=${c.B5}`);
    console.log(`  C1=${c.C1} C4=${c.C4}`);

    // 기대값 비교
    const flat = atomicToFlatData(atomicData);
    const expected: Record<string, number> = {};
    for (const f of flat) expected[f.itemCode] = (expected[f.itemCode] || 0) + 1;

    let allMatch = true;
    for (const [code, exp] of Object.entries(expected)) {
      const actual = c[code] ?? 0;
      if (actual !== exp) {
        console.log(`  ⚠️ ${code}: 기대=${exp} 실제=${actual}`);
        allMatch = false;
      }
    }
    if (allMatch) console.log(`  ✅ 전체 일치`);
  }

  // 5. flatData 저장 (미리보기용)
  console.log('\n[5/5] FlatData 저장...');
  const flat = atomicToFlatData(atomicData);
  console.log(`  flatData: ${flat.length}건`);

  console.log('\n=== SEED COMPLETE ===\n');
}

seed().catch(e => {
  console.error('SEED ERROR:', e);
  process.exit(1);
});
