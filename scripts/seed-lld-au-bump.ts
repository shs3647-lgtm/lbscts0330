/**
 * @file seed-lld-au-bump.ts
 * @description LBS 12inch Au Bump LLD 11건 시드 스크립트 (Prisma 직접 사용)
 * 실행: npx tsx scripts/seed-lld-au-bump.ts
 */

import { getPrisma } from '../src/lib/prisma';

const LLD_AU_BUMP_DATA = [
  {
    lldNo: 'LLD-001', classification: 'ABN', processNo: '10', processName: 'Scrubber',
    failureMode: '반송장비 Loadport 충돌', cause: '반송장비의 Loadport와의 충돌',
    severity: 2, occurrence: 2, detection: 2,
    preventionImprovement: 'Machine Alarm 기반 반송 장비 보관 장소 고정 운영\n※ 현행 검출관리 유지 (최적화 미기록)',
    detectionImprovement: 'Machine Interlock 적용',
    status: 'R', owner: '',
  },
  {
    lldNo: 'LLD-002', classification: 'CIP', processNo: '20', processName: 'UBM Sputter',
    failureMode: '중복 공정 진행', cause: '공정 완료 미인지로 인한 공정 재진행',
    severity: 6, occurrence: 1, detection: 2,
    preventionImprovement: '사전 Hold 설정 (공정 완료 전 재진행 차단)',
    detectionImprovement: '불량 검출 능력 향상 — MES Interlock 고도화',
    completedDate: '2025-09-11', status: 'G', owner: '권도균',
    attachmentUrl: '불량 유출 방지 근거서류',
  },
  {
    lldNo: 'LLD-003', classification: 'ABN', processNo: '20', processName: 'UBM Sputter',
    failureMode: 'Wafer Broken', cause: 'Turbo Pump 진동에 의한 Wafer Sliding 발생',
    severity: 7, occurrence: 5, detection: 2,
    preventionImprovement: '진동 감지 능력 향상 — 실시간 진동 감지 Sensor 부착',
    detectionImprovement: '실시간 진동 감지 Sensor 부착 후 작동 검증 및 표준 개정 확인',
    completedDate: '2025-07-30', status: 'G', owner: '박영연',
    attachmentUrl: '감지 Sensor 작동 검증 표준 개정 확인서',
  },
  {
    lldNo: 'LLD-004', classification: 'ABN', processNo: '10', processName: 'Scrubber',
    failureMode: '반송장비 Loadport 충돌', cause: '반송장비의 Loadport와의 충돌',
    severity: 2, occurrence: 2, detection: 2,
    preventionImprovement: 'Machine Alarm 기반 반송 장비 보관 장소 고정 운영\n※ 현행 검출관리 유지 (최적화 미기록)',
    detectionImprovement: 'Machine Interlock 적용',
    status: 'R', owner: '',
  },
  {
    lldNo: 'LLD-005', classification: 'ABN', processNo: '30', processName: 'PR Coating',
    failureMode: 'PR막 오염 (Deform / Para)', cause: 'PR 반응 물질의 Wafer 내 존재',
    severity: 4, occurrence: 5, detection: 2,
    preventionImprovement: 'PR 반응 성분 분석 후 AVI 검증 건 진행',
    detectionImprovement: 'PR Material 변경 적용 (반응 성분 제거 소재로 전환)',
    completedDate: '2025-05-30', status: 'G', owner: '권도균',
    attachmentUrl: 'PCN 승인서\nWafer Block 디자인 변경 승인 근거서류',
  },
  {
    lldNo: 'LLD-006', classification: 'ABN', processNo: '30', processName: 'PR Coating',
    failureMode: 'Wafer Broken', cause: 'PR 오염 발생',
    severity: 7, occurrence: 5, detection: 2,
    preventionImprovement: 'Wafer Block Design 최적화 적용',
    detectionImprovement: 'Wafer 안착 실시간 감지 System 개발',
    completedDate: '2025-09-16', status: 'G', owner: '오상빈',
  },
  {
    lldNo: 'LLD-007', classification: 'CIP', processNo: '40', processName: 'Au Plating',
    failureMode: 'Bump Height 이상', cause: 'CRS 제조 이상',
    severity: 6, occurrence: 4, detection: 3,
    preventionImprovement: '초기 / 양산 검증 진행 강화 — BM 검증 작업 절차 표준화',
    detectionImprovement: 'Dummy 검증 + 3D AVI 검사 추가 적용',
    completedDate: '2026-01-01', status: 'G', owner: '박주현',
    attachmentUrl: '3D AVI 검사 추가 근거서류',
  },
  {
    lldNo: 'LLD-008', classification: 'CIP', processNo: '40', processName: 'Au Plating',
    failureMode: 'Bump Height 이상', cause: 'CRS 장착 이상',
    severity: 6, occurrence: 4, detection: 3,
    preventionImprovement: '초기 / 양산 검증 진행 강화 — BM 검증 작업 절차 표준화',
    detectionImprovement: '검증 + 3D AVI 검사 추가 적용',
    completedDate: '2026-01-01', status: 'G', owner: '박주현',
    attachmentUrl: '3D AVI 검사 추가 근거서류',
  },
  {
    lldNo: 'LLD-009', classification: 'ABN', processNo: '40', processName: 'Au Plating',
    failureMode: 'Bump Height 이상', cause: 'Anode Mesh 도금 발생',
    severity: 6, occurrence: 6, detection: 3,
    preventionImprovement: '도금 발생 Source 제거를 위한 세정 능력 강화 — 정기 PM 항목 신설',
    detectionImprovement: 'Bump Height 측정 + DAV 검증 정기 점검',
    completedDate: '2025-07-11', status: 'G', owner: '이지호',
  },
  {
    lldNo: 'LLD-010', classification: 'ABN', processNo: '40', processName: 'Au Plating',
    failureMode: 'Lump 발생', cause: 'Bath 이동간 간섭에 의한 Delay발생',
    severity: 4, occurrence: 2, detection: 2,
    preventionImprovement: '월간 PM (반송 Unit 흔들림 점검) 유지\n※ 현행 예방관리 유지 (최적화 미기록)',
    detectionImprovement: 'Machine Interlock 적용\n※ 현행 검출관리 유지 (최적화 미기록)',
    status: 'R', owner: '',
  },
  {
    lldNo: 'LLD-011', classification: 'ABN', processNo: '40', processName: 'Au Plating',
    failureMode: 'Bump 이상 형태', cause: 'PRE Wet 지속 유지에 의한 PR Damage',
    severity: 4, occurrence: 3, detection: 2,
    preventionImprovement: '월간 PM 주기 유지\n※ 현행 예방관리 유지 (최적화 미기록)',
    detectionImprovement: 'Machine Interlock 기능 개발 추진\n※ 현행 검출관리 유지 (최적화 미기록)',
    status: 'R', owner: '',
    attachmentUrl: '8inch 세정력 비교 / 세정 약품 교체 진행 결과서',
  },
];

async function main() {
  console.log('[Seed] LBS 12inch Au Bump LLD 11건 시드 시작...');
  const prisma = getPrisma();
  if (!prisma) { console.error('DB 연결 실패'); return; }

  const results = await prisma.$transaction(
    LLD_AU_BUMP_DATA.map(d =>
      prisma.lLDFilterCode.upsert({
        where: { lldNo: d.lldNo },
        update: {
          classification: d.classification,
          applyTo: 'prevention',
          processNo: d.processNo,
          processName: d.processName,
          productName: 'LBS 12inch Au Bump',
          failureMode: d.failureMode,
          cause: d.cause,
          severity: d.severity,
          occurrence: d.occurrence,
          detection: d.detection,
          improvement: '',
          preventionImprovement: d.preventionImprovement,
          detectionImprovement: d.detectionImprovement,
          vehicle: '',
          target: '제조',
          owner: d.owner || '',
          completedDate: d.completedDate || null,
          status: d.status,
          sourceType: 'import',
          attachmentUrl: d.attachmentUrl || null,
        },
        create: {
          lldNo: d.lldNo,
          classification: d.classification,
          applyTo: 'prevention',
          processNo: d.processNo,
          processName: d.processName,
          productName: 'LBS 12inch Au Bump',
          failureMode: d.failureMode,
          cause: d.cause,
          severity: d.severity,
          occurrence: d.occurrence,
          detection: d.detection,
          improvement: '',
          preventionImprovement: d.preventionImprovement,
          detectionImprovement: d.detectionImprovement,
          vehicle: '',
          target: '제조',
          owner: d.owner || '',
          completedDate: d.completedDate || null,
          status: d.status,
          sourceType: 'import',
          attachmentUrl: d.attachmentUrl || null,
        },
      })
    )
  );

  console.log(`[Seed] 완료: ${results.length}건 저장`);
  for (const r of results) {
    console.log(`  - ${r.lldNo} | ${r.processName} | ${r.failureMode} | ${r.status}`);
  }
}

main().catch(console.error);
