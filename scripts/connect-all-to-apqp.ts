/**
 * 모든 FMEA → APQP 연결 + 고객사 동기화
 * 
 * APQP 연결이 없는 FMEA도 기본 APQP에 연결하고 고객사 정보 동기화
 * 실행: npx tsx scripts/connect-all-to-apqp.ts
 * 
 * @created 2026-01-29
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function connectAllToApqp() {
    console.log('='.repeat(60));
    console.log('🚀 모든 FMEA → APQP 연결 + 고객사 동기화');
    console.log('='.repeat(60));

    try {
        // 1. 기본 APQP 조회 (가장 최근 것 사용)
        const defaultApqp = await prisma.apqpRegistration.findFirst({
            orderBy: { createdAt: 'desc' },
            select: {
                apqpNo: true,
                customerName: true,
                modelYear: true,
                subject: true,
            }
        });

        if (!defaultApqp) {
            console.log('❌ APQP 프로젝트가 없습니다. 먼저 APQP를 생성해주세요.');
            return;
        }

        console.log(`📌 기본 APQP: ${defaultApqp.apqpNo} (고객: ${defaultApqp.customerName})`);

        // 2. 모든 FMEA 프로젝트 조회
        const fmeaProjects = await prisma.fmeaProject.findMany({
            include: { registration: true }
        });

        console.log(`📋 총 FMEA 프로젝트: ${fmeaProjects.length}개`);

        let connectedCount = 0;
        let customerUpdated = 0;

        for (const fmea of fmeaProjects) {
            const updates: any = {};
            const regUpdates: any = {};
            let needsFmeaUpdate = false;
            let needsRegUpdate = false;

            // APQP 연결이 없으면 기본 APQP에 연결
            if (!fmea.parentApqpNo || fmea.parentApqpNo.trim() === '') {
                updates.parentApqpNo = defaultApqp.apqpNo;
                needsFmeaUpdate = true;
                connectedCount++;
                console.log(`  🔗 ${fmea.fmeaId}: APQP 연결 → ${defaultApqp.apqpNo}`);
            }

            // 고객사가 없으면 APQP에서 가져옴
            const currentCustomer = fmea.registration?.customerName || '';
            if (!currentCustomer || currentCustomer.trim() === '') {
                regUpdates.customerName = defaultApqp.customerName || '';
                needsRegUpdate = true;
                customerUpdated++;
                console.log(`  👤 ${fmea.fmeaId}: 고객사 → ${defaultApqp.customerName}`);
            }

            // 모델연도가 없으면 APQP에서 가져옴
            const currentModelYear = fmea.registration?.modelYear || '';
            if (!currentModelYear || currentModelYear.trim() === '') {
                regUpdates.modelYear = defaultApqp.modelYear || '';
            }

            // FMEA 프로젝트 업데이트
            if (needsFmeaUpdate) {
                await prisma.fmeaProject.update({
                    where: { fmeaId: fmea.fmeaId },
                    data: updates
                });
            }

            // Registration 업데이트
            if (needsRegUpdate) {
                if (fmea.registration) {
                    await prisma.fmeaRegistration.update({
                        where: { fmeaId: fmea.fmeaId },
                        data: regUpdates
                    });
                } else {
                    await prisma.fmeaRegistration.create({
                        data: {
                            fmeaId: fmea.fmeaId,
                            customerName: defaultApqp.customerName || '',
                            modelYear: defaultApqp.modelYear || '',
                            subject: defaultApqp.subject || fmea.fmeaId,
                        }
                    });
                }
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 결과');
        console.log('='.repeat(60));
        console.log(`  - APQP 연결됨: ${connectedCount}건`);
        console.log(`  - 고객사 업데이트: ${customerUpdated}건`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ 실패:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

connectAllToApqp()
    .then(() => {
        console.log('\n🎉 완료!');
        process.exit(0);
    })
    .catch(() => process.exit(1));
