/**
 * @file DatePickerModal.tsx
 * @description 날짜 선택 모달 컴포넌트
 * @version 2.0.0
 * @updated 2026-02-05 인라인 에러 메시지 표시 기능 추가
 * 
 * @status CODE_FREEZE 🔒
 * @freeze_level L2 (Important)
 * @frozen_date 2026-02-05
 * @allowed_changes 버그 수정, 주석 추가만 허용
 * 
 * ⚠️ 이 파일은 코드프리즈 상태입니다.
 * 수정이 필요한 경우 docs/HARDCODING.md 참고
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { createPortal } from 'react-dom';
import { ko } from 'date-fns/locale';
import { useLocale } from '@/lib/locale';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (date: string) => boolean | string | void;  // ★ false 또는 에러메시지 반환 시 모달 유지
  currentValue?: string;
  title?: string;
  anchorRef?: React.RefObject<HTMLElement>;
}

export function DatePickerModal({ isOpen, onClose, onSelect, currentValue, title = '날짜 선택', anchorRef }: DatePickerModalProps) {
  const { t } = useLocale();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);  // ★ 에러 메시지 상태
  const modalRef = useRef<HTMLDivElement>(null);

  // ★ 오버레이 없이 외부 클릭 감지 (워크시트 스크롤 차단 방지)
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [isOpen, handleOutsideClick]);

  useEffect(() => {
    if (currentValue) {
      const date = new Date(currentValue);
      if (!isNaN(date.getTime())) {
        setSelectedDate(date);
        setCurrentMonth(date);
      }
    } else {
      setCurrentMonth(new Date());
    }
    setErrorMessage(null);  // 모달 열릴 때 에러 초기화
  }, [currentValue, isOpen]);

  if (!isOpen) return null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // 첫 주의 빈 칸 계산 (일요일=0)
  const startDay = monthStart.getDay();
  const emptyDays = Array(startDay).fill(null);

  const handleSelect = (date: Date) => {
    setSelectedDate(date);
    const formatted = format(date, 'yyyy-MM-dd');
    const result = onSelect(formatted);

    // ★ 문자열 반환 시 에러 메시지로 표시
    if (typeof result === 'string') {
      setErrorMessage(result);
      return;
    }
    // ★ false 반환 시 모달 유지 (에러 메시지는 onSelect에서 처리)
    if (result === false) {
      return;
    }

    setErrorMessage(null);
    onClose();
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today);
    const formatted = format(today, 'yyyy-MM-dd');
    const result = onSelect(formatted);
    if (typeof result === 'string') {
      setErrorMessage(result);
      return;
    }
    if (result === false) return;
    onClose();
  };

  // ✅ 2026-01-22: Portal을 사용하여 레이아웃 영향 방지
  if (typeof document === 'undefined') return null;

  return createPortal(
      <div
        ref={modalRef}
        className="fixed bg-white rounded-lg shadow-2xl p-3 w-72 border border-gray-200 z-[9999]"
        style={{ top: '180px', left: '50%', transform: 'translateX(-50%)' }}
      >
        {/* 헤더 + 월 네비게이션 */}
        <div className="flex items-center justify-between mb-2 bg-blue-500 -m-3 mb-2 p-2 rounded-t-lg">
          <button onClick={handlePrevMonth} className="text-white/80 hover:text-white px-2">◀</button>
          <span className="font-bold text-sm text-white">{format(currentMonth, 'yyyy년 M월', { locale: ko })}</span>
          <button onClick={handleNextMonth} className="text-white/80 hover:text-white px-2">▶</button>
        </div>

        {/* ★★★ 에러 메시지 표시 ★★★ */}
        {errorMessage && (
          <div className="bg-red-100 border border-red-300 text-red-700 text-xs px-2 py-1.5 rounded mb-2 flex items-center gap-1">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
            <div key={day} className={`text-center text-[10px] font-medium py-0.5 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>{day}</div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-0.5">
          {emptyDays.map((_, i) => (<div key={`empty-${i}`} className="h-7" />))}
          {days.map((day) => {
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            const dayOfWeek = day.getDay();
            return (
              <button key={day.toISOString()} onClick={() => handleSelect(day)}
                className={`h-7 text-xs rounded transition-colors ${isSelected ? 'bg-blue-500 text-white font-bold' : ''} ${!isSelected && isTodayDate ? 'bg-yellow-200 font-bold ring-1 ring-yellow-400' : ''} ${!isSelected && !isTodayDate ? 'hover:bg-blue-100' : ''} ${!isSelected && dayOfWeek === 0 ? 'text-red-500' : ''} ${!isSelected && dayOfWeek === 6 ? 'text-blue-500' : ''}`}
              >{format(day, 'd')}</button>
            );
          })}
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-1 mt-2 pt-2 border-t">
          <button onClick={handleToday} className="flex-1 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 font-medium">{t('오늘')}</button>
          <button onClick={onClose} className="flex-1 py-1.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200">{t('닫기')}</button>
        </div>
      </div>,
    document.body
  );
}
