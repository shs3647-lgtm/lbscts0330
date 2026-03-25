/**
 * @file AutoTemplateInline.tsx
 * @description 자동 템플릿 인라인 UI — TemplateGeneratorPanel 좌측 패널용
 * 기존 BD에서 B1 작업요소 자동 추출 + multiplier 설정 + 생성 버튼
 * @created 2026-03-10
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import type { ImportedFlatData } from '../types';
import type { WorkElementInput } from '../utils/template-data-generator';
import { loadDatasetByFmeaId } from '../utils/master-api';

const SELECT_CLS = 'px-1.5 py-0.5 border border-gray-300 rounded text-[11px] bg-white';
const LABEL_CLS = 'text-[11px] text-blue-700 font-bold whitespace-nowrap';

interface AutoTemplateInlineProps {
  workElements: WorkElementInput[];
  multipliers: { b2: number; b3: number; b4: number; b5: number };
  addWorkElement: (el: Omit<WorkElementInput, 'id'>) => void;
  removeWorkElement: (id: string) => void;
  updateWorkElement: (id: string, field: keyof WorkElementInput, value: string) => void;
  updateMultiplier: (key: 'b2' | 'b3' | 'b4' | 'b5', value: number) => void;
  onGenerate: () => void;
  isSaving?: boolean;
  hasData: boolean;
  selectedFmeaId?: string;
}

export default function AutoTemplateInline({
  workElements, multipliers,
  addWorkElement, removeWorkElement, updateWorkElement, updateMultiplier,
  onGenerate, isSaving, hasData, selectedFmeaId,
}: AutoTemplateInlineProps) {
  const [autoLoaded, setAutoLoaded] = useState(false);

  // 기존 BD에서 B1 작업요소 자동 추출
  useEffect(() => {
    if (!selectedFmeaId || autoLoaded) return;
    (async () => {
      try {
        const loaded = await loadDatasetByFmeaId(selectedFmeaId);
        if (loaded.flatData.length > 0) {
          const b1Items = loaded.flatData.filter((d: ImportedFlatData) => d.itemCode === 'B1' && d.value?.trim());
          const extracted: Omit<WorkElementInput, 'id'>[] = b1Items.map((d: ImportedFlatData) => ({
            processNo: d.processNo,
            processName: loaded.flatData.find((a: ImportedFlatData) => a.processNo === d.processNo && a.itemCode === 'A2')?.value || '',
            m4: (d.m4 || 'MN') as 'MN' | 'MC' | 'IM' | 'EN',
            name: d.value,
          }));
          extracted.forEach(el => addWorkElement(el));
        }
        setAutoLoaded(true);
      } catch (e) {
        console.error('기존 데이터 로드 오류:', e);
        setAutoLoaded(true);
      }
    })();
  }, [selectedFmeaId, autoLoaded, addWorkElement]);

  const handleAddEmpty = useCallback(() => {
    addWorkElement({ processNo: '', processName: '', m4: 'MN', name: '' });
  }, [addWorkElement]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-blue-800">
          자동 — 작업요소 ({workElements.length}개)
        </span>
        <div className="flex items-center gap-1">
          <button onClick={handleAddEmpty}
            className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] hover:bg-gray-200 cursor-pointer">
            + 추가
          </button>
          <button
            onClick={onGenerate}
            disabled={isSaving || workElements.length === 0}
            className="px-3 py-1 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            {hasData ? '재생성' : '생성'}
          </button>
        </div>
      </div>

      {/* 작업요소 테이블 */}
      {workElements.length > 0 && (
        <div className="max-h-[150px] overflow-auto">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-blue-50">
                <th className="border border-gray-300 px-1 py-0.5 w-[45px]">공정No</th>
                <th className="border border-gray-300 px-1 py-0.5">공정명</th>
                <th className="border border-gray-300 px-1 py-0.5 w-[40px]">4M</th>
                <th className="border border-gray-300 px-1 py-0.5">작업요소명</th>
                <th className="border border-gray-300 px-1 py-0.5 w-[24px]"></th>
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
                    <select value={we.m4} onChange={e => updateWorkElement(we.id, 'm4', e.target.value)}
                      className="text-[9px] border-0 outline-none bg-transparent">
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
        <div className="text-center py-2 text-[10px] text-gray-400 border border-dashed border-gray-300 rounded">
          기존 BD에서 자동 추출 또는 [+ 추가]로 입력
        </div>
      )}

      {/* Multiplier 설정 */}
      <div className="flex items-center gap-2 text-[10px]">
        <span className={LABEL_CLS}>반복수:</span>
        {(['b2', 'b3', 'b4'] as const).map(key => (
          <div key={key} className="flex items-center gap-0.5">
            <span className="font-bold text-gray-600">{key.toUpperCase()}</span>
            <select value={multipliers[key]} onChange={e => updateMultiplier(key, Number(e.target.value))} className={SELECT_CLS}>
              {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
