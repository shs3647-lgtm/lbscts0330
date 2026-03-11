/**
 * APQP → FMEA 고객사 정보 동기화 마이그레이션
 * 
 * APQP에 연결된 FMEA의 고객사 정보가 비어있으면 APQP에서 가져와 채움
 * 실행: npx tsx scripts/sync-apqp-customer.ts
 * 
 * @created 2026-01-29
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// .env 파일 로드
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Prisma Client 초기화
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
});

async function syncApqpCustomer() {
    console.log('='.repeat(60));
    console.log('🚀 APQP → FMEA 고객사 정보 동기화 시작');
    console.log('='.repeat(60));

    try {
        // 1. 모든 APQP 프로젝트 조회
        const apqps = await prisma.apqpRegistration.findMany({
            select: {
                apqpNo: true,
                customerName: true,
                companyName: true,
                subject: true,
                modelYear: true,
            }
        });

        console.log(`📋 APQP 프로젝트: ${apqps.length}개`);
        apqps.forEach(a => {
            console.log(`  - ${a.apqpNo}: 고객사=${a.customerName}`);
        });

        // 2. APQP와 연결된 FMEA 프로젝트 조회 및 업데이트
        let updated = 0;
        for (const apqp of apqps) {
            // APQP에 연결된 FMEA 프로젝트 찾기
            const fmeaProjects = await prisma.fmeaProject.findMany({
                where: { parentApqpNo: apqp.apqpNo },
                include: { registration: true }
            });

            console.log(`\n📌 ${apqp.apqpNo} (고객: ${apqp.customerName})`);
            console.log(`   연결된 FMEA: ${fmeaProjects.length}개`);

            for (const fmea of fmeaProjects) {
                const currentCustomer = fmea.registration?.customerName || '';

                // 고객사가 비어있으면 APQP에서 가져옴
                if (!currentCustomer || currentCustomer.trim() === '') {
                    if (fmea.registration) {
                        await prisma.fmeaRegistration.update({
                            where: { fmeaId: fmea.fmeaId },
                            data: {
                                customerName: apqp.customerName || '',
                                // 모델연도도 비어있으면 APQP에서 가져옴
                                modelYear: fmea.registration.modelYear || apqp.modelYear || '',
                            }
                        });
                        console.log(`   ✅ ${fmea.fmeaId}: 고객사 업데이트 → ${apqp.customerName}`);
                        updated++;
                    } else {
                        // registration이 없으면 생성
                        await prisma.fmeaRegistration.create({
                            data: {
                                fmeaId: fmea.fmeaId,
                                customerName: apqp.customerName || '',
                                modelYear: apqp.modelYear || '',
                                subject: apqp.subject || fmea.fmeaId,
                            }
                        });
                        console.log(`   ✅ ${fmea.fmeaId}: registration 생성 + 고객사 → ${apqp.customerName}`);
                        updated++;
                    }
                } else {
                    console.log(`   ⏭️ ${fmea.fmeaId}: 이미 고객사 있음 (${currentCustomer})`);
                }
            }
        }

        // 3. parentApqpNo 없는 FMEA도 확인
        console.log('\n📌 APQP 미연결 FMEA 확인');
        const orphanFmeas = await prisma.fmeaProject.findMany({
            where: {
                OR: [
                    { parentApqpNo: null },
                    { parentApqpNo: '' }
                ]
            },
            include: { registration: true }
        });

        for (const fmea of orphanFmeas) {
            const currentCustomer = fmea.registration?.customerName || '';
            if (!currentCustomer || currentCustomer.trim() === '') {
                console.log(`   ⚠️ ${fmea.fmeaId}: APQP 미연결 + 고객사 없음`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`📊 결과: ${updated}건 업데이트`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ 동기화 실패:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

// 실행
syncApqpCustomer()
    .then(() => {
        console.log('\n🎉 APQP → FMEA 고객사 동기화 완료!');
        process.exit(0);
    })
    .catch(() => process.exit(1));
