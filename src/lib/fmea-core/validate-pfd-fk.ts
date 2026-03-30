/**
 * @status CODEFREEZE L4 (Pipeline Protection) u{1F512}
 * @freeze_level L4 (Critical - DFMEA Pre-Development Snapshot)
 * @frozen_date 2026-03-30
 * @snapshot_tag codefreeze-v5.0-pre-dfmea-20260330
 * @allowed_changes NONE ???ъ슜??紐낆떆???뱀씤 + full test pass ?꾩닔
 * @manifest CODEFREEZE_PIPELINE_MANIFEST.md
 */
/**
 * @file validate-pfd-fk.ts
 * @description PFD FK 정합성 검증 유틸리티
 *
 * PfdItem의 FK 참조(fmeaL2Id, fmeaL3Id, productCharId)가
 * 실제 FMEA Atomic DB 엔티티를 가리키는지 검증한다.
 *
 * Rule 0.2 (SSoT): FK 기반 연동만 허용, 텍스트 매칭 금지
 * Rule 1.7 (UUID/FK 설계): ID 기반 매칭만 허용
 *
 * @created 2026-03-21
 */

interface OrphanL2Ref {
  pfdItemId: string;
  fmeaL2Id: string;
}

interface OrphanL3Ref {
  pfdItemId: string;
  fmeaL3Id: string;
}

interface OrphanProductCharRef {
  pfdItemId: string;
  productCharId: string;
}

interface CrossProcessRef {
  pfdItemId: string;
  pfdPno: string;
  fmeaPno: string;
}

export interface PfdFkValidationResult {
  valid: boolean;
  orphanL2Refs: OrphanL2Ref[];
  orphanL3Refs: OrphanL3Ref[];
  orphanProductCharRefs: OrphanProductCharRef[];
  crossProcessRefs: CrossProcessRef[];
}

/**
 * PFD FK 정합성 검증
 *
 * 1. fmeaL2Id → L2Structure 존재 확인
 * 2. fmeaL3Id → L3Structure 존재 확인
 * 3. productCharId → ProcessProductChar 존재 확인
 * 4. 교차공정 참조 탐지 (PFD 공정번호 ≠ FMEA L2 공정번호)
 */
export async function validatePfdFk(
  prisma: any,
  pfdNo: string,
  fmeaId: string,
): Promise<PfdFkValidationResult> {
  // 1. PFD 등록정보에서 pfdId 조회
  const pfdReg = await prisma.pfdRegistration.findUnique({
    where: { pfdNo },
    select: { id: true },
  });

  if (!pfdReg) {
    return {
      valid: true,
      orphanL2Refs: [],
      orphanL3Refs: [],
      orphanProductCharRefs: [],
      crossProcessRefs: [],
    };
  }

  // 2. PfdItem 전체 조회 (FK 필드만)
  const pfdItems = await prisma.pfdItem.findMany({
    where: { pfdId: pfdReg.id },
    select: {
      id: true,
      processNo: true,
      fmeaL2Id: true,
      fmeaL3Id: true,
      productCharId: true,
    },
  });

  // 3. FMEA Atomic DB 엔티티 ID Set 구축
  const [l2Structs, l3Structs, productChars] = await Promise.all([
    prisma.l2Structure.findMany({
      where: { fmeaId },
      select: { id: true, processNo: true },
    }),
    prisma.l3Structure.findMany({
      where: { fmeaId },
      select: { id: true },
    }),
    prisma.processProductChar.findMany({
      where: { fmeaId },
      select: { id: true },
    }),
  ]);

  const l2IdSet = new Set(l2Structs.map((r: { id: string }) => r.id));
  const l3IdSet = new Set(l3Structs.map((r: { id: string }) => r.id));
  const pcIdSet = new Set(productChars.map((r: { id: string }) => r.id));

  // L2 ID → processNo 매핑 (교차공정 탐지용)
  const l2PnoMap = new Map<string, string>();
  for (const l2 of l2Structs) {
    if (l2.processNo) {
      l2PnoMap.set(l2.id, l2.processNo);
    }
  }

  // 4. FK 검증
  const orphanL2Refs: OrphanL2Ref[] = [];
  const orphanL3Refs: OrphanL3Ref[] = [];
  const orphanProductCharRefs: OrphanProductCharRef[] = [];
  const crossProcessRefs: CrossProcessRef[] = [];

  for (const item of pfdItems) {
    // 4a. fmeaL2Id 존재 확인
    if (item.fmeaL2Id && !l2IdSet.has(item.fmeaL2Id)) {
      orphanL2Refs.push({
        pfdItemId: item.id,
        fmeaL2Id: item.fmeaL2Id,
      });
    }

    // 4b. fmeaL3Id 존재 확인
    if (item.fmeaL3Id && !l3IdSet.has(item.fmeaL3Id)) {
      orphanL3Refs.push({
        pfdItemId: item.id,
        fmeaL3Id: item.fmeaL3Id,
      });
    }

    // 4c. productCharId 존재 확인
    if (item.productCharId && !pcIdSet.has(item.productCharId)) {
      orphanProductCharRefs.push({
        pfdItemId: item.id,
        productCharId: item.productCharId,
      });
    }

    // 4d. 교차공정 참조 탐지: PFD processNo ≠ FMEA L2 processNo
    if (item.fmeaL2Id && item.processNo && l2PnoMap.has(item.fmeaL2Id)) {
      const fmeaPno = l2PnoMap.get(item.fmeaL2Id)!;
      // 공정번호 정규화 비교 (숫자 부분만)
      const pfdPnoNorm = item.processNo.replace(/\D/g, '');
      const fmeaPnoNorm = fmeaPno.replace(/\D/g, '');
      if (pfdPnoNorm && fmeaPnoNorm && pfdPnoNorm !== fmeaPnoNorm) {
        crossProcessRefs.push({
          pfdItemId: item.id,
          pfdPno: item.processNo,
          fmeaPno: fmeaPno,
        });
      }
    }
  }

  const valid =
    orphanL2Refs.length === 0 &&
    orphanL3Refs.length === 0 &&
    orphanProductCharRefs.length === 0 &&
    crossProcessRefs.length === 0;

  return {
    valid,
    orphanL2Refs,
    orphanL3Refs,
    orphanProductCharRefs,
    crossProcessRefs,
  };
}
