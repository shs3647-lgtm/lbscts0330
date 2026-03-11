/**
 * @file StepBar.tsx
 * @description L5 단계바 (FMEA 7단계 + 레벨 선택)
 * @author AI Assistant
 * @created 2025-12-25
 * @version 1.0.0
 */

'use client';

import { FileDown, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface StepBarProps {
  /** 현재 레벨 */
  currentLevel?: 1 | 2 | 3;
  /** 현재 단계 */
  currentStep?: number;
  /** 레벨 변경 핸들러 */
  onLevelChange?: (level: 1 | 2 | 3) => void;
  /** 단계 변경 핸들러 */
  onStepChange?: (step: number) => void;
  /** Excel Export 클릭 핸들러 */
  onExcelExport?: () => void;
  /** 고장연결 저장 클릭 핸들러 */
  onFailureLinkSave?: () => void;
}

// FMEA 7단계 정의 (색상 표준: 구조분석-파란색, 기능분석-진한녹색, 고장분석-붉은색)
const steps = [
  { id: 1, label: '1단계', name: '구조분석', color: 'bg-blue-500' },
  { id: 2, label: '2단계', name: '기능분석', color: 'bg-green-700' },
  { id: 3, label: '3단계', name: '고장분석', color: 'bg-red-600' },
  { id: 4, label: '4단계', name: '리스크분석', color: 'bg-orange-500' },
  { id: 'link', label: '고장연결', name: '', color: 'bg-pink-500' },
  { id: 5, label: '5단계', name: '최적화', color: 'bg-purple-500' },
  { id: 6, label: '6단계', name: '효과확인', color: 'bg-teal-500' },
  { id: 7, label: '7단계', name: '문서화', color: 'bg-gray-500' },
];

/**
 * 단계바 컴포넌트 (L5)
 * 
 * @description
 * FMEA 7단계 선택과 레벨(1/2/3) 선택 드롭다운을 표시합니다.
 * 높이: 36px
 */
export function StepBar({
  currentLevel = 3,
  currentStep = 4,
  onLevelChange,
  onStepChange,
  onExcelExport,
  onFailureLinkSave,
}: StepBarProps) {
  return (
    <div className="fixed top-[156px] left-12 right-0 z-20 h-9 bg-white border-b border-gray-200">
      <div className="flex h-full items-center justify-between px-4">
        {/* ======== 좌측: 레벨 및 단계 선택 ======== */}
        <div className="flex items-center gap-3">
          {/* 레벨 선택 */}
          <Select
            value={String(currentLevel)}
            onValueChange={(v) => onLevelChange?.(Number(v) as 1 | 2 | 3)}
          >
            <SelectTrigger className="h-7 w-24">
              <SelectValue placeholder="레벨" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1레벨</SelectItem>
              <SelectItem value="2">2레벨</SelectItem>
              <SelectItem value="3">3레벨</SelectItem>
            </SelectContent>
          </Select>

          {/* 단계 선택 */}
          <Select
            value={String(currentStep)}
            onValueChange={(v) => onStepChange?.(v === 'link' ? -1 : Number(v))}
          >
            <SelectTrigger className="h-7 w-32">
              <SelectValue placeholder="단계" />
            </SelectTrigger>
            <SelectContent>
              {steps.map((step) => (
                <SelectItem key={step.id} value={String(step.id)}>
                  {step.label} {step.name && `- ${step.name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Excel Export 버튼 */}
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            onClick={onExcelExport}
          >
            <FileDown className="h-4 w-4 mr-1" />
            Excel Export
          </Button>
        </div>

        {/* ======== 우측: 고장연결 저장 ======== */}
        <Button
          size="sm"
          className="h-7 bg-blue-500 hover:bg-blue-600 text-white"
          onClick={onFailureLinkSave}
        >
          <Link2 className="h-4 w-4 mr-1" />
          고장연결 저장
        </Button>
      </div>
    </div>
  );
}

export default StepBar;



