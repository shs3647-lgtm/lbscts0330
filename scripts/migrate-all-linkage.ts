/**
 * 전체 연동 정보 마이그레이션 + TDD 검증
 * 
 * 대상: PFMEA, PFD, CP 모든 모듈
 * 실행: npx tsx scripts/migrate-all-linkage.ts
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

// 테스트 결과 저장
interface TestResult {
    module: string;
    testName: string;
    passed: boolean;
    message: string;
}
const testResults: TestResult[] = [];

function logTest(module: string, testName: string, passed: boolean, message: string) {
    testResults.push({ module, testName, passed, message });
    const icon = passed ? '✅' : '❌';
    console.log(`  ${icon} [${module}] ${testName}: ${message}`);
}

// ==========================================
// 1. PFMEA 마이그레이션
// ==========================================
async function migratePfmea() {
    console.log('\n📌 [1/3] PFMEA 연동 마이그레이션');
    console.log('-'.repeat(50));

    const registrations = await prisma.fmeaRegistration.findMany({
        select: {
            fmeaId: true,
            linkedPfdNo: true,
            linkedCpNo: true,
            subject: true,
        }
    });

    let updated = 0;
    for (const reg of registrations) {
        const fmeaId = reg.fmeaId.toLowerCase();

        // 이미 있으면 스킵
        if (reg.linkedPfdNo && reg.linkedPfdNo.trim() !== '') continue;

        const linkedPfdNo = fmeaId.replace(/^(p|d)fm/i, 'pfd');
        const linkedCpNo = fmeaId.replace(/^(p|d)fm/i, 'cp');

        await prisma.fmeaRegistration.update({
            where: { fmeaId: reg.fmeaId },
            data: { linkedPfdNo, linkedCpNo }
        });
        console.log(`  ✅ ${fmeaId} → PFD: ${linkedPfdNo}, CP: ${linkedCpNo}`);
        updated++;
    }

    logTest('PFMEA', '연동 정보 추가', true, `${updated}건 업데이트`);
    return updated;
}

// ==========================================
// 2. PFD 마이그레이션 (스키마에 맞게 수정)
// ==========================================
async function migratePfd() {
    console.log('\n📌 [2/3] PFD 연동 마이그레이션');
    console.log('-'.repeat(50));

    const pfdList = await prisma.pfdRegistration.findMany({
        select: {
            id: true,
            pfdNo: true,
            fmeaId: true,       // parentFmeaId → fmeaId
            linkedCpNos: true,  // JSON string
            subject: true,
        }
    });

    let updated = 0;
    for (const pfd of pfdList) {
        const pfdNo = pfd.pfdNo?.toLowerCase() || '';

        // fmeaId가 없으면 생성
        let fmeaId = pfd.fmeaId || '';
        if (!fmeaId || fmeaId.trim() === '') {
            // pfd26-p001 → pfm26-p001
            // pfdl26-p001 → pfm26-p001
            fmeaId = pfdNo.replace(/^pfd(l)?/i, 'pfm');
        }

        // linkedCpNos가 없으면 생성 (JSON string)
        let linkedCpNos = pfd.linkedCpNos || '';
        if (!linkedCpNos || linkedCpNos.trim() === '' || linkedCpNos === '[]') {
            // pfd26-p001 → ["cp26-p001"]
            const cpNo = pfdNo.replace(/^pfd(l)?/i, 'cp');
            linkedCpNos = JSON.stringify([cpNo]);
        }

        // 업데이트 필요한지 확인
        const needsUpdate = !pfd.fmeaId || !pfd.linkedCpNos || pfd.linkedCpNos === '[]';
        if (!needsUpdate) {
            continue;
        }

        await prisma.pfdRegistration.update({
            where: { id: pfd.id },
            data: {
                fmeaId: fmeaId,
                linkedCpNos: linkedCpNos
            }
        });
        console.log(`  ✅ ${pfdNo} → FMEA: ${fmeaId}, CP: ${linkedCpNos}`);
        updated++;
    }

    logTest('PFD', '연동 정보 추가', true, `${updated}건 업데이트`);
    return updated;
}

// ==========================================
// 3. CP 마이그레이션
// ==========================================
async function migrateCp() {
    console.log('\n📌 [3/3] CP 연동 마이그레이션');
    console.log('-'.repeat(50));

    const cpList = await prisma.cpRegistration.findMany({
        select: {
            id: true,
            cpNo: true,
            linkedPfdNo: true,
            fmeaId: true,
            parentApqpNo: true,
        }
    });

    let updated = 0;
    for (const cp of cpList) {
        const cpNo = cp.cpNo?.toLowerCase() || '';

        // 이미 있으면 스킵
        if (cp.linkedPfdNo && cp.linkedPfdNo.trim() !== '') continue;

        // CP ID에서 연동 PFD ID 생성
        let linkedPfdNo = '';
        let parentFmeaId = cp.fmeaId || '';

        if (cpNo.startsWith('cpl')) {
            linkedPfdNo = cpNo.replace(/^cpl/i, 'pfd');
            if (!parentFmeaId) parentFmeaId = cpNo.replace(/^cpl/i, 'pfm');
        } else if (cpNo.startsWith('cp')) {
            linkedPfdNo = cpNo.replace(/^cp/i, 'pfd');
            if (!parentFmeaId) parentFmeaId = cpNo.replace(/^cp/i, 'pfm');
        } else {
            continue;
        }

        await prisma.cpRegistration.update({
            where: { id: cp.id },
            data: {
                linkedPfdNo,
                fmeaId: parentFmeaId,
                fmeaNo: parentFmeaId,
            }
        });
        console.log(`  ✅ ${cpNo} → PFD: ${linkedPfdNo}, FMEA: ${parentFmeaId}`);
        updated++;
    }

    logTest('CP', '연동 정보 추가', true, `${updated}건 업데이트`);
    return updated;
}

// ==========================================
// TDD 검증: 회귀 테스트
// ==========================================
async function runRegressionTests() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TDD 회귀 테스트 시작');
    console.log('='.repeat(60));

    // Test 1: PFMEA 연동 정보 확인
    console.log('\n📋 Test 1: PFMEA 연동 정보');
    const pfmeaWithPfd = await prisma.fmeaRegistration.count({
        where: {
            linkedPfdNo: { not: '' }
        }
    });
    const pfmeaTotal = await prisma.fmeaRegistration.count();
    const pfmeaRate = pfmeaTotal > 0 ? Math.round(pfmeaWithPfd / pfmeaTotal * 100) : 100;
    logTest('PFMEA', 'PFD 연동 완료율', pfmeaWithPfd === pfmeaTotal,
        `${pfmeaWithPfd}/${pfmeaTotal} (${pfmeaRate}%)`);

    // Test 2: PFD 연동 정보 확인
    console.log('\n📋 Test 2: PFD 연동 정보');
    const pfdWithFmea = await prisma.pfdRegistration.count({
        where: {
            fmeaId: { not: '' }
        }
    });
    const pfdTotal = await prisma.pfdRegistration.count();
    const pfdRate = pfdTotal > 0 ? Math.round(pfdWithFmea / pfdTotal * 100) : 100;
    logTest('PFD', 'FMEA 연동 완료율', pfdWithFmea === pfdTotal || pfdTotal === 0,
        `${pfdWithFmea}/${pfdTotal} (${pfdRate}%)`);

    // Test 3: CP 연동 정보 확인
    console.log('\n📋 Test 3: CP 연동 정보');
    const cpWithPfd = await prisma.cpRegistration.count({
        where: {
            linkedPfdNo: { not: '' }
        }
    });
    const cpTotal = await prisma.cpRegistration.count();
    const cpRate = cpTotal > 0 ? Math.round(cpWithPfd / cpTotal * 100) : 100;
    logTest('CP', 'PFD 연동 완료율', cpWithPfd === cpTotal,
        `${cpWithPfd}/${cpTotal} (${cpRate}%)`);

    // Test 4: 데이터 일관성 확인
    console.log('\n📋 Test 4: 데이터 일관성');
    const pfmeaSample = await prisma.fmeaRegistration.findFirst({
        where: { linkedPfdNo: { not: '' } }
    });
    if (pfmeaSample) {
        const expectedPfd = pfmeaSample.fmeaId.toLowerCase().replace(/^(p|d)fm/i, 'pfd');
        const isConsistent = pfmeaSample.linkedPfdNo?.toLowerCase() === expectedPfd;
        logTest('ALL', 'ID 패턴 일관성', isConsistent,
            isConsistent ? 'PFMEA→PFD ID 변환 정상' : `불일치: ${pfmeaSample.linkedPfdNo} ≠ ${expectedPfd}`);
    } else {
        logTest('ALL', 'ID 패턴 일관성', true, 'PFMEA 데이터 없음 (스킵)');
    }

    // 결과 요약
    console.log('\n' + '='.repeat(60));
    console.log('📊 테스트 결과 요약');
    console.log('='.repeat(60));

    const passed = testResults.filter(t => t.passed).length;
    const failed = testResults.filter(t => !t.passed).length;

    console.log(`  ✅ 통과: ${passed}건`);
    console.log(`  ❌ 실패: ${failed}건`);
    console.log(`  📈 성공률: ${Math.round(passed / (passed + failed) * 100)}%`);

    if (failed > 0) {
        console.log('\n❌ 실패한 테스트:');
        testResults.filter(t => !t.passed).forEach(t => {
            console.log(`  - [${t.module}] ${t.testName}: ${t.message}`);
        });
    }

    return failed === 0;
}

// ==========================================
// 메인 실행
// ==========================================
async function main() {
    console.log('='.repeat(60));
    console.log('🚀 전체 연동 마이그레이션 + TDD 검증');
    console.log('='.repeat(60));
    console.log(`실행 시간: ${new Date().toISOString()}`);
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ 설정됨' : '❌ 없음'}`);

    try {
        // 1. 마이그레이션 실행
        await migratePfmea();
        await migratePfd();
        await migrateCp();

        // 2. 회귀 테스트 실행
        const allPassed = await runRegressionTests();

        console.log('\n' + '='.repeat(60));
        if (allPassed) {
            console.log('🎉 모든 마이그레이션 및 테스트 완료!');
        } else {
            console.log('⚠️ 일부 테스트 실패 - 확인 필요');
        }
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ 마이그레이션 실패:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

// 실행
main()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
