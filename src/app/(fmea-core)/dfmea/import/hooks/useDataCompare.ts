/**
 * @file useDataCompare.ts
 * @description DFMEA 기초정보 데이터 비교 로직 훅
 * @author AI Assistant
 * @created 2026-01-21
 * @module hooks/useDataCompare
 */
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


import { useState, useCallback, useRef } from 'react';
import { ImportedFlatData } from '../types';
import { parseMultiSheetExcel, ParseResult } from '../excel-parser';
import { loadDatasetByFmeaId, saveMasterDataset } from '../utils/master-api';
import { compareData, applyChanges } from '../utils/compareData';
import { ChangeItem } from '../components/DataCompareModal';

// =====================================================
// 타입 정의
// =====================================================

interface UseDataCompareParams {
  flatData: ImportedFlatData[];
  setFlatData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  previewColumn: string;
  masterDatasetId: string | null;
  masterDatasetName: string;
  setMasterDatasetId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsSaved: React.Dispatch<React.SetStateAction<boolean>>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  fmeaId?: string;
  fmeaType?: string;
}

interface UseDataCompareReturn {
  // 상태
  isCompareModalOpen: boolean;
  isCompareMode: boolean;
  dbData: ImportedFlatData[];
  confirmSelections: Set<string>;
  compareChanges: ChangeItem[];
  previousFlatData: ImportedFlatData[];
  compareFileInputRef: React.RefObject<HTMLInputElement | null>;

  // 핸들러
  handleCompareFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleStartCompareMode: () => Promise<void>;
  handleCancelCompareMode: () => void;
  handleToggleConfirm: (id: string) => void;
  handleSelectAllConfirm: (checked: boolean) => void;
  handleConfirmSave: () => Promise<void>;
  handleApplyChanges: (selectedChanges: ChangeItem[]) => Promise<void>;
  setIsCompareModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

// =====================================================
// 훅 구현
// =====================================================

export function useDataCompare({
  flatData,
  setFlatData,
  previewColumn,
  masterDatasetId,
  masterDatasetName,
  setMasterDatasetId,
  setIsSaved,
  setDirty,
  fmeaId,
  fmeaType,
}: UseDataCompareParams): UseDataCompareReturn {
  // ★★★ 2026-02-16: 비즈니스 키 헬퍼 - B1~B4 전체 m4 포함 ★★★
  const getBK = (d: ImportedFlatData) => {
    if (['B1', 'B2', 'B3', 'B4', 'B5'].includes(d.itemCode) && d.m4) return `${d.processNo}|${d.itemCode}|${d.m4}|${d.value}`;
    return `${d.processNo}|${d.itemCode}|${d.value}`;
  };

  // 상태
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [compareChanges, setCompareChanges] = useState<ChangeItem[]>([]);
  const [previousFlatData, setPreviousFlatData] = useState<ImportedFlatData[]>([]);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [dbData, setDbData] = useState<ImportedFlatData[]>([]);
  const [confirmSelections, setConfirmSelections] = useState<Set<string>>(new Set());

  const compareFileInputRef = useRef<HTMLInputElement>(null);

  /** 비교용 파일 선택 핸들러 */
  const handleCompareFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 현재 데이터 저장 (비교 기준)
      setPreviousFlatData([...flatData]);

      // 새 파일 파싱
      const result = await parseMultiSheetExcel(file);
      if (!result.success) {
        alert('파일 파싱에 실패했습니다: ' + result.errors.join(', '));
        return;
      }

      // flatData 형식으로 변환
      const newFlatData: ImportedFlatData[] = [];

      // 공정 데이터 변환
      result.processes.forEach(proc => {
        const processNo = proc.processNo;

        // A2: 공정명
        if (proc.processName) {
          newFlatData.push({
            id: `compare-A2-${processNo}-${Date.now()}`,
            processNo,
            category: 'A',
            itemCode: 'A2',
            value: proc.processName,
            createdAt: new Date(),
          });
        }

        // A3: 공정기능
        proc.processDesc.forEach((val, idx) => {
          if (val) {
            newFlatData.push({
              id: `compare-A3-${processNo}-${idx}-${Date.now()}`,
              processNo,
              category: 'A',
              itemCode: 'A3',
              value: val,
              createdAt: new Date(),
            });
          }
        });

        // A4: 제품특성
        proc.productChars.forEach((val, idx) => {
          if (val) {
            newFlatData.push({
              id: `compare-A4-${processNo}-${idx}-${Date.now()}`,
              processNo,
              category: 'A',
              itemCode: 'A4',
              value: val,
              createdAt: new Date(),
            });
          }
        });

        // A5: 고장형태
        proc.failureModes.forEach((val, idx) => {
          if (val) {
            newFlatData.push({
              id: `compare-A5-${processNo}-${idx}-${Date.now()}`,
              processNo,
              category: 'A',
              itemCode: 'A5',
              value: val,
              createdAt: new Date(),
            });
          }
        });

        // B1: 작업요소
        proc.workElements.forEach((val, idx) => {
          if (val) {
            newFlatData.push({
              id: `compare-B1-${processNo}-${idx}-${Date.now()}`,
              processNo,
              category: 'B',
              itemCode: 'B1',
              value: val,
              createdAt: new Date(),
            });
          }
        });

        // B2: 요소기능
        proc.elementFuncs.forEach((val, idx) => {
          if (val) {
            newFlatData.push({
              id: `compare-B2-${processNo}-${idx}-${Date.now()}`,
              processNo,
              category: 'B',
              itemCode: 'B2',
              value: val,
              belongsTo: proc.elementFuncsWE?.[idx] || undefined,
              createdAt: new Date(),
            });
          }
        });

        // B3: 공정특성
        proc.processChars.forEach((val, idx) => {
          if (val) {
            newFlatData.push({
              id: `compare-B3-${processNo}-${idx}-${Date.now()}`,
              processNo,
              category: 'B',
              itemCode: 'B3',
              value: val,
              belongsTo: proc.processCharsWE?.[idx] || undefined,
              createdAt: new Date(),
            });
          }
        });

        // B4: 고장원인
        proc.failureCauses.forEach((val, idx) => {
          if (val) {
            newFlatData.push({
              id: `compare-B4-${processNo}-${idx}-${Date.now()}`,
              processNo,
              category: 'B',
              itemCode: 'B4',
              value: val,
              createdAt: new Date(),
            });
          }
        });

      });

      // 완제품 데이터 변환
      result.products.forEach((prod, idx) => {
        // ★★★ C1의 값(구분 - YP/SP/USER)을 processNo로 사용 (2026-02-02) ★★★
        const categoryValue = prod.productProcessName || 'YP';  // 구분 값

        // C1: 구분
        if (prod.productProcessName) {
          newFlatData.push({
            id: `compare-C1-${idx}-${Date.now()}`,
            processNo: categoryValue,
            category: 'C',
            itemCode: 'C1',
            value: prod.productProcessName,
            createdAt: new Date(),
          });
        }

        // C2: 제품기능
        prod.productFuncs.forEach((val, fidx) => {
          if (val) {
            newFlatData.push({
              id: `compare-C2-${idx}-${fidx}-${Date.now()}`,
              processNo: categoryValue,
              category: 'C',
              itemCode: 'C2',
              value: val,
              createdAt: new Date(),
            });
          }
        });

        // C3: 요구사항
        prod.requirements.forEach((val, ridx) => {
          if (val) {
            newFlatData.push({
              id: `compare-C3-${idx}-${ridx}-${Date.now()}`,
              processNo: categoryValue,
              category: 'C',
              itemCode: 'C3',
              value: val,
              createdAt: new Date(),
            });
          }
        });

        // C4: 고장영향
        prod.failureEffects.forEach((val, eidx) => {
          if (val) {
            newFlatData.push({
              id: `compare-C4-${idx}-${eidx}-${Date.now()}`,
              processNo: categoryValue,
              category: 'C',
              itemCode: 'C4',
              value: val,
              createdAt: new Date(),
            });
          }
        });
      });

      // 비교 수행
      const changes = compareData(flatData, newFlatData);
      setCompareChanges(changes);
      setIsCompareModalOpen(true);

    } catch (error) {
      console.error('비교 파일 처리 오류:', error);
      alert('파일 처리 중 오류가 발생했습니다.');
    }

    // 파일 입력 초기화
    if (compareFileInputRef.current) {
      compareFileInputRef.current.value = '';
    }
  }, [flatData]);

  /** 비교 모드 시작 - DB 데이터와 새 데이터 비교 */
  const handleStartCompareMode = useCallback(async () => {
    const newData = flatData.filter(d => d.itemCode === previewColumn);
    if (newData.length === 0) {
      alert('비교할 새 데이터가 없습니다. 먼저 데이터를 Import하세요.');
      return;
    }

    try {
      if (!fmeaId) {
        alert('FMEA를 선택해주세요.');
        return;
      }
      const loaded = await loadDatasetByFmeaId(fmeaId);
      if (loaded.flatData.length > 0) {
        const validData = loaded.flatData.filter((d: ImportedFlatData) => d.value && d.value.trim() !== '');
        setDbData(validData);
        setIsCompareMode(true);
        setConfirmSelections(new Set());
      } else {
        alert('DB에 저장된 기존 데이터가 없습니다.');
      }
    } catch (error) {
      console.error('DB 데이터 로드 오류:', error);
      alert('DB 데이터를 불러오는 중 오류가 발생했습니다.');
    }
  }, [flatData, previewColumn, fmeaId]);

  /** 비교 모드 종료 */
  const handleCancelCompareMode = useCallback(() => {
    setIsCompareMode(false);
    setDbData([]);
    setConfirmSelections(new Set());
  }, []);

  /** 확정 선택 토글 */
  const handleToggleConfirm = useCallback((id: string) => {
    setConfirmSelections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  /** 전체 확정 선택 */
  const handleSelectAllConfirm = useCallback((checked: boolean) => {
    if (checked) {
      const allKeys = flatData.filter(d => d.itemCode === previewColumn).map(d => getBK(d));
      setConfirmSelections(new Set(allKeys));
    } else {
      setConfirmSelections(new Set());
    }
  }, [flatData, previewColumn]);

  /** 확정 저장 - 선택된 새 데이터로 DB 업데이트 */
  const handleConfirmSave = useCallback(async () => {
    if (confirmSelections.size === 0) {
      alert('확정할 항목을 선택하세요.');
      return;
    }

    try {
      const confirmedItems = flatData.filter(d => confirmSelections.has(getBK(d)));
      const updatedData: ImportedFlatData[] = [];
      const processedKeys = new Set<string>();

      // A1(공정번호) 변경 시 연관 데이터 processNo 동기화
      const processNoMapping: Map<string, string> = new Map();
      if (previewColumn === 'A1') {
        const dbA1Items = dbData.filter(d => d.itemCode === 'A1');
        confirmedItems.forEach((newItem, idx) => {
          const dbItem = dbA1Items[idx];
          if (dbItem && dbItem.value !== newItem.value) {
            processNoMapping.set(dbItem.value, newItem.value);
          }
        });
      }

      // flatData에서 현재 항목코드가 아닌 것은 그대로 유지
      flatData.filter(d => d.itemCode !== previewColumn).forEach(item => {
        if (processNoMapping.size > 0 && processNoMapping.has(item.processNo)) {
          updatedData.push({
            ...item,
            processNo: processNoMapping.get(item.processNo)!
          });
        } else {
          updatedData.push(item);
        }
        processedKeys.add(getBK(item));
      });

      // 현재 항목코드는 확정된 새 데이터로 대체
      confirmedItems.forEach(item => {
        updatedData.push(item);
        processedKeys.add(getBK(item));
      });

      // dbData에만 있고 flatData에 없는 데이터도 보존
      dbData.filter(d => d.itemCode !== previewColumn).forEach(dbItem => {
        if (!processedKeys.has(getBK(dbItem))) {
          const newProcessNo = processNoMapping.has(dbItem.processNo)
            ? processNoMapping.get(dbItem.processNo)!
            : dbItem.processNo;

          const exists = updatedData.some(
            u => u.processNo === newProcessNo && u.itemCode === dbItem.itemCode
          );
          if (!exists) {
            updatedData.push({
              ...dbItem,
              processNo: newProcessNo
            });
          }
        }
      });

      const dbCount = dbData.filter(d => d.itemCode === previewColumn).length;
      const itemCodesToReplace = processNoMapping.size > 0 ? undefined : previewColumn;

      const res = await saveMasterDataset({
        fmeaId: fmeaId || '',
        fmeaType: fmeaType || 'D',
        datasetId: masterDatasetId,
        name: masterDatasetName || 'MASTER',
        replace: true,
        replaceItemCodes: itemCodesToReplace,
        flatData: updatedData,
      });

      if (res.ok) {
        if (res.datasetId) {
          setMasterDatasetId(res.datasetId);
        }
        setFlatData(updatedData);
        setIsSaved(true);
        setIsCompareMode(false);
        setDbData([]);
        setConfirmSelections(new Set());

        const syncMsg = processNoMapping.size > 0
          ? `\n⚠️ 공정번호 변경으로 연관 데이터(${processNoMapping.size}건) 동기화됨`
          : '';
        alert(`✅ ${confirmedItems.length}건의 새 데이터가 확정 저장되었습니다.\n기존 데이터(${dbCount}건)가 대체되었습니다.${syncMsg}`);
      } else {
        alert('저장 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('확정 저장 오류:', error);
      alert('확정 저장 중 오류가 발생했습니다.');
    }
  }, [confirmSelections, flatData, previewColumn, dbData, masterDatasetId, masterDatasetName, setMasterDatasetId, setFlatData, setIsSaved, fmeaId, fmeaType]);

  /** 비교 결과 적용 핸들러 */
  const handleApplyChanges = useCallback(async (selectedChanges: ChangeItem[]) => {
    try {
      const updatedData = applyChanges(flatData, selectedChanges);
      setFlatData(updatedData);
      setDirty(true);
      setIsSaved(false);

      const changedItemCodes = [...new Set(selectedChanges.map(c => c.itemCode).filter(Boolean))];

      const res = await saveMasterDataset({
        fmeaId: fmeaId || '',
        fmeaType: fmeaType || 'D',
        datasetId: masterDatasetId,
        name: masterDatasetName || 'MASTER',
        replace: true,
        replaceItemCodes: changedItemCodes.length > 0 ? changedItemCodes : undefined,
        flatData: updatedData,
      });

      if (res.ok) {
        if (res.datasetId) {
          setMasterDatasetId(res.datasetId);
        }
        setIsSaved(true);
        alert(`✅ ${selectedChanges.length}건의 변경사항이 적용되었습니다.`);
      } else {
        alert('저장 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('변경사항 적용 오류:', error);
      alert('변경사항 적용 중 오류가 발생했습니다.');
    }
  }, [flatData, setFlatData, setDirty, setIsSaved, masterDatasetId, masterDatasetName, setMasterDatasetId, fmeaId, fmeaType]);

  return {
    // 상태
    isCompareModalOpen,
    isCompareMode,
    dbData,
    confirmSelections,
    compareChanges,
    previousFlatData,
    compareFileInputRef,

    // 핸들러
    handleCompareFileSelect,
    handleStartCompareMode,
    handleCancelCompareMode,
    handleToggleConfirm,
    handleSelectAllConfirm,
    handleConfirmSave,
    handleApplyChanges,
    setIsCompareModalOpen,
  };
}

export default useDataCompare;
