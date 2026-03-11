/**
 * @file ImportPreviewGrid.tsx
 * @description Excel Import 미리보기 그리드 (4개 탭: A0.공통, A.공정, B.작업요소, C.완제품)
 * @author AI Assistant
 * @created 2025-12-26
 * @updated 2025-12-26 - 4개 메인 탭 + 서브탭 구조로 변경
 * 
 * 기능:
 * - 4개 메인 탭 (A0.공통, A.공정, B.작업요소, C.완제품)
 * - 서브탭으로 세부 항목 선택
 * - 드래그앤드랍 순서 변경
 * - 수동 입력/수정
 * - All Delete, 선택 Delete, 저장
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  Plus, 
  Save, 
  X, 
  Edit2, 
  GripVertical,
  Check,
  AlertCircle,
  Upload
} from 'lucide-react';
import { ImportedFlatData, ITEM_CODE_LABELS } from './types';

interface ImportPreviewGridProps {
  data: ImportedFlatData[];
  onDataChange: (data: ImportedFlatData[]) => void;
  onSave: () => void;
}

// 메인 탭 정의
const MAIN_TABS = [
  { code: 'A0', label: 'A0.공통', color: 'purple', subTabs: ['MN', 'EN', 'IM'] },
  { code: 'A', label: 'A.공정', color: 'blue', subTabs: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'] },
  { code: 'B', label: 'B.작업요소', color: 'green', subTabs: ['B1', 'B2', 'B3', 'B4', 'B5'] },
  { code: 'C', label: 'C.완제품', color: 'red', subTabs: ['C1', 'C2', 'C3', 'C4'] },
];

// 서브탭 라벨
const SUB_TAB_LABELS: Record<string, string> = {
  // 공통
  MN: '사람(Man)',
  EN: '환경(Env)',
  IM: '부자재(IM)',
  // A.공정
  A1: '1.공정번호',
  A2: '2.공정명',
  A3: '3.공정설명',
  A4: '4.제품특성',
  A5: '5.고장형태',
  A6: '6.검출관리',
  // B.작업요소
  B1: '1.작업요소',
  B2: '2.요소기능',
  B3: '3.공정특성',
  B4: '4.고장원인',
  B5: '5.예방관리',
  // C.완제품
  C1: '1.구분',  // YOUR PLANT, SHIP TO PLANT, USER
  C2: '2.제품기능',
  C3: '3.요구사항',
  C4: '4.고장영향',
};

export default function ImportPreviewGrid({
  data,
  onDataChange,
  onSave,
}: ImportPreviewGridProps) {
  // 탭 상태
  const [mainTab, setMainTab] = useState('A');
  const [subTab, setSubTab] = useState('A1');
  
  // 편집 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editProcessNo, setEditProcessNo] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // 현재 메인 탭 정보
  const currentMainTab = MAIN_TABS.find(t => t.code === mainTab);
  
  // 현재 서브탭의 데이터 필터링
  const filteredData = useMemo(() => {
    if (mainTab === 'A0') {
      // 공통 항목은 category로 필터링
      return data.filter(d => d.itemCode === subTab || d.category === subTab as 'A' | 'B' | 'C');
    }
    return data.filter(d => d.itemCode === subTab);
  }, [data, mainTab, subTab]);

  // 메인 탭 변경
  const handleMainTabChange = (tab: string) => {
    setMainTab(tab);
    const mainTabData = MAIN_TABS.find(t => t.code === tab);
    if (mainTabData && mainTabData.subTabs.length > 0) {
      setSubTab(mainTabData.subTabs[0]);
    }
    setSelectedItems(new Set());
  };

  // 편집 시작
  const handleEditStart = (item: ImportedFlatData) => {
    setEditingId(item.id);
    setEditValue(item.value);
    setEditProcessNo(item.processNo);
  };

  // 편집 저장
  const handleEditSave = () => {
    if (!editingId) return;
    onDataChange(data.map(d => 
      d.id === editingId ? { ...d, value: editValue, processNo: editProcessNo } : d
    ));
    setEditingId(null);
    setEditValue('');
    setEditProcessNo('');
  };

  // 편집 취소
  const handleEditCancel = () => {
    setEditingId(null);
    setEditValue('');
    setEditProcessNo('');
  };

  // 항목 삭제
  const handleDelete = (id: string) => {
    onDataChange(data.filter(d => d.id !== id));
    selectedItems.delete(id);
    setSelectedItems(new Set(selectedItems));
  };

  // 선택 항목 삭제
  const handleDeleteSelected = () => {
    onDataChange(data.filter(d => !selectedItems.has(d.id)));
    setSelectedItems(new Set());
  };

  // 전체 삭제
  const handleDeleteAll = () => {
    onDataChange(data.filter(d => d.itemCode !== subTab));
    setSelectedItems(new Set());
  };

  // 선택 토글
  const handleSelectToggle = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  // 전체 선택
  const handleSelectAll = () => {
    if (selectedItems.size === filteredData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredData.map(d => d.id)));
    }
  };

  // 새 항목 추가
  const handleAddNew = () => {
    const newItem: ImportedFlatData = {
      id: `new-${Date.now()}`,
      processNo: '',
      category: subTab.charAt(0) as 'A' | 'B' | 'C',
      itemCode: subTab,
      value: '',
      createdAt: new Date(),
    };
    onDataChange([...data, newItem]);
    setEditingId(newItem.id);
    setEditValue('');
    setEditProcessNo('');
  };

  // 드래그 시작
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  // 드래그 오버
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFilteredData = [...filteredData];
    const [draggedItem] = newFilteredData.splice(draggedIndex, 1);
    newFilteredData.splice(index, 0, draggedItem);

    const otherData = data.filter(d => d.itemCode !== subTab);
    onDataChange([...otherData, ...newFilteredData]);
    setDraggedIndex(index);
  };

  // 드래그 종료
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // 메인 탭 색상
  const getMainTabColor = (tab: typeof MAIN_TABS[number]) => {
    const colors: Record<string, { active: string; inactive: string }> = {
      purple: { active: 'bg-purple-600 text-white', inactive: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
      blue: { active: 'bg-blue-600 text-white', inactive: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
      green: { active: 'bg-green-600 text-white', inactive: 'bg-green-50 text-green-700 hover:bg-green-100' },
      red: { active: 'bg-red-600 text-white', inactive: 'bg-red-50 text-red-700 hover:bg-red-100' },
    };
    return mainTab === tab.code ? colors[tab.color].active : colors[tab.color].inactive;
  };

  // 데이터 개수 계산
  const getTabCount = (tabCode: string) => {
    if (tabCode === 'A0') {
      return data.filter(d => ['MN', 'EN', 'IM'].includes(d.itemCode)).length;
    }
    if (['A', 'B', 'C'].includes(tabCode)) {
      return data.filter(d => d.itemCode.startsWith(tabCode)).length;
    }
    return data.filter(d => d.itemCode === tabCode).length;
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* 메인 탭 */}
      <div className="flex border-b">
        {MAIN_TABS.map((tab) => {
          const count = getTabCount(tab.code);
          return (
            <button
              key={tab.code}
              onClick={() => handleMainTabChange(tab.code)}
              className={`flex-1 px-4 py-3 font-bold text-sm transition-colors ${getMainTabColor(tab)}`}
            >
              {tab.label}
              {count > 0 && (
                <Badge className="ml-2 text-xs bg-white/30">{count}</Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* 서브 탭 */}
      <div className="p-2 border-b bg-gray-50 overflow-x-auto">
        <div className="flex gap-1">
          {currentMainTab?.subTabs.map((sub) => {
            const count = getTabCount(sub);
            return (
              <button
                key={sub}
                onClick={() => setSubTab(sub)}
                className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  subTab === sub
                    ? 'bg-[#00587a] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {SUB_TAB_LABELS[sub] || sub}
                {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 툴바 */}
      <div className="p-3 border-b flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-[#00587a] hover:bg-[#004560] text-white"
            onClick={onSave}
          >
            <Save className="h-4 w-4 mr-1" />
            저장
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDeleteAll}
            disabled={filteredData.length === 0}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            All Delete
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDeleteSelected}
            disabled={selectedItems.size === 0}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            선택 Delete ({selectedItems.size})
          </Button>
        </div>
        <div className="text-sm font-bold text-[#00587a]">
          {SUB_TAB_LABELS[subTab] || subTab} ({filteredData.length}개)
        </div>
      </div>

      {/* 데이터 그리드 */}
      <div className="max-h-[350px] overflow-y-auto">
        <table className="w-full text-sm" >
          <thead className="sticky top-0">
            <tr>
              <th className="bg-[#00587a] text-white px-2 py-2 w-10 text-center border border-[#999]">
                <input
                  type="checkbox"
                  checked={selectedItems.size === filteredData.length && filteredData.length > 0}
                  onChange={handleSelectAll}
                  className="cursor-pointer"
                />
              </th>
              <th className="bg-[#00587a] text-white px-2 py-2 w-10 border border-[#999]"></th>
              <th className="bg-[#00587a] text-white px-3 py-2 text-left border border-[#999]">
                {SUB_TAB_LABELS[subTab] || subTab}
              </th>
              <th className="bg-[#00587a] text-white px-2 py-2 w-16 text-center border border-[#999]"></th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`${
                    index % 2 === 0 ? 'bg-white' : 'bg-[#f8f9fa]'
                  } ${draggedIndex === index ? 'opacity-50' : ''} hover:bg-yellow-50`}
                >
                  <td className="px-2 py-2 text-center border border-[#ddd]">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => handleSelectToggle(item.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-2 py-2 cursor-move text-center border border-[#ddd]">
                    <GripVertical className="h-4 w-4 text-gray-400 inline" />
                  </td>
                  <td className="px-3 py-2 border border-[#ddd]">
                    {editingId === item.id ? (
                      <div className="flex gap-2">
                        {mainTab !== 'A0' && mainTab !== 'C' && (
                          <Input
                            value={editProcessNo}
                            onChange={(e) => setEditProcessNo(e.target.value)}
                            className="h-7 text-sm w-20"
                            placeholder="공정번호"
                          />
                        )}
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-7 text-sm flex-1"
                          autoFocus
                          placeholder="값 입력"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave();
                            if (e.key === 'Escape') handleEditCancel();
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {item.processNo && (
                          <span className="font-mono text-[#00587a] font-bold text-xs bg-blue-50 px-1.5 py-0.5 rounded">
                            {item.processNo}
                          </span>
                        )}
                        <span className="text-black">
                          {item.value || <span className="text-gray-400 italic">값 입력...</span>}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center border border-[#ddd]">
                    {editingId === item.id ? (
                      <div className="flex justify-center gap-1">
                        <button onClick={handleEditSave} className="p-1 text-green-600 hover:bg-green-100 rounded">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={handleEditCancel} className="p-1 text-gray-600 hover:bg-gray-100 rounded">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleEditStart(item)} className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-100 rounded">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 항목 추가 */}
      <div className="p-3 border-t">
        <button
          onClick={handleAddNew}
          className="w-full py-2 border-2 border-dashed border-gray-300 rounded text-gray-500 hover:border-[#00587a] hover:text-[#00587a] transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          항목 추가하기
        </button>
      </div>
    </div>
  );
}
