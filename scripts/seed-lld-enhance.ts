/**
 * LLD 시드 데이터 보강 + 한글 깨짐 수정 스크립트
 * - LLD26-001~012: 깨진 한글 필드 전체 복원 (failureMode, cause, improvement, prev/det)
 * - LLD26-013~019: detection 대상 항목 추가
 *
 * 실행: npx tsx scripts/seed-lld-enhance.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/fmea_db?schema=public';
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('[LLD Fix] 한글 깨짐 수정 + 보강 시작...\n');

  // ══════════════════════════════════════════════════════
  // 1. LLD26-001~012 한글 필드 전체 복원 (인코딩 깨짐 수정)
  // ══════════════════════════════════════════════════════
  const fixRecords = [
    {
      lldNo: 'LLD26-001',
      classification: 'CIP', applyTo: 'prevention',
      processNo: '10', processName: 'Scrubber', productName: 'au bump',
      failureMode: '반송장비 Loadport 충돌',
      cause: '반송장비의 Loadport와의 충돌',
      improvement: 'Machine Alarm 기반 반송 장비 보관 장소 고정 운영',
      preventionImprovement: 'Loadport 충돌 방지 인터록 설치',
      detectionImprovement: '반송 전 충돌 센서 확인 자동화',
      completedDate: '2025-11-15', status: 'G',
    },
    {
      lldNo: 'LLD26-002',
      classification: 'CIP', applyTo: 'prevention',
      processNo: '20', processName: 'UBM Sputter', productName: 'au bump',
      failureMode: '중복 공정 진행',
      cause: '공정 완료 미인지로 인한 공정 재진행',
      improvement: '사전 Hold 설정 (공정 완료 전 재진행 차단)',
      preventionImprovement: '공정 진행 MES 이중 확인 로직 추가',
      detectionImprovement: '중복 공정 알림 시스템 적용',
      completedDate: '2025-12-01', status: 'G',
    },
    {
      lldNo: 'LLD26-003',
      classification: 'CIP', applyTo: 'prevention',
      processNo: '20', processName: 'UBM Sputter', productName: 'au bump',
      failureMode: 'Wafer Broken',
      cause: 'Turbo Pump 진동에 의한 Wafer Sliding 발생',
      improvement: '진동 감지 능력 향상 — 실시간 진동 감지 Sensor 부착',
      preventionImprovement: 'Turbo Pump 진동 모니터링 기준 강화',
      detectionImprovement: 'Wafer 파손 감지 센서 설치',
      completedDate: '2025-10-20', status: 'G',
    },
    {
      lldNo: 'LLD26-004',
      classification: 'CIP', applyTo: 'prevention',
      processNo: '30', processName: 'Scrubber', productName: 'au bump',
      failureMode: '반송장비 Loadport 충돌',
      cause: '반송장비의 Loadport와의 충돌',
      improvement: 'Machine Alarm 기반 반송 장비 보관 장소 고정 운영',
      preventionImprovement: '반송 경로 최적화 + 속도 제한',
      detectionImprovement: 'CCTV 기반 반송 이상 감시',
      completedDate: '2025-11-15', status: 'G',
    },
    {
      lldNo: 'LLD26-005',
      classification: 'CIP', applyTo: 'prevention',
      processNo: '60', processName: 'PR Coating', productName: 'au bump',
      failureMode: 'PR막 오염 (Deform / Para)',
      cause: 'PR 반응 물질의 Wafer 내 존재',
      improvement: 'PR 반응 성분 분석 후 AVI 검증 건 진행',
      preventionImprovement: 'PR 도포 전 Wafer 세정 강화',
      detectionImprovement: '도포 후 AOI 검사 추가',
      completedDate: '2026-01-10', status: 'G',
    },
    {
      lldNo: 'LLD26-006',
      classification: 'CIP', applyTo: 'prevention',
      processNo: '60', processName: 'PR Coating', productName: 'au bump',
      failureMode: 'Wafer Broken',
      cause: 'PR 오염 발생',
      improvement: 'Wafer Block Design 최적화 적용',
      preventionImprovement: 'PR 관리 온도/습도 기준 강화',
      detectionImprovement: '오염 검출 인라인 검사 도입',
      completedDate: '2026-01-15', status: 'G',
    },
    {
      lldNo: 'LLD26-007',
      classification: 'CIP', applyTo: 'prevention',
      processNo: '100', processName: 'Au Plating', productName: 'au bump',
      failureMode: 'Bump Height 이상',
      cause: 'CRS 제조 이상',
      improvement: '초기 / 양산 검증 진행 강화 — BM 검증 작업 절차 표준화',
      preventionImprovement: 'CRS 수입검사 기준 강화',
      detectionImprovement: 'Bump Height 인라인 측정 100%',
      completedDate: '2026-02-01', status: 'G',
    },
    {
      lldNo: 'LLD26-008',
      classification: 'CIP', applyTo: 'prevention',
      processNo: '100', processName: 'Au Plating', productName: 'au bump',
      failureMode: 'Bump Height 이상',
      cause: 'CRS 장착 이상',
      improvement: '초기 / 양산 검증 진행 강화 — BM 검증 작업 절차 표준화',
      preventionImprovement: 'CRS 장착 토크 관리 표준화',
      detectionImprovement: '장착 후 정밀 측정 추가',
      completedDate: '2026-02-01', status: 'G',
    },
    {
      lldNo: 'LLD26-009',
      classification: 'CIP', applyTo: 'prevention',
      processNo: '100', processName: 'Au Plating', productName: 'au bump',
      failureMode: 'Bump Height 이상',
      cause: 'Anode Mesh 도금 발생',
      improvement: '도금 발생 Source 제거를 위한 세정 능력 강화 — 정기 PM 항목 신설',
      preventionImprovement: 'Anode Mesh 정기 교체 주기 단축',
      detectionImprovement: 'Mesh 상태 정기 검사 추가',
      completedDate: '2026-02-15', status: 'G',
    },
    {
      lldNo: 'LLD26-010',
      classification: 'CIP', applyTo: 'prevention',
      processNo: '100', processName: 'Au Plating', productName: 'au bump',
      failureMode: 'Lump 발생',
      cause: 'Bath 이동간 간섭에 의한 Delay 발생',
      improvement: '월간 PM (반송 Unit 흔들림 점검) 유지',
      preventionImprovement: 'Bath 이동 경로 간섭 제거',
      detectionImprovement: 'Lump 발생 실시간 모니터링',
      completedDate: '2026-03-01', status: 'G',
    },
    {
      lldNo: 'LLD26-011',
      classification: 'CIP', applyTo: 'prevention',
      processNo: '100', processName: 'Au Plating', productName: 'au bump',
      failureMode: 'Bump 이상 형태',
      cause: 'PRE Wet 지속 유지에 의한 PR Damage',
      improvement: '월간 PM 주기 유지',
      preventionImprovement: 'PRE Wet 시간 자동 제어',
      detectionImprovement: 'Bump 형상 3D 검사 도입',
      completedDate: '2026-03-10', status: 'G',
    },
    {
      lldNo: 'LLD26-012',
      classification: 'CIP', applyTo: 'prevention',
      processNo: '100', processName: 'Au Plating', productName: 'au bump',
      failureMode: 'Plating 두께 편차',
      cause: '도금액 온도/농도 변동',
      improvement: '도금액 관리 시스템 고도화',
      preventionImprovement: '도금액 온도/농도 실시간 모니터링',
      detectionImprovement: '두께 측정 포인트 확대 (5→9 point)',
      completedDate: '2026-06-30', status: 'Y',
    },
  ];

  let fixCount = 0;
  for (const rec of fixRecords) {
    try {
      await prisma.lLDFilterCode.update({
        where: { lldNo: rec.lldNo },
        data: {
          classification: rec.classification,
          applyTo: rec.applyTo,
          processNo: rec.processNo,
          processName: rec.processName,
          productName: rec.productName,
          failureMode: rec.failureMode,
          cause: rec.cause,
          improvement: rec.improvement,
          preventionImprovement: rec.preventionImprovement,
          detectionImprovement: rec.detectionImprovement,
          completedDate: rec.completedDate,
          status: rec.status,
        },
      });
      fixCount++;
      console.log(`  [FIX] ${rec.lldNo} | ${rec.processName} | ${rec.failureMode}`);
    } catch (e: unknown) {
      // 레코드가 없으면 create
      try {
        await prisma.lLDFilterCode.create({
          data: {
            lldNo: rec.lldNo,
            classification: rec.classification,
            applyTo: rec.applyTo,
            processNo: rec.processNo,
            processName: rec.processName,
            productName: rec.productName,
            failureMode: rec.failureMode,
            cause: rec.cause,
            improvement: rec.improvement,
            preventionImprovement: rec.preventionImprovement,
            detectionImprovement: rec.detectionImprovement,
            completedDate: rec.completedDate,
            status: rec.status,
            vehicle: '',
            target: '제조',
            owner: '',
            sourceType: 'manual',
            priority: 0,
          },
        });
        fixCount++;
        console.log(`  [CREATE] ${rec.lldNo} | ${rec.processName} | ${rec.failureMode}`);
      } catch (e2) {
        console.error(`  [ERROR] ${rec.lldNo}:`, e2 instanceof Error ? e2.message : e2);
      }
    }
  }
  console.log(`\n>>> 한글 수정 완료: ${fixCount}/${fixRecords.length}건\n`);

  // ══════════════════════════════════════════════════════
  // 2. LLD26-013~019 detection 대상 항목 추가
  // ══════════════════════════════════════════════════════
  const newItems = [
    {
      lldNo: 'LLD26-013', classification: 'CIP', applyTo: 'detection',
      processNo: '30', processName: 'Scrubber', productName: 'au bump',
      failureMode: '반송장비 Loadport 충돌', cause: '반송장비의 Loadport와의 충돌',
      improvement: '충돌 센서 기반 자동 정지', detectionImprovement: '반송 전 충돌 센서 확인 자동화',
      completedDate: '2025-11-15', status: 'G',
    },
    {
      lldNo: 'LLD26-014', classification: 'CIP', applyTo: 'detection',
      processNo: '60', processName: 'PR Coating', productName: 'au bump',
      failureMode: 'PR막 오염 (Deform / Para)', cause: 'PR 반응 물질의 Wafer 내 존재',
      improvement: 'AOI 검사 추가', detectionImprovement: '도포 후 AOI 검사 추가',
      completedDate: '2026-01-10', status: 'G',
    },
    {
      lldNo: 'LLD26-015', classification: 'CIP', applyTo: 'detection',
      processNo: '100', processName: 'Au Plating', productName: 'au bump',
      failureMode: 'Bump Height 이상', cause: 'CRS 제조 이상',
      improvement: 'Bump Height 인라인 측정', detectionImprovement: 'Bump Height 인라인 측정 100%',
      completedDate: '2026-02-01', status: 'G',
    },
    {
      lldNo: 'LLD26-016', classification: 'ABN', applyTo: 'prevention',
      processNo: '70', processName: 'Develop', productName: 'au bump',
      failureMode: 'PR 잔류', cause: '현상액 농도 변동',
      improvement: '현상액 자동 보충 시스템', preventionImprovement: '현상액 농도 실시간 모니터링',
      detectionImprovement: '현상 후 잔류 PR 검사',
      completedDate: '2026-02-20', status: 'G',
    },
    {
      lldNo: 'LLD26-017', classification: 'RMA', applyTo: 'detection',
      processNo: '110', processName: 'Final Inspection', productName: 'au bump',
      failureMode: '외관 불량', cause: '검사 기준 미흡',
      improvement: '검사 기준서 개정', detectionImprovement: '검사 배율 상향 + 조명 표준화',
      completedDate: '2026-01-05', status: 'G',
    },
    {
      lldNo: 'LLD26-018', classification: 'ECN', applyTo: 'prevention',
      processNo: '80', processName: 'Etch', productName: 'au bump',
      failureMode: 'Under Etch', cause: 'Etch Rate 변동',
      improvement: 'Etch Rate 모니터링 주기 단축', preventionImprovement: 'Etch Rate 자동 보정 시스템',
      detectionImprovement: 'Etch 후 CD 측정 100%',
      completedDate: '2026-07-15', status: 'Y',
    },
    {
      lldNo: 'LLD26-019', classification: 'CIP', applyTo: 'prevention',
      processNo: '90', processName: 'Strip', productName: 'au bump',
      failureMode: 'PR 잔류', cause: 'Strip 온도 부족',
      improvement: 'Strip 온도 관리 기준 상향', preventionImprovement: 'Strip 온도 실시간 모니터링',
      detectionImprovement: 'Strip 후 잔류 PR 자동 검사',
      completedDate: '2026-08-01', status: 'R',
    },
  ];

  let newCount = 0;
  for (const item of newItems) {
    await prisma.lLDFilterCode.upsert({
      where: { lldNo: item.lldNo },
      update: {
        classification: item.classification,
        applyTo: item.applyTo,
        processNo: item.processNo,
        processName: item.processName,
        productName: item.productName,
        failureMode: item.failureMode,
        cause: item.cause,
        improvement: item.improvement,
        preventionImprovement: item.preventionImprovement || '',
        detectionImprovement: item.detectionImprovement || '',
        completedDate: item.completedDate,
        status: item.status,
      },
      create: {
        lldNo: item.lldNo,
        classification: item.classification,
        applyTo: item.applyTo,
        processNo: item.processNo,
        processName: item.processName,
        productName: item.productName,
        failureMode: item.failureMode,
        cause: item.cause,
        improvement: item.improvement,
        preventionImprovement: item.preventionImprovement || '',
        detectionImprovement: item.detectionImprovement || '',
        completedDate: item.completedDate,
        status: item.status,
        vehicle: '',
        target: '제조',
        owner: '',
        sourceType: 'manual',
        priority: 0,
      },
    });
    newCount++;
    console.log(`  [UPSERT] ${item.lldNo} (${item.classification}/${item.applyTo}) | ${item.failureMode}`);
  }
  console.log(`\n>>> 신규/보강 완료: ${newCount}/${newItems.length}건\n`);

  // ══════════════════════════════════════════════════════
  // 3. 최종 확인
  // ══════════════════════════════════════════════════════
  const total = await prisma.lLDFilterCode.count();
  const byClass = await prisma.lLDFilterCode.groupBy({ by: ['classification'], _count: true });
  const byApply = await prisma.lLDFilterCode.groupBy({ by: ['applyTo'], _count: true });
  const byStatus = await prisma.lLDFilterCode.groupBy({ by: ['status'], _count: true });

  // 한글 깨짐 확인
  const allItems = await prisma.lLDFilterCode.findMany({
    where: { lldNo: { startsWith: 'LLD26-0' } },
    select: { lldNo: true, failureMode: true, cause: true, preventionImprovement: true },
    orderBy: { lldNo: 'asc' },
  });

  console.log('=== LLD 한글 수정 + 보강 완료 ===');
  console.log('총 건수:', total);
  console.log('분류별:', byClass.map(b => `${b.classification}:${b._count}`).join(', '));
  console.log('대상별:', byApply.map(b => `${b.applyTo}:${b._count}`).join(', '));
  console.log('상태별:', byStatus.map(b => `${b.status}:${b._count}`).join(', '));

  console.log('\n--- 한글 확인 (LLD26-001~019) ---');
  for (const item of allItems) {
    const hasGarbled = /[\uFFFD]|[^\x00-\x7F\uAC00-\uD7AF\u3131-\u318E\u0020-\u007E\u00A0-\u00FF\u2000-\u206F\u2190-\u21FF\u2500-\u257F\uFF01-\uFF5E\u3000-\u303F\u2026\u00B1\u2192\u2190]/.test(
      (item.failureMode || '') + (item.cause || '') + (item.preventionImprovement || '')
    );
    const mark = hasGarbled ? ' [WARN: 깨짐 의심]' : ' [OK]';
    console.log(`  ${item.lldNo} | ${item.failureMode?.slice(0, 30)}${mark}`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
