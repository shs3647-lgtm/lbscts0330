// CODEFREEZE
/**
 * @file LevelRelationPopup.tsx
 * @description Step 2: L1-L2-L3 계층 관계 지정 팝업
 * @author AI Assistant
 * @created 2025-12-26
 * 
 * L1 (완제품) ←→ L2 (공정) ←→ L3 (작업요소)
 * 사용자가 직접 계층 관계를 지정
 */

'use client';

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Link2, ArrowRight, ArrowDown, Check, Trash2, Layers } from 'lucide-react';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';
import { 
  ImportedFlatData, 
  LevelRelation,
  ITEM_CODE_LABELS 
} from './types';

interface LevelRelationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  flatData: ImportedFlatData[];
  existingRelations: LevelRelation[];
  onSaveRelation: (relation: LevelRelation) => void;
  onDeleteRelation: (relationId: string) => void;
}

export default function LevelRelationPopup({
  isOpen,
  onClose,
  flatData,
  existingRelations,
  onSaveRelation,
  onDeleteRelation,
}: LevelRelationPopupProps) {
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({ isOpen, width: 700, height: 500, minWidth: 400, minHeight: 280 });

  // ★★★ 2026-02-07: 비즈니스 키 헬퍼 (ID 대신 내용 기반 매칭) ★★★
  const getBK = (d: ImportedFlatData) => `${d.processNo}|${d.itemCode}|${d.value}`;

  // 선택 상태 (L1/L3는 비즈니스 키, L2는 processNo)
  const [selectedL1, setSelectedL1] = useState<string>('');
  const [selectedL2, setSelectedL2] = useState<string>('');
  const [selectedL3, setSelectedL3] = useState<string>('');

  // L1 아이템 (C1: 구분 - YOUR PLANT, SHIP TO PLANT, USER)
  const l1Items = useMemo(() => 
    flatData.filter(d => d.itemCode === 'C1'),
    [flatData]
  );

  // L2 아이템 (A1+A2: 공정번호+공정명)
  const l2Items = useMemo(() => {
    const processMap = new Map<string, { no: string; name: string }>();
    flatData.filter(d => d.itemCode === 'A1').forEach(d => {
      if (!processMap.has(d.processNo)) {
        const nameItem = flatData.find(f => f.processNo === d.processNo && f.itemCode === 'A2');
        processMap.set(d.processNo, {
          no: d.processNo,
          name: nameItem?.value || d.value,
        });
      }
    });
    return Array.from(processMap.values());
  }, [flatData]);

  // L3 아이템 (B1: 작업요소) - 선택된 L2 공정 기준
  const l3Items = useMemo(() => {
    if (!selectedL2) return [];
    return flatData.filter(d => d.processNo === selectedL2 && d.itemCode === 'B1');
  }, [flatData, selectedL2]);

  // 연결 버튼 클릭 (비즈니스 키로 저장)
  const handleConnect = () => {
    if (!selectedL1 || !selectedL2) return;

    const relation: LevelRelation = {
      id: `${Date.now()}`,
      l1Id: selectedL1,       // 비즈니스 키: processNo|C1|value
      l2Id: selectedL2,       // processNo (기존 유지)
      l3Id: selectedL3 || undefined, // 비즈니스 키: processNo|B1|value
      createdAt: new Date(),
      createdBy: 'USER',
    };

    onSaveRelation(relation);
    setSelectedL3('');
  };

  // L1 라벨 가져오기 (비즈니스 키 매칭)
  const getL1Label = (bk: string) => {
    const item = flatData.find(d => getBK(d) === bk);
    return item?.value || bk;
  };

  // L2 라벨 가져오기
  const getL2Label = (processNo: string) => {
    const item = l2Items.find(p => p.no === processNo);
    return item ? `${item.no} - ${item.name}` : processNo;
  };

  // L3 라벨 가져오기 (비즈니스 키 매칭)
  const getL3Label = (bk: string) => {
    const item = flatData.find(d => getBK(d) === bk);
    return item?.value || bk;
  };

  if (!isOpen) return null;

  return typeof document === 'undefined' ? null : createPortal(
    <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}>
      {/* 헤더 */}
      <div className="bg-[#00587a] text-white px-6 py-4 flex items-center justify-between rounded-t-lg cursor-move" onMouseDown={onDragStart}>
        <div className="flex items-center gap-3">
          <Layers className="h-6 w-6" />
          <div>
            <h2 className="text-lg font-bold">Step 2: L1-L2-L3 계층 관계 지정</h2>
            <p className="text-sm opacity-80">완제품 → 공정 → 작업요소 관계를 지정하세요</p>
          </div>
        </div>
        <button onMouseDown={e => e.stopPropagation()} onClick={onClose} className="p-1 hover:bg-white/20 rounded">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
          {/* 계층 구조 다이어그램 */}
          <div className="bg-[#e0f2fb] rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="px-4 py-2 bg-red-500 text-white rounded font-bold">L1 완제품</div>
              <ArrowRight className="h-5 w-5 text-gray-500" />
              <div className="px-4 py-2 bg-yellow-500 text-white rounded font-bold">L2 공정</div>
              <ArrowRight className="h-5 w-5 text-gray-500" />
              <div className="px-4 py-2 bg-green-500 text-white rounded font-bold">L3 작업요소</div>
            </div>
          </div>

          {/* 선택 영역 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* L1 선택 */}
            <div>
              <h3 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-2">
                <Badge className="bg-red-500">L1</Badge> 완제품 (C1)
              </h3>
              <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                {l1Items.length === 0 ? (
                  <p className="p-4 text-gray-500 text-sm text-center">데이터 없음</p>
                ) : (
                  l1Items.map((item) => (
                    <button
                      key={getBK(item)}
                      onClick={() => setSelectedL1(getBK(item))}
                      className={`w-full px-4 py-3 text-left text-sm border-b border-gray-100 last:border-0 transition-colors ${
                        selectedL1 === getBK(item)
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

            {/* L2 선택 */}
            <div>
              <h3 className="text-sm font-bold text-yellow-600 mb-2 flex items-center gap-2">
                <Badge className="bg-yellow-500">L2</Badge> 공정 (A1-A2)
              </h3>
              <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                {l2Items.length === 0 ? (
                  <p className="p-4 text-gray-500 text-sm text-center">데이터 없음</p>
                ) : (
                  l2Items.map((item) => (
                    <button
                      key={item.no}
                      onClick={() => {
                        setSelectedL2(item.no);
                        setSelectedL3('');
                      }}
                      className={`w-full px-4 py-3 text-left text-sm border-b border-gray-100 last:border-0 transition-colors ${
                        selectedL2 === item.no
                          ? 'bg-yellow-500 text-white'
                          : 'hover:bg-yellow-50'
                      }`}
                    >
                      <span className="font-bold">{item.no}</span> - {item.name}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* L3 선택 */}
            <div>
              <h3 className="text-sm font-bold text-green-600 mb-2 flex items-center gap-2">
                <Badge className="bg-green-500">L3</Badge> 작업요소 (B1)
              </h3>
              <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                {!selectedL2 ? (
                  <p className="p-4 text-gray-500 text-sm text-center">L2 공정을 먼저 선택하세요</p>
                ) : l3Items.length === 0 ? (
                  <p className="p-4 text-gray-500 text-sm text-center">작업요소 없음</p>
                ) : (
                  l3Items.map((item) => (
                    <button
                      key={getBK(item)}
                      onClick={() => setSelectedL3(getBK(item))}
                      className={`w-full px-4 py-3 text-left text-sm border-b border-gray-100 last:border-0 transition-colors ${
                        selectedL3 === getBK(item)
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
          </div>

          {/* 연결 버튼 */}
          <div className="flex justify-center mb-6">
            <Button
              onClick={handleConnect}
              disabled={!selectedL1 || !selectedL2}
              className="bg-[#00587a] hover:bg-[#004560] text-white px-8"
            >
              <Link2 className="h-4 w-4 mr-2" />
              L1-L2{selectedL3 ? '-L3' : ''} 관계 연결
            </Button>
          </div>

          {/* 기존 관계 목록 */}
          {existingRelations.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-[#00587a] mb-3">
                연결된 관계 ({existingRelations.length}개)
              </h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="bg-red-500 text-white px-3 py-2 text-left border border-gray-400">L1 완제품</th>
                    <th className="bg-[#00587a] text-white px-3 py-2 text-center w-12 border border-gray-400"></th>
                    <th className="bg-yellow-500 text-white px-3 py-2 text-left border border-gray-400">L2 공정</th>
                    <th className="bg-[#00587a] text-white px-3 py-2 text-center w-12 border border-gray-400"></th>
                    <th className="bg-green-500 text-white px-3 py-2 text-left border border-gray-400">L3 작업요소</th>
                    <th className="bg-[#00587a] text-white px-3 py-2 text-center w-16 border border-gray-400">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {existingRelations.map((rel, idx) => (
                    <tr key={rel.id}>
                      <td className={`px-3 py-2 border border-gray-400 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`}>
                        {getL1Label(rel.l1Id)}
                      </td>
                      <td className={`px-3 py-2 text-center border border-gray-400 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`}>
                        <ArrowRight className="h-4 w-4 inline text-gray-400" />
                      </td>
                      <td className={`px-3 py-2 border border-gray-400 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`}>
                        {getL2Label(rel.l2Id)}
                      </td>
                      <td className={`px-3 py-2 text-center border border-gray-400 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`}>
                        {rel.l3Id && <ArrowRight className="h-4 w-4 inline text-gray-400" />}
                      </td>
                      <td className={`px-3 py-2 border border-gray-400 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`}>
                        {rel.l3Id ? getL3Label(rel.l3Id) : '-'}
                      </td>
                      <td className={`px-3 py-2 text-center border border-gray-400 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`}>
                        <button
                          onClick={() => onDeleteRelation(rel.id)}
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
          {existingRelations.length}개 관계 연결됨
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>닫기</Button>
          <Button className="bg-[#00587a] hover:bg-[#004560] text-white">
            <Check className="h-4 w-4 mr-2" />
            관계 확정
          </Button>
        </div>
      </div>

      {/* 리사이즈 핸들 */}
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
        <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
          <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>,
    document.body
  );
}

