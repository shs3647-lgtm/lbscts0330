// @ts-nocheck
/**
 * @file FailureL3Tab.tsx
 * @description 3L 고장원인(FC) 분석 - 3행 헤더 구조 (구조분석 + 고장분석)
 * 
 * ⚠️⚠️⚠️ 코드프리즈 (CODE FREEZE) ⚠️⚠️⚠️
 * ============================================
 * 이 파일은 완전히 프리즈되었습니다.
 * 
 * ❌ 절대 수정 금지:
 * - 코드 변경 금지
 * - 주석 변경 금지
 * - 스타일 변경 금지
 * - 로직 변경 금지
 * 
 * ✅ 수정 허용 조건:
 * 1. 사용자가 명시적으로 수정 요청
 * 2. 수정 사유와 범위를 명확히 지시
 * 3. 코드프리즈 경고를 확인하고 진행
 * 
 * 📅 프리즈 일자: 2026-01-05
 * 📌 프리즈 범위: 구조분석부터 3L원인분석까지 전체
 * ============================================
 */

'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { FailureTabProps } from './types';
import SelectableCell from '@/components/worksheet/SelectableCell';
import DataSelectModal from '@/components/modals/DataSelectModal';
import { COLORS, uid, FONT_SIZES, FONT_WEIGHTS, HEIGHTS } from '../../constants';
import { S, F, X, cell, cellP0, btnConfirm, btnEdit, btnDisabled, badgeOk, badgeConfirmed, badgeMissing, badgeCount } from '@/styles/worksheet';
import { getZebra, getZebraColors } from '@/styles/level-colors';
import { handleEnterBlur } from '../../utils/keyboard';
import { getAutoLinkMessage } from '../../utils/auto-link';
import { autoSetSCForFailureCause, syncSCToMaster } from '../../utils/special-char-sync';

// ✅ 공용 스타일/유틸리티 (2026-01-19 리팩토링)
import { BORDER, cellBase, headerStyle, dataCell, FAILURE_COLORS } from '../shared/tabStyles';
import { isMissing } from '../shared/tabUtils';

// 색상 정의 (하위호환용)
const FAIL_COLORS = {
  ...FAILURE_COLORS,
  header3: '#5c6bc0', // L3에서만 사용하는 추가 색상
  cellAlt: '#e8eaf6',
};

export default function FailureL3Tab({ state, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB }: FailureTabProps) {
  const [modal, setModal] = useState<{ 
    type: string; 
    processId: string; 
    weId?: string; 
    processCharId?: string;  // ✅ 공정특성 ID 추가 (CASCADE 연결)
    processCharName?: string;
    title: string; 
    itemCode: string 
  } | null>(null);

  // 공정 목록 (드롭다운용)
  const processList = useMemo(() => 
    state.l2.filter(p => p.name && !p.name.includes('클릭')).map(p => ({ id: p.id, no: p.no, name: `${p.no}. ${p.name}` })),
    [state.l2]
  );

  // 확정 상태
  const isConfirmed = state.failureL3Confirmed || false;
  // ✅ 상위 단계(기능분석 3L) 확정 여부 - 미확정이면 FC 입력/확정/표시를 막음
  const isUpstreamConfirmed = state.l3Confirmed || false;

  // ✅ 셀 클릭 시 확정됨 상태면 자동으로 수정 모드로 전환 - setStateSynced 패턴 적용
  const handleCellClick = useCallback((modalConfig: any) => {
    if (!isUpstreamConfirmed) {
      alert('⚠️ 기능분석(3L)을 먼저 확정해주세요.\n\n기능분석 확정 후 고장원인(FC)을 입력할 수 있습니다.');
      return;
    }
    if (isConfirmed) {
      // ✅ setStateSynced 패턴 적용
      const updateFn = (prev: any) => ({ ...prev, failureL3Confirmed: false });
      if (setStateSynced) {
        setStateSynced(updateFn);
      } else {
        setState(updateFn);
      }
      setDirty(true);
    }
    setModal(modalConfig);
  }, [isUpstreamConfirmed, isConfirmed, setState, setStateSynced, setDirty]);

  // ✅ 2026-01-19: isMissing → tabUtils.ts로 분리됨

  // ✅ 항목별 누락 건수 분리 계산 - CASCADE 구조 (공정특성 기준, 필터링된 데이터만 카운트)
  // ⚠️ 중복 공정특성은 1번만 카운트 (flatRows 중복 제거 로직과 동일)
  const missingCounts = useMemo(() => {
    // ✅ 상위 단계 미확정이면 누락 계산 자체를 하지 않음 (확정 게이트)
    if (!isUpstreamConfirmed) return { failureCauseCount: 0, total: 0 };
    let failureCauseCount = 0;   // 고장원인 누락
    
    // ✅ 의미 있는 공정만 필터링
    const meaningfulProcs = state.l2.filter((p: any) => {
      const name = p.name || '';
      return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택');
    });
    
    meaningfulProcs.forEach(proc => {
      const allCauses = proc.failureCauses || [];  // 공정 레벨 고장원인

      // ✅ 공정 내 공정특성 이름별 id 그룹 (동일 이름 중복 처리)
      const charIdsByName = new Map<string, Set<string>>();
      (proc.l3 || []).forEach((we: any) => {
        (we.functions || []).forEach((f: any) => {
          (f.processChars || []).forEach((pc: any) => {
            const n = String(pc?.name || '').trim();
            const id = String(pc?.id || '').trim();
            if (!n || !id) return;
            if (!charIdsByName.has(n)) charIdsByName.set(n, new Set<string>());
            charIdsByName.get(n)!.add(id);
          });
        });
      });
      
      // ✅ 공정별 중복 공정특성 추적 (이름 기준)
      const countedCharsInProc = new Set<string>();
      
      // ✅ 의미 있는 작업요소만 필터링
      const meaningfulL3 = (proc.l3 || []).filter((we: any) => {
        const name = we.name || '';
        return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('추가') && !name.includes('선택');
      });
      
      meaningfulL3.forEach(we => {
        // ✅ 의미 있는 기능만 필터링
        const meaningfulFuncs = (we.functions || []).filter((f: any) => {
          const name = f.name || '';
          return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택');
        });
        
        meaningfulFuncs.forEach((f: any) => {
          // ✅ 의미 있는 공정특성만 필터링
          const meaningfulChars = (f.processChars || []).filter((pc: any) => {
            const name = pc.name || '';
            return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택');
          });
          
          meaningfulChars.forEach((pc: any) => {
            const charName = pc.name?.trim();
            
            // ✅ 중복 공정특성 스킵 (이미 카운트한 이름은 무시)
            if (countedCharsInProc.has(charName)) {
              return;
            }
            countedCharsInProc.add(charName);
            
            // 이 공정특성에 연결된 고장원인들
            const ids = charIdsByName.get(charName) || new Set<string>([String(pc.id)]);
            const linkedCauses = allCauses.filter((c: any) => ids.has(String(c.processCharId || '').trim()));
            if (linkedCauses.length === 0) {
              failureCauseCount++;  // 공정특성에 고장원인 없음
            } else {
              linkedCauses.forEach(c => {
                if (isMissing(c.name)) failureCauseCount++;
              });
            }
          });
        });
      });
    });
    return { failureCauseCount, total: failureCauseCount };
  }, [isUpstreamConfirmed, state.l2]);
  
  // 총 누락 건수 (기존 호환성)
  const missingCount = missingCounts.total;

  // ✅ 중복 고장원인 정리 (FailureL2Tab 패턴과 동일)
  const lastCleanedHash = useRef<string>('');
  useEffect(() => {
    // 이미 정리한 데이터인지 체크 (무한 루프 방지)
    const currentHash = JSON.stringify(state.l2.map(p => ({
      id: p.id,
      causes: (p.failureCauses || []).map((c: any) => ({ name: c.name, pcId: c.processCharId }))
    })));
    if (lastCleanedHash.current === currentHash) return;
    
    // 중복 고장원인 검사 및 정리
    // ✅ 추가 정리: 공정 내 동일 공정특성명 중복(id가 여러 개) → failureCauses.processCharId를 대표 id로 정규화
    let hasDuplicates = false;
    const cleanedL2 = state.l2.map((proc: any) => {
      const currentCauses = proc.failureCauses || [];
      if (currentCauses.length === 0) return proc;

      // 공정 내 공정특성 id→name, name→대표 id(사전순) 매핑
      const charNameById = new Map<string, string>();
      const canonicalIdByName = new Map<string, string>();
      (proc.l3 || []).forEach((we: any) => {
        (we.functions || []).forEach((f: any) => {
          (f.processChars || []).forEach((pc: any) => {
            const n = String(pc?.name || '').trim();
            const id = String(pc?.id || '').trim();
            if (!n || !id) return;
            charNameById.set(id, n);
            const prev = canonicalIdByName.get(n);
            if (!prev || id.localeCompare(prev) < 0) canonicalIdByName.set(n, id);
          });
        });
      });

      const normalizedCauses = currentCauses.map((c: any) => {
        const oldId = String(c?.processCharId || '').trim();
        if (!oldId) return c;
        const n = charNameById.get(oldId);
        if (!n) return c;
        const canonicalId = canonicalIdByName.get(n);
        if (canonicalId && canonicalId !== oldId) {
          hasDuplicates = true;
          return { ...c, processCharId: canonicalId };
        }
        return c;
      });
      
      // processCharId + name 조합으로 중복 제거
      const seen = new Set<string>();
      const uniqueCauses = normalizedCauses.filter((c: any) => {
        const key = `${c.processCharId || ''}_${c.name || ''}`;
        if (seen.has(key)) {
          hasDuplicates = true;
          console.log('[FailureL3Tab] 중복 제거:', c.name, 'processCharId:', c.processCharId);
          return false;
        }
        seen.add(key);
        return true;
      });
      
      if (uniqueCauses.length !== currentCauses.length || normalizedCauses.some((c: any, idx: number) => c?.processCharId !== currentCauses[idx]?.processCharId)) {
        return { ...proc, failureCauses: uniqueCauses };
      }
      return proc;
    });
    
    if (hasDuplicates) {
      console.log('[FailureL3Tab] ⚠️ 중복 고장원인 발견 → 자동 정리');
      lastCleanedHash.current = JSON.stringify(cleanedL2.map((p: any) => ({
        id: p.id,
        causes: (p.failureCauses || []).map((c: any) => ({ name: c.name, pcId: c.processCharId }))
      })));
      setState(prev => ({ ...prev, l2: cleanedL2 as any }));
      setDirty(true);
      setTimeout(() => {
        saveToLocalStorage?.();
        console.log('[FailureL3Tab] ✅ 중복 정리 후 저장 완료');
      }, 100);
    } else {
      lastCleanedHash.current = currentHash;
    }
  }, [state.l2, setState, setDirty, saveToLocalStorage]);

  // ✅ 2026-01-19: 데이터 상태 로그 (상세 진단용)
  useEffect(() => {
    const allCharsCount = state.l2.reduce((acc: number, proc: any) => {
      return acc + (proc.l3 || []).reduce((weAcc: number, we: any) => {
        return weAcc + (we.functions || []).reduce((fAcc: number, f: any) => {
          return fAcc + (f.processChars || []).filter((pc: any) => 
            pc.name && !pc.name.includes('클릭') && !pc.name.includes('선택')
          ).length;
        }, 0);
      }, 0);
    }, 0);
    const allCausesCount = state.l2.reduce((acc: number, proc: any) => acc + (proc.failureCauses || []).length, 0);
    
    // ✅ 2026-01-19: 상세 진단 로그 (항상 출력)
    console.log('═══════════════════════════════════════════════════════');
    console.log('[FailureL3Tab] 📊 3L 고장원인 데이터 진단');
    console.log('═══════════════════════════════════════════════════════');
    console.log('[FailureL3Tab] l3Confirmed (isUpstreamConfirmed):', isUpstreamConfirmed);
    console.log('[FailureL3Tab] 공정수:', state.l2.length);
    console.log('[FailureL3Tab] 공정특성 총 수:', allCharsCount);
    console.log('[FailureL3Tab] 고장원인 총 수:', allCausesCount);
    
    // 각 공정별 상세 데이터 출력
    state.l2.forEach((proc: any, pIdx: number) => {
      const l3List = proc.l3 || [];
      console.log(`\n[FailureL3Tab] 공정 ${pIdx + 1}: "${proc.name}" (l3: ${l3List.length}개)`);
      
      l3List.forEach((we: any, wIdx: number) => {
        const funcs = we.functions || [];
        console.log(`  └ 작업요소 ${wIdx + 1}: "${we.name}" (m4: ${we.m4}) (functions: ${funcs.length}개)`);
        
        if (funcs.length === 0) {
          console.warn(`    ⚠️ functions 배열이 비어있음!`);
        } else {
          funcs.forEach((f: any, fIdx: number) => {
            const chars = f.processChars || [];
            console.log(`    └ 기능 ${fIdx + 1}: "${f.name}" (processChars: ${chars.length}개)`);
            
            if (chars.length === 0) {
              console.warn(`      ⚠️ processChars 배열이 비어있음!`);
            } else {
              chars.forEach((c: any, cIdx: number) => {
                console.log(`      └ 공정특성 ${cIdx + 1}: "${c.name}" (id: ${c.id?.substring(0, 12)}...)`);
              });
            }
          });
        }
      });
    });
    
    console.log('═══════════════════════════════════════════════════════');
    
    if (allCharsCount === 0 && state.l2.length > 0 && isUpstreamConfirmed) {
      console.error('[FailureL3Tab] ❌ 공정특성이 없습니다! 3L 기능분석 탭에서 공정특성을 입력해주세요.');
    }
  }, [state.l2, isUpstreamConfirmed, state.l3Confirmed]);

  // ✅ 누락 발생 시 자동 수정 모드 전환 - setStateSynced 패턴 적용
  useEffect(() => {
    if (isConfirmed && missingCount > 0) {
      console.log('[FailureL3Tab] 누락 발생 감지 → 자동 수정 모드 전환, missingCount:', missingCount);
      const updateFn = (prev: any) => ({ ...prev, failureL3Confirmed: false });
      if (setStateSynced) {
        setStateSynced(updateFn);
      } else {
        setState(updateFn);
      }
      setDirty(true);
    }
  }, [isConfirmed, missingCount, setState, setStateSynced, setDirty]);

  // ✅ failureCauses 변경 감지용 ref (FailureL2Tab 패턴과 동일)
  const failureCausesRef = useRef<string>('');
  
  // ✅ failureCauses 변경 시 자동 저장 (확실한 저장 보장)
  // ⚠️ 중요: failureCauses는 proc.failureCauses에 저장됨 (FailureL2Tab 패턴)
  useEffect(() => {
    // proc.failureCauses를 확인 (we.failureCauses가 아님!)
    const allCauses = state.l2.flatMap((p: any) => p.failureCauses || []);
    const causesKey = JSON.stringify(allCauses);
    
    if (failureCausesRef.current && causesKey !== failureCausesRef.current) {
      console.log('[FailureL3Tab] failureCauses 변경 감지, 자동 저장');
      saveToLocalStorage?.();
    }
    failureCausesRef.current = causesKey;
  }, [state.l2, saveToLocalStorage]);

  // ========== 저장 후 검증 (디버그 모드에서만) ==========
  // 이전: state.l2 변경마다 비교 → 타이밍 문제로 항상 불일치
  // 현재: 저장 직후에만 검증 (자동 저장 로직에서 처리)


  // 확정 핸들러 (L2 패턴 적용) - ✅ setStateSynced 사용하여 확정 상태 즉시 동기화
  const handleConfirm = useCallback(async () => {
    if (!isUpstreamConfirmed) {
      alert('⚠️ 기능분석(3L)을 먼저 확정해주세요.\n\n기능분석 확정 후 고장원인(FC)을 확정할 수 있습니다.');
      return;
    }
    console.log('[FailureL3Tab] 확정 버튼 클릭, missingCount:', missingCount);
    if (missingCount > 0) {
      alert(`누락된 항목이 ${missingCount}건 있습니다.\n먼저 입력을 완료해주세요.`);
      return;
    }
    
    // ✅ 현재 고장원인 통계 로그
    const allCauses = state.l2.flatMap((p: any) => (p.failureCauses || []));
    console.log('[FailureL3Tab] 확정 시 고장원인:', allCauses.length, '개');
    
    // ✅ setStateSynced 사용하여 stateRef 즉시 동기화 (확정 상태 저장 보장)
    const updateState = (prev: any) => ({ ...prev, failureL3Confirmed: true });
    if (setStateSynced) {
      setStateSynced(updateState);
      console.log('[FailureL3Tab] setStateSynced로 확정 상태 동기화');
    } else {
      setState(updateState);
    }
    setDirty(true);
    
    // ✅ 확정 상태 저장 - setTimeout으로 state 업데이트 대기
    setTimeout(async () => {
      saveToLocalStorage?.();
      // ✅ 확정 시 DB 저장 (try-catch 사용)
      if (saveAtomicDB) {
        try {
          await saveAtomicDB();
          console.log('[FailureL3Tab] DB 저장 완료');
        } catch (e: any) {
          console.error('[FailureL3Tab] DB 저장 오류:', e);
        }
      }
      console.log('[FailureL3Tab] 확정 후 localStorage 및 DB 저장 완료');
    }, 100);
    
    alert('3L 고장원인(FC) 분석이 확정되었습니다.');
  }, [isUpstreamConfirmed, missingCount, state.l2, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 수정 핸들러 - ✅ setStateSynced 사용
  const handleEdit = useCallback(() => {
    const updateState = (prev: any) => ({ ...prev, failureL3Confirmed: false });
    if (setStateSynced) {
      setStateSynced(updateState);
    } else {
      setState(updateState);
    }
    setDirty(true);
    setTimeout(() => saveToLocalStorage?.(), 100);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage]);

  /**
   * ✅ [핵심] handleSave - CASCADE 구조 (공정특성→고장원인 연결)
   * - 공정 레벨에 failureCauses 저장 (FailureL2Tab 패턴)
   * - 각 고장원인에 processCharId FK 저장
   */
  const handleSave = useCallback((selectedValues: string[]) => {
    if (!modal) return;
    
    const { type, processId, processCharId } = modal;
    const causeId = (modal as any).causeId;
    
    console.log('[FailureL3Tab] 저장 시작', { processId, processCharId, causeId, selectedCount: selectedValues.length });
    
    // ✅ setStateSynced 사용하여 stateRef 즉시 동기화 (저장 보장)
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));

      if (type === 'l3FailureCause') {
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== processId) return proc;
          
          const currentCauses = proc.failureCauses || [];

          // ✅ 동일 공정특성명 그룹(현재 공정) → 대표 id로 정규화하여 “표시/저장/삭제”를 일치시킴
          const currentCharName = String(modal.processCharName || '').trim();
          const allChars = (proc.l3 || []).flatMap((we: any) =>
            (we.functions || []).flatMap((f: any) => f.processChars || [])
          );
          const matchingChars = currentCharName ? allChars.filter((c: any) => String(c?.name || '').trim() === currentCharName) : [];
          const matchingIds = new Set<string>(matchingChars.map((c: any) => String(c?.id || '').trim()).filter(Boolean));
          const canonicalCharId = matchingIds.size > 0
            ? Array.from(matchingIds).sort((a: string, b: string) => a.localeCompare(b))[0]
            : String(processCharId || '').trim();
          
          // ✅ 2026-01-16: causeId가 있고 단일 선택인 경우
          if (causeId && selectedValues.length <= 1) {
            if (selectedValues.length === 0) {
              // 선택 해제 시 해당 고장원인 삭제
              return { ...proc, failureCauses: currentCauses.filter((c: any) => c.id !== causeId) };
            }
            // 단일 선택 시 해당 고장원인 수정
            return {
              ...proc,
              failureCauses: currentCauses.map((c: any) => 
                c.id === causeId ? { ...c, name: selectedValues[0] || c.name } : c
              )
            };
          }
          
          // ✅ 다중 선택: 선택된 항목 전체 반영 (기존 + 신규)
          // 1. 다른 공정특성명 그룹의 고장원인은 보존
          const otherCauses = currentCauses.filter((c: any) => {
            const pid = String(c?.processCharId || '').trim();
            if (!pid) return true;
            if (matchingIds.size === 0) return pid !== String(processCharId || '').trim();
            return !matchingIds.has(pid);
          });
          
          // 2. 선택된 값들 각각 별도 레코드로 생성
          // ✅ 특별특성 마스터에서 공정특성 기준 SC 자동 지정
          const charName = modal.processCharName || '';
          const autoSC = autoSetSCForFailureCause(charName);
          
          // ✅ SC가 설정되면 마스터에 동기화
          if (autoSC && charName) {
            syncSCToMaster(charName, 'process', true);
          }
          
          const newCauses = selectedValues.map(val => {
            const existing = currentCauses.find((c: any) => 
              String(c.processCharId || '').trim() === canonicalCharId && c.name === val
            );
            
            return existing || { 
              id: uid(), 
              name: val, 
              occurrence: undefined,
              sc: autoSC,  // ✅ 마스터 기준 SC 자동 지정
              processCharId: canonicalCharId  // ✅ CASCADE 연결 (대표 id)
            };
          });
          
          console.log('[FailureL3Tab] 보존:', otherCauses.length, '새로:', newCauses.length);
          
          return {
            ...proc,
            failureCauses: [...otherCauses, ...newCauses]
          };
        });
        
        // ✅ 자동연결: 동일한 공정특성 이름을 가진 다른 공정에도 동일한 고장원인 추가
        const currentCharName = String(modal.processCharName || '').trim();  // ✅ processCharName으로 통일
        if (currentCharName && selectedValues.length > 0) {
          let autoLinkedCount = 0;
          
          newState.l2 = newState.l2.map((proc: any) => {
            // 현재 공정은 이미 처리됨
            if (proc.id === processId) return proc;
            
            // 동일한 이름의 공정특성 찾기
            const allChars = (proc.l3 || []).flatMap((we: any) => 
              (we.functions || []).flatMap((f: any) => f.processChars || [])
            );
            const matchingChars = allChars.filter((c: any) => String(c?.name || '').trim() === currentCharName);
            
            if (matchingChars.length === 0) return proc;

            const ids = matchingChars.map((c: any) => String(c?.id || '').trim()).filter(Boolean);
            const canonicalId = ids.sort((a: string, b: string) => a.localeCompare(b))[0];
            
            const currentCauses = proc.failureCauses || [];
            const updatedCauses = [...currentCauses];
            
            selectedValues.forEach(val => {
              const exists = updatedCauses.some((c: any) =>
                String(c.processCharId || '').trim() === canonicalId && c.name === val
              );
              if (!exists) {
                const scFromMaster = autoSetSCForFailureCause(currentCharName);
                updatedCauses.push({
                  id: uid(),
                  name: val,
                  occurrence: undefined,
                  sc: scFromMaster,
                  processCharId: canonicalId,
                });
                autoLinkedCount++;
              }
            });
            
            return { ...proc, failureCauses: updatedCauses };
          });
          
          if (autoLinkedCount > 0) {
            const message = getAutoLinkMessage(selectedValues, '고장원인');
            console.log(`[FailureL3Tab] ${currentCharName}: ${message} (${autoLinkedCount}건 자동연결)`);
          }
        }
      }
      
      // ✅ CRUD Update: 확정 상태 해제
      newState.failureL3Confirmed = false;
      
      console.log('[FailureL3Tab] 상태 업데이트 완료');
      return newState;
    };
    
    // ✅ setStateSynced 사용하여 stateRef 즉시 동기화
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    
    setDirty(true);
    // ✅ 2026-01-16: 저장 후 모달 유지 (닫기 버튼으로만 닫음)
    
    // ✅ 저장 보장 (stateRef 업데이트 대기 후 저장) + DB 저장 추가
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) {
        try {
          await saveAtomicDB();
          console.log('[FailureL3Tab] DB 저장 완료');
        } catch (e: any) {
          console.error('[FailureL3Tab] DB 저장 오류:', e);
        }
      }
      console.log('[FailureL3Tab] 저장 완료');
    }, 200);
  }, [modal, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  const handleDelete = useCallback((deletedValues: string[]) => {
    if (!modal) return;
    
    const { type, processId, processCharId } = modal;
    const deletedSet = new Set(deletedValues);
    
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      
      if (type === 'l3FailureCause') {
        // ✅ 공정 레벨에서 삭제 (공정특성명 그룹 기준 - 대표 id로 정규화된 데이터 포함)
        newState.l2 = newState.l2.map((proc: any) => {
          if (processId && proc.id !== processId) return proc;
          const currentCharName = String((modal as any).processCharName || '').trim();
          const allChars = (proc.l3 || []).flatMap((we: any) =>
            (we.functions || []).flatMap((f: any) => f.processChars || [])
          );
          const matchingIds = new Set<string>(
            currentCharName
              ? allChars.filter((c: any) => String(c?.name || '').trim() === currentCharName).map((c: any) => String(c?.id || '').trim()).filter(Boolean)
              : [String(processCharId || '').trim()]
          );
          return {
            ...proc,
            failureCauses: (proc.failureCauses || []).filter((c: any) => 
              !(matchingIds.has(String(c.processCharId || '').trim()) && deletedSet.has(c.name))
            )
          };
        });
      }
      
      // ✅ CRUD Delete: 확정 상태 해제
      newState.failureL3Confirmed = false;
      
      return newState;
    };
    
    // ✅ setStateSynced 사용하여 stateRef 즉시 동기화
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    
    setDirty(true);
    
    // ✅ 저장 보장 + DB 저장
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) {
        try {
          await saveAtomicDB();
        } catch (e: any) {
          console.error('[FailureL3Tab] 삭제 후 DB 저장 오류:', e);
        }
      }
    }, 200);
  }, [modal, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ✅ 발생도 업데이트 - 공정 레벨에서 수정 (CASCADE)
  const updateOccurrence = useCallback((processId: string, causeId: string, occurrence: number | undefined) => {
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== processId) return proc;
        return {
          ...proc,
          failureCauses: (proc.failureCauses || []).map((c: any) => 
            c.id === causeId ? { ...c, occurrence } : c
          )
        };
      });
      // ✅ CRUD Update: 확정 상태 해제
      newState.failureL3Confirmed = false;
      return newState;
    };
    
    // ✅ setStateSynced 사용
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    
    // ✅ 저장 보장 + DB 저장
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) {
        try { await saveAtomicDB(); } catch (e) { /* ignore */ }
      }
    }, 100);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  /**
   * ✅ 평탄화된 행 데이터 - CASCADE 구조 (FailureL2Tab 패턴)
   * 공정(proc) → 작업요소(we) → 기능(func) → 공정특성(char) → 고장원인(cause)
   * 공정특성 기준으로 행 분리, 각 고장원인에 processCharId 연결
   */
  const flatRows = useMemo(() => {
    // ✅ 상위 단계 미확정이면 표시 자체를 하지 않음
    if (!isUpstreamConfirmed) return [];
    const rows: any[] = [];
    const processes = state.l2.filter(p => p.name && !p.name.includes('클릭'));
    
    // ✅ 2026-01-19: 공정 레벨 중복 추적 제거 (작업요소별로 공정특성 표시)
    
    processes.forEach(proc => {
      const workElements = (proc.l3 || []).filter((we: any) => we.name && !we.name.includes('클릭'));
      const allCauses = proc.failureCauses || [];  // 공정 레벨에 저장된 고장원인

      // ✅ 공정 내 공정특성 이름별 id 그룹/대표 id(사전순) - “표시 1개 + FK 안정화”를 위한 기준
      const charIdsByName = new Map<string, Set<string>>();
      const canonicalIdByName = new Map<string, string>();
      (proc.l3 || []).forEach((we: any) => {
        (we.functions || []).forEach((f: any) => {
          (f.processChars || []).forEach((pc: any) => {
            const n = String(pc?.name || '').trim();
            const id = String(pc?.id || '').trim();
            if (!n || !id) return;
            if (!charIdsByName.has(n)) charIdsByName.set(n, new Set<string>());
            charIdsByName.get(n)!.add(id);
            const prev = canonicalIdByName.get(n);
            if (!prev || id.localeCompare(prev) < 0) canonicalIdByName.set(n, id);
          });
        });
      });
      
      
      if (workElements.length === 0) {
        rows.push({ proc, we: null, processChar: null, cause: null, procRowSpan: 1, weRowSpan: 1, charRowSpan: 1, showProc: true, showWe: true, showChar: true });
        return;
      }
      
      let procRowCount = 0;
      const procFirstRowIdx = rows.length;
      
      workElements.forEach((we: any, weIdx: number) => {
        // ✅ 작업요소의 의미 있는 공정특성만 수집 (placeholder 제외)
        const isMeaningful = (name: string) => {
          if (!name || name.trim() === '') return false;
          const placeholders = ['클릭', '선택', '입력', '추가', '필요', '기능분석에서'];
          return !placeholders.some(p => name.includes(p));
        };
        
        const allProcessChars: any[] = [];
        const functions = we.functions || [];
        
        functions.forEach((f: any) => {
          // ✅ 의미 있는 기능만 처리
          if (!isMeaningful(f.name)) return;
          
          // ✅ 2026-01-19: 기능(Function) 내에서만 중복 체크 (바로 상위 부모 기준)
          // - 같은 기능 내 동일 공정특성명 → 스킵
          // - 다른 기능/다른 작업요소의 동일 이름 → 허용
          const displayedCharsInFunc = new Set<string>();
          
          (f.processChars || []).forEach((c: any) => {
            // ✅ 의미 있는 공정특성만 추가
            if (!isMeaningful(c.name)) return;
            
            const charName = c.name?.trim();
            
            // ✅ 같은 기능 내에서만 중복 스킵
            if (displayedCharsInFunc.has(charName)) {
              return; // 같은 기능 내 중복만 스킵
            }
            displayedCharsInFunc.add(charName);
            
            const canonicalId = canonicalIdByName.get(charName) || String(c.id || '').trim();
            const ids = Array.from(charIdsByName.get(charName) || new Set<string>([canonicalId])).filter(Boolean);
            // ✅ 표시 행은 대표 id로 고정하고, 연결은 name-group ids 전체로 처리
            allProcessChars.push({ ...c, id: canonicalId, processCharIds: ids, funcId: f.id, funcName: f.name });
          });
        });
        
        let weRowCount = 0;
        const weFirstRowIdx = rows.length;
        
        if (allProcessChars.length === 0) {
          // 공정특성 없음 - 빈 행 1개
          rows.push({
            proc, we, processChar: null, cause: null,
            procRowSpan: 0, weRowSpan: 1, charRowSpan: 1,
            showProc: false, showWe: true, showChar: true
          });
          weRowCount = 1;
        } else {
          // 각 공정특성별로 행 생성
          allProcessChars.forEach((pc: any, pcIdx: number) => {
            // 이 공정특성에 연결된 고장원인들
            const ids: string[] = Array.isArray(pc.processCharIds) && pc.processCharIds.length > 0
              ? pc.processCharIds
              : [String(pc.id || '').trim()];
            const linkedCausesRaw = allCauses.filter((c: any) => ids.includes(String(c.processCharId || '').trim()));
            // ✅ 동일 공정특성명 중복 id로 인해 같은 고장원인이 중복 생성된 경우, name 기준 1번만 표시
            const seenCauseNames = new Set<string>();
            const linkedCauses = linkedCausesRaw.filter((c: any) => {
              const n = String(c?.name || '').trim();
              if (!n) return true;
              if (seenCauseNames.has(n)) return false;
              seenCauseNames.add(n);
              return true;
            });
            const charFirstRowIdx = rows.length;
            
            if (linkedCauses.length === 0) {
              // 고장원인 없음 - 빈 행 1개
              rows.push({
                proc, we, processChar: pc, cause: null,
                procRowSpan: 0, weRowSpan: 0, charRowSpan: 1,
                showProc: false, showWe: false, showChar: true
              });
            } else {
              // 각 고장원인별로 행 생성
              linkedCauses.forEach((cause: any, cIdx: number) => {
                rows.push({
                  proc, we, processChar: pc, cause,
                  procRowSpan: 0, weRowSpan: 0,
                  charRowSpan: cIdx === 0 ? linkedCauses.length : 0,
                  showProc: false, showWe: false, showChar: cIdx === 0
                });
              });
            }
            
            const charRowCount = Math.max(1, linkedCauses.length);
            if (rows[charFirstRowIdx]) {
              rows[charFirstRowIdx].charRowSpan = charRowCount;
            }
            weRowCount += charRowCount;
          });
        }
        
        // 작업요소 rowSpan 갱신
        if (rows[weFirstRowIdx]) {
          rows[weFirstRowIdx].weRowSpan = weRowCount;
          rows[weFirstRowIdx].showWe = true;
        }
        procRowCount += weRowCount;
      });
      
      // 공정 rowSpan 갱신
      if (rows[procFirstRowIdx]) {
        rows[procFirstRowIdx].procRowSpan = procRowCount;
        rows[procFirstRowIdx].showProc = true;
      }
    });
    
    return rows;
  }, [state.l2]);

  return (
    <div className="p-0 overflow-auto h-full" style={{ paddingBottom: '50px' }} onKeyDown={handleEnterBlur}>
      <table className="w-full border-collapse table-fixed" style={{ marginBottom: '50px' }}>
        <colgroup>
          <col className="w-[120px]" />
          <col className="w-[120px]" />
          <col className="w-[160px]" />
          <col className="w-[50px]" />
          <col className="w-[280px]" />
        </colgroup>
        
        {/* 3행 헤더 구조 - 하단 2px 검은색 구분선 */}
        <thead className="sticky top-0 z-20 bg-white border-b-2 border-black">
          {/* 1행: 단계 구분 */}
          <tr>
            <th colSpan={2} className="bg-[#1976d2] text-white border border-[#ccc] px-1.5 py-1 text-xs font-extrabold text-center whitespace-nowrap">
              구조분석(2단계)
            </th>
            <th colSpan={2} className="bg-[#388e3c] text-white border border-[#ccc] px-1.5 py-1 text-xs font-extrabold text-center whitespace-nowrap">
              기능분석(3단계)
            </th>
            <th className="bg-[#e65100] text-white border border-[#ccc] px-1.5 py-1 text-xs font-extrabold text-center">
              <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                <span className="whitespace-nowrap">고장분석(4단계)</span>
                <div className="flex gap-1">
                  {isConfirmed ? (
                    <span className={badgeConfirmed}>✓ 확정됨({state.l2.reduce((sum, p) => sum + (p.failureCauses?.length || 0), 0)})</span>
                  ) : (
                    <button type="button" onClick={handleConfirm} className={btnConfirm}>확정</button>
                  )}
                  <span className={missingCount > 0 ? badgeMissing : badgeOk}>누락 {missingCount}건</span>
                  {/* ✅ 2026-01-16: 수정 버튼 항상 표시 (확정됨/누락 있을 때) */}
                  {(isConfirmed || missingCount > 0) && (
                    <button type="button" onClick={handleEdit} className={btnEdit}>수정</button>
                  )}
                </div>
              </div>
            </th>
          </tr>
          
          {/* 2행: 항목 그룹 (표준화) */}
          <tr>
            <th className="bg-[#1976d2] text-white border border-[#ccc] p-1.5 text-xs font-semibold text-center">
              2. 메인 공정명
            </th>
            <th className="bg-[#1976d2] text-white border border-[#ccc] p-1.5 text-xs font-semibold text-center">
              3. 작업 요소명
            </th>
            <th colSpan={2} className="bg-[#388e3c] text-white border border-[#ccc] p-1.5 text-xs font-semibold text-center">
              3. 작업요소의 기능 및 공정특성
            </th>
            <th className="bg-[#e65100] text-white border border-[#ccc] p-1.5 text-xs font-semibold text-center">
              3. 고장원인(FC)
              {missingCount > 0 && (
                <span className="ml-2 bg-yellow-400 text-red-700 px-3 py-1 rounded-md text-sm font-extrabold animate-pulse shadow-lg">
                  ⚠️ 누락 {missingCount}건
                </span>
              )}
            </th>
          </tr>
          
          {/* 3행: 세부 컬럼 */}
          <tr>
            <th className="bg-[#bbdefb] border border-[#ccc] p-1.5 text-xs font-semibold text-center">
              NO+공정명
            </th>
            <th className="bg-[#bbdefb] border border-[#ccc] p-1.5 text-xs font-semibold text-center">
              작업요소
            </th>
            <th className="bg-[#c8e6c9] border border-[#ccc] border-r-[2px] border-r-orange-500 p-1.5 text-xs font-semibold text-center">
              공정특성
            </th>
            <th className="bg-orange-500 text-white border border-[#ccc] border-l-0 p-1 text-[11px] font-semibold text-center whitespace-nowrap">
              특별특성
            </th>
            <th className="bg-[#ffe0b2] border border-[#ccc] p-1.5 text-xs font-semibold text-center">
              고장원인(FC)
              {missingCounts.failureCauseCount > 0 && (
                <span className="ml-2 bg-red-600 text-white px-2.5 py-1 rounded-md text-sm font-extrabold animate-pulse shadow-lg ring-2 ring-red-300">
                  누락 {missingCounts.failureCauseCount}건
                </span>
              )}
            </th>
          </tr>
        </thead>
        
        <tbody>
          {flatRows.length === 0 ? (
            (() => {
              const zebra = getZebraColors(0);
              return (
                <tr>
                  <td className="border border-[#ccc] p-2.5 text-center font-semibold" style={{ background: zebra.structure }}>
                    {!isUpstreamConfirmed ? '⚠️ 기능분석(3L) 확정 필요' : '(구조분석에서 공정 입력)'}
                  </td>
                  <td className="border border-[#ccc] p-2.5 text-center font-semibold" style={{ background: zebra.structure }}>
                    {!isUpstreamConfirmed ? '하위 단계는 상위 단계 확정 후 활성화됩니다.' : '(작업요소 입력)'}
                  </td>
                  <td className="border border-[#ccc] p-2.5 text-center" style={{ background: zebra.function }}>
                    {!isUpstreamConfirmed ? '-' : '(기능분석에서 입력)'}
                  </td>
                  <td className="border border-[#ccc] p-2.5 text-center" style={{ background: zebra.function }}>
                    -
                  </td>
                  <td className={cellP0} style={{ background: zebra.failure }}>
                    <SelectableCell value="" placeholder="고장원인 선택" bgColor={zebra.failure} onClick={() => {}} />
                  </td>
                </tr>
              );
            })()
          ) : (() => {
            // ✅ 시각우선: rowSpan(병합) 셀은 "그룹 인덱스" 기준으로 번갈아 보이게 처리
            const procIdxMap = new Map<string, number>();
            const weIdxMap = new Map<string, number>();
            const charIdxMap = new Map<string, number>();
            let procIdx = 0;
            let weIdx = 0;
            let charIdx = 0;

            for (const r of flatRows as any[]) {
              const pId = r.proc?.id;
              const wId = r.we?.id;
              const cId = r.processChar?.id;
              if (r.showProc && pId && !procIdxMap.has(pId)) procIdxMap.set(pId, procIdx++);
              if (r.showWe && pId && wId) {
                const wKey = `${pId}:${wId}`;
                if (!weIdxMap.has(wKey)) weIdxMap.set(wKey, weIdx++);
              }
              if (r.showChar && pId && wId && cId) {
                const cKey = `${pId}:${wId}:${cId}`;
                if (!charIdxMap.has(cKey)) charIdxMap.set(cKey, charIdx++);
              }
            }

            return flatRows.map((row, idx) => {
            // ✅ CASCADE 구조: processChar가 직접 flatRows에 포함됨
            const zebra = getZebraColors(idx); // 표준화된 색상
            const procStripeIdx = procIdxMap.get(row.proc?.id) ?? 0;
            const weStripeIdx = weIdxMap.get(`${row.proc?.id || ''}:${row.we?.id || ''}`) ?? 0;
            const charStripeIdx = charIdxMap.get(`${row.proc?.id || ''}:${row.we?.id || ''}:${row.processChar?.id || ''}`) ?? 0;
            
            return (
              <tr key={`${row.proc.id}-${row.we?.id || 'empty'}-${row.processChar?.id || 'nochar'}-${row.cause?.id || idx}`}>
                {/* 공정 셀: showProc && procRowSpan > 0 (파란색) */}
                {row.showProc && row.procRowSpan > 0 && (
                  <td rowSpan={row.procRowSpan} className="border border-[#ccc] p-1.5 text-center font-semibold align-middle text-xs" style={{ background: getZebra('structure', procStripeIdx) }}>
                    {row.proc.no}. {row.proc.name}
                  </td>
                )}
                
                {/* 작업요소 셀: showWe && weRowSpan > 0 (파란색) */}
                {row.showWe && row.weRowSpan > 0 && (
                  <td rowSpan={row.weRowSpan} className="border border-[#ccc] p-1.5 text-center align-middle text-xs" style={{ background: getZebra('structure', weStripeIdx) }}>
                    {row.we?.name || '(작업요소 없음)'}
                  </td>
                )}
                
                {/* ✅ 공정특성 셀: showChar && charRowSpan > 0 (녹색) */}
                {row.showChar && row.charRowSpan > 0 && (
                  <td rowSpan={row.charRowSpan} className="border border-[#ccc] border-r-[2px] border-r-orange-500 p-1.5 text-center align-middle text-xs" style={{ background: getZebra('function', charStripeIdx) }}>
                    {row.processChar?.name || '(기능분석에서 입력)'}
                  </td>
                )}
                {/* 특별특성 셀 (녹색) */}
                {row.showChar && row.charRowSpan > 0 && (
                  <td rowSpan={row.charRowSpan} className="border border-[#ccc] p-1 text-center align-middle text-xs" style={{ background: getZebra('function', charStripeIdx) }}>
                    {row.processChar?.specialChar ? (
                      <span className={`px-1.5 py-0.5 rounded text-white text-[10px] font-bold ${
                        row.processChar.specialChar === 'CC' ? 'bg-red-600' : 
                        row.processChar.specialChar === 'SC' ? 'bg-orange-500' : 'bg-blue-600'
                      }`}>
                        {row.processChar.specialChar}
                      </span>
                    ) : '-'}
                  </td>
                )}
                
                {/* 고장원인 셀 */}
                <td className={cellP0} style={{ backgroundColor: zebra.failure }}>
                  {row.we && row.processChar ? (
                    <SelectableCell 
                      value={row.cause?.name || ''} 
                      placeholder="고장원인 선택" 
                      bgColor={zebra.failure} 
                      onClick={() => {
                        handleCellClick({ 
                          type: 'l3FailureCause', 
                          processId: row.proc.id, 
                          weId: row.we.id, 
                          processCharId: row.processChar.id,  // ✅ CASCADE 연결
                          processCharName: row.processChar.name,
                          causeId: row.cause?.id || undefined, 
                          title: `${row.processChar.name} → 고장원인`, 
                          itemCode: 'FC1' 
                        });
                      }}
                      onDoubleClickEdit={row.cause?.id ? (newValue: string) => {
                        // ★ 더블클릭 인라인 편집: 해당 고장원인 이름 직접 수정 - setStateSynced 패턴 적용
                        const updateFn = (prev: any) => {
                          const newL2 = prev.l2.map((proc: any) => {
                            if (proc.id !== row.proc.id) return proc;
                            const newCauses = (proc.failureCauses || []).map((c: any) => {
                              if (c.id !== row.cause?.id) return c;
                              return { ...c, name: newValue };
                            });
                            return { ...proc, failureCauses: newCauses, failureL3Confirmed: false };
                          });
                          return { ...prev, l2: newL2, failureL3Confirmed: false };
                        };
                        if (setStateSynced) {
                          setStateSynced(updateFn);
                        } else {
                          setState(updateFn);
                        }
                        setDirty(true);
                        // ✅ 인라인 편집 후 저장
                        setTimeout(() => {
                          saveToLocalStorage?.();
                          saveAtomicDB?.();
                        }, 100);
                      } : undefined}
                    />
                  ) : (
                    <span className="text-[#e65100] text-xs font-semibold p-2 block">-</span>
                  )}
                </td>
              </tr>
            );
          });
        })()}
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
          singleSelect={false}
          currentValues={(() => {
            if (modal.type === 'l3FailureCause') {
              // ✅ 공정 레벨에서 해당 processCharId에 연결된 고장원인만 가져오기
              const proc = state.l2.find(p => p.id === modal.processId);
              const allCauses = proc?.failureCauses || [];
              return allCauses
                .filter((c: any) => c.processCharId === modal.processCharId)
                .map((c: any) => c.name);
            }
            return [];
          })()}
          processName={processList.find(p => p.id === modal.processId)?.name}
          workElementName={modal.processCharName || ''}  // ✅ 공정특성명 표시
          processList={processList}
          onProcessChange={(newProcId) => setModal(modal ? { ...modal, processId: newProcId } : null)}
        />
      )}
    </div>
  );
}

