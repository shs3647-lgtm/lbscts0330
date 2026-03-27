/**
 * @file cross-sheet-resolver.ts
 * @description FC 시트 → L1/L2/L3 크로스시트 FK 해결
 *
 * ■ v5.1 리팩토링: 텍스트 정규화 매칭
 *   - 공백 정규화 (연속공백→단일, 괄호앞뒤 공백 제거)
 *   - 1차: 행번호 직접 매칭
 *   - 2차: 정규화 텍스트 매칭 → UUID FK 직접 생성
 *
 * @created 2026-03-22
 */

/**
 * ★v5.1: 텍스트 정규화 — 공백 차이로 인한 매칭 실패 방지
 * "혼입(ID" vs "혼입 (ID" → 둘 다 "혼입(ID"로 정규화
 */
function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')         // 연속 공백 → 단일
    .replace(/\s*\(\s*/g, '(')    // 괄호 앞뒤 공백 제거: " ( " → "("
    .replace(/\s*\)\s*/g, ')')    // "혼입 (ID" → "혼입(ID"
    .replace(/\s*\/\s*/g, '/')    // 슬래시 앞뒤 공백 제거
    .replace(/\s*·\s*/g, '·');    // 중점 앞뒤 공백
}

/** FC 시트 한 행에서 추출한 크로스시트 참조 */
export interface CrossSheetRef {
  l1Row?: number;
  l2Row?: number;
  l3Row?: number;
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
 */
export class CrossSheetResolver {
  private l1RowToFeId = new Map<number, string>();
  private l2RowToFmId = new Map<number, string>();
  private l3RowToFcId = new Map<number, string>();

  private l2RowToL2StructId = new Map<number, string>();
  private l3RowToL3StructId = new Map<number, string>();

  // ★v5.1: 정규화 텍스트 → {id, l2/l3StructId} 맵
  private feTextMap = new Map<string, { feId: string }>();
  private fmTextMap = new Map<string, { fmId: string; l2StructId: string }>();
  private fcTextMap = new Map<string, { fcId: string; l3StructId: string }>();
  private fcLooseMap = new Map<string, { fcId: string; l3StructId: string }>();

  registerFE(row: number, feId: string, feText?: string, scope?: string): void {
    this.l1RowToFeId.set(row, feId);
    if (feText) {
      const key = `${normalizeText(scope || '')}::${normalizeText(feText)}`;
      if (!this.feTextMap.has(key)) {
        this.feTextMap.set(key, { feId });
      }
    }
  }

  registerFM(row: number, fmId: string, fmText?: string, processNo?: string, l2StructId?: string): void {
    this.l2RowToFmId.set(row, fmId);
    if (l2StructId) this.l2RowToL2StructId.set(row, l2StructId);
    if (fmText && processNo) {
      const key = `${processNo.trim()}::${normalizeText(fmText)}`;
      if (!this.fmTextMap.has(key)) {
        this.fmTextMap.set(key, { fmId, l2StructId: l2StructId || '' });
      }
    }
  }

  registerFC(
    row: number, fcId: string, fcText?: string, processNo?: string,
    m4?: string, we?: string, l3StructId?: string,
  ): void {
    this.l3RowToFcId.set(row, fcId);
    if (l3StructId) this.l3RowToL3StructId.set(row, l3StructId);
    if (fcText && processNo) {
      const preciseKey = `${processNo.trim()}::${normalizeText(m4 || '')}::${normalizeText(we || '')}::${normalizeText(fcText)}`;
      if (!this.fcTextMap.has(preciseKey)) {
        this.fcTextMap.set(preciseKey, { fcId, l3StructId: l3StructId || '' });
      }
      const looseKey = `${processNo.trim()}::${normalizeText(fcText)}`;
      if (!this.fcLooseMap.has(looseKey)) {
        this.fcLooseMap.set(looseKey, { fcId, l3StructId: l3StructId || '' });
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
    if (ref.l1Row && this.l1RowToFeId.has(ref.l1Row)) {
      return this.l1RowToFeId.get(ref.l1Row)!;
    }
    if (ref.feText) {
      const key = `${normalizeText(ref.feScope || '')}::${normalizeText(ref.feText)}`;
      const found = this.feTextMap.get(key);
      if (found) return found.feId;
      // scope 무시 매칭
      const normFE = normalizeText(ref.feText);
      for (const [k, v] of this.feTextMap) {
        const feTextPart = k.split('::')[1];
        if (feTextPart === normFE) return v.feId;
      }
      // 부분 포함 매칭
      for (const [k, v] of this.feTextMap) {
        const feTextPart = k.split('::')[1];
        if (feTextPart && (feTextPart.includes(normFE) || normFE.includes(feTextPart))) {
          return v.feId;
        }
      }
    }
    return '';
  }

  private resolveFM(ref: CrossSheetRef): { fmId: string; l2StructId: string } {
    if (ref.l2Row && this.l2RowToFmId.has(ref.l2Row)) {
      return { fmId: this.l2RowToFmId.get(ref.l2Row)!, l2StructId: this.l2RowToL2StructId.get(ref.l2Row) || '' };
    }
    if (ref.fmText) {
      const normFM = normalizeText(ref.fmText);
      // 정확 매칭 (공정+FM)
      if (ref.processNo) {
        const key = `${ref.processNo.trim()}::${normFM}`;
        const found = this.fmTextMap.get(key);
        if (found) return found;
      }
      // 공정번호 무시 매칭
      for (const [k, v] of this.fmTextMap) {
        if (k.split('::')[1] === normFM) return v;
      }
      // 부분 포함 매칭
      for (const [k, v] of this.fmTextMap) {
        const fmTextPart = k.split('::')[1];
        if (fmTextPart && (fmTextPart.includes(normFM) || normFM.includes(fmTextPart))) {
          return v;
        }
      }
    }
    return { fmId: '', l2StructId: '' };
  }

  private resolveFC(ref: CrossSheetRef): { fcId: string; l3StructId: string } {
    if (ref.l3Row && this.l3RowToFcId.has(ref.l3Row)) {
      return { fcId: this.l3RowToFcId.get(ref.l3Row)!, l3StructId: this.l3RowToL3StructId.get(ref.l3Row) || '' };
    }
    if (ref.fcText && ref.processNo) {
      const normFC = normalizeText(ref.fcText);
      // 정밀 매칭
      const preciseKey = `${ref.processNo.trim()}::${normalizeText(ref.m4 || '')}::${normalizeText(ref.weText || '')}::${normFC}`;
      const preciseFound = this.fcTextMap.get(preciseKey);
      if (preciseFound) return preciseFound;
      // Loose 매칭
      const looseKey = `${ref.processNo.trim()}::${normFC}`;
      const looseFound = this.fcLooseMap.get(looseKey);
      if (looseFound) return looseFound;
    }
    // 텍스트만으로 매칭
    if (ref.fcText) {
      const normFC = normalizeText(ref.fcText);
      for (const [k, v] of this.fcLooseMap) {
        if (k.split('::')[1] === normFC) return v;
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
