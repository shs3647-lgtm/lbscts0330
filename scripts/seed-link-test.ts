// @ts-nocheck - wsRegistration/pmRegistration 모델 미존재
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Linked Data (CP -> WS/PM)...');

    const CP_NO = 'CP26-TEST-001';

    // 1. Create a Master Control Plan
    const cp = await prisma.cpRegistration.upsert({
        where: { cpNo: CP_NO },
        update: {}, // No update if exists
        create: {
            cpNo: CP_NO,
            subject: 'Integration Test Control Plan',
            cpType: 'P',
            status: 'confirmed',
            cpResponsibleName: 'Tester',
            companyName: 'Test Company'
        }
    });

    console.log(`Created CP: ${cp.cpNo}`);

    // 2. Create Linked WS Item
    const ws = await prisma.wsRegistration.create({
        data: {
            wsNo: 'WS26-LINK-001',
            subject: 'Linked Assembly Inst',
            processName: 'Assembly',
            revision: 'Rev.01',
            manager: 'Worker A',
            status: 'active',
            cpNo: CP_NO, // ★ LINKAGE
            processNo: 'OP-10' // Assume this process step exists in CP
        }
    });
    console.log(`Created Linked WS: ${ws.wsNo} -> ${ws.cpNo}`);

    // 3. Create Linked PM Item
    const pm = await prisma.pmRegistration.create({
        data: {
            pmNo: 'PM26-LINK-001',
            subject: 'Linked Press Check',
            machineName: 'Press-01',
            maintenanceType: 'Periodic',
            manager: 'Maintenance B',
            status: 'planned',
            cpNo: CP_NO, // ★ LINKAGE
            processNo: 'OP-20' // Assume this process step exists in CP
        }
    });
    console.log(`Created Linked PM: ${pm.pmNo} -> ${pm.cpNo}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
