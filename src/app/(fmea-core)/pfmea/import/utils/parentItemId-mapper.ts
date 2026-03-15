/**
 * @file parentItemId-mapper.ts
 * @description excelRow+rowSpan 기반 inferParent + FC chain 기반 부모-자식 매핑
 *
 * 비유: 엑셀 병합셀은 "우산"과 같다. A3가 3행을 병합하면 그 우산 아래 3행에
 * 위치한 A4 항목들이 모두 그 A3의 자식이다. 우산 범위 = excelRow ~ excelRow+rowSpan-1.
 */

// ── 타입 ──

interface ParentItem {
  id: string;
  excelRow?: number;
  rowSpan?: number;
  processNo?: string;
}

interface ChildItem {
  id: string;
  excelRow?: number;
  processNo?: string;
}

interface ChainRow {
  processNo: string;
  l2Function?: string;
  productChar?: string;
  failureMode?: string;
  failureCause?: string;
  pcValue?: string;
  dcValue?: string;
  [key: string]: unknown;
}

interface ParentMaps {
  a4ToA3: Map<string, string>;  // `pNo|a4Value` → `pNo|a3Value`
  a5ToA4: Map<string, string>;  // `pNo|a5Value` → `pNo|a4Value`
  a6ToA5: Map<string, string>;  // `pNo|a6Value` → `pNo|a5Value`
  b5ToB4: Map<string, string>;  // `pNo|b5Value` → `pNo|b4Value`
}

// ── inferParent: 단일 자식의 부모 찾기 ──

/**
 * 자식의 excelRow가 부모의 [excelRow, excelRow+rowSpan) 범위에 들어가면 해당 부모 id 반환.
 * @param childRow 자식의 excelRow
 * @param parents 부모 목록 (excelRow + rowSpan)
 * @returns 매칭된 부모 id, 없으면 undefined
 */
export function inferParent(
  childRow: number,
  parents: Array<{ id: string; excelRow: number; rowSpan?: number }>,
): string | undefined {
  for (const p of parents) {
    const span = p.rowSpan ?? 1;
    if (childRow >= p.excelRow && childRow < p.excelRow + span) {
      return p.id;
    }
  }
  return undefined;
}

// ── assignParentsByRowSpan: 공정별 그룹핑 + rowSpan 기반 매핑 ──

/**
 * 같은 processNo 내에서 excelRow+rowSpan 기반으로 부모-자식 매핑.
 * @returns Map<childId, parentId>
 */
export function assignParentsByRowSpan(
  parents: ParentItem[],
  children: ChildItem[],
): Map<string, string> {
  const result = new Map<string, string>();

  // 공정별 부모 그룹핑
  const parentsByProc = new Map<string, Array<{ id: string; excelRow: number; rowSpan: number }>>();
  for (const p of parents) {
    if (p.excelRow == null || p.processNo == null) continue;
    const pNo = p.processNo;
    if (!parentsByProc.has(pNo)) parentsByProc.set(pNo, []);
    parentsByProc.get(pNo)!.push({
      id: p.id,
      excelRow: p.excelRow,
      rowSpan: p.rowSpan ?? 1,
    });
  }

  // 자식별 inferParent 실행
  for (const c of children) {
    if (c.excelRow == null || c.processNo == null) continue;
    const procParents = parentsByProc.get(c.processNo);
    if (!procParents) continue;

    const parentId = inferParent(c.excelRow, procParents);
    if (parentId) {
      result.set(c.id, parentId);
    }
  }

  return result;
}

// ── buildParentMapFromChains: FC chain 기반 텍스트 매핑 ──

/**
 * FC chain 데이터에서 부모-자식 텍스트 관계를 추출.
 * 키: `processNo|childValue`, 값: `processNo|parentValue`
 * 첫 번째 매핑만 유지 (중복 시 덮어쓰지 않음).
 */
export function buildParentMapFromChains(chains: ChainRow[]): ParentMaps {
  const a4ToA3 = new Map<string, string>();
  const a5ToA4 = new Map<string, string>();
  const a6ToA5 = new Map<string, string>();
  const b5ToB4 = new Map<string, string>();

  for (const ch of chains) {
    const pNo = ch.processNo;
    if (!pNo) continue;

    // A4 → A3: productChar → l2Function
    if (ch.productChar?.trim() && ch.l2Function?.trim()) {
      const key = `${pNo}|${ch.productChar.trim()}`;
      if (!a4ToA3.has(key)) {
        a4ToA3.set(key, `${pNo}|${ch.l2Function.trim()}`);
      }
    }

    // A5 → A4: failureMode → productChar
    if (ch.failureMode?.trim() && ch.productChar?.trim()) {
      const key = `${pNo}|${ch.failureMode.trim()}`;
      if (!a5ToA4.has(key)) {
        a5ToA4.set(key, `${pNo}|${ch.productChar.trim()}`);
      }
    }

    // A6 → A5: dcValue → failureMode
    if (ch.dcValue?.trim() && ch.failureMode?.trim()) {
      const key = `${pNo}|${ch.dcValue.trim()}`;
      if (!a6ToA5.has(key)) {
        a6ToA5.set(key, `${pNo}|${ch.failureMode.trim()}`);
      }
    }

    // B5 → B4: pcValue → failureCause
    if (ch.pcValue?.trim() && ch.failureCause?.trim()) {
      const key = `${pNo}|${ch.pcValue.trim()}`;
      if (!b5ToB4.has(key)) {
        b5ToB4.set(key, `${pNo}|${ch.failureCause.trim()}`);
      }
    }
  }

  return { a4ToA3, a5ToA4, a6ToA5, b5ToB4 };
}
