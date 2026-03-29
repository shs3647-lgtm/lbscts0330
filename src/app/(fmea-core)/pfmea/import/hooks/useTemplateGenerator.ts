/**
 * @file useTemplateGenerator.ts
 * @description 템플릿 생성기 상태 관리 훅
 * @created 2026-02-18
 *
 * 수동/자동 템플릿 설정값 관리 + flatData 주입 핸들러
 */

import { useState, useCallback } from 'react';
import { ImportedFlatData } from '../types';
import {
  generateManualTemplateData,
  type ManualTemplateConfig,
  type WorkElementInput,
} from '../utils/template-data-generator';

export type TemplateMode = 'download' | 'manual' | 'auto';

/** 기본 수동 설정 */
const DEFAULT_MANUAL_CONFIG: ManualTemplateConfig = {
  processCount: 3,
  processNaming: 'number',
  commonMN: 1,
  commonEN: 1,
  perProcessMN: 0,
  perProcessMC: 2,
  perProcessIM: 0,
  perProcessEN: 0,
  exampleIndustry: 'sample-001',
};

/** 기본 자동 배수 */
const DEFAULT_MULTIPLIERS = { b2: 1, b3: 1, b4: 1, b5: 1 };

interface UseTemplateGeneratorProps {
  setFlatData: (data: ImportedFlatData[]) => void;
  setPreviewColumn: (col: string) => void;
  setDirty: (dirty: boolean) => void;
  setIsSaved: (saved: boolean) => void;
  initialMode?: TemplateMode;
}

export function useTemplateGenerator({
  setFlatData,
  setPreviewColumn,
  setDirty,
  setIsSaved,
  initialMode,
}: UseTemplateGeneratorProps) {
  const [templateMode, setTemplateMode] = useState<TemplateMode>(initialMode || 'download');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // 수동 설정
  const [manualConfig, setManualConfig] = useState<ManualTemplateConfig>(DEFAULT_MANUAL_CONFIG);

  // 작업요소 + 배수 (수동 템플릿용)
  const [workElements, setWorkElements] = useState<WorkElementInput[]>([]);
  const [multipliers, setMultipliers] = useState(DEFAULT_MULTIPLIERS);

  /** 모달 열기 */
  const openConfigModal = useCallback(() => {
    setShowConfigModal(true);
  }, []);

  /** 모달 닫기 */
  const closeConfigModal = useCallback(() => {
    setShowConfigModal(false);
  }, []);

  /** [생성] — 템플릿 데이터 생성 → flatData 주입 */
  const handleGenerate = useCallback(() => {
    const data = generateManualTemplateData(manualConfig);
    setFlatData(data);
    setPreviewColumn('A2'); // 공정명부터 표시
    setDirty(true);
    setIsSaved(false);
    setShowConfigModal(false);
  }, [manualConfig, setFlatData, setPreviewColumn, setDirty, setIsSaved]);

  /** 수동 설정 필드 업데이트 */
  const updateManualConfig = useCallback(<K extends keyof ManualTemplateConfig>(
    key: K,
    value: ManualTemplateConfig[K],
  ) => {
    setManualConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  /** 배수 업데이트 */
  const updateMultiplier = useCallback((key: 'b2' | 'b3' | 'b4' | 'b5', value: number) => {
    setMultipliers(prev => ({ ...prev, [key]: value }));
  }, []);

  /** 작업요소 추가 (맨 위에 삽입 — 신규 항목 즉시 확인 가능) */
  const addWorkElement = useCallback((element: Omit<WorkElementInput, 'id'>) => {
    setWorkElements(prev => [
      { ...element, id: `we-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
      ...prev,
    ]);
  }, []);

  /** 작업요소 삭제 */
  const removeWorkElement = useCallback((id: string) => {
    setWorkElements(prev => prev.filter(w => w.id !== id));
  }, []);

  /** 작업요소 수정 */
  const updateWorkElement = useCallback((id: string, field: keyof WorkElementInput, value: string) => {
    setWorkElements(prev => prev.map(w =>
      w.id === id ? { ...w, [field]: value } : w,
    ));
  }, []);

  return {
    // 상태
    templateMode,
    setTemplateMode,
    showConfigModal,
    manualConfig,
    workElements,
    multipliers,

    // 액션
    openConfigModal,
    closeConfigModal,
    handleGenerate,
    updateManualConfig,
    updateMultiplier,
    addWorkElement,
    removeWorkElement,
    updateWorkElement,
  };
}
