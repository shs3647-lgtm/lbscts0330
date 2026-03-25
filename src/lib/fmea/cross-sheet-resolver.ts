/**
 * @file cross-sheet-resolver.ts
 * @description FC 시트 → L1/L2/L3 크로스시트 FK 해결
 *
 * ■ 우선순위: 원본 행번호 → 텍스트 폴백 (Rule 1.7 호환)
 *   1차: 엑셀 물리 행번호 (L1원본행, L2원본행, L3원본행)
 *   2차: 공정번호+텍스트 매칭 — 행번호 없는 엑셀에서 FL 100% 연결 보장
 *
 * ## 변경 이력
 * - 2026-03-22: 초기 구현 (행번호만)
 * - 2026-03-25: 텍스트 폴백 추가 (FM miss 4건 + FC miss 3건 해결)
 *   - L2 원본행이 없을 때 공정번호+FM텍스트로 폴백 매칭
 *   - L3 원본행이 없을 때 공정번호+FC텍스트로 폴백 매칭
 *   - 정확 매칭 실패 시 포함(includes) 매칭 적용
 *
 * @created 2026-03-22
 */

/** FC 시트 한 행에서 추출한 크로스시트 참조 */
export interface CrossSheetRef {
  l1Row?: number;
  l2Row?: number;
  l3Row?: number;
  // 텍스트 폴백용 — 행번호가 없을 때 사용
  feText?: string;
  feScope?: string;
  fmText?: string;
  fcText?: string;
  processNo?: string;
}

/**
 * 크로스시트 FK 해결기
 *
 * 1차: 엑셀 물리 행(1-based) → UUID
 * 2차: 공정번호+텍스트 → UUID (행번호 없는 엑셀 대응)
 */
export class CrossSheetResolver {
  private l1RowToFeId = new Map<number, string>();
  private l2RowToFmId = new Map<number, string>();
  private l3RowToFcId = new Map<number, string>();

  private l2RowToL2StructId = new Map<number, string>();
  private l3RowToL3StructId = new Map<number, string>();

  // 텍스트 폴백용 맵
  private feTextMap = new Map<string, { feId: string }>(); // `${scope}::${feText}` → feId
  private fmTextMap = new Map<string, { fmId: string; l2StructId: string }>(); // `${processNo}::${fmText}` → fmId
  private fcTextMap = new Map<string, { fcId: string; l3StructId: string }>(); // `${processNo}::${fcText}` → fcId

  /** L1 시트 FE 등록 */
  registerFE(row: number, feId: string, feText?: string, scope?: string): void {
    this.l1RowToFeId.set(row, feId);
    if (feText) {
      this.feTextMap.set(`${(scope || '').trim()}::${feText.trim()}`, { feId });
    }
  }

  /** L2 시트 FM 등록 */
  registerFM(row: number, fmId: string, fmText?: string, processNo?: string, l2StructId?: string): void {
    this.l2RowToFmId.set(row, fmId);
    if (l2StructId) this.l2RowToL2StructId.set(row, l2StructId);
    if (fmText && processNo) {
      this.fmTextMap.set(`${processNo.trim()}::${fmText.trim()}`, { fmId, l2StructId: l2StructId || '' });
    }
  }

  /** L3 시트 FC 등록 */
  registerFC(
    row: number,
    fcId: string,
    fcText?: string,
    processNo?: string,
    _m4?: string,
    _we?: string,
    l3StructId?: string,
  ): void {
    this.l3RowToFcId.set(row, fcId);
    if (l3StructId) this.l3RowToL3StructId.set(row, l3StructId);
    if (fcText && processNo) {
      const key = `${processNo.trim()}::${fcText.trim()}`;
      if (!this.fcTextMap.has(key)) {
        this.fcTextMap.set(key, { fcId, l3StructId: l3StructId || '' });
      }
    }
  }

  resolve(ref: CrossSheetRef): { feId: string; fmId: string; fcId: string; l2StructId: string; l3StructId: string } {
    const feResult = this.resolveFE(ref);
    const fmResult = this.resolveFM(ref);
    const fcResult = this.resolveFC(ref);
    return {
      feId: feResult,
      fmId: fmResult.fmId,
      fcId: fcResult.fcId,
      l2StructId: fmResult.l2StructId || (ref.l2Row ? (this.l2RowToL2StructId.get(ref.l2Row) || '') : ''),
      l3StructId: fcResult.l3StructId || (ref.l3Row ? (this.l3RowToL3StructId.get(ref.l3Row) || '') : ''),
    };
  }

  private resolveFE(ref: CrossSheetRef): string {
    // 1차: 행번호
    if (ref.l1Row && this.l1RowToFeId.has(ref.l1Row)) {
      return this.l1RowToFeId.get(ref.l1Row)!;
    }
    // 2차: 텍스트 폴백
    if (ref.feText) {
      const key = `${(ref.feScope || '').trim()}::${ref.feText.trim()}`;
      const found = this.feTextMap.get(key);
      if (found) return found.feId;
      // 부분 매칭
      for (const [k, v] of this.feTextMap) {
        if (ref.feText && k.includes(ref.feText.trim())) return v.feId;
      }
    }
    return '';
  }

  private resolveFM(ref: CrossSheetRef): { fmId: string; l2StructId: string } {
    // 1차: 행번호
    if (ref.l2Row && this.l2RowToFmId.has(ref.l2Row)) {
      return {
        fmId: this.l2RowToFmId.get(ref.l2Row)!,
        l2StructId: this.l2RowToL2StructId.get(ref.l2Row) || '',
      };
    }
    // 2차: 정확 매칭 (공정번호 + FM텍스트)
    if (ref.fmText && ref.processNo) {
      const key = `${ref.processNo.trim()}::${ref.fmText.trim()}`;
      const found = this.fmTextMap.get(key);
      if (found) return found;
      // 3차: 부분 매칭 — FM텍스트가 포함된 경우 (같은 공정번호 내)
      for (const [k, v] of this.fmTextMap) {
        if (k.startsWith(`${ref.processNo.trim()}::`)) {
          const mapText = k.split('::')[1];
          if (mapText && ref.fmText && (mapText.includes(ref.fmText.trim()) || ref.fmText.trim().includes(mapText))) {
            return v;
          }
        }
      }
    }
    return { fmId: '', l2StructId: '' };
  }

  private resolveFC(ref: CrossSheetRef): { fcId: string; l3StructId: string } {
    // 1차: 행번호
    if (ref.l3Row && this.l3RowToFcId.has(ref.l3Row)) {
      return {
        fcId: this.l3RowToFcId.get(ref.l3Row)!,
        l3StructId: this.l3RowToL3StructId.get(ref.l3Row) || '',
      };
    }
    // 2차: 정확 매칭 (공정번호 + FC텍스트)
    if (ref.fcText && ref.processNo) {
      const key = `${ref.processNo.trim()}::${ref.fcText.trim()}`;
      const found = this.fcTextMap.get(key);
      if (found) return found;
      // 3차: 부분 매칭
      for (const [k, v] of this.fcTextMap) {
        if (k.startsWith(`${ref.processNo.trim()}::`)) {
          const mapText = k.split('::')[1];
          if (mapText && ref.fcText && (mapText.includes(ref.fcText.trim()) || ref.fcText.trim().includes(mapText))) {
            return v;
          }
        }
      }
    }
    return { fcId: '', l3StructId: '' };
  }

  get stats(): { feCount: number; fmCount: number; fcCount: number } {
    return {
      feCount: this.l1RowToFeId.size,
      fmCount: this.l2RowToFmId.size,
      fcCount: this.l3RowToFcId.size,
    };
  }
}
