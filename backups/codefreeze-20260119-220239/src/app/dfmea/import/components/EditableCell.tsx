'use client';

import { CSSProperties } from 'react';

interface EditableCellProps {
  value?: string;
  placeholder?: string;
  onSave: (value: string) => void;
  style?: CSSProperties;
  inputStyle?: CSSProperties;
}

/**
 * 편집 가능한 테이블 셀 컴포넌트
 * - 값이 있으면 텍스트로 표시
 * - 값이 없으면 입력 필드 표시
 */
export function EditableCell({ value, placeholder = '입력', onSave, style, inputStyle }: EditableCellProps) {
  const baseInputStyle: CSSProperties = {
    width: '100%',
    border: '1px solid #e0e0e0',
    borderRadius: '2px',
    padding: '2px 4px',
    fontSize: '11px',
    background: '#fffef0',
    ...inputStyle
  };

  if (value) {
    return (
      <span className="break-words whitespace-normal leading-snug block py-0.5 px-1" style={style}>
        {value}
      </span>
    );
  }

  return (
    <input
      type="text"
      placeholder={placeholder}
      style={baseInputStyle}
      onBlur={(e) => {
        if (e.target.value) {
          onSave(e.target.value);
        }
      }}
    />
  );
}












