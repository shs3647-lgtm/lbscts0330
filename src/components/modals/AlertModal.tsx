'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from '@/lib/locale';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  /** 항목 리스트 (bullet point로 표시) */
  items?: string[];
}

/**
 * window.alert() 대체 커스텀 모달
 * - 브라우저 origin prefix ("localhost:3000 내용:") 없음
 * - 중앙 고정, 백드롭 클릭 닫기
 */
export default function AlertModal({ isOpen, onClose, message, items }: AlertModalProps) {
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      onClick={onClose}
    >
      {/* 백드롭 */}
      <div className="absolute inset-0 bg-black/30" />

      {/* 모달 본체 */}
      <div
        className="relative bg-white rounded-lg shadow-2xl border border-gray-300 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 메시지 */}
        <div className="px-5 pt-5 pb-3">
          <p className="text-sm text-gray-800 font-medium whitespace-pre-line">{message}</p>
          {items && items.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {items.map((item, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-center gap-1.5">
                  <span className="text-gray-400">•</span>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 확인 버튼 */}
        <div className="px-5 pb-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            autoFocus
          >
            {t('확인')}<span className="text-[10px] opacity-70 ml-0.5">(OK)</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
