/**
 * LLD 추천 엑셀 → DB 직접 임포트 스크립트
 * Usage: npx tsx scripts/import-lld-recommend.ts
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
  const wb = XLSX.readFile('D:/00 fmea개발/LLD/LLD_Recommend_20260309_보완.xlsx');
  const ws = wb.Sheets['LLD추천결과'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[][] = (XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]).slice(1);

  // Extract unique LLD records (by lldNo + applyTo)
  const seen = new Set<string>();
  const items: Array<{
    lldNo: string; classification: string; applyTo: string;
    processNo: string; processName: string; failureMode: string;
    cause: string; improvement: string;
    occurrence: number | null; detection: number | null;
    status: string; sourceType: string; priority: number;
  }> = [];

  for (const r of rows) {
    const lldNo = String(r[8] || '').trim();
    const target = String(r[6] || '').trim();
    if (lldNo === '' || lldNo === '-') continue;
    const applyTo = target === '검출' ? 'detection' : 'prevention';
    const key = lldNo + '__' + applyTo;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      lldNo,
      classification: 'CIP',
      applyTo,
      processNo: String(r[1] || '').trim(),
      processName: String(r[2] || '').trim(),
      failureMode: String(r[3] || '').trim(),
      cause: String(r[4] || '').trim(),
      improvement: String(r[9] || '').trim(),
      occurrence: (applyTo === 'prevention' && r[10] !== '-' && r[10] != null) ? Number(r[10]) : null,
      detection: (applyTo === 'detection' && r[11] !== '-' && r[11] != null) ? Number(r[11]) : null,
      status: 'G',
      sourceType: 'import',
      priority: 10,
    });
  }

  console.log(`Unique LLD records: ${items.length}`);
  console.log(`  Prevention: ${items.filter(l => l.applyTo === 'prevention').length}`);
  console.log(`  Detection:  ${items.filter(l => l.applyTo === 'detection').length}`);

  // Check current DB
  const currentDet = await prisma.lLDFilterCode.findMany({
    where: { applyTo: 'detection' },
    select: { id: true, lldNo: true, improvement: true, processName: true },
  });
  console.log(`\nCurrent detection in DB: ${currentDet.length}`);
  for (const d of currentDet) {
    console.log(`  ${d.lldNo} | ${d.processName} | ${(d.improvement || '').substring(0, 60)}`);
  }

  // Upsert each record
  let created = 0;
  let updated = 0;
  for (const l of items) {
    const existing = await prisma.lLDFilterCode.findFirst({
      where: { lldNo: l.lldNo, applyTo: l.applyTo },
    });

    if (existing) {
      await prisma.lLDFilterCode.update({
        where: { id: existing.id },
        data: {
          processNo: l.processNo,
          processName: l.processName,
          failureMode: l.failureMode,
          cause: l.cause,
          improvement: l.improvement,
          occurrence: l.occurrence,
          detection: l.detection,
          status: l.status,
          sourceType: l.sourceType,
          priority: l.priority,
        },
      });
      updated++;
    } else {
      await prisma.lLDFilterCode.create({
        data: {
          lldNo: l.lldNo,
          classification: l.classification,
          applyTo: l.applyTo,
          processNo: l.processNo,
          processName: l.processName,
          productName: '',
          failureMode: l.failureMode,
          cause: l.cause,
          improvement: l.improvement,
          occurrence: l.occurrence,
          detection: l.detection,
          vehicle: '',
          target: '제조',
          m4Category: '',
          location: '',
          completedDate: '',
          status: l.status,
          sourceType: l.sourceType,
          priority: l.priority,
        },
      });
      created++;
    }
  }

  // Fix old detection records that contain PC-like content
  const pcKeywords = ['검교정 이력', '자동알림', 'Gage R&R', 'DOE 기반', '주기 단축', '재교정'];
  const allDetection = await prisma.lLDFilterCode.findMany({
    where: { applyTo: 'detection' },
  });

  let fixed = 0;
  for (const rec of allDetection) {
    const imp = rec.improvement || '';
    const isPC = pcKeywords.some(kw => imp.includes(kw));
    if (isPC) {
      await prisma.lLDFilterCode.update({
        where: { id: rec.id },
        data: { applyTo: 'prevention' },
      });
      fixed++;
      console.log(`  Fixed ${rec.lldNo}: detection → prevention ("${imp.substring(0, 50)}...")`);
    }
  }

  console.log(`\nResult: created=${created}, updated=${updated}, fixed(det→prev)=${fixed}`);

  // Verify
  const finalPrev = await prisma.lLDFilterCode.count({ where: { applyTo: 'prevention' } });
  const finalDet = await prisma.lLDFilterCode.count({ where: { applyTo: 'detection' } });
  console.log(`Final DB: prevention=${finalPrev}, detection=${finalDet}`);

  console.log('\nNew detection records in DB:');
  const newDet = await prisma.lLDFilterCode.findMany({
    where: { applyTo: 'detection' },
    select: { lldNo: true, processName: true, detection: true, improvement: true },
    orderBy: { lldNo: 'asc' },
  });
  for (const d of newDet) {
    console.log(`  ${d.lldNo} | ${d.processName} | D=${d.detection} | ${(d.improvement || '').substring(0, 55)}`);
  }

  await prisma.$disconnect();
  console.log('\nDone!');
}

main().catch(async (e) => {
  console.error('Error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
