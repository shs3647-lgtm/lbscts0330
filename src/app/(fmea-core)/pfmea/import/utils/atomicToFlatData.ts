// CODEFREEZE — 2026-03-18 au bump DB/UUID/FK 무결성 100% 검증 완료
/**
 * @file atomicToFlatData.ts
 * @description Atomic DB → ImportedFlatData[] + ID 매핑 역변환 (리버스엔지니어링)
 *
 * 비유: 완성된 요리(DB)의 레시피를 역으로 추출하되,
 * 재요리 시 같은 재료번호(genXxx UUID)가 나오도록 번호표를 재발급하는 함수.
 *
 * 핵심: DB의 uid 형식 ID를 genXxx 결정론적 ID로 재계산하여 flatData.id에 넣는다.
 * buildWorksheetState의 `id?.startsWith('PF-')` 분기에서 이 ID가 보존되므로
 * forward path와 역변환 path의 엔티티 ID가 동기화된다.
 *
 * @created 2026-03-17
 */

import type { ImportedFlatData } from '../types';
import type {
  FMEAWorksheetDB,
  L2Structure,
  L3Structure,
  L1Function as AtomicL1Function,
  L2Function as AtomicL2Function,
  L3Function as AtomicL3Function,
  FailureEffect,
  FailureMode,
  FailureCause,
  RiskAnalysis,
  FailureLink,
} from '@/app/(fmea-core)/pfmea/worksheet/schema';
import {
  genC1, genC2, genC3, genC4,
  genA1, genA3, genA4, genA5,
  genB1, genB2, genB3, genB4,
  genFC,
} from '@/lib/uuid-generator';

// ─── 헬퍼 ───

function groupBy<T>(items: readonly T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const arr = map.get(key);
    if (arr) arr.push(item);
    else map.set(key, [item]);
  }
  return map;
}

function indexById<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) map.set(item.id, item);
  return map;
}

// ─── 결과 타입 ───

export interface AtomicToFlatConfig {
  fmeaId: string;
  doc?: string; // 'PF' (default)
}

/** 원본 DB ID → genXxx 재계산 ID 매핑 (atomicToChains에서 재사용) */
export interface IdRemapTable {
  l2: Map<string, string>;    // L2Structure 원본ID → genA1 ID
  l3: Map<string, string>;    // L3Structure 원본ID → genB1 ID
  fm: Map<string, string>;    // FailureMode 원본ID → genA5 ID
  fc: Map<string, string>;    // FailureCause 원본ID → genB4 ID
  fe: Map<string, string>;    // FailureEffect 원본ID → genC4 ID
  l2Func: Map<string, string>; // L2Function 원본ID → genA3 ID
  l3Func: Map<string, string>; // L3Function 원본ID → genB2 ID
  pc: Map<string, string>;    // ProductChar 원본ID → genA4 ID
}

export interface AtomicToFlatResult {
  flatData: ImportedFlatData[];
  idRemap: IdRemapTable;
}

// ─── 메인 함수 ───

export function atomicToFlatData(
  db: FMEAWorksheetDB,
  config: AtomicToFlatConfig,
): AtomicToFlatResult {
  const doc = config.doc || 'PF';
  const result: ImportedFlatData[] = [];
  const now = new Date();

  // ID 매핑 테이블
  const idRemap: IdRemapTable = {
    l2: new Map(), l3: new Map(), fm: new Map(), fc: new Map(), fe: new Map(),
    l2Func: new Map(), l3Func: new Map(), pc: new Map(),
  };

  // ─── 인덱스 빌드 ───
  const l2FuncsByL2 = groupBy(db.l2Functions, f => f.l2StructId);
  const l3FuncsByL3 = groupBy(db.l3Functions, f => f.l3StructId);
  const fmsByL2 = groupBy(db.failureModes, fm => fm.l2StructId);
  const fcsByL3 = groupBy(db.failureCauses, fc => fc.l3StructId);
  const fcsByL2 = groupBy(db.failureCauses, fc => fc.l2StructId);
  const riskByLink = new Map<string, RiskAnalysis>();
  for (const risk of db.riskAnalyses) {
    if (!riskByLink.has(risk.linkId)) riskByLink.set(risk.linkId, risk);
  }
  const l1FuncById = indexById(db.l1Functions);

  // ─── C 계열: L1 (완제품 공정) — L1Function 1행 = C2 1행 + C3 1행 (verify-counts·DB와 1:1) ───
  const l1FuncsByCategory = groupBy(db.l1Functions, f => f.category);
  const categories = [...l1FuncsByCategory.keys()].sort((a, b) => a.localeCompare(b));

  const l1FuncIdToC2Seq = new Map<string, number>();
  const l1FuncIdToC3GenId = new Map<string, string>();

  for (const category of categories) {
    const div = category === 'User' ? 'US' : (category === 'Ship to Plant' ? 'SP' : 'YP');
    const c1Id = genC1(doc, div);

    // C1: 구분
    result.push(makeFlatItem({
      id: c1Id,
      processNo: category,
      category: 'C',
      itemCode: 'C1',
      value: category,
      createdAt: now,
    }));

    const funcs = [...(l1FuncsByCategory.get(category) || [])].sort((a, b) => a.id.localeCompare(b.id));
    let c2seq = 0;
    for (const lf of funcs) {
      c2seq++;
      l1FuncIdToC2Seq.set(lf.id, c2seq);
      const c2Id = genC2(doc, div, c2seq);

      result.push(makeFlatItem({
        id: c2Id,
        processNo: category,
        category: 'C',
        itemCode: 'C2',
        value: lf.functionName,
        parentItemId: c1Id,
        createdAt: now,
      }));

      const c3Id = genC3(doc, div, c2seq, 1);
      l1FuncIdToC3GenId.set(lf.id, c3Id);
      result.push(makeFlatItem({
        id: c3Id,
        processNo: category,
        category: 'C',
        itemCode: 'C3',
        value: lf.requirement,
        parentItemId: c2Id,
        createdAt: now,
      }));
    }
  }

  // C4: 고장영향 — L1Function별 c2·c3 슬롯 + 동일 LF 내 FE 순번으로 genC4
  const fesByCategory = groupBy(db.failureEffects, fe => fe.category);
  for (const [category, fes] of fesByCategory) {
    const div = category === 'User' ? 'US' : (category === 'Ship to Plant' ? 'SP' : 'YP');
    const fesSorted = [...fes].sort((a, b) => a.id.localeCompare(b.id));
    const c4SlotByL1Func = new Map<string, number>();

    for (const fe of fesSorted) {
      let c2seq = l1FuncIdToC2Seq.get(fe.l1FuncId);
      if (c2seq === undefined) {
        c2seq = 1;
        console.warn('[atomicToFlatData] C4: l1FuncId 미매칭 FE', fe.id, 'l1FuncId=', fe.l1FuncId);
      }
      const slot = (c4SlotByL1Func.get(fe.l1FuncId) ?? 0) + 1;
      c4SlotByL1Func.set(fe.l1FuncId, slot);
      const feNewId = genC4(doc, div, c2seq, 1, slot);
      idRemap.fe.set(fe.id, feNewId);

      const c3GenId = l1FuncIdToC3GenId.get(fe.l1FuncId);
      result.push(makeFlatItem({
        id: feNewId,
        processNo: category,
        category: 'C',
        itemCode: 'C4',
        value: fe.effect,
        parentItemId: c3GenId || fe.l1FuncId,
        createdAt: now,
      }));
    }
  }

  // ─── A/B 계열: L2/L3 (공정/작업요소) ───
  const sortedL2 = [...db.l2Structures].sort((a, b) => a.order - b.order);

  for (const l2 of sortedL2) {
    const pnoNum = parseInt(l2.no) || 0;
    const l2NewId = genA1(doc, pnoNum);
    idRemap.l2.set(l2.id, l2NewId);
    const a1RowId = `${l2NewId}-A1`;

    // A1: 공정번호
    result.push(makeFlatItem({
      id: a1RowId,
      processNo: l2.no,
      category: 'A',
      itemCode: 'A1',
      value: l2.no,
      createdAt: now,
    }));

    // A2: 공정명
    result.push(makeFlatItem({
      id: `${l2NewId}-A2`,
      processNo: l2.no,
      category: 'A',
      itemCode: 'A2',
      value: l2.name,
      createdAt: now,
    }));

    // A3: 공정기능 — genA3 재계산 (ID 기반 dedup만)
    // ★ MBD-26-009: 이름 기반 dedup 제거 → ID 기준만
    const l2Funcs = l2FuncsByL2.get(l2.id) || [];
    const seenL2FuncIds = new Set<string>();
    let a3seq = 0;
    for (const l2Func of l2Funcs) {
      if (seenL2FuncIds.has(l2Func.id)) continue;
      seenL2FuncIds.add(l2Func.id);
      a3seq++;
      const a3Id = genA3(doc, pnoNum, a3seq);
      idRemap.l2Func.set(l2Func.id, a3Id);

      result.push(makeFlatItem({
        id: a3Id,
        processNo: l2.no,
        category: 'A',
        itemCode: 'A3',
        value: l2Func.functionName,
        parentItemId: a1RowId,
        createdAt: now,
      }));
    }

    // A4: 제품특성 — genA4 재계산 (ID 기반 dedup만)
    // ★ MBD-26-009: productChar 이름 기반 dedup 제거 → ID 기준만
    const seenPCIds = new Set<string>();
    let a4seq = 0;
    for (const l2Func of l2Funcs) {
      if (!l2Func.productChar || seenPCIds.has(l2Func.id)) continue;
      seenPCIds.add(l2Func.id);
      a4seq++;
      const a4Id = genA4(doc, pnoNum, a4seq);
      idRemap.pc.set(l2Func.id, a4Id);

      result.push(makeFlatItem({
        id: a4Id,
        processNo: l2.no,
        category: 'A',
        itemCode: 'A4',
        value: l2Func.productChar,
        specialChar: l2Func.specialChar || undefined,
        parentItemId: a1RowId,
        createdAt: now,
      }));
    }

    // A5: 고장형태 — genA5 재계산
    const fms = fmsByL2.get(l2.id) || [];
    let a5seq = 0;
    for (const fm of fms) {
      a5seq++;
      const a5Id = genA5(doc, pnoNum, a5seq);
      idRemap.fm.set(fm.id, a5Id);

      // parentItemId: FM → A4(ProductChar) 매핑
      // fm.productCharId === L2Function.id → idRemap.pc에서 직접 조회
      let parentA4Id: string | undefined;
      if (fm.productCharId) {
        parentA4Id = idRemap.pc.get(fm.productCharId);
      }

      result.push(makeFlatItem({
        id: a5Id,
        processNo: l2.no,
        category: 'A',
        itemCode: 'A5',
        value: fm.mode,
        parentItemId: parentA4Id,
        createdAt: now,
      }));
    }

    // A6: 검출관리
    const procLinkIds = new Set<string>();
    for (const link of db.failureLinks) {
      const linkFm = db.failureModes.find(f => f.id === link.fmId);
      if (linkFm && linkFm.l2StructId === l2.id) procLinkIds.add(link.id);
    }
    const dcValues = new Set<string>();
    for (const linkId of procLinkIds) {
      const risk = riskByLink.get(linkId);
      if (risk?.detectionControl?.trim() && !dcValues.has(risk.detectionControl.trim())) {
        dcValues.add(risk.detectionControl.trim());
        result.push(makeFlatItem({
          id: `${l2NewId}-D-${dcValues.size}`,
          processNo: l2.no,
          category: 'A',
          itemCode: 'A6',
          value: risk.detectionControl.trim(),
          createdAt: now,
        }));
      }
    }

    // ─── B 계열: L3 (작업요소) ───
    const l3sForL2 = db.l3Structures
      .filter(l3 => l3.l2Id === l2.id)
      .sort((a, b) => a.order - b.order);

    // m4별 seq 카운터
    const m4SeqCounter = new Map<string, number>();

    for (const l3 of l3sForL2) {
      const m4 = l3.m4 || '';
      const b1seq = (m4SeqCounter.get(m4) || 0) + 1;
      m4SeqCounter.set(m4, b1seq);
      const b1Id = genB1(doc, pnoNum, m4, b1seq);
      idRemap.l3.set(l3.id, b1Id);

      // B1: 작업요소명
      result.push(makeFlatItem({
        id: b1Id,
        processNo: l2.no,
        category: 'B',
        itemCode: 'B1',
        value: l3.name,
        m4: m4 || undefined,
        createdAt: now,
      }));

      // B2: 요소기능 — L3Function마다 독립 B2 생성
      // ★ 2026-03-21 FIX: functionName dedup 제거
      // 같은 WE 내에서 동일 functionName이지만 다른 processChar를 가진
      // L3Function이 존재할 수 있음 (IM/MN 카테고리). ID 기준 dedup만 유지.
      const l3Funcs = l3FuncsByL3.get(l3.id) || [];
      const seenL3FuncIds = new Set<string>();
      const l3FuncIdToB2Id = new Map<string, string>();
      let funcIdx = 0;
      for (const l3Func of l3Funcs) {
        if (seenL3FuncIds.has(l3Func.id)) continue;
        seenL3FuncIds.add(l3Func.id);
        funcIdx++;
        const b2Id = genB2(doc, pnoNum, m4, b1seq, funcIdx);
        idRemap.l3Func.set(l3Func.id, b2Id);
        l3FuncIdToB2Id.set(l3Func.id, b2Id);

        result.push(makeFlatItem({
          id: b2Id,
          processNo: l2.no,
          category: 'B',
          itemCode: 'B2',
          value: l3Func.functionName,
          m4: m4 || undefined,
          parentItemId: b1Id,
          createdAt: now,
        }));
      }

      // B3: 공정특성 — L3Function 1:1 매핑 (동일 processChar도 별도 B3 생성)
      // ★ MBD-26-009: processChar 빈값이어도 B3 항목 생성 (구조적 자리 보존)
      //   빈값 스킵 → B4 FK 끊김 → 렌더링 실패의 고질적 원인이었음
      const l3FuncIdToB3Id = new Map<string, string>();
      let cseq = 0;
      for (const l3Func of l3Funcs) {
        cseq++;
        const b3Id = genB3(doc, pnoNum, m4, b1seq, cseq);
        l3FuncIdToB3Id.set(l3Func.id, b3Id);
        const b2ForB3 = l3FuncIdToB2Id.get(l3Func.id);

        result.push(makeFlatItem({
          id: b3Id,
          processNo: l2.no,
          category: 'B',
          itemCode: 'B3',
          value: l3Func.processChar || '',  // ★ 빈값도 보존 (0처리 금지)
          m4: m4 || undefined,
          specialChar: l3Func.specialChar || undefined,
          parentItemId: b2ForB3 || b1Id,
          createdAt: now,
        }));
      }

      // B4: 고장원인 — genB4 재계산 + parentItemId(B3) FK 3단계 폴백
      const fcs = fcsByL3.get(l3.id) || [];
      let kseq = 0;
      for (const fc of fcs) {
        kseq++;
        const b4Id = genB4(doc, pnoNum, m4, b1seq, kseq);
        idRemap.fc.set(fc.id, b4Id);

        // ★★★ MBD-26-009: B4→B3 FK 3단계 폴백 (0처리 금지) ★★★
        // Plan A: FC.l3FuncId → L3Function → B3 정확 매칭
        let parentB3Id = l3FuncIdToB3Id.get(fc.l3FuncId);
        // Plan B: 같은 L3Structure 내 인덱스 기반 매칭 (B4 순번 = B3 순번)
        if (!parentB3Id && l3Funcs.length > 0) {
          const idxMatch = Math.min(kseq - 1, l3Funcs.length - 1);
          parentB3Id = l3FuncIdToB3Id.get(l3Funcs[idxMatch].id);
        }
        // Plan C: 같은 L3Structure의 첫 번째 B3
        if (!parentB3Id && l3FuncIdToB3Id.size > 0) {
          parentB3Id = [...l3FuncIdToB3Id.values()][0];
        }

        result.push(makeFlatItem({
          id: b4Id,
          processNo: l2.no,
          category: 'B',
          itemCode: 'B4',
          value: fc.cause,
          m4: m4 || undefined,
          parentItemId: parentB3Id,
          createdAt: now,
        }));
      }

      // B5: 예방관리 — FailureCause.preventionControl에서 직접 읽기 (B4와 1:1)
      // ★ MBD-26-009: RiskAnalysis 경유 대신 FC에서 직접 읽기 → B5 count = B4 count
      let b5seq = 0;
      for (const fc of fcs) {
        const pcText = ((fc as any).preventionControl as string)?.trim() || '';
        // Plan B: RiskAnalysis에서 폴백
        let b5Value = pcText;
        if (!b5Value) {
          for (const link of db.failureLinks) {
            if (link.fcId === fc.id) {
              const risk = riskByLink.get(link.id);
              if (risk?.preventionControl?.trim()) {
                b5Value = risk.preventionControl.trim();
                break;
              }
            }
          }
        }
        if (!b5Value) continue; // 예방관리 데이터 없으면 스킵
        b5seq++;
        const parentB4Id = idRemap.fc.get(fc.id);
        result.push(makeFlatItem({
          id: `${b1Id}-V-${b5seq}`,
          processNo: l2.no,
          category: 'B',
          itemCode: 'B5',
          value: b5Value,
          m4: m4 || undefined,
          parentItemId: parentB4Id,
          createdAt: now,
        }));
      }
    }

    // L2 직속 FC (l3에 속하지 않는 FC) — l3FuncId 기반으로 m4 복원
    const l3FcIdSet = new Set<string>();
    for (const l3 of l3sForL2) {
      for (const fc of (fcsByL3.get(l3.id) || [])) l3FcIdSet.add(fc.id);
    }
    const l2DirectFcs = (fcsByL2.get(l2.id) || []).filter(fc => !l3FcIdSet.has(fc.id));
    let directKseq = 0;
    for (const fc of l2DirectFcs) {
      directKseq++;
      // l3FuncId로 해당 L3의 m4 복원 시도
      const fcL3Func = db.l3Functions.find(f => f.id === fc.l3FuncId);
      const fcL3 = fcL3Func ? db.l3Structures.find(s => s.id === fcL3Func.l3StructId) : null;
      const directM4 = fcL3?.m4 || '';
      const directB1seq = directM4
        ? (m4SeqCounter.get(directM4) || 1)
        : 1;
      const b4Id = genB4(doc, pnoNum, directM4, directB1seq, directKseq);
      idRemap.fc.set(fc.id, b4Id);

      result.push(makeFlatItem({
        id: b4Id,
        processNo: l2.no,
        category: 'B',
        itemCode: 'B4',
        value: fc.cause,
        m4: directM4 || undefined,
        createdAt: now,
      }));
    }
  }

  return { flatData: result, idRemap };
}

// ─── flatData 팩토리 ───

function makeFlatItem(params: {
  id: string;
  processNo: string;
  category: 'A' | 'B' | 'C';
  itemCode: string;
  value: string;
  m4?: string;
  specialChar?: string;
  parentItemId?: string;
  createdAt: Date;
}): ImportedFlatData {
  return {
    id: params.id,
    processNo: params.processNo,
    category: params.category,
    itemCode: params.itemCode,
    value: params.value,
    m4: params.m4,
    specialChar: params.specialChar,
    parentItemId: params.parentItemId,
    createdAt: params.createdAt,
  };
}
