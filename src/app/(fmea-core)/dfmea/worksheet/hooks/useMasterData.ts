/**
 * @file useMasterData.ts
 * @description PFMEA 마스터 데이터 접근 훅 - 모든 모달/화면에서 사용
 * @version 1.0.0
 * @created 2026-01-21
 */

import { 
  PRODUCT_INFO,
  PRODUCT_FUNCTIONS,
  PRODUCT_REQUIREMENTS,
  FOCUS_ELEMENTS,
  PARTS,
  FAILURE_EFFECTS,
  FAILURE_MODES,
  FAILURE_CAUSES,
  PREVENTION_CONTROLS,
  DETECTION_CONTROLS,
  getPartsByFocusElement,
  getFailureModesByCategory,
  getFailureCausesByCategory,
  getPreventionControlsByCategory,
  getDetectionControlsByCategory,
} from '../../../pfmea/constants/masterData';

// 타입 정의
export interface SelectOption {
  id: string;
  name: string;
  category?: string;
}

/**
 * 마스터 데이터 접근 훅
 */
export function useMasterData() {
  
  // 1. 다음상위수준 (제품) 정보
  const getProductInfo = () => PRODUCT_INFO;
  const getProductFunctions = (): SelectOption[] => 
    PRODUCT_FUNCTIONS.map((f: any, i: number) => ({ id: `pf-${i}`, name: f }));
  const getProductRequirements = (): SelectOption[] =>
    PRODUCT_REQUIREMENTS.map((r: any, i: number) => ({ id: `pr-${i}`, name: r }));

  // 2. 초점요소 (ASSY) 목록
  const getFocusElements = (): SelectOption[] =>
    FOCUS_ELEMENTS.map((fe: any) => ({ id: fe.id, name: fe.name }));
  
  const getFocusElementFunctions = (feId: string): SelectOption[] => {
    const fe = FOCUS_ELEMENTS.find((f: any) => f.id === feId);
    return fe ? [{ id: `${feId}-func`, name: fe.function }] : [];
  };
  
  const getFocusElementRequirements = (feId: string): SelectOption[] => {
    const fe = FOCUS_ELEMENTS.find((f: any) => f.id === feId);
    return fe ? [{ id: `${feId}-req`, name: fe.requirement }] : [];
  };

  // 3. 다음하위수준 (부품) 목록
  const getParts = (focusElementName?: string): SelectOption[] => {
    if (focusElementName) {
      const fe = FOCUS_ELEMENTS.find((f: any) => f.name === focusElementName);
      if (fe) {
        const parts = getPartsByFocusElement(fe.id);
        return parts.map((p: any) => ({ id: p.id, name: p.name }));
      }
    }
    return PARTS.map((p: any) => ({ id: p.id, name: p.name }));
  };
  
  const getPartFunctions = (partId: string): SelectOption[] => {
    const part = PARTS.find((p: any) => p.id === partId);
    return part ? part.functions.map((f: any, i: number) => ({ id: `${partId}-f${i}`, name: f })) : [];
  };
  
  const getPartRequirements = (partId: string): SelectOption[] => {
    const part = PARTS.find((p: any) => p.id === partId);
    return part ? part.requirements.map((r: any, i: number) => ({ id: `${partId}-r${i}`, name: r })) : [];
  };

  // 4. 고장 분석 데이터
  const getFailureEffects = (): SelectOption[] =>
    FAILURE_EFFECTS.map((fe: any) => ({ id: fe.id, name: fe.effect }));
  
  const getFailureModes = (category?: string): SelectOption[] => {
    const modes = category ? getFailureModesByCategory(category) : FAILURE_MODES;
    return modes.map((fm: any) => ({ id: fm.id, name: fm.mode, category: fm.category }));
  };
  
  const getFailureCauses = (category?: string): SelectOption[] => {
    const causes = category ? getFailureCausesByCategory(category) : FAILURE_CAUSES;
    return causes.map((fc: any) => ({ id: fc.id, name: fc.cause, category: fc.category }));
  };

  // 5. 관리 방법 데이터
  const getPreventionControls = (category?: string): SelectOption[] => {
    const controls = category ? getPreventionControlsByCategory(category) : PREVENTION_CONTROLS;
    return controls.map((pc: any) => ({ id: pc.id, name: pc.control, category: pc.category }));
  };
  
  const getDetectionControls = (category?: string): SelectOption[] => {
    const controls = category ? getDetectionControlsByCategory(category) : DETECTION_CONTROLS;
    return controls.map((dc: any) => ({ id: dc.id, name: dc.control, category: dc.category }));
  };

  // 6. 전체 카테고리 목록
  const getCategories = () => {
    const cats = new Set<string>();
    FAILURE_MODES.forEach((fm: any) => cats.add(fm.category));
    return Array.from(cats);
  };

  return {
    // 제품 (다음상위수준)
    getProductInfo,
    getProductFunctions,
    getProductRequirements,
    // 초점요소 (ASSY)
    getFocusElements,
    getFocusElementFunctions,
    getFocusElementRequirements,
    // 부품 (다음하위수준)
    getParts,
    getPartFunctions,
    getPartRequirements,
    // 고장 분석
    getFailureEffects,
    getFailureModes,
    getFailureCauses,
    // 관리 방법
    getPreventionControls,
    getDetectionControls,
    // 카테고리
    getCategories,
  };
}

export default useMasterData;
