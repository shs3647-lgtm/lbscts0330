/**
 * @file cross-sheet-resolver.ts
 * @description FC 시트 → L1/L2/L3 크로스시트 FK 해결
 *
 * **오직 원본 행번호**로만 UUID를 해석한다 (Rule 1.7 — 텍스트 역매칭 금지).
 * FC 시트의 L1원본행 / L2원본행 / L3원본행이 비었거나 맵에 없으면 빈 문자열 반환.
 *
 * ## 행번호 정의 (★ 엑셀 행 기준)
 * - `l1Row` / `l2Row` / `l3Row` 및 L1/L2/L3 파서의 `excelRow`는 모두 **워크시트 물리 행 번호**다.
 * - **Excel 1-based** — ExcelJS `eachRow`의 `rowNumber`, 수식 `=ROW()`와 동일한 정수.
 * - 헤더 제외 0-based 인덱스·“데이터만의 순번”은 사용하지 않는다 (off-by-one 방지).
 *
 * ## Import 정답 모델 (기준행 매핑)
 * - Import 시 **엑셀 물리 행 = 기준행**으로 L1/L2/L3를 스캔하며 `행 → FE/FM/FC UUID` 맵을 만든다.
 * - **FC 시트**는 별도 본문 재해석이 아니라, 각 행이 가리키는 **L1/L2/L3 기준행**만으로
 *   FE–FM–FC **상호관계(FailureLink)** 를 연결한다 (텍스트 역매칭 없음).
 *
 * @created 2026-03-22
 */

/** FC 시트 한 행에서 추출한 크로스시트 참조 — **원본 행번호만** (resolve는 텍스트 미사용). */
export interface CrossSheetRef {
  /** L1 시트에서 해당 FE가 있는 **엑셀 물리 행**(1-based, FC시트 L1원본행 컬럼) */
  l1Row?: number;
  /** L2 시트에서 해당 FM이 있는 **엑셀 물리 행**(1-based, FC시트 L2원본행 컬럼) */
  l2Row?: number;
  /** L3 시트에서 해당 FC(B4)가 있는 **엑셀 물리 행**(1-based, FC시트 L3원본행 컬럼) */
  l3Row?: number;
}

/**
 * 크로스시트 FK 해결기
 *
 * L1/L2/L3 시트 파싱 시 **엑셀 물리 행(1-based)** → UUID 맵을 등록한 뒤,
 * FC 시트의 L1/L2/L3원본행(동일 기준)으로만 FE/FM/FC UUID를 조회한다.
 */
export class CrossSheetResolver {
  private l1RowToFeId = new Map<number, string>();
  private l2RowToFmId = new Map<number, string>();
  private l3RowToFcId = new Map<number, string>();

  private l2RowToL2StructId = new Map<number, string>();
  private l3RowToL3StructId = new Map<number, string>();

  /** L1 시트 FE 등록 (행 → L1-R{n}-C4) */
  registerFE(row: number, feId: string, _feText?: string, _scope?: string): void {
    this.l1RowToFeId.set(row, feId);
  }

  /** L2 시트 FM 등록 */
  registerFM(row: number, fmId: string, _fmText?: string, _processNo?: string, l2StructId?: string): void {
    this.l2RowToFmId.set(row, fmId);
    if (l2StructId) this.l2RowToL2StructId.set(row, l2StructId);
  }

  /** L3 시트 FC 등록 */
  registerFC(
    row: number,
    fcId: string,
    _fcText?: string,
    _processNo?: string,
    _m4?: string,
    _we?: string,
    l3StructId?: string,
  ): void {
    this.l3RowToFcId.set(row, fcId);
    if (l3StructId) this.l3RowToL3StructId.set(row, l3StructId);
  }

  resolve(ref: CrossSheetRef): { feId: string; fmId: string; fcId: string; l2StructId: string; l3StructId: string } {
    const fmId = this.resolveFM(ref);
    const fcId = this.resolveFC(ref);
    return {
      feId: this.resolveFE(ref),
      fmId,
      fcId,
      l2StructId: ref.l2Row ? (this.l2RowToL2StructId.get(ref.l2Row) || '') : '',
      l3StructId: ref.l3Row ? (this.l3RowToL3StructId.get(ref.l3Row) || '') : '',
    };
  }

  private resolveFE(ref: CrossSheetRef): string {
    if (ref.l1Row && this.l1RowToFeId.has(ref.l1Row)) {
      return this.l1RowToFeId.get(ref.l1Row)!;
    }
    return '';
  }

  private resolveFM(ref: CrossSheetRef): string {
    if (ref.l2Row && this.l2RowToFmId.has(ref.l2Row)) {
      return this.l2RowToFmId.get(ref.l2Row)!;
    }
    return '';
  }

  private resolveFC(ref: CrossSheetRef): string {
    if (ref.l3Row && this.l3RowToFcId.has(ref.l3Row)) {
      return this.l3RowToFcId.get(ref.l3Row)!;
    }
    return '';
  }

  get stats(): { feCount: number; fmCount: number; fcCount: number } {
    return {
      feCount: this.l1RowToFeId.size,
      fmCount: this.l2RowToFmId.size,
      fcCount: this.l3RowToFcId.size,
    };
  }
}
