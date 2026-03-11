/**
 * @file useFunctionL1Handlers.ts
 * @description FunctionL1Tab 핸들러 로직 분리
 * @status CODEFREEZE 🔒
 * @frozen_date 2026-02-17
 * @freeze_level L2
 * 
 * ★★★ 2026-02-05: FunctionL1Tab.tsx 최적화 - 핸들러 분리 ★★★
 * 
 * 원인 분석:
 * 1. handleSave (200줄+) - 각 타입별 저장 로직이 복잡
 * 2. handleDelete (80줄+) - 삭제 로직이 복잡
 * 3. loadFromMaster (120줄+) - 마스터 데이터 로드 복잡
 * 4. 인라인 편집 핸들러들 (80줄+) - 각각 30줄 이상
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { uid } from '../../../constants';
import { ensurePlaceholder } from '../../../utils/safeMutate';
import { findLinkedFunctionsForType, findLinkedRequirementsForFunction } from '../../../utils/auto-link';
import { isPlaceholder, calculateMissingCounts } from '../functionL1Utils';
import { isMissing as isMissingUtil } from '../../shared/tabUtils';
import { validateAutoMapping, groupMatchedByRoom } from '../../../autoMapping';
import type { DataKey, GatekeeperResult } from '../../../autoMapping';

interface L1State {
  l1?: {
    id?: string;
    name?: string;
    types?: Array<{
      id: string;
      name: string;
      functions: Array<{
        id: string;
        name: string;
        requirements: Array<{ id: string; name: string }>;
      }>;
    }>;
  };
  l1Confirmed?: boolean;
}

interface ModalConfig {
  type: string;
  id: string;
  title: string;
  itemCode: string;
  funcId?: string;
  reqId?: string;
  parentFunction?: string;
  parentCategory?: string;
}

interface UseFunctionL1HandlersProps {
  state: L1State;
  setState: (fn: (prev: any) => any) => void;
  setStateSynced?: (fn: (prev: any) => any) => void;
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage?: (force?: boolean) => void;
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
  modal: ModalConfig | null;
  setModal: (modal: ModalConfig | null) => void;
  fmeaId?: string;
  showAlert?: (message: string, items?: string[]) => void;
}

export function useFunctionL1Handlers({
  state,
  setState,
  setStateSynced,
  setDirty,
  saveToLocalStorage,
  saveAtomicDB,
  modal,
  setModal,
  fmeaId,
  showAlert,
}: UseFunctionL1HandlersProps) {
  const _alert = showAlert || alert;
  const isConfirmed = state.l1Confirmed || false;
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);
  const [previewResult, setPreviewResult] = useState<GatekeeperResult | null>(null);
  // ★ 미리보기에서 사용할 누락 카테고리 저장
  const [pendingMissingCats, setPendingMissingCats] = useState<string[]>([]);
  const l1DataRef = useRef<string>('');

  // ✅ 공통 상태 업데이트 함수
  const updateState = useCallback((updateFn: (prev: any) => any) => {
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
  }, [setState, setStateSynced, setDirty]);

  // ✅ 공통 저장 함수
  const saveData = useCallback(async (delay = 100) => {
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) {
        try {
          await saveAtomicDB(true);
        } catch (e) {
          console.error('[FunctionL1Tab] DB 저장 오류:', e);
        }
      }
    }, delay);
  }, [saveToLocalStorage, saveAtomicDB]);

  // ✅ 누락 건수 계산
  const missingCounts = calculateMissingCounts(state.l1?.types || [], isMissingUtil);
  const missingCount = missingCounts.total;

  // ✅ L1 데이터 변경 시 자동 저장
  useEffect(() => {
    const dataKey = JSON.stringify(state.l1?.types || []);
    if (l1DataRef.current && dataKey !== l1DataRef.current) {
      saveToLocalStorage?.();
    }
    l1DataRef.current = dataKey;
  }, [state.l1?.types, saveToLocalStorage]);

  // ✅ 누락 발생 시 자동 수정 모드 전환
  useEffect(() => {
    if (isConfirmed && missingCount > 0) {
      updateState((prev: any) => ({ ...prev, l1Confirmed: false }));
    }
  }, [isConfirmed, missingCount, updateState]);

  // ✅ 셀 클릭 핸들러
  const handleCellClick = useCallback((modalConfig: ModalConfig) => {
    if (isConfirmed) {
      updateState((prev: any) => ({ ...prev, l1Confirmed: false }));
    }
    setModal(modalConfig);
  }, [isConfirmed, updateState, setModal]);

  // ✅ 확정 핸들러
  const handleConfirm = useCallback(() => {
    if (missingCount > 0) {
      _alert(`누락된 항목이 ${missingCount}건 있습니다.\n모든 항목을 입력 후 확정해 주세요.`);
      return;
    }

    updateState((prev: any) => ({ ...prev, l1Confirmed: true }));

    // ★★★ 2026-02-16 FIX: force=true + try-catch + 단일 호출 ★★★
    // saveAtomicDB만 호출 (saveToLocalStorage도 동일 API 호출 → 중복 방지)
    requestAnimationFrame(() => {
      setTimeout(async () => {
        try {
          await saveAtomicDB?.(true);
        } catch (e) {
          console.error('[FunctionL1Tab] 확정 후 DB 저장 오류:', e);
        }
      }, 50);
    });

    _alert('1L 완제품 기능분석이 확정되었습니다.');
  }, [missingCount, updateState, saveToLocalStorage, saveAtomicDB]);

  // ✅ 수정 핸들러
  const handleEdit = useCallback(() => {
    updateState((prev: any) => ({ ...prev, l1Confirmed: false }));
    requestAnimationFrame(() => setTimeout(() => saveToLocalStorage?.(), 50));
  }, [updateState, saveToLocalStorage]);

  // ✅ 마스터 데이터 로드 — Gatekeeper 검증 + 구조불변
  const loadFromMaster = useCallback(async () => {
    setIsLoadingMaster(true);

    try {
      // Step 1: API 호출 (★ fmeaId 필터로 해당 프로젝트 데이터만 조회)
      const masterUrl = fmeaId
        ? `/api/pfmea/master?fmeaId=${encodeURIComponent(fmeaId)}&includeItems=true`
        : '/api/pfmea/master?includeItems=true';
      const res = await fetch(masterUrl);
      if (!res.ok) throw new Error('마스터 API 호출 실패');

      const data = await res.json();
      const allFlatItems = data.dataset?.flatItems || data.active?.flatItems || [];

      // C1/C2/C3 아이템 추출 + 중복 제거
      const dedup = (items: any[]) => {
        const seen = new Set<string>();
        return items.filter((i: any) => {
          const key = `${i.processNo}::${i.value}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };
      const cItems = dedup(allFlatItems.filter((i: any) =>
        i.itemCode === 'C1' || i.itemCode === 'C2' || i.itemCode === 'C3'
      ));

      if (cItems.length === 0) {
        _alert('마스터 데이터에 1L 기능(C1/C2/C3) 항목이 없습니다.\n먼저 기초정보를 Import 해주세요.');
        setIsAutoMode(false);
        return;
      }

      // DataKey[] 변환 — C1은 value를 processNo로 사용 (카테고리 역할)
      const dataKeys: DataKey[] = cItems.map((i: any) => ({
        processNo: i.itemCode === 'C1'
          ? (i.value || '').toUpperCase().trim()          // C1: value 자체가 카테고리
          : (i.processNo || 'YP').toUpperCase().trim(),  // C2/C3: processNo가 카테고리
        itemCode: i.itemCode,
        value: (i.value || '').trim(),
        sourceFmeaId: i.sourceFmeaId,
      }));

      // Step 2: ★ 마스터 데이터에서 카테고리 추출 (YP/SP/USER 등)
      const masterCategories = new Set<string>();
      dataKeys.forEach(dk => {
        if (dk.itemCode === 'C1') masterCategories.add(dk.processNo);
      });
      // C1이 없으면 C2/C3의 processNo에서 카테고리 추출
      if (masterCategories.size === 0) {
        dataKeys.forEach(dk => masterCategories.add(dk.processNo));
      }
      // 기본 카테고리: YP/SP/USER (마스터에 없어도 기본 포함)
      const DEFAULT_CATEGORIES = ['YP', 'SP', 'USER'];
      DEFAULT_CATEGORIES.forEach(c => masterCategories.add(c));

      // Step 3: ★ types가 비어있거나 누락된 카테고리가 있으면 자동 생성
      const currentTypes = state.l1?.types || [];
      const existingCats = new Set(currentTypes.map((t: any) => (t.name || '').toUpperCase().trim()));
      // ★ N/A 렌더링 제외: 사용자가 구분명을 'N/A'로 변경하면 해당 슬롯은 점유 상태.
      //   타입 수가 기본(3개) 이상이면 DEFAULT_CATEGORIES 누락분 재추가 방지
      //   → N/A 구분은 자동모드 데이터 매핑에서 완전히 제외됨
      const missingCats = currentTypes.length >= DEFAULT_CATEGORIES.length
        ? [...masterCategories].filter(c => !existingCats.has(c) && !DEFAULT_CATEGORIES.includes(c))
        : [...masterCategories].filter(c => !existingCats.has(c));

      // 누락 카테고리를 types에 추가한 상태로 Gatekeeper 검증 (N/A 제외)
      const typesForValidation = [
        ...currentTypes.filter((t: any) => (t.name || '').toUpperCase().trim() !== 'N/A'),
        ...missingCats.map(cat => ({ id: uid(), name: cat, functions: [] })),
      ];
      const stateForValidation = {
        ...state,
        l1: { ...state.l1, types: typesForValidation },
      };

      // Step 4: ★ Gatekeeper 검증
      const result = validateAutoMapping('function-l1', stateForValidation as any, dataKeys, fmeaId);

      if (result.matched.length === 0) {
        _alert(result.summary);
        setIsAutoMode(false);
        return;
      }

      // ★ 트리뷰 미리보기 모달 표시 (즉시 매핑하지 않음)
      setPendingMissingCats(missingCats);
      setPreviewResult(result);
    } catch (error) {
      console.error('❌ [자동모드-L1] 오류:', error);
      _alert('마스터 데이터 로드 오류가 발생했습니다.');
      setIsAutoMode(false);
    } finally {
      setIsLoadingMaster(false);
    }
  }, [updateState, saveToLocalStorage, fmeaId, state]);

  // ★★★ Step B: 트리뷰 확정 → 실제 워크시트 매핑 ★★★
  const applyAutoMapping = useCallback((action: 'proceed' | 'remove-missing') => {
    if (!previewResult) return;

    const funcsByCat = groupMatchedByRoom(previewResult.matched, 'C2');
    const reqsByCat = groupMatchedByRoom(previewResult.matched, 'C3');

    updateState((prev: any) => {
      const prevTypes = prev.l1?.types || [];
      const prevCats = new Set(prevTypes.map((t: any) => (t.name || '').toUpperCase().trim()));
      const additionalTypes = pendingMissingCats
        .filter(c => !prevCats.has(c))
        .map(cat => ({ id: uid(), name: cat, functions: [] }));
      const allTypes = [...prevTypes, ...additionalTypes];

      const newTypes = allTypes.map((t: any) => {
        const cat = (t.name || '').toUpperCase().trim();
        if (cat === 'N/A') return t;
        const hasNAFunction = (t.functions || []).some((f: any) =>
          (f.name || '').trim().toUpperCase() === 'N/A'
        );
        if (hasNAFunction) return t;

        const funcNames = funcsByCat.get(cat) || [];
        const reqNames = reqsByCat.get(cat) || [];

        if (funcNames.length === 0) {
          if (action === 'proceed') {
            return { ...t, functions: [{ id: uid(), name: '[데이타 누락]', requirements: [{ id: uid(), name: '[데이타 누락]' }] }] };
          }
          return t;
        }

        const cleanedFunctions = (t.functions || []).filter((f: any) => f.name && f.name.trim());
        const existingFuncNames = new Set(cleanedFunctions.map((f: any) => f.name));
        const newFunctions = funcNames
          .filter((name: string) => !existingFuncNames.has(name))
          .map((funcName: string, fIdx: number) => {
            const reqForFunc = fIdx < reqNames.length
              ? [reqNames[fIdx]]
              : (fIdx === funcNames.length - 1 ? reqNames.slice(funcNames.length - 1) : []);
            return {
              id: uid(),
              name: funcName,
              requirements: reqForFunc.map((reqName: string) => ({ id: uid(), name: reqName })),
            };
          });

        return { ...t, functions: [...cleanedFunctions, ...newFunctions] };
      });

      return { ...prev, l1: { ...prev.l1, types: newTypes }, l1Confirmed: false };
    });

    setIsAutoMode(true);
    setPreviewResult(null);
    setPendingMissingCats([]);
    saveToLocalStorage?.();
  }, [previewResult, pendingMissingCats, updateState, saveToLocalStorage]);

  // ★★★ 트리뷰 취소 ★★★
  const cancelPreview = useCallback(() => {
    setPreviewResult(null);
    setPendingMissingCats([]);
    setIsAutoMode(false);
  }, []);

  // ✅ 자동/수동 모드 토글
  const handleToggleMode = useCallback(async () => {
    if (isAutoMode) {
      setIsAutoMode(false);
      return;
    }

    setIsAutoMode(true);
    await loadFromMaster();
  }, [isAutoMode, loadFromMaster]);

  // ✅ 인라인 편집 - 요구사항
  const handleInlineEditRequirement = useCallback((typeId: string, funcId: string, reqId: string, newValue: string) => {
    updateState((prev: any) => ({
      ...prev,
      l1: {
        ...prev.l1,
        types: prev.l1.types.map((t: any) => {
          if (t.id !== typeId) return t;
          return {
            ...t,
            functions: t.functions.map((f: any) => {
              if (f.id !== funcId) return f;
              return {
                ...f,
                requirements: f.requirements.map((r: any) =>
                  r.id === reqId ? { ...r, name: newValue } : r
                )
              };
            })
          };
        })
      }
    }));
    saveData(100);
  }, [updateState, saveData]);

  // ✅ 인라인 편집 - 기능
  const handleInlineEditFunction = useCallback((typeId: string, funcId: string, newValue: string) => {
    updateState((prev: any) => ({
      ...prev,
      l1: {
        ...prev.l1,
        types: prev.l1.types.map((t: any) => {
          if (t.id !== typeId) return t;
          return {
            ...t,
            functions: t.functions.map((f: any) =>
              f.id === funcId ? { ...f, name: newValue } : f
            )
          };
        })
      }
    }));
    saveData(100);
  }, [updateState, saveData]);

  // ✅ 저장 핸들러
  const handleSave = useCallback((selectedValues: string[]) => {
    if (!modal) return;

    // ★★★ Bug Fix: isPlaceholder 대신 단순 빈 문자열만 필터링 (모달 선택값은 유효한 값) ★★★
    const filteredValues = selectedValues.filter(v => v && v.trim());

    if (filteredValues.length === 0) return;

    updateState((prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      const { type, id } = modal;

      if (type === 'l1Type') {
        const currentTypes = [...newState.l1.types];

        // ★ 위에서부터 순서대로 빈 타입 슬롯을 채움
        const emptyIndices = currentTypes
          .map((t: any, idx: number) => isPlaceholder(t.name) ? idx : -1)
          .filter((idx: number) => idx >= 0);

        let valIdx = 0;
        // 1) 빈 슬롯에 선택값 순서대로 채움 (★ auto-link 기능도 함께 적용)
        for (const emptyIdx of emptyIndices) {
          if (valIdx >= filteredValues.length) break;
          const val = filteredValues[valIdx];
          const linkedFunctions = findLinkedFunctionsForType(prev, val);
          const autoLinkedFuncs = linkedFunctions.length > 0
            ? linkedFunctions.map(name => ({ id: uid(), name, requirements: [] }))
            : currentTypes[emptyIdx].functions || [{ id: uid(), name: '', requirements: [] }];
          currentTypes[emptyIdx] = { ...currentTypes[emptyIdx], name: val, functions: autoLinkedFuncs };
          valIdx++;
        }

        // 2) 남은 값은 새 타입으로 추가 (★ 중복 이름 허용 - YP/SP/USER 동시 추가 가능)
        // 빈 슬롯이 있던 위치 바로 뒤에 삽입 (위치 유지)
        const insertPos = emptyIndices.length > 0 ? emptyIndices[emptyIndices.length - 1] + 1 : currentTypes.length;
        let insertOffset = 0;
        for (let i = valIdx; i < filteredValues.length; i++) {
          const val = filteredValues[i];
          const linkedFunctions = findLinkedFunctionsForType(prev, val);
          const autoLinkedFuncs = linkedFunctions.length > 0
            ? linkedFunctions.map(name => ({ id: uid(), name, requirements: [] }))
            : [{ id: uid(), name: '', requirements: [] }]; // ★ 빈 기능 1개 기본 포함
          currentTypes.splice(insertPos + insertOffset, 0, { id: uid(), name: val, functions: autoLinkedFuncs });
          insertOffset++;
        }

        newState.l1.types = currentTypes;
      }
      else if (type === 'l1Function') {
        const funcId = (modal as any).funcId;
        newState.l1.types = newState.l1.types.map((t: any) => {
          if (t.id !== id) return t;
          const currentFuncs = [...t.functions];

          // ★ 단일 선택: 클릭한 셀에 직접 할당
          if (funcId && filteredValues.length === 1) {
            return {
              ...t,
              functions: currentFuncs.map((f: any) =>
                f.id === funcId ? { ...f, name: filteredValues[0] } : f
              )
            };
          }

          // ★ 다중 선택: 클릭한 셀을 우선 채우고, 나머지 빈 슬롯을 위→아래 순서로 채움
          let valIdx = 0;

          // 1) 클릭한 셀이 빈 셀이면 첫 번째 값으로 채움
          if (funcId) {
            const clickedIdx = currentFuncs.findIndex((f: any) => f.id === funcId);
            if (clickedIdx >= 0 && isPlaceholder(currentFuncs[clickedIdx].name) && valIdx < filteredValues.length) {
              currentFuncs[clickedIdx] = { ...currentFuncs[clickedIdx], name: filteredValues[valIdx] };
              valIdx++;
            }
          }

          // 2) 나머지 빈 슬롯을 위→아래 순서로 채움
          for (let fIdx = 0; fIdx < currentFuncs.length; fIdx++) {
            if (valIdx >= filteredValues.length) break;
            if (!isPlaceholder(currentFuncs[fIdx].name)) continue; // 이미 값이 있으면 건너뜀
            const val = filteredValues[valIdx];
            const linkedRequirements = findLinkedRequirementsForFunction(prev, val);
            const autoLinkedReqs = linkedRequirements.map(name => ({ id: uid(), name }));
            currentFuncs[fIdx] = { ...currentFuncs[fIdx], name: val, requirements: autoLinkedReqs.length > 0 ? autoLinkedReqs : currentFuncs[fIdx].requirements };
            valIdx++;
          }

          // 3) 남은 값은 새 기능으로 추가 (★ 교차 타입 중복 제거: 다른 타입에 이미 있는 기능명 제외)
          const otherTypeFuncNames = new Set(
            newState.l1.types
              .filter((t2: any) => t2.id !== id)
              .flatMap((t2: any) => (t2.functions || [])
                .filter((f: any) => !isPlaceholder(f.name))
                .map((f: any) => f.name))
          );
          const usedNames = new Set([
            ...currentFuncs.filter((f: any) => !isPlaceholder(f.name)).map((f: any) => f.name),
            ...otherTypeFuncNames
          ]);
          for (let i = valIdx; i < filteredValues.length; i++) {
            const val = filteredValues[i];
            if (!usedNames.has(val)) {
              const linkedRequirements = findLinkedRequirementsForFunction(prev, val);
              const autoLinkedReqs = linkedRequirements.map(name => ({ id: uid(), name }));
              currentFuncs.push({ id: uid(), name: val, requirements: autoLinkedReqs });
              usedNames.add(val);
            }
          }

          return { ...t, functions: currentFuncs };
        });
      }
      else if (type === 'l1Requirement') {
        const reqId = (modal as any).reqId;
        newState.l1.types = newState.l1.types.map((t: any) => ({
          ...t,
          functions: t.functions.map((f: any) => {
            if (f.id !== id) return f;
            const currentReqs = [...(f.requirements || [])];

            // ★ 단일 선택: 클릭한 셀에 직접 할당
            if (reqId && filteredValues.length === 1) {
              return {
                ...f,
                requirements: currentReqs.map((r: any) =>
                  r.id === reqId ? { ...r, name: filteredValues[0] } : r
                )
              };
            }

            if (reqId && filteredValues.length === 0) {
              // ★ 방어: requirements 배열이 완전히 비는 것 방지
              const filtered = currentReqs.filter((r: any) => r.id !== reqId);
              return { ...f, requirements: ensurePlaceholder(filtered, () => ({ id: uid(), name: '' }), 'L1 requirements') };
            }

            // ★ 다중 선택: 클릭한 셀 우선 채우고, 나머지 빈 슬롯을 위→아래 순서로 채움
            let valIdx = 0;

            // 1) 클릭한 셀이 빈 셀이면 첫 번째 값으로 채움
            if (reqId) {
              const clickedIdx = currentReqs.findIndex((r: any) => r.id === reqId);
              if (clickedIdx >= 0 && isPlaceholder(currentReqs[clickedIdx].name) && valIdx < filteredValues.length) {
                currentReqs[clickedIdx] = { ...currentReqs[clickedIdx], name: filteredValues[valIdx] };
                valIdx++;
              }
            }

            // 2) 나머지 빈 슬롯을 위→아래 순서로 채움
            for (let rIdx = 0; rIdx < currentReqs.length; rIdx++) {
              if (valIdx >= filteredValues.length) break;
              if (!isPlaceholder(currentReqs[rIdx].name)) continue;
              currentReqs[rIdx] = { ...currentReqs[rIdx], name: filteredValues[valIdx] };
              valIdx++;
            }

            // 3) 남은 값은 새 요구사항으로 추가
            const usedNames = new Set(currentReqs.filter((r: any) => !isPlaceholder(r.name)).map((r: any) => r.name));
            for (let i = valIdx; i < filteredValues.length; i++) {
              const val = filteredValues[i];
              if (!usedNames.has(val)) {
                currentReqs.push({ id: uid(), name: val });
                usedNames.add(val);
              }
            }

            return { ...f, requirements: currentReqs };
          })
        }));
      }

      return newState;
    });

    saveData(100);
  }, [modal, updateState, saveData]);

  // ✅ 삭제 핸들러
  const handleDelete = useCallback((deletedValues: string[]) => {
    if (!modal) return;

    const { type, id } = modal;
    const deletedSet = new Set(deletedValues);

    updateState((prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));

      if (type === 'l1Type') {
        // ★ 방어: L1 types 배열이 완전히 비는 것 방지 (최소 1개 구분 유지)
        const filtered = newState.l1.types.filter((t: any) => !deletedSet.has(t.name));
        newState.l1.types = ensurePlaceholder(filtered, () => ({
          id: uid(), name: '', functions: [{ id: uid(), name: '', requirements: [] }]
        }), 'L1 types');
      }
      else if (type === 'l1Function') {
        newState.l1.types = newState.l1.types.map((t: any) => {
          if (id && t.id !== id) return t;
          // ★ 방어: L1 functions 배열이 완전히 비는 것 방지
          const filtered = t.functions.filter((f: any) => !deletedSet.has(f.name));
          return { ...t, functions: ensurePlaceholder(filtered, () => ({ id: uid(), name: '', requirements: [] }), 'L1 functions') };
        });
      }
      else if (type === 'l1Requirement') {
        newState.l1.types = newState.l1.types.map((t: any) => ({
          ...t,
          functions: t.functions.map((f: any) => {
            if (id && f.id !== id) return f;
            // ★ 방어: L1 requirements 배열이 완전히 비는 것 방지
            const filtered = (f.requirements || []).filter((r: any) => !deletedSet.has(r.name));
            return { ...f, requirements: ensurePlaceholder(filtered, () => ({ id: uid(), name: '' }), 'L1 requirements') };
          })
        }));
      }

      return newState;
    });

    saveData(200);
  }, [modal, updateState, saveData]);

  return {
    // 상태
    isConfirmed,
    isAutoMode,
    isLoadingMaster,
    missingCounts,
    missingCount,
    // ★★★ 트리뷰 미리보기 ★★★
    previewResult,
    applyAutoMapping,
    cancelPreview,
    // 핸들러
    handleCellClick,
    handleConfirm,
    handleEdit,
    handleToggleMode,
    handleInlineEditRequirement,
    handleInlineEditFunction,
    handleSave,
    handleDelete,
  };
}
