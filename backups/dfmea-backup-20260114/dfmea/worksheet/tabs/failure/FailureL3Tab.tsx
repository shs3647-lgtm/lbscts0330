/**
 * @file FailureL3Tab.tsx
 * @description 3L 고장원인(FC) 분석 - 3행 헤더 구조 (구조분석 + 고장분석)
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { FailureTabProps } from './types';
import SelectableCell from '@/components/worksheet/SelectableCell';
import DataSelectModal from '@/components/modals/DataSelectModal';
import { COLORS, uid, FONT_SIZES, FONT_WEIGHTS, HEIGHTS } from '../../constants';
import {
  STEP_COLORS,
  FAIL_COLORS,
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

export default function FailureL3Tab({ state, setState, setDirty, saveToLocalStorage }: FailureTabProps) {
  const [modal, setModal] = useState<{ type: string; processId: string; weId?: string; title: string; itemCode: string } | null>(null);

  // 공정 목록 (드롭다운용)
  const processList = useMemo(() => 
    state.l2.filter(p => p.name && !p.name.includes('클릭')).map(p => ({ id: p.id, no: p.no, name: `${p.no}. ${p.name}` })),
    [state.l2]
  );

  // 확정 상태
  const isConfirmed = state.failureL3Confirmed || false;

  // 플레이스홀더 패턴 체크 함수
  const isMissing = (name: string | undefined) => {
    if (!name) return true;
    const trimmed = name.trim();
    if (trimmed === '' || trimmed === '-') return true;
    if (name.includes('클릭')) return true;
    if (name.includes('추가')) return true;
    if (name.includes('선택')) return true;
    if (name.includes('입력')) return true;
    if (name.includes('필요')) return true;
    return false;
  };

  // 항목별 누락 건수 분리 계산
  const missingCounts = useMemo(() => {
    let failureCauseCount = 0;   // 고장원인 누락
    
    state.l2.forEach(proc => {
      (proc.l3 || []).forEach(we => {
        const causes = we.failureCauses || [];
        if (causes.length === 0 && we.name && !isMissing(we.name)) failureCauseCount++;
        causes.forEach(c => {
          if (isMissing(c.name)) failureCauseCount++;
        });
      });
    });
    return { failureCauseCount, total: failureCauseCount };
  }, [state.l2]);
  
  // 총 누락 건수 (기존 호환성)
  const missingCount = missingCounts.total;

  // 확정 핸들러
  const handleConfirm = useCallback(() => {
    if (missingCount > 0) {
      alert(`누락된 항목이 ${missingCount}건 있습니다.\n먼저 입력을 완료해주세요.`);
      return;
    }
    setState(prev => ({ ...prev, failureL3Confirmed: true }));
    saveToLocalStorage?.();
    alert('3L 고장원인(FC) 분석이 확정되었습니다.');
  }, [missingCount, setState, saveToLocalStorage]);

  // 수정 핸들러
  const handleEdit = useCallback(() => {
    setState(prev => ({ ...prev, failureL3Confirmed: false }));
  }, [setState]);

  const handleSave = useCallback((selectedValues: string[]) => {
    if (!modal) return;
    
    setState(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      const { type, processId, weId } = modal;

      if (type === 'l3FailureCause') {
        // 고장원인 추가
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== processId) return proc;
          return {
            ...proc,
            l3: (proc.l3 || []).map((we: any) => {
              if (weId && we.id !== weId) return we;
              const currentCauses = we.failureCauses || [];
              return {
                ...we,
                failureCauses: selectedValues.map(val => {
                  const existing = currentCauses.find((c: any) => c.name === val);
                  return existing || { id: uid(), name: val, occurrence: undefined };
                })
              };
            })
          };
        });
      }
      
      return newState;
    });
    
    setDirty(true);
    setModal(null);
    
    // 저장 후 localStorage에 반영
    if (saveToLocalStorage) {
      setTimeout(() => saveToLocalStorage(), 100);
    }
  }, [modal, setState, setDirty, saveToLocalStorage]);

  const handleDelete = useCallback((deletedValues: string[]) => {
    if (!modal) return;
    
    const { type, processId, weId } = modal;
    const deletedSet = new Set(deletedValues);
    
    setState(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      
      if (type === 'l3FailureCause') {
        newState.l2 = newState.l2.map((proc: any) => {
          if (processId && proc.id !== processId) return proc;
          return {
            ...proc,
            l3: (proc.l3 || []).map((we: any) => {
              if (weId && we.id !== weId) return we;
              return { ...we, failureCauses: (we.failureCauses || []).filter((c: any) => !deletedSet.has(c.name)) };
            })
          };
        });
      }
      
      return newState;
    });
    
    setDirty(true);
    if (saveToLocalStorage) setTimeout(() => saveToLocalStorage(), 100);
  }, [modal, setState, setDirty, saveToLocalStorage]);

  // 발생도 업데이트
  const updateOccurrence = useCallback((processId: string, weId: string, causeId: string, occurrence: number | undefined) => {
    setState(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== processId) return proc;
        return {
          ...proc,
          l3: (proc.l3 || []).map((we: any) => {
            if (we.id !== weId) return we;
            return {
              ...we,
              failureCauses: (we.failureCauses || []).map((c: any) => c.id === causeId ? { ...c, occurrence } : c)
            };
          })
        };
      });
      return newState;
    });
    setDirty(true);
    if (saveToLocalStorage) saveToLocalStorage();
  }, [setState, setDirty, saveToLocalStorage]);

  // 평탄화된 행 데이터
  const flatRows = useMemo(() => {
    const rows: any[] = [];
    const processes = state.l2.filter(p => p.name && !p.name.includes('클릭'));
    
    processes.forEach(proc => {
      const workElements = (proc.l3 || []).filter((we: any) => we.name && !we.name.includes('클릭'));
      
      if (workElements.length === 0) {
        rows.push({ proc, we: null, cause: null, procRowSpan: 1, weRowSpan: 1, isFirstProc: true, isFirstWe: true });
      } else {
        let procRowSpan = 0;
        workElements.forEach((we: any) => {
          procRowSpan += Math.max(1, (we.failureCauses || []).length);
        });
        
        let isFirstProc = true;
        workElements.forEach((we: any) => {
          const causes = we.failureCauses || [];
          const weRowSpan = Math.max(1, causes.length);
          
          if (causes.length === 0) {
            rows.push({ proc, we, cause: null, procRowSpan: isFirstProc ? procRowSpan : 0, weRowSpan, isFirstProc, isFirstWe: true });
            isFirstProc = false;
          } else {
            causes.forEach((cause: any, cIdx: number) => {
              rows.push({ 
                proc, we, cause, 
                procRowSpan: isFirstProc && cIdx === 0 ? procRowSpan : 0, 
                weRowSpan: cIdx === 0 ? weRowSpan : 0,
                isFirstProc: isFirstProc && cIdx === 0,
                isFirstWe: cIdx === 0
              });
            });
            isFirstProc = false;
          }
        });
      }
    });
    
    return rows;
  }, [state.l2]);

  return (
    <div style={containerStyle}>
      <table style={tableStyle}>
        <colgroup>
          <col style={colStyle('120px')} />
          <col style={colStyle('120px')} />
          <col style={colStyle('160px')} />
          <col style={colStyle('50px')} />
          <col style={colStyle('280px')} />
        </colgroup>
        
        {/* 3행 헤더 구조 */}
        <thead>
          {/* 1행: 단계 구분 */}
          <tr>
            <th colSpan={2} style={headerMainRow('#1976d2', 800)}>
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
                    <span style={confirmBadgeStyle}>✓ 확정됨</span>
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
          
          {/* 2행: 항목 그룹 */}
          <tr>
            <th style={headerSubRow('#42a5f5')}>
              2. 메인 공정명
            </th>
            <th style={headerSubRow('#42a5f5')}>
              3. 작업 요소명
            </th>
            <th colSpan={2} style={headerSubRow('#66bb6a')}>
              3. 작업요소의 기능 및 공정특성
            </th>
            <th style={headerSubRow(FAIL_COLORS.header2)}>
              3. 고장원인(FC)
              {missingCount > 0 && (
                <span style={missingPillStyle}>
                  누락 {missingCount}건
                </span>
              )}
            </th>
          </tr>

          {/* 3행: 세부 컬럼 */}
          <tr>
            <th style={colHeaderRow('#bbdefb')}>
              NO+공정명
            </th>
            <th style={colHeaderRow('#bbdefb')}>
              작업요소
            </th>
            <th style={colHeaderRow('#c8e6c9')}>
              공정특성
            </th>
            <th style={colHeaderRow('#c8e6c9', FONT_SIZES.small)}>
              특별특성
            </th>
            <th style={colHeaderRow(FAIL_COLORS.cellAlt)}>
              고장원인(FC)
              {missingCounts.failureCauseCount > 0 && (
                <span style={missingPillInlineStyle}>
                  {missingCounts.failureCauseCount}
                </span>
              )}
            </th>
          </tr>
        </thead>
        
        <tbody>
          {flatRows.length === 0 ? (
            <tr>
              <td style={dataCellStyle('#e3f2fd', { padding: '10px', textAlign: 'center', fontWeight: FONT_WEIGHTS.semibold })}>
                (구조분석에서 공정 입력)
              </td>
              <td style={dataCellStyle('#e3f2fd', { padding: '10px', textAlign: 'center', fontWeight: FONT_WEIGHTS.semibold })}>
                (작업요소 입력)
              </td>
              <td style={dataCellStyle('#c8e6c9', { padding: '10px', textAlign: 'center' })}>
                (기능분석에서 입력)
              </td>
              <td style={dataCellStyle('#c8e6c9', { padding: '10px', textAlign: 'center' })}>
                -
              </td>
              <td style={dataCellStyle(FAIL_COLORS.cell, { padding: '0' })}>
                <SelectableCell value="" placeholder="고장원인 선택" bgColor={FAIL_COLORS.cell} onClick={() => {}} />
              </td>
            </tr>
          ) : flatRows.map((row, idx) => {
            // 기능분석에서 입력한 공정특성 가져오기 (we.functions[].processChars[] 에서)
            const processChars = (row.we?.functions || []).flatMap((f: any) => f.processChars || []);
            const processChar = processChars[0];
            const zebraBg = idx % 2 === 1 ? '#ffe0b2' : '#fff3e0';
            const structureZebra = idx % 2 === 1 ? '#bbdefb' : '#e3f2fd';
            const functionZebra = idx % 2 === 1 ? '#c8e6c9' : '#e8f5e9';
            
            return (
              <tr key={`${row.proc.id}-${row.we?.id || 'empty'}-${row.cause?.id || idx}`} style={dataRowStyle(zebraBg)}>
                {row.procRowSpan > 0 && (
                  <td rowSpan={row.procRowSpan} style={dataCellStyle(structureZebra, { padding: '6px', textAlign: 'center', fontWeight: FONT_WEIGHTS.semibold, verticalAlign: 'middle', fontSize: FONT_SIZES.header1 })}>
                    {row.proc.no}. {row.proc.name}
                  </td>
                )}
                {row.weRowSpan > 0 && (
                  <td rowSpan={row.weRowSpan} style={dataCellStyle(structureZebra, { padding: '6px', textAlign: 'center', verticalAlign: 'middle', fontSize: FONT_SIZES.header1 })}>
                    {row.we?.name || '(작업요소 없음)'}
                  </td>
                )}
                {row.weRowSpan > 0 && (
                  <td rowSpan={row.weRowSpan} style={dataCellStyle(functionZebra, { padding: '6px', textAlign: 'center', verticalAlign: 'middle', fontSize: FONT_SIZES.header1 })}>
                    {processChar?.name || '(기능분석에서 입력)'}
                  </td>
                )}
                {row.weRowSpan > 0 && (
                  <td rowSpan={row.weRowSpan} style={dataCellStyle(functionZebra, { padding: '6px', textAlign: 'center', verticalAlign: 'middle', fontSize: FONT_SIZES.header1 })}>
                    {processChar?.specialChar || '-'}
                  </td>
                )}
                <td style={dataCellStyle(zebraBg, { padding: '0' })}>
                  {row.we ? (
                    <SelectableCell
                      value={row.cause?.name || ''}
                      placeholder="고장원인 선택"
                      bgColor={zebraBg}
                      onClick={() => {
                        // [원자성 규칙] 상위 항목(공정특성)이 없으면 하위(고장원인) 추가 불가
                        if (!processChar?.name) {
                          alert('⚠️ 상위 항목(공정특성)이 없습니다.\n\n고장원인을 추가하려면 먼저 기능분석에서 공정특성을 입력해주세요.\n\n[기능분석 3L(작업요소) → 공정특성 입력]');
                          return;
                        }
                        setModal({ type: 'l3FailureCause', processId: row.proc.id, weId: row.we.id, title: `${row.we.name} 고장원인`, itemCode: 'FC1' });
                      }}
                    />
                  ) : (
                    <span className="text-gray-500 text-xs py-2 block">-</span>
                  )}
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
          currentValues={(() => {
            if (modal.type === 'l3FailureCause') {
              const proc = state.l2.find(p => p.id === modal.processId);
              const we = (proc?.l3 || []).find((w: any) => w.id === modal.weId);
              return (we?.failureCauses || []).map((c: any) => c.name);
            }
            return [];
          })()}
          processName={processList.find(p => p.id === modal.processId)?.name}
          workElementName={(() => {
            const proc = state.l2.find(p => p.id === modal.processId);
            const we = (proc?.l3 || []).find((w: any) => w.id === modal.weId);
            return we?.name;
          })()}
          processList={processList}
          onProcessChange={(newProcId) => setModal(modal ? { ...modal, processId: newProcId } : null)}
        />
      )}
    </div>
  );
}

