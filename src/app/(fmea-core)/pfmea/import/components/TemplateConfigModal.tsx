/**
 * @file TemplateConfigModal.tsx
 * @description 템플릿 설정 모달 (수동 모드)
 * @created 2026-02-18
 */

'use client';

import React from 'react';
import type { ManualTemplateConfig } from '../utils/template-data-generator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: () => void;
  manualConfig: ManualTemplateConfig;
  updateManualConfig: <K extends keyof ManualTemplateConfig>(key: K, value: ManualTemplateConfig[K]) => void;
}

const SELECT_CLS = 'px-2 py-1 border border-gray-300 rounded text-[11px] bg-white';
const LABEL_CLS = 'text-[11px] text-gray-700 font-medium whitespace-nowrap';
const SECTION_CLS = 'flex items-center gap-2';

/** 숫자 드랍다운 옵션 */
function NumSelect({ value, options, onChange }: { value: number; options: number[]; onChange: (v: number) => void }) {
  return (
    <select value={value} onChange={e => onChange(Number(e.target.value))} className={SELECT_CLS}>
      {options.map(n => <option key={n} value={n}>{n}</option>)}
    </select>
  );
}

export function TemplateConfigModal(props: Props) {
  const {
    isOpen, onClose, onGenerate,
    manualConfig, updateManualConfig,
  } = props;

  if (!isOpen) return null;

  // B1 예상 행 수 계산
  const b1RowCount = (manualConfig.commonMN + manualConfig.commonEN) +
    manualConfig.processCount * (manualConfig.perProcessMN + manualConfig.perProcessMC + manualConfig.perProcessIM + manualConfig.perProcessEN);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl flex flex-col"
        style={{ width: 500, maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-[#00587a] to-[#007a9e] text-white px-4 py-2.5 rounded-t-lg flex items-center justify-between">
          <span className="font-bold text-sm">템플릿 설정</span>
          <button onClick={onClose} className="text-white/70 hover:text-white text-lg leading-none cursor-pointer">&times;</button>
        </div>

        {/* 모드 표시 */}
        <div className="flex border-b border-gray-200">
          <div className="flex-1 py-2 text-xs font-bold border-b-2 border-blue-600 text-blue-700 bg-blue-50 text-center">
            수동 템플릿
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 공통 설정 (수동/자동 모두) */}
          <div className="mb-4">
            <div className="text-xs font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">공정 설정</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div className={SECTION_CLS}>
                <span className={LABEL_CLS}>공정 개수</span>
                <NumSelect value={manualConfig.processCount} options={[1,2,3,5,10,15,20,30,50]} onChange={v => updateManualConfig('processCount', v)} />
              </div>
              <div className={SECTION_CLS}>
                <span className={LABEL_CLS}>공정번호 표기</span>
                <select value={manualConfig.processNaming} onChange={e => updateManualConfig('processNaming', e.target.value as 'number' | 'alphabet')} className={SELECT_CLS}>
                  <option value="number">숫자 (10,20,30...)</option>
                  <option value="alphabet">알파벳 (A,B,C...)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4M 설정 */}
          <div className="mb-4">
            <div className="text-xs font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">4M 행 수 설정</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <div className="text-[10px] text-gray-500 font-bold mb-1">공통 (00공정)</div>
                <div className="flex gap-3">
                  <div className={SECTION_CLS}>
                    <span className="text-[10px] px-1 bg-red-100 text-red-700 rounded font-bold">MN</span>
                    <NumSelect value={manualConfig.commonMN} options={[0,1,2,3]} onChange={v => updateManualConfig('commonMN', v)} />
                  </div>
                  <div className={SECTION_CLS}>
                    <span className="text-[10px] px-1 bg-pink-100 text-pink-700 rounded font-bold">EN</span>
                    <NumSelect value={manualConfig.commonEN} options={[0,1,2,3]} onChange={v => updateManualConfig('commonEN', v)} />
                  </div>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 font-bold mb-1">공정별</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className={SECTION_CLS}>
                    <span className="text-[10px] px-1 bg-red-100 text-red-700 rounded font-bold">MN</span>
                    <NumSelect value={manualConfig.perProcessMN} options={[0,1,2,3]} onChange={v => updateManualConfig('perProcessMN', v)} />
                  </div>
                  <div className={SECTION_CLS}>
                    <span className="text-[10px] px-1 bg-blue-100 text-blue-700 rounded font-bold">MC</span>
                    <NumSelect value={manualConfig.perProcessMC} options={[0,1,2,3]} onChange={v => updateManualConfig('perProcessMC', v)} />
                  </div>
                  <div className={SECTION_CLS}>
                    <span className="text-[10px] px-1 bg-orange-100 text-orange-700 rounded font-bold">IM</span>
                    <NumSelect value={manualConfig.perProcessIM} options={[0,1,2]} onChange={v => updateManualConfig('perProcessIM', v)} />
                  </div>
                  <div className={SECTION_CLS}>
                    <span className="text-[10px] px-1 bg-pink-100 text-pink-700 rounded font-bold">EN</span>
                    <NumSelect value={manualConfig.perProcessEN} options={[0,1,2]} onChange={v => updateManualConfig('perProcessEN', v)} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 예상 요약 */}
          <div className="bg-gray-50 border border-gray-200 rounded p-2.5 text-[11px]">
            <div className="font-bold text-gray-700 mb-1">예상 생성 결과</div>
            <div className="grid grid-cols-3 gap-1 text-gray-600">
              <span>A시트(공정): <b className="text-blue-700">{manualConfig.processCount}행</b></span>
              <span>B1(작업요소): <b className="text-green-700">{b1RowCount}행</b></span>
              <span>C시트(완제품): <b className="text-orange-700">3행</b></span>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center">
          <span className="text-[10px] text-gray-500">
            수동: 빈 구조 생성
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded text-xs font-bold hover:bg-gray-300 cursor-pointer">취소</button>
            <button
              onClick={onGenerate}
              className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 cursor-pointer"
            >
              생성
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TemplateConfigModal;
