/**
 * @file LLDTableRow.tsx
 * @description LLD 테이블 행 컴포넌트 — 줄바꿈 + 콤팩트 최적화
 */

'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import {
  LLDRow, CLASSIFICATION_OPTIONS, CLASSIFICATION_LABELS, CLASSIFICATION_COLORS,
  STATUS_OPTIONS, STATUS_COLORS,
  type Classification,
} from '../types';

const getStatusBadgeStyle = (status: 'G' | 'Y' | 'R') => {
  const c = STATUS_COLORS[status];
  return { backgroundColor: c.background, color: c.color, border: 'none', fontWeight: 600 };
};

// 텍스트 셀: 줄바꿈 허용 + 최소 높이 + 작은 글씨
const textCellClass = 'px-1 py-0 border-b border-r border-slate-200 text-[9px] leading-[12px] align-top';
const textStyle: React.CSSProperties = { whiteSpace: 'pre-line', wordBreak: 'break-word', lineHeight: '12px' };

// 인라인 입력: 최소 패딩
const miniInputClass = 'w-full border-0 bg-transparent text-[9px] outline-none px-1 py-0 leading-[12px]';
const numInputStyle: React.CSSProperties = {
  fontSize: 12, height: 22, appearance: 'textfield',
  MozAppearance: 'textfield', background: 'transparent', textAlign: 'center',
};

interface LLDTableRowProps {
  row: LLDRow;
  index: number;
  onCellChange: (id: string, field: keyof LLDRow, value: string | number | null) => void;
  onDeleteRow: (id: string) => void;
}

const LLDTableRow = React.memo(function LLDTableRow({
  row, index, onCellChange, onDeleteRow,
}: LLDTableRowProps) {
  const bg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60';
  const bd = 'border-b border-r border-slate-200';

  return (
    <tr className={`${bg} hover:bg-blue-50`} style={{ minHeight: 28 }}>
      {/* LLD No */}
      <td className={`px-0.5 py-0 ${bd} text-center font-bold bg-slate-50 text-[9px]`}>{row.lldNo}</td>

      {/* 구분 */}
      <td className={`p-0 ${bd} text-center`}>
        <Select value={row.classification} onValueChange={v => onCellChange(row.id, 'classification', v)}>
          <SelectTrigger className="h-5 text-[9px] border-0 bg-transparent p-0 justify-center [&>svg]:hidden">
            <span className="px-0.5 py-0 rounded text-white text-[8px] font-bold" style={{ backgroundColor: CLASSIFICATION_COLORS[row.classification] }}>
              {CLASSIFICATION_LABELS[row.classification]}
            </span>
          </SelectTrigger>
          <SelectContent>{CLASSIFICATION_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-[10px]">{CLASSIFICATION_LABELS[o]}</SelectItem>)}</SelectContent>
        </Select>
      </td>

      {/* 제품명 */}
      <td className={textCellClass} style={textStyle}>
        <input value={row.productName} onChange={e => onCellChange(row.id, 'productName', e.target.value)}
          className={`${miniInputClass} text-center ${!row.productName ? 'bg-red-50' : ''}`} placeholder="*" />
      </td>

      {/* 공정명 */}
      <td className={textCellClass} style={textStyle}>
        <input value={row.processName} onChange={e => onCellChange(row.id, 'processName', e.target.value)}
          className={`${miniInputClass} text-center ${!row.processName ? 'bg-red-50' : ''}`} placeholder="*" />
      </td>

      {/* 고장형태(FM) — 줄바꿈 허용 */}
      <td className={textCellClass} style={textStyle} title={row.failureMode}>{row.failureMode || '\u00A0'}</td>

      {/* 고장원인(FC) — 줄바꿈 허용 */}
      <td className={textCellClass} style={textStyle} title={row.cause}>{row.cause || '\u00A0'}</td>

      {/* S */}
      <td className={`p-0 ${bd} text-center align-middle`} style={{ backgroundColor: '#fef2f2' }}>
        <input type="number" min={1} max={10} value={row.severity ?? ''} onChange={e => onCellChange(row.id, 'severity', e.target.value ? parseInt(e.target.value, 10) : null)}
          className="w-full border-0 text-center font-bold outline-none" style={{ ...numInputStyle, color: '#991b1b' }} />
      </td>

      {/* O */}
      <td className={`p-0 ${bd} text-center align-middle`} style={{ backgroundColor: '#eef6fb' }}>
        <input type="number" min={1} max={10} value={row.occurrence ?? ''} onChange={e => onCellChange(row.id, 'occurrence', e.target.value ? parseInt(e.target.value, 10) : null)}
          className="w-full border-0 text-center font-bold outline-none" style={{ ...numInputStyle, color: '#1a365d' }} />
      </td>

      {/* D */}
      <td className={`p-0 ${bd} text-center align-middle`} style={{ backgroundColor: '#fef9ee' }}>
        <input type="number" min={1} max={10} value={row.detection ?? ''} onChange={e => onCellChange(row.id, 'detection', e.target.value ? parseInt(e.target.value, 10) : null)}
          className="w-full border-0 text-center font-bold outline-none" style={{ ...numInputStyle, color: '#7c2d12' }} />
      </td>

      {/* 예방관리 개선 — 줄바꿈 허용 */}
      <td className={textCellClass} style={textStyle} title={row.preventionImprovement}>
        {row.preventionImprovement || '\u00A0'}
      </td>

      {/* 검출관리 개선 — 줄바꿈 허용 */}
      <td className={textCellClass} style={textStyle} title={row.detectionImprovement}>
        {row.detectionImprovement || '\u00A0'}
      </td>

      {/* 개선일자 */}
      <td className={`p-0 ${bd} text-center text-[8px]`}>
        <input type="date" value={row.completedDate || ''} onChange={e => onCellChange(row.id, 'completedDate', e.target.value)}
          className={`${miniInputClass} text-center text-[8px]`} />
      </td>

      {/* 상태 */}
      <td className={`p-0 ${bd} text-center`}>
        <Select value={row.status} onValueChange={v => onCellChange(row.id, 'status', v)}>
          <SelectTrigger className="h-5 text-[9px] border-0 bg-transparent p-0 justify-center [&>svg]:hidden">
            <Badge style={getStatusBadgeStyle(row.status as 'G' | 'Y' | 'R')} className="h-4 text-[8px] px-0.5">{row.status}</Badge>
          </SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-[10px]">{STATUS_COLORS[o].label}</SelectItem>)}</SelectContent>
        </Select>
      </td>

      {/* 담당자 */}
      <td className={`p-0 ${bd}`}>
        <input value={row.owner} onChange={e => onCellChange(row.id, 'owner', e.target.value)}
          className={`${miniInputClass} text-center`} />
      </td>

      {/* FMEA */}
      <td className={`px-0.5 py-0 ${bd} text-center text-[8px] font-mono`} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {row.fmeaId || '-'}
      </td>

      {/* 첨부 */}
      <td className={`px-0.5 py-0 ${bd} text-center text-[8px]`} title={row.attachmentUrl || ''}>
        {row.attachmentUrl ? '📎' : '-'}
      </td>

      {/* 삭제 */}
      <td className="p-0 border-b border-slate-200 text-center">
        <Button variant="ghost" size="sm" className="h-4 w-4 p-0 text-red-600" onClick={() => onDeleteRow(row.id)}><Trash2 className="w-3 h-3" /></Button>
      </td>
    </tr>
  );
});

export default LLDTableRow;
