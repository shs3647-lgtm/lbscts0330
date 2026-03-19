/**
 * @file validate-fk-doors.ts
 * @description FK 문 잠금 검증 — CP/PFD 꽂아넣기 전 모든 FK가 실제 존재하는지 확인
 *
 * 비유: FK 슬롯 = 문, 정상 데이터 = 열쇠가 맞는 자재, 잘못된 데이터 = 문 잠김
 * 5개 문 중 하나라도 열쇠가 안 맞으면 해당 행 INSERT 거부
 */

import type { CpItemSkeleton, PfdItemSkeleton } from './build-cp-pfd-skeleton';

// ══════════════════════════════════════════════════════
// 타입 정의
// ══════════════════════════════════════════════════════

export interface DoorCheckResult {
  door: string;
  value: string;
  table: string;
  exists: boolean;
  fix?: string;
}

export interface ValidationResult {
  allPass: boolean;
  summary: { total: number; passed: number; failed: number };
  results: DoorCheckResult[];
}

// ══════════════════════════════════════════════════════
// 메인 함수
// ══════════════════════════════════════════════════════

export async function validateFkDoors(
  prisma: any,
  fmeaId: string,
  cpItems: CpItemSkeleton[],
  pfdItems: PfdItemSkeleton[]
): Promise<ValidationResult> {
  const results: DoorCheckResult[] = [];

  // ── 문 1: pfmeaProcessId → L2Structure ──
  const l2Ids = [
    ...new Set([
      ...cpItems.map(i => i.pfmeaProcessId),
      ...pfdItems.map(i => i.fmeaL2Id),
    ].filter(Boolean)),
  ];

  const existingL2 = await prisma.l2Structure.findMany({
    where: { id: { in: l2Ids }, fmeaId },
    select: { id: true },
  });
  const l2Set = new Set(existingL2.map((r: any) => r.id));

  for (const id of l2Ids) {
    results.push({
      door: 'L2Structure',
      value: id,
      table: 'l2_structures',
      exists: l2Set.has(id),
      fix: l2Set.has(id) ? undefined : 'FMEA 구조분석에서 해당 공정을 확인하세요',
    });
  }

  // ── 문 2: productCharId → ProcessProductChar ──
  const ppcIds = [
    ...new Set([
      ...cpItems.map(i => i.productCharId),
      ...pfdItems.map(i => i.productCharId),
    ].filter(Boolean) as string[]),
  ];

  if (ppcIds.length > 0) {
    const existingPpc = await prisma.processProductChar.findMany({
      where: { id: { in: ppcIds }, fmeaId },
      select: { id: true },
    });
    const ppcSet = new Set(existingPpc.map((r: any) => r.id));

    for (const id of ppcIds) {
      results.push({
        door: 'ProcessProductChar',
        value: id,
        table: 'process_product_chars',
        exists: ppcSet.has(id),
        fix: ppcSet.has(id) ? undefined : 'FMEA에서 해당 제품특성을 먼저 생성하세요',
      });
    }
  }

  // ── 문 3: processCharId → L3Function ──
  const l3FuncIds = [
    ...new Set([
      ...cpItems.map(i => i.processCharId),
      ...pfdItems.map(i => i.processCharId),
    ].filter(Boolean) as string[]),
  ];

  if (l3FuncIds.length > 0) {
    const existingL3F = await prisma.l3Function.findMany({
      where: { id: { in: l3FuncIds } },
      select: { id: true },
    });
    const l3fSet = new Set(existingL3F.map((r: any) => r.id));

    for (const id of l3FuncIds) {
      results.push({
        door: 'L3Function',
        value: id,
        table: 'l3_functions',
        exists: l3fSet.has(id),
        fix: l3fSet.has(id) ? undefined : 'FMEA 기능분석에서 해당 공정특성을 확인하세요',
      });
    }
  }

  // ── 문 4: linkId → FailureLink ──
  const linkIds = [
    ...new Set(cpItems.map(i => i.linkId).filter(Boolean) as string[]),
  ];

  if (linkIds.length > 0) {
    const existingFL = await prisma.failureLink.findMany({
      where: { id: { in: linkIds }, fmeaId },
      select: { id: true },
    });
    const flSet = new Set(existingFL.map((r: any) => r.id));

    for (const id of linkIds) {
      results.push({
        door: 'FailureLink',
        value: id,
        table: 'failure_links',
        exists: flSet.has(id),
        fix: flSet.has(id) ? undefined : 'FMEA 고장분석에서 해당 고장사슬을 확인하세요',
      });
    }
  }

  const passed = results.filter(r => r.exists).length;
  const failed = results.filter(r => !r.exists).length;

  return {
    allPass: failed === 0,
    summary: { total: results.length, passed, failed },
    results,
  };
}
