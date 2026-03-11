/**
 * @file legacy/page.tsx
 * @description 기존데이터 Import 모드 — Excel Import → SA/FC/FA 3단계 확정
 * 모든 itemCode 유지 (A1-A6, B1-B5, C1-C4, FC)
 * @created 2026-02-26
 */

'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { ImportedFlatData, FailureChain } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';
import { parseMultiSheetExcel, ParseResult } from '../excel-parser';
import { downloadEmptyTemplate, downloadSampleTemplate, downloadDataTemplate } from '../excel-template';
import {
  useImportFileHandlers,
  usePreviewHandlers,
  useAutoSave,
  useDataCompare,
  type BackupInfo
} from '../hooks';
import { useMasterDataHandlers, buildBdStatusList } from '../hooks/useMasterDataHandlers';
import { handleDownloadPreview as utilDownloadPreview } from '../utils';
import { loadDatasetByFmeaId, loadAllDatasetSummaries, saveMasterDataset } from '../utils/master-api';
import { useAuth } from '@/hooks/useAuth';
import {
  BackupModal,
  DataCompareModal,
  TemplateConfigModal,
  TemplateGeneratorPanel,
  FMEAProject,
} from '../components';
import { BdStatusTable } from '../components/BdStatusTable';
import { useTemplateGenerator } from '../hooks/useTemplateGenerator';
import FailureChainPopup from '../FailureChainPopup';

export default function LegacyImportPage() {
  const { isAdmin } = useAuth();

  // ── 상태 관리 ──
  const [fmeaList, setFmeaList] = useState<FMEAProject[]>([]);
  const [adminMode, setAdminMode] = useState(false);
  const [selectedFmeaId, setSelectedFmeaId] = useState<string>('');
  const [masterDatasetId, setMasterDatasetId] = useState<string | null>(null);
  const [masterDatasetName, setMasterDatasetName] = useState<string>('MASTER');

  const [fileName, setFileName] = useState<string>('');
  const [flatData, setFlatData] = useState<ImportedFlatData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [pendingData, setPendingData] = useState<ImportedFlatData[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const [previewColumn, setPreviewColumn] = useState('A2');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [imSaveConfirm, setImSaveConfirm] = useState<{ warnings: { processNo: string; value: string }[] } | null>(null);

  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupList, setBackupList] = useState<BackupInfo[]>([]);

  const [isFailureChainPopupOpen, setIsFailureChainPopupOpen] = useState(false);
  const [failureChainProcessNo, setFailureChainProcessNo] = useState('');
  const [failureChains, setFailureChains] = useState<FailureChain[]>([]);
  const [masterChains, setMasterChains] = useState<MasterFailureChain[]>([]);

  const handleWorksheetSaved = useCallback(() => {
    if (selectedFmeaId) {
      window.location.href = `/pfmea/worksheet?id=${selectedFmeaId}&tab=structure`;
    }
  }, [selectedFmeaId]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── 훅 연결 ──
  const {
    bdStatusList, setBdStatusList,
    masterItemCount, setMasterItemCount, masterDataCount, setMasterDataCount,
    skipReloadRef, fmeaChangeRef,
  } = useMasterDataHandlers({
    fmeaList, selectedFmeaId, setSelectedFmeaId,
    flatData, setFlatData, masterDatasetId, setMasterDatasetId,
    setIsSaved, setDirty, setFileName, isLoaded,
  });

  const { getBackupList, restoreBackup, deleteBackup } = useAutoSave({ flatData, isLoaded });

  const previewData = useMemo(() => flatData.filter(d => d.itemCode === previewColumn), [flatData, previewColumn]);

  const { handleAllDelete, handleDeleteSelected, handleRowSelect } = usePreviewHandlers({
    flatData, setFlatData, previewColumn, selectedRows, setSelectedRows,
    draggedIndex, setDraggedIndex, setIsSaved, setIsSaving, setDirty,
  });

  const selectedFmea = fmeaList.find(f => f.id === selectedFmeaId);

  const dataCompare = useDataCompare({
    flatData, setFlatData, previewColumn, masterDatasetId, masterDatasetName,
    setMasterDatasetId, setIsSaved, setDirty,
    fmeaId: selectedFmeaId || undefined,
    fmeaType: selectedFmea?.fmeaType || 'P',
  });

  const templateGen = useTemplateGenerator({
    setFlatData, setPreviewColumn, setDirty, setIsSaved,
  });

  // ── IM 원자재 블랙리스트 ──
  const IM_RAW_MATERIAL_KEYWORDS = [
    '도료', '도장', '페인트', '프라이머', '클리어코트', '코팅제',
  ];

  // ── 파일 핸들러 ──
  const { handleFileSelect, handleImport: _handleImportRaw } = useImportFileHandlers({
    setFileName, setIsParsing, setImportSuccess, setParseResult, setPendingData,
    setFlatData, setIsImporting, setMasterDatasetId, setMasterChains, setIsSaved, setDirty,
    setValidationMessage,
    flatData, pendingData, masterChains, parseMultiSheetExcel,
    masterDatasetId,
    fmeaId: selectedFmeaId || undefined,
    fmeaType: selectedFmea?.fmeaType || 'P',
  });

  const checkImRawMaterial = (data: typeof flatData) => {
    return data
      .filter(d => d.m4 === 'IM' && d.value?.trim())
      .filter(d => IM_RAW_MATERIAL_KEYWORDS.some(kw => d.value.toLowerCase().includes(kw)));
  };

  const handleImport = async () => {
    const imWarnings = checkImRawMaterial(pendingData);
    if (imWarnings.length > 0) {
      const items = imWarnings.slice(0, 5).map(d => `  - [${d.processNo}] "${d.value}"`).join('\n');
      const ok = confirm(`⚠️ 원자재 ${imWarnings.length}건 (IM 해당 아님)\n\n${items}\n\n그래도 Import하시겠습니까?`);
      if (!ok) return;
    }
    await _handleImportRaw();
  };

  // ★ l1Name 우선순위: partName(품명) → subject에서 FMEA접미사 제거 → productName
  // useFmeaSelection.ts와 동일한 우선순위 유지
  const rawL1 = selectedFmea?.fmeaInfo?.partName
    || selectedFmea?.fmeaInfo?.subject
    || selectedFmea?.project?.productName
    || '';
  const l1Name = rawL1.replace(/\+?(PFMEA|DFMEA|FMEA|생산공정)\s*$/i, '').trim();

  // ── 미리보기 다운로드/수정 ──
  const handleDownloadPreview = () => utilDownloadPreview(previewColumn, flatData);
  const handleDownloadAll = () => utilDownloadPreview('ALL', flatData);

  const getBK = (d: ImportedFlatData) => {
    if (['B1', 'B2', 'B3', 'B4', 'B5'].includes(d.itemCode) && d.m4) return `${d.processNo}|${d.itemCode}|${d.m4}|${d.value}`;
    return `${d.processNo}|${d.itemCode}|${d.value}`;
  };

  const handleEditCell = (bk: string, value: string) => {
    setFlatData(prev => {
      let found = false;
      return prev.map(item => {
        if (!found && getBK(item) === bk) { found = true; return { ...item, value }; }
        return item;
      });
    });
    setDirty(true);
    setIsSaved(false);
  };

  const handleEditM4 = (bk: string, m4: string) => {
    if (m4 === 'IM') {
      const item = flatData.find(d => getBK(d) === bk);
      if (item?.value) {
        const val = item.value.toLowerCase();
        const matched = IM_RAW_MATERIAL_KEYWORDS.find(kw => val.includes(kw));
        if (matched) {
          const ok = confirm(`⚠️ "${item.value}" - 원자재 (IM 해당 아님)\n\n그래도 IM으로 분류하시겠습니까?`);
          if (!ok) return;
        }
      }
    }
    setFlatData(prev => {
      let found = false;
      return prev.map(item => {
        if (!found && getBK(item) === bk) { found = true; return { ...item, m4 }; }
        return item;
      });
    });
    setDirty(true);
    setIsSaved(false);
  };

  const handleSelectAllRows = (checked: boolean) => {
    if (checked) {
      const pd = flatData.filter(d => d.itemCode === previewColumn);
      setSelectedRows(new Set(pd.map(d => getBK(d))));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleReorder = (from: number, to: number) => {
    const filtered = flatData.filter(d => d.itemCode === previewColumn);
    const others = flatData.filter(d => d.itemCode !== previewColumn);
    const [moved] = filtered.splice(from, 1);
    filtered.splice(to, 0, moved);
    setFlatData([...others, ...filtered]);
    setDirty(true);
  };

  // ── 저장 ──
  const handleSave = async () => {
    const imWarnings = checkImRawMaterial(flatData);
    if (imWarnings.length > 0) {
      setImSaveConfirm({ warnings: imWarnings.map(d => ({ processNo: d.processNo, value: String(d.value || '') })) });
      return;
    }
    doSave();
  };

  const doSave = async () => {
    setIsSaving(true);
    try {
      const res = await saveMasterDataset({
        fmeaId: selectedFmeaId,
        fmeaType: selectedFmea?.fmeaType || 'P',
        datasetId: masterDatasetId, name: masterDatasetName || 'MASTER',
        replace: true, flatData,
        failureChains: masterChains && masterChains.length > 0 ? masterChains : undefined,
      });
      if (res.ok) {
        if (res.datasetId) setMasterDatasetId(res.datasetId);
        setIsSaved(true);
        setDirty(false);
        setBdStatusList(prev => prev.map(item =>
          item.fmeaId === selectedFmeaId ? {
            ...item,
            itemCount: new Set(flatData.map(d => d.itemCode)).size,
            dataCount: flatData.filter(d => d.value && d.value.trim() !== '').length,
          } : item
        ));
      } else {
        alert('저장에 실패했습니다. 서버 오류를 확인하세요.');
      }
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── 고장사슬 팝업 ──
  const getProcessName = (processNo: string) => {
    const item = flatData.find(d => d.processNo === processNo && d.itemCode === 'A2');
    return item?.value || processNo;
  };

  // ── 초기 데이터 로드 ──
  useEffect(() => {
    const loadData = async () => {
      let loadedProjects: FMEAProject[] = [];
      try {
        const res = await fetch('/api/fmea/projects?type=P');
        if (res.ok) {
          const data = await res.json();
          loadedProjects = (data.projects || []).map((p: Record<string, unknown>) => ({
            id: p.id,
            fmeaNo: p.fmeaNo || p.id,
            fmeaType: p.fmeaType,
            fmeaInfo: p.fmeaInfo,
            project: p.project,
            parentFmeaId: p.parentFmeaId || null,
            parentFmeaType: p.parentFmeaType || null,
            revisionNo: p.revisionNo,
          })) as FMEAProject[];
          setFmeaList(loadedProjects);
          if (!selectedFmeaId && loadedProjects.length > 0) {
            setSelectedFmeaId(loadedProjects[0].id);
          }
        }
      } catch (e) { console.error('FMEA 목록 로드 오류:', e); }

      // Rule 13: 샘플데이터 제거 — 초기값 0
      setMasterItemCount(0);
      setMasterDataCount(0);

      try {
        const { summaries, deletedFmeaIds } = await loadAllDatasetSummaries();
        const activeProjects = loadedProjects.filter((p: FMEAProject) => !deletedFmeaIds.includes(p.id.toLowerCase()));
        setBdStatusList(buildBdStatusList(activeProjects, summaries));
      } catch (e) { console.error('BD 현황 로드 오류:', e); }

      try {
        const currentFmeaId = selectedFmeaId || (loadedProjects.length > 0 ? loadedProjects[0].id : '');
        if (currentFmeaId) {
          const loaded = await loadDatasetByFmeaId(currentFmeaId);
          if (loaded.datasetId) setMasterDatasetId(loaded.datasetId);
          if (loaded.datasetName) setMasterDatasetName(loaded.datasetName);
          if (loaded.flatData.length > 0) {
            setFlatData(loaded.flatData);
            setIsSaved(true);
          }
          if (loaded.failureChains && Array.isArray(loaded.failureChains) && loaded.failureChains.length > 0) {
            setMasterChains(loaded.failureChains as MasterFailureChain[]);
          }
        }
      } catch (e) { console.error('기존 데이터 로드 오류:', e); }

      setIsLoaded(true);
    };
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── BD 현황 관리 (삭제/복구/관리자) ──
  const handleDeleteDatasets = useCallback(async (fmeaIds: string[]) => {
    const { softDeleteDatasets, loadAllDatasetSummariesAdmin } = await import('../utils/master-api');
    const result = await softDeleteDatasets(fmeaIds);
    if (result.ok) {
      try {
        const resp = adminMode ? await loadAllDatasetSummariesAdmin() : await loadAllDatasetSummaries();
        const sums = Array.isArray(resp) ? resp : resp.summaries;
        const delIds: string[] = Array.isArray(resp) ? [] : (resp.deletedFmeaIds || []);
        const activeList = adminMode ? fmeaList : fmeaList.filter(p => !delIds.includes(p.id.toLowerCase()));
        setBdStatusList(buildBdStatusList(activeList, sums));
      } catch (e) { console.error('BD 현황 리로드 오류:', e); }
    }
  }, [fmeaList, adminMode, setBdStatusList]);

  const handleRestoreDatasets = useCallback(async (fmeaIds: string[]) => {
    const { restoreDatasets, loadAllDatasetSummariesAdmin } = await import('../utils/master-api');
    const result = await restoreDatasets(fmeaIds);
    if (result.ok) {
      try {
        const summaries = await loadAllDatasetSummariesAdmin();
        setBdStatusList(buildBdStatusList(fmeaList, summaries));
      } catch (e) { console.error('BD 현황 리로드 오류:', e); }
    }
  }, [fmeaList, setBdStatusList]);

  const handleToggleAdminMode = useCallback(async () => {
    const { loadAllDatasetSummariesAdmin } = await import('../utils/master-api');
    const newMode = !adminMode;
    setAdminMode(newMode);
    try {
      const resp = newMode ? await loadAllDatasetSummariesAdmin() : await loadAllDatasetSummaries();
      const sums = Array.isArray(resp) ? resp : resp.summaries;
      const delIds: string[] = Array.isArray(resp) ? [] : (resp.deletedFmeaIds || []);
      const activeList = newMode ? fmeaList : fmeaList.filter(p => !delIds.includes(p.id.toLowerCase()));
      setBdStatusList(buildBdStatusList(activeList, sums));
    } catch (e) { console.error('BD 현황 리로드 오류:', e); }
  }, [adminMode, fmeaList, setBdStatusList]);

  const handlePermanentDeleteDatasets = useCallback(async (fmeaIds: string[]) => {
    const { permanentDeleteDatasets, loadAllDatasetSummariesAdmin } = await import('../utils/master-api');
    const result = await permanentDeleteDatasets(fmeaIds);
    if (result.ok) {
      try {
        const summaries = await loadAllDatasetSummariesAdmin();
        setBdStatusList(buildBdStatusList(fmeaList, summaries));
      } catch (e) { console.error('BD 현황 리로드 오류:', e); }
    }
  }, [fmeaList, setBdStatusList]);

  // ── 렌더링 ──
  return (
    <>
      {/* 템플릿 생성기 패널 — SA/FC/FA 3단계 확정 */}
      <TemplateGeneratorPanel
        onGenerate={templateGen.handleGenerate}
        templateMode={templateGen.templateMode}
        setTemplateMode={templateGen.setTemplateMode}
        manualConfig={templateGen.manualConfig}
        updateManualConfig={templateGen.updateManualConfig}
        workElements={templateGen.workElements}
        multipliers={templateGen.multipliers}
        updateMultiplier={templateGen.updateMultiplier}
        addWorkElement={templateGen.addWorkElement}
        removeWorkElement={templateGen.removeWorkElement}
        updateWorkElement={templateGen.updateWorkElement}
        flatData={flatData}
        onDownloadSample={() => {
          if (flatData.length > 0) downloadDataTemplate(flatData, undefined, masterChains);
          else downloadSampleTemplate(undefined, templateGen.templateMode === 'manual');
        }}
        onDownloadEmpty={downloadEmptyTemplate}
        onImportFile={() => fileInputRef.current?.click()}
        onUpdateItem={(id, value) => {
          setFlatData(prev => prev.map(item => item.id === id ? { ...item, value } : item));
          setDirty(true); setIsSaved(false);
        }}
        onUpdateM4={(id, m4) => {
          setFlatData(prev => prev.map(item => item.id === id ? { ...item, m4 } : item));
          setDirty(true); setIsSaved(false);
        }}
        onDeleteItems={(ids) => {
          const idSet = new Set(ids);
          setFlatData(prev => prev.filter(item => !idSet.has(item.id)));
          setDirty(true); setIsSaved(false);
        }}
        onAddItems={(items) => {
          const newItems = items.map((item, i) => ({
            ...item,
            id: `add-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
          }));
          setFlatData(prev => [...prev, ...newItems]);
          setDirty(true); setIsSaved(false);
        }}
        onSave={handleSave}
        isSaved={isSaved}
        isSaving={isSaving}
        dirty={dirty}
        selectedFmeaId={selectedFmeaId}
        l1Name={l1Name}
        fmeaInfo={selectedFmea ? {
          subject: selectedFmea.fmeaInfo?.subject || '',
          companyName: selectedFmea.fmeaInfo?.companyName || '',
          customerName: selectedFmea.fmeaInfo?.customerName || '',
          modelYear: selectedFmea.fmeaInfo?.modelYear || '',
          fmeaType: selectedFmea.fmeaType || 'P',
        } : undefined}
        onWorksheetSaved={handleWorksheetSaved}
        bdFmeaId={selectedFmeaId || undefined}
        bdFmeaName={selectedFmea?.fmeaInfo?.subject || selectedFmea?.fmeaNo || undefined}
        bdStatusList={bdStatusList}
        fmeaList={fmeaList}
        failureChains={masterChains}
        parseStatistics={parseResult?.statistics}
      />

      {/* BD 현황 테이블 */}
      <BdStatusTable
        bdStatusList={bdStatusList || []}
        selectedFmeaId={selectedFmeaId}
        setSelectedFmeaId={setSelectedFmeaId}
        onDeleteDatasets={handleDeleteDatasets}
        adminMode={adminMode}
        isAdmin={isAdmin}
        onToggleAdminMode={handleToggleAdminMode}
        onRestoreDatasets={handleRestoreDatasets}
        onPermanentDeleteDatasets={handlePermanentDeleteDatasets}
      />

      {/* 모달 */}
      <BackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        backupList={backupList}
        onRestore={(backup) => {
          const data = restoreBackup(backup.key);
          if (data) { setFlatData(data); setIsSaved(false); }
          setShowBackupModal(false);
        }}
        onDelete={(ts) => { deleteBackup(ts); setBackupList(getBackupList()); }}
      />

      <DataCompareModal
        isOpen={dataCompare.isCompareModalOpen}
        onClose={() => dataCompare.setIsCompareModalOpen(false)}
        changes={dataCompare.compareChanges}
        onApply={dataCompare.handleApplyChanges}
      />

      <TemplateConfigModal
        isOpen={templateGen.showConfigModal}
        onClose={templateGen.closeConfigModal}
        onGenerate={templateGen.handleGenerate}
        manualConfig={templateGen.manualConfig}
        updateManualConfig={templateGen.updateManualConfig}
      />

      <FailureChainPopup
        isOpen={isFailureChainPopupOpen}
        onClose={() => setIsFailureChainPopupOpen(false)}
        processNo={failureChainProcessNo}
        processName={getProcessName(failureChainProcessNo)}
        flatData={flatData}
        existingChains={failureChains}
        onSaveChain={(chain: FailureChain) => {
          setFailureChains(prev => [...prev.filter(c => c.id !== chain.id), chain]);
          setIsFailureChainPopupOpen(false);
        }}
        onDeleteChain={(chainId: string) => {
          setFailureChains(prev => prev.filter(c => c.id !== chainId));
        }}
      />

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onClick={(e) => { (e.target as HTMLInputElement).value = ''; }} onChange={handleFileSelect} />
      <input ref={dataCompare.compareFileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={dataCompare.handleCompareFileSelect} />

      {/* IM 원자재 저장 확인 모달 */}
      {imSaveConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-2xl w-[460px] flex flex-col">
            <div className="bg-amber-500 text-white px-4 py-2.5 rounded-t-lg font-bold text-sm">
              IM 원자재 경고 ({imSaveConfirm.warnings.length}건)
            </div>
            <div className="p-4">
              <table className="w-full text-xs border-collapse mb-3">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-1.5 w-8 text-center">NO</th>
                    <th className="border border-gray-300 px-2 py-1.5 w-12 text-center">공정</th>
                    <th className="border border-gray-300 px-2 py-1.5">값</th>
                    <th className="border border-gray-300 px-2 py-1.5 w-14 text-center">사유</th>
                  </tr>
                </thead>
                <tbody>
                  {imSaveConfirm.warnings.slice(0, 10).map((w, i) => (
                    <tr key={i} className="bg-red-50">
                      <td className="border border-gray-300 px-2 py-1 text-center">{i + 1}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center">{w.processNo}</td>
                      <td className="border border-gray-300 px-2 py-1 font-medium">{w.value}</td>
                      <td className="border border-gray-300 px-2 py-1 text-red-600 font-bold text-center">원자재</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-600">도료/도장/페인트는 제품의 일부(원자재)이므로 IM(부자재)이 아닙니다.<br/>그래도 저장하시겠습니까?</p>
            </div>
            <div className="px-4 py-2.5 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setImSaveConfirm(null)} className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded text-xs font-bold hover:bg-gray-300 cursor-pointer">취소</button>
              <button onClick={() => { setImSaveConfirm(null); doSave(); }} className="px-4 py-1.5 bg-amber-500 text-white rounded text-xs font-bold hover:bg-amber-600 cursor-pointer">저장</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
