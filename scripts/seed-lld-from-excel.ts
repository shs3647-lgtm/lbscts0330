/**
 * LLD 원본 엑셀 데이터 시드 — LLD_이양식_통합본.xlsx 기반
 * CIP 개선 결과 (개선후 S/O/D/AP, 책임자, 목표완료일, 근거) 포함
 *
 * 실행: npx tsx scripts/seed-lld-from-excel.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/fmea_db?schema=public';
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 원본 엑셀 데이터 (LLD_이양식_통합본.xlsx 그대로)
const RECORDS = [
  {
    lldNo: 'LLD26-001', classification: 'ABN', applyTo: 'prevention',
    processNo: '10', processName: 'Scrubber', productName: 'au bump',
    failureMode: '', cause: '반송장비의 Loadport와의 충돌',
    severity: null, occurrence: 2, detection: 2,
    preventionImprovement: '', detectionImprovement: '',
    responsible: '', targetDate: '', evidence: '', completedDate: '',
    status: 'R', newSeverity: null, newOccurrence: null, newDetection: null, newAP: '',
  },
  {
    lldNo: 'LLD26-002', classification: 'CIP', applyTo: 'prevention',
    processNo: '20', processName: 'UBM Sputter', productName: 'au bump',
    failureMode: '중복 공정진행', cause: '공정이 완료를 인지못하여  공정을 재진행한다',
    severity: 6, occurrence: 1, detection: 2,
    preventionImprovement: '불량 검출 능력 향상', detectionImprovement: '사전 Hold 설정',
    responsible: '권도균', targetDate: '2025.09.11', evidence: '불량 유출 방지 목적',
    completedDate: '2025.09.11', status: 'G',
    newSeverity: 6, newOccurrence: 1, newDetection: 2, newAP: 'L',
  },
  {
    lldNo: 'LLD26-003', classification: 'ABN', applyTo: 'prevention',
    processNo: '20', processName: 'UBM Sputter', productName: 'au bump',
    failureMode: 'Wafer Broken', cause: 'Turbo Pump 진동에 의한 Wafer Sliding 발생',
    severity: 7, occurrence: 5, detection: 2,
    preventionImprovement: '진동 감지 능력 향상', detectionImprovement: '실시간 진동 감지 Sensor 부착',
    responsible: '박영언', targetDate: '2025.07.30', evidence: '감지 Sensor 작동 검증 표준 개정 확인',
    completedDate: '2025.06.25', status: 'G',
    newSeverity: 7, newOccurrence: 3, newDetection: 2, newAP: 'L',
  },
  {
    lldNo: 'LLD26-004', classification: 'ABN', applyTo: 'prevention',
    processNo: '10', processName: 'Scrubber', productName: 'au bump',
    failureMode: '', cause: '반송장비의 Loadport와의 충돌',
    severity: null, occurrence: 2, detection: 2,
    preventionImprovement: '', detectionImprovement: '',
    responsible: '', targetDate: '', evidence: '', completedDate: '',
    status: 'R', newSeverity: null, newOccurrence: null, newDetection: null, newAP: '',
  },
  {
    lldNo: 'LLD26-005', classification: 'ABN', applyTo: 'prevention',
    processNo: '60', processName: 'PR COATING', productName: 'au bump',
    failureMode: 'PR막 오염 Deform, Para', cause: 'PR 반응 물질 Wafer내 존재',
    severity: 4, occurrence: 5, detection: 4,
    preventionImprovement: 'PR Material 변경 적용', detectionImprovement: 'PR 반응 성분 분석 AVI 검출 검증 진행',
    responsible: '권도균', targetDate: '2025.05.30', evidence: '신규 제품 PR material 변경 PCN 승인',
    completedDate: '2025.04.30', status: 'G',
    newSeverity: 4, newOccurrence: 2, newDetection: 4, newAP: 'L',
  },
  {
    lldNo: 'LLD26-006', classification: 'ABN', applyTo: 'prevention',
    processNo: '60', processName: 'PR COATING', productName: 'au bump',
    failureMode: 'Wafer Broken', cause: 'PR 오염 발생',
    severity: 7, occurrence: 5, detection: 2,
    preventionImprovement: 'Wafer Block Design 최적화 적용', detectionImprovement: 'Wafer 안착 실시간 감지 system 개발',
    responsible: '오상민', targetDate: '2025.09.16', evidence: 'Wafer block 디자인 변경 승인 완료',
    completedDate: '2025.09.12', status: 'G',
    newSeverity: 7, newOccurrence: 3, newDetection: 2, newAP: 'L',
  },
  {
    lldNo: 'LLD26-007', classification: 'CIP', applyTo: 'prevention',
    processNo: '100', processName: 'Au Plating', productName: 'au bump',
    failureMode: 'Bump Height 이상', cause: 'CRS 제조 이상',
    severity: 6, occurrence: 4, detection: 3,
    preventionImprovement: '초기 / 양산 검증 진행 검증', detectionImprovement: 'Dummy 검증 3D AVI 검사',
    responsible: '박주현', targetDate: '2026.01.01', evidence: '3D AVI 검사 추가',
    completedDate: '2026.01.01', status: 'G',
    newSeverity: 6, newOccurrence: 4, newDetection: 3, newAP: 'L',
  },
  {
    lldNo: 'LLD26-008', classification: 'CIP', applyTo: 'prevention',
    processNo: '100', processName: 'Au Plating', productName: 'au bump',
    failureMode: 'Bump Height 이상', cause: 'CRS 장착 이상',
    severity: 6, occurrence: 4, detection: 3,
    preventionImprovement: '초기 / 양산 검증 진행 검증', detectionImprovement: 'Dummy 검증 3D AVI 검사',
    responsible: '박주현', targetDate: '2026.01.01', evidence: '3D AVI 검사 추가',
    completedDate: '2026.01.01', status: 'G',
    newSeverity: 6, newOccurrence: 4, newDetection: 3, newAP: 'L',
  },
  {
    lldNo: 'LLD26-009', classification: 'ABN', applyTo: 'prevention',
    processNo: '100', processName: 'Au Plating', productName: 'au bump',
    failureMode: 'Bump Height 이상', cause: 'Anode mesh 도금 발생',
    severity: 6, occurrence: 6, detection: 3,
    preventionImprovement: '도금 발생 Source 제거위한 세정 능력 강화', detectionImprovement: '정기 PM항목 신설 검토',
    responsible: '이지호', targetDate: '2025.07.11', evidence: '8inch 세정 력 비교 세정 약품 비교 진행',
    completedDate: '2025.07.11', status: 'G',
    newSeverity: 6, newOccurrence: 4, newDetection: 3, newAP: 'L',
  },
  {
    lldNo: 'LLD26-010', classification: 'ABN', applyTo: 'prevention',
    processNo: '100', processName: 'Au Plating', productName: 'au bump',
    failureMode: 'Lump', cause: 'Bath 이동간 간섭에 의한 Delay 발생',
    severity: 4, occurrence: 2, detection: 2,
    preventionImprovement: '', detectionImprovement: '',
    responsible: '', targetDate: '', evidence: '', completedDate: '',
    status: 'R', newSeverity: null, newOccurrence: null, newDetection: null, newAP: '',
  },
  {
    lldNo: 'LLD26-011', classification: 'ABN', applyTo: 'prevention',
    processNo: '100', processName: 'Au Plating', productName: 'au bump',
    failureMode: 'Bump 이상 형성', cause: 'PRE Wet 지속 유지에 의한 PR Damage',
    severity: 4, occurrence: 3, detection: 2,
    preventionImprovement: '', detectionImprovement: '',
    responsible: '', targetDate: '', evidence: '', completedDate: '',
    status: 'R', newSeverity: null, newOccurrence: null, newDetection: null, newAP: '',
  },
];

async function main() {
  console.log('[LLD Seed] 원본 엑셀 데이터 시드 시작 (CIP 개선 결과 포함)...\n');

  let count = 0;
  for (const rec of RECORDS) {
    await prisma.lLDFilterCode.upsert({
      where: { lldNo: rec.lldNo },
      update: {
        classification: rec.classification,
        applyTo: rec.applyTo,
        processNo: rec.processNo,
        processName: rec.processName,
        productName: rec.productName,
        failureMode: rec.failureMode,
        cause: rec.cause,
        severity: rec.severity,
        occurrence: rec.occurrence,
        detection: rec.detection,
        improvement: '',
        preventionImprovement: rec.preventionImprovement,
        detectionImprovement: rec.detectionImprovement,
        responsible: rec.responsible || null,
        targetDate: rec.targetDate || null,
        evidence: rec.evidence || null,
        completedDate: rec.completedDate || null,
        status: rec.status,
        newSeverity: rec.newSeverity,
        newOccurrence: rec.newOccurrence,
        newDetection: rec.newDetection,
        newAP: rec.newAP || null,
      },
      create: {
        lldNo: rec.lldNo,
        classification: rec.classification,
        applyTo: rec.applyTo,
        processNo: rec.processNo,
        processName: rec.processName,
        productName: rec.productName,
        failureMode: rec.failureMode,
        cause: rec.cause,
        severity: rec.severity,
        occurrence: rec.occurrence,
        detection: rec.detection,
        improvement: '',
        preventionImprovement: rec.preventionImprovement,
        detectionImprovement: rec.detectionImprovement,
        responsible: rec.responsible || null,
        targetDate: rec.targetDate || null,
        evidence: rec.evidence || null,
        completedDate: rec.completedDate || null,
        status: rec.status,
        newSeverity: rec.newSeverity,
        newOccurrence: rec.newOccurrence,
        newDetection: rec.newDetection,
        newAP: rec.newAP || null,
        vehicle: '',
        target: '제조',
        owner: rec.responsible || '',
        sourceType: 'import',
        priority: 0,
      },
    });
    const cipTag = rec.newAP ? ` → CIP: ${rec.newAP}` : '';
    console.log(`  ${rec.lldNo} | ${rec.classification} | ${rec.processName} | ${rec.failureMode || '(없음)'}${cipTag}`);
    count++;
  }

  console.log(`\n>>> 완료: ${count}/${RECORDS.length}건 upsert`);

  // 확인
  const total = await prisma.lLDFilterCode.count();
  const withCIP = await prisma.lLDFilterCode.count({ where: { newAP: { not: null } } });
  console.log(`DB 총 ${total}건, CIP 결과 있는 건: ${withCIP}건`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
