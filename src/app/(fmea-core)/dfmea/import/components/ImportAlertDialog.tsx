/**
 * @file ImportAlertDialog.tsx
 * @description Import 경고/확인 다이얼로그 — 스크롤 가능 + 복사 기능
 * - alert() 대체: 긴 경고 목록도 스크롤하여 전체 확인 가능
 * - 클립보드 복사 버튼으로 경고 내용 외부 공유 가능
 * @created 2026-03-14
 */

'use client';

import React, { useCallback, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

// ─── 타입 ───

export type AlertVariant = 'info' | 'success' | 'warning' | 'error' | 'confirm';

export interface ImportAlertState {
  open: boolean;
  variant: AlertVariant;
  title: string;
  /** 요약 (상단 고정 영역) */
  summary?: string;
  /** 상세 목록 (스크롤 영역) */
  details?: string[];
  /** 하단 안내 문구 */
  footer?: string;
  /** confirm 모드일 때 확인 콜백 */
  onConfirm?: () => void;
}

export const INITIAL_ALERT_STATE: ImportAlertState = {
  open: false,
  variant: 'info',
  title: '',
};

interface ImportAlertDialogProps {
  state: ImportAlertState;
  onClose: () => void;
}

// ─── 스타일 맵 ───

const VARIANT_STYLES: Record<AlertVariant, {
  icon: string;
  titleColor: string;
  borderColor: string;
  bgColor: string;
  btnColor: string;
}> = {
  info: {
    icon: 'ℹ️',
    titleColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    bgColor: 'bg-blue-50',
    btnColor: 'bg-blue-600 hover:bg-blue-700',
  },
  success: {
    icon: '✅',
    titleColor: 'text-green-700',
    borderColor: 'border-green-200',
    bgColor: 'bg-green-50',
    btnColor: 'bg-green-600 hover:bg-green-700',
  },
  warning: {
    icon: '⚠️',
    titleColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    bgColor: 'bg-amber-50',
    btnColor: 'bg-amber-600 hover:bg-amber-700',
  },
  error: {
    icon: '❌',
    titleColor: 'text-red-700',
    borderColor: 'border-red-200',
    bgColor: 'bg-red-50',
    btnColor: 'bg-red-600 hover:bg-red-700',
  },
  confirm: {
    icon: '❓',
    titleColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    bgColor: 'bg-purple-50',
    btnColor: 'bg-purple-600 hover:bg-purple-700',
  },
};

export function ImportAlertDialog({ state, onClose }: ImportAlertDialogProps) {
  const { open, variant, title, summary, details, footer, onConfirm } = state;
  const style = VARIANT_STYLES[variant];
  const detailRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const parts: string[] = [title];
    if (summary) parts.push('', summary);
    if (details && details.length > 0) {
      parts.push('', '--- 상세 목록 ---');
      parts.push(...details);
    }
    if (footer) parts.push('', footer);

    navigator.clipboard.writeText(parts.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch((err) => {
      console.error('클립보드 복사 실패:', err);
    });
  }, [title, summary, details, footer]);

  const handleConfirm = useCallback(() => {
    onConfirm?.();
    onClose();
  }, [onConfirm, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[80vh] flex flex-col gap-0 p-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* 헤더 */}
        <DialogHeader className={`px-5 pt-4 pb-3 ${style.bgColor} border-b ${style.borderColor}`}>
          <DialogTitle className={`flex items-center gap-2 text-base ${style.titleColor}`}>
            <span className="text-lg">{style.icon}</span>
            {title}
          </DialogTitle>
          {summary && (
            <DialogDescription asChild>
              <div className="mt-2 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {summary}
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        {/* 상세 목록 — 스크롤 영역 */}
        {details && details.length > 0 && (
          <div
            ref={detailRef}
            className="flex-1 overflow-y-auto px-5 py-3 min-h-0"
            style={{ maxHeight: '40vh' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">
                상세 {details.length}건
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs px-2 py-0.5 rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-600 transition-colors"
              >
                {copied ? '복사됨!' : '전체 복사'}
              </button>
            </div>
            <div className="space-y-0.5">
              {details.map((line, i) => (
                <div
                  key={i}
                  className={`text-xs font-mono px-2 py-1 rounded ${
                    i % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                  } border-l-2 ${style.borderColor} select-text`}
                >
                  <span className="text-gray-400 mr-2 select-none">{i + 1}.</span>
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 하단 안내 */}
        {footer && (
          <div className={`px-5 py-2 text-xs text-gray-600 ${style.bgColor} border-t ${style.borderColor}`}>
            {footer}
          </div>
        )}

        {/* 버튼 */}
        <DialogFooter className="px-5 py-3 border-t border-gray-200 bg-gray-50">
          {variant === 'confirm' ? (
            <div className="flex gap-2 w-full justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-700"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`px-4 py-1.5 text-sm rounded text-white ${style.btnColor}`}
              >
                확인
              </button>
            </div>
          ) : (
            <div className="flex gap-2 w-full justify-end">
              {details && details.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-700"
                >
                  {copied ? '복사 완료!' : '내용 복사'}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-1.5 text-sm rounded text-white ${style.btnColor}`}
              >
                확인
              </button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
