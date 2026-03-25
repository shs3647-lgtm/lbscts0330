/**
 * @file StepHeader.tsx
 * @description FMEA 7단계 메뉴 헤더 컴포넌트
 * @version 1.0.0
 * @created 2025-12-26
 */

'use client';

import { cn } from '@/lib/utils';
import { FMEA_STEPS, type Step } from './types';

interface StepHeaderProps {
  currentStep: number;
  onStepChange: (stepId: number) => void;
}

/** 7단계 메뉴 헤더 */
export function StepHeader({ currentStep, onStepChange }: StepHeaderProps) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
      {FMEA_STEPS.map((step) => (
        <StepButton
          key={step.id}
          step={step}
          isActive={currentStep === step.id}
          onClick={() => onStepChange(step.id)}
        />
      ))}
    </div>
  );
}

interface StepButtonProps {
  step: Step;
  isActive: boolean;
  onClick: () => void;
}

function StepButton({ step, isActive, onClick }: StepButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={!step.active}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium',
        'transition-all duration-200',
        isActive
          ? 'bg-white text-blue-600 shadow-sm'
          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50',
        !step.active && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className="text-base">{step.icon}</span>
      <span className="hidden lg:inline">{step.shortLabel}</span>
    </button>
  );
}

export default StepHeader;















