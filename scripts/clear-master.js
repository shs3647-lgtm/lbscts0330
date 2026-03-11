const { PrismaClient } = require('@prisma/client');

async function clearMaster() {
    const prisma = new PrismaClient();
    try {
        const result = await prisma.pfmeaMasterFlatItem.deleteMany({});
        console.log('삭제 완료:', result.count, '건');
    } catch (e) {
        console.error('오류:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

clearMaster();
