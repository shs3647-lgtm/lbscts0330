/**
 * @file CommonItemManager.tsx
 * @description 공통 기초정보 관리 컴포넌트 (추가/수정/삭제 가능)
 * @author AI Assistant
 * @created 2025-12-26
 * @updated 2025-12-26 - table-design-reference.html 표준 디자인 적용
 * 
 * 테이블 디자인 원칙:
 * - 헤더: #00587a (진한 남청색) + 흰색 글자
 * - 짝수 행: #e0f2fb (연한 하늘색)
 * - 홀수 행: #ffffff (흰색)
 * - 테두리: 1px solid #999
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit2, Trash2, Save } from 'lucide-react';
import { CommonItem, CommonCategory, COMMON_CATEGORIES } from './types';

interface CommonItemManagerProps {
  items: CommonItem[];
  onItemsChange: (items: CommonItem[]) => void;
  includeCommon: boolean;
  onIncludeCommonChange: (value: boolean) => void;
}

export default function CommonItemManager({
  items,
  onItemsChange,
  includeCommon,
  onIncludeCommonChange,
}: CommonItemManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CommonItem | null>(null);
  const [formData, setFormData] = useState({
    category: 'MN' as 'MN' | 'EN' | 'IM',
    name: '',
    description: '',
    failureCauses: '',
  });

  // 모달 열기 (신규/수정)
  const openModal = (item?: CommonItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        category: item.category,
        name: item.name,
        description: item.description || '',
        failureCauses: (item.failureCauses || []).join(', '),
      });
    } else {
      setEditingItem(null);
      setFormData({ category: 'MN', name: '', description: '', failureCauses: '' });
    }
    setIsModalOpen(true);
  };

  // 저장
  const handleSave = () => {
    const newItem: CommonItem = {
      id: editingItem?.id || `${formData.category}${Date.now()}`,
      category: formData.category,
      categoryName: COMMON_CATEGORIES.find(c => c.code === formData.category)?.name || '',
      name: formData.name,
      description: formData.description,
      failureCauses: formData.failureCauses.split(',').map(s => s.trim()).filter(Boolean),
    };

    if (editingItem) {
      onItemsChange(items.map(i => i.id === editingItem.id ? newItem : i));
    } else {
      onItemsChange([...items, newItem]);
    }
    setIsModalOpen(false);
  };

  // 삭제
  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      onItemsChange(items.filter(i => i.id !== id));
    }
  };

  // 카테고리별 그룹핑
  const groupedItems = COMMON_CATEGORIES.reduce((acc, cat) => {
    acc[cat.code] = items.filter(i => i.category === cat.code);
    return acc;
  }, {} as Record<'MN' | 'EN' | 'IM', CommonItem[]>);

  return (
    <div className="bg-white rounded-lg p-5 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[#00587a]">
          공통 기초정보 (추가/수정/삭제 가능)
        </h2>
        <Button size="sm" onClick={() => openModal()} className="bg-[#00587a] hover:bg-[#004560] text-white">
          <Plus className="h-4 w-4 mr-1" />
          항목 추가
        </Button>
      </div>

      {/* 카테고리별 항목 테이블 - 표준 디자인 */}
      <div className="max-h-[250px] overflow-y-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0">
            <tr>
              <th className="bg-[#00587a] text-white font-bold px-3 py-2 text-center w-20 border border-gray-400">카테고리</th>
              <th className="bg-[#00587a] text-white font-bold px-3 py-2 text-left border border-gray-400">항목</th>
            </tr>
          </thead>
          <tbody>
            {COMMON_CATEGORIES.map((cat, catIdx) => {
              const catItems = groupedItems[cat.code] || [];
              if (catItems.length === 0) return null;
              
              return (
                <tr key={cat.code}>
                  {/* 카테고리 열 - row-header 스타일 */}
                  <td className="bg-[#00587a] text-white font-bold px-3 py-2 text-center align-top border border-gray-400">
                    <div className="flex flex-col items-center gap-1">
                      <Badge className={`${cat.color} text-white text-xs`}>{cat.code}</Badge>
                      <span className="text-xs">{cat.name}</span>
                      <span className="text-[10px] opacity-70">({catItems.length})</span>
                    </div>
                  </td>
                  {/* 항목 열 - 짝수/홀수 배경 */}
                  <td className={`px-3 py-2 border border-gray-400 ${catIdx % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`}>
                    <div className="flex flex-wrap gap-1">
                      {catItems.map(item => (
                        <div
                          key={item.id}
                          className="group flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs hover:border-[#00587a] transition-colors"
                        >
                          <span className="text-black" title={item.description}>{item.name}</span>
                          <button
                            onClick={() => openModal(item)}
                            className="opacity-0 group-hover:opacity-100 text-[#00587a] hover:text-[#004560]"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 공통 포함 체크박스 */}
      <div className="mt-4 pt-3 border-t border-[#999] flex items-center gap-2">
        <input
          type="checkbox"
          id="includeCommon"
          checked={includeCommon}
          onChange={(e) => onIncludeCommonChange(e.target.checked)}
          className="w-4 h-4 accent-[#00587a]"
        />
        <label htmlFor="includeCommon" className="text-sm text-gray-700">
          공통 항목을 모든 공정에 자동 포함 ({items.length}개 항목)
        </label>
      </div>

      {/* 추가/수정 모달 - 표준 디자인 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader className="bg-[#00587a] text-white -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
            <DialogTitle className="text-white font-bold">
              {editingItem ? '공통 항목 수정' : '공통 항목 추가'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr>
                  <td className="bg-[#00587a] text-white font-bold px-3 py-2 w-24 border border-gray-400">카테고리</td>
                  <td className="bg-white px-3 py-2 border border-gray-400">
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as 'MN' | 'EN' | 'IM' })}>
                      <SelectTrigger className="border-0 shadow-none w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_CATEGORIES.map(cat => (
                          <SelectItem key={cat.code} value={cat.code}>
                            <div className="flex items-center gap-2">
                              <Badge className={`${cat.color} text-white text-xs`}>{cat.code}</Badge>
                              {cat.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
                <tr>
                  <td className="bg-[#00587a] text-white font-bold px-3 py-2 border border-gray-400">항목명 *</td>
                  <td className="bg-[#e0f2fb] px-3 py-2 border border-gray-400">
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="예: 작업자, 온도, 그리이스..."
                      className="border-0 bg-transparent"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="bg-[#00587a] text-white font-bold px-3 py-2 border border-gray-400">설명</td>
                  <td className="bg-white px-3 py-2 border border-gray-400">
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="항목에 대한 간단한 설명"
                      className="border-0 bg-transparent"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="bg-[#00587a] text-white font-bold px-3 py-2 border border-gray-400">고장원인</td>
                  <td className="bg-[#e0f2fb] px-3 py-2 border border-gray-400">
                    <Input
                      value={formData.failureCauses}
                      onChange={(e) => setFormData({ ...formData, failureCauses: e.target.value })}
                      placeholder="콤마로 구분 (예: 미준수, 교육부족)"
                      className="border-0 bg-transparent"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="border-[#999] text-gray-600">취소</Button>
            <Button onClick={handleSave} disabled={!formData.name} className="bg-[#00587a] hover:bg-[#004560] text-white font-bold">
              <Save className="h-4 w-4 mr-1" />
              {editingItem ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

