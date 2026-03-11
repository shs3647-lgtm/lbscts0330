/**
 * @file ImportInputSection.tsx
 * @description PFMEA Import 입력 섹션 (기초정보 + 분석데이터)
 * @author AI Assistant
 * @created 2026-01-21
 */

'use client';

import React from 'react';
import { tw } from '../tailwindClasses';
import { PREVIEW_OPTIONS } from '../sampleData';
import { ImportedFlatData } from '../types';

import type { TemplateMode } from '../hooks/useTemplateGenerator';

interface Props {
  partialItemCode: string;
  setPartialItemCode: (code: string) => void;
  setPreviewColumn: (col: string) => void;
  isPartialParsing: boolean;
  partialFileName: string;
  partialPendingData: ImportedFlatData[];
  partialFileInputRef: React.RefObject<HTMLInputElement | null>;
  onPartialFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPartialImport: () => void;
  validationMessage?: string | null;
  selectedFmeaId?: string;
  pendingData: ImportedFlatData[];  // 항목별 건수 표시용
  // ★ 2026-02-18: 템플릿 생성기
  templateMode?: TemplateMode;
  setTemplateMode?: (mode: TemplateMode) => void;
  onOpenTemplateConfig?: () => void;
  onTemplateGenerate?: () => void;
}

export function ImportInputSection(props: Props) {
  const {
    partialItemCode, setPartialItemCode, setPreviewColumn,
    isPartialParsing, partialFileName, partialPendingData,
    partialFileInputRef, onPartialFileSelect, onPartialImport,
    validationMessage, selectedFmeaId, pendingData,
    templateMode, setTemplateMode, onOpenTemplateConfig, onTemplateGenerate,
  } = props;

  return (
    <div className="mb-5 mt-4">
      <div className="max-w-[600px]">
        <h3 className="text-[15px] font-bold text-[#00587a] mb-1.5">FMEA Basic Data Import</h3>
        <div className={tw.tableWrapper}>
          <table className="w-full border-collapse table-fixed">
            <colgroup><col className="w-[90px]" /><col /><col className="w-20" /><col className="w-20" /></colgroup>
            <tbody>
              <tr>
                <td className={tw.rowHeader}>Item Import</td>
                <td className={tw.cell}>
                  <div className="flex items-center gap-2">
                    <select value={partialItemCode} onChange={(e) => { setPartialItemCode(e.target.value); setPreviewColumn(e.target.value); }} className="px-2 py-1 border border-gray-400 rounded text-[11px] bg-[#e0f2fb]">
                      {PREVIEW_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    {isPartialParsing && <span className="text-gray-400 text-[11px]">파싱 중...</span>}
                    {partialPendingData.length > 0 && <span className="text-yellow-700 text-[10px]">({partialPendingData.length}건)</span>}
                  </div>
                </td>
                <td className={tw.cellCenter}>
                  <label className="cursor-pointer">
                    <input type="file" accept=".xlsx,.xls" className="hidden" ref={partialFileInputRef} onClick={(e) => { (e.target as HTMLInputElement).value = ''; }} onChange={onPartialFileSelect} />
                    <span className="px-3 py-1 bg-gray-100 border border-gray-400 rounded cursor-pointer text-[11px]">찾아보기</span>
                  </label>
                </td>
                <td className={tw.cellCenter}>
                  <button onClick={onPartialImport} disabled={partialPendingData.length === 0} className={`w-full px-4 py-1.5 border-none rounded text-[11px] font-bold ${partialPendingData.length > 0 ? 'bg-green-500 text-white cursor-pointer' : 'bg-gray-300 text-white cursor-not-allowed'}`}>Import</button>
                </td>
              </tr>
              {/* ★ 2026-02-18: 템플릿 생성기 행 */}
              {onOpenTemplateConfig && (
                <tr>
                  <td className={tw.rowHeader} style={{ backgroundColor: '#e0f2fb', color: '#00587a' }}>Template</td>
                  <td className={tw.cell}>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 border border-gray-400 rounded text-[11px] bg-[#e0f2fb] font-bold">
                        수동 템플릿
                      </span>
                      <span className="text-[10px] text-gray-500">
                        공정수/4M 설정 → 빈 구조
                      </span>
                    </div>
                  </td>
                  <td className={tw.cellCenter}>
                    <button
                      onClick={onOpenTemplateConfig}
                      className="px-3 py-1 bg-gray-100 border border-gray-400 rounded cursor-pointer text-[11px] font-medium hover:bg-gray-200"
                    >
                      설정...
                    </button>
                  </td>
                  <td className={tw.cellCenter}>
                    <button
                      onClick={onTemplateGenerate}
                      className="w-full px-4 py-1.5 border-none rounded text-[11px] font-bold bg-blue-600 text-white cursor-pointer hover:bg-blue-700"
                    >
                      생성
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* ★ 2026-02-17: 파싱 후 항목별 데이터 건수 표시 (0건 = 적색, 누락 = 노란색) */}
        {pendingData.length > 0 && (() => {
          const counts: Record<string, number> = {};
          const allCodes = ['A1','A2','A3','A4','A5','A6','B1','B2','B3','B4','B5','C1','C2','C3','C4'];
          allCodes.forEach(c => { counts[c] = 0; });
          pendingData.forEach(d => { if (counts[d.itemCode] !== undefined) counts[d.itemCode]++; });
          const labels: Record<string, string> = {
            A1:'공정번호', A2:'공정명', A3:'공정기능', A4:'제품특성', A5:'고장형태', A6:'검출관리',
            B1:'작업요소', B2:'요소기능', B3:'공정특성', B4:'고장원인', B5:'예방관리',
            C1:'구분', C2:'제품기능', C3:'요구사항', C4:'고장영향',
          };
          const groups = [
            { label: 'L2', codes: ['A1','A2','A3','A4','A5','A6'] },
            { label: 'L3', codes: ['B1','B2','B3','B4','B5'] },
            { label: 'L1', codes: ['C1','C2','C3','C4'] },
          ];

          // ★ B1↔B2/B3 누락 계산
          const b1 = counts['B1'];
          const missingMap: Record<string, number> = {};
          if (b1 > 0 && counts['B2'] < b1) missingMap['B2'] = b1 - counts['B2'];
          if (b1 > 0 && counts['B3'] < b1) missingMap['B3'] = b1 - counts['B3'];
          // A4/C3 누락도 체크
          const a1 = counts['A1'];
          if (a1 > 0 && counts['A4'] === 0) missingMap['A4'] = a1;
          if (counts['C1'] > 0 && counts['C3'] === 0) missingMap['C3'] = counts['C1'];

          const totalMissing = Object.values(missingMap).reduce((s, v) => s + v, 0);

          return (
            <div className="mt-1 px-2 py-1.5 text-[10px] bg-gray-50 border border-gray-300 rounded">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-[11px] text-gray-700">📊 항목별 데이터 건수</span>
                {totalMissing > 0 && (
                  <span className="px-1.5 py-0.5 bg-yellow-300 text-yellow-900 text-[10px] font-bold rounded">
                    누락 {totalMissing}건
                  </span>
                )}
              </div>
              {groups.map(g => (
                <div key={g.label} className="flex items-center gap-0.5 mb-0.5">
                  <span className="w-6 font-bold text-gray-500">{g.label}</span>
                  {g.codes.map(code => {
                    const cnt = counts[code];
                    const isZero = cnt === 0;
                    const missing = missingMap[code] || 0;
                    const isMissing = missing > 0;
                    return (
                      <span key={code} className={`inline-block px-1 py-0.5 rounded border mr-0.5 ${
                        isZero
                          ? 'bg-red-50 text-red-600 border-red-300 font-bold'
                          : isMissing
                            ? 'bg-yellow-100 text-yellow-900 border-yellow-400 font-bold'
                            : 'bg-white text-gray-700 border-gray-200'
                      }`}>
                        {code}:{labels[code]} <b>{cnt}</b>
                        {isMissing && <span className="text-red-600 ml-0.5">(누락{missing})</span>}
                      </span>
                    );
                  })}
                </div>
              ))}
              {/* ★ 누락 안내 메시지 */}
              {totalMissing > 0 && (
                <div className="mt-1.5 px-2 py-1 bg-yellow-50 border border-yellow-300 rounded text-[10px] text-yellow-800 leading-relaxed">
                  <b>⚠️ 누락 항목 수정 후 재Import 권장</b>
                  {missingMap['B2'] && <div>• B2(요소기능): 작업요소 {b1}건 중 {missingMap['B2']}건 기능 미입력 → 엑셀에서 B2 보완 후 재Import</div>}
                  {missingMap['B3'] && <div>• B3(공정특성): {missingMap['B3']}건 누락 → STEP A Import로 보완 가능</div>}
                  {missingMap['A4'] && <div>• A4(제품특성): 전체 누락 → STEP A Import로 보완 가능</div>}
                  {missingMap['C3'] && <div>• C3(요구사항): 전체 누락 → STEP A Import로 보완 가능</div>}
                </div>
              )}
            </div>
          );
        })()}
        {/* ★ 2026-02-07: 파싱 검증 메시지 표시 */}
        {validationMessage && (
          <div className={`mt-1 px-2 py-1 text-[11px] rounded leading-relaxed ${
            validationMessage.startsWith('\u2705')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-yellow-50 text-yellow-800 border border-yellow-300'
          }`}>
            {validationMessage.split('\n').map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportInputSection;
