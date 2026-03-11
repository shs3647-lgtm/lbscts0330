/**
 * @file FMEAWorksheet.tsx
 * @description Handsontable 기반 PFMEA 워크시트 컴포넌트
 * @version 1.0.0
 * @created 2025-12-26
 * @ref PRD-005-pfmea-worksheet.md
 */

'use client';

import { useRef, useEffect, useCallback } from 'react';
import { HotTable, HotColumn } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import type { CellChange } from 'handsontable/common';
import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.min.css';

import { PFMEA_COLUMNS, COLUMN_GROUPS, getNestedHeaders } from './columns';
import { calculateAP, AP_COLORS, type PFMEAWorksheetRow } from './types';

// Handsontable 모듈 등록
registerAllModules();

interface FMEAWorksheetProps {
  data: PFMEAWorksheetRow[];
  onChange: (data: PFMEAWorksheetRow[]) => void;
  readOnly?: boolean;
}

/** PFMEA 워크시트 컴포넌트 */
export function FMEAWorksheet({ data, onChange, readOnly = false }: FMEAWorksheetProps) {
  const hotRef = useRef<any>(null);
  
  // 데이터 변경 핸들러
  const handleAfterChange = useCallback(
    (changes: CellChange[] | null, source: string) => {
      if (!changes || source === 'loadData') return;
      
      // HotTable에서 핫 인스턴스 접근 (타입 체크 우회)
      const hotInstance = (hotRef.current as any)?.hotInstance;
      if (!hotInstance) return;
      
      // 데이터 복사
      const newData = [...data];
      
      changes.forEach(([row, prop, , newValue]) => {
        if (typeof prop === 'string' && newData[row]) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (newData[row] as any)[prop] = newValue;
          
          // S, O 변경 시 AP 자동 계산
          if (prop === 'severity' || prop === 'occurrence') {
            const s = newData[row].severity;
            const o = newData[row].occurrence;
            if (s !== null && o !== null && s > 0 && o > 0) {
              newData[row].ap = calculateAP(s, o);
            }
          }
          
          // 조치후 S, O 변경 시 AP(후) 자동 계산
          if (prop === 'severityAfter' || prop === 'occurrenceAfter') {
            const s = newData[row].severityAfter;
            const o = newData[row].occurrenceAfter;
            if (s !== null && o !== null && s > 0 && o > 0) {
              newData[row].apAfter = calculateAP(s, o);
            }
          }
        }
      });
      
      onChange(newData);
    },
    [data, onChange]
  );
  
  // AP 셀 렌더러
  const apRenderer = useCallback(
    (
      instance: Handsontable,
      td: HTMLTableCellElement,
      row: number,
      col: number,
      prop: string | number,
      value: string | null
    ) => {
      td.innerHTML = value || '';
      td.style.textAlign = 'center';
      td.style.fontWeight = 'bold';
      
      if (value && AP_COLORS[value as keyof typeof AP_COLORS]) {
        const color = AP_COLORS[value as keyof typeof AP_COLORS];
        td.style.backgroundColor = color.bg;
        td.style.color = color.text;
      } else {
        td.style.backgroundColor = '';
        td.style.color = '';
      }
      
      return td;
    },
    []
  );
  
  // 컬럼 그룹 헤더 스타일링
  useEffect(() => {
    const hot = (hotRef.current as any)?.hotInstance;
    if (!hot) return;
    
    // 커스텀 스타일 적용
    const style = document.createElement('style');
    style.textContent = `
      .structure-col { background-color: rgba(59, 130, 246, 0.05) !important; }
      .function-col { background-color: rgba(16, 185, 129, 0.05) !important; }
      .failure-col { background-color: rgba(245, 158, 11, 0.05) !important; }
      .risk-col { background-color: rgba(239, 68, 68, 0.05) !important; }
      .optimize-col { background-color: rgba(139, 92, 246, 0.05) !important; }
      
      .handsontable th {
        background: linear-gradient(to bottom, #f8fafc 0%, #e2e8f0 100%);
        font-weight: 600;
        font-size: 12px;
      }
      
      .handsontable td {
        font-size: 12px;
        padding: 4px 6px;
      }
      
      .handsontable .htDimmed {
        color: #64748b;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="w-full h-full overflow-hidden border border-slate-200 rounded-lg">
      <HotTable
        ref={hotRef}
        data={data}
        licenseKey="non-commercial-and-evaluation"
        height="100%"
        width="100%"
        stretchH="none"
        rowHeaders={true}
        colHeaders={PFMEA_COLUMNS.map((c) => c.header)}
        nestedHeaders={getNestedHeaders()}
        fixedColumnsStart={2}
        manualColumnResize={true}
        manualRowResize={true}
        contextMenu={!readOnly}
        filters={true}
        dropdownMenu={true}
        columnSorting={true}
        undo={true}
        mergeCells={false}
        comments={true}
        afterChange={handleAfterChange}
        autoWrapRow={true}
        autoWrapCol={true}
        readOnly={readOnly}
        className="htCustom"
      >
        {PFMEA_COLUMNS.map((col, idx) => (
          <HotColumn
            key={idx}
            data={col.data}
            width={col.width}
            type={col.type === 'dropdown' ? 'dropdown' : col.type === 'date' ? 'date' : 'text'}
            source={col.source}
            className={col.className}
            renderer={col.renderer === 'apRenderer' ? apRenderer : undefined}
          />
        ))}
      </HotTable>
    </div>
  );
}

export default FMEAWorksheet;



