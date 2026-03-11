'use client';

import React, { useState, useRef, useEffect } from 'react';

interface SelectableCellProps {
  value: string;
  placeholder: string;
  bgColor: string;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  onClick: () => void;
  onDoubleClickEdit?: (newValue: string) => void; // 더블클릭 인라인 편집 콜백
}

// 누락 패턴 체크 함수
const isMissingValue = (val: string | undefined) => {
  if (!val) return true;
  if (val.includes('클릭')) return true;
  if (val.includes('추가')) return true;
  if (val.includes('선택')) return true;
  if (val.includes('입력')) return true;
  return false;
};

/**
 * 선택 가능한 셀 (클릭하면 모달 열림, 더블클릭하면 인라인 편집)
 * 기능분석, 고장분석 등 모든 워크시트 탭에서 공용으로 사용
 */
export default function SelectableCell({
  value,
  placeholder,
  bgColor,
  textColor,
  textAlign = 'left',
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
          fontSize: '12px',
          border: '2px solid #1976d2',
          borderRadius: '2px',
          outline: 'none',
          background: '#fff',
        }}
      />
    );
  }

  return (
    <div
      className="cursor-pointer hover:bg-black/5 w-full h-full flex items-start p-1"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{ 
        minHeight: '24px', 
        fontSize: '12px', 
        fontFamily: 'inherit',
        color: isMissing ? '#f57c00' : (textColor || 'inherit'),
        fontWeight: isMissing ? 600 : (textColor ? 700 : 'inherit'),
        fontStyle: isMissing ? 'italic' : 'normal',
        justifyContent: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start',
        background: isMissing ? `repeating-linear-gradient(45deg, #fff3e0, #fff3e0 4px, #fff 4px, #fff 8px)` : 'transparent',
        wordBreak: 'break-word',
        whiteSpace: 'normal',
        lineHeight: '1.4',
      }}
      title="클릭: 모달 선택 | 더블클릭: 직접 편집"
    >
      {value ? (
        isMissing ? <span style={{ wordBreak: 'break-word' }}>🔍 {value}</span> : <span style={{ wordBreak: 'break-word' }}>{value}</span>
      ) : (
        <span style={{ wordBreak: 'break-word' }}>🔍 {placeholder}</span>
      )}
    </div>
  );
}



