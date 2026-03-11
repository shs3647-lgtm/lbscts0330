/**
 * @file schema.ts
 * @description PFD 원자성 관계형 DB 스키마 (Atomic Relational Schema)
 *
 * 설계 원칙:
 * 1. 모든 데이터는 원자적 단위(Atomic Unit)로 분리
 * 2. 상위-하위 관계는 외래키(FK)로 명시적 연결
 * 3. 자동변환 금지 - 사용자 입력값 그대로 저장
 * 4. 셀합치기(rowSpan)는 표시용이며 데이터 원자성에 영향 없음
 *
 * 벤치마킹: CP 원자성 DB 구조
 * - PFD: PfdAtomicProcess, PfdAtomicChar, PfdAtomicFlow
 */

// ============ 기본 원자 단위 ============
export interface AtomicRecord {
  id: string;           // 고유 ID (PK) - 하이브리드 포맷: {PFD_SEQ}-{TYPE}-{PATH}-{SEQ}
  createdAt?: string;   // 생성일
  updatedAt?: string;   // 수정일

  // ★★★ 모자관계 (부모-자식) ★★★
  parentId?: string;    // 부모 ID (계층 추적용)

  // ★★★ 병합 그룹 (같은 그룹 = 같은 데이터) ★★★
  mergeGroupId?: string;  // 병합 그룹 ID
  rowSpan?: number;       // 병합된 행 수 (1 = 비병합)
  colSpan?: number;       // 병합된 열 수 (1 = 비병합)

  // ★★★ 인덱싱 정보 ★★★
  rowIndex?: number;      // 행 인덱스
  colIndex?: number;      // 열 인덱스
  sortOrder?: number;     // 정렬 순서
}

// ============ 공정정보 (1단계) ============

/**
 * PFD 공정 (최상위)
 * - 상위: 없음 (루트)
 * - 하위: PfdAtomicChar, PfdAtomicFlow
 */
export interface PfdAtomicProcess extends AtomicRecord {
  pfdNo: string;         // FK: PFD 프로젝트 번호
  processNo: string;     // 공정번호
  processName: string;   // 공정명
  level?: string;        // Main | Sub
  processDesc?: string;  // 공정설명
  workElement?: string;  // 작업요소
  equipment?: string;    // 설비/금형/지그
}

// ============ 특성정보 (2단계) ============

/**
 * PFD 특성정보
 * - 상위: PfdAtomicProcess (공정) - FK: processId
 * - 하위: 없음
 */
export interface PfdAtomicChar extends AtomicRecord {
  pfdNo: string;         // FK: PFD 프로젝트 번호
  processNo: string;     // FK: 공정번호
  processId: string;     // FK: PfdAtomicProcess.id
  productChar?: string;  // 제품특성
  processChar?: string;  // 공정특성
  specialChar?: string;  // 특별특성 (CC/SC/IC)
}

// ============ 흐름정보 (3단계) ============

/**
 * PFD 흐름정보
 * - 상위: PfdAtomicProcess (공정) - FK: processId
 * - 하위: 없음
 */
export interface PfdAtomicFlow extends AtomicRecord {
  pfdNo: string;         // FK: PFD 프로젝트 번호
  processNo: string;     // FK: 공정번호
  processId: string;     // FK: PfdAtomicProcess.id
  previousProcess?: string; // 이전 공정
  nextProcess?: string;     // 다음 공정
  processTime?: number;     // 공정시간 (분)
}