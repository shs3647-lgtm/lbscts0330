/**
 * @file Fmea4Tab.tsx
 * @description FMEA 4판 워크시트 탭 컴포넌트
 * 
 * 전통적인 RPN 방식의 FMEA 양식
 * - 23개 열 구조
 * - S×O×D = RPN 자동 계산
 * - 개선 전/후 비교
 */

'use client';

import React, { useMemo, useCallback } from 'react';
import { WorksheetState } from '../../constants';
import { 
  Fmea4Row, 
  createEmptyFmea4Row, 
  calculateRPN, 
  getRPNLevel, 
  RPN_COLORS,
  FMEA4_COLUMNS,
  FMEA4_HEADER_GROUPS
} from '../../types/fmea4';
import { convertToFmea4 } from './convertToFmea4';
import { exportFmea4Excel } from './exportFmea4Excel';

interface Fmea4TabProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage?: (force?: boolean) => void;
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
}

// 테이블 스타일
const styles = {
  container: 'w-full h-full overflow-auto bg-white',
  table: 'w-full border-collapse min-w-[2000px]',
  thead: 'sticky top-0 z-10 bg-white',
  
  // 헤더 그룹 (1행)
  headerGroup: 'bg-[#1565c0] text-white text-xs font-bold text-center border border-[#0d47a1] py-1.5',
  
  // 열 헤더 (2행)
  columnHeader: 'bg-[#1976d2] text-white text-[10px] font-semibold text-center border border-[#1565c0] py-1 px-1',
  
  // 데이터 셀
  cell: 'border border-[#ccc] text-[11px] p-1 align-top',
  cellCenter: 'border border-[#ccc] text-[11px] p-1 text-center align-middle',
  cellNumber: 'border border-[#ccc] text-[11px] p-1 text-center align-middle font-semibold',
  
  // 입력 필드
  input: 'w-full border-none bg-transparent text-[11px] outline-none focus:bg-blue-50 p-0.5',
  inputNumber: 'w-full border-none bg-transparent text-[11px] text-center outline-none focus:bg-blue-50 p-0.5',
  
  // RPN 셀
  rpnHigh: 'bg-red-100 text-red-700 font-bold',
  rpnMedium: 'bg-yellow-100 text-yellow-700 font-bold',
  rpnLow: 'bg-green-100 text-green-700 font-bold',
};

export default function Fmea4Tab({ state, setState, setDirty, saveToLocalStorage, saveAtomicDB }: Fmea4TabProps) {
  // 4판 데이터 가져오기 (없으면 빈 배열)
   
  const fmea4Rows: Fmea4Row[] = useMemo(() => {
    return ((state as unknown as Record<string, unknown>).fmea4Rows as Fmea4Row[]) || [];
  }, [(state as unknown as Record<string, unknown>).fmea4Rows]);

  // 셀 병합 정보 계산 (NO, 공정명, 설계기능, 고장형태)
  const mergeInfo = useMemo(() => {
    const info: { [rowIdx: number]: { 
      processNo: number; 
      processName: number; 
      processFunction: number;
      failureMode: number;
      showProcess: boolean;
      showFM: boolean;
    } } = {};
    
    let i = 0;
    while (i < fmea4Rows.length) {
      const currentRow = fmea4Rows[i];
      const processKey = `${currentRow.processNo}|${currentRow.processName}`;
      
      // 같은 공정(NO+공정명)을 가진 연속 행 수 계산
      let processSpan = 1;
      let j = i + 1;
      while (j < fmea4Rows.length) {
        const nextRow = fmea4Rows[j];
        const nextKey = `${nextRow.processNo}|${nextRow.processName}`;
        if (nextKey === processKey) {
          processSpan++;
          j++;
        } else {
          break;
        }
      }
      
      // 같은 공정 내에서 고장형태 병합 계산
      let k = i;
      while (k < i + processSpan) {
        const fmRow = fmea4Rows[k];
        const fmKey = `${processKey}|${fmRow.failureMode}`;
        
        let fmSpan = 1;
        let m = k + 1;
        while (m < i + processSpan) {
          const nextFmRow = fmea4Rows[m];
          const nextFmKey = `${processKey}|${nextFmRow.failureMode}`;
          if (nextFmKey === fmKey) {
            fmSpan++;
            m++;
          } else {
            break;
          }
        }
        
        // 첫 행에 병합 정보 저장
        info[k] = {
          processNo: k === i ? processSpan : 0,
          processName: k === i ? processSpan : 0,
          processFunction: k === i ? processSpan : 0,
          failureMode: fmSpan,
          showProcess: k === i,
          showFM: true
        };
        
        // 병합되는 나머지 행
        for (let n = k + 1; n < k + fmSpan; n++) {
          info[n] = {
            processNo: 0,
            processName: 0,
            processFunction: 0,
            failureMode: 0,
            showProcess: false,
            showFM: false
          };
        }
        
        k += fmSpan;
      }
      
      i += processSpan;
    }
    
    return info;
  }, [fmea4Rows]);

  // ★ DB 저장 트리거 (변경 후 호출)
  const triggerSave = useCallback(() => {
    setTimeout(() => {
      saveToLocalStorage?.(true);
      if (saveAtomicDB) saveAtomicDB(true);
    }, 100);
  }, [saveToLocalStorage, saveAtomicDB]);

  // 행 추가
  const addRow = useCallback(() => {
    const lastRow = fmea4Rows[fmea4Rows.length - 1];
    const newRow = createEmptyFmea4Row(
      lastRow ? String(Number(lastRow.processNo) + 10) : '10',
      ''
    );
    setState(prev => ({
      ...prev,
       
      fmea4Rows: [...(((prev as unknown as Record<string, unknown>).fmea4Rows as Fmea4Row[]) || []), newRow]
    }));
    setDirty(true);
    triggerSave();
  }, [fmea4Rows, setState, setDirty, triggerSave]);

  // 7단계 데이터 → 4판으로 변환
  const handleConvert = useCallback(() => {
    const converted = convertToFmea4(state);
    if (converted.length === 0) {
      alert('⚠️ 변환할 데이터가 없습니다.\n\n먼저 구조분석, 기능분석, 고장분석을 진행하세요.');
      return;
    }
    setState(prev => ({ ...prev, fmea4Rows: converted }));
    setDirty(true);
    triggerSave();
    alert(`✅ ${converted.length}개 행이 4판 형식으로 변환되었습니다.`);
  }, [state, setState, setDirty, triggerSave]);

  // Excel Export
  const handleExport = useCallback(() => {
    if (fmea4Rows.length === 0) {
      alert('⚠️ 내보낼 데이터가 없습니다.');
      return;
    }
    exportFmea4Excel(fmea4Rows);
  }, [fmea4Rows]);

  // 행 삭제
  const deleteRow = useCallback((rowId: string) => {
    setState(prev => ({
      ...prev,
       
      fmea4Rows: (((prev as unknown as Record<string, unknown>).fmea4Rows as Fmea4Row[]) || []).filter((r: Fmea4Row) => r.id !== rowId)
    }));
    setDirty(true);
    triggerSave();
  }, [setState, setDirty, triggerSave]);

  // 셀 값 변경
  const updateCell = useCallback((rowId: string, field: keyof Fmea4Row, value: string | number) => {
    setState(prev => {
      const rows = [...(((prev as unknown as Record<string, unknown>).fmea4Rows as Fmea4Row[]) || [])];
      const idx = rows.findIndex((r: Fmea4Row) => r.id === rowId);
      if (idx === -1) return prev;

      const row = { ...rows[idx] };
      (row as Record<string, unknown>)[field] = value;

      // RPN 자동 계산 (현재)
      if (['severity', 'occurrence', 'detection'].includes(field)) {
        row.rpn = calculateRPN(row.severity, row.occurrence, row.detection);
      }
      // RPN 자동 계산 (개선 후)
      if (['severityAfter', 'occurrenceAfter', 'detectionAfter'].includes(field)) {
        row.rpnAfter = calculateRPN(row.severityAfter, row.occurrenceAfter, row.detectionAfter);
      }

      rows[idx] = row;
      return { ...prev, fmea4Rows: rows };
    });
    setDirty(true);
  }, [setState, setDirty]);

  // RPN 스타일 반환
  const getRpnStyle = (rpn: number): string => {
    const level = getRPNLevel(rpn);
    if (level === 'HIGH') return styles.rpnHigh;
    if (level === 'MEDIUM') return styles.rpnMedium;
    return styles.rpnLow;
  };

  return (
    <div className={styles.container}>
      {/* 툴바 */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-blue-800 to-blue-600 px-3 py-2 flex items-center justify-between border-b-2 border-blue-900">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm">📋 FMEA 4판 (RPN 방식)</span>
          <span className="text-blue-200 text-xs">| 총 {fmea4Rows.length}행</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleConvert}
            className="px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded hover:bg-orange-600 transition"
            title="7단계 FMEA 데이터를 4판 형식으로 변환"
          >
            🔄 변환
          </button>
          <button
            onClick={addRow}
            className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded hover:bg-green-600 transition"
          >
            + 행 추가
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded hover:bg-blue-600 transition"
          >
            📤 Export
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <table className={styles.table}>
        <thead className={styles.thead}>
          {/* 1행: 그룹 헤더 */}
          <tr>
            {FMEA4_HEADER_GROUPS.map((group, idx) => (
              <th 
                key={idx} 
                colSpan={group.colspan} 
                className={styles.headerGroup}
              >
                {group.label}
              </th>
            ))}
          </tr>
          
          {/* 2행: 열 헤더 */}
          <tr>
            {FMEA4_COLUMNS.map((col) => (
              <th 
                key={col.key} 
                className={styles.columnHeader}
                style={{ width: col.width, minWidth: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {fmea4Rows.length === 0 ? (
            <tr>
              <td colSpan={23} className="text-center py-10 text-gray-400">
                데이터가 없습니다. [+ 행 추가] 버튼을 클릭하세요.
              </td>
            </tr>
          ) : (
            fmea4Rows.map((row, idx) => {
              const zebraBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
              const merge = mergeInfo[idx] || { processNo: 1, processName: 1, processFunction: 1, failureMode: 1, showProcess: true, showFM: true };
              
              return (
                <tr key={row.id} className={zebraBg}>
                  {/* NO - 병합 */}
                  {merge.processNo > 0 && (
                    <td className={`${styles.cellCenter} bg-blue-50`} rowSpan={merge.processNo}>
                      <input
                        type="text"
                        value={row.processNo}
                        onChange={(e) => updateCell(row.id, 'processNo', e.target.value)}
                        className={`${styles.inputNumber} font-bold`}
                      />
                    </td>
                  )}
                  
                  {/* 공정명 - 병합 */}
                  {merge.processName > 0 && (
                    <td className={`${styles.cell} bg-blue-50`} rowSpan={merge.processName}>
                      <input
                        type="text"
                        value={row.processName}
                        onChange={(e) => updateCell(row.id, 'processName', e.target.value)}
                        className={`${styles.input} font-semibold`}
                        placeholder="공정명"
                      />
                    </td>
                  )}
                  
                  {/* 공정 기능 - 병합 */}
                  {merge.processFunction > 0 && (
                    <td className={`${styles.cell} bg-blue-50`} rowSpan={merge.processFunction}>
                      <input
                        type="text"
                        value={row.processFunction}
                        onChange={(e) => updateCell(row.id, 'processFunction', e.target.value)}
                        className={styles.input}
                        placeholder="공정 기능"
                      />
                    </td>
                  )}
                  
                  {/* 고장형태 (FM) - 병합 */}
                  {merge.failureMode > 0 && (
                    <td className={`${styles.cell} bg-orange-50`} rowSpan={merge.failureMode}>
                      <input
                        type="text"
                        value={row.failureMode}
                        onChange={(e) => updateCell(row.id, 'failureMode', e.target.value)}
                        className={`${styles.input} font-medium`}
                        placeholder="FM"
                      />
                    </td>
                  )}
                  
                  {/* 특별특성1 */}
                  <td className={styles.cellCenter}>
                    <input
                      type="text"
                      value={row.specialChar1}
                      onChange={(e) => updateCell(row.id, 'specialChar1', e.target.value)}
                      className={styles.inputNumber}
                    />
                  </td>
                  
                  {/* 고장영향 (FE) */}
                  <td className={styles.cell}>
                    <input
                      type="text"
                      value={row.failureEffect}
                      onChange={(e) => updateCell(row.id, 'failureEffect', e.target.value)}
                      className={styles.input}
                      placeholder="FE"
                    />
                  </td>
                  
                  {/* 심각도 */}
                  <td className={`${styles.cellNumber} bg-red-50`}>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={row.severity || ''}
                      onChange={(e) => updateCell(row.id, 'severity', Number(e.target.value))}
                      className={styles.inputNumber}
                    />
                  </td>
                  
                  {/* 특별특성2 */}
                  <td className={styles.cellCenter}>
                    <input
                      type="text"
                      value={row.specialChar2}
                      onChange={(e) => updateCell(row.id, 'specialChar2', e.target.value)}
                      className={styles.inputNumber}
                    />
                  </td>
                  
                  {/* 고장원인 (FC) */}
                  <td className={styles.cell}>
                    <input
                      type="text"
                      value={row.failureCause}
                      onChange={(e) => updateCell(row.id, 'failureCause', e.target.value)}
                      className={styles.input}
                      placeholder="FC"
                    />
                  </td>
                  
                  {/* 설계검증 예방 */}
                  <td className={styles.cell}>
                    <input
                      type="text"
                      value={row.preventionControl}
                      onChange={(e) => updateCell(row.id, 'preventionControl', e.target.value)}
                      className={styles.input}
                      placeholder="PC"
                    />
                  </td>
                  
                  {/* 발생도 */}
                  <td className={`${styles.cellNumber} bg-yellow-50`}>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={row.occurrence || ''}
                      onChange={(e) => updateCell(row.id, 'occurrence', Number(e.target.value))}
                      className={styles.inputNumber}
                    />
                  </td>
                  
                  {/* 설계검증 검출 */}
                  <td className={styles.cell}>
                    <input
                      type="text"
                      value={row.detectionControl}
                      onChange={(e) => updateCell(row.id, 'detectionControl', e.target.value)}
                      className={styles.input}
                      placeholder="DC"
                    />
                  </td>
                  
                  {/* 검출도 */}
                  <td className={`${styles.cellNumber} bg-green-50`}>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={row.detection || ''}
                      onChange={(e) => updateCell(row.id, 'detection', Number(e.target.value))}
                      className={styles.inputNumber}
                    />
                  </td>
                  
                  {/* RPN (자동 계산) */}
                  <td className={`${styles.cellNumber} ${row.rpn > 0 ? getRpnStyle(row.rpn) : ''}`}>
                    {row.rpn > 0 ? row.rpn : ''}
                  </td>
                  
                  {/* 설계검증 예방 개선 */}
                  <td className={styles.cell}>
                    <input
                      type="text"
                      value={row.preventionImprove}
                      onChange={(e) => updateCell(row.id, 'preventionImprove', e.target.value)}
                      className={styles.input}
                    />
                  </td>
                  
                  {/* 설계검증 검출 개선 */}
                  <td className={styles.cell}>
                    <input
                      type="text"
                      value={row.detectionImprove}
                      onChange={(e) => updateCell(row.id, 'detectionImprove', e.target.value)}
                      className={styles.input}
                    />
                  </td>
                  
                  {/* 담당자 */}
                  <td className={styles.cell}>
                    <input
                      type="text"
                      value={row.responsible}
                      onChange={(e) => updateCell(row.id, 'responsible', e.target.value)}
                      className={styles.input}
                    />
                  </td>
                  
                  {/* 완료일 */}
                  <td className={styles.cell}>
                    <input
                      type="date"
                      value={row.targetDate}
                      onChange={(e) => updateCell(row.id, 'targetDate', e.target.value)}
                      className={styles.input}
                    />
                  </td>
                  
                  {/* 개선 후 심각도 */}
                  <td className={`${styles.cellNumber} bg-red-50`}>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={row.severityAfter || ''}
                      onChange={(e) => updateCell(row.id, 'severityAfter', Number(e.target.value))}
                      className={styles.inputNumber}
                    />
                  </td>
                  
                  {/* 개선 후 발생도 */}
                  <td className={`${styles.cellNumber} bg-yellow-50`}>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={row.occurrenceAfter || ''}
                      onChange={(e) => updateCell(row.id, 'occurrenceAfter', Number(e.target.value))}
                      className={styles.inputNumber}
                    />
                  </td>
                  
                  {/* 개선 후 검출도 */}
                  <td className={`${styles.cellNumber} bg-green-50`}>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={row.detectionAfter || ''}
                      onChange={(e) => updateCell(row.id, 'detectionAfter', Number(e.target.value))}
                      className={styles.inputNumber}
                    />
                  </td>
                  
                  {/* 개선 후 RPN */}
                  <td className={`${styles.cellNumber} ${row.rpnAfter > 0 ? getRpnStyle(row.rpnAfter) : ''}`}>
                    {row.rpnAfter > 0 ? row.rpnAfter : ''}
                  </td>
                  
                  {/* 비고 */}
                  <td className={styles.cell}>
                    <input
                      type="text"
                      value={row.remarks}
                      onChange={(e) => updateCell(row.id, 'remarks', e.target.value)}
                      className={styles.input}
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

