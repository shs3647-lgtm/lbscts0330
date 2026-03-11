/**
 * @file seed-stats-tables.ts
 * @description 신규 통계/마스터 테이블 시드 데이터
 * @created 2026-01-26
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 통계/마스터 테이블 시드 시작...');

    // 1. 특별특성 기준 (CC/SC/IC)
    console.log('\n📌 특별특성 기준 시드...');
    const specialCharacteristics = [
        {
            code: 'CC',
            name: 'Critical Characteristic',
            symbol: '◆',
            description: '규정된 차량안전, 배기가스관련 또는 사고예방에 관련된 특성으로, 적합성 여부에 따라 탑승자 또는 제조 조립자의 안전에 합리적인 예상 범위내에서 위해를 줄 수 있는 영향을 줄 수 있다.',
            customer: null, // 공통
            color: '#FF0000',
            sortOrder: 1,
        },
        {
            code: 'SC',
            name: 'Significant Characteristic',
            symbol: '★',
            description: '기능, 성능, 내구성 또는 외관과 관련하여 고객에게 중대한 불만족을 야기할 수 있고, 서비스 가능성 또는 비용에 상당한 영향을 미칠 수 있는 제품/공정 특성.',
            customer: null,
            color: '#FF8C00',
            sortOrder: 2,
        },
        {
            code: 'IC',
            name: 'Important Characteristic',
            symbol: '●',
            description: '고객 요구사항, 피팅, 기능, 제조, 조립 또는 서비스에 중요한 제품/공정 특성. 그러나 CC 또는 SC에 해당하지 않는 특성.',
            customer: null,
            color: '#0066CC',
            sortOrder: 3,
        },
        // 현대차 전용 특별특성
        {
            code: 'HMC_CC',
            name: '중요특성 (현대차)',
            symbol: '♦',
            description: '현대자동차 중요특성 - 안전/배기 관련',
            customer: '현대자동차',
            color: '#FF0000',
            sortOrder: 10,
        },
        {
            code: 'HMC_SC',
            name: '주요특성 (현대차)',
            symbol: '☆',
            description: '현대자동차 주요특성 - 기능/성능 관련',
            customer: '현대자동차',
            color: '#FF8C00',
            sortOrder: 11,
        },
    ];

    for (const item of specialCharacteristics) {
        await prisma.specialCharacteristicCriteria.upsert({
            where: { code: item.code },
            update: item,
            create: item,
        });
    }
    console.log(`  ✅ ${specialCharacteristics.length}건 완료`);

    // 2. 평가방법 라이브러리
    console.log('\n📌 평가방법 라이브러리 시드...');
    const evalMethods = [
        { code: 'VISUAL', name: '육안검사', category: '외관', description: '육안으로 외관 상태 확인', equipment: '조명' },
        { code: 'CALIPER', name: '캘리퍼 측정', category: '치수', description: '버니어 캘리퍼 사용', equipment: '버니어 캘리퍼' },
        { code: 'CMM', name: 'CMM 측정', category: '치수', description: '3차원 측정기 사용', equipment: 'CMM' },
        { code: 'MICROMETER', name: '마이크로미터', category: '치수', description: '마이크로미터 측정', equipment: '마이크로미터' },
        { code: 'GAGE', name: '게이지 측정', category: '치수', description: 'Go/No-Go 게이지', equipment: '한계게이지' },
        { code: 'HARDNESS', name: '경도 측정', category: '물성', description: '로크웰/브리넬 경도', equipment: '경도시험기' },
        { code: 'TORQUE', name: '토크 측정', category: '기능', description: '토크렌치/토크미터', equipment: '토크렌치' },
        { code: 'WEIGHT', name: '중량 측정', category: '물성', description: '저울 측정', equipment: '전자저울' },
        { code: 'LEAK', name: '기밀 시험', category: '기능', description: '누설 시험', equipment: '기밀시험기' },
        { code: 'FUNCTION', name: '기능 시험', category: '기능', description: '작동 기능 확인', equipment: '시험 장치' },
    ];

    for (const item of evalMethods) {
        await prisma.evalMethodLibrary.upsert({
            where: { code: item.code },
            update: { ...item, isActive: true, sortOrder: 0 },
            create: { ...item, isActive: true, sortOrder: 0 },
        });
    }
    console.log(`  ✅ ${evalMethods.length}건 완료`);

    // 3. 관리방법 라이브러리
    console.log('\n📌 관리방법 라이브러리 시드...');
    const controlMethods = [
        { code: 'XBAR_R', name: 'Xbar-R 관리도', category: '통계적', description: '계량형 관리도', frequency: '매 로트' },
        { code: 'P_CHART', name: 'p 관리도', category: '통계적', description: '불량률 관리도', frequency: '일별' },
        { code: 'CHECK_SHEET', name: '체크시트', category: '비통계적', description: '항목별 체크리스트', frequency: '매 작업' },
        { code: 'FIRST_OFF', name: '초품검사', category: '비통계적', description: '작업 시작 시 검사', frequency: '시작 시' },
        { code: 'PATROL', name: '순회검사', category: '비통계적', description: '정기 순회 검사', frequency: '매 2시간' },
        { code: 'FINAL', name: '최종검사', category: '비통계적', description: '출하 전 최종검사', frequency: '매 로트' },
        { code: 'SAMPLING', name: '샘플링검사', category: '통계적', description: 'AQL 샘플링', frequency: '매 로트' },
        { code: 'FULL', name: '전수검사', category: '비통계적', description: '100% 검사', frequency: '전수' },
        { code: 'AUTO', name: '자동검사', category: '자동화', description: '자동 검사 장치', frequency: '연속' },
        { code: 'SPC', name: 'SPC 모니터링', category: '통계적', description: '실시간 SPC', frequency: '연속' },
    ];

    for (const item of controlMethods) {
        await prisma.controlMethodLibrary.upsert({
            where: { code: item.code },
            update: { ...item, isActive: true, sortOrder: 0 },
            create: { ...item, isActive: true, sortOrder: 0 },
        });
    }
    console.log(`  ✅ ${controlMethods.length}건 완료`);

    // 4. 대응계획 템플릿
    console.log('\n📌 대응계획 템플릿 시드...');
    const reactionPlans = [
        { code: 'CONTAIN', name: '부적합품 격리', defectType: '공통', severity: 'HIGH', actionSteps: '1. 즉시 생산 중지 2. 부적합품 격리/표시 3. 원인 조사 4. 시정조치' },
        { code: 'STOP_LINE', name: '라인 정지', defectType: '치수', severity: 'HIGH', actionSteps: '1. 라인 정지 2. 책임자 보고 3. 원인 분석 4. 조치 후 재가동' },
        { code: 'SORT', name: '선별 검사', defectType: '외관', severity: 'MEDIUM', actionSteps: '1. 재고/WIP 전수 선별 2. 양/불량 분류 3. 불량 격리' },
        { code: 'REWORK', name: '재작업', defectType: '기능', severity: 'MEDIUM', actionSteps: '1. 재작업 절차 확인 2. 재작업 실시 3. 재검사' },
        { code: 'SCRAP', name: '폐기', defectType: '공통', severity: 'HIGH', actionSteps: '1. 폐기 승인 2. 폐기 처리 3. 기록 유지' },
        { code: 'NOTIFY_CUST', name: '고객 통보', defectType: '안전', severity: 'HIGH', actionSteps: '1. 고객 긴급 통보 2. 상황 보고 3. 조치 계획 제출' },
        { code: 'ADJUST', name: '설비 조정', defectType: '공정', severity: 'LOW', actionSteps: '1. 설비 파라미터 확인 2. 조정 실시 3. 재확인' },
        { code: 'RETRAIN', name: '재교육', defectType: '작업', severity: 'LOW', actionSteps: '1. 작업자 재교육 2. 작업표준 확인 3. OJT' },
    ];

    for (const item of reactionPlans) {
        await prisma.reactionPlanTemplate.upsert({
            where: { code: item.code },
            update: { ...item, isActive: true, sortOrder: 0 },
            create: { ...item, isActive: true, sortOrder: 0 },
        });
    }
    console.log(`  ✅ ${reactionPlans.length}건 완료`);

    console.log('\n✅ 모든 시드 완료!');
}

main()
    .catch((e) => {
        console.error('❌ 시드 오류:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
