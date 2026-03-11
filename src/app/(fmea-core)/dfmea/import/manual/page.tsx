/**
 * @file manual/page.tsx
 * @description 수동 템플릿 모드 — 격리된 state, A6/B5 제외, 자동저장
 * @created 2026-02-26
 */

'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import type { ImportedFlatData } from '../types';
import { generateManualTemplateData, INDUSTRY_LABELS } from '../utils/template-data-generator';
import type { ManualTemplateConfig, ExampleIndustry } from '../utils/template-data-generator';
import { stripHeavyItemCodes } from '../utils/lightweight-filter';
import { loadDatasetByFmeaId } from '../utils/master-api';
import { useFmeaSelection } from '../hooks/useFmeaSelection';
import { useAutoSaveOnImport } from '../hooks/useAutoSaveOnImport';
import { BdStatusTable } from '../components/BdStatusTable';

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

const DEFAULT_CONFIG: ManualTemplateConfig = {
  processCount: 3,
  processNaming: 'number' as const,
  commonMN: 1,
  commonEN: 0,
  perProcessMN: 0,
  perProcessMC: 1,
  perProcessIM: 0,
  perProcessEN: 0,
  exampleIndustry: 'sample-001' as ExampleIndustry,
};

function NumSelect({ value, options, onChange, disabled }: {
  value: number; options: number[]; onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <select value={value} onChange={e => onChange(Number(e.target.value))} className={SELECT_CLS} disabled={disabled}>
      {options.map(v => <option key={v} value={v}>{v}</option>)}
    </select>
  );
}

export default function ManualImportPage() {
  // ── 격리된 state ──
  const fmea = useFmeaSelection();
  const [flatData, setFlatData] = useState<ImportedFlatData[]>([]);
  const [masterDatasetId, setMasterDatasetId] = useState<string | null>(null);
  const [config, setConfig] = useState<ManualTemplateConfig>(DEFAULT_CONFIG);
  const [generated, setGenerated] = useState(false);

  const autoSave = useAutoSaveOnImport({
    selectedFmeaId: fmea.selectedFmeaId,
    fmeaType: fmea.selectedFmea?.fmeaType || 'D',
    masterDatasetId,
    setMasterDatasetId,
    setBdStatusList: fmea.setBdStatusList,
    mode: 'template',  // ★ 2026-03-02: failureChains DB 오염 방지
  });

  const updateConfig = useCallback(<K extends keyof ManualTemplateConfig>(key: K, val: ManualTemplateConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: val }));
  }, []);

  // ── 생성 + 자동저장 ──
  const handleGenerate = useCallback(async () => {
    if (!fmea.selectedFmeaId) {
      alert('FMEA 프로젝트를 먼저 선택하세요.');
      return;
    }
    const raw = generateManualTemplateData(config);
    const lightweight = stripHeavyItemCodes(raw);
    setFlatData(lightweight);
    setGenerated(true);
    // 즉시 자동저장
    await autoSave.triggerSave(lightweight);
  }, [config, fmea.selectedFmeaId, autoSave]);

  // ── 미리보기 통계 ──
  const stats = useMemo(() => {
    const processes = new Set(flatData.filter(d => d.itemCode === 'A1').map(d => d.processNo));
    const a = flatData.filter(d => d.category === 'A');
    const b = flatData.filter(d => d.category === 'B');
    const c = flatData.filter(d => d.category === 'C');
    return { processCount: processes.size, aCount: a.length, bCount: b.length, cCount: c.length, total: flatData.length };
  }, [flatData]);

  // ── 미리보기 테이블 ──
  const previewByProcess = useMemo(() => {
    const map = new Map<string, { a2: string; b1s: string[] }>();
    for (const d of flatData) {
      if (d.itemCode === 'A2') {
        const entry = map.get(d.processNo) || { a2: '', b1s: [] };
        entry.a2 = d.value;
        map.set(d.processNo, entry);
      }
      if (d.itemCode === 'B1') {
        const entry = map.get(d.processNo) || { a2: '', b1s: [] };
        entry.b1s.push(`${d.value}${d.m4 ? ` [${d.m4}]` : ''}`);
        map.set(d.processNo, entry);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  }, [flatData]);

  return (
    <>
      {/* ── 설정 패널 ── */}
      <div className="bg-white border border-blue-100 rounded-lg p-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[12px] font-bold text-blue-800">수동 템플릿 설정</h3>
          <div className="flex items-center gap-2">
            {autoSave.isSaving && <span className="text-[10px] text-blue-500 animate-pulse">저장 중...</span>}
            {autoSave.lastSaveOk === true && <span className="text-[10px] text-green-600 font-bold">저장 완료</span>}
            <button
              onClick={handleGenerate}
              disabled={autoSave.isSaving}
              className="px-4 py-1.5 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              생성
            </button>
          </div>
        </div>

        {/* 설정 1행: 업종/공정수/번호 */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1.5 items-center">
          <div className={SECTION_CLS}>
            <span className={LABEL_CLS}>업종사례</span>
            <select value={config.exampleIndustry} onChange={e => updateConfig('exampleIndustry', e.target.value as ExampleIndustry)} className={`${SELECT_CLS} font-bold`}>
              {(Object.keys(INDUSTRY_LABELS) as ExampleIndustry[]).map(k => (
                <option key={k} value={k}>{INDUSTRY_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <span className="w-px h-4 bg-blue-200 hidden sm:block" />
          <div className={SECTION_CLS}>
            <span className={LABEL_CLS}>공정갯수</span>
            <NumSelect value={config.processCount} options={[1,2,3,5,10,15,20,30,50]} onChange={v => updateConfig('processCount', v)} />
          </div>
          <div className={SECTION_CLS}>
            <span className={LABEL_CLS}>번호타입</span>
            <select value={config.processNaming} onChange={e => updateConfig('processNaming', e.target.value as 'number' | 'alphabet')} className={SELECT_CLS}>
              <option value="number">10,20,30...</option>
              <option value="alphabet">A,B,C...</option>
            </select>
          </div>
        </div>

        {/* 설정 2행: 4M */}
        <div className="flex flex-wrap gap-x-1.5 gap-y-1 items-center text-[10px]">
          <span className="text-blue-700 font-bold whitespace-nowrap">공통:</span>
          <div className={SECTION_CLS}>
            <span className={`font-bold ${M4_LABEL.MN} ${config.perProcessMN > 0 ? 'opacity-40' : ''}`}>MN</span>
            <NumSelect value={config.commonMN} options={[0,1,2,3,4,5]}
              onChange={v => { updateConfig('commonMN', v); if (v > 0) updateConfig('perProcessMN', 0); }}
              disabled={config.perProcessMN > 0} />
          </div>
          <div className={SECTION_CLS}>
            <span className={`font-bold ${M4_LABEL.EN} ${config.perProcessEN > 0 ? 'opacity-40' : ''}`}>EN</span>
            <NumSelect value={config.commonEN} options={[0,1,2,3,4,5]}
              onChange={v => { updateConfig('commonEN', v); if (v > 0) updateConfig('perProcessEN', 0); }}
              disabled={config.perProcessEN > 0} />
          </div>
          <span className="text-blue-300">|</span>
          <span className="text-blue-700 font-bold whitespace-nowrap">공정별:</span>
          <div className={SECTION_CLS}>
            <span className={`font-bold ${M4_LABEL.MN} ${config.commonMN > 0 ? 'opacity-40' : ''}`}>MN</span>
            <NumSelect value={config.perProcessMN} options={[0,1,2,3,4,5]}
              onChange={v => { updateConfig('perProcessMN', v); if (v > 0) updateConfig('commonMN', 0); }}
              disabled={config.commonMN > 0} />
          </div>
          <div className={SECTION_CLS}>
            <span className={`font-bold ${M4_LABEL.MC}`}>MC</span>
            <NumSelect value={config.perProcessMC} options={[0,1,2,3,4,5]} onChange={v => updateConfig('perProcessMC', v)} />
          </div>
          <div className={SECTION_CLS}>
            <span className={`font-bold ${M4_LABEL.IM}`}>IM</span>
            <NumSelect value={config.perProcessIM} options={[0,1,2,3,4,5]} onChange={v => updateConfig('perProcessIM', v)} />
          </div>
          <div className={SECTION_CLS}>
            <span className={`font-bold ${M4_LABEL.EN} ${config.commonEN > 0 ? 'opacity-40' : ''}`}>EN</span>
            <NumSelect value={config.perProcessEN} options={[0,1,2,3,4,5]}
              onChange={v => { updateConfig('perProcessEN', v); if (v > 0) updateConfig('commonEN', 0); }}
              disabled={config.commonEN > 0} />
          </div>
        </div>
      </div>

      {/* ── 미리보기 ── */}
      {generated && flatData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2">
          <div className="flex items-center gap-3 mb-2 text-[10px] text-gray-500">
            <span>공정 <b className="text-blue-700">{stats.processCount}</b></span>
            <span>L2(A) <b>{stats.aCount}</b></span>
            <span>L3(B) <b>{stats.bCount}</b></span>
            <span>L1(C) <b>{stats.cCount}</b></span>
            <span>합계 <b className="text-blue-700">{stats.total}</b></span>
            <span className="text-green-600 font-bold">A6/B5 제외 (경량)</span>
          </div>
          <div className="max-h-[300px] overflow-auto">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-blue-50">
                  <th className="border border-gray-300 px-1.5 py-1 text-center w-[50px]">공정No</th>
                  <th className="border border-gray-300 px-1.5 py-1">공정명 (A2)</th>
                  <th className="border border-gray-300 px-1.5 py-1">작업요소 (B1) [4M]</th>
                </tr>
              </thead>
              <tbody>
                {previewByProcess.map(([pNo, info]) => (
                  <tr key={pNo}>
                    <td className="border border-gray-200 px-1.5 py-0.5 text-center font-mono text-blue-600">{pNo}</td>
                    <td className="border border-gray-200 px-1.5 py-0.5">{info.a2}</td>
                    <td className="border border-gray-200 px-1.5 py-0.5">{info.b1s.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
