/**
 * @file FailureChainPopup.tsx
 * @description Step 3: 고장 인과관계 지정 팝업
 * @author AI Assistant
 * @created 2025-12-26
 * 
 * 고장원인(FC) → 고장형태(FM) → 고장영향(FE)
 * 인과관계 체인을 사용자가 직접 지정
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Link2, ArrowRight, Check, Trash2, AlertTriangle } from 'lucide-react';
import { 
  ImportedFlatData, 
  FailureChain,
  FAILURE_ITEM_CODES 
} from './types';

interface FailureChainPopupProps {
  isOpen: boolean;
  onClose: () => void;
  processNo: string;
  processName: string;
  flatData: ImportedFlatData[];
  existingChains: FailureChain[];
  onSaveChain: (chain: FailureChain) => void;
  onDeleteChain: (chainId: string) => void;
}

export default function FailureChainPopup({
  isOpen,
  onClose,
  processNo,
  processName,
  flatData,
  existingChains,
  onSaveChain,
  onDeleteChain,
}: FailureChainPopupProps) {
  // 선택 상태
  const [selectedFC, setSelectedFC] = useState<string>('');
  const [selectedFM, setSelectedFM] = useState<string>('');
  const [selectedFE, setSelectedFE] = useState<string>('');
  const [selectedPC, setSelectedPC] = useState<string>('');
  const [selectedDC, setSelectedDC] = useState<string>('');

  // 현재 공정의 고장원인 (B4)
  const fcItems = useMemo(() => 
    flatData.filter(d => d.processNo === processNo && d.itemCode === 'B4'),
    [flatData, processNo]
  );

  // 현재 공정의 고장형태 (A5)
  const fmItems = useMemo(() => 
    flatData.filter(d => d.processNo === processNo && d.itemCode === 'A5'),
    [flatData, processNo]
  );

  // 고장영향 (C4) - 전체 공통
  const feItems = useMemo(() => 
    flatData.filter(d => d.itemCode === 'C4'),
    [flatData]
  );

  // 예방관리 (B5)
  const pcItems = useMemo(() => 
    flatData.filter(d => d.processNo === processNo && d.itemCode === 'B5'),
    [flatData, processNo]
  );

  // 검출관리 (A6)
  const dcItems = useMemo(() => 
    flatData.filter(d => d.processNo === processNo && d.itemCode === 'A6'),
    [flatData, processNo]
  );

  // 현재 공정의 체인만
  const processChains = useMemo(() =>
    existingChains.filter(c => {
      const fm = flatData.find(d => d.id === c.failureModeId);
      return fm?.processNo === processNo;
    }),
    [existingChains, flatData, processNo]
  );

  // 연결 버튼 클릭
  const handleConnect = () => {
    if (!selectedFC || !selectedFM || !selectedFE) return;

    const chain: FailureChain = {
      id: `${Date.now()}`,
      failureCauseId: selectedFC,
      failureModeId: selectedFM,
      failureEffectId: selectedFE,
      preventionCtrlId: selectedPC || undefined,
      detectionCtrlId: selectedDC || undefined,
      createdAt: new Date(),
      createdBy: 'user',
    };

    onSaveChain(chain);
    // 선택 초기화
    setSelectedFC('');
    setSelectedPC('');
    setSelectedDC('');
  };

  // 라벨 가져오기
  const getLabel = (id: string) => {
    const item = flatData.find(d => d.id === id);
    return item?.value || id;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[1100px] max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="bg-orange-500 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            <div>
              <h2 className="text-lg font-bold">Step 3: 고장 인과관계 지정</h2>
              <p className="text-sm opacity-80">공정: {processNo} - {processName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* 인과관계 다이어그램 */}
          <div className="bg-orange-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="text-center">
                <div className="px-4 py-2 bg-orange-600 text-white rounded font-bold">고장원인 (FC)</div>
                <div className="text-xs text-gray-500 mt-1">B4</div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-500" />
              <div className="text-center">
                <div className="px-4 py-2 bg-red-500 text-white rounded font-bold">고장형태 (FM)</div>
                <div className="text-xs text-gray-500 mt-1">A5</div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-500" />
              <div className="text-center">
                <div className="px-4 py-2 bg-red-700 text-white rounded font-bold">고장영향 (FE)</div>
                <div className="text-xs text-gray-500 mt-1">C4</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-16 mt-3 text-xs text-gray-600">
              <div className="text-center">
                <span className="text-green-600 font-bold">예방관리 (PC)</span>
                <div className="text-gray-400">B5</div>
              </div>
              <div className="text-center">
                <span className="text-blue-600 font-bold">검출관리 (DC)</span>
                <div className="text-gray-400">A6</div>
              </div>
            </div>
          </div>

          {/* 선택 영역 */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* 고장원인 (FC) */}
            <div>
              <h3 className="text-sm font-bold text-orange-600 mb-2 flex items-center gap-2">
                <Badge className="bg-orange-600">FC</Badge> 고장원인 (B4)
              </h3>
              <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                {fcItems.length === 0 ? (
                  <p className="p-4 text-gray-500 text-sm text-center">데이터 없음</p>
                ) : (
                  fcItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedFC(item.id)}
                      className={`w-full px-3 py-2 text-left text-sm border-b border-gray-100 last:border-0 transition-colors ${
                        selectedFC === item.id
                          ? 'bg-orange-500 text-white'
                          : 'hover:bg-orange-50'
                      }`}
                    >
                      {item.value}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* 고장형태 (FM) */}
            <div>
              <h3 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-2">
                <Badge className="bg-red-500">FM</Badge> 고장형태 (A5)
              </h3>
              <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                {fmItems.length === 0 ? (
                  <p className="p-4 text-gray-500 text-sm text-center">데이터 없음</p>
                ) : (
                  fmItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedFM(item.id)}
                      className={`w-full px-3 py-2 text-left text-sm border-b border-gray-100 last:border-0 transition-colors ${
                        selectedFM === item.id
                          ? 'bg-red-500 text-white'
                          : 'hover:bg-red-50'
                      }`}
                    >
                      {item.value}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* 고장영향 (FE) */}
            <div>
              <h3 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                <Badge className="bg-red-700">FE</Badge> 고장영향 (C4)
              </h3>
              <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                {feItems.length === 0 ? (
                  <p className="p-4 text-gray-500 text-sm text-center">데이터 없음</p>
                ) : (
                  feItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedFE(item.id)}
                      className={`w-full px-3 py-2 text-left text-sm border-b border-gray-100 last:border-0 transition-colors ${
                        selectedFE === item.id
                          ? 'bg-red-700 text-white'
                          : 'hover:bg-red-50'
                      }`}
                    >
                      {item.value}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 관리방법 선택 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* 예방관리 (PC) */}
            <div>
              <h3 className="text-sm font-bold text-green-600 mb-2 flex items-center gap-2">
                <Badge className="bg-green-600">PC</Badge> 예방관리 (B5) - 선택
              </h3>
              <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                {pcItems.length === 0 ? (
                  <p className="p-3 text-gray-500 text-xs text-center">데이터 없음</p>
                ) : (
                  pcItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedPC(selectedPC === item.id ? '' : item.id)}
                      className={`w-full px-3 py-2 text-left text-sm border-b border-gray-100 last:border-0 transition-colors ${
                        selectedPC === item.id
                          ? 'bg-green-500 text-white'
                          : 'hover:bg-green-50'
                      }`}
                    >
                      {item.value}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* 검출관리 (DC) */}
            <div>
              <h3 className="text-sm font-bold text-blue-600 mb-2 flex items-center gap-2">
                <Badge className="bg-blue-600">DC</Badge> 검출관리 (A6) - 선택
              </h3>
              <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                {dcItems.length === 0 ? (
                  <p className="p-3 text-gray-500 text-xs text-center">데이터 없음</p>
                ) : (
                  dcItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedDC(selectedDC === item.id ? '' : item.id)}
                      className={`w-full px-3 py-2 text-left text-sm border-b border-gray-100 last:border-0 transition-colors ${
                        selectedDC === item.id
                          ? 'bg-blue-500 text-white'
                          : 'hover:bg-blue-50'
                      }`}
                    >
                      {item.value}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 연결 버튼 */}
          <div className="flex justify-center mb-6">
            <Button
              onClick={handleConnect}
              disabled={!selectedFC || !selectedFM || !selectedFE}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8"
            >
              <Link2 className="h-4 w-4 mr-2" />
              인과관계 연결 (FC → FM → FE)
            </Button>
          </div>

          {/* 기존 체인 목록 */}
          {processChains.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-[#00587a] mb-3">
                연결된 인과관계 ({processChains.length}개)
              </h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="bg-orange-600 text-white px-3 py-2 text-left border border-gray-400">고장원인 (FC)</th>
                    <th className="bg-[#00587a] text-white px-3 py-2 text-center w-8 border border-gray-400"></th>
                    <th className="bg-red-500 text-white px-3 py-2 text-left border border-gray-400">고장형태 (FM)</th>
                    <th className="bg-[#00587a] text-white px-3 py-2 text-center w-8 border border-gray-400"></th>
                    <th className="bg-red-700 text-white px-3 py-2 text-left border border-gray-400">고장영향 (FE)</th>
                    <th className="bg-green-600 text-white px-3 py-2 text-left border border-gray-400">예방(PC)</th>
                    <th className="bg-blue-600 text-white px-3 py-2 text-left border border-gray-400">검출(DC)</th>
                    <th className="bg-[#00587a] text-white px-3 py-2 text-center w-12 border border-gray-400">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {processChains.map((chain, idx) => (
                    <tr key={chain.id}>
                      <td className={`px-3 py-2 border border-gray-400 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`}>
                        {getLabel(chain.failureCauseId)}
                      </td>
                      <td className={`px-3 py-2 text-center border border-gray-400 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`}>
                        <ArrowRight className="h-3 w-3 inline text-gray-400" />
                      </td>
                      <td className={`px-3 py-2 border border-gray-400 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`}>
                        {getLabel(chain.failureModeId)}
                      </td>
                      <td className={`px-3 py-2 text-center border border-gray-400 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`}>
                        <ArrowRight className="h-3 w-3 inline text-gray-400" />
                      </td>
                      <td className={`px-3 py-2 border border-gray-400 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`}>
                        {getLabel(chain.failureEffectId)}
                      </td>
                      <td className={`px-3 py-2 text-xs border border-gray-400 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`}>
                        {chain.preventionCtrlId ? getLabel(chain.preventionCtrlId) : '-'}
                      </td>
                      <td className={`px-3 py-2 text-xs border border-gray-400 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`}>
                        {chain.detectionCtrlId ? getLabel(chain.detectionCtrlId) : '-'}
                      </td>
                      <td className={`px-3 py-2 text-center border border-gray-400 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`}>
                        <button
                          onClick={() => onDeleteChain(chain.id)}
                          className="p-1 text-red-500 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
          <div className="text-sm text-gray-600">
            {processChains.length}개 인과관계 연결됨
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>닫기</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <Check className="h-4 w-4 mr-2" />
              인과관계 확정
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

















