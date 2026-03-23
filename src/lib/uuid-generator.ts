/**
 * @file uuid-generator.ts
 * @description PFMEA 계층 UUID 생성기 — 결정론적, 부모 포함 코드
 *
 * 코드 구조: {DOC}-{LEVEL}-{PARAMS}
 *   DOC: PF(PFMEA) / CP(관리계획서) / PD(PFD) / DF(DFMEA)
 *   LEVEL: L1 / L2 / L3 / FC
 *
 * 5대 원칙:
 *   1. 문서 유형 최우선 (첫 세그먼트)
 *   2. 계층 명시 (두 번째 세그먼트)
 *   3. 자식 UUID는 부모 UUID를 prefix로 포함
 *   4. 순번 001~999 (3자리 zero-padding)
 *   5. 코드=식별자 (행/열 위치는 sheetRow 별도 컬럼)
 *
 * @version 1.1.0
 * @created 2026-03-16
 * @see 스키마/01_UUID_설계_명세서_v1.1.0.md
 */

const pad = (n: number, size = 3): string => String(n).padStart(size, '0');

// ══════════════════════════════════════════════
// L1 완제품 레벨 (C계열)
// ══════════════════════════════════════════════

/** C1 — 완제품 디비전: PF-L1-YP */
export const genC1 = (doc: string, div: string): string =>
  `${doc}-L1-${div === 'USER' ? 'US' : div}`;

/** C2 — 제품기능: PF-L1-YP-001 */
export const genC2 = (doc: string, div: string, c2: number): string =>
  `${genC1(doc, div)}-${pad(c2)}`;

/** C3 — 제품요구: PF-L1-YP-001-002 */
export const genC3 = (doc: string, div: string, c2: number, c3: number): string =>
  `${genC2(doc, div, c2)}-${pad(c3)}`;

/** C4 — 고장영향: PF-L1-YP-001-002-001 */
export const genC4 = (doc: string, div: string, c2: number, c3: number, c4: number): string =>
  `${genC3(doc, div, c2, c3)}-${pad(c4)}`;

// ══════════════════════════════════════════════
// L2 공정 레벨 (A계열)
// ══════════════════════════════════════════════

/** A1/A2 — 공정: PF-L2-040 */
export const genA1 = (doc: string, pno: number): string =>
  `${doc}-L2-${pad(pno)}`;

/** A3 — 공정기능: PF-L2-040-F-001 */
export const genA3 = (doc: string, pno: number, seq: number): string =>
  `${genA1(doc, pno)}-F-${pad(seq)}`;

/** A4 — 제품특성: PF-L2-040-P-001 */
export const genA4 = (doc: string, pno: number, seq: number): string =>
  `${genA1(doc, pno)}-P-${pad(seq)}`;

/** A5 — 고장형태: PF-L2-040-M-001 */
export const genA5 = (doc: string, pno: number, seq: number): string =>
  `${genA1(doc, pno)}-M-${pad(seq)}`;

/** A6 — 검출관리: PF-L2-040-D-001 */
export const genA6 = (doc: string, pno: number, seq: number): string =>
  `${genA1(doc, pno)}-D-${pad(seq)}`;

// ══════════════════════════════════════════════
// L3 작업요소 레벨 (B계열)
// ══════════════════════════════════════════════

/** B1 — 작업요소: PF-L3-040-MC-001 */
export const genB1 = (doc: string, pno: number, m4: string, b1seq: number): string =>
  `${doc}-L3-${pad(pno)}-${m4}-${pad(b1seq)}`;

/** B2 — 요소기능: PF-L3-040-MC-001-G (funcIdx=1) / PF-L3-040-MC-001-G-002 (funcIdx≥2) */
export const genB2 = (doc: string, pno: number, m4: string, b1seq: number, funcIdx: number = 1): string =>
  funcIdx <= 1
    ? `${genB1(doc, pno, m4, b1seq)}-G`
    : `${genB1(doc, pno, m4, b1seq)}-G-${pad(funcIdx)}`;

/** B3 — 공정특성: PF-L3-040-MC-001-C-001 */
export const genB3 = (doc: string, pno: number, m4: string, b1seq: number, cseq: number): string =>
  `${genB1(doc, pno, m4, b1seq)}-C-${pad(cseq)}`;

/** B4 — 고장원인: PF-L3-040-MC-001-K-001 */
export const genB4 = (doc: string, pno: number, m4: string, b1seq: number, kseq: number): string =>
  `${genB1(doc, pno, m4, b1seq)}-K-${pad(kseq)}`;

/** B5 — 예방관리: PF-L3-040-MC-001-V-001 */
export const genB5 = (doc: string, pno: number, m4: string, b1seq: number, vseq: number): string =>
  `${genB1(doc, pno, m4, b1seq)}-V-${pad(vseq)}`;

// ══════════════════════════════════════════════
// FC 고장사슬 (FailureLink)
// ══════════════════════════════════════════════

/** FC행 UUID: PF-FC-040-M001-MC001-K001 */
export const genFC = (
  doc: string, pno: number,
  mseq: number, m4: string, b1seq: number, kseq: number,
): string =>
  `${doc}-FC-${pad(pno)}-M${pad(mseq)}-${m4}${pad(b1seq)}-K${pad(kseq)}`;

// ══════════════════════════════════════════════
// CP (Control Plan) 관리계획서
// ══════════════════════════════════════════════

/** CP 공정: CP-P-040 */
export const genCpProcess = (cpNo: string, pno: number): string =>
  `CP-P-${pad(pno)}`;

/** CP 항목: CP-P-040-I-001 */
export const genCpItem = (cpNo: string, pno: number, seq: number): string =>
  `CP-P-${pad(pno)}-I-${pad(seq)}`;

/** CP 검출기: CP-P-040-DT-001 */
export const genCpDetector = (cpNo: string, pno: number, seq: number): string =>
  `CP-P-${pad(pno)}-DT-${pad(seq)}`;

/** CP 관리항목: CP-P-040-CT-001 */
export const genCpControl = (cpNo: string, pno: number, seq: number): string =>
  `CP-P-${pad(pno)}-CT-${pad(seq)}`;

/** CP 관리방법: CP-P-040-MT-001 */
export const genCpMethod = (cpNo: string, pno: number, seq: number): string =>
  `CP-P-${pad(pno)}-MT-${pad(seq)}`;

/** CP 이상조치: CP-P-040-RT-001 */
export const genCpReaction = (cpNo: string, pno: number, seq: number): string =>
  `CP-P-${pad(pno)}-RT-${pad(seq)}`;

// ══════════════════════════════════════════════
// PFD (Process Flow Diagram) 공정흐름도
// ══════════════════════════════════════════════

/** PFD 공정단계: PD-S-040 */
export const genPfdStep = (pfdNo: string, pno: number): string =>
  `PD-S-${pad(pno)}`;

/** PFD 항목: PD-S-040-I-001 */
export const genPfdItem = (pfdNo: string, pno: number, seq: number): string =>
  `PD-S-${pad(pno)}-I-${pad(seq)}`;

// ══════════════════════════════════════════════
// 유틸리티
// ══════════════════════════════════════════════

/**
 * 부모 UUID 추출 — 마지막 세그먼트 제거
 * 예: PF-L1-YP-001-002 → PF-L1-YP-001
 *     PF-L1-YP → null (최상위)
 */
export const getParentId = (id: string): string | null => {
  const segs = id.split('-');
  if (segs.length <= 3) return null;
  return segs.slice(0, -1).join('-');
};
