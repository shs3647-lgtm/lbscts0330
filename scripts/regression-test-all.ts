/**
 * 전체 모듈 순차 회귀 검증 (5회)
 * 
 * APQP → PFMEA → PFD → CP 연동 및 데이터 무결성 검증
 * 실행: npx tsx scripts/regression-test-all.ts
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

interface TestResult {
    round: number;
    module: string;
    test: string;
    status: 'PASS' | 'FAIL';
    message: string;
}

const results: TestResult[] = [];

function log(round: number, module: string, test: string, status: 'PASS' | 'FAIL', message: string) {
    results.push({ round, module, test, status, message });
    const icon = status === 'PASS' ? '✅' : '❌';
    console.log(`  ${icon} [${module}] ${test}: ${message}`);
}

// =====================================
// 순차 회귀 테스트
// =====================================
async function runRegressionTest(round: number) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 순차 회귀 테스트 - Round ${round}/5`);
    console.log(`${'='.repeat(60)}`);

    // 1. APQP 데이터 검증
    console.log('\n📋 1. APQP 데이터 검증');
    const apqps = await prisma.apqpRegistration.findMany();
    log(round, 'APQP', '프로젝트 수', 'PASS', `${apqps.length}개`);

    for (const apqp of apqps) {
        const hasCustomer = !!apqp.customerName && apqp.customerName.trim() !== '';
        log(round, 'APQP', `${apqp.apqpNo} 고객사`, hasCustomer ? 'PASS' : 'FAIL', apqp.customerName || '없음');
    }

    // 2. PFMEA 데이터 검증
    console.log('\n📋 2. PFMEA 데이터 검증');
    const fmeas = await prisma.fmeaProject.findMany({
        include: { registration: true }
    });
    log(round, 'PFMEA', '프로젝트 수', 'PASS', `${fmeas.length}개`);

    for (const fmea of fmeas) {
        // APQP 연결 확인
        const hasApqp = !!fmea.parentApqpNo && fmea.parentApqpNo.trim() !== '';
        log(round, 'PFMEA', `${fmea.fmeaId} APQP연결`, hasApqp ? 'PASS' : 'FAIL', fmea.parentApqpNo || '없음');

        // 연동 PFD 확인
        const linkedPfd = fmea.registration?.linkedPfdNo || '';
        const hasPfd = linkedPfd.trim() !== '';
        log(round, 'PFMEA', `${fmea.fmeaId} 연동PFD`, hasPfd ? 'PASS' : 'FAIL', linkedPfd || '없음');

        // 연동 CP 확인
        const linkedCp = fmea.registration?.linkedCpNo || '';
        const hasCp = linkedCp.trim() !== '';
        log(round, 'PFMEA', `${fmea.fmeaId} 연동CP`, hasCp ? 'PASS' : 'FAIL', linkedCp || '없음');

        // 고객사 확인
        const customer = fmea.registration?.customerName || '';
        const hasCustomer = customer.trim() !== '';
        log(round, 'PFMEA', `${fmea.fmeaId} 고객사`, hasCustomer ? 'PASS' : 'FAIL', customer || '없음');
    }

    // 3. PFD 데이터 검증
    console.log('\n📋 3. PFD 데이터 검증');
    const pfds = await prisma.pfdRegistration.findMany();
    log(round, 'PFD', '등록 수', 'PASS', `${pfds.length}개`);

    for (const pfd of pfds) {
        // FMEA 연결 확인
        const hasFmea = !!pfd.fmeaId && pfd.fmeaId.trim() !== '';
        log(round, 'PFD', `${pfd.pfdNo} FMEA연결`, hasFmea ? 'PASS' : 'FAIL', pfd.fmeaId || '없음');

        // 연동 CP 확인
        const linkedCps = pfd.linkedCpNos || '';
        const hasCp = linkedCps.trim() !== '' && linkedCps !== '[]';
        log(round, 'PFD', `${pfd.pfdNo} 연동CP`, hasCp ? 'PASS' : 'FAIL', linkedCps || '없음');
    }

    // 4. CP 데이터 검증
    console.log('\n📋 4. CP 데이터 검증');
    const cps = await prisma.cpRegistration.findMany();
    log(round, 'CP', '등록 수', 'PASS', `${cps.length}개`);

    for (const cp of cps) {
        // FMEA 연결 확인
        const hasFmea = !!cp.fmeaId && cp.fmeaId.trim() !== '';
        log(round, 'CP', `${cp.cpNo} FMEA연결`, hasFmea ? 'PASS' : 'FAIL', cp.fmeaId || '없음');

        // 연동 PFD 확인
        const linkedPfd = cp.linkedPfdNo || '';
        const hasPfd = linkedPfd.trim() !== '';
        log(round, 'CP', `${cp.cpNo} 연동PFD`, hasPfd ? 'PASS' : 'FAIL', linkedPfd || '없음');
    }

    // 5. ID 패턴 일관성 검증
    console.log('\n📋 5. ID 패턴 일관성 검증');
    for (const fmea of fmeas) {
        if (!fmea.registration) continue;

        const expectedPfd = fmea.fmeaId.toLowerCase().replace(/^(p|d)fm/i, 'pfd');
        const actualPfd = (fmea.registration.linkedPfdNo || '').toLowerCase();
        const pfdMatch = actualPfd === expectedPfd;
        log(round, 'PATTERN', `${fmea.fmeaId} → PFD`, pfdMatch ? 'PASS' : 'FAIL',
            pfdMatch ? expectedPfd : `기대: ${expectedPfd}, 실제: ${actualPfd}`);

        const expectedCp = fmea.fmeaId.toLowerCase().replace(/^(p|d)fm/i, 'cp');
        const actualCp = (fmea.registration.linkedCpNo || '').toLowerCase();
        const cpMatch = actualCp === expectedCp;
        log(round, 'PATTERN', `${fmea.fmeaId} → CP`, cpMatch ? 'PASS' : 'FAIL',
            cpMatch ? expectedCp : `기대: ${expectedCp}, 실제: ${actualCp}`);
    }
}

// =====================================
// 메인 실행
// =====================================
async function main() {
    console.log('='.repeat(60));
    console.log('🧪 전체 모듈 순차 회귀 검증 (5회)');
    console.log('='.repeat(60));
    console.log(`실행 시간: ${new Date().toISOString()}`);

    try {
        // 5회 순차 검증
        for (let i = 1; i <= 5; i++) {
            await runRegressionTest(i);
        }

        // 결과 요약
        console.log('\n' + '='.repeat(60));
        console.log('📊 최종 결과 요약');
        console.log('='.repeat(60));

        const passCount = results.filter(r => r.status === 'PASS').length;
        const failCount = results.filter(r => r.status === 'FAIL').length;
        const total = passCount + failCount;

        console.log(`  ✅ 통과: ${passCount}건`);
        console.log(`  ❌ 실패: ${failCount}건`);
        console.log(`  📈 성공률: ${Math.round(passCount / total * 100)}%`);

        if (failCount > 0) {
            console.log('\n⚠️ 실패한 테스트:');
            const uniqueFailures = new Map<string, TestResult>();
            results.filter(r => r.status === 'FAIL').forEach(r => {
                const key = `${r.module}-${r.test}`;
                if (!uniqueFailures.has(key)) uniqueFailures.set(key, r);
            });
            uniqueFailures.forEach(r => {
                console.log(`  - [${r.module}] ${r.test}: ${r.message}`);
            });
        }

        console.log('\n' + '='.repeat(60));
        if (failCount === 0) {
            console.log('🎉 모든 테스트 통과!');
        } else {
            console.log('⚠️ 일부 테스트 실패 - 수정 필요');
        }
        console.log('='.repeat(60));

        return failCount === 0;
    } catch (error) {
        console.error('❌ 테스트 실패:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main()
    .then(success => process.exit(success ? 0 : 1))
    .catch(() => process.exit(1));
