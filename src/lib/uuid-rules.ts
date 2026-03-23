/**
 * @file uuid-rules.ts
 * @description UUID/FK 검증 유틸리티 — FMEA 시스템의 모든 ID/FK 정합성 검증
 *
 * Rule 1.7(UUID/FK 설계 원칙)과 Rule 1.6(근본원인 분석 원칙)을 코드로 구현한다.
 * 모든 dedup key에 공정번호/구분 컨텍스트가 포함되어야 하며,
 * FK 연결은 ID 기반만 허용한다.
 *
 * UUID 구조 (uuid-generator.ts 참조):
 *   {DOC}-{LEVEL}-{PARAMS}
 *   DOC: PF(PFMEA) / DF(DFMEA) / CP(관리계획서) / PD(PFD)
 *   LEVEL: L1 / L2 / L3 / FC
 *   Entity types: F(Function) / P(ProductChar) / M(FailureMode) /
 *                 D(DetectionCtrl) / G(L3Function) / C(ProcessChar) /
 *                 K(FailureCause) / V(PreventionCtrl)
 *
 * 5대 원칙:
 *   1. 문서 유형 최우선 (첫 세그먼트)
 *   2. 계층 명시 (두 번째 세그먼트)
 *   3. 자식 UUID는 부모 UUID를 prefix로 포함
 *   4. 순번 001~999 (3자리 zero-padding)
 *   5. 코드=식별자 (행/열 위치는 sheetRow 별도 컬럼)
 *
 * @version 2.0.0
 * @created 2026-03-21
 * @see CLAUDE.md Rule 1.7 — UUID/FK 설계 원칙
 * @see src/lib/uuid-generator.ts — UUID 생성기
 */

// ══════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════

/** Supported document types */
export type DocType = 'PF' | 'DF' | 'CP' | 'PD';

/** Hierarchy levels */
export type Level = 'L1' | 'L2' | 'L3' | 'FC';

/** L3 M4 category codes */
export type M4Code = 'MC' | 'MT' | 'MN' | 'ME' | 'EN';

/** Entity type suffixes within a UUID */
export type EntityType = 'F' | 'P' | 'M' | 'D' | 'G' | 'C' | 'K' | 'V';

/** L1 division codes */
export type L1Division = 'YP' | 'SP' | 'US';

/** Result of parsing a structured UUID */
export interface ParsedUuid {
  /** Raw input UUID string */
  raw: string;
  /** Document type: PF, DF, CP, PD */
  docType: DocType;
  /** Hierarchy level: L1, L2, L3, FC */
  level: Level;
  /** Process number as zero-padded string (e.g. "010", "040"). Null for L1. */
  processNo: string | null;
  /** M4 category code for L3-level UUIDs (MC, MT, MN, ME, EN). Null otherwise. */
  m4: M4Code | null;
  /** Entity type suffix (F, P, M, D, G, C, K, V). Null if no entity suffix. */
  entityType: EntityType | null;
  /** Trailing sequence number (last numeric segment). Null if none. */
  seq: number | null;
}

/** Result of a validation check */
export interface ValidationResult {
  /** Whether the validation passed */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
}

/** Dedup key rule definition */
export interface DedupKeyRule {
  /** Names of the required pipe-separated parts */
  parts: string[];
  /** Minimum number of pipe-delimited segments required */
  minParts: number;
  /** Human-readable description of the rule */
  description: string;
}

// ══════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════

const VALID_DOC_TYPES = new Set<string>(['PF', 'DF', 'CP', 'PD']);
const VALID_LEVELS = new Set<string>(['L1', 'L2', 'L3', 'FC']);
const VALID_M4_CODES = new Set<string>(['MC', 'MT', 'MN', 'ME', 'EN']);
const VALID_ENTITY_TYPES = new Set<string>(['F', 'P', 'M', 'D', 'G', 'C', 'K', 'V']);

/**
 * Dedup key rules per entity type.
 *
 * Each entry defines the required pipe-separated parts in a dedup key.
 * The `parts` array names each required segment; `minParts` is the minimum
 * count of pipe-delimited segments that must be present.
 *
 * These rules enforce CLAUDE.md Rule 1.7.1: every dedup key must contain
 * the entity's context (process number, division, etc.) to prevent
 * "same text = same entity" collisions.
 *
 * @example
 * // For FC (FailureCause):
 * // dedup key = "l2StructId|l3StructId|cause"
 * DEDUP_KEY_RULES.FC // { parts: ['l2StructId','l3StructId','cause'], minParts: 3 }
 */
export const DEDUP_KEY_RULES: Record<string, DedupKeyRule> = {
  FC: {
    parts: ['l2StructId', 'l3StructId', 'cause'],
    minParts: 3,
    description: 'FailureCause: must include l2StructId|l3StructId|cause (공정+작업요소+원인)',
  },
  FL: {
    parts: ['fmId', 'fcId', 'feId'],
    minParts: 3,
    description: 'FailureLink: must include fmId|fcId|feId (3요소 필수)',
  },
  FM: {
    parts: ['pno', 'fm'],
    minParts: 2,
    description: 'FailureMode: must include pno|fm (공정번호+고장형태)',
  },
  FE: {
    parts: ['procNo', 'scope', 'fe'],
    minParts: 3,
    description: 'FailureEffect: must include procNo|scope|fe (공정번호+구분+고장영향)',
  },
  B4: {
    parts: ['pno', 'm4', 'we', 'fm', 'fc'],
    minParts: 5,
    description: 'B4 (FailureCause import): must include pno|m4|we|fm|fc',
  },
  A4: {
    parts: ['pno', 'char'],
    minParts: 2,
    description: 'A4 (ProductChar): must include pno|char (공정번호+특성)',
  },
  A5: {
    parts: ['pno', 'fm'],
    minParts: 2,
    description: 'A5 (FailureMode import): must include pno|fm (공정번호+고장형태)',
  },
  B1: {
    parts: ['pno', 'm4', 'we'],
    minParts: 3,
    description: 'B1 (L3Structure): must include pno|m4|we (공정번호+카테고리+작업요소)',
  },
  B2: {
    parts: ['pno', 'm4', 'we'],
    minParts: 3,
    description: 'B2 (L3Function): must include pno|m4|we (공정번호+카테고리+작업요소)',
  },
  B5: {
    parts: ['pno', 'm4', 'we', 'fc', 'pc'],
    minParts: 5,
    description: 'B5 (PreventionCtrl): must include pno|m4|we|fc|pc',
  },
  C4: {
    parts: ['procNo', 'scope', 'fe'],
    minParts: 3,
    description: 'C4 (FailureEffect): must include procNo|scope|fe (공정번호+구분+고장영향)',
  },
  L1Function: {
    parts: ['category', 'functionName'],
    minParts: 2,
    description: 'L1Function: must include category|functionName (구분+기능명)',
  },
};

// ══════════════════════════════════════════════
// 1. parseUuid — UUID 파싱
// ══════════════════════════════════════════════

/**
 * Parse a structured UUID string and extract its components.
 *
 * Supports all UUID patterns from uuid-generator.ts:
 * - L1: PF-L1-YP, PF-L1-YP-001, PF-L1-YP-001-002, PF-L1-YP-001-002-001
 * - L2: PF-L2-040, PF-L2-040-F-001, PF-L2-040-P-001, PF-L2-040-M-001, PF-L2-040-D-001
 * - L3: PF-L3-040-MC-001, PF-L3-040-MC-001-G, PF-L3-040-MC-001-G-002,
 *        PF-L3-040-MC-001-C-001, PF-L3-040-MC-001-K-001, PF-L3-040-MC-001-V-001
 * - FC: PF-FC-040-M001-MC001-K001
 *
 * @param id - The UUID string to parse
 * @returns Parsed UUID components, or null if the string is not a valid structured UUID
 *
 * @example
 * parseUuid("PF-L2-040-F-001")
 * // { raw: "PF-L2-040-F-001", docType: "PF", level: "L2",
 * //   processNo: "040", m4: null, entityType: "F", seq: 1 }
 *
 * parseUuid("PF-L3-010-MC-002-K-003")
 * // { raw: "PF-L3-010-MC-002-K-003", docType: "PF", level: "L3",
 * //   processNo: "010", m4: "MC", entityType: "K", seq: 3 }
 *
 * parseUuid("PF-FC-040-M001-MC001-K001")
 * // { raw: "PF-FC-040-M001-MC001-K001", docType: "PF", level: "FC",
 * //   processNo: "040", m4: "MC", entityType: "K", seq: 1 }
 *
 * parseUuid("invalid-string") // null
 */
export function parseUuid(id: string): ParsedUuid | null {
  if (!id || typeof id !== 'string') return null;

  const segs = id.split('-');
  if (segs.length < 3) return null;

  const docType = segs[0];
  if (!VALID_DOC_TYPES.has(docType)) return null;

  const level = segs[1];
  if (!VALID_LEVELS.has(level)) return null;

  const result: ParsedUuid = {
    raw: id,
    docType: docType as DocType,
    level: level as Level,
    processNo: null,
    m4: null,
    entityType: null,
    seq: null,
  };

  if (level === 'L1') {
    // L1 patterns: PF-L1-{div}[-seq[-seq[-seq]]]
    // No processNo for L1
    const lastSeg = segs[segs.length - 1];
    if (/^\d+$/.test(lastSeg) && segs.length > 3) {
      result.seq = parseInt(lastSeg, 10);
    }
    return result;
  }

  if (level === 'L2') {
    // L2 patterns: PF-L2-{pno}[-{entityType}-{seq}]
    result.processNo = segs[2];

    if (segs.length >= 5) {
      const entitySeg = segs[3];
      if (VALID_ENTITY_TYPES.has(entitySeg)) {
        result.entityType = entitySeg as EntityType;
      }
      const seqSeg = segs[4];
      if (/^\d+$/.test(seqSeg)) {
        result.seq = parseInt(seqSeg, 10);
      }
    }
    return result;
  }

  if (level === 'L3') {
    // L3 patterns: PF-L3-{pno}-{m4}-{b1seq}[-{entityType}[-{seq}]]
    if (segs.length < 5) return null;
    result.processNo = segs[2];

    const m4Seg = segs[3];
    if (VALID_M4_CODES.has(m4Seg)) {
      result.m4 = m4Seg as M4Code;
    }

    // segs[4] = b1seq (work element sequence number)
    // segs[5] = optional entity type (G, C, K, V, F, etc.)
    // segs[6] = optional sub-sequence
    if (segs.length >= 6) {
      const entitySeg = segs[5];
      if (VALID_ENTITY_TYPES.has(entitySeg)) {
        result.entityType = entitySeg as EntityType;
        if (segs.length >= 7 && /^\d+$/.test(segs[6])) {
          result.seq = parseInt(segs[6], 10);
        }
      }
    }

    // If no entity type found, use the last numeric segment as seq
    if (result.entityType === null && result.seq === null) {
      const lastSeg = segs[segs.length - 1];
      if (/^\d+$/.test(lastSeg)) {
        result.seq = parseInt(lastSeg, 10);
      }
    }
    return result;
  }

  if (level === 'FC') {
    // FC pattern: PF-FC-{pno}-M{mseq}-{m4}{b1seq}-K{kseq}
    if (segs.length < 6) return null;
    result.processNo = segs[2];

    // Extract K sequence from last segment (e.g. "K001" -> 1)
    const lastSeg = segs[segs.length - 1];
    const kMatch = lastSeg.match(/^K(\d+)$/);
    if (kMatch) {
      result.entityType = 'K';
      result.seq = parseInt(kMatch[1], 10);
    }

    // Extract M4 from the 5th segment (e.g. "MC001")
    if (segs.length >= 5) {
      const m4Seg = segs[4];
      for (const code of VALID_M4_CODES) {
        if (m4Seg.startsWith(code)) {
          result.m4 = code as M4Code;
          break;
        }
      }
    }
    return result;
  }

  return null;
}

// ══════════════════════════════════════════════
// 2. extractPno — 공정번호 추출
// ══════════════════════════════════════════════

/**
 * Extract the process number from a UUID string.
 *
 * Uses parseUuid internally to correctly handle all UUID formats.
 * L1-level UUIDs have no process number and return null.
 *
 * @param id - The UUID string
 * @returns The process number as a string (e.g. "010", "040"), or null if not found
 *
 * @example
 * extractPno("PF-L2-040-F-001")            // "040"
 * extractPno("PF-L3-010-MC-001-K-002")     // "010"
 * extractPno("PF-FC-040-M001-MC001-K001")  // "040"
 * extractPno("PF-L1-YP-001")               // null (L1 has no process number)
 * extractPno("invalid")                     // null
 */
export function extractPno(id: string): string | null {
  const parsed = parseUuid(id);
  return parsed?.processNo ?? null;
}

/**
 * L3Function.id가 genB2(요소기능) UUID 패턴인지 — B3(-C-) 없이 B2만 있는 L3F 행.
 * 빈 processChar는 정상이므로 pipeline emptyPC/emptyProcessChar에서 제외한다.
 */
export function isL3FunctionIdB2Pattern(id: string): boolean {
  if (!id.startsWith('PF-L3-')) return false;
  if (id.includes('-C-')) return false;
  return /-G(?:-\d{3})?$/.test(id);
}

// ══════════════════════════════════════════════
// 3. validateParentChild — 부모-자식 관계 검증
// ══════════════════════════════════════════════

/**
 * Validate that a child UUID correctly belongs to a parent UUID.
 *
 * Checks two rules from uuid-generator.ts principle #3:
 * 1. The child UUID starts with the parent UUID as a prefix
 * 2. Process numbers match between parent and child (if both have one)
 *
 * @param childId - The child UUID
 * @param parentId - The expected parent UUID
 * @returns Validation result with error message if invalid
 *
 * @example
 * validateParentChild("PF-L2-040-F-001", "PF-L2-040")
 * // { valid: true }
 *
 * validateParentChild("PF-L2-040-F-001", "PF-L2-050")
 * // { valid: false, error: "Child UUID does not start with parent prefix..." }
 *
 * validateParentChild("PF-L3-040-MC-001-K-001", "PF-L3-040-MC-001")
 * // { valid: true }
 */
export function validateParentChild(childId: string, parentId: string): ValidationResult {
  if (!childId || !parentId) {
    return { valid: false, error: 'Both childId and parentId are required' };
  }

  // Rule 1: Child must start with parent prefix
  if (!childId.startsWith(parentId)) {
    return {
      valid: false,
      error: `Child UUID "${childId}" does not start with parent prefix "${parentId}". `
        + 'Child UUID must contain parent UUID as a prefix (uuid-generator principle #3).',
    };
  }

  // Rule 2: Process numbers must match
  const childPno = extractPno(childId);
  const parentPno = extractPno(parentId);

  if (childPno && parentPno && childPno !== parentPno) {
    return {
      valid: false,
      error: `Process number mismatch: child="${childId}" (pno="${childPno}"), `
        + `parent="${parentId}" (pno="${parentPno}"). `
        + 'Cross-process FK contamination detected (Rule 1.7).',
    };
  }

  return { valid: true };
}

// ══════════════════════════════════════════════
// 4. validateDedupKey — dedup key 검증
// ══════════════════════════════════════════════

/**
 * Validate that a dedup key contains all required context parts for a given entity type.
 *
 * Dedup keys are pipe-delimited strings (e.g. "pno|m4|we|fm|fc").
 * Each entity type has a minimum number of required parts as defined in DEDUP_KEY_RULES.
 * Empty segments within the key are also rejected.
 *
 * @param entity - Entity type code (e.g. "FC", "FL", "FM", "B4", "A4")
 * @param key - The pipe-delimited dedup key string
 * @returns Validation result with error if key is insufficient
 *
 * @example
 * validateDedupKey("FC", "l2-001|l3-001|cracking")
 * // { valid: true }
 *
 * validateDedupKey("FL", "fm001|fc001")
 * // { valid: false, error: "FL dedup key has 2 parts, needs at least 3..." }
 *
 * validateDedupKey("B4", "010|MC|we1|fm1|fc1")
 * // { valid: true }
 *
 * validateDedupKey("B4", "010||we1|fm1|fc1")
 * // { valid: false, error: "...has empty segment(s)..." }
 */
export function validateDedupKey(entity: string, key: string): ValidationResult {
  const rule = DEDUP_KEY_RULES[entity];
  if (!rule) {
    return {
      valid: false,
      error: `Unknown entity type "${entity}". Valid types: ${Object.keys(DEDUP_KEY_RULES).join(', ')}`,
    };
  }

  if (!key || typeof key !== 'string') {
    return {
      valid: false,
      error: `Dedup key is empty or invalid for entity "${entity}". ${rule.description}`,
    };
  }

  const parts = key.split('|');
  if (parts.length < rule.minParts) {
    return {
      valid: false,
      error: `${entity} dedup key has ${parts.length} part(s) ("${key}"), `
        + `needs at least ${rule.minParts}. ${rule.description}. `
        + `Required parts: [${rule.parts.join(', ')}]`,
    };
  }

  // Check for empty segments (e.g. "pno||fc" with missing m4)
  const emptyParts = parts.reduce<number[]>((acc, part, idx) => {
    if (!part.trim()) acc.push(idx);
    return acc;
  }, []);

  if (emptyParts.length > 0) {
    return {
      valid: false,
      error: `${entity} dedup key "${key}" has empty segment(s) at position(s): [${emptyParts.join(', ')}]. `
        + `All parts must be non-empty. Required: [${rule.parts.join(', ')}]`,
    };
  }

  return { valid: true };
}

// ══════════════════════════════════════════════
// 5. validateFkExists — FK 존재 검증
// ══════════════════════════════════════════════

/**
 * Validate that a foreign key target exists in the entity map.
 *
 * This enforces Rule 1.7: FK matching is ID-based only.
 * Text/name-based matching is forbidden for FK connections.
 *
 * @param fkId - The foreign key UUID to look up
 * @param entityMap - Map of entity ID to entity data
 * @returns Validation result with error if FK target is missing (orphan FK)
 *
 * @example
 * const fmMap = new Map([["PF-L2-040-M-001", { mode: "cracking" }]]);
 * validateFkExists("PF-L2-040-M-001", fmMap) // { valid: true }
 * validateFkExists("PF-L2-999-M-001", fmMap) // { valid: false, error: "FK target not found..." }
 */
export function validateFkExists(fkId: string, entityMap: Map<string, unknown>): ValidationResult {
  if (!fkId) {
    return {
      valid: false,
      error: 'FK ID is empty or undefined. Cannot validate a null FK reference.',
    };
  }

  if (!entityMap || !(entityMap instanceof Map)) {
    return {
      valid: false,
      error: 'Entity map is not a valid Map instance.',
    };
  }

  if (!entityMap.has(fkId)) {
    return {
      valid: false,
      error: `FK target not found: "${fkId}" does not exist in entity map `
        + `(${entityMap.size} entries). Orphan FK detected — ensure the referenced `
        + 'entity exists before creating the FK link (Rule 0.6).',
    };
  }

  return { valid: true };
}

// ══════════════════════════════════════════════
// 6. validateNoCrossProcess — 교차공정 FK 오염 검증
// ══════════════════════════════════════════════

/**
 * Batch validate that no items have cross-process FK contamination.
 *
 * Checks that every child's process number matches its parent's process number.
 * Items without a parentId are skipped. Items where neither side has a parseable
 * process number (e.g. both L1) are also skipped.
 *
 * @param items - Array of items with id and optional parentId
 * @returns Array of validation results, one per item that has a parentId.
 *          Items without parentId are excluded from the results.
 *
 * @example
 * validateNoCrossProcess([
 *   { id: "PF-L3-040-MC-001-K-001", parentId: "PF-L3-040-MC-001" }, // valid
 *   { id: "PF-L3-040-MC-001-K-002", parentId: "PF-L3-050-MC-001" }, // invalid: 040 vs 050
 *   { id: "PF-L2-010", parentId: undefined }, // skipped (no parentId)
 * ])
 * // [{ valid: true }, { valid: false, error: "Cross-process FK contamination..." }]
 */
export function validateNoCrossProcess(
  items: Array<{ id: string; parentId?: string | null }>
): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const item of items) {
    if (!item.parentId) continue;

    const childPno = extractPno(item.id);
    const parentPno = extractPno(item.parentId);

    if (childPno === null && parentPno === null) {
      // Both L1 or unparseable — skip
      continue;
    }

    if (childPno === null || parentPno === null) {
      results.push({
        valid: false,
        error: `Cannot compare process numbers: child="${item.id}" `
          + `(pno=${childPno ?? 'N/A'}), parent="${item.parentId}" `
          + `(pno=${parentPno ?? 'N/A'}). `
          + 'One side has no process number — verify UUID structure.',
      });
      continue;
    }

    if (childPno !== parentPno) {
      results.push({
        valid: false,
        error: `Cross-process FK contamination: child="${item.id}" `
          + `(pno=${childPno}) references parent="${item.parentId}" `
          + `(pno=${parentPno}). `
          + 'Child must belong to the same process as parent (Rule 1.7).',
      });
    } else {
      results.push({ valid: true });
    }
  }

  return results;
}

// ══════════════════════════════════════════════
// 7. validateNoCartesian — 카테시안 복제 탐지
// ══════════════════════════════════════════════

/**
 * Detect Cartesian duplication — multiple items with the same UUID within the same process.
 *
 * Cartesian duplication occurs when shared entities (e.g. A4 ProductChar) are
 * incorrectly duplicated per parent instead of sharing a single UUID (Rule 0.5).
 * This function flags any UUID that appears more than once for the same processNo.
 *
 * @param items - Array of items with id and processNo
 * @returns Validation result. If invalid, error message lists all duplicate UUIDs.
 *
 * @example
 * validateNoCartesian([
 *   { id: "PF-L2-040-P-001", processNo: "040" },
 *   { id: "PF-L2-040-P-001", processNo: "040" }, // duplicate!
 *   { id: "PF-L2-040-P-002", processNo: "040" }, // unique — OK
 * ])
 * // { valid: false, error: "Cartesian duplication detected: 1 duplicate UUID(s)..." }
 */
export function validateNoCartesian(
  items: Array<{ id: string; processNo: string }>
): ValidationResult {
  // Track occurrences: Map<"processNo::id", count>
  const seen = new Map<string, number>();
  const duplicates: Array<{ id: string; processNo: string; count: number }> = [];

  for (const item of items) {
    const key = `${item.processNo}::${item.id}`;
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
  }

  for (const [key, count] of seen) {
    if (count > 1) {
      const sepIdx = key.indexOf('::');
      const processNo = key.slice(0, sepIdx);
      const id = key.slice(sepIdx + 2);
      duplicates.push({ id, processNo, count });
    }
  }

  if (duplicates.length > 0) {
    const details = duplicates
      .map(d => `  "${d.id}" in process ${d.processNo}: ${d.count} occurrences`)
      .join('\n');
    return {
      valid: false,
      error: `Cartesian duplication detected: ${duplicates.length} duplicate UUID(s) `
        + `within the same process (Rule 0.5 violation).\n${details}\n`
        + 'Shared entities (e.g. A4 ProductChar) must be created once per process '
        + 'and referenced by FK — not duplicated per parent.',
    };
  }

  return { valid: true };
}
