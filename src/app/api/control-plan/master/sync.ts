/**
 * @file sync.ts
 * @description CP 워크시트 → 마스터 동기화 (FMEA sync.ts 벤치마킹, 심플 버전)
 * @created 2026-03-05
 *
 * CP는 FMEA와 달리 L1/L2/L3 계층 없이 flat 구조이므로 직접 매핑만 수행.
 * 중복 제거: itemCode|value(toLowerCase) 기준 (processNo 무관)
 */
import type { CPWorksheetDB } from '@/app/(fmea-core)/control-plan/worksheet/schema';

type CpFlatItemInput = {
  processNo: string;
  category: string;
  itemCode: string;
  value: string;
};

function isFilled(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * CP 워크시트 5개 Atomic 테이블 → CpMasterFlatItem itemCode 매핑
 */
export function extractCpMasterFlatItems(db: CPWorksheetDB): CpFlatItemInput[] {
  const items: CpFlatItemInput[] = [];

  const push = (processNo: string, category: string, itemCode: string, value: string) => {
    if (isFilled(value)) {
      items.push({ processNo, category, itemCode, value: value.trim() });
    }
  };

  // 공정현황 → A1~A5
  for (const p of db.processes) {
    const pno = p.processNo || '';
    if (!isFilled(pno)) continue;
    push(pno, 'A', 'A1', pno);
    push(pno, 'A', 'A2', p.processName);
    if (p.level) push(pno, 'A', 'A3', p.level);
    if (p.processDesc) push(pno, 'A', 'A4', p.processDesc);
    if (p.equipment) push(pno, 'A', 'A5', p.equipment);
  }

  // 검출장치 → A6, A7
  for (const d of db.detectors) {
    const pno = d.processNo || '';
    if (!isFilled(pno)) continue;
    if (d.ep) push(pno, 'A', 'A6', d.ep);
    if (d.autoDetector) push(pno, 'A', 'A7', d.autoDetector);
  }

  // 관리항목 → B1~B4
  for (const ci of db.controlItems) {
    const pno = ci.processNo || '';
    if (!isFilled(pno)) continue;
    if (ci.productChar) push(pno, 'B', 'B1', ci.productChar);
    if (ci.processChar) push(pno, 'B', 'B2', ci.processChar);
    if (ci.specialChar) push(pno, 'B', 'B3', ci.specialChar);
    if (ci.spec) push(pno, 'B', 'B4', ci.spec);
  }

  // 관리방법 → B5~B9
  for (const cm of db.controlMethods) {
    const pno = cm.processNo || '';
    if (!isFilled(pno)) continue;
    if (cm.evalMethod) push(pno, 'B', 'B5', cm.evalMethod);
    if (cm.sampleSize) push(pno, 'B', 'B6', cm.sampleSize);
    if (cm.frequency) push(pno, 'B', 'B7', cm.frequency);
    if (cm.owner1) push(pno, 'B', 'B8', cm.owner1);
    if (cm.owner2) push(pno, 'B', 'B9', cm.owner2);
  }

  // 대응계획 → B10
  for (const rp of db.reactionPlans) {
    const pno = rp.processNo || '';
    if (!isFilled(pno)) continue;
    if (rp.reactionPlan) push(pno, 'B', 'B10', rp.reactionPlan);
  }

  return items;
}

/**
 * CP 워크시트 저장 시 마스터 DB에 신규 항목만 누적 삽입
 * FMEA upsertActiveMasterFromWorksheetTx와 동일 패턴
 */
export async function upsertCpMasterFromWorksheetTx(
  tx: any,
  db: CPWorksheetDB,
): Promise<void> {
  const items = extractCpMasterFlatItems(db);
  if (items.length === 0) return;

  // 방어: 테이블 미존재 시 스킵
  if (!tx.cpMasterDataset) return;

  const cpNo = db.cpNo;

  try {
    if (!cpNo) return; // cpNo 없으면 스킵

    // cpNo별 dataset 보장 (cpNo @unique → findUnique)
    let ds = await tx.cpMasterDataset.findUnique({
      where: { cpNo },
    });
    if (!ds) {
      ds = await tx.cpMasterDataset.create({
        data: { cpNo, name: 'AUTO-MASTER', isActive: true },
      });
    }

    // 기존 항목 조회 → 중복 방지 (processNo 포함)
    const existingItems = await tx.cpMasterFlatItem.findMany({
      where: { datasetId: ds.id },
      select: { processNo: true, itemCode: true, value: true },
    });

    // processNo|itemCode|value(소문자) 기준 중복 키 셋
    const existingKeys = new Set(
      existingItems.map((e: { processNo: string; itemCode: string; value: string }) =>
        `${e.processNo}|${e.itemCode}|${String(e.value || '').trim().toLowerCase()}`,
      ),
    );

    // 신규 항목만 필터
    const newItems = items.filter((i) => {
      const key = `${i.processNo}|${i.itemCode}|${i.value.toLowerCase()}`;
      return !existingKeys.has(key);
    });

    if (newItems.length === 0) return;

    await tx.cpMasterFlatItem.createMany({
      data: newItems.map((i) => ({
        datasetId: ds.id,
        processNo: i.processNo,
        category: i.category,
        itemCode: i.itemCode,
        value: i.value,
      })),
      skipDuplicates: true,
    });

    // 버전 증가
    await tx.cpMasterDataset.update({
      where: { id: ds.id },
      data: { version: { increment: 1 } },
    });
  } catch (err: any) {
    // 테이블 미존재(마이그레이션 전) 에러 무시
    if (err?.code === 'P2021' || err?.message?.includes('does not exist')) {
      console.error('[CP Master Sync] 테이블 미존재 (마이그레이션 전):', err.message);
      return;
    }
    throw err;
  }
}
