/**
 * @file validate-cross-refs.ts
 * @description Cross-schema 참조 무결성 검증 유틸리티
 *
 * ★★★ 2026-04-03: TODO-04 재정의 ★★★
 * UnifiedProcessItem.fmeaL2Id, PfdItem.fmeaL2Id, CpAtomicProcess.pfmeaL2Id 등
 * 같은 프로젝트 스키마 내 L2Structure/L3Structure를 참조하는 String 필드들이
 * @relation 없이 자유 문자열로 저장되어 있어, 참조 대상 삭제 시 고아 레코드 발생.
 *
 * 이 모듈은:
 * 1. validateCrossSchemaRefs() — 저장 시점에 참조 대상 실존을 검증
 * 2. auditOrphanCrossRefs() — 헬스체크 시점에 고아 참조 전수 조사
 */

/**
 * 저장 시점 검증: 참조 대상 ID들이 실제 L2/L3Structure에 존재하는지 확인
 * @returns 유효하지 않은 참조 목록 (빈 배열이면 모두 유효)
 */
export async function validateCrossSchemaRefs(
  prisma: any,
  refs: Array<{
    sourceModel: string;      // 'UnifiedProcessItem' | 'PfdItem' | 'CpAtomicProcess'
    sourceId: string;         // 레코드 ID
    fmeaL2Id?: string | null; // L2Structure 참조
    fmeaL3Id?: string | null; // L3Structure 참조
  }>,
): Promise<Array<{
  sourceModel: string;
  sourceId: string;
  field: string;
  orphanId: string;
}>> {
  if (refs.length === 0) return [];

  // 참조된 L2/L3 ID 수집
  const l2Ids = new Set<string>();
  const l3Ids = new Set<string>();
  for (const ref of refs) {
    if (ref.fmeaL2Id) l2Ids.add(ref.fmeaL2Id);
    if (ref.fmeaL3Id) l3Ids.add(ref.fmeaL3Id);
  }

  if (l2Ids.size === 0 && l3Ids.size === 0) return [];

  // DB에서 실제 존재하는 ID 조회 (배치)
  const [existingL2, existingL3] = await Promise.all([
    l2Ids.size > 0
      ? prisma.l2Structure.findMany({
          where: { id: { in: [...l2Ids] } },
          select: { id: true },
        }).then((rows: { id: string }[]) => new Set(rows.map(r => r.id)))
      : new Set<string>(),
    l3Ids.size > 0
      ? prisma.l3Structure.findMany({
          where: { id: { in: [...l3Ids] } },
          select: { id: true },
        }).then((rows: { id: string }[]) => new Set(rows.map(r => r.id)))
      : new Set<string>(),
  ]);

  // 고아 참조 탐지
  const orphans: Array<{
    sourceModel: string;
    sourceId: string;
    field: string;
    orphanId: string;
  }> = [];

  for (const ref of refs) {
    if (ref.fmeaL2Id && !existingL2.has(ref.fmeaL2Id)) {
      orphans.push({
        sourceModel: ref.sourceModel,
        sourceId: ref.sourceId,
        field: 'fmeaL2Id',
        orphanId: ref.fmeaL2Id,
      });
    }
    if (ref.fmeaL3Id && !existingL3.has(ref.fmeaL3Id)) {
      orphans.push({
        sourceModel: ref.sourceModel,
        sourceId: ref.sourceId,
        field: 'fmeaL3Id',
        orphanId: ref.fmeaL3Id,
      });
    }
  }

  return orphans;
}

/**
 * 헬스체크용: 프로젝트 스키마 내 모든 cross-ref 고아 레코드 전수 조사
 * @returns 모델별 고아 카운트 + 상세 목록 (최대 10건씩)
 */
export async function auditOrphanCrossRefs(
  prisma: any,
  fmeaId: string,
): Promise<{
  totalOrphans: number;
  models: Array<{
    model: string;
    field: string;
    orphanCount: number;
    samples: Array<{ id: string; orphanRefId: string }>;
  }>;
}> {
  const result: {
    totalOrphans: number;
    models: Array<{
      model: string;
      field: string;
      orphanCount: number;
      samples: Array<{ id: string; orphanRefId: string }>;
    }>;
  } = { totalOrphans: 0, models: [] };

  // L2/L3 Structure 실존 ID Set
  const [l2Rows, l3Rows] = await Promise.all([
    prisma.l2Structure.findMany({ where: { fmeaId }, select: { id: true } }),
    prisma.l3Structure.findMany({ where: { fmeaId }, select: { id: true } }),
  ]);
  const l2Set = new Set((l2Rows as { id: string }[]).map(r => r.id));
  const l3Set = new Set((l3Rows as { id: string }[]).map(r => r.id));

  // 검사 대상 모델 + 필드 매핑
  const checks: Array<{
    model: string;
    prismaModel: string;
    l2Field: string;
    l3Field: string;
  }> = [
    { model: 'UnifiedProcessItem', prismaModel: 'unifiedProcessItem', l2Field: 'fmeaL2Id', l3Field: 'fmeaL3Id' },
    { model: 'PfdItem', prismaModel: 'pfdItem', l2Field: 'fmeaL2Id', l3Field: 'fmeaL3Id' },
    { model: 'CpAtomicProcess', prismaModel: 'cpAtomicProcess', l2Field: 'pfmeaL2Id', l3Field: 'pfmeaL3Id' },
  ];

  for (const check of checks) {
    let rows: any[];
    try {
      // fmeaId 또는 cpNo/pfdId 기반으로 해당 프로젝트 레코드 조회
      // UnifiedProcessItem은 apqpNo, PfdItem은 pfdId, CpAtomicProcess는 cpNo
      if (check.prismaModel === 'unifiedProcessItem') {
        rows = await prisma.unifiedProcessItem.findMany({
          where: { apqpNo: fmeaId },
          select: { id: true, [check.l2Field]: true, [check.l3Field]: true },
        });
      } else if (check.prismaModel === 'pfdItem') {
        // PfdItem은 pfdId(PfdRegistration의 id)로 필터 — fmeaId 직접 필드 없음
        // PfdRegistration에서 fmeaId로 pfd를 찾아 pfdId 목록을 수집
        const pfdRegs = await prisma.pfdRegistration.findMany({
          where: { fmeaId },
          select: { id: true },
        });
        const pfdIds = (pfdRegs as { id: string }[]).map(r => r.id);
        if (pfdIds.length === 0) continue;
        rows = await prisma.pfdItem.findMany({
          where: { pfdId: { in: pfdIds } },
          select: { id: true, [check.l2Field]: true, [check.l3Field]: true },
        });
      } else if (check.prismaModel === 'cpAtomicProcess') {
        // CpAtomicProcess는 cpNo → CpRegistration.fmeaId로 역추적
        const cpRegs = await prisma.cpRegistration.findMany({
          where: { fmeaId },
          select: { cpNo: true },
        });
        const cpNos = (cpRegs as { cpNo: string }[]).map(r => r.cpNo);
        if (cpNos.length === 0) continue;
        rows = await prisma.cpAtomicProcess.findMany({
          where: { cpNo: { in: cpNos } },
          select: { id: true, [check.l2Field]: true, [check.l3Field]: true },
        });
      } else {
        continue;
      }
    } catch {
      // 테이블이 없거나 필드가 없으면 스킵
      continue;
    }

    // L2 고아 확인
    const l2Orphans = rows.filter((r: any) => r[check.l2Field] && !l2Set.has(r[check.l2Field]));
    if (l2Orphans.length > 0) {
      result.totalOrphans += l2Orphans.length;
      result.models.push({
        model: check.model,
        field: check.l2Field,
        orphanCount: l2Orphans.length,
        samples: l2Orphans.slice(0, 10).map((r: any) => ({
          id: r.id,
          orphanRefId: r[check.l2Field],
        })),
      });
    }

    // L3 고아 확인  
    const l3Orphans = rows.filter((r: any) => r[check.l3Field] && !l3Set.has(r[check.l3Field]));
    if (l3Orphans.length > 0) {
      result.totalOrphans += l3Orphans.length;
      result.models.push({
        model: check.model,
        field: check.l3Field,
        orphanCount: l3Orphans.length,
        samples: l3Orphans.slice(0, 10).map((r: any) => ({
          id: r.id,
          orphanRefId: r[check.l3Field],
        })),
      });
    }
  }

  return result;
}
