/**
 * UUID/FK 규칙 검증 유틸리티
 *
 * Import 파이프라인에서 생성된 FlatData의 ID 형식과 FK 체인을 검증한다.
 *
 * 핵심 원칙:
 *   1. 모든 UUID는 결정론적 (동일 엑셀 → 항상 동일 ID)
 *   2. parentItemId FK 체인은 직접 부모만 참조 (계층 건너뜀 금지)
 *   3. dedup key에 공정순서/구분 필수 포함
 *
 * @version 1.0.0
 * @created 2026-03-21
 * @see docs/UUID_FK_SPECIFICATION.md
 * @see CLAUDE.md Rule 1.7
 */

// ──────────────────────────────────────────────
// Types (import 경로 순환 방지를 위해 최소 인터페이스 정의)
// ──────────────────────────────────────────────

/** ImportedFlatData 최소 필수 필드 (검증용) */
export interface FlatDataForValidation {
  id: string;
  processNo: string;
  category: 'A' | 'B' | 'C';
  itemCode: string;
  value: string;
  parentItemId?: string;
  m4?: string;
}

// ──────────────────────────────────────────────
// UUID 형식 패턴
// ──────────────────────────────────────────────

/** 엔티티별 UUID 정규식 패턴 */
const UUID_PATTERNS: Record<string, RegExp> = {
  // L1 (C계열)
  C1: /^PF-L1-(YP|SP|US)$/,
  C2: /^PF-L1-(YP|SP|US)-\d{3}$/,
  C3: /^PF-L1-(YP|SP|US)-\d{3}-\d{3}$/,
  C4: /^PF-L1-(YP|SP|US)-\d{3}-\d{3}-\d{3}$/,

  // L2 (A계열)
  A1: /^PF-L2-\d{3}$/,
  A2: /^PF-L2-\d{3}$/,
  A3: /^PF-L2-\d{3}-F-\d{3}$/,
  A4: /^PF-L2-\d{3}-P-\d{3}$/,
  A5: /^PF-L2-\d{3}-M-\d{3}$/,
  A6: /^PF-L2-\d{3}-D-\d{3}$/,

  // L3 (B계열)
  B1: /^PF-L3-\d{3}-(MN|MC|MT|IM|EN)-\d{3}$/,
  B2: /^PF-L3-\d{3}-(MN|MC|MT|IM|EN)-\d{3}-G(-\d{3})?$/,
  B3: /^PF-L3-\d{3}-(MN|MC|MT|IM|EN)-\d{3}-C-\d{3}$/,
  B4: /^PF-L3-\d{3}-(MN|MC|MT|IM|EN)-\d{3}-K-\d{3}$/,
  B5: /^PF-L3-\d{3}-(MN|MC|MT|IM|EN)-\d{3}-V-\d{3}$/,
};

// ──────────────────────────────────────────────
// parentItemId 체인 규칙
// ──────────────────────────────────────────────

/** 자식 itemCode → 부모 itemCode 매핑 (직접 부모만) */
const PARENT_CHAIN_RULES: Record<string, string> = {
  B4: 'B3',  // B4(고장원인) → B3(공정특성) ★ B1이 아님!
  B3: 'B1',  // B3(공정특성) → B1(작업요소)
  B2: 'B1',  // B2(요소기능) → B1(작업요소)
  B5: 'B1',  // B5(예방관리) → B1(작업요소)
  A5: 'A4',  // A5(고장형태) → A4(제품특성) ★ A1이 아님!
  A4: 'A1',  // A4(제품특성) → A1(공정)
  A3: 'A1',  // A3(공정기능) → A1(공정)
  A6: 'A1',  // A6(검출관리) → A1(공정)
  C4: 'C3',  // C4(고장영향) → C3(요구사항)
  C3: 'C2',  // C3(요구사항) → C2(완제품기능)
  C2: 'C1',  // C2(완제품기능) → C1(구분)
};

// ──────────────────────────────────────────────
// 1. ID 형식 검증
// ──────────────────────────────────────────────

/**
 * UUID가 해당 엔티티의 결정론적 형식을 따르는지 검증
 *
 * @param id - 검증 대상 UUID
 * @param itemCode - 엔티티 코드 (A1~A6, B1~B5, C1~C4)
 * @returns true = 결정론적 형식 일치, false = 비결정론적 또는 잘못된 형식
 *
 * @example
 * isValidEntityId('PF-L2-010', 'A1')           // true
 * isValidEntityId('PF-L3-010-MC-001-K-001', 'B4') // true
 * isValidEntityId('abc123', 'A1')                // false (랜덤 ID)
 * isValidEntityId('PF-L2-010-M-001', 'A1')      // false (A5 형식을 A1로 사용)
 */
export function isValidEntityId(id: string, itemCode: string): boolean {
  const pattern = UUID_PATTERNS[itemCode];
  if (!pattern) return false;
  return pattern.test(id);
}

// ──────────────────────────────────────────────
// 2. parentItemId FK 체인 검증
// ──────────────────────────────────────────────

/**
 * 전체 FlatData의 parentItemId FK 체인이 올바른지 검증
 *
 * 검증 규칙:
 * - B4.parentItemId → B3 (B1 직접 참조 = 오류)
 * - A5.parentItemId → A4 (A1 직접 참조 = 오류)
 * - C3.parentItemId → C2
 * - C4.parentItemId → C3
 *
 * @param flatData - Import된 FlatData 배열
 * @returns valid=true면 오류 없음, errors에 오류 메시지 목록
 */
export function validateParentChain(
  flatData: FlatDataForValidation[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const byId = new Map<string, FlatDataForValidation>();

  for (const item of flatData) {
    byId.set(item.id, item);
  }

  for (const item of flatData) {
    const expectedParentCode = PARENT_CHAIN_RULES[item.itemCode];
    if (!expectedParentCode) continue; // 최상위 엔티티 (A1, B1, C1)
    if (!item.parentItemId) continue;  // parentItemId 없는 경우 (별도 검증)

    const parent = byId.get(item.parentItemId);
    if (!parent) {
      errors.push(
        `[FK-ORPHAN] ${item.itemCode} id=${item.id}: parentItemId=${item.parentItemId} 참조 대상 없음 (고아 FK)`
      );
      continue;
    }

    if (parent.itemCode !== expectedParentCode) {
      errors.push(
        `[FK-CHAIN] ${item.itemCode} id=${item.id}: parentItemId가 ${parent.itemCode}를 참조 (기대: ${expectedParentCode}). ` +
        `B4→B3→B1 체인 위반 가능성`
      );
    }

    // 부모-자식 공정순서 일치 검증 (A/B 계열만)
    if (item.category !== 'C' && parent.processNo !== item.processNo) {
      errors.push(
        `[FK-CROSS-PROCESS] ${item.itemCode} id=${item.id} (공정${item.processNo}): ` +
        `parentItemId가 다른 공정(${parent.processNo})의 ${parent.itemCode}을 참조`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

// ──────────────────────────────────────────────
// 3. B4 → B3 → B1 FK 체인 추적
// ──────────────────────────────────────────────

/**
 * B4(고장원인)에서 B3(공정특성) → B1(작업요소)까지 FK 체인을 추적
 *
 * @param b4 - B4 FlatData 항목
 * @param flatById - ID → FlatData 맵
 * @returns b3Id + b1Id, 또는 체인이 끊어진 경우 null
 *
 * @example
 * const chain = traceB4ToB1(b4Item, flatById);
 * if (!chain) console.error('B4→B3→B1 체인 끊어짐');
 * // chain = { b3Id: 'PF-L3-010-MC-001-C-001', b1Id: 'PF-L3-010-MC-001' }
 */
export function traceB4ToB1(
  b4: FlatDataForValidation,
  flatById: Map<string, FlatDataForValidation>
): { b3Id: string; b1Id: string } | null {
  if (b4.itemCode !== 'B4') return null;
  if (!b4.parentItemId) return null;

  // B4 → B3
  const b3 = flatById.get(b4.parentItemId);
  if (!b3 || b3.itemCode !== 'B3') return null;

  // B3 → B1
  if (!b3.parentItemId) return null;
  const b1 = flatById.get(b3.parentItemId);
  if (!b1 || b1.itemCode !== 'B1') return null;

  return { b3Id: b3.id, b1Id: b1.id };
}

// ──────────────────────────────────────────────
// 4. 전체 ID 결정론적 형식 검증
// ──────────────────────────────────────────────

/**
 * 전체 FlatData의 ID가 결정론적 형식({DOC}-{LEVEL}-{pno}-...)을 따르는지 검증
 *
 * 비결정론적 ID (nanoid, uid() 기반 랜덤 ID)를 탐지하여 보고한다.
 *
 * @param flatData - Import된 FlatData 배열
 * @returns valid=true면 모든 ID가 결정론적, nonDeterministic에 비결정론적 ID 목록
 *
 * @example
 * const result = validateDeterministicIds(flatData);
 * if (!result.valid) {
 *   console.error('비결정론적 ID 발견:', result.nonDeterministic);
 * }
 */
export function validateDeterministicIds(
  flatData: FlatDataForValidation[]
): { valid: boolean; nonDeterministic: string[] } {
  const nonDeterministic: string[] = [];

  for (const item of flatData) {
    if (!isValidEntityId(item.id, item.itemCode)) {
      nonDeterministic.push(
        `${item.itemCode} id=${item.id} (processNo=${item.processNo}, value="${item.value.slice(0, 30)}")`
      );
    }
  }

  return { valid: nonDeterministic.length === 0, nonDeterministic };
}

// ──────────────────────────────────────────────
// 5. 유틸리티 함수
// ──────────────────────────────────────────────

/**
 * UUID에서 공정순서(pno) 추출
 *
 * @example
 * extractPno('PF-L2-010')               // '010'
 * extractPno('PF-L3-015-MC-001-K-001')  // '015'
 * extractPno('PF-L1-YP')                // null (L1은 공정순서 없음)
 */
export function extractPno(uuid: string): string | null {
  const match = uuid.match(/^PF-L[23]-(\d{3})/);
  return match ? match[1] : null;
}

/**
 * UUID에서 부모 UUID 추출 (마지막 세그먼트 제거)
 *
 * @example
 * getParentId('PF-L3-010-MC-001-K-001') // 'PF-L3-010-MC-001-K'
 * getParentId('PF-L2-010')              // null (최상위)
 */
export function getParentId(uuid: string): string | null {
  const segs = uuid.split('-');
  if (segs.length <= 3) return null;
  return segs.slice(0, -1).join('-');
}

/**
 * 부모-자식 관계에서 자식의 기대 부모 itemCode 반환
 *
 * @example
 * getExpectedParentCode('B4') // 'B3'
 * getExpectedParentCode('A5') // 'A4'
 * getExpectedParentCode('A1') // undefined (최상위)
 */
export function getExpectedParentCode(childItemCode: string): string | undefined {
  return PARENT_CHAIN_RULES[childItemCode];
}
