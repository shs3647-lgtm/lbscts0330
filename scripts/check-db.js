const { PrismaClient } = require('@prisma/client');

async function checkDB() {
  const prisma = new PrismaClient();

  try {
    const pfmeaProjects = await prisma.pfmeaProject.findMany();
    const dfmeaProjects = await prisma.dfmeaProject.findMany();
    const pfmeaWorksheets = await prisma.pfmeaWorksheet.findMany();

    console.log('=== DB 상태 ===');
    console.log('PFMEA Projects:', pfmeaProjects.length);
    console.log('DFMEA Projects:', dfmeaProjects.length);
    console.log('PFMEA Worksheets:', pfmeaWorksheets.length);

    if (pfmeaProjects.length > 0) {
      console.log('\nPFMEA Project IDs:', pfmeaProjects.map(p => p.id));
    }
    if (dfmeaProjects.length > 0) {
      console.log('\nDFMEA Project IDs:', dfmeaProjects.map(p => p.id));
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkDB();
