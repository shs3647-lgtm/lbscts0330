/**
 * PFD 설비/금형/지그 필드를 FMEA L3 구조에서 올바르게 매핑하는 스크립트
 * - PfdItem.fmeaL2Id로 L2Structure 조회
 * - L2 하위 L3Structure 중 m4='MC' (Machine)인 항목의 name을 equipment로 설정
 */
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const MC_CODES = ['MC', 'MACHINE', 'MD', 'JG'];

async function fixPfdEquipmentFromFmea() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // 1. fmeaL2Id가 있는 PfdItem 조회 (FMEA 연동된 항목만)
  const pfdItems = await prisma.pfdItem.findMany({
    where: {
      fmeaL2Id: { not: null },
      isDeleted: false,
    },
    select: { id: true, fmeaL2Id: true, equipment: true, processNo: true },
  });

  console.log(`Found ${pfdItems.length} FMEA-linked PfdItems`);

  // 2. 고유 L2 ID 수집
  const l2Ids = [...new Set(pfdItems.map(item => item.fmeaL2Id).filter(Boolean))];
  console.log(`Unique L2 IDs: ${l2Ids.length}`);

  // 3. 각 L2의 MC L3 이름 조회
  const l2EquipmentMap = new Map();
  for (const l2Id of l2Ids) {
    const l3s = await prisma.l3Structure.findMany({
      where: { l2Id },
      select: { m4: true, name: true },
    });

    const mcNames = l3s
      .filter(l3 => {
        const m4 = (l3.m4 || '').trim().toUpperCase();
        return MC_CODES.includes(m4) && l3.name && l3.name.trim().length > 0;
      })
      .map(l3 => l3.name.trim());

    l2EquipmentMap.set(l2Id, mcNames.join(', '));
  }

  // 4. PfdItem 업데이트
  let updated = 0;
  for (const item of pfdItems) {
    const newEquipment = l2EquipmentMap.get(item.fmeaL2Id) || '';
    if (item.equipment !== newEquipment) {
      await prisma.pfdItem.update({
        where: { id: item.id },
        data: { equipment: newEquipment },
      });
      updated++;
      if (updated <= 10) {
        console.log(`  P-No ${item.processNo}: "${item.equipment}" -> "${newEquipment}"`);
      }
    }
  }

  if (updated > 10) {
    console.log(`  ... and ${updated - 10} more`);
  }
  console.log(`Updated ${updated} PfdItems with correct equipment data`);

  await prisma.$disconnect();
  await pool.end();
  console.log('Done');
}

fixPfdEquipmentFromFmea().catch(e => { console.error(e); process.exit(1); });
