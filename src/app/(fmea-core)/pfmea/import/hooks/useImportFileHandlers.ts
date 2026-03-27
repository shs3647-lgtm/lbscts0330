/**
 * @file useImportFileHandlers.ts
 * @description 파일 선택 및 Import 핸들러 — position-parser 전용 (2026-03-27)
 */

import { useRef } from 'react';
import { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';
import { saveMasterDataset } from '../utils/master-api';
import { validateExcelFileWithAlert } from '@/lib/excel-validation';

interface UseImportFileHandlersProps {
  setFileName: (name: string) => void;
  setIsParsing: (parsing: boolean) => void;
  setImportSuccess: (success: boolean) => void;
  setParseResult: (result: unknown) => void;
  setPendingData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  setFlatData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  setIsImporting: (importing: boolean) => void;
  setMasterDatasetId?: (id: string | null) => void;
  setMasterChains?: (chains: MasterFailureChain[]) => void;
  setIsSaved?: React.Dispatch<React.SetStateAction<boolean>>;
  setDirty?: React.Dispatch<React.SetStateAction<boolean>>;
  setValidationMessage?: (msg: string | null) => void;
  flatData: ImportedFlatData[];
  pendingData: ImportedFlatData[];
  masterChains?: MasterFailureChain[];
  parseMultiSheetExcel?: (file: File) => Promise<unknown>;
  saveToMaster?: boolean;
  masterDatasetId?: string | null;
  fmeaId?: string;
  fmeaType?: string;
}

export function useImportFileHandlers({
  setFileName,
  setIsParsing,
  setImportSuccess,
  setParseResult,
  setPendingData,
  setFlatData,
  setIsImporting,
  setMasterDatasetId,
  setMasterChains,
  setIsSaved,
  setDirty,
  setValidationMessage,
  flatData,
  pendingData,
  masterChains,
  saveToMaster = true,
  masterDatasetId,
  fmeaId,
  fmeaType,
}: UseImportFileHandlersProps) {

  const rawFingerprintRef = useRef<Record<string, unknown> | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateExcelFileWithAlert(file)) {
      e.target.value = '';
      return;
    }

    setFileName(file.name);
    setIsParsing(true);
    setImportSuccess(false);

    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const buf = await file.arrayBuffer();
      await wb.xlsx.load(buf);
      const sheetNames = wb.worksheets.map((ws: { name: string }) => ws.name);

      const { isPositionBasedFormat, parsePositionBasedWorkbook, atomicToFlatData } = await import('@/lib/fmea/position-parser');
      if (!isPositionBasedFormat(sheetNames)) {
        alert('❌ 지원하지 않는 엑셀 형식입니다.\n\n위치기반 5시트 포맷만 지원합니다:\n- L1 통합(C1-C4)\n- L2 통합(A1-A6)\n- L3 통합(B1-B5)\n- FC 고장사슬');
        setIsParsing(false);
        return;
      }

      console.log('[Import] 위치기반 5시트 포맷 감지:', sheetNames.join(', '));
      const atomicData = parsePositionBasedWorkbook(wb, fmeaId?.toLowerCase());
      console.log('[Import] position-parser stats:', JSON.stringify(atomicData.stats));

      const flatFromAtomic = atomicToFlatData(atomicData) as ImportedFlatData[];
      setPendingData(flatFromAtomic);
      setFlatData(flatFromAtomic);

      const chains = atomicData.failureLinks.map(fl => ({
        id: fl.id,
        processNo: fl.fmProcess || '',
        fmValue: fl.fmText || '',
        fcValue: fl.fcText || '',
        feValue: fl.feText || '',
        feScope: fl.feScope || '',
        fmId: fl.fmId,
        fcId: fl.fcId,
        feId: fl.feId,
      }));
      setMasterChains?.(chains as MasterFailureChain[]);

      if (fmeaId) {
        const saveRes = await fetch('/api/fmea/save-position-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fmeaId: fmeaId.toLowerCase(), atomicData, force: true }),
        });
        const saveResult = await saveRes.json();
        if (saveResult.success) {
          console.log('[Import] save-position-import 성공:', saveResult.atomicCounts);
          setImportSuccess(true);
          setIsSaved?.(true);
          setDirty?.(false);

          const s = atomicData.stats;
          setValidationMessage?.(
            `✅ 위치기반 Import 완료\n` +
            `📊 엑셀: L1=${s.excelL1Rows}행, L2=${s.excelL2Rows}행, L3=${s.excelL3Rows}행, FC=${s.excelFCRows}행\n` +
            `📊 파싱: L2=${saveResult.atomicCounts?.l2Structures || 0}, FM=${saveResult.atomicCounts?.failureModes || 0}, ` +
            `FC=${saveResult.atomicCounts?.failureCauses || 0}, FL=${saveResult.atomicCounts?.failureLinks || 0}\n` +
            `📊 flatData: ${flatFromAtomic.length}건 (미리보기용)`
          );
        } else {
          console.error('[Import] save-position-import 실패:', saveResult);
          setValidationMessage?.(`Import 실패: ${saveResult.error || ''}`);
        }
      }
    } catch (error) {
      console.error('❌ 파싱 오류:', error);
      alert('❌ Excel 파싱 중 오류가 발생했습니다.\n\n' + (error as Error).message);
    } finally {
      setIsParsing(false);
    }
  };

  const getBusinessKey = (d: ImportedFlatData): string => {
    if (['B1', 'B2', 'B5'].includes(d.itemCode) && d.m4) {
      return `${d.processNo}|${d.itemCode}|${d.m4}|${d.value}`;
    }
    if ((d.itemCode === 'B3' || d.itemCode === 'B4') && d.m4) {
      const er = d.excelRow != null && d.excelRow > 0 ? `|r${d.excelRow}` : '';
      const ord = d.orderIndex != null ? `|o${d.orderIndex}` : '';
      return `${d.processNo}|${d.itemCode}|${d.m4}|${d.belongsTo || ''}|${d.value}${er}${ord}`;
    }
    return `${d.processNo}|${d.itemCode}|${d.value}`;
  };

  const handleImport = async () => {
    if (pendingData.length === 0) {
      alert('Import할 데이터가 없습니다. 먼저 Excel 파일을 선택해주세요.');
      return;
    }

    setIsImporting(true);
    setImportSuccess(false);

    try {
      const existingByKey = new Map<string, ImportedFlatData>();
      flatData.forEach(d => existingByKey.set(getBusinessKey(d), d));

      const importData: ImportedFlatData[] = [];
      const seen = new Set<string>();

      pendingData.forEach(newItem => {
        const key = getBusinessKey(newItem);
        if (seen.has(key)) return;
        seen.add(key);

        const existing = existingByKey.get(key);
        if (existing) {
          importData.push({
            ...existing,
            m4: newItem.m4 || existing.m4,
            specialChar: newItem.specialChar || existing.specialChar || undefined,
            belongsTo: newItem.belongsTo || existing.belongsTo || undefined,
            parentItemId: newItem.parentItemId || existing.parentItemId || undefined,
            id: existing.id,
            createdAt: new Date(),
          });
        } else {
          importData.push({ ...newItem, createdAt: new Date() });
        }
      });

      setFlatData(importData);
      setPendingData([]);
      setIsSaved?.(false);
      setDirty?.(true);

      if (saveToMaster) {
        try {
          const res = await saveMasterDataset({
            fmeaId: fmeaId || '',
            fmeaType: fmeaType || 'P',
            datasetId: masterDatasetId || undefined,
            name: 'MASTER',
            replace: true,
            failureChains: masterChains && masterChains.length > 0 ? masterChains : undefined,
            relationData: rawFingerprintRef.current ? { rawFingerprint: rawFingerprintRef.current } : undefined,
            flatData: importData,
          });

          if (res.ok) {
            if (setMasterDatasetId && res.datasetId) {
              setMasterDatasetId(res.datasetId);
            }
            setIsSaved?.(true);
            setDirty?.(false);
          }
        } catch (dbError) {
          console.error('DB 저장 실패:', dbError);
        }
      }

      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
    } catch (error) {
      console.error('Import 오류:', error);
      alert('Import 중 오류가 발생했습니다.');
    } finally {
      setIsImporting(false);
    }
  };

  return {
    handleFileSelect,
    handleImport,
  };
}
