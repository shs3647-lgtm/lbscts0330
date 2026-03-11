/**
 * @file FailureL2Tab.tsx
 * @description 2L 고장형태(FM) 분석 - 원자성 데이터 구조 적용
 * @refactored 2025-12-30 - 부모-자식 관계 정확 구현
 * 
 * [원자성 원칙]
 * ⭐ 1. 한 상위에 여러 하위 연결 가능
 * ⭐ 2. 각 하위는 별도 행에 저장 (배열 아님!)
 * ⭐ 3. 상위는 rowSpan으로 셀 합치기
 * ⭐ 4. 모든 하위에 상위 FK(productCharId) 저장
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { FailureTabProps } from './types';
import SelectableCell from '@/components/worksheet/SelectableCell';
import DataSelectModal from '@/components/modals/DataSelectModal';
import { COLORS, uid, FONT_SIZES, FONT_WEIGHTS } from '../../constants';
import {
  STEP_COLORS,
  containerStyle,
  tableStyle,
  colStyle,
  headerMainRow,
  headerSubRow,
  colHeaderRow,
  headerFlexContainer,
  headerButtonGroup,
  confirmButtonStyle,
  confirmBadgeStyle,
  missingBadgeStyle,
  missingPillStyle,
  missingPillInlineStyle,
  headerRowBg,
  dataRowStyle,
  dataCellStyle,
  emptyMessageStyle,
  warningContainerStyle,
  warningTextStyle,
  severitySelectStyle,
  severityOptionStyle,
} from './FailureTabStyles';

const FAIL_COLORS = {
  header1: '#1a237e', header2: '#3949ab', header3: '#5c6bc0', cell: '#f5f6fc', cellAlt: '#e8eaf6',
};

// 스타일 함수
const BORDER = '1px solid #b0bec5';
const cellBase: React.CSSProperties = { border: BORDER, padding: '4px 6px', fontSize: FONT_SIZES.cell, verticalAlign: 'middle' };
const headerStyle = (bg: string, color = '#fff'): React.CSSProperties => ({ ...cellBase, background: bg, color, fontWeight: FONT_WEIGHTS.bold, textAlign: 'center' });
const dataCell = (bg: string): React.CSSProperties => ({ ...cellBase, background: bg });

export default function FailureL2Tab({ state, setState, setDirty, saveToLocalStorage }: FailureTabProps) {
  const [modal, setModal] = useState<{ 
    type: string; 
    processId: string; 
    productCharId: string;
    title: string; 
    itemCode: string;
    parentProductChar: string;
    processName: string;
  } | null>(null);

  const processList = useMemo(() => 
    state.l2.filter(p => p.name && !p.name.includes('클릭')).map(p => ({ id: p.id, no: p.no, name: `${p.no}. ${p.name}` })),
    [state.l2]
  );

  const isConfirmed = state.failureL2Confirmed || false;

  const isMissing = (name: string | undefined) => {
    if (!name) return true;
    const trimmed = name.trim();
    if (trimmed === '' || trimmed === '-') return true;
    if (name.includes('클릭') || name.includes('추가') || name.includes('선택') || name.includes('입력')) return true;
    return false;
  };

  // 누락 건수 계산
  const missingCounts = useMemo(() => {
    let failureModeCount = 0;
    
    state.l2.forEach(proc => {
      if (isMissing(proc.name)) return;
      const allModes = proc.failureModes || [];
      
      (proc.functions || []).forEach((f: any) => {
        (f.productChars || []).forEach((pc: any) => {
          if (!pc.name || isMissing(pc.name)) return;
          const linkedModes = allModes.filter((m: any) => m.productCharId === pc.id);
          if (linkedModes.length === 0) {
            failureModeCount++;
          } else {
            linkedModes.forEach((m: any) => {
              if (isMissing(m.name)) failureModeCount++;
            });
          }
        });
      });
    });
    return { failureModeCount, total: failureModeCount };
  }, [state.l2]);
  
  const missingCount = missingCounts.total;

  const handleConfirm = useCallback(() => {
    if (missingCount > 0) {
      alert(`누락된 항목이 ${missingCount}건 있습니다.\n먼저 입력을 완료해주세요.`);
      return;
    }
    setState(prev => ({ ...prev, failureL2Confirmed: true }));
    saveToLocalStorage?.();
    alert('2L 고장형태(FM) 분석이 확정되었습니다.');
  }, [missingCount, setState, saveToLocalStorage]);

  const handleEdit = useCallback(() => {
    setState(prev => ({ ...prev, failureL2Confirmed: false }));
  }, [setState]);

  /**
   * [핵심] handleSave - 원자성 저장
   * - 여러 개 선택 시 각각 별도 레코드로 저장
   * - 모든 레코드에 productCharId FK 저장
   */
  const handleSave = useCallback((selectedValues: string[]) => {
    if (!modal) return;
    
    const { processId, productCharId } = modal;
    
    console.log('[FailureL2Tab] 저장');
    console.log('  - processId:', processId);
    console.log('  - productCharId:', productCharId);
    console.log('  - selectedValues:', selectedValues);
    
    setState(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== processId) return proc;
        
        const currentModes = proc.failureModes || [];
        
        // 1. 다른 productCharId의 고장형태는 보존
        const otherModes = currentModes.filter((m: any) => m.productCharId !== productCharId);
        
        // 2. 선택된 값들 각각 별도 레코드로 생성
        const newModes = selectedValues.map(val => {
          const existing = currentModes.find((m: any) => 
            m.productCharId === productCharId && m.name === val
          );
          return existing || { 
            id: uid(), 
            name: val, 
            sc: false, 
            productCharId: productCharId
          };
        });
        
        console.log('  - 보존:', otherModes.length, '새로:', newModes.length);
        
        return {
          ...proc,
          failureModes: [...otherModes, ...newModes]
        };
      });
      
      return newState;
    });
    
    setDirty(true);
    setModal(null);
    
    if (saveToLocalStorage) {
      setTimeout(() => saveToLocalStorage(), 100);
    }
  }, [modal, setState, setDirty, saveToLocalStorage]);

  const handleDelete = useCallback((deletedValues: string[]) => {
    if (!modal) return;
    
    const { processId, productCharId } = modal;
    const deletedSet = new Set(deletedValues);
    
    setState(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== processId) return proc;
        
        return { 
          ...proc, 
          failureModes: (proc.failureModes || []).filter((m: any) => {
            if (m.productCharId !== productCharId) return true;
            return !deletedSet.has(m.name);
          })
        };
      });
      
      return newState;
    });
    
    setDirty(true);
    if (saveToLocalStorage) setTimeout(() => saveToLocalStorage(), 100);
  }, [modal, setState, setDirty, saveToLocalStorage]);

  const processes = state.l2.filter(p => p.name && !p.name.includes('클릭'));

  /**
   * [핵심] 플랫 행 구조 생성
   * - 각 고장형태가 별도 행
   * - 제품특성은 rowSpan으로 합치기
   * - 공정/기능도 적절히 rowSpan
   */
  const buildFlatRows = useMemo(() => {
    const rows: {
      procId: string;
      procNo: string;
      procName: string;
      procRowSpan: number;
      showProc: boolean;
      funcId: string;
      funcName: string;
      funcRowSpan: number;
      showFunc: boolean;
      charId: string;
      charName: string;
      charRowSpan: number;
      showChar: boolean;
      modeId: string;
      modeName: string;
    }[] = [];

    processes.forEach(proc => {
      const allModes = proc.failureModes || [];
      const functions = proc.functions || [];
      
      let procRowCount = 0;
      let procFirstRowIdx = rows.length;
      
      if (functions.length === 0) {
        // 기능 없는 공정
        rows.push({
          procId: proc.id, procNo: proc.no, procName: proc.name,
          procRowSpan: 1, showProc: true,
          funcId: '', funcName: '', funcRowSpan: 1, showFunc: true,
          charId: '', charName: '', charRowSpan: 1, showChar: true,
          modeId: '', modeName: ''
        });
        procRowCount = 1;
      } else {
        functions.forEach((f: any, fIdx: number) => {
          const pChars = f.productChars || [];
          let funcRowCount = 0;
          const funcFirstRowIdx = rows.length;
          
          if (pChars.length === 0) {
            // 제품특성 없는 기능
            rows.push({
              procId: proc.id, procNo: proc.no, procName: proc.name,
              procRowSpan: 0, showProc: false,
              funcId: f.id, funcName: f.name, funcRowSpan: 1, showFunc: true,
              charId: '', charName: '', charRowSpan: 1, showChar: true,
              modeId: '', modeName: ''
            });
            funcRowCount = 1;
          } else {
            pChars.forEach((pc: any, pcIdx: number) => {
              const linkedModes = allModes.filter((m: any) => m.productCharId === pc.id);
              const charFirstRowIdx = rows.length;
              
              if (linkedModes.length === 0) {
                // 고장형태 없는 제품특성 (빈 행 1개)
                rows.push({
                  procId: proc.id, procNo: proc.no, procName: proc.name,
                  procRowSpan: 0, showProc: false,
                  funcId: f.id, funcName: f.name, funcRowSpan: 0, showFunc: false,
                  charId: pc.id, charName: pc.name, charRowSpan: 1, showChar: true,
                  modeId: '', modeName: ''
                });
              } else {
                // 각 고장형태가 별도 행!
                linkedModes.forEach((m: any, mIdx: number) => {
                  rows.push({
                    procId: proc.id, procNo: proc.no, procName: proc.name,
                    procRowSpan: 0, showProc: false,
                    funcId: f.id, funcName: f.name, funcRowSpan: 0, showFunc: false,
                    charId: pc.id, charName: pc.name,
                    charRowSpan: mIdx === 0 ? linkedModes.length : 0,
                    showChar: mIdx === 0,
                    modeId: m.id, modeName: m.name
                  });
                });
              }
              
              // 제품특성 rowSpan 갱신 (첫 행만)
              const charRowCount = Math.max(1, linkedModes.length);
              if (rows[charFirstRowIdx]) {
                rows[charFirstRowIdx].charRowSpan = charRowCount;
              }
              funcRowCount += charRowCount;
            });
          }
          
          // 기능 rowSpan 갱신 (첫 행만)
          if (rows[funcFirstRowIdx]) {
            rows[funcFirstRowIdx].funcRowSpan = funcRowCount;
            rows[funcFirstRowIdx].showFunc = true;
          }
          procRowCount += funcRowCount;
        });
      }
      
      // 공정 rowSpan 갱신 (첫 행만)
      if (rows[procFirstRowIdx]) {
        rows[procFirstRowIdx].procRowSpan = procRowCount;
        rows[procFirstRowIdx].showProc = true;
      }
    });

    return rows;
  }, [processes]);

  return (
    <div style={containerStyle}>
      <table style={tableStyle}>
        <colgroup>
          <col style={colStyle('150px')} />
          <col style={colStyle('200px')} />
          <col style={colStyle('150px')} />
          <col style={colStyle('250px')} />
        </colgroup>
        
        <thead>
          <tr>
            <th style={headerMainRow('#1976d2', 800)}>
              구조분석(2단계)
            </th>
            <th colSpan={2} style={headerMainRow('#388e3c', 800)}>
              기능분석(3단계)
            </th>
            <th style={headerMainRow(FAIL_COLORS.header1, 800)}>
              <div style={headerFlexContainer}>
                <span>고장분석(4단계)</span>
                <div style={headerButtonGroup}>
                  {isConfirmed ? (
                    <span style={confirmBadgeStyle}>확정</span>
                  ) : (
                    <button type="button" onClick={handleConfirm} style={confirmButtonStyle('#4caf50')}>확정</button>
                  )}
                  <span style={missingBadgeStyle(missingCount > 0)}>누락 {missingCount}건</span>
                  {isConfirmed && (
                    <button type="button" onClick={handleEdit} style={confirmButtonStyle('#ff9800')}>수정</button>
                  )}
                </div>
              </div>
            </th>
          </tr>
          
          <tr>
            <th style={headerSubRow('#42a5f5')}>
              2. 메인 공정명
            </th>
            <th colSpan={2} style={headerSubRow('#66bb6a')}>
              2. 메인공정기능 및 제품특성
            </th>
            <th style={headerSubRow(FAIL_COLORS.header2)}>
              2. 메인공정 고장형태(FM)
              {missingCount > 0 && (
                <span style={missingPillStyle}>
                  누락 {missingCount}건
                </span>
              )}
            </th>
          </tr>

          <tr>
            <th style={colHeaderRow('#bbdefb')}>
              NO+공정명
            </th>
            <th style={colHeaderRow('#c8e6c9')}>
              메인공정기능
            </th>
            <th style={colHeaderRow('#c8e6c9')}>
              제품특성
            </th>
            <th style={colHeaderRow(FAIL_COLORS.cellAlt)}>
              고장형태(FM)
            </th>
          </tr>
        </thead>
        
        <tbody>
          {buildFlatRows.length === 0 ? (
            <tr>
              <td style={dataCellStyle('#e3f2fd', { padding: '10px', textAlign: 'center', fontWeight: FONT_WEIGHTS.semibold })}>
                (구조분석에서 공정 입력)
              </td>
              <td style={dataCellStyle('#c8e6c9', { padding: '10px', textAlign: 'center' })}>
                (기능분석에서 공정기능 입력)
              </td>
              <td style={dataCellStyle('#c8e6c9', { padding: '10px', textAlign: 'center' })}>
                (기능분석에서 제품특성 입력)
              </td>
              <td style={dataCellStyle(FAIL_COLORS.cell, { padding: '0' })}>
                <SelectableCell value="" placeholder="고장형태 선택" bgColor={FAIL_COLORS.cell} onClick={() => {}} />
              </td>
            </tr>
          ) : buildFlatRows.map((row, idx) => {
            const zebraBg = idx % 2 === 1 ? '#ffe0b2' : '#fff3e0';
            const structureZebra = idx % 2 === 1 ? '#bbdefb' : '#e3f2fd';
            const functionZebra = idx % 2 === 1 ? '#c8e6c9' : '#e8f5e9';
            
            return (
              <tr key={`row-${idx}`} style={dataRowStyle(zebraBg)}>
                {/* 공정명 - rowSpan */}
                {row.showProc && (
                  <td rowSpan={row.procRowSpan} style={dataCellStyle(structureZebra, { padding: '8px', textAlign: 'center', fontWeight: FONT_WEIGHTS.semibold, verticalAlign: 'middle' })}>
                    {row.procNo}. {row.procName}
                  </td>
                )}
                {/* 기능명 - rowSpan */}
                {row.showFunc && (
                  <td rowSpan={row.funcRowSpan} style={dataCellStyle(functionZebra, { padding: '8px', textAlign: 'left', fontSize: FONT_SIZES.header1, verticalAlign: 'middle' })}>
                    {row.funcName || '(기능분석에서 입력)'}
                  </td>
                )}
                {/* 제품특성 - rowSpan */}
                {row.showChar && (
                  <td rowSpan={row.charRowSpan} style={dataCellStyle(functionZebra, { padding: '8px', textAlign: 'center', fontSize: FONT_SIZES.header1, verticalAlign: 'middle' })}>
                    {row.charName || ''}
                  </td>
                )}
                {/* 고장형태 - 각 행마다 */}
                <td style={dataCellStyle(zebraBg, { padding: '0' })}>
                  <SelectableCell 
                    value={row.modeName || ''} 
                    placeholder={row.charName ? "고장형태 선택" : ""} 
                    bgColor={zebraBg} 
                    onClick={() => {
                      if (!row.charId || !row.charName) {
                        alert('⚠️ 상위 항목(제품특성)이 없습니다.\n\n고장형태를 추가하려면 먼저 기능분석에서 제품특성을 입력해주세요.\n\n[기능분석 2L(메인공정) → 제품특성 입력]');
                        return;
                      }
                      setModal({ 
                        type: 'l2FailureMode', 
                        processId: row.procId, 
                        productCharId: row.charId,
                        title: `${row.procNo}. ${row.procName} 고장형태`, 
                        itemCode: 'FM1',
                        parentProductChar: row.charName,
                        processName: `${row.procNo}. ${row.procName}`
                      });
                    }} 
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {modal && (
        <DataSelectModal
          isOpen={!!modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          title={modal.title}
          itemCode={modal.itemCode}
          singleSelect={false} // [원자성] 여러 개 선택 가능, 각각 별도 행으로 저장!
          processName={modal.processName}
          parentFunction={modal.parentProductChar}
          currentValues={(() => {
            if (modal.type === 'l2FailureMode') {
              const proc = state.l2.find(p => p.id === modal.processId);
              const allModes = proc?.failureModes || [];
              const linkedModes = allModes.filter((m: any) => m.productCharId === modal.productCharId);
              return linkedModes.map((m: any) => m.name);
            }
            return [];
          })()}
          processList={processList}
          onProcessChange={(newProcId) => setModal(modal ? { ...modal, processId: newProcId } : null)}
        />
      )}
    </div>
  );
}
