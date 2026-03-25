/**
 * @file ImportRelationPanel.tsx
 * @description PFMEA Import 우측 관계형 데이터 패널
 * @author AI Assistant
 * @created 2026-01-21
 */

'use client';

import React from 'react';
import { ChevronUp, ChevronDown, GitCompare, Download } from 'lucide-react';
import { tw } from '../tailwindClasses';
import { ImportedFlatData } from '../types';

interface Props {
  flatData: ImportedFlatData[];
  relationData: any[];
  relationTab: 'A' | 'B' | 'C';
  setRelationTab: (tab: 'A' | 'B' | 'C') => void;
  setPreviewColumn: (col: string) => void;
  selectedRelationRows: Set<string>;
  stats: { aCount: number; bCount: number; cCount: number; processCount: number };
  currentFmeaId?: string;
  isAnalysisCompareMode: boolean;
  analysisDbData: ImportedFlatData[];
  analysisCellConfirms: Set<string>;
  onDownload: () => void;
  onAllDelete: () => void;
  onDeleteSelected: () => void;
  onSave: () => void;
  onRowSelect: (processNo: string) => void;
  onOpenFailurePopup: (processNo: string) => void;
  setFlatData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  onStartAnalysisCompare: () => void;
  onCancelAnalysisCompare: () => void;
  onSelectAllAnalysisConfirm: (checked: boolean) => void;
  onToggleAnalysisCellConfirm: (processNo: string, itemCode: string) => void;
  onAnalysisConfirmSave: () => void;
  isAnalysisCellChanged: (processNo: string, itemCode: string, value: string | undefined) => boolean;
  isAnalysisCellNew: (processNo: string, itemCode: string) => boolean;
}

export function ImportRelationPanel(props: Props) {
  const {
    flatData, relationData, relationTab, setRelationTab, setPreviewColumn,
    selectedRelationRows, stats, currentFmeaId, isAnalysisCompareMode, analysisDbData, analysisCellConfirms,
    onDownload, onAllDelete, onDeleteSelected, onSave, onRowSelect, onOpenFailurePopup,
    setFlatData, setDirty,
    onStartAnalysisCompare, onCancelAnalysisCompare, onSelectAllAnalysisConfirm,
    onToggleAnalysisCellConfirm, onAnalysisConfirmSave, isAnalysisCellChanged, isAnalysisCellNew,
  } = props;

  // 탭별 컬럼 헤더
  const getHeaders = () => {
    if (relationTab === 'A') return ['공정번호', '공정명', 'A3 기능', 'A4 특성', 'A5 고장형태'];
    if (relationTab === 'B') return ['공정번호', '작업요소', 'B2 기능', 'B3 특성', 'B4 고장원인'];
    return ['구분', '제품기능', 'C3 요구사항', 'C4 고장영향', '심각도'];
  };

  const getItemCodes = () => {
    if (relationTab === 'A') return ['A1', 'A2', 'A3', 'A4', 'A5'];
    if (relationTab === 'B') return ['A1', 'B1', 'B2', 'B3', 'B4'];
    return ['C1', 'C2', 'C3', 'C4'];
  };

  const isFailureCell = (key: string) => key === 'A5' || key === 'B4' || key === 'C4';

  return (
    <div className="flex-1 min-w-[500px] flex flex-col border-2 border-[#00587a] rounded-lg overflow-hidden bg-white shadow-lg">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-[#00587a] to-[#007a9e] text-white px-4 py-2.5 text-sm font-bold flex items-center justify-between">
        <div className="flex items-center gap-2 whitespace-nowrap"><span>📊</span> FMEA Analysis Data : {currentFmeaId || 'PFMEAID 미선택'}</div>
        <div className="flex items-center gap-2 text-[11px] font-normal">
          {flatData.length > 0 && (
            <>
              <span className="bg-blue-500/40 px-2 py-0.5 rounded whitespace-nowrap">L2: <b className="text-blue-200">{stats.aCount}</b></span>
              <span className="bg-green-500/40 px-2 py-0.5 rounded whitespace-nowrap">L3: <b className="text-green-200">{stats.bCount}</b></span>
              <span className="bg-orange-500/40 px-2 py-0.5 rounded whitespace-nowrap">L1: <b className="text-orange-200">{stats.cCount}</b></span>
              <span className="bg-white/20 px-2 py-0.5 rounded whitespace-nowrap">공정: <b className="text-yellow-300">{stats.processCount}</b></span>
            </>
          )}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col">
        {/* 탭 + 버튼 */}
        <div className="flex w-full border-b border-gray-400 shrink-0">
          <select value={relationTab} onChange={(e) => setRelationTab(e.target.value as 'A' | 'B' | 'C')} className="flex-1 min-w-[120px] px-2 py-1.5 border-none font-bold bg-[#e0f2fb] text-[#00587a] text-[10px]" disabled={isAnalysisCompareMode}>
            <option value="A">고장형태 분석(2L)</option>
            <option value="B">고장원인 분석(3L)</option>
            <option value="C">고장영향 분석(1L)</option>
          </select>
          {isAnalysisCompareMode ? (
            <>
              <button onClick={() => onSelectAllAnalysisConfirm(analysisCellConfirms.size === 0)} className="px-1.5 py-1.5 bg-purple-100 text-purple-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[10px] whitespace-nowrap">
                {analysisCellConfirms.size > 0 ? '해제' : '전체'}
              </button>
              <button onClick={onAnalysisConfirmSave} className="px-1.5 py-1.5 bg-green-500 text-white border-none border-l border-gray-400 cursor-pointer font-bold text-[10px] whitespace-nowrap">확정({analysisCellConfirms.size})</button>
              <button onClick={onCancelAnalysisCompare} className="px-1.5 py-1.5 bg-gray-500 text-white border-none border-l border-gray-400 cursor-pointer font-bold text-[10px] whitespace-nowrap">취소</button>
            </>
          ) : (
            <>
              <button onClick={onDownload} className="px-1.5 py-1.5 bg-blue-50 text-blue-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[10px] whitespace-nowrap flex items-center gap-0.5" title="다운로드"><Download size={10} />다운로드</button>
              <button onClick={onAllDelete} className="px-1.5 py-1.5 bg-red-50 text-red-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[10px] whitespace-nowrap">All Del.</button>
              <button onClick={onDeleteSelected} className="px-1.5 py-1.5 bg-yellow-100 text-yellow-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[10px] whitespace-nowrap">Del.</button>
              <button onClick={onSave} className="px-1.5 py-1.5 bg-purple-500 text-white border-none border-l border-gray-400 cursor-pointer font-bold text-[10px] whitespace-nowrap hover:bg-purple-600">저장</button>
              <div className="w-[1px] bg-gray-400 self-stretch shrink-0" />
              <button onClick={onStartAnalysisCompare} className="px-1.5 py-1.5 bg-blue-100 text-blue-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[10px] flex items-center gap-0.5 whitespace-nowrap"><GitCompare className="w-3 h-3" />비교</button>
            </>
          )}
        </div>

        {/* 테이블 - 분석 완료 전에는 안내 메시지 표시 */}
        <div className="flex-1 overflow-y-auto max-h-[350px] border-t border-gray-200 bg-gray-50">
          {/* 분석 미완료 상태: 안내 메시지 표시 */}
          {relationData.length === 0 && flatData.length > 0 && (
            <div className="flex flex-col items-center justify-center h-full py-16 text-gray-500">
              <div className="text-4xl mb-4">🔒</div>
              <div className="text-sm font-bold mb-2">분석 완료 후 데이터가 표시됩니다</div>
              <div className="text-[10px] text-gray-400 text-center px-4">
                구조분석 → 기능분석 → 고장분석이<br/>
                완료되면 관계성 데이터가 표시됩니다
              </div>
            </div>
          )}
          
          {/* 기초정보 없음 상태 */}
          {flatData.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400">
              <div className="text-4xl mb-4">📊</div>
              <div className="text-sm font-bold mb-2">Basic Data를 먼저 Import하세요</div>
              <div className="text-[10px] text-gray-400">
                좌측에서 엑셀 파일을 업로드해주세요
              </div>
            </div>
          )}
          
          {/* 분석 완료 후 테이블 표시 */}
          {relationData.length > 0 && (
          <table className="w-full border-collapse table-fixed">
            <colgroup><col className="w-[25px]" /><col className="w-[35px]" /><col className="w-[35px]" /><col className="w-[50px]" /><col className="w-20" /><col className="w-[35%]" /><col className="w-[15%]" /><col className="w-[15%]" /></colgroup>
            <thead className="sticky top-0 z-[1]">
              <tr>
                <th className={`${tw.headerCell} break-words`}><input type="checkbox" /></th>
                <th className={`${tw.headerCell} break-words`}>NO</th>
                <th className={`${tw.headerCell} break-words`}>순서</th>
                {getHeaders().map((h, i) => <th key={i} className={`${tw.headerCell} break-words`}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {relationData.map((row, i) => {
                  const keys = Object.keys(row).filter(k => !k.startsWith('_'));
                  const actualProcessNo = (row as any)._processNo || row.A1 || String(i + 1);
                  const itemCodes = getItemCodes();

                  return (
                    <tr key={i} className={selectedRelationRows.has(actualProcessNo) ? 'bg-orange-50' : 'bg-white'}>
                      <td className={tw.cellCenter}>
                        <input type="checkbox" checked={selectedRelationRows.has(actualProcessNo)} onChange={() => onRowSelect(actualProcessNo)} className="cursor-pointer" />
                      </td>
                      <td className={tw.cellCenter}>{i + 1}</td>
                      <td className={`${tw.cellCenter} align-middle`}>
                        <div className="flex flex-col items-center justify-center gap-0">
                          <ChevronUp className="w-2.5 h-2.5 text-gray-500" />
                          <ChevronDown className="w-2.5 h-2.5 text-gray-500" />
                        </div>
                      </td>
                      {keys.slice(0, 5).map((key, j) => {
                        const val = row[key as keyof typeof row];
                        const itemCode = itemCodes[j] || key;
                        const cellKey = `${actualProcessNo}-${itemCode}`;
                        const isFailure = isFailureCell(key);

                        if (isAnalysisCompareMode) {
                          const isChanged = isAnalysisCellChanged(actualProcessNo, itemCode, val);
                          const isNew = isAnalysisCellNew(actualProcessNo, itemCode);
                          const isConfirmed = analysisCellConfirms.has(cellKey);

                          let cellBgClass = '';
                          if (isConfirmed) cellBgClass = 'bg-purple-100 ring-2 ring-purple-400 ring-inset';
                          else if (isNew) cellBgClass = 'bg-green-100';
                          else if (isChanged) cellBgClass = 'bg-yellow-200';

                          return (
                            <td key={j} className={`${tw.cellPad} ${cellBgClass} cursor-pointer transition-colors hover:brightness-95 ${isFailure ? 'hover:bg-orange-100' : ''}`}
                              onClick={() => {
                                if (isFailure) { setPreviewColumn(itemCode); onOpenFailurePopup(actualProcessNo); }
                                else if (isChanged || isNew) onToggleAnalysisCellConfirm(actualProcessNo, itemCode);
                                else setPreviewColumn(itemCode);
                              }}>
                              {val ? (
                                <span className={`break-words whitespace-normal leading-tight block px-1 py-0.5 ${isChanged || isNew ? 'font-bold' : ''} ${isFailure ? 'text-orange-700 underline cursor-pointer' : ''}`}>
                                  {isConfirmed && <span className="text-purple-600 mr-1">✓</span>}{val}
                                </span>
                              ) : isFailure ? <span className="text-orange-400 text-[10px] cursor-pointer hover:text-orange-600 underline">[선택]</span> : <span className="text-gray-300 text-[10px]">-</span>}
                            </td>
                          );
                        }

                        // 일반 모드
                        return (
                          <td key={j} className={`${tw.cellPad} ${isFailure ? 'cursor-pointer hover:bg-orange-100 transition-colors' : 'cursor-pointer hover:bg-gray-50'}`}
                            onClick={() => { if (isFailure) { setPreviewColumn(key); onOpenFailurePopup(actualProcessNo); } else setPreviewColumn(key); }}>
                            {val ? (
                              <span className={`break-words whitespace-normal leading-tight block px-1 py-0.5 ${isFailure ? 'text-orange-700 underline cursor-pointer' : ''}`}>{val}</span>
                            ) : isFailure ? <span className="text-orange-400 text-[10px] cursor-pointer hover:text-orange-600 underline">[선택]</span> : (
                              <input type="text" placeholder="입력" className={tw.input} onBlur={(e) => {
                                if (e.target.value) {
                                  const processNo = row.A1 || (row as any).C1 || String(i + 1);
                                  const newData: ImportedFlatData = {
                                    id: `edit-${Date.now()}-${i}-${j}`,
                                    processNo: String(processNo),
                                    category: key.startsWith('A') ? 'A' : key.startsWith('B') ? 'B' : 'C',
                                    itemCode: key,
                                    value: e.target.value,
                                    createdAt: new Date(),
                                  };
                                  setFlatData(prev => [...prev, newData]);
                                  setDirty(true);
                                }
                              }} />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
            </tbody>
          </table>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-4 h-[28px] flex items-center justify-center bg-gradient-to-br from-[#e0f2fb] to-gray-100 border-t-2 border-gray-800 text-[11px] text-gray-700 shrink-0 font-bold">
          ▼ 총 {relationData.length}건 ━━ 데이터 끝 ━━ ▼
        </div>
      </div>
    </div>
  );
}

export default ImportRelationPanel;
