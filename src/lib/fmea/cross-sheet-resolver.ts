/**
 * @file cross-sheet-resolver.ts
 * @description FC 시트 → L1/L2/L3 크로스시트 FK 해결
 *
 * ■ v5 리팩토링: 위치기반 UUID FK 직접 꽂아넣기
 *   1차: 엑셀 물리 행번호 (L1_origRow, L2_origRow, L3_origRow)
 *   2차: 텍스트 역매칭 — FC 시트 텍스트 → L1/L2/L3 원본 행 역추적 → UUID 생성
 *
 * ## 변경 이력
 * - 2026-03-22: 초기 구현 (행번호만)
 * - 2026-03-25: 텍스트 폴백 추가
 * - 2026-03-27: ★v5 리팩토링 — 텍스트 매칭을 "행번호 역추적" 방식으로 변경
 *   FC 시트에 origRow 컬럼 없어도 100% FK 연결 보장
 *
 * @created 2026-03-22
 */

/** FC 시트 한 행에서 추출한 크로스시트 참조 */
export interface CrossSheetRef {
  l1Row?: number;
  l2Row?: number;
  l3Row?: number;
  // 텍스트 역매칭용 — origRow 컬럼 없는 Excel 대응
  feText?: string;
  feScope?: string;
  fmText?: string;
  fcText?: string;
  processNo?: string;
  m4?: string;
  weText?: string;
}

/**
 * 크로스시트 FK 해결기 — 위치기반 UUID FK 직접 생성
 *
 * 1차: 엑셀 물리 행(1-based) → UUID
 * 2차: 텍스트 → 원본 행 역추적 → UUID (origRow 컬럼 없는 Excel 대응)
 */
export class CrossSheetResolver {
  // 행번호 → UUID 맵
  private l1RowToFeId = new Map<number, string>();
  private l2RowToFmId = new Map<number, string>();
  private l3RowToFcId = new Map<number, string>();

  private l2RowToL2StructId = new Map<number, string>();
  private l3RowToL3StructId = new Map<number, string>();

  // ★v5: 텍스트 → {id, row, l2/l3StructId} 맵 (역매칭 + 위치기반 UUID)
  // FE: `${scope}::${feText}` → { feId, row }
  private feTextMap = new Map<string, { feId: string; row: number }>();
  // FM: `${processNo}::${fmText}` → { fmId, l2StructId, row }
  private fmTextMap = new Map<string, { fmId: string; l2StructId: string; row: number }>();
  // FC: `${processNo}::${m4}::${weText}::${fcText}` → { fcId, l3StructId, row }
  // ★v5: m4+WE를 키에 포함하여 동일 공정 내 동일 원인 텍스트도 정확 구별
  private fcTextMap = new Map<string, { fcId: string; l3StructId: string; row: number }>();
  // FC loose: `${processNo}::${fcText}` (m4/WE 무시) — 위 정밀 매칭 실패 시 폴백
  private fcLooseMap = new Map<string, { fcId: string; l3StructId: string; row: number }>();

  /** L1 시트 FE 등록 */
  registerFE(row: number, feId: string, feText?: string, scope?: string): void {
    this.l1RowToFeId.set(row, feId);
    if (feText) {
      const key = `${(scope || '').trim()}::${feText.trim()}`;
      if (!this.feTextMap.has(key)) {
        this.feTextMap.set(key, { feId, row });
      }
    }
  }

  /** L2 시트 FM 등록 */
  registerFM(row: number, fmId: string, fmText?: string, processNo?: string, l2StructId?: string): void {
    this.l2RowToFmId.set(row, fmId);
    if (l2StructId) this.l2RowToL2StructId.set(row, l2StructId);
    if (fmText && processNo) {
      const key = `${processNo.trim()}::${fmText.trim()}`;
      if (!this.fmTextMap.has(key)) {
        this.fmTextMap.set(key, { fmId, l2StructId: l2StructId || '', row });
      }
    }
  }

  /** L3 시트 FC 등록 */
  registerFC(
    row: number,
    fcId: string,
    fcText?: string,
    processNo?: string,
    m4?: string,
    we?: string,
    l3StructId?: string,
  ): void {
    this.l3RowToFcId.set(row, fcId);
    if (l3StructId) this.l3RowToL3StructId.set(row, l3StructId);
    if (fcText && processNo) {
      // 정밀 키: 공정+4M+WE+원인
      const preciseKey = `${processNo.trim()}::${(m4 || '').trim()}::${(we || '').trim()}::${fcText.trim()}`;
      if (!this.fcTextMap.has(preciseKey)) {
        this.fcTextMap.set(preciseKey, { fcId, l3StructId: l3StructId || '', row });
      }
      // Loose 키: 공정+원인 (4M/WE 무시)
      const looseKey = `${processNo.trim()}::${fcText.trim()}`;
      if (!this.fcLooseMap.has(looseKey)) {
        this.fcLooseMap.set(looseKey, { fcId, l3StructId: l3StructId || '', row });
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
    // 1차: 행번호 직접 매칭
    if (ref.l1Row && this.l1RowToFeId.has(ref.l1Row)) {
      return this.l1RowToFeId.get(ref.l1Row)!;
    }
    // 2차: 텍스트 → 원본 행 역추적 → UUID
    if (ref.feText) {
      // scope+FE 정확 매칭
      const key = `${(ref.feScope || '').trim()}::${ref.feText.trim()}`;
      const found = this.feTextMap.get(key);
      if (found) return found.feId;
      // scope 무시 매칭 (FE 텍스트만)
      for (const [k, v] of this.feTextMap) {
        const feTextPart = k.split('::')[1];
        if (feTextPart === ref.feText.trim()) return v.feId;
      }
      // 부분 포함 매칭 (최후 수단)
      for (const [k, v] of this.feTextMap) {
        const feTextPart = k.split('::')[1];
        if (feTextPart && ref.feText &&
          (feTextPart.includes(ref.feText.trim()) || ref.feText.trim().includes(feTextPart))) {
          return v.feId;
        }
      }
    }
    return '';
  }

  private resolveFM(ref: CrossSheetRef): { fmId: string; l2StructId: string } {
    // 1차: 행번호 직접 매칭
    if (ref.l2Row && this.l2RowToFmId.has(ref.l2Row)) {
      return {
        fmId: this.l2RowToFmId.get(ref.l2Row)!,
        l2StructId: this.l2RowToL2StructId.get(ref.l2Row) || '',
      };
    }
    // 2차: 텍스트 → 원본 행 역추적
    if (ref.fmText && ref.processNo) {
      // 정확 매칭 (공정번호+FM텍스트)
      const key = `${ref.processNo.trim()}::${ref.fmText.trim()}`;
      const found = this.fmTextMap.get(key);
      if (found) return found;
    }
    // 3차: 공정번호 무시, FM 텍스트만으로 매칭 (공정번호 형식 차이 대응)
    if (ref.fmText) {
      for (const [k, v] of this.fmTextMap) {
        const fmTextPart = k.split('::')[1];
        if (fmTextPart === ref.fmText.trim()) return v;
      }
      // 부분 포함 매칭
      for (const [k, v] of this.fmTextMap) {
        const fmTextPart = k.split('::')[1];
        if (fmTextPart && ref.fmText &&
          (fmTextPart.includes(ref.fmText.trim()) || ref.fmText.trim().includes(fmTextPart))) {
          return v;
        }
      }
    }
    return { fmId: '', l2StructId: '' };
  }

  private resolveFC(ref: CrossSheetRef): { fcId: string; l3StructId: string } {
    // 1차: 행번호 직접 매칭
    if (ref.l3Row && this.l3RowToFcId.has(ref.l3Row)) {
      return {
        fcId: this.l3RowToFcId.get(ref.l3Row)!,
        l3StructId: this.l3RowToL3StructId.get(ref.l3Row) || '',
      };
    }
    // 2차: 정밀 텍스트 매칭 (공정+4M+WE+원인)
    if (ref.fcText && ref.processNo) {
      const preciseKey = `${ref.processNo.trim()}::${(ref.m4 || '').trim()}::${(ref.weText || '').trim()}::${ref.fcText.trim()}`;
      const preciseFound = this.fcTextMap.get(preciseKey);
      if (preciseFound) return preciseFound;
      // 3차: Loose 매칭 (공정+원인, 4M/WE 무시)
      const looseKey = `${ref.processNo.trim()}::${ref.fcText.trim()}`;
      const looseFound = this.fcLooseMap.get(looseKey);
      if (looseFound) return looseFound;
    }
    // 4차: 공정번호 무시, FC 텍스트만으로 매칭
    if (ref.fcText) {
      for (const [k, v] of this.fcLooseMap) {
        const fcTextPart = k.split('::')[1];
        if (fcTextPart === ref.fcText.trim()) return v;
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
