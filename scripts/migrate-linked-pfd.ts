/**
 * 기존 PFMEA 데이터에 linkedPfdNo, linkedCpNo 추가 마이그레이션
 * 
 * 실행: npx tsx scripts/migrate-linked-pfd.ts
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

// Prisma Client 초기화 (adapter-pg 사용)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
});

async function migrateLinkedPfd() {
    console.log('='.repeat(60));
    console.log('🚀 연동 PFD/CP 마이그레이션 시작');
    console.log('='.repeat(60));
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ 설정됨' : '❌ 없음'}`);

    try {
        // 1. 모든 FMEA 등록 정보 조회
        const registrations = await prisma.fmeaRegistration.findMany({
            select: {
                fmeaId: true,
                linkedPfdNo: true,
                linkedCpNo: true,
                subject: true,
            }
        });

        console.log(`📋 총 ${registrations.length}개의 FMEA 등록 정보 조회됨`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const reg of registrations) {
            const fmeaId = reg.fmeaId.toLowerCase();

            // 이미 linkedPfdNo가 있으면 스킵
            if (reg.linkedPfdNo && reg.linkedPfdNo.trim() !== '') {
                console.log(`⏭️ [${fmeaId}] 이미 연동 PFD 있음: ${reg.linkedPfdNo}`);
                skippedCount++;
                continue;
            }

            // FMEA ID에서 연동 PFD/CP ID 생성
            // pfm26-p001 → pfd26-p001
            // pfm26-m001-l01 → pfd26-m001-l01
            // dfm26-m001 → pfd26-m001 (Design FMEA도 처리)
            const linkedPfdNo = fmeaId.replace(/^(p|d)fm/i, 'pfd');
            const linkedCpNo = fmeaId.replace(/^(p|d)fm/i, 'cp');

            // DB 업데이트
            await prisma.fmeaRegistration.update({
                where: { fmeaId: reg.fmeaId },
                data: {
                    linkedPfdNo,
                    linkedCpNo,
                }
            });

            console.log(`✅ [${fmeaId}] 연동 추가: PFD=${linkedPfdNo}, CP=${linkedCpNo}`);
            updatedCount++;
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 마이그레이션 결과');
        console.log('='.repeat(60));
        console.log(`  - 총 레코드: ${registrations.length}개`);
        console.log(`  - 업데이트됨: ${updatedCount}개`);
        console.log(`  - 스킵됨 (이미 있음): ${skippedCount}개`);
        console.log('='.repeat(60));

        // 2. 검증: 업데이트 후 확인
        const verifyCount = await prisma.fmeaRegistration.count({
            where: {
                linkedPfdNo: { not: null }
            }
        });
        console.log(`\n✅ 검증: linkedPfdNo가 있는 레코드 수: ${verifyCount}개`);

    } catch (error) {
        console.error('❌ 마이그레이션 실패:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

// 실행
migrateLinkedPfd()
    .then(() => {
        console.log('\n🎉 마이그레이션 완료!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('마이그레이션 오류:', error);
        process.exit(1);
    });
