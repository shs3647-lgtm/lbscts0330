/**
 * @file useTemplateGenerator.ts
 * @description 템플릿 생성기 상태 관리 훅
 * @created 2026-02-18
 *
 * 수동/자동 템플릿 설정값 관리 + flatData 주입 핸들러
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ImportedFlatData } from '../types';
import {
  generateManualTemplateData,
  generateAutoTemplateData,
  type ManualTemplateConfig,
  type AutoTemplateConfig,
  type WorkElementInput,
} from '../utils/template-data-generator';

export type TemplateMode = 'download' | 'manual' | 'auto' | 'preprocess';

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
  existingFlatData?: ImportedFlatData[];  // 기존 BD 데이터 (자동 템플릿용)
}

export function useTemplateGenerator({
  setFlatData,
  setPreviewColumn,
  setDirty,
  setIsSaved,
  existingFlatData,
}: UseTemplateGeneratorProps) {
  const [templateMode, setTemplateMode] = useState<TemplateMode>('download');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // 수동 설정
  const [manualConfig, setManualConfig] = useState<ManualTemplateConfig>(DEFAULT_MANUAL_CONFIG);

  // 자동 설정 (작업요소 + 배수)
  const [workElements, setWorkElements] = useState<WorkElementInput[]>([]);
  const [multipliers, setMultipliers] = useState(DEFAULT_MULTIPLIERS);
  const [autoLoaded, setAutoLoaded] = useState(false);

  // ★ 자동 템플릿: 기존 BD 데이터에서 B1(작업요소) + A1/A2(공정) 자동 추출
  useEffect(() => {
    if (templateMode !== 'auto' || autoLoaded || !existingFlatData || existingFlatData.length === 0) return;

    const b1Items = existingFlatData.filter(d => d.itemCode === 'B1' && d.value?.trim());
    if (b1Items.length === 0) return;

    // A2에서 공정명 매핑
    const a2Map = new Map<string, string>();
    existingFlatData.filter(d => d.itemCode === 'A2').forEach(d => a2Map.set(d.processNo, d.value));

    // B1 → WorkElementInput 변환
    const elements: WorkElementInput[] = b1Items.map((b1, i) => ({
      id: `auto-${Date.now()}-${i}`,
      processNo: b1.processNo,
      processName: a2Map.get(b1.processNo) || '',
      m4: (b1.m4 as 'MN' | 'MC' | 'IM' | 'EN') || 'MC',
      name: b1.value,
    }));

    setWorkElements(elements);

    // A1에서 공정수/번호체계 추출
    const a1Items = existingFlatData.filter(d => d.itemCode === 'A1');
    const processCount = new Set(a1Items.map(d => d.processNo)).size;
    if (processCount > 0) {
      const isAlpha = a1Items.some(d => /^[A-Z]$/i.test(d.processNo));
      setManualConfig(prev => ({
        ...prev,
        processCount,
        processNaming: isAlpha ? 'alphabet' : 'number',
      }));
    }

    setAutoLoaded(true);
  }, [templateMode, existingFlatData, autoLoaded]);

  // ★ existingFlatData가 바뀌면(M/F/P 전환 등) autoLoaded 리셋
  const prevDataLenRef = useRef(existingFlatData?.length ?? 0);
  useEffect(() => {
    const curLen = existingFlatData?.length ?? 0;
    if (curLen !== prevDataLenRef.current) {
      prevDataLenRef.current = curLen;
      setAutoLoaded(false);
    }
  }, [existingFlatData?.length]);

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
    let data: ImportedFlatData[];

    if (templateMode === 'auto' && workElements.length > 0) {
      const config: AutoTemplateConfig = {
        ...manualConfig,
        workElements,
        b2Multiplier: multipliers.b2,
        b3Multiplier: multipliers.b3,
        b4Multiplier: multipliers.b4,
        b5Multiplier: multipliers.b5,
      };
      data = generateAutoTemplateData(config);
    } else {
      data = generateManualTemplateData(manualConfig);
    }

    setFlatData(data);
    setPreviewColumn('A2'); // 공정명부터 표시
    setDirty(true);
    setIsSaved(false);
    setShowConfigModal(false);
  }, [templateMode, manualConfig, workElements, multipliers, setFlatData, setPreviewColumn, setDirty, setIsSaved]);

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
