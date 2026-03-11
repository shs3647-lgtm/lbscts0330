// scripts/clear-test-data.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearTestData() {
    console.log('🗑️ 테스트 데이터 삭제 시작...');

    // 1. ProjectLinkage 삭제
    const linkageResult = await prisma.projectLinkage.deleteMany({
        where: {
            OR: [
                { apqpNo: { contains: 'test' } },
                { apqpNo: { contains: 'e2e' } },
            ]
        }
    });
    console.log(`ProjectLinkage 삭제: ${linkageResult.count}건`);

    // 2. FmeaRegistration 삭제 (FmeaProject와 연결됨)
    const fmeaRegResult = await prisma.fmeaRegistration.deleteMany({
        where: {
            OR: [
                { fmeaId: { contains: 'test' } },
                { fmeaId: { contains: 'e2e' } },
            ]
        }
    });
    console.log(`FmeaRegistration 삭제: ${fmeaRegResult.count}건`);

    // 3. FmeaProject 삭제
    const fmeaProjResult = await prisma.fmeaProject.deleteMany({
        where: {
            OR: [
                { fmeaId: { contains: 'test' } },
                { fmeaId: { contains: 'e2e' } },
            ]
        }
    });
    console.log(`FmeaProject 삭제: ${fmeaProjResult.count}건`);

    // 4. CpRegistration 삭제
    const cpResult = await prisma.cpRegistration.deleteMany({
        where: {
            OR: [
                { cpNo: { contains: 'test' } },
                { cpNo: { contains: 'e2e' } },
            ]
        }
    });
    console.log(`CpRegistration 삭제: ${cpResult.count}건`);

    // 5. PfdRegistration 삭제
    const pfdResult = await prisma.pfdRegistration.deleteMany({
        where: {
            OR: [
                { pfdNo: { contains: 'test' } },
                { pfdNo: { contains: 'e2e' } },
            ]
        }
    });
    console.log(`PfdRegistration 삭제: ${pfdResult.count}건`);

    // 6. ApqpCftMember 삭제
    const cftResult = await prisma.apqpCftMember.deleteMany({
        where: {
            OR: [
                { apqpNo: { contains: 'test' } },
                { apqpNo: { contains: 'e2e' } },
            ]
        }
    });
    console.log(`ApqpCftMember 삭제: ${cftResult.count}건`);

    // 7. ApqpRegistration 삭제
    const apqpResult = await prisma.apqpRegistration.deleteMany({
        where: {
            OR: [
                { apqpNo: { contains: 'test' } },
                { apqpNo: { contains: 'e2e' } },
            ]
        }
    });
    console.log(`ApqpRegistration 삭제: ${apqpResult.count}건`);

    console.log('✅ 테스트 데이터 삭제 완료!');
    await prisma.$disconnect();
}

clearTestData().catch(e => {
    console.error('❌ 오류:', e);
    prisma.$disconnect();
    process.exit(1);
});
