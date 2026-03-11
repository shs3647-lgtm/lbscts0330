/**
 * LLD 검출관리 엑셀 → DB 직접 임포트 스크립트
 * - 엑셀 27건을 upsert (lldNo 기준)
 * - 기존 detection-only LLD(엑셀에 없는 것) 삭제
 * - prevention과 같은 lldNo인 경우 detection으로 덮어쓰기
 * Usage: npx tsx scripts/import-lld-detection.ts
 */
import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const wb = XLSX.readFile('D:/00 fmea개발/LLD/DETECTION/LLD_Detection_20260309_보완v2.xlsx');
  const ws = wb.Sheets['LLD_검출관리'];
  if (!ws) {
    console.error('시트 "LLD_검출관리" 없음');
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  console.log(`엑셀 행 수: ${rows.length}`);

  // 1. 현재 DB 상태 확인
  const allRecords = await prisma.lLDFilterCode.findMany({ orderBy: { lldNo: 'asc' } });
  const detRecords = allRecords.filter(r => r.applyTo === 'detection');
  const prevRecords = allRecords.filter(r => r.applyTo === 'prevention');
  console.log(`현재 DB — detection: ${detRecords.length}건, prevention: ${prevRecords.length}건, 합계: ${allRecords.length}건`);

  // 2. 엑셀에 없는 기존 detection 레코드 삭제
  const excelNos = new Set(rows.map(r => String(r['LLD_No'] || '').trim()).filter(Boolean));
  const toDelete = detRecords.filter(r => !excelNos.has(r.lldNo));
  if (toDelete.length > 0) {
    console.log(`\n기존 detection 중 엑셀에 없는 ${toDelete.length}건 삭제:`);
    for (const r of toDelete) {
      await prisma.lLDFilterCode.delete({ where: { id: r.id } });
      console.log(`  - ${r.lldNo}`);
    }
  }

  // 3. 엑셀 27건 upsert (lldNo 기준)
  const CLS_SET = new Set(['RMA', 'ABN', 'CIP', 'ECN', 'FieldIssue', 'DevIssue']);
  let upserted = 0;
  let overwritten = 0;

  for (const row of rows) {
    const lldNo = String(row['LLD_No'] || '').trim();
    const improvement = String(row['개선대책'] || '').trim();
    if (!lldNo || !improvement) continue;

    const cls = CLS_SET.has(String(row['구분'] || '')) ? String(row['구분']) : 'CIP';
    const dVal = typeof row['D값'] === 'number' ? row['D값'] : null;

    const data = {
      classification: cls,
      applyTo: 'detection',
      processNo: String(row['공정번호'] || '').trim(),
      processName: String(row['공정명'] || '').trim(),
      productName: String(row['제품명'] || '').trim(),
      failureMode: String(row['고장형태'] || '').trim(),
      cause: String(row['고장원인'] || '').trim(),
      occurrence: typeof row['O값'] === 'number' ? row['O값'] : null,
      detection: dVal as number | null,
      improvement,
      vehicle: String(row['차종'] || '').trim(),
      target: String(row['대상'] || '제조').trim(),
      m4Category: '',
      location: '',
      completedDate: '',
      status: 'G',
      sourceType: 'import',
      priority: 0,
    };

    // 기존에 같은 lldNo가 있는지 확인 (prevention이든 detection이든)
    const existing = allRecords.find(r => r.lldNo === lldNo);
    if (existing) {
      // 기존 레코드를 detection으로 덮어쓰기
      await prisma.lLDFilterCode.update({
        where: { id: existing.id },
        data,
      });
      const wasPrev = existing.applyTo === 'prevention';
      console.log(`  ↺ ${lldNo} | ${wasPrev ? 'prev→det' : 'det→det'} | ${improvement.substring(0, 50)} | D:${dVal}`);
      if (wasPrev) overwritten++;
    } else {
      // 신규 생성
      await prisma.lLDFilterCode.create({
        data: { lldNo, ...data },
      });
      console.log(`  + ${lldNo} | new | ${improvement.substring(0, 50)} | D:${dVal}`);
    }
    upserted++;
  }

  console.log(`\nupsert 완료: ${upserted}건 (prevention→detection 전환: ${overwritten}건)`);

  // 4. 최종 확인
  const finalAll = await prisma.lLDFilterCode.findMany({ orderBy: { lldNo: 'asc' } });
  const finalDet = finalAll.filter(r => r.applyTo === 'detection');
  const finalPrev = finalAll.filter(r => r.applyTo === 'prevention');
  console.log(`\n최종 DB — detection: ${finalDet.length}건, prevention: ${finalPrev.length}건, 합계: ${finalAll.length}건`);

  await prisma.$disconnect();
  pool.end();
  console.log('\nDone!');
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
