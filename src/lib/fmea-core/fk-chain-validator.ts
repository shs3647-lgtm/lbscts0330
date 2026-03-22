/**
 * @file fk-chain-validator.ts
 * @description FK/parentId 체인 전체 검증 유틸리티 — Import 후 데이터 품질 보고서 생성
 *
 * EX-41: 모든 parentId가 실제 UUID를 가리키는지 검증
 * EX-42: 모든 FK가 실제 UUID를 가리키는지 검증
 * EX-43: 순환 참조 검출
 * EX-44: 깨진 참조 → missingFields에 기록
 * EX-45: 검증 결과를 DatasetQualityReport에 반환
 *
 * @version 1.0.0
 * @created 2026-03-23
 */

import type { PositionAtomicData } from '@/types/position-import';

// ══════════════════════════════════════════════
// Types (EX-45)
// ══════════════════════════════════════════════

export interface FKValidationError {
  /** 엔티티 타입 (예: 'L3Function', 'FailureCause') */
  entityType: string;
  /** 문제 엔티티 ID */
  entityId: string;
  /** 참조 필드 이름 (예: 'parentId', 'l3CharId') */
  field: string;
  /** 기대 참조 대상 ID */
  expectedId: string;
  /** 오류 유형 */
  issue: 'missing' | 'circular' | 'wrong_type';
}

export interface DatasetQualityReport {
  /** 검증한 전체 엔티티 수 */
  totalEntities: number;
  /** 오류 없는 엔티티 수 */
  validEntities: number;
  /** FK/parentId 오류 목록 */
  errors: FKValidationError[];
  /** parentId 설정 비율 (0~1) */
  parentIdCoverage: number;
  /** FK 유효 비율 (0~1) */
  fkCoverage: number;
  /** errors.length === 0 인 경우 true */
  isValid: boolean;
  /** 요약 문자열 */
  summary: string;
}

// ══════════════════════════════════════════════
// 내부 헬퍼 타입
// ══════════════════════════════════════════════

interface EntityRef {
  entityType: string;
  entityId: string;
  field: string;
  expectedId: string | null | undefined;
  /** true = parentId 필드, false = FK 필드 */
  isParentId: boolean;
}

// ══════════════════════════════════════════════
// UUID 집합 구축
// ══════════════════════════════════════════════

/**
 * PositionAtomicData에서 모든 엔티티 UUID를 한 번에 수집하여 Set을 반환한다.
 * EX-41/42 검증에서 O(1) 조회에 사용한다.
 */
function buildAllIdSet(data: PositionAtomicData): Set<string> {
  const ids = new Set<string>();

  // L1
  ids.add(data.l1Structure.id);
  data.l1Functions.forEach((e) => ids.add(e.id));
  data.l1Requirements.forEach((e) => ids.add(e.id));
  data.l1Scopes.forEach((e) => ids.add(e.id));

  // L2
  data.l2Structures.forEach((e) => ids.add(e.id));
  data.l2Functions.forEach((e) => ids.add(e.id));
  data.l2ProcessNos.forEach((e) => ids.add(e.id));
  data.l2ProcessNames.forEach((e) => ids.add(e.id));
  data.l2SpecialChars.forEach((e) => ids.add(e.id));
  data.processProductChars.forEach((e) => ids.add(e.id));

  // L3
  data.l3Structures.forEach((e) => ids.add(e.id));
  data.l3Functions.forEach((e) => ids.add(e.id));
  data.l3ProcessChars.forEach((e) => ids.add(e.id));
  data.l3ProcessNos.forEach((e) => ids.add(e.id));
  data.l3FourMs.forEach((e) => ids.add(e.id));
  data.l3WorkElements.forEach((e) => ids.add(e.id));
  data.l3SpecialChars.forEach((e) => ids.add(e.id));

  // Failure
  data.failureEffects.forEach((e) => ids.add(e.id));
  data.failureModes.forEach((e) => ids.add(e.id));
  data.failureCauses.forEach((e) => ids.add(e.id));
  data.failureLinks.forEach((e) => ids.add(e.id));
  data.riskAnalyses.forEach((e) => ids.add(e.id));

  return ids;
}

// ══════════════════════════════════════════════
// parentId 참조 수집 (EX-41)
// ══════════════════════════════════════════════

/**
 * 모든 엔티티의 parentId 참조를 EntityRef 배열로 수집한다.
 *
 * 규칙:
 * - L1Structure.parentId = null → 제외
 * - FailureLink.parentId = null → 제외
 * - 나머지 모든 parentId는 실제 UUID를 가리켜야 한다.
 */
function collectParentIdRefs(data: PositionAtomicData): EntityRef[] {
  const refs: EntityRef[] = [];
  const l1StructId = data.l1Structure.id;

  // L1Function.parentId → l1StructId
  for (const e of data.l1Functions) {
    refs.push({ entityType: 'L1Function', entityId: e.id, field: 'parentId', expectedId: e.parentId, isParentId: true });
  }

  // L1Requirement.parentId → L1Function.id
  for (const e of data.l1Requirements) {
    refs.push({ entityType: 'L1Requirement', entityId: e.id, field: 'parentId', expectedId: e.parentId, isParentId: true });
  }

  // FailureEffect.parentId → L1Function.id
  for (const e of data.failureEffects) {
    refs.push({ entityType: 'FailureEffect', entityId: e.id, field: 'parentId', expectedId: e.parentId, isParentId: true });
  }

  // L1Scope.parentId → l1StructId
  for (const e of data.l1Scopes) {
    refs.push({ entityType: 'L1Scope', entityId: e.id, field: 'parentId', expectedId: e.parentId, isParentId: true });
  }

  // L2Structure.parentId → l1StructId
  for (const e of data.l2Structures) {
    refs.push({ entityType: 'L2Structure', entityId: e.id, field: 'parentId', expectedId: e.parentId, isParentId: true });
  }

  // L2ProcessNo.parentId → L2Structure.id
  for (const e of data.l2ProcessNos) {
    refs.push({ entityType: 'L2ProcessNo', entityId: e.id, field: 'parentId', expectedId: e.parentId, isParentId: true });
  }

  // L2ProcessName.parentId → L2Structure.id
  for (const e of data.l2ProcessNames) {
    refs.push({ entityType: 'L2ProcessName', entityId: e.id, field: 'parentId', expectedId: e.parentId, isParentId: true });
  }

  // L2Function.parentId → L2Structure.id
  for (const e of data.l2Functions) {
    refs.push({ entityType: 'L2Function', entityId: e.id, field: 'parentId', expectedId: e.parentId, isParentId: true });
  }

  // ProcessProductChar.parentId → L2Structure.id
  for (const e of data.processProductChars) {
    refs.push({ entityType: 'ProcessProductChar', entityId: e.id, field: 'parentId', expectedId: e.parentId, isParentId: true });
  }

  // L2SpecialChar.parentId → L2Function.id
  for (const e of data.l2SpecialChars) {
    refs.push({ entityType: 'L2SpecialChar', entityId: e.id, field: 'parentId', expectedId: e.parentId, isParentId: true });
  }

  // FailureMode.parentId → ProcessProductChar.id
  for (const e of data.failureModes) {
    refs.push({ entityType: 'FailureMode', entityId: e.id, field: 'parentId', expectedId: e.parentId, isParentId: true });
  }

  // L3Structure.parentId → L2Structure.id
  for (const e of data.l3Structures) {
    refs.push({ entityType: 'L3Structure', entityId: e.id, field: 'parentId', expectedId: e.parentId, isParentId: true });
  }

  // L3ProcessNo.parentId → L3Structure.id
  for (const e of data.l3ProcessNos) {
    refs.push({ entityType: 'L3ProcessNo', entityId: e.id, field: 'parentId', expectedId: e.parentId, isParentId: true });
  }

  // L3FourM.parentId → L3Structure.id
  for (const e of data.l3FourMs) {
    refs.push({ entityType: 'L3FourM', entityId: e.id, field: 'parentId', expectedId: e.parentId, isParentId: true });
  }

  // L3WorkElement.parentId → L3Structure.id
  for (const e of data.l3WorkElements) {
    refs.push({ entityType: 'L3WorkElement', entityId: e.id, field: 'parentId', expectedId: e.parentId, isParentId: true });
  }

  // L3Function.parentId → L3Structure.id
  for (const e of data.l3Functions) {
    refs.push({ entityType: 'L3Function', entityId: e.id, field: 'parentId', expectedId: e.parentId, isParentId: true });
  }

  // L3ProcessChar.parentId → L3Function.id
  for (const e of data.l3ProcessChars) {
    refs.push({ entityType: 'L3ProcessChar', entityId: e.id, field: 'parentId', expectedId: e.parentId, isParentId: true });
  }

  // L3SpecialChar.parentId → L3ProcessChar.id
  for (const e of data.l3SpecialChars) {
    refs.push({ entityType: 'L3SpecialChar', entityId: e.id, field: 'parentId', expectedId: e.parentId, isParentId: true });
  }

  // FailureCause.parentId → L3Function.id
  for (const e of data.failureCauses) {
    refs.push({ entityType: 'FailureCause', entityId: e.id, field: 'parentId', expectedId: e.parentId, isParentId: true });
  }

  // FailureLink.parentId = null → 제외 (정상)
  // (skip)

  // RiskAnalysis.parentId → FailureLink.id
  for (const e of data.riskAnalyses) {
    refs.push({ entityType: 'RiskAnalysis', entityId: e.id, field: 'parentId', expectedId: e.parentId, isParentId: true });
  }

  // suppress unused variable warning
  void l1StructId;

  return refs;
}

// ══════════════════════════════════════════════
// FK 참조 수집 (EX-42)
// ══════════════════════════════════════════════

/**
 * 핵심 FK 참조를 EntityRef 배열로 수집한다.
 *
 * 검증 대상:
 * - FailureCause.l3CharId → L3ProcessChar.id (B-13)
 * - FailureMode.feRefs[] → FailureEffect.id
 * - FailureMode.fcRefs[] → FailureCause.id
 * - RiskAnalysis.fmId → FailureMode.id (EX-06)
 * - RiskAnalysis.fcId → FailureCause.id
 * - RiskAnalysis.feId → FailureEffect.id
 * - FailureLink.fmId → FailureMode.id
 * - FailureLink.feId → FailureEffect.id
 * - FailureLink.fcId → FailureCause.id
 */
function collectFKRefs(data: PositionAtomicData): EntityRef[] {
  const refs: EntityRef[] = [];

  // FailureCause.l3CharId → L3ProcessChar.id (B-13, optional)
  for (const e of data.failureCauses) {
    if (e.l3CharId !== undefined && e.l3CharId !== null && e.l3CharId !== '') {
      refs.push({ entityType: 'FailureCause', entityId: e.id, field: 'l3CharId', expectedId: e.l3CharId, isParentId: false });
    }
  }

  // FailureMode.feRefs[] → FailureEffect.id
  for (const e of data.failureModes) {
    if (e.feRefs) {
      for (const feId of e.feRefs) {
        if (feId) {
          refs.push({ entityType: 'FailureMode', entityId: e.id, field: 'feRefs', expectedId: feId, isParentId: false });
        }
      }
    }
  }

  // FailureMode.fcRefs[] → FailureCause.id
  for (const e of data.failureModes) {
    if (e.fcRefs) {
      for (const fcId of e.fcRefs) {
        if (fcId) {
          refs.push({ entityType: 'FailureMode', entityId: e.id, field: 'fcRefs', expectedId: fcId, isParentId: false });
        }
      }
    }
  }

  // RiskAnalysis FK 3요소 (EX-06)
  for (const e of data.riskAnalyses) {
    if (e.fmId) {
      refs.push({ entityType: 'RiskAnalysis', entityId: e.id, field: 'fmId', expectedId: e.fmId, isParentId: false });
    }
    if (e.fcId) {
      refs.push({ entityType: 'RiskAnalysis', entityId: e.id, field: 'fcId', expectedId: e.fcId, isParentId: false });
    }
    if (e.feId) {
      refs.push({ entityType: 'RiskAnalysis', entityId: e.id, field: 'feId', expectedId: e.feId, isParentId: false });
    }
    // linkId → FailureLink.id
    refs.push({ entityType: 'RiskAnalysis', entityId: e.id, field: 'linkId', expectedId: e.linkId, isParentId: false });
  }

  // FailureLink FK 3요소 (Rule 1.7.1)
  for (const e of data.failureLinks) {
    refs.push({ entityType: 'FailureLink', entityId: e.id, field: 'fmId', expectedId: e.fmId, isParentId: false });
    refs.push({ entityType: 'FailureLink', entityId: e.id, field: 'feId', expectedId: e.feId, isParentId: false });
    refs.push({ entityType: 'FailureLink', entityId: e.id, field: 'fcId', expectedId: e.fcId, isParentId: false });
  }

  return refs;
}

// ══════════════════════════════════════════════
// 순환 참조 검출 (EX-43)
// ══════════════════════════════════════════════

/**
 * parentId 체인을 순회하며 순환 참조를 검출한다.
 *
 * @param parentMap  entityId → parentId 매핑
 * @param allIds     전체 엔티티 UUID Set
 * @returns 순환 참조가 발견된 엔티티들의 FKValidationError 배열
 */
function detectCircularRefs(
  parentMap: Map<string, { parentId: string; entityType: string }>,
  allIds: Set<string>,
): FKValidationError[] {
  const errors: FKValidationError[] = [];
  const globalVisited = new Set<string>();

  for (const [startId, startInfo] of parentMap) {
    if (globalVisited.has(startId)) continue;

    const chainVisited = new Set<string>();
    let currentId: string = startId;
    let currentType: string = startInfo.entityType;

    while (currentId) {
      if (chainVisited.has(currentId)) {
        // 순환 참조 발견
        errors.push({
          entityType: currentType,
          entityId: currentId,
          field: 'parentId',
          expectedId: currentId,
          issue: 'circular',
        });
        break;
      }

      chainVisited.add(currentId);
      globalVisited.add(currentId);

      const info = parentMap.get(currentId);
      if (!info) break; // 체인 종단 (root 또는 외부 엔티티)

      // 부모가 전체 UUID Set에 없으면 이미 EX-41에서 'missing'으로 기록됨 — 여기서는 중단
      if (!allIds.has(info.parentId)) break;

      currentId = info.parentId;
      currentType = info.entityType;
    }
  }

  return errors;
}

// ══════════════════════════════════════════════
// 메인 검증 함수 (EX-45)
// ══════════════════════════════════════════════

/**
 * PositionAtomicData의 전체 FK/parentId 체인을 검증하여 DatasetQualityReport를 반환한다.
 *
 * EX-41: parentId가 실제 존재하는 UUID를 가리키는지 확인
 * EX-42: 핵심 FK(l3CharId, feRefs, fcRefs, RA 3요소, FL 3요소)가 실제 UUID를 가리키는지 확인
 * EX-43: parentId 체인 순환 참조 검출
 * EX-44: 깨진 참조를 errors 배열에 기록
 * EX-45: DatasetQualityReport 반환
 *
 * @param data - parsePositionBasedExcel() 또는 DB에서 재구성한 PositionAtomicData
 * @returns DatasetQualityReport
 */
export function validateFKChain(data: PositionAtomicData): DatasetQualityReport {
  // ── 1. 전체 UUID Set 구축 ──
  const allIds = buildAllIdSet(data);
  const totalEntities = allIds.size;

  const errors: FKValidationError[] = [];

  // ── 2. EX-41: parentId 검증 ──
  const parentIdRefs = collectParentIdRefs(data);

  // parentId 체인 순환 검출용 Map 구축
  const parentMap = new Map<string, { parentId: string; entityType: string }>();

  let parentIdTotal = 0;
  let parentIdValid = 0;

  for (const ref of parentIdRefs) {
    parentIdTotal++;

    const targetId = ref.expectedId;

    if (!targetId || targetId.trim() === '') {
      // parentId가 비어 있음 — missing
      errors.push({
        entityType: ref.entityType,
        entityId: ref.entityId,
        field: ref.field,
        expectedId: targetId ?? '(empty)',
        issue: 'missing',
      });
      continue;
    }

    if (!allIds.has(targetId)) {
      // 참조 대상이 존재하지 않음 (EX-44)
      errors.push({
        entityType: ref.entityType,
        entityId: ref.entityId,
        field: ref.field,
        expectedId: targetId,
        issue: 'missing',
      });
      continue;
    }

    // 유효 parentId → 순환 검출 Map에 추가
    parentMap.set(ref.entityId, { parentId: targetId, entityType: ref.entityType });
    parentIdValid++;
  }

  // ── 3. EX-43: 순환 참조 검출 ──
  const circularErrors = detectCircularRefs(parentMap, allIds);
  errors.push(...circularErrors);

  // ── 4. EX-42: FK 검증 ──
  const fkRefs = collectFKRefs(data);

  let fkTotal = 0;
  let fkValid = 0;

  for (const ref of fkRefs) {
    fkTotal++;

    const targetId = ref.expectedId;

    if (!targetId || targetId.trim() === '') {
      errors.push({
        entityType: ref.entityType,
        entityId: ref.entityId,
        field: ref.field,
        expectedId: targetId ?? '(empty)',
        issue: 'missing',
      });
      continue;
    }

    if (!allIds.has(targetId)) {
      errors.push({
        entityType: ref.entityType,
        entityId: ref.entityId,
        field: ref.field,
        expectedId: targetId,
        issue: 'missing',
      });
      continue;
    }

    fkValid++;
  }

  // ── 5. 지표 계산 ──
  const parentIdCoverage = parentIdTotal > 0 ? parentIdValid / parentIdTotal : 1;
  const fkCoverage = fkTotal > 0 ? fkValid / fkTotal : 1;

  // errors 중 circular/missing 제외하고 valid 엔티티 수 계산
  const invalidEntityIds = new Set(errors.map((e) => e.entityId));
  const validEntities = totalEntities - invalidEntityIds.size;

  const isValid = errors.length === 0;

  // ── 6. 요약 문자열 ──
  const summary = isValid
    ? `OK — ${totalEntities} entities, parentId ${(parentIdCoverage * 100).toFixed(1)}%, FK ${(fkCoverage * 100).toFixed(1)}%`
    : `FAIL — ${errors.length} error(s): ${errors.slice(0, 3).map((e) => `${e.entityType}.${e.field}(${e.issue})`).join(', ')}${errors.length > 3 ? ` ...+${errors.length - 3} more` : ''}`;

  return {
    totalEntities,
    validEntities,
    errors,
    parentIdCoverage,
    fkCoverage,
    isValid,
    summary,
  };
}
