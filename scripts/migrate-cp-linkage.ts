/**
 * CP 테이블에 linkedPfdNo, parentFmeaId 추가 마이그레이션
 * 
 * CP ID 패턴에서 연동 PFD/FMEA ID를 자동 생성
 * 실행: npx tsx scripts/migrate-cp-linkage.ts
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

async function migrateCpLinkage() {
    console.log('='.repeat(60));
    console.log('🚀 CP 연동 정보 마이그레이션 시작');
    console.log('='.repeat(60));
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ 설정됨' : '❌ 없음'}`);

    try {
        // 1. 모든 CP 조회
        const controlPlans = await prisma.cpRegistration.findMany({
            select: {
                id: true,
                cpNo: true,
                linkedPfdNo: true,
                fmeaId: true,
            }
        });

        console.log(`📋 총 ${controlPlans.length}개의 CP 조회됨`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const cp of controlPlans) {
            const cpNo = cp.cpNo?.toLowerCase() || '';

            // 이미 linkedPfdNo가 있으면 스킵
            if (cp.linkedPfdNo && cp.linkedPfdNo.trim() !== '') {
                console.log(`⏭️ [${cpNo}] 이미 연동 PFD 있음: ${cp.linkedPfdNo}`);
                skippedCount++;
                continue;
            }

            // CP ID에서 연동 PFD ID 생성
            // cp26-p001 → pfd26-p001
            // cpl26-p001 → pfd26-p001 (cpl → pfd)
            // cp26-m001-l01 → pfd26-m001-l01
            let linkedPfdNo = '';
            if (cpNo.startsWith('cpl')) {
                // cpl26-p001 → pfd26-p001
                linkedPfdNo = cpNo.replace(/^cpl/i, 'pfd');
            } else if (cpNo.startsWith('cp')) {
                // cp26-p001 → pfd26-p001
                linkedPfdNo = cpNo.replace(/^cp/i, 'pfd');
            } else {
                console.log(`⚠️ [${cpNo}] 알 수 없는 CP ID 패턴, 스킵`);
                skippedCount++;
                continue;
            }

            // FMEA ID도 없으면 생성
            let parentFmeaId = cp.fmeaId || '';
            if (!parentFmeaId || parentFmeaId.trim() === '') {
                if (cpNo.startsWith('cpl')) {
                    parentFmeaId = cpNo.replace(/^cpl/i, 'pfm');
                } else {
                    parentFmeaId = cpNo.replace(/^cp/i, 'pfm');
                }
            }

            // DB 업데이트
            await prisma.cpRegistration.update({
                where: { id: cp.id },
                data: {
                    linkedPfdNo,
                    fmeaId: parentFmeaId,
                    fmeaNo: parentFmeaId,
                }
            });

            console.log(`✅ [${cpNo}] 연동 추가: PFD=${linkedPfdNo}, FMEA=${parentFmeaId}`);
            updatedCount++;
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 마이그레이션 결과');
        console.log('='.repeat(60));
        console.log(`  - 총 레코드: ${controlPlans.length}개`);
        console.log(`  - 업데이트됨: ${updatedCount}개`);
        console.log(`  - 스킵됨: ${skippedCount}개`);
        console.log('='.repeat(60));

        // 2. 검증
        const verifyCount = await prisma.cpRegistration.count({
            where: {
                linkedPfdNo: { not: null }
            }
        });
        console.log(`\n✅ 검증: linkedPfdNo가 있는 CP 수: ${verifyCount}개`);

    } catch (error) {
        console.error('❌ 마이그레이션 실패:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

// 실행
migrateCpLinkage()
    .then(() => {
        console.log('\n🎉 CP 마이그레이션 완료!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('마이그레이션 오류:', error);
        process.exit(1);
    });
