/**
 * FMEA 렌더링·검증용 dedupKey 생성 유틸리티 (Phase 3)
 *
 * 원칙:
 * - dedupKey = parentId(n-1) + '::' + 자기 레벨 식별 필드
 * - parentId 없이 이름만으로 중복제거하면 다른 부모의 동명 항목 누락
 * - dedupKey는 렌더링/검증 보조 — DB PK(UUID)와 별개 (단, FN_L2는 ProcessProductChar.id FK 포함)
 *
 * @see docs/FMEA Import UUID복합키FKparentId 재설계 적용.md
 */

/** 헤더/셀 텍스트 정규화 */
export function normalize(value: string | null | undefined): string {
  if (!value) return '__EMPTY__';
  return value.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

/** ST_L1 — 표: projectId :: processName(프로젝트 표시명 등) */
export function dedupKey_ST_L1(projectId: string, processName: string): string {
  return `${projectId}::${normalize(processName)}`;
}

export function dedupKey_ST_L2(st_l1_id: string, processNo: string): string {
  return `${st_l1_id}::${normalize(processNo)}`;
}

export function dedupKey_ST_L3(st_l2_id: string, fourM: string, elementName: string): string {
  return `${st_l2_id}::${normalize(fourM)}::${normalize(elementName)}`;
}

export function dedupKey_FN_L1(st_l1_id: string, category: string, functionName: string): string {
  return `${st_l1_id}::${normalize(category)}::${normalize(functionName)}`;
}

/** productCharId = ProcessProductChar.id (FK), 텍스트가 아님 */
export function dedupKey_FN_L2(
  st_l2_id: string,
  functionName: string,
  productCharId: string
): string {
  return `${st_l2_id}::${normalize(functionName)}::${productCharId}`;
}

export function dedupKey_FN_L3(
  st_l3_id: string,
  functionName: string,
  processChar: string
): string {
  return `${st_l3_id}::${normalize(functionName)}::${normalize(processChar)}`;
}

export function dedupKey_FL_FE(fn_l1_id: string, effectName: string): string {
  return `${fn_l1_id}::${normalize(effectName)}`;
}

export function dedupKey_FL_FM(fn_l2_id: string, modeName: string): string {
  return `${fn_l2_id}::${normalize(modeName)}`;
}

export function dedupKey_FL_FC(fn_l3_id: string, causeName: string): string {
  return `${fn_l3_id}::${normalize(causeName)}`;
}

// ===== DFMEA dedupKey 함수 =====
// PFMEA와 동일 원칙: parentId(n-1) + 자기 식별값
// 컬럼명만 DFMEA 용어로 변경
// @see docs/DFMEA 파이프라인  PFMEA 1대1 벤치마킹 전체 적용.md

// ST_L2: 초점요소 (PFMEA의 메인공정에 대응)
export function dedupKey_DFMEA_ST_L2(st_l1_id: string, elementNo: string): string {
  return `${st_l1_id}::${normalize(elementNo)}`;
}

// ST_L3: 부품 (PFMEA의 작업요소에 대응)
export function dedupKey_DFMEA_ST_L3(st_l2_id: string, type: string, partName: string): string {
  return `${st_l2_id}::${normalize(type)}::${normalize(partName)}`;
}

// FN_L1: 제품기능 (PFMEA의 완제품기능에 대응)
export function dedupKey_DFMEA_FN_L1(st_l1_id: string, category: string, functionName: string): string {
  return `${st_l1_id}::${normalize(category)}::${normalize(functionName)}`;
}

// FN_L2: 초점요소 기능 + 제품특성 (PFMEA의 공정기능+제품특성에 대응)
export function dedupKey_DFMEA_FN_L2(st_l2_id: string, functionName: string, productCharId: string): string {
  return `${st_l2_id}::${normalize(functionName)}::${productCharId}`;
}

// FN_L3: 부품 기능 + 부품 요구사항 (PFMEA의 작업요소기능+공정특성에 대응)
export function dedupKey_DFMEA_FN_L3(st_l3_id: string, functionName: string, partRequirement: string): string {
  return `${st_l3_id}::${normalize(functionName)}::${normalize(partRequirement)}`;
}

// FL_FE: 고장영향 (PFMEA와 동일)
export function dedupKey_DFMEA_FL_FE(fn_l1_id: string, effectName: string): string {
  return `${fn_l1_id}::${normalize(effectName)}`;
}

// FL_FM: 고장형태 (PFMEA와 동일)
export function dedupKey_DFMEA_FL_FM(fn_l2_id: string, modeName: string): string {
  return `${fn_l2_id}::${normalize(modeName)}`;
}

// FL_FC: 고장원인 (PFMEA와 동일)
export function dedupKey_DFMEA_FL_FC(fn_l3_id: string, causeName: string): string {
  return `${fn_l3_id}::${normalize(causeName)}`;
}

/** 렌더링 시 동일 dedupKey 첫 행만 유지 */
export function deduplicateForRendering<T extends { dedupKey: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.dedupKey)) return false;
    seen.add(item.dedupKey);
    return true;
  });
}
