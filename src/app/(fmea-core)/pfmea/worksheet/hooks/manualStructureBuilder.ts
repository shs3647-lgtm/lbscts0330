/**
 * @file manualStructureBuilder.ts
 * @description 수동모드 신규 FMEA — WorksheetState → PositionAtomicData 변환
 *
 * ★★★ 2026-03-30: Phase 1 리팩토링 (PRD 기반) ★★★
 *
 * 근본 원인:
 *   신규 FMEA(Import 없음)에서 atomicDB = null → useWorksheetSave의 저장 조건 실패
 *   → 수동 추가된 공정이 DB에 전혀 저장되지 않음
 *
 * 이전 상태:
 *   L1/L2/L3 구조(Structure)만 변환, 기능/고장은 모두 빈 배열 []
 *   → 프로젝트 스키마에 l1_functions, l2_functions, l3_functions, FM, FE, FC 전부 0건
 *
 * 수정:
 *   WorksheetState의 전체 데이터를 Atomic으로 변환
 *   → L1 기능(C2/C3) + L2 기능(A3/A4) + L3 기능(B2/B3) + FE(C4) + FM(A5) + FC(B4)
 *
 * [단독 프로젝트] pfm26-p006-i06 처럼 parentFmeaId=null, masterDatasetId=null
 *   → 수동 모달만으로 FMEA를 작성해도 모든 엔티티가 프로젝트 DB에 저장됨
 *   → rebuild-atomic에서 FK 정합성까지 수복 가능
 */

import type {
  PositionAtomicData,
  PosL1Structure,
  PosL2Structure,
  PosL2ProcessNo,
  PosL2ProcessName,
  PosL3Structure,
  PosL3WorkElement,
  PosL3ProcessNo,
  PosL3FourM,
  PosL1Function,
  PosL1Requirement,
  PosL1Scope,
  PosL2Function,
  PosL3Function,
  PosFailureEffect,
  PosFailureMode,
  PosFailureCause,
  PosProcessProductChar,
} from '@/types/position-import';
import { normalizeL2ProcessNo } from '../utils/processNoNormalize';

interface SimpleL3 {
  id?: string;
  name?: string;
  m4?: string;
  order?: number;
  functions?: Array<{ id?: string; name?: string; processChars?: Array<{ id?: string; name?: string; specialChar?: string }> }>;
  failureCauses?: Array<{ id?: string; name?: string; cause?: string; processCharId?: string; occurrence?: number }>;
}

interface SimpleL2 {
  id?: string;
  no?: string;
  name?: string;
  order?: number;
  l3?: SimpleL3[];
  functions?: Array<{ id?: string; name?: string; productChars?: Array<{ id?: string; name?: string; specialChar?: string }> }>;
  failureModes?: Array<{ id?: string; name?: string; mode?: string; productCharId?: string }>;
  /** ★ failureCauses는 공정(레벨) 레벨에 저장됨 (워크시트 state 구조) */
  failureCauses?: Array<{ id?: string; name?: string; cause?: string; processCharId?: string; occurrence?: number }>;
}

/**
 * ★ L1 기능(C2/C3/C4) 구조체
 * state.l1.types[].functions[].requirements[] → L1Function + L1Requirement + FailureEffect
 */
interface SimpleL1 {
  id?: string;
  name?: string;
  types?: Array<{
    id?: string;
    name?: string;  // YP/SP/USER
    functions?: Array<{
      id?: string;
      name?: string;
      requirements?: Array<{ id?: string; name?: string }>;
    }>;
  }>;
  failureScopes?: Array<{
    id?: string;
    effect?: string;
    severity?: number;
    category?: string;
  }>;
}

/**
 * ★ 수동1원칙: PLACEHOLDER_TEXT → DB 저장 시 빈 문자열로 변환
 */
const PLACEHOLDER_TEXT = '미입력';
const stripPlaceholder = (val: string | undefined): string => {
  if (!val) return '';
  return val.trim() === PLACEHOLDER_TEXT ? '' : val.trim();
};

/**
 * WorksheetState → PositionAtomicData 완전 변환
 * ★ 구조(L1/L2/L3) + 기능(C2/A3/B2) + 고장(C4/A5/B4) 전체 포함
 *
 * @param fmeaId - 프로젝트 ID
 * @param l1Name - 완제품명
 * @param l2Items - state.l2 (공정 배열)
 * @param l1Data - state.l1 (완제품 기능/고장영향)
 * @returns null — 유효한 공정이 없으면 저장 불필요
 */
export function buildManualPositionData(
  fmeaId: string,
  l1Name: string,
  l2Items: SimpleL2[],
  l1Data?: SimpleL1,
): PositionAtomicData | null {
  const normalizedId = fmeaId.toLowerCase();

  // 유효한 공정(이름 또는 번호가 있는 것)만 처리
  const validL2 = l2Items.filter(p => p.name?.trim() || p.no?.trim());
  if (validL2.length === 0) return null;

  const L1_ID = 'L1-STRUCT';

  const l1Structure: PosL1Structure = {
    id: L1_ID,
    fmeaId: normalizedId,
    name: l1Name || '완제품 공정',
  };

  const l2Structures: PosL2Structure[] = [];
  const l2ProcessNos: PosL2ProcessNo[] = [];
  const l2ProcessNames: PosL2ProcessName[] = [];
  const l3Structures: PosL3Structure[] = [];
  const l3WorkElements: PosL3WorkElement[] = [];
  const l3ProcessNos: PosL3ProcessNo[] = [];
  const l3FourMs: PosL3FourM[] = [];

  // ★★★ Phase 1: 기능/고장 배열 선언 ★★★
  const l1Functions: PosL1Function[] = [];
  const l1Requirements: PosL1Requirement[] = [];
  const l1Scopes: PosL1Scope[] = [];
  const l2Functions: PosL2Function[] = [];
  const l3Functions: PosL3Function[] = [];
  const processProductChars: PosProcessProductChar[] = [];
  const failureEffects: PosFailureEffect[] = [];
  const failureModes: PosFailureMode[] = [];
  const failureCauses: PosFailureCause[] = [];

  // ────────────────────────────────────────────────────
  // ★ L1: 구분(C1) + 완제품기능(C2) + 요구사항(C3) + 고장영향(C4/FE)
  // ────────────────────────────────────────────────────
  if (l1Data?.types) {
    for (const type of l1Data.types) {
      const category = (type.name || '').trim();
      if (!category) continue;

      // C1 구분 → L1Scope
      if (type.id) {
        l1Scopes.push({
          id: type.id,
          fmeaId: normalizedId,
          l1StructId: L1_ID,
          parentId: L1_ID,
          scope: category,
        });
      }

      for (const func of (type.functions || [])) {
        const functionName = (func.name || '').trim();
        if (!func.id) continue;

        // C2 완제품기능 → L1Function (기능 행)
        l1Functions.push({
          id: func.id,
          fmeaId: normalizedId,
          l1StructId: L1_ID,
          parentId: type.id || L1_ID,
          category,
          functionName,
          requirement: '',
        });

        // C3 요구사항 → L1Requirement (기능 하위)
        for (let rIdx = 0; rIdx < (func.requirements || []).length; rIdx++) {
          const req = func.requirements![rIdx];
          const reqName = (req.name || '').trim();
          if (!req.id || !reqName) continue;

          l1Requirements.push({
            id: req.id,
            fmeaId: normalizedId,
            l1StructId: L1_ID,
            l1FuncId: func.id,
            parentId: func.id,
            requirement: reqName,
            orderIndex: rIdx,
          });
        }
      }
    }
  }

  // C4 고장영향 → FailureEffect
  if (l1Data?.failureScopes) {
    for (const fe of l1Data.failureScopes) {
      if (!fe.id || !fe.effect?.trim()) continue;
      // l1FuncId: 카테고리에 해당하는 첫 L1Function ID 매칭
      const matchFunc = l1Functions.find(f =>
        f.category === (fe.category || '') ||
        (!fe.category && l1Functions.length > 0)
      );

      failureEffects.push({
        id: fe.id,
        fmeaId: normalizedId,
        l1FuncId: matchFunc?.id || l1Functions[0]?.id || L1_ID,
        parentId: matchFunc?.id || L1_ID,
        category: fe.category || '',
        effect: fe.effect,
        severity: fe.severity || 1,
      });
    }
  }

  // ────────────────────────────────────────────────────
  // ★ L2/L3: 공정 구조 + 기능 + 고장
  // ────────────────────────────────────────────────────
  validL2.forEach((l2, i) => {
    // ID 보존: 모달에서 생성된 proc_new_xxx ID 그대로 사용
    const l2Id = l2.id?.trim() || `L2-MAN-${normalizedId}-${i}`;
    const rawNo = l2.no?.trim() || '';
    const processNo = rawNo
      ? normalizeL2ProcessNo(rawNo)
      : String((i + 1) * 10).padStart(3, '0');
    const processName = l2.name?.trim() || '';

    l2Structures.push({
      id: l2Id,
      fmeaId: normalizedId,
      l1Id: L1_ID,
      parentId: L1_ID,
      no: processNo,
      name: processName,
      order: i,
    });

    l2ProcessNos.push({
      id: `${l2Id}-C1`,
      fmeaId: normalizedId,
      l2StructId: l2Id,
      parentId: l2Id,
      no: processNo,
    });

    l2ProcessNames.push({
      id: `${l2Id}-C2`,
      fmeaId: normalizedId,
      l2StructId: l2Id,
      parentId: l2Id,
      name: processName,
    });

    // ★ A3 공정기능 + A4 제품특성 → L2Function + ProcessProductChar
    for (let fIdx = 0; fIdx < (l2.functions || []).length; fIdx++) {
      const func = l2.functions![fIdx];
      const functionName = stripPlaceholder(func.name);
      if (!func.id) continue;

      const pcs = func.productChars || [];
      if (pcs.length === 0) {
        l2Functions.push({
          id: func.id,
          fmeaId: normalizedId,
          l2StructId: l2Id,
          parentId: l2Id,
          functionName,
          productChar: '',
          specialChar: '',
        });
      } else {
        for (let pcIdx = 0; pcIdx < pcs.length; pcIdx++) {
          const pc = pcs[pcIdx];
          const pcId = pc.id || `${func.id}-PC-${pcIdx}`;
          l2Functions.push({
            id: pcId,
            fmeaId: normalizedId,
            l2StructId: l2Id,
            parentId: l2Id,
            functionName,
            productChar: stripPlaceholder(pc.name),
            specialChar: pc.specialChar || '',
          });
          processProductChars.push({
            id: pcId,
            fmeaId: normalizedId,
            l2StructId: l2Id,
            parentId: l2Id,
            name: stripPlaceholder(pc.name),
            specialChar: pc.specialChar || '',
            orderIndex: pcIdx,
          });
        }
      }
    }

    // ★ A5 고장형태 → FailureMode
    for (let fmIdx = 0; fmIdx < (l2.failureModes || []).length; fmIdx++) {
      const fm = l2.failureModes![fmIdx];
      const mode = stripPlaceholder(fm.name || fm.mode);
      if (!fm.id || !mode) continue;
      // l2FuncId: productCharId가 있으면 우선 사용, 없으면 첫 L2Function
      const matchL2F = l2Functions.find(f => (f as any).l2StructId === l2Id);
      const resolvedPcId = fm.productCharId?.trim() || matchL2F?.id || l2Id;
      failureModes.push({
        id: fm.id,
        fmeaId: normalizedId,
        l2FuncId: resolvedPcId,
        l2StructId: l2Id,
        productCharId: resolvedPcId,
        mode,
        parentId: resolvedPcId,
      });
    }

    // ★ L3: 작업요소 구조 + B2/B3 기능 + B4 고장원인
    const l3s = (l2.l3 || []);
    l3s.forEach((l3, j) => {
      const l3Id = l3.id?.trim() || `L3-MAN-${l2Id}-${j}`;
      const weName = l3.name?.trim() || '';
      const m4 = l3.m4?.trim() || '';

      l3Structures.push({
        id: l3Id,
        fmeaId: normalizedId,
        l1Id: L1_ID,
        l2Id,
        parentId: l2Id,
        m4,
        name: weName,
        order: j,
      });

      l3ProcessNos.push({
        id: `${l3Id}-C1`,
        fmeaId: normalizedId,
        l3StructId: l3Id,
        parentId: l3Id,
        no: processNo,
      });

      if (weName) {
        l3WorkElements.push({
          id: `${l3Id}-C3`,
          fmeaId: normalizedId,
          l3StructId: l3Id,
          parentId: l3Id,
          name: weName,
        });
      }

      if (m4) {
        l3FourMs.push({
          id: `${l3Id}-C2`,
          fmeaId: normalizedId,
          l3StructId: l3Id,
          parentId: l3Id,
          m4,
        });
      }

      // ★ B2 요소기능 + B3 공정특성 → L3Function
      for (let fIdx = 0; fIdx < (l3.functions || []).length; fIdx++) {
        const func = l3.functions![fIdx];
        const functionName = stripPlaceholder(func.name);
        if (!func.id) continue;

        const pcs = func.processChars || [];
        if (pcs.length === 0) {
          l3Functions.push({
            id: func.id,
            fmeaId: normalizedId,
            l3StructId: l3Id,
            l2StructId: l2Id,
            parentId: l3Id,
            functionName,
            processChar: '',
            specialChar: '',
          });
        } else {
          for (let pcIdx = 0; pcIdx < pcs.length; pcIdx++) {
            const pc = pcs[pcIdx];
            l3Functions.push({
              id: pc.id || `${func.id}-PC-${pcIdx}`,
              fmeaId: normalizedId,
              l3StructId: l3Id,
              l2StructId: l2Id,
              parentId: l3Id,
              functionName,
              processChar: stripPlaceholder(pc.name),
              specialChar: pc.specialChar || '',
            });
          }
        }
      }

      // ★ B4 고장원인 → FailureCause
      for (let fcIdx = 0; fcIdx < (l3.failureCauses || []).length; fcIdx++) {
        const fc = l3.failureCauses![fcIdx];
        const cause = stripPlaceholder(fc.name || fc.cause);
        if (!fc.id || !cause) continue;
        // l3FuncId/l3CharId: processCharId가 있으면 우선 사용, 없으면 첫 L3Function
        const matchL3F = l3Functions.find(f => (f as any).l3StructId === l3Id);
        const resolvedCharId = fc.processCharId?.trim() || matchL3F?.id || l3Id;
        failureCauses.push({
          id: fc.id,
          fmeaId: normalizedId,
          l3FuncId: resolvedCharId,
          l3StructId: l3Id,
          l2StructId: l2Id,
          l3CharId: resolvedCharId,
          cause,
          parentId: resolvedCharId,
        });
      }
    });

    // ★ B4 고장원인 — 공정 레벨(l2.failureCauses) 우선 수집
    // 워크시트 state에서 failureCauses는 proc.failureCauses에 저장됨 (FailureL3Tab 패턴)
    for (let fcIdx = 0; fcIdx < (l2.failureCauses || []).length; fcIdx++) {
      const fc = l2.failureCauses![fcIdx];
      const cause = stripPlaceholder(fc.name || fc.cause);
      if (!fc.id || !cause) continue;
      // 이미 l3 루프에서 추가한 FC와 중복 방지
      if (failureCauses.some(existing => existing.id === fc.id)) continue;
      // processCharId로 L3Function 매칭, 없으면 이 공정의 첫 L3Function
      const allL3Funcs = l3Functions.filter(f => (f as any).l2StructId === l2Id);
      const resolvedCharId = fc.processCharId?.trim()
        ? (allL3Funcs.find(f => f.id === fc.processCharId) ? fc.processCharId! : allL3Funcs[0]?.id || l2Id)
        : allL3Funcs[0]?.id || l2Id;
      // l3StructId: processCharId로 L3Function을 찾아 l3StructId 역조회
      const matchedL3F = allL3Funcs.find(f => f.id === resolvedCharId);
      const l3StructId = matchedL3F ? (matchedL3F as any).l3StructId || l2Id : l2Id;
      failureCauses.push({
        id: fc.id,
        fmeaId: normalizedId,
        l3FuncId: resolvedCharId,
        l3StructId,
        l2StructId: l2Id,
        l3CharId: resolvedCharId,
        cause,
        parentId: resolvedCharId,
      });
    }
  });

  return {
    fmeaId: normalizedId,
    l1Structure,
    l1Functions,
    l1Requirements,
    l1Scopes,
    l2Structures,
    l2Functions,
    l2ProcessNos,
    l2ProcessNames,
    l2SpecialChars: [],
    l3Structures,
    l3Functions,
    l3ProcessChars: [],
    l3ProcessNos,
    l3FourMs,
    l3WorkElements,
    l3SpecialChars: [],
    processProductChars,
    failureEffects,
    failureModes,
    failureCauses,
    failureLinks: [],     // ★ FL은 rebuild-atomic에서 자동 생성
    riskAnalyses: [],     // ★ RA는 rebuild-atomic에서 자동 생성
    stats: {
      l2: l2Structures.length,
      l3: l3Structures.length,
      l1Functions: l1Functions.length,
      l2Functions: l2Functions.length,
      l3Functions: l3Functions.length,
      failureEffects: failureEffects.length,
      failureModes: failureModes.length,
      failureCauses: failureCauses.length,
    },
  };
}

