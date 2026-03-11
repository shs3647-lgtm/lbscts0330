/**
 * TreePanel - 우측 트리 구조 패널
 */

'use client';

import React, { useState } from 'react';
import { L1Product, L2Process, L3WorkElement, M4_INFO, M4Type } from './types';

interface TreePanelProps {
  l1: L1Product;
  l2List: L2Process[];
  selectedId: string | null;
  onSelect: (type: 'L1' | 'L2' | 'L3', id: string) => void;
  onAddL2: () => void;
  onAddL3: (l2Id: string) => void;
}

export const TreePanel: React.FC<TreePanelProps> = ({
  l1,
  l2List,
  selectedId,
  onSelect,
  onAddL2,
  onAddL3,
}) => {
  const [expandedL2, setExpandedL2] = useState<Set<string>>(new Set(l2List.map(p => p.id)));
  const [searchQuery, setSearchQuery] = useState('');

  const toggleL2 = (id: string) => {
    const newExpanded = new Set(expandedL2);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedL2(newExpanded);
  };

  const filteredL2 = l2List.filter(proc => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (`${proc.no} ${proc.name}`.toLowerCase().includes(q)) return true;
    return proc.l3.some(w => w.name.toLowerCase().includes(q));
  });

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-700">🌳 트리 구조</span>
          <span className="text-xs text-gray-400">(구조분석/2Level)</span>
        </div>
        <button
          onClick={onAddL2}
          className="px-2 py-1 text-xs bg-[#e3f2fd] text-[#1565c0] rounded border border-[#90caf9] hover:bg-[#bbdefb]"
        >
          + 메인공정
        </button>
      </div>

      {/* 검색 */}
      <div className="flex gap-2 px-3 py-2 border-b border-gray-100">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="검색: 공정/작업요소/4M"
          className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-[#2b78c5]"
        />
        <button
          onClick={() => setSearchQuery('')}
          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded border border-gray-300 hover:bg-gray-200"
        >
          초기화
        </button>
      </div>

      {/* 트리 */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {/* L1 노드 */}
        <div className="mb-2">
          <div
            onClick={() => onSelect('L1', l1.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
              selectedId === l1.id
                ? 'bg-[#f2f7ff] border-[#2b78c5] outline outline-2 outline-[#2b78c5]/30'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span className="text-sm font-bold text-[#335f8f]">▾</span>
            <span className="flex-1 text-xs font-bold text-gray-700">{l1.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onAddL2(); }}
              className="px-1.5 py-0.5 text-xs bg-white border border-[#cfe0f4] rounded hover:bg-[#f2f7ff]"
            >
              +
            </button>
          </div>

          {/* L2 노드들 */}
          <div className="ml-5 mt-1 pl-3 border-l-2 border-dotted border-[#bcd1ea]">
            {filteredL2.map((proc) => (
              <div key={proc.id} className="mb-1">
                {/* L2 행 */}
                <div
                  onClick={() => onSelect('L2', proc.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedId === proc.id
                      ? 'bg-[#f2f7ff] border-[#2b78c5] outline outline-2 outline-[#2b78c5]/30'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span
                    onClick={(e) => { e.stopPropagation(); toggleL2(proc.id); }}
                    className="text-sm font-bold text-[#335f8f] cursor-pointer"
                  >
                    {expandedL2.has(proc.id) ? '▾' : '▸'}
                  </span>
                  <span className="flex-1 text-xs font-bold text-gray-700">
                    {proc.no} {proc.name}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddL3(proc.id); }}
                    className="px-1.5 py-0.5 text-xs bg-white border border-[#cfe0f4] rounded hover:bg-[#f2f7ff]"
                  >
                    +
                  </button>
                </div>

                {/* L3 노드들 */}
                {expandedL2.has(proc.id) && proc.l3.length > 0 && (
                  <div className="ml-5 mt-1 pl-3 border-l-2 border-dotted border-[#bcd1ea]">
                    {proc.l3.map((work) => (
                      <div
                        key={work.id}
                        onClick={() => onSelect('L3', work.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors mb-1 ${
                          selectedId === work.id
                            ? 'bg-[#f2f7ff] border-[#2b78c5] outline outline-2 outline-[#2b78c5]/30'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span
                          className="px-1.5 py-0.5 text-[10px] font-bold rounded-full border"
                          style={{
                            backgroundColor: M4_INFO[work.m4 as M4Type]?.bgColor || '#eee',
                            borderColor: M4_INFO[work.m4 as M4Type]?.color || '#999',
                            color: M4_INFO[work.m4 as M4Type]?.color || '#333',
                          }}
                        >
                          {work.m4}
                        </span>
                        <span className="flex-1 text-xs text-gray-600">{work.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreePanel;















