/**
 * @file remap-fmeaid.ts
 * 역설계 Import 시스템 — STEP 4: fmeaId 리매핑 (메모리 내)
 * 설계서: docs/REVERSE_ENGINEERING_IMPORT_SYSTEM.md §2.2 STEP 4
 *
 * 구조 UUID는 유지, fmeaId만 변경.
 * 이유: 동일 구조를 다른 프로젝트에 복사하므로 구조 ID는 동일.
 */

import type { FullAtomicDB } from './guards';

/**
 * 원본 FullAtomicDB의 모든 엔티티에서 fmeaId를 targetFmeaId로 변환한다.
 * UUID(id 필드)는 변경하지 않음 → FK 참조 유지.
 */
export function remapFmeaId(
  source: FullAtomicDB,
  targetFmeaId: string
): FullAtomicDB {
  const remap = <T extends Record<string, any>>(record: T): T => ({
    ...record,
    fmeaId: targetFmeaId,
    // Prisma 관리 필드 제거 (대상 DB에서 새로 생성)
    createdAt: undefined,
    updatedAt: undefined,
  });

  const remapAll = <T extends Record<string, any>>(records: T[]): T[] =>
    records.map(remap);

  return {
    fmeaId: targetFmeaId,
    l1Structure: source.l1Structure ? remap(source.l1Structure) : null,
    l2Structures: remapAll(source.l2Structures),
    l3Structures: remapAll(source.l3Structures),
    l1Functions: remapAll(source.l1Functions),
    l2Functions: remapAll(source.l2Functions),
    l3Functions: remapAll(source.l3Functions),
    processProductChars: remapAll(source.processProductChars),
    failureEffects: remapAll(source.failureEffects),
    failureModes: remapAll(source.failureModes),
    failureCauses: remapAll(source.failureCauses),
    failureLinks: remapAll(source.failureLinks),
    riskAnalyses: remapAll(source.riskAnalyses),
    optimizations: remapAll(source.optimizations),
  };
}
