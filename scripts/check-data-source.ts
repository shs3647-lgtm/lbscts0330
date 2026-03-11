/**
 * 가열성형 데이터 출처 조사 스크립트
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  try {
    // 1. pfm26-m001의 parentFmeaId 확인
    console.log('=== 1. pfm26-m001 프로젝트 정보 ===');
    const project = await prisma.fmeaProject.findFirst({
      where: { fmeaId: { contains: 'pfm26-m001', mode: 'insensitive' } },
      select: { fmeaId: true, parentFmeaId: true, fmeaType: true }
    });
    console.log(JSON.stringify(project, null, 2));

    // 2. 가열성형이 포함된 L2Structure 찾기
    console.log('\n=== 2. 가열성형 포함된 L2Structure ===');
    const l2WithHeating = await prisma.l2Structure.findMany({
      where: { name: { contains: '가열성형' } },
      select: { id: true, fmeaId: true, name: true, no: true }
    });
    console.log(JSON.stringify(l2WithHeating, null, 2));

    // 3. pfm26-m001의 L2 데이터 확인
    console.log('\n=== 3. pfm26-m001의 L2Structure ===');
    const pfm26L2 = await prisma.l2Structure.findMany({
      where: { fmeaId: { contains: 'pfm26-m001', mode: 'insensitive' } },
      select: { id: true, fmeaId: true, name: true, no: true }
    });
    console.log(JSON.stringify(pfm26L2, null, 2));

    // 4. 상위 FMEA가 있다면 해당 L2 데이터도 확인
    if (project?.parentFmeaId) {
      console.log(`\n=== 4. 상위 FMEA(${project.parentFmeaId})의 L2Structure ===`);
      const parentL2 = await prisma.l2Structure.findMany({
        where: { fmeaId: { contains: project.parentFmeaId, mode: 'insensitive' } },
        select: { id: true, fmeaId: true, name: true, no: true }
      });
      console.log(JSON.stringify(parentL2, null, 2));
    }

    // 5. 레거시 데이터에서 가열성형 찾기
    console.log('\n=== 5. 레거시 데이터에서 가열성형 검색 ===');
    const allLegacy = await prisma.fmeaLegacyData.findMany({
      select: { fmeaId: true, data: true }
    });
    for (const ld of allLegacy) {
      const dataStr = JSON.stringify(ld.data);
      if (dataStr.includes('가열성형')) {
        console.log(`발견! FMEA ID: ${ld.fmeaId}`);
      }
    }

    // 6. 워크시트 데이터에서 가열성형 찾기
    console.log('\n=== 6. 워크시트 데이터에서 가열성형 검색 ===');
    const allWorksheet = await prisma.fmeaWorksheetData.findMany({
      select: { fmeaId: true, l2Data: true }
    });
    for (const ws of allWorksheet) {
      const dataStr = JSON.stringify(ws.l2Data);
      if (dataStr.includes('가열성형')) {
        console.log(`발견! FMEA ID: ${ws.fmeaId}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
