/**
 * @file cross-sheet-resolver.ts
 * @description FC 시트 → L1/L2/L3 크로스시트 FK 해결
 *
 * 방법 A (우선): FC 시트의 L1원본행/L2원본행/L3원본행 컬럼 직접 참조
 * 방법 B (폴백): 역참조 인덱스 (공정번호+4M+WE+텍스트 키)
 *
 * @created 2026-03-22
 */

import { positionUUID, type SheetCode } from './position-uuid';

/** FC 시트 한 행에서 추출한 크로스시트 참조 정보 */
export interface CrossSheetRef {
  /** L1 시트 원본 행번호 (FC시트 L1원본행 컬럼) */
  l1Row?: number;
  /** L2 시트 원본 행번호 (FC시트 L2원본행 컬럼) */
  l2Row?: number;
  /** L3 시트 원본 행번호 (FC시트 L3원본행 컬럼) */
  l3Row?: number;
  /** 텍스트 폴백용 */
  feText?: string;
  fmText?: string;
  fcText?: string;
  processNo?: string;
  m4?: string;
  workElement?: string;
}

/** 역참조 인덱스 엔트리 */
interface IndexEntry {
  id: string;
  row: number;
  key: string;
}

/**
 * 크로스시트 FK 해결기
 *
 * L1/L2/L3 시트 파싱 결과를 등록한 뒤,
 * FC 시트의 각 행에서 FE/FM/FC UUID를 해결
 */
export class CrossSheetResolver {
  /** row → FE UUID: L1시트 행번호 → L1-R{n}-C4 */
  private l1RowToFeId = new Map<number, string>();
  /** row → FM UUID: L2시트 행번호 → L2-R{n}-C6 */
  private l2RowToFmId = new Map<number, string>();
  /** row → FC UUID: L3시트 행번호 → L3-R{n}-C7 */
  private l3RowToFcId = new Map<number, string>();

  /** 텍스트 폴백 인덱스 */
  private feIndex: IndexEntry[] = [];
  private fmIndex: IndexEntry[] = [];
  private fcIndex: IndexEntry[] = [];

  // ─── 등록 메서드 ───

  /** L1 시트 FE 등록 */
  registerFE(row: number, feId: string, feText: string, scope: string): void {
    this.l1RowToFeId.set(row, feId);
    this.feIndex.push({ id: feId, row, key: `${scope}|${feText.substring(0, 30)}` });
  }

  /** L2 시트 FM 등록 */
  registerFM(row: number, fmId: string, fmText: string, processNo: string): void {
    this.l2RowToFmId.set(row, fmId);
    this.fmIndex.push({ id: fmId, row, key: `${processNo}|${fmText.substring(0, 30)}` });
  }

  /** L3 시트 FC 등록 */
  registerFC(row: number, fcId: string, fcText: string, processNo: string, m4: string, we: string): void {
    this.l3RowToFcId.set(row, fcId);
    this.fcIndex.push({ id: fcId, row, key: `${processNo}|${m4}|${we}|${fcText.substring(0, 30)}` });
  }

  // ─── 해결 메서드 ───

  /**
   * FC 시트 한 행의 크로스시트 FK 해결
   * @returns { feId, fmId, fcId } — 해결 실패 시 빈 문자열
   */
  resolve(ref: CrossSheetRef): { feId: string; fmId: string; fcId: string } {
    return {
      feId: this.resolveFE(ref),
      fmId: this.resolveFM(ref),
      fcId: this.resolveFC(ref),
    };
  }

  private resolveFE(ref: CrossSheetRef): string {
    // 방법 A: 원본행 직접 참조
    if (ref.l1Row && this.l1RowToFeId.has(ref.l1Row)) {
      return this.l1RowToFeId.get(ref.l1Row)!;
    }
    // 방법 B: 텍스트 폴백
    if (ref.feText) {
      const key = `${ref.processNo || ''}|${ref.feText.substring(0, 30)}`;
      const match = this.feIndex.find(e => e.key === key);
      if (match) return match.id;
    }
    return '';
  }

  private resolveFM(ref: CrossSheetRef): string {
    if (ref.l2Row && this.l2RowToFmId.has(ref.l2Row)) {
      return this.l2RowToFmId.get(ref.l2Row)!;
    }
    if (ref.fmText && ref.processNo) {
      const key = `${ref.processNo}|${ref.fmText.substring(0, 30)}`;
      const match = this.fmIndex.find(e => e.key === key);
      if (match) return match.id;
    }
    return '';
  }

  private resolveFC(ref: CrossSheetRef): string {
    if (ref.l3Row && this.l3RowToFcId.has(ref.l3Row)) {
      return this.l3RowToFcId.get(ref.l3Row)!;
    }
    if (ref.fcText && ref.processNo) {
      const key = `${ref.processNo}|${ref.m4 || ''}|${ref.workElement || ''}|${ref.fcText.substring(0, 30)}`;
      const match = this.fcIndex.find(e => e.key === key);
      if (match) return match.id;
    }
    return '';
  }

  // ─── 통계 ───

  get stats(): { feCount: number; fmCount: number; fcCount: number } {
    return {
      feCount: this.l1RowToFeId.size,
      fmCount: this.l2RowToFmId.size,
      fcCount: this.l3RowToFcId.size,
    };
  }
}
