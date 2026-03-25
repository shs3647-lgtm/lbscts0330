/**
 * @file ManualTemplateInline.tsx
 * @description 수동 템플릿 인라인 설정 UI — TemplateGeneratorPanel 좌측 패널용
 * 업종사례 + 공정설정 + 4M 행 수 + 생성 버튼
 * @created 2026-03-10
 */

'use client';

import React, { useCallback } from 'react';
import { INDUSTRY_LABELS } from '../utils/template-data-generator';
import type { ManualTemplateConfig, ExampleIndustry } from '../utils/template-data-generator';

const SELECT_CLS = 'px-1.5 py-0.5 border border-gray-300 rounded text-[11px] bg-white';
const LABEL_CLS = 'text-[11px] text-blue-700 font-bold whitespace-nowrap';
const SECTION_CLS = 'flex items-center gap-1';
const M4_LABEL: Record<string, string> = {
  MN: 'text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded',
  MC: 'text-blue-700 bg-blue-100 border border-blue-300 px-1.5 py-0.5 rounded',
  IM: 'text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded',
  EN: 'text-pink-700 bg-pink-100 border border-pink-300 px-1.5 py-0.5 rounded',
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

interface ManualTemplateInlineProps {
  config: ManualTemplateConfig;
  updateConfig: <K extends keyof ManualTemplateConfig>(key: K, value: ManualTemplateConfig[K]) => void;
  onGenerate: () => void;
  isSaving?: boolean;
  hasData: boolean;
}

export default function ManualTemplateInline({
  config, updateConfig, onGenerate, isSaving, hasData,
}: ManualTemplateInlineProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-blue-800">수동 템플릿 설정</span>
        <button
          onClick={onGenerate}
          disabled={isSaving}
          className="px-3 py-1 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
        >
          {hasData ? '재생성' : '생성'}
        </button>
      </div>

      {/* 설정 1행: 업종/공정수/번호 */}
      <div className="flex flex-wrap gap-x-2 gap-y-1 items-center">
        <div className={SECTION_CLS}>
          <span className={LABEL_CLS}>업종</span>
          <select value={config.exampleIndustry} onChange={e => updateConfig('exampleIndustry', e.target.value as ExampleIndustry)} className={`${SELECT_CLS} font-bold`}>
            {(Object.keys(INDUSTRY_LABELS) as ExampleIndustry[]).map(k => (
              <option key={k} value={k}>{INDUSTRY_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div className={SECTION_CLS}>
          <span className={LABEL_CLS}>공정</span>
          <NumSelect value={config.processCount} options={[1,2,3,5,10,15,20,30,50]} onChange={v => updateConfig('processCount', v)} />
        </div>
        <div className={SECTION_CLS}>
          <span className={LABEL_CLS}>번호</span>
          <select value={config.processNaming} onChange={e => updateConfig('processNaming', e.target.value as 'number' | 'alphabet')} className={SELECT_CLS}>
            <option value="number">10,20...</option>
            <option value="alphabet">A,B...</option>
          </select>
        </div>
      </div>

      {/* 설정 2행: 4M */}
      <div className="flex flex-wrap gap-x-1 gap-y-1 items-center text-[10px]">
        <span className="text-blue-700 font-bold">공통:</span>
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
        <span className="text-blue-700 font-bold">공정별:</span>
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

      {!hasData && (
        <div className="text-center py-2 text-[10px] text-gray-400 border border-dashed border-gray-300 rounded">
          설정 후 [생성] 클릭 → 3단계 검증 진행
        </div>
      )}
    </div>
  );
}
