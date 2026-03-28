'use client';
/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v3.1.0 — 이 파일을 수정하지 마세요!          ██
 * ██                                                          ██
 * ██  상태: DB중심 고장연결 + v3.0 아키텍처 완성 (2026-02-28)  ██
 * ██  검증: 270테스트 PASS / tsc 에러 0개                      ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */

import React, { useState, useRef, useEffect } from 'react';

interface SelectableCellProps {
  value: string;
  placeholder: string;
  bgColor: string;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: string; // ★ 폰트 크기 오버라이드 (기본 '11px')
  isRevised?: boolean; // true = 엑셀에서 적색으로 표기된 수정 항목 → 적색 텍스트
  onClick: () => void;
  onDoubleClickEdit?: (newValue: string) => void; // 더블클릭 인라인 편집 콜백
}

// 누락 판정: value가 비어있으면 미입력
const isMissingValue = (val: string | undefined) => !val || !val.trim();

/**
 * 선택 가능한 셀 (클릭하면 모달 열림, 더블클릭하면 인라인 편집)
 * 기능분석, 고장분석 등 모든 워크시트 탭에서 공용으로 사용
 */
const SelectableCell = React.memo(function SelectableCell({
  value,
  placeholder,
  bgColor,
  textColor,
  textAlign = 'left',
  fontSize = '11px',
  isRevised,
  onClick,
  onDoubleClickEdit,
}: SelectableCellProps) {
  const isMissing = isMissingValue(value);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleClick = () => {
    // 더블클릭 감지를 위해 약간의 지연
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      return; // 더블클릭으로 처리됨
    }
    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null;
      onClick();
    }, 200);
  };

  const handleDoubleClick = () => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    if (onDoubleClickEdit) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (onDoubleClickEdit && editValue !== value) {
      onDoubleClickEdit(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      if (onDoubleClickEdit && editValue !== value) {
        onDoubleClickEdit(editValue);
      }
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(value);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '24px',
          padding: '2px 4px',
          fontSize,  // ★ 표준 11px (prop으로 오버라이드 가능)
          fontWeight: 400,   // ★ 입력셀: normal
          border: '2px solid #1976d2',
          borderRadius: '2px',
          outline: 'none',
          background: '#fff',
        }}
      />
    );
  }

  // ★ 2026-01-26: bgColor에 따라 누락 상태 색상 동적 결정 (개선된 로직)
  // 녹색 계열: L2/function 색상 (#e8f5e9, #f1f9f2, #c8e6c9 등)
  const bgLower = (bgColor || '').toLowerCase();
  const isGreenBg = bgLower.includes('e8f5e9') || bgLower.includes('f1f9f2') ||
    bgLower.includes('c8e6c9') || bgLower.includes('a5d6a7') ||
    bgLower.includes('81c784') || bgLower.includes('green');
  const missingTextColor = isGreenBg ? '#1b5e20' : '#f57c00';  // 녹색 배경이면 녹색 글씨
  const missingStripeColor = isGreenBg ? '#c8e6c9' : '#fff3e0';  // 녹색 배경이면 녹색 줄무늬

  return (
    <div
      className="cursor-pointer hover:bg-black/5 w-full h-full flex items-start p-1"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{
        minHeight: '24px',
        fontSize,  // ★ 표준 11px (prop으로 오버라이드 가능)
        fontFamily: 'inherit',
        color: isRevised ? '#c62828' : isMissing ? missingTextColor : (textColor || 'inherit'),
        fontWeight: 400,  // ★ placeholder도 실제 내용과 동일한 굵기
        fontStyle: isMissing ? 'italic' : 'normal',  // ★ 기울임만 차이
        justifyContent: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start',
        background: 'transparent',
        wordBreak: 'break-word',
        whiteSpace: 'normal',
        lineHeight: '1.4',
      }}
      title="클릭: 모달 선택 | 더블클릭: 직접 편집"
    >
      {value ? (
        isMissing ? <span style={{ wordBreak: 'break-word' }}>🔍 {value}</span> : <span style={{ wordBreak: 'break-word' }}>{value}</span>
      ) : placeholder ? (
        <span style={{ wordBreak: 'break-word' }}>⚠ 누락 — {placeholder}</span>
      ) : null}
    </div>
  );
});
export default SelectableCell;



