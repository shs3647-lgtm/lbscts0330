/**
 * @file TemplateConfigModal.tsx
 * @description 템플릿 설정 모달 (수동/자동 모드 공용)
 * @created 2026-02-18
 */

'use client';

import React, { useState } from 'react';
import type { ManualTemplateConfig, WorkElementInput } from '../utils/template-data-generator';
import type { TemplateMode } from '../hooks/useTemplateGenerator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: () => void;

  templateMode: TemplateMode;
  setTemplateMode: (mode: TemplateMode) => void;
  manualConfig: ManualTemplateConfig;
  updateManualConfig: <K extends keyof ManualTemplateConfig>(key: K, value: ManualTemplateConfig[K]) => void;

  workElements: WorkElementInput[];
  multipliers: { b2: number; b3: number; b4: number; b5: number };
  updateMultiplier: (key: 'b2' | 'b3' | 'b4' | 'b5', value: number) => void;
  addWorkElement: (el: Omit<WorkElementInput, 'id'>) => void;
  removeWorkElement: (id: string) => void;
  updateWorkElement: (id: string, field: keyof WorkElementInput, value: string) => void;
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
    templateMode, setTemplateMode,
    manualConfig, updateManualConfig,
    workElements, multipliers, updateMultiplier,
    addWorkElement, removeWorkElement, updateWorkElement,
  } = props;

  // 작업요소 입력용 임시 상태
  const [newProcessNo, setNewProcessNo] = useState('');
  const [newProcessName, setNewProcessName] = useState('');
  const [newM4, setNewM4] = useState<'MN' | 'MC' | 'IM' | 'EN'>('MC');
  const [newName, setNewName] = useState('');

  if (!isOpen) return null;

  const handleAddWorkElement = () => {
    if (!newProcessNo.trim() || !newName.trim()) return;
    addWorkElement({
      processNo: newProcessNo.trim(),
      processName: newProcessName.trim(),
      m4: newM4,
      name: newName.trim(),
    });
    setNewName('');
  };

  // B1 예상 행 수 계산
  const b1RowCount = templateMode === 'auto'
    ? workElements.length
    : (manualConfig.commonMN + manualConfig.commonEN) +
      manualConfig.processCount * (manualConfig.perProcessMN + manualConfig.perProcessMC + manualConfig.perProcessIM + manualConfig.perProcessEN);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl flex flex-col"
        style={{ width: templateMode === 'auto' ? 700 : 500, maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-[#00587a] to-[#007a9e] text-white px-4 py-2.5 rounded-t-lg flex items-center justify-between">
          <span className="font-bold text-sm">템플릿 설정</span>
          <button onClick={onClose} className="text-white/70 hover:text-white text-lg leading-none cursor-pointer">&times;</button>
        </div>

        {/* 모드 탭 */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setTemplateMode('manual')}
            className={`flex-1 py-2 text-xs font-bold border-b-2 cursor-pointer ${
              templateMode === 'manual' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            ② 수동 템플릿
          </button>
          <button
            onClick={() => setTemplateMode('auto')}
            className={`flex-1 py-2 text-xs font-bold border-b-2 cursor-pointer ${
              templateMode === 'auto' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            ③ 자동 템플릿
          </button>
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

          {/* ③ 자동 모드: 작업요소 입력 */}
          {templateMode === 'auto' && (
            <div className="mb-4">
              <div className="text-xs font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">
                작업요소 입력 ({workElements.length}건)
              </div>

              {/* 입력 행 */}
              <div className="flex gap-1 mb-2 items-end">
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-500">공정번호</span>
                  <input
                    value={newProcessNo}
                    onChange={e => setNewProcessNo(e.target.value)}
                    placeholder="10"
                    className="w-[50px] px-1 py-1 border border-gray-300 rounded text-[11px]"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-500">공정명</span>
                  <input
                    value={newProcessName}
                    onChange={e => setNewProcessName(e.target.value)}
                    placeholder="컷팅"
                    className="w-[70px] px-1 py-1 border border-gray-300 rounded text-[11px]"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-500">4M</span>
                  <select value={newM4} onChange={e => setNewM4(e.target.value as 'MN' | 'MC' | 'IM' | 'EN')} className="w-[50px] px-1 py-1 border border-gray-300 rounded text-[11px]">
                    <option value="MN">MN</option>
                    <option value="MC">MC</option>
                    <option value="IM">IM</option>
                    <option value="EN">EN</option>
                  </select>
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-[9px] text-gray-500">작업요소명</span>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddWorkElement()}
                    placeholder="예: Cutting MC"
                    className="w-full px-1 py-1 border border-gray-300 rounded text-[11px]"
                  />
                </div>
                <button
                  onClick={handleAddWorkElement}
                  disabled={!newProcessNo.trim() || !newName.trim()}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700 disabled:bg-gray-300 cursor-pointer disabled:cursor-not-allowed shrink-0"
                >
                  추가
                </button>
              </div>

              {/* 목록 */}
              {workElements.length > 0 && (
                <div className="max-h-[160px] overflow-y-auto border border-gray-200 rounded">
                  <table className="w-full text-[11px] border-collapse">
                    <thead className="sticky top-0 bg-gray-100">
                      <tr>
                        <th className="border-b border-gray-300 px-1.5 py-1 text-center w-7">No</th>
                        <th className="border-b border-gray-300 px-1.5 py-1 text-center w-12">공정</th>
                        <th className="border-b border-gray-300 px-1.5 py-1 text-left w-16">공정명</th>
                        <th className="border-b border-gray-300 px-1.5 py-1 text-center w-9">4M</th>
                        <th className="border-b border-gray-300 px-1.5 py-1 text-left">작업요소</th>
                        <th className="border-b border-gray-300 px-1.5 py-1 text-center w-7"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {workElements.map((w, i) => (
                        <tr key={w.id} className="hover:bg-gray-50">
                          <td className="border-b border-gray-100 px-1.5 py-0.5 text-center text-gray-500">{i + 1}</td>
                          <td className="border-b border-gray-100 px-1.5 py-0.5 text-center">
                            <input value={w.processNo} onChange={e => updateWorkElement(w.id, 'processNo', e.target.value)} className="w-full text-center border-0 bg-transparent text-[11px]" />
                          </td>
                          <td className="border-b border-gray-100 px-1.5 py-0.5">
                            <input value={w.processName} onChange={e => updateWorkElement(w.id, 'processName', e.target.value)} className="w-full border-0 bg-transparent text-[11px]" />
                          </td>
                          <td className="border-b border-gray-100 px-1.5 py-0.5 text-center">
                            <select value={w.m4} onChange={e => updateWorkElement(w.id, 'm4', e.target.value)} className="border-0 bg-transparent text-[10px] font-bold text-center">
                              <option value="MN">MN</option>
                              <option value="MC">MC</option>
                              <option value="IM">IM</option>
                              <option value="EN">EN</option>
                            </select>
                          </td>
                          <td className="border-b border-gray-100 px-1.5 py-0.5">
                            <input value={w.name} onChange={e => updateWorkElement(w.id, 'name', e.target.value)} className="w-full border-0 bg-transparent text-[11px]" />
                          </td>
                          <td className="border-b border-gray-100 px-1.5 py-0.5 text-center">
                            <button onClick={() => removeWorkElement(w.id)} className="text-red-400 hover:text-red-600 cursor-pointer text-xs">&times;</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* B2~B5 배수 설정 */}
              <div className="mt-3">
                <div className="text-[10px] text-gray-500 font-bold mb-1">B2~B5 행 배수 (작업요소당)</div>
                <div className="flex gap-3">
                  {(['b2', 'b3', 'b4', 'b5'] as const).map(key => (
                    <div key={key} className={SECTION_CLS}>
                      <span className="text-[10px] text-gray-600 font-bold">{key.toUpperCase()}</span>
                      <NumSelect value={multipliers[key]} options={[1,2,3]} onChange={v => updateMultiplier(key, v)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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
            {templateMode === 'manual' ? '② 수동: 빈 구조 생성' : `③ 자동: 작업요소 ${workElements.length}건 + B1 완성`}
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
