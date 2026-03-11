const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const projects = await prisma.fMEAProject.findMany({
      select: { id: true, name: true },
      take: 5
    });
    console.log('FMEA Projects:');
    console.log(JSON.stringify(projects, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
