/**
 * @status CODEFREEZE L5 (Composite Key Protection)
 * @freeze_level L5 (Critical - parentId N-1 복합키 전수조사 완료)
 * @frozen_date 2026-04-03
 * @snapshot_tag codefreeze-v5.1-composite-key-20260403
 * @allowed_changes NONE 사용자 명시적 승인 + full test pass 필수
 * @manifest CODEFREEZE_PIPELINE_MANIFEST.md
 *
 * ★★★ 복합키 정책 (2026-04-03 확정, 영구 CODEFREEZE) ★★★
 * 원칙: 동일 텍스트 + 상위(parentId N-1) 다름 = 별개 엔티티 → 중복제외 금지
 * - feTextMap/fmTextMap/fcTextMap/fcLooseMap: 모두 Array 기반
 * - 같은 키라도 ID가 다르면 ALL 등록 (first-only 금지)
 * - Resolution: Level 1(행번호) 우선, 텍스트 폴백 시 배열[0]
 */
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

  /**
   * ★★★ FE 복합키 정책 (2026-04-03) ★★★
   * key = scope::feText
   * value = Array — 같은 scope+feText라도 feId가 다르면 ALL 등록
   * 공정번호가 다르면 scope가 달라 키 자동 구분.
   */
  private feTextMap = new Map<string, Array<{ feId: string }>>();
  /**
   * ★★★ FM 복합키 정책 (2026-04-03) ★★★
   * key = processNo::fmText
   * value = Array — 같은 processNo+fmText라도 fmId가 다르면 ALL 등록
   *
   * 근거: 같은 L2 내에 P06-02(압출 SIDE)와 P06-03(REWORK)처럼
   * 공정번호가 다른 동일 FM 텍스트가 존재할 수 있다.
   * 복합키(processNo+fmText)가 같아도 fmId가 다르면 별도 엔티티 → 제거 금지.
   * 공정번호가 다르면 키 자체가 달라 자동 구분된다.
   */
  private fmTextMap = new Map<string, Array<{ fmId: string; l2StructId: string }>>();
  /**
   * ★★★ FC 복합키 정책 (2026-04-03) ★★★
   * fcTextMap key = pno::m4::we::fcText (정밀), fcLooseMap key = pno::fcText (느슨)
   * value = Array — 같은 키라도 fcId가 다르면(= parentId N-1이 다름) ALL 등록
   * 상위가 다르면 중복제외 금지.
   */
  private fcTextMap = new Map<string, Array<{ fcId: string; l3StructId: string }>>();
  private fcLooseMap = new Map<string, Array<{ fcId: string; l3StructId: string }>>();

  /**
   * ★★★ 복합키 정책: 같은 scope+feText라도 feId가 다르면 모두 등록 ★★★
   */
  registerFE(row: number, feId: string, feText?: string, scope?: string): void {
    this.l1RowToFeId.set(row, feId);
    if (feText) {
      const key = `${normalizeText(scope || '')}::${normalizeText(feText)}`;
      if (!this.feTextMap.has(key)) this.feTextMap.set(key, []);
      const arr = this.feTextMap.get(key)!;
      if (!arr.some(e => e.feId === feId)) {
        arr.push({ feId });
      }
    }
  }

  /**
   * ★★★ 복합키 정책: 같은 processNo+fmText라도 fmId가 다르면 모두 등록 ★★★
   * 공정번호가 다르면 키 자체가 달라 자동 구분.
   * 같은 공정 내 동일 텍스트 FM → 행 번호 Level 1 매칭이 우선이므로 모두 등록해야 누락 없음.
   */
  registerFM(row: number, fmId: string, fmText?: string, processNo?: string, l2StructId?: string): void {
    this.l2RowToFmId.set(row, fmId);
    if (l2StructId) this.l2RowToL2StructId.set(row, l2StructId);
    if (fmText && processNo) {
      const key = `${processNo.trim()}::${normalizeText(fmText)}`;
      if (!this.fmTextMap.has(key)) this.fmTextMap.set(key, []);
      const arr = this.fmTextMap.get(key)!;
      if (!arr.some(e => e.fmId === fmId)) {
        arr.push({ fmId, l2StructId: l2StructId || '' });
      }
    }
  }

  /**
   * ★★★ 복합키 정책: 같은 키라도 fcId가 다르면 모두 등록 (parentId N-1 원칙) ★★★
   */
  registerFC(
    row: number, fcId: string, fcText?: string, processNo?: string,
    m4?: string, we?: string, l3StructId?: string,
  ): void {
    this.l3RowToFcId.set(row, fcId);
    if (l3StructId) this.l3RowToL3StructId.set(row, l3StructId);
    if (fcText && processNo) {
      const preciseKey = `${processNo.trim()}::${normalizeText(m4 || '')}::${normalizeText(we || '')}::${normalizeText(fcText)}`;
      if (!this.fcTextMap.has(preciseKey)) this.fcTextMap.set(preciseKey, []);
      const preciseArr = this.fcTextMap.get(preciseKey)!;
      if (!preciseArr.some(e => e.fcId === fcId)) {
        preciseArr.push({ fcId, l3StructId: l3StructId || '' });
      }

      const looseKey = `${processNo.trim()}::${normalizeText(fcText)}`;
      if (!this.fcLooseMap.has(looseKey)) this.fcLooseMap.set(looseKey, []);
      const looseArr = this.fcLooseMap.get(looseKey)!;
      if (!looseArr.some(e => e.fcId === fcId)) {
        looseArr.push({ fcId, l3StructId: l3StructId || '' });
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

  /**
   * ★★★ 복합키 정책: 배열에서 첫 번째 매칭 반환, Level 1(행번호) 우선 ★★★
   */
  private resolveFE(ref: CrossSheetRef): string {
    // Level 1: 행번호 직접 매칭
    if (ref.l1Row && this.l1RowToFeId.has(ref.l1Row)) {
      return this.l1RowToFeId.get(ref.l1Row)!;
    }
    if (ref.feText) {
      const normFE = normalizeText(ref.feText);
      // Level 2: scope + FE 텍스트 정확 매칭
      const key = `${normalizeText(ref.feScope || '')}::${normFE}`;
      const found = this.feTextMap.get(key);
      if (found && found.length > 0) return found[0].feId;
      // Level 3: scope 무시, FE 텍스트 정확 매칭 (FE는 공정 구분 없으므로 허용)
      for (const [k, v] of this.feTextMap) {
        if (k.split('::')[1] === normFE && v.length > 0) return v[0].feId;
      }
    }
    return '';
  }

  /**
   * ★★★ 복합키 정책: fmTextMap이 배열이므로 첫 번째 매칭 반환 ★★★
   * Level 1 (행번호) 우선 → Level 2 (processNo::fmText) 배열[0]
   * 같은 processNo+fmText에 여러 FM이 있으면 행번호(Level 1)로 정확히 구분해야 한다.
   */
  private resolveFM(ref: CrossSheetRef): { fmId: string; l2StructId: string } {
    // Level 1: 행번호 직접 매칭 (가장 정확)
    if (ref.l2Row && this.l2RowToFmId.has(ref.l2Row)) {
      return { fmId: this.l2RowToFmId.get(ref.l2Row)!, l2StructId: this.l2RowToL2StructId.get(ref.l2Row) || '' };
    }
    if (ref.fmText) {
      const normFM = normalizeText(ref.fmText);
      if (ref.processNo) {
        const pno = ref.processNo.trim();
        // Level 2a: 정확 매칭 (공정번호 원본 + FM)
        const key = `${pno}::${normFM}`;
        const found = this.fmTextMap.get(key);
        if (found && found.length > 0) return found[0];

        // Level 2b: 공정번호 정규화 재시도 (선행0 제거: "035"→"35")
        const normPno = String(parseInt(pno, 10));
        if (normPno !== pno && !isNaN(parseInt(pno, 10))) {
          const normKey = `${normPno}::${normFM}`;
          const normFound = this.fmTextMap.get(normKey);
          if (normFound && normFound.length > 0) return normFound[0];
        }
        // Level 2c: 등록된 키에서 정규화된 공정번호가 일치하는 것 탐색
        for (const [k, v] of this.fmTextMap) {
          const [regPno, regFM] = k.split('::');
          if (regFM === normFM && String(parseInt(regPno, 10)) === normPno && v.length > 0) {
            return v[0];
          }
        }
      }
      // ★★★ MBD-26-009: cross-process fallback 제거
      // 다른 공정의 FM UUID를 반환하면 FL의 FM·FC가 서로 다른 공정 → crossProcessFk 스킵 → FC 누락
      // 대신 registerFMIfNew()로 해당 공정에 새 FM을 생성해야 함
    }
    return { fmId: '', l2StructId: '' };
  }

  /**
   * ★ MBD-26-009: FC 시트 파싱 중 (processNo+FM) 복합키로 FM 미발견 시 새 FM 등록
   * L2 시트에 없는 (processNo+FM) 조합이 FC 시트에 있으면 자동 생성
   */
  /**
   * ★ 복합키 정책: 같은 키라도 fmId가 다르면 신규 등록 (제거 금지)
   */
  registerFMIfNew(processNo: string, fmText: string, fmId: string, l2StructId: string): boolean {
    const pno = processNo.trim();
    const normFM = normalizeText(fmText);
    const key = `${pno}::${normFM}`;
    if (!this.fmTextMap.has(key)) this.fmTextMap.set(key, []);
    const arr = this.fmTextMap.get(key)!;
    if (arr.some(e => e.fmId === fmId)) return false;
    arr.push({ fmId, l2StructId });
    return true;
  }

  /**
   * ★★★ 복합키 정책: 배열에서 첫 번째 매칭 반환, Level 1(행번호) 우선 ★★★
   */
  private resolveFC(ref: CrossSheetRef): { fcId: string; l3StructId: string } {
    // Level 1: 행번호 직접 매칭
    if (ref.l3Row && this.l3RowToFcId.has(ref.l3Row)) {
      return { fcId: this.l3RowToFcId.get(ref.l3Row)!, l3StructId: this.l3RowToL3StructId.get(ref.l3Row) || '' };
    }
    if (ref.fcText && ref.processNo) {
      const pno = ref.processNo.trim();
      const normFC = normalizeText(ref.fcText);
      // Level 2: 정밀 매칭 (공정+m4+WE+FC)
      const preciseKey = `${pno}::${normalizeText(ref.m4 || '')}::${normalizeText(ref.weText || '')}::${normFC}`;
      const preciseFound = this.fcTextMap.get(preciseKey);
      if (preciseFound && preciseFound.length > 0) return preciseFound[0];
      // Level 3: Loose 매칭 (공정+FC)
      const looseKey = `${pno}::${normFC}`;
      const looseFound = this.fcLooseMap.get(looseKey);
      if (looseFound && looseFound.length > 0) return looseFound[0];

      // Level 3b: 공정번호 정규화 재시도 (선행0 제거)
      const normPno = String(parseInt(pno, 10));
      if (normPno !== pno && !isNaN(parseInt(pno, 10))) {
        for (const [k, v] of this.fcLooseMap) {
          const [regPno, regFC] = k.split('::');
          if (regFC === normFC && String(parseInt(regPno, 10)) === normPno && v.length > 0) {
            return v[0];
          }
        }
      }

      // ★v5.1: processNo 있으면 해당 공정만 매칭 — 크로스프로세스 fallback 금지 (Rule 1.7)
      return { fcId: '', l3StructId: '' };
    }
    // 공정번호 없을 때만 텍스트 매칭 허용
    if (ref.fcText) {
      const normFC = normalizeText(ref.fcText);
      for (const [k, v] of this.fcLooseMap) {
        if (k.split('::')[1] === normFC && v.length > 0) return v[0];
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
