/**
 * @file auto/page.tsx
 * @description 자동 템플릿 모드 — 기존 BD에서 B1 자동 추출 + multiplier, A6/B5 제외, 자동저장
 * @created 2026-02-26
 */

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { ImportedFlatData } from '../types';
import { generateAutoTemplateData, INDUSTRY_LABELS } from '../utils/template-data-generator';
import type { ManualTemplateConfig, WorkElementInput, ExampleIndustry } from '../utils/template-data-generator';
import { stripHeavyItemCodes } from '../utils/lightweight-filter';
import { loadDatasetByFmeaId } from '../utils/master-api';
import { useFmeaSelection } from '../hooks/useFmeaSelection';
import { useAutoSaveOnImport } from '../hooks/useAutoSaveOnImport';
import { BdStatusTable } from '../components/BdStatusTable';
import ImportStepBar from '../components/ImportStepBar';

// ── 상수 ──
const SELECT_CLS = 'px-1.5 py-0.5 border border-gray-300 rounded text-[11px] bg-white';
const LABEL_CLS = 'text-[11px] text-blue-700 font-bold whitespace-nowrap';
const SECTION_CLS = 'flex items-center gap-1';
const M4_LABEL: Record<string, string> = {
  MN: 'text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded',
  MC: 'text-blue-700 bg-blue-100 border border-blue-300 px-1.5 py-0.5 rounded',
  IM: 'text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded',
  EN: 'text-pink-700 bg-pink-100 border border-pink-300 px-1.5 py-0.5 rounded',
};

const M4_BADGE: Record<string, string> = {
  MN: 'bg-red-50 text-red-600 border-red-200',
  MC: 'bg-blue-50 text-blue-600 border-blue-200',
  IM: 'bg-amber-50 text-amber-600 border-amber-200',
  EN: 'bg-pink-50 text-pink-600 border-pink-200',
};

const DEFAULT_CONFIG: ManualTemplateConfig = {
  processCount: 3,
  processNaming: 'number' as const,
  commonMN: 1, commonEN: 0,
  perProcessMN: 0, perProcessMC: 1, perProcessIM: 0, perProcessEN: 0,
  exampleIndustry: 'sample-001' as ExampleIndustry,
};

function NumSelect({ value, options, onChange }: {
  value: number; options: number[]; onChange: (v: number) => void;
}) {
  return (
    <select value={value} onChange={e => onChange(Number(e.target.value))} className={SELECT_CLS}>
      {options.map(v => <option key={v} value={v}>{v}</option>)}
    </select>
  );
}

export default function AutoImportPage() {
  // ── 격리된 state ──
  const fmea = useFmeaSelection();
  const [flatData, setFlatData] = useState<ImportedFlatData[]>([]);
  const [masterDatasetId, setMasterDatasetId] = useState<string | null>(null);
  const [config, setConfig] = useState<ManualTemplateConfig>(DEFAULT_CONFIG);
  const [workElements, setWorkElements] = useState<WorkElementInput[]>([]);
  const [multipliers, setMultipliers] = useState({ b2: 1, b3: 1, b4: 1, b5: 1 });
  const [generated, setGenerated] = useState(false);
  const [autoLoaded, setAutoLoaded] = useState(false);

  const autoSave = useAutoSaveOnImport({
    selectedFmeaId: fmea.selectedFmeaId,
    fmeaType: fmea.selectedFmea?.fmeaType || 'P',
    masterDatasetId,
    setMasterDatasetId,
    setBdStatusList: fmea.setBdStatusList,
    mode: 'template',  // ★ 2026-03-02: failureChains DB 오염 방지
  });

  // ── 기존 BD에서 B1 작업요소 자동 추출 ──
  useEffect(() => {
    if (!fmea.selectedFmeaId || autoLoaded) return;
    (async () => {
      try {
        const loaded = await loadDatasetByFmeaId(fmea.selectedFmeaId);
        if (loaded.datasetId) setMasterDatasetId(loaded.datasetId);
        if (loaded.flatData.length > 0) {
          // B1 작업요소 추출
          const b1Items = loaded.flatData.filter((d: ImportedFlatData) => d.itemCode === 'B1' && d.value?.trim());
          const extracted: WorkElementInput[] = b1Items.map((d: ImportedFlatData, i: number) => ({
            id: `we-${i}`,
            processNo: d.processNo,
            processName: loaded.flatData.find((a: ImportedFlatData) => a.processNo === d.processNo && a.itemCode === 'A2')?.value || '',
            m4: (d.m4 || 'MN') as 'MN' | 'MC' | 'IM' | 'EN',
            name: d.value,
          }));
          if (extracted.length > 0) setWorkElements(extracted);
        }
        setAutoLoaded(true);
      } catch (e) {
        console.error('기존 데이터 로드 오류:', e);
        setAutoLoaded(true);
      }
    })();
  }, [fmea.selectedFmeaId, autoLoaded]);

  // ── 작업요소 관리 ──
  const addWorkElement = useCallback(() => {
    setWorkElements(prev => [...prev, {
      id: `we-${Date.now()}`,
      processNo: '',
      processName: '',
      m4: 'MN' as const,
      name: '',
    }]);
  }, []);

  const removeWorkElement = useCallback((id: string) => {
    setWorkElements(prev => prev.filter(w => w.id !== id));
  }, []);

  const updateWorkElement = useCallback((id: string, field: keyof WorkElementInput, value: string) => {
    setWorkElements(prev => prev.map(w => w.id === id ? { ...w, [field]: value } : w));
  }, []);

  // ── 생성 + 자동저장 ──
  const handleGenerate = useCallback(async () => {
    if (!fmea.selectedFmeaId) {
      alert('FMEA 프로젝트를 먼저 선택하세요.');
      return;
    }
    if (workElements.length === 0) {
      alert('작업요소를 1개 이상 입력하세요.');
      return;
    }
    const raw = generateAutoTemplateData({
      ...config,
      workElements,
      b2Multiplier: multipliers.b2,
      b3Multiplier: multipliers.b3,
      b4Multiplier: multipliers.b4,
      b5Multiplier: multipliers.b5,
    });
    const lightweight = stripHeavyItemCodes(raw);
    setFlatData(lightweight);
    setGenerated(true);
    await autoSave.triggerSave(lightweight);
  }, [config, workElements, multipliers, fmea.selectedFmeaId, autoSave]);

  // ── 미리보기 통계 ──
  const stats = useMemo(() => {
    const processes = new Set(flatData.filter(d => d.itemCode === 'A1').map(d => d.processNo));
    return { processCount: processes.size, total: flatData.length };
  }, [flatData]);

  return (
    <>
      {/* ── 작업요소 입력 ── */}
      <div className="bg-white border border-blue-100 rounded-lg p-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[12px] font-bold text-blue-800">
            자동 템플릿 — 작업요소 ({workElements.length}개)
          </h3>
          <div className="flex items-center gap-2">
            {autoSave.isSaving && <span className="text-[10px] text-blue-500 animate-pulse">저장 중...</span>}
            {autoSave.lastSaveOk === true && <span className="text-[10px] text-green-600 font-bold">저장 완료</span>}
            <button onClick={addWorkElement} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] hover:bg-gray-200 cursor-pointer">+ 추가</button>
            <button
              onClick={handleGenerate}
              disabled={autoSave.isSaving || workElements.length === 0}
              className="px-4 py-1.5 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              생성
            </button>
            {/* FMEA 작성 → 는 아래 ImportStepBar의 FA 완료 후 활성화 */}
          </div>
        </div>

        {/* 작업요소 테이블 */}
        {workElements.length > 0 && (
          <div className="max-h-[200px] overflow-auto mb-2">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-blue-50">
                  <th className="border border-gray-300 px-1.5 py-1 w-[60px]">공정No</th>
                  <th className="border border-gray-300 px-1.5 py-1">공정명</th>
                  <th className="border border-gray-300 px-1.5 py-1 w-[50px]">4M</th>
                  <th className="border border-gray-300 px-1.5 py-1">작업요소명</th>
                  <th className="border border-gray-300 px-1.5 py-1 w-[30px]"></th>
                </tr>
              </thead>
              <tbody>
                {workElements.map(we => (
                  <tr key={we.id}>
                    <td className="border border-gray-200 px-0.5 py-0">
                      <input value={we.processNo} onChange={e => updateWorkElement(we.id, 'processNo', e.target.value)}
                        className="w-full px-1 py-0.5 text-[10px] border-0 outline-none" placeholder="10" />
                    </td>
                    <td className="border border-gray-200 px-0.5 py-0">
                      <input value={we.processName} onChange={e => updateWorkElement(we.id, 'processName', e.target.value)}
                        className="w-full px-1 py-0.5 text-[10px] border-0 outline-none" placeholder="공정명" />
                    </td>
                    <td className="border border-gray-200 px-0.5 py-0 text-center">
                      <select value={we.m4} onChange={e => updateWorkElement(we.id, 'm4', e.target.value)} className="text-[9px] border-0 outline-none bg-transparent">
                        {['MN', 'MC', 'IM', 'EN'].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </td>
                    <td className="border border-gray-200 px-0.5 py-0">
                      <input value={we.name} onChange={e => updateWorkElement(we.id, 'name', e.target.value)}
                        className="w-full px-1 py-0.5 text-[10px] border-0 outline-none" placeholder="작업요소명" />
                    </td>
                    <td className="border border-gray-200 text-center">
                      <button onClick={() => removeWorkElement(we.id)} className="text-red-400 hover:text-red-600 text-[10px] cursor-pointer">X</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {workElements.length === 0 && (
          <div className="text-center py-3 text-[11px] text-gray-400">
            기존 BD에서 자동 추출 또는 [+ 추가]로 작업요소 입력
          </div>
        )}

        {/* Multiplier 설정 */}
        <div className="flex items-center gap-3 text-[10px]">
          <span className={LABEL_CLS}>반복수:</span>
          {(['b2', 'b3', 'b4'] as const).map(key => (
            <div key={key} className={SECTION_CLS}>
              <span className="font-bold text-gray-600">{key.toUpperCase()}</span>
              <NumSelect value={multipliers[key]} options={[1,2,3,4,5]} onChange={v => setMultipliers(prev => ({ ...prev, [key]: v }))} />
            </div>
          ))}
        </div>
      </div>

      {/* ── 미리보기 ── */}
      {generated && flatData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2">
          <div className="flex items-center gap-3 mb-2 text-[10px] text-gray-500">
            <span>공정 <b className="text-blue-700">{stats.processCount}</b></span>
            <span>합계 <b className="text-blue-700">{stats.total}</b></span>
            <span className="text-green-600 font-bold">A6/B5 제외 (경량)</span>
          </div>
          <div className="max-h-[250px] overflow-auto">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-blue-50">
                  <th className="border border-gray-300 px-1.5 py-1 w-[40px]">No</th>
                  <th className="border border-gray-300 px-1.5 py-1 w-[50px]">공정</th>
                  <th className="border border-gray-300 px-1.5 py-1 w-[35px]">코드</th>
                  <th className="border border-gray-300 px-1.5 py-1 w-[35px]">4M</th>
                  <th className="border border-gray-300 px-1.5 py-1">값</th>
                </tr>
              </thead>
              <tbody>
                {flatData.slice(0, 100).map((d, i) => (
                  <tr key={d.id || i}>
                    <td className="border border-gray-200 px-1 py-0.5 text-center text-gray-400">{i + 1}</td>
                    <td className="border border-gray-200 px-1 py-0.5 text-center font-mono">{d.processNo}</td>
                    <td className="border border-gray-200 px-1 py-0.5 text-center font-bold text-blue-600">{d.itemCode}</td>
                    <td className="border border-gray-200 px-1 py-0.5 text-center">
                      {d.m4 && <span className={`text-[8px] font-bold px-1 py-0 rounded border ${M4_BADGE[d.m4] || ''}`}>{d.m4}</span>}
                    </td>
                    <td className="border border-gray-200 px-1 py-0.5">{d.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {flatData.length > 100 && <p className="text-[9px] text-gray-400 text-center mt-1">... 외 {flatData.length - 100}건</p>}
          </div>
        </div>
      )}

      {/* ── SA→FC→FA 검증 + FMEA 작성 ── */}
      {generated && flatData.length > 0 && fmea.selectedFmeaId && autoSave.lastSaveOk && (
        <ImportStepBar
          flatData={flatData}
          fmeaId={fmea.selectedFmeaId}
          fmeaInfo={{ fmeaType: fmea.selectedFmea?.fmeaType || 'P' }}
        />
      )}

      {/* ── BD 현황 테이블 ── */}
      <BdStatusTable
        bdStatusList={fmea.bdStatusList}
        selectedFmeaId={fmea.selectedFmeaId}
        setSelectedFmeaId={fmea.setSelectedFmeaId}
        onDeleteDatasets={fmea.handleDeleteDatasets}
        adminMode={fmea.adminMode}
        isAdmin={fmea.isAdmin}
        onToggleAdminMode={fmea.handleToggleAdminMode}
        onRestoreDatasets={fmea.handleRestoreDatasets}
        onPermanentDeleteDatasets={fmea.handlePermanentDeleteDatasets}
      />
    </>
  );
}
