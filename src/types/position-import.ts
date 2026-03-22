/**
 * @file position-import.ts
 * @description 위치기반 Import 타입 정의 — DB Atomic 테이블 1:1 매핑
 *
 * 모든 id는 위치기반 UUID: L1-R{row}, L2-R{row}-C{col} 등
 * FK는 크로스시트 행번호 직접 참조 (텍스트 매칭 0건)
 */

// ─── L1 (완제품 공정) ───

export interface PosL1Structure {
  id: string;        // 'L1-STRUCT' (singleton)
  fmeaId: string;
  name: string;
  parentId?: string; // null (root)
}

export interface PosL1Function {
  id: string;        // 'L1-R{n}-C2' (C2 첫 등장 행)
  fmeaId: string;
  l1StructId: string;
  parentId: string;  // → L1Structure.id (E-02)
  category: string;  // C1: YP|SP|USER
  functionName: string; // C2
  requirement: string;  // C3
}

export interface PosFailureEffect {
  id: string;        // 'L1-R{n}-C4'
  fmeaId: string;
  l1FuncId: string;  // FK → PosL1Function.id
  parentId: string;  // → L1Function.id (E-03)
  category: string;  // C1: YP|SP|USER
  effect: string;    // C4
  severity: number;  // FC시트에서 역참조
}

// ─── L2 (공정) ───

export interface PosL2Structure {
  id: string;        // 'L2-R{n}' (공정번호 첫 등장 행)
  fmeaId: string;
  l1Id: string;      // FK → PosL1Structure.id
  parentId: string;  // → L1Structure.id (E-05)
  no: string;        // A1 공정번호
  name: string;      // A2 공정명
  order: number;
}

export interface PosL2Function {
  id: string;        // 'L2-R{n}-C4'
  fmeaId: string;
  l2StructId: string;
  parentId: string;  // → L2Structure.id (E-08)
  functionName: string; // A3
  productChar: string;  // A4
  specialChar?: string;
}

export interface PosProcessProductChar {
  id: string;        // 'L2-R{n}-C5'
  fmeaId: string;
  l2StructId: string;
  parentId: string;  // → L2Structure.id (E-09)
  name: string;      // A4
  specialChar?: string;
  orderIndex: number;
}

export interface PosFailureMode {
  id: string;        // 'L2-R{n}-C6'
  fmeaId: string;
  l2FuncId: string;
  l2StructId: string;
  productCharId?: string;
  parentId: string;  // → ProductChar.id (E-11)
  mode: string;      // A5
}

// ─── L3 (작업요소) ───

export interface PosL3Structure {
  id: string;        // 'L3-R{n}'
  fmeaId: string;
  l1Id: string;
  l2Id: string;      // FK → PosL2Structure.id (공정번호 lookup)
  parentId: string;  // → L2Structure.id (E-13)
  m4?: string;
  name: string;      // B1
  order: number;
}

export interface PosL3Function {
  id: string;        // 'L3-R{n}-C5'
  fmeaId: string;
  l3StructId: string;
  l2StructId: string;
  parentId: string;  // → L3Structure.id (E-17)
  functionName: string; // B2
  processChar: string;  // B3 텍스트 (fallback 호환용)
  processCharId?: string; // ★v4: → PosL3ProcessChar.id (B-13)
  specialChar?: string;
}

// ★v4 신규: L3ProcessChar — B3(공정특성) 독립 엔티티
// 기존: L3Function.processChar 문자열 → 신규: 독립 UUID FK
export interface PosL3ProcessChar {
  id: string;        // 'L3-R{n}-C5-PC' (B3 독립 UUID)
  fmeaId: string;
  l3FuncId: string;  // FK → PosL3Function.id (E-18)
  l3StructId: string;
  parentId: string;  // → L3Function.id (E-18)
  name: string;      // B3 공정특성 텍스트
  specialChar?: string; // SC 특별특성
}

export interface PosFailureCause {
  id: string;        // 'L3-R{n}-C7'
  fmeaId: string;
  l3FuncId: string;
  l3StructId: string;
  l2StructId: string;
  parentId: string;  // → L3Function.id (E-20)
  l3CharId?: string; // ★v4 핵심: → PosL3ProcessChar.id (B-13)
  cause: string;     // B4
}

// ─── FC (고장사슬) ───

export interface PosFailureLink {
  id: string;        // 'FC-R{n}'
  fmeaId: string;
  fmId: string;      // FK → PosFailureMode.id (L2원본행 참조)
  feId: string;      // FK → PosFailureEffect.id (L1원본행 참조)
  fcId: string;      // FK → PosFailureCause.id (L3원본행 참조)
  parentId?: string; // null (root level 고장사슬)
  fmText?: string;
  feText?: string;
  fcText?: string;
  feScope?: string;
  fmProcess?: string;
  fcWorkElem?: string;
  fcM4?: string;
}

export interface PosRiskAnalysis {
  id: string;        // 'FC-R{n}-RA'
  fmeaId: string;
  linkId: string;    // FK → PosFailureLink.id
  parentId: string;  // → FailureLink.id (E-22)
  severity: number;
  occurrence: number;
  detection: number;
  ap: string;
  preventionControl?: string; // PC (B5)
  detectionControl?: string;  // DC (A6)
}

// ─── 통합 결과 ───

export interface PositionAtomicData {
  fmeaId: string;
  l1Structure: PosL1Structure;
  l1Functions: PosL1Function[];
  l2Structures: PosL2Structure[];
  l2Functions: PosL2Function[];
  l3Structures: PosL3Structure[];
  l3Functions: PosL3Function[];
  l3ProcessChars: PosL3ProcessChar[];  // ★v4: B3 독립 엔티티
  processProductChars: PosProcessProductChar[];
  failureEffects: PosFailureEffect[];
  failureModes: PosFailureMode[];
  failureCauses: PosFailureCause[];
  failureLinks: PosFailureLink[];
  riskAnalyses: PosRiskAnalysis[];
  stats: Record<string, number>;
}
