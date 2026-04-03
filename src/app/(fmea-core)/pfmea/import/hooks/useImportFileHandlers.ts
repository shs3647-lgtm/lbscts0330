/**
 * @file useImportFileHandlers.ts
 * @description 파일 선택 및 Import 핸들러 — position-parser 전용 (2026-03-27)
 */

import { useRef } from 'react';
import { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';
import { dedupeFailureChainsWeakL3 } from '../utils/dedupeFailureChainsWeakL3';
import {
  dedupeFailureChainsByFkTriplet,
  enrichPositionChainsFromAtomicData,
} from '../utils/enrichPositionFailureChains';
import { loadDatasetByFmeaId, saveMasterDataset } from '../utils/master-api';
import { validateExcelFileWithAlert } from '@/lib/excel-validation';
import {
  countFlatRowsByItemCode,
  countCompositeKeysByItemCode,
  countTripleFkFailureLinks,
  formatPgsqlCodeMismatchLines,
  mergeImportExpectedCounts,
  mapCountsToPgsql,
} from '../utils/import-verification-columns';
import { parseStatisticsFromPositionAtomic } from '../utils/position-parse-statistics';
import type { ParseResult } from '../excel-parser';
import type { PositionImportPgSnapshot, SavePositionImportMeta } from '@/types/position-import';

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
  /** 위치기반 파싱 직후 엑셀 셀 카운트(stats) — 통계표「파싱」열 */
  setPositionParserStats?: (stats: Record<string, number> | null) => void;
  /** save-position-import 성공 직후 PG 실측(★11) */
  onPositionImportSnapshot?: (snapshot: PositionImportPgSnapshot | null) => void;
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
  setPositionParserStats,
  onPositionImportSnapshot,
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
    setPositionParserStats?.(null);
    onPositionImportSnapshot?.(null);

    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const buf = await file.arrayBuffer();
      await wb.xlsx.load(buf);
      const sheetNames = wb.worksheets.map((ws: { name: string }) => ws.name);

      const { isPositionBasedFormat, parsePositionBasedWorkbook, atomicToFlatData, detectFmeaTypeFromWorkbook } = await import('@/lib/fmea/position-parser');
      if (!isPositionBasedFormat(sheetNames)) {
        alert('❌ 지원하지 않는 엑셀 형식입니다.\n\n위치기반 5시트 포맷만 지원합니다:\n- L1 통합(C1-C4)\n- L2 통합(A1-A6)\n- L3 통합(B1-B5)\n- FC 고장사슬');
        setIsParsing(false);
        return;
      }

      // ★★★ 2026-04-03: PFMEA/DFMEA 교차 Import 차단 ★★★
      const detectedType = detectFmeaTypeFromWorkbook(wb);
      const expectedType = fmeaType?.toUpperCase() === 'D' ? 'D' : 'P';
      if (detectedType && detectedType !== expectedType) {
        const detectedLabel = detectedType === 'D' ? 'DFMEA' : 'PFMEA';
        const expectedLabel = expectedType === 'D' ? 'DFMEA' : 'PFMEA';
        alert(
          `❌ FMEA 유형 불일치!\n\n` +
          `현재 프로젝트: ${expectedLabel}\n` +
          `업로드된 파일: ${detectedLabel} 형식\n\n` +
          `${detectedLabel} 파일은 ${expectedLabel} 프로젝트에 Import할 수 없습니다.\n` +
          `올바른 ${expectedLabel} 템플릿을 사용해주세요.`
        );
        setIsParsing(false);
        return;
      }

      console.log(`[Import] 위치기반 5시트 포맷 감지: ${sheetNames.join(', ')} (type: ${detectedType || 'auto'})`);
      const atomicData = parsePositionBasedWorkbook(wb, fmeaId?.toLowerCase());
      console.log('[Import] position-parser stats:', JSON.stringify(atomicData.stats));
      setPositionParserStats?.(atomicData.stats as Record<string, number>);
      setParseResult({
        success: true,
        errors: [],
        processes: [],
        products: [],
        statistics: parseStatisticsFromPositionAtomic(atomicData),
      } satisfies ParseResult);

      const flatFromAtomic = atomicToFlatData(atomicData) as ImportedFlatData[];
      setPendingData(flatFromAtomic);
      setFlatData(flatFromAtomic);

      const mapped = atomicData.failureLinks.map((fl) => ({
        id: fl.id,
        processNo: fl.fmProcess || '',
        fmValue: fl.fmText || '',
        fcValue: fl.fcText || '',
        feValue: fl.feText || '',
        feScope: fl.feScope || '',
        m4: fl.fcM4?.trim() || undefined,
        workElement: fl.fcWorkElem?.trim() || undefined,
        fmId: fl.fmId,
        fcId: fl.fcId,
        feId: fl.feId,
      })) as MasterFailureChain[];

      let chains = enrichPositionChainsFromAtomicData(mapped, atomicData);
      chains = dedupeFailureChainsByFkTriplet(chains);
      chains = dedupeFailureChainsWeakL3(chains);
      setMasterChains?.(chains);

      if (!fmeaId?.trim()) {
        setImportSuccess(false);
        setIsSaved?.(false);
        setValidationMessage?.(
          '⚠️ FMEA 프로젝트가 선택되지 않아 DB(Atomic)에 저장하지 않았습니다.\n' +
            '상단에서 프로젝트를 선택한 뒤 같은 파일을 다시 선택하세요.\n' +
            '(목록 로딩 직후라면 잠시 후 다시 시도하세요.)',
        );
      } else {
        try {
          const saveRes = await fetch('/api/fmea/save-position-import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fmeaId: fmeaId.toLowerCase(), atomicData, force: true }),
          });
          const rawText = await saveRes.text();
          let saveResult: {
            success?: boolean;
            error?: string;
            atomicCounts?: PositionImportPgSnapshot['atomicCounts'];
            saveImportMeta?: SavePositionImportMeta;
          } = {};
          try {
            saveResult = rawText ? (JSON.parse(rawText) as typeof saveResult) : {};
          } catch {
            console.error('[Import] save-position-import non-JSON:', saveRes.status, rawText.slice(0, 400));
            setValidationMessage?.(
              `저장 API 응답을 해석할 수 없습니다 (HTTP ${saveRes.status}). 개발자 도구 Network 탭에서 /api/fmea/save-position-import 응답을 확인하세요.`,
            );
            return;
          }
          if (saveResult.success) {
            console.log('[Import] save-position-import 성공:', saveResult.atomicCounts);
            setImportSuccess(true);
            setIsSaved?.(true);
            setDirty?.(false);

            /** Atomic 저장 후 마스터 평면 DB 동기화 + 서버 기준 flat 재로드 (미리보기·BD와 SSoT 정합) */
            let masterSyncNote = '';
            try {
              const masterRes = await saveMasterDataset({
                fmeaId: fmeaId.toLowerCase(),
                fmeaType: fmeaType || 'P',
                datasetId: masterDatasetId ?? undefined,
                name: 'MASTER',
                replace: true,
                mode: 'import',
                flatData: flatFromAtomic,
                failureChains: chains.length > 0 ? chains : undefined,
              });
              if (masterRes.ok) {
                if (masterRes.datasetId && setMasterDatasetId) {
                  setMasterDatasetId(masterRes.datasetId);
                }
                try {
                  const loaded = await loadDatasetByFmeaId(fmeaId.toLowerCase());
                  const fc = loaded.failureChains;
                  // ★★★ MBD-26-009: 마스터 DB flatData가 파서 원본보다 현저히 적으면 교체하지 않음
                  // 마스터 DB의 keepRowForPfmeaMasterSave 필터 또는 서버 저장 로직에 의해
                  // flatItems가 크게 줄어들 수 있음 → 파서 원본 flatData 유지
                  const dbFlat = loaded.flatData;
                  const parserItemCodes = new Set(flatFromAtomic.map(d => d.itemCode));
                  const dbItemCodes = new Set(dbFlat.map(d => d.itemCode));
                  const missingCodes = [...parserItemCodes].filter(c => !dbItemCodes.has(c));
                  
                  if (dbFlat.length > 0 && missingCodes.length === 0) {
                    // DB 로드 정상: 모든 itemCode 포함
                    setFlatData(dbFlat);
                    setPendingData(dbFlat);
                  } else if (dbFlat.length > 0 && dbFlat.length >= flatFromAtomic.length * 0.8) {
                    // DB 로드 약간 부족하지만 80% 이상: 사용
                    setFlatData(dbFlat);
                    setPendingData(dbFlat);
                  } else {
                    // DB 로드 불완전: 파서 원본 유지
                    console.warn(
                      `[Import] 마스터 DB flatData 불완전 (${dbFlat.length}/${flatFromAtomic.length}건, 누락코드: ${missingCodes.join(',')}). 파서 원본 유지.`,
                    );
                  }
                  if (setMasterChains) {
                    setMasterChains(Array.isArray(fc) ? (fc as MasterFailureChain[]) : []);
                  }
                } catch (reloadErr) {
                  console.error('[Import] loadDatasetByFmeaId after position+master:', reloadErr);
                  masterSyncNote = '\n⚠️ DB에서 평면 재로드 실패 — 메모리 미리보기 유지 (새로고침 또는 프로젝트 재선택 시 재시도)';
                }
              } else {
                masterSyncNote =
                  '\n⚠️ 마스터 평면 DB 동기화 실패 — Atomic은 저장됨. [저장] 또는 프로젝트 재선택으로 평면을 맞추세요.';
              }
            } catch (masterErr) {
              console.error('[Import] saveMasterDataset after position:', masterErr);
              masterSyncNote = `\n⚠️ 마스터 평면 동기화 오류: ${(masterErr as Error).message}`;
            }

            const s = atomicData.stats;
            let postSaveVerify = '';
            try {
              const vRes = await fetch(
                `/api/fmea/verify-counts?fmeaId=${encodeURIComponent(fmeaId.toLowerCase())}&t=${Date.now()}`,
              );
              const vJson = (await vRes.json()) as {
                success?: boolean;
                counts?: Record<string, number>;
                error?: string;
              };
              if (vJson.success && vJson.counts) {
                const uuidCounts = countFlatRowsByItemCode(flatFromAtomic);
                const composite = countCompositeKeysByItemCode(flatFromAtomic);
                const expected = mergeImportExpectedCounts(uuidCounts, undefined, composite);
                const pgsql = mapCountsToPgsql(vJson.counts, expected);
                const misLines = formatPgsqlCodeMismatchLines(pgsql);
                postSaveVerify =
                  misLines.length > 0
                    ? `\n⚠️ 저장 직후 PG vs flat(A1–C4) 불일치:\n${misLines.join('\n')}`
                    : `\n✅ 저장 직후 PG vs flat(A1–C4) 코드별 건수 일치`;
              } else {
                postSaveVerify = `\n(직후 verify-counts: ${vJson.error || `HTTP ${vRes.status}`})`;
              }
            } catch (ve) {
              console.error('[Import] verify-counts after save:', ve);
              postSaveVerify = '\n(직후 verify-counts 호출 오류 — 통계표에서 수동 확인)';
            }

            const tripleFl = countTripleFkFailureLinks(atomicData.failureLinks || []);
            const dbFl = saveResult.atomicCounts?.failureLinks ?? 0;
            const flLine =
              tripleFl !== dbFl
                ? `\n⚠️ 고장사슬(FL): 파싱 삼중FK ${tripleFl}건 vs PG ${dbFl}건`
                : tripleFl > 0
                  ? `\n✅ FL 삼중FK ${tripleFl}건 = PG ${dbFl}건`
                  : '';
            const meta = saveResult.saveImportMeta;
            const metaLine =
              meta && (meta.failureLinksSkippedIncomplete > 0 || meta.riskAnalysesSkippedNoValidFl > 0)
                ? `\n📌 저장 메타: FL 페이로드 ${meta.failureLinksPayload}건 중 불완전삼중 스킵 ${meta.failureLinksSkippedIncomplete}건` +
                  (meta.failureLinksSkippedSampleIds.length > 0
                    ? ` (샘플 id: ${meta.failureLinksSkippedSampleIds.slice(0, 3).join(', ')}${meta.failureLinksSkippedSampleIds.length > 3 ? '…' : ''})`
                    : '') +
                  ` | RA 페이로드 ${meta.riskAnalysesPayload}건, 유효 FL 없어 스킵 ${meta.riskAnalysesSkippedNoValidFl}건`
                : meta
                  ? `\n📌 저장 메타: FL 삽입시도(삼중완전) ${meta.failureLinksValidTripleForInsert}/${meta.failureLinksPayload}, RA ${meta.riskAnalysesValidForInsert}/${meta.riskAnalysesPayload}`
                  : '';

            onPositionImportSnapshot?.({
              atomicCounts: saveResult.atomicCounts ?? {},
              saveImportMeta: saveResult.saveImportMeta,
            });

            setValidationMessage?.(
              `✅ 위치기반 Import 완료 (Atomic + 마스터 평면 자동 저장)\n` +
                `📊 엑셀: L1=${s.excelL1Rows}행, L2=${s.excelL2Rows}행, L3=${s.excelL3Rows}행, FC=${s.excelFCRows}행\n` +
                `📊 파싱: L2=${saveResult.atomicCounts?.l2Structures || 0}, FM=${saveResult.atomicCounts?.failureModes || 0}, ` +
                `FC=${saveResult.atomicCounts?.failureCauses || 0}, FL=${saveResult.atomicCounts?.failureLinks || 0}\n` +
                `📊 flatData: DB 재로드 기준 표시` +
                postSaveVerify +
                flLine +
                metaLine +
                masterSyncNote,
            );
          } else {
            console.error('[Import] save-position-import 실패:', saveResult);
            setValidationMessage?.(
              `Import DB 저장 실패: ${saveResult.error || saveRes.statusText || 'unknown'} (HTTP ${saveRes.status})`,
            );
            setImportSuccess(false);
            setIsSaved?.(false);
          }
        } catch (fetchErr) {
          console.error('[Import] save-position-import 요청 오류:', fetchErr);
          setValidationMessage?.(`저장 요청 실패: ${(fetchErr as Error).message}`);
          setImportSuccess(false);
          setIsSaved?.(false);
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
            try {
              const loaded = await loadDatasetByFmeaId(fmeaId || '');
              if (loaded.flatData.length > 0) {
                setFlatData(loaded.flatData);
                setPendingData([]);
                const fc = loaded.failureChains;
                if (fc && Array.isArray(fc) && fc.length > 0 && setMasterChains) {
                  setMasterChains(fc as MasterFailureChain[]);
                }
              }
            } catch (reloadErr) {
              console.error('[Import] loadDatasetByFmeaId after handleImport:', reloadErr);
            }
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
