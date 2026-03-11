/**
 * @file cloneLegacyData.ts
 * @description FMEA 개정 — LegacyData(JSON) 복제 + ID 리맵핑 + 최적화 승격
 *
 * LegacyData는 워크시트 전체 상태를 JSON으로 저장하는 Single Source of Truth.
 * 새 개정본의 LegacyData에서:
 * 1. 모든 엔티티 ID를 새 UUID로 리맵핑
 * 2. riskData의 SOD/예방/검출 값을 승격된 값으로 교체
 * 3. 최적화 관련 키(opt-*) 제거
 *
 * @created 2026-03-02
 */

import type { IdRemapMap, PromotionEntry } from './cloneAtomicData';

// ── riskData 최적화 키 패턴 (제거 대상) ──
const OPT_KEY_PREFIXES = [
  'prevention-opt-',
  'detection-opt-',
  'opt-action-',
  'opt-detection-action-',
  'opt-responsible-',
  'opt-targetdate-',
  'opt-status-',
  'opt-completedate-',
  'opt-result-',
  'opt-lesson-',
  'opt-note-',
  'opt-remarks-',
  'person-opt-',
  'targetDate-opt-',
  'completeDate-opt-',
  'status-opt-',
  'lesson-opt-',
  'result-opt-',
  'note-opt-',
  'specialChar-opt-',
  'opt6-',
  'opt-rows-',
  'S-fe-opt-',
];

function isOptKey(key: string): boolean {
  return OPT_KEY_PREFIXES.some(prefix => key.startsWith(prefix));
}

// ── riskData 키 파싱 ──
// risk-{fmId}-{fcId}-S, prevention-{fmId}-{fcId}, detection-{fmId}-{fcId}
// 패턴: prefix-{uuid1}-{uuid2}-suffix 또는 prefix-{uuid1}-{uuid2}

interface ParsedRiskKey {
  prefix: string;
  fmId: string;
  fcId: string;
  suffix: string; // 'S', 'O', 'D', '' 등
  original: string;
}

/**
 * riskData 키에서 fmId-fcId 쌍을 추출
 * 키 형식: "risk-{fmId}-{fcId}-S" 또는 "prevention-{fmId}-{fcId}"
 */
function parseRiskKey(key: string): ParsedRiskKey | null {
  // risk-{fmId}-{fcId}-[SOD] 패턴
  const riskMatch = key.match(/^(risk)-(.+)-([SOD])$/);
  if (riskMatch) {
    const middle = riskMatch[2]; // fmId-fcId
    const lastDash = middle.lastIndexOf('-');
    if (lastDash > 0) {
      return {
        prefix: riskMatch[1],
        fmId: middle.substring(0, lastDash),
        fcId: middle.substring(lastDash + 1),
        suffix: riskMatch[3],
        original: key,
      };
    }
  }

  // prevention-{fmId}-{fcId} 또는 detection-{fmId}-{fcId} 패턴
  const ctrlMatch = key.match(/^(prevention|detection)-(.+)$/);
  if (ctrlMatch) {
    const middle = ctrlMatch[2];
    // opt 프리픽스가 아닌 경우만 처리
    if (!isOptKey(key)) {
      const lastDash = middle.lastIndexOf('-');
      if (lastDash > 0) {
        return {
          prefix: ctrlMatch[1],
          fmId: middle.substring(0, lastDash),
          fcId: middle.substring(lastDash + 1),
          suffix: '',
          original: key,
        };
      }
    }
  }

  return null;
}

/**
 * 파싱된 키를 새 ID로 재구성
 */
function rebuildRiskKey(parsed: ParsedRiskKey, idMap: IdRemapMap): string {
  const newFmId = idMap[parsed.fmId] || parsed.fmId;
  const newFcId = idMap[parsed.fcId] || parsed.fcId;
  if (parsed.suffix) {
    return `${parsed.prefix}-${newFmId}-${newFcId}-${parsed.suffix}`;
  }
  return `${parsed.prefix}-${newFmId}-${newFcId}`;
}

// ── riskData 변환 ──

/**
 * riskData 객체 변환:
 * 1. ID 리맵핑 (키의 fmId/fcId → 새 ID)
 * 2. 승격된 값 적용 (O, D, prevention, detection)
 * 3. 최적화 키 제거
 */
function transformRiskData(
  riskData: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  idMap: IdRemapMap,
  promotionByOldFmFc: Map<string, PromotionEntry>
): Record<string, any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const newRiskData: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any

  for (const [key, value] of Object.entries(riskData)) {
    // 최적화 키 제거
    if (isOptKey(key)) continue;

    const parsed = parseRiskKey(key);
    if (parsed) {
      const newKey = rebuildRiskKey(parsed, idMap);
      const fmFcKey = `${parsed.fmId}-${parsed.fcId}`;
      const promotion = promotionByOldFmFc.get(fmFcKey);

      if (promotion) {
        // 승격된 값 적용
        if (parsed.prefix === 'risk' && parsed.suffix === 'O') {
          newRiskData[newKey] = promotion.occurrence;
        } else if (parsed.prefix === 'risk' && parsed.suffix === 'D') {
          newRiskData[newKey] = promotion.detection;
        } else if (parsed.prefix === 'risk' && parsed.suffix === 'S') {
          newRiskData[newKey] = promotion.severity;
        } else if (parsed.prefix === 'prevention') {
          newRiskData[newKey] = promotion.preventionControl || value;
        } else if (parsed.prefix === 'detection') {
          newRiskData[newKey] = promotion.detectionControl || value;
        } else {
          newRiskData[newKey] = value;
        }
      } else {
        // 승격 없음 — 키만 리맵핑
        newRiskData[newKey] = value;
      }
    } else {
      // 파싱 불가한 키 — 그대로 복사 (숫자 인덱스 기반 등)
      newRiskData[key] = value;
    }
  }

  return newRiskData;
}

// ── 엔티티 ID 리맵핑 (JSON 구조 내부) ──

function remapId(idMap: IdRemapMap, id: string | null | undefined): string | null | undefined {
  if (!id) return id;
  return idMap[id] || id;
}

/**
 * legacyData JSON의 엔티티 ID를 새 UUID로 리맵핑
 * 구조: { l1: {...}, l2: [...], failureLinks: [...], riskData: {...}, ... }
 */
function remapLegacyIds(data: any, idMap: IdRemapMap): void { // eslint-disable-line @typescript-eslint/no-explicit-any
  // l1.types[].id, l1.types[].functions[].id
  if (data.l1?.types) {
    for (const type of data.l1.types) {
      type.id = remapId(idMap, type.id);
      if (type.functions) {
        for (const fn of type.functions) {
          fn.id = remapId(idMap, fn.id);
          fn.l1StructId = remapId(idMap, fn.l1StructId);
        }
      }
      // l1.types[].failureScopes
      if (type.failureScopes) {
        for (const scope of type.failureScopes) {
          scope.id = remapId(idMap, scope.id);
          scope.l1FuncId = remapId(idMap, scope.l1FuncId);
        }
      }
    }
  }

  // l2[].id, l2[].l3[].id, l2[].functions[].id, etc.
  if (Array.isArray(data.l2)) {
    for (const proc of data.l2) {
      proc.id = remapId(idMap, proc.id);
      proc.l1Id = remapId(idMap, proc.l1Id);

      // l2.functions
      if (proc.functions) {
        for (const fn of proc.functions) {
          fn.id = remapId(idMap, fn.id);
          fn.l2StructId = remapId(idMap, fn.l2StructId);
        }
      }

      // l2.failureModes
      if (proc.failureModes) {
        for (const fm of proc.failureModes) {
          fm.id = remapId(idMap, fm.id);
          fm.l2FuncId = remapId(idMap, fm.l2FuncId);
          fm.l2StructId = remapId(idMap, fm.l2StructId);
          fm.productCharId = remapId(idMap, fm.productCharId);
        }
      }

      // l2.failureCauses (있으면)
      if (proc.failureCauses) {
        for (const fc of proc.failureCauses) {
          fc.id = remapId(idMap, fc.id);
          fc.l3FuncId = remapId(idMap, fc.l3FuncId);
          fc.l3StructId = remapId(idMap, fc.l3StructId);
          fc.l2StructId = remapId(idMap, fc.l2StructId);
          fc.processCharId = remapId(idMap, fc.processCharId);
        }
      }

      // l3 children
      if (proc.l3) {
        for (const l3 of proc.l3) {
          l3.id = remapId(idMap, l3.id);
          l3.l2Id = remapId(idMap, l3.l2Id);
          l3.l1Id = remapId(idMap, l3.l1Id);

          if (l3.functions) {
            for (const fn of l3.functions) {
              fn.id = remapId(idMap, fn.id);
              fn.l3StructId = remapId(idMap, fn.l3StructId);
              fn.l2StructId = remapId(idMap, fn.l2StructId);
            }
          }

          if (l3.failureCauses) {
            for (const fc of l3.failureCauses) {
              fc.id = remapId(idMap, fc.id);
              fc.l3FuncId = remapId(idMap, fc.l3FuncId);
              fc.l3StructId = remapId(idMap, fc.l3StructId);
              fc.l2StructId = remapId(idMap, fc.l2StructId);
              fc.processCharId = remapId(idMap, fc.processCharId);
            }
          }
        }
      }
    }
  }

  // failureLinks[].id/fmId/feId/fcId
  if (Array.isArray(data.failureLinks)) {
    for (const link of data.failureLinks) {
      link.id = remapId(idMap, link.id);
      link.fmId = remapId(idMap, link.fmId);
      link.feId = remapId(idMap, link.feId);
      link.fcId = remapId(idMap, link.fcId);
    }
  }
}

// ── fmId-fcId → PromotionEntry 맵 구축 ──

/**
 * FailureLink 기반 promotionMap을 fmId-fcId 키 맵으로 변환
 * (riskData의 키가 fmId-fcId 형식이므로)
 */
function buildFmFcPromotionMap(
  promotionMap: Map<string, PromotionEntry>,
  failureLinks: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
): Map<string, PromotionEntry> {
  const fmFcMap = new Map<string, PromotionEntry>();

  for (const link of failureLinks) {
    const entry = promotionMap.get(link.id);
    if (entry) {
      // 원본 fmId-fcId 조합으로 매핑
      fmFcMap.set(`${link.fmId}-${link.fcId}`, entry);
    }
  }

  return fmFcMap;
}

// ── 메인 함수 ──

/**
 * LegacyData 복제 + ID 리맵핑 + 최적화 승격
 *
 * @param tx - Prisma 트랜잭션 클라이언트
 * @param sourceFmeaId - 원본 FMEA ID
 * @param newFmeaId - 새 FMEA ID
 * @param idMap - 엔티티 ID 리맵핑 맵
 * @param promotionMap - linkId → 승격 데이터
 */
export async function cloneLegacyData(
  tx: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  sourceFmeaId: string,
  newFmeaId: string,
  idMap: IdRemapMap,
  promotionMap: Map<string, PromotionEntry>
): Promise<boolean> {
  // 원본 LegacyData 조회
  const sourceLegacy = await tx.fmeaLegacyData.findUnique({
    where: { fmeaId: sourceFmeaId },
  });

  if (!sourceLegacy?.data) {
    return false;
  }

  // Deep clone
  const clonedData = JSON.parse(JSON.stringify(sourceLegacy.data));

  // 1. failureLinks에서 fmId-fcId 기반 promotionMap 구축
  const originalLinks = Array.isArray(clonedData.failureLinks) ? clonedData.failureLinks : [];
  const fmFcPromotionMap = buildFmFcPromotionMap(promotionMap, originalLinks);

  // 2. 엔티티 ID 리맵핑
  remapLegacyIds(clonedData, idMap);

  // 3. riskData 변환 (키 리맵핑 + 승격 + 최적화 키 제거)
  if (clonedData.riskData && typeof clonedData.riskData === 'object') {
    clonedData.riskData = transformRiskData(clonedData.riskData, idMap, fmFcPromotionMap);
  }

  // 4. 확정 상태 초기화 (step 1부터)
  if (clonedData.confirmed) {
    clonedData.confirmed = {
      structure: false,
      l1Function: false,
      l2Function: false,
      l3Function: false,
      l1Failure: false,
      l2Failure: false,
      l3Failure: false,
      failureLink: false,
      risk: false,
      optimization: false,
    };
  }

  // 5. 새 fmeaId로 저장
  await tx.fmeaLegacyData.create({
    data: {
      fmeaId: newFmeaId,
      data: clonedData,
      version: '1.0.0',
    },
  });

  return true;
}
