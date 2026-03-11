/**
 * @file page.tsx
 * @description CP 기초정보 Excel Import 페이지 (최적화 완료)
 * @updated 2026-01-24 - 훅 기반 리팩토링: 인라인 파싱 로직 제거
 * @updated 2026-01-24 - 워크시트 Import 추가 (병합된 CP 워크시트 지원)
 * @line-count ~500줄
 */

'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CPTopNav from '@/components/layout/CPTopNav';
import { FixedLayout } from '@/components/layout';
import { CPProject, ImportedData } from './types';
import { tw } from './constants';
import { useImportHandlers, useEditHandlers } from './hooks';
import { saveMasterDataset, loadActiveMasterDataset } from './utils/cp-master-api';
import { downloadCurrentData, downloadWorksheetEmptyTemplate, downloadWorksheetSampleTemplate } from './excel-template';
import { parseWorksheetExcel, WorksheetRow, MergeInfo } from './worksheet-excel-parser';
import ImportStatusBar from './components/ImportStatusBar';
import ImportMenuBar from './components/ImportMenuBar';
import CpPreviewPanel from './components/CpPreviewPanel';
import CpMasterPreviewTabs from './components/CpMasterPreviewTabs';
import CpCellInputModal from './components/CpCellInputModal';
import CpPfmeaLinkModal from './components/CpPfmeaLinkModal';

function CPImportPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idFromUrl = searchParams.get('id');

  // 상태 관리
  const [cpList, setCpList] = useState<CPProject[]>([]);
  const [selectedCpId, setSelectedCpId] = useState<string>(idFromUrl || '');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 마스터 데이터셋 상태
  const [masterDatasetId, setMasterDatasetId] = useState<string | null>(null);
  const [masterDatasetName, setMasterDatasetName] = useState<string>('MASTER');

  // 데이터 저장소 (PFMEA 스타일로 itemData만 주로 사용)
  const [fullData, setFullData] = useState<ImportedData[]>([]);
  const [groupData, setGroupData] = useState<ImportedData[]>([]);
  const [itemData, setItemData] = useState<ImportedData[]>([]);

  // 미리보기 필터 상태 (개별항목용)
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [columnFilter, setColumnFilter] = useState<string>('A2'); // 기본값: 공정명

  // ★ CP 확정 여부 (확정되면 우측 분석 DATA 패널에 데이터 표시)
  const [isCpConfirmed, setIsCpConfirmed] = useState(false);

  // ★ DB 통계 상태 (DB에서 조회한 정확한 통계)
  const [dbStats, setDbStats] = useState<{
    processInfo: number;
    detector: number;
    controlItem: number;
    controlMethod: number;
    reactionPlan: number;
    groupCount: number;
    totalCount: number;
  } | null>(null);

  // ★ 워크시트 Import 상태
  const worksheetFileInputRef = useRef<HTMLInputElement>(null);
  const [worksheetFileName, setWorksheetFileName] = useState('');
  const [worksheetPendingData, setWorksheetPendingData] = useState<{ rows: WorksheetRow[]; merges: MergeInfo[] }>({ rows: [], merges: [] });
  const [isWorksheetParsing, setIsWorksheetParsing] = useState(false);
  const [isWorksheetImporting, setIsWorksheetImporting] = useState(false);
  const [worksheetImportSuccess, setWorksheetImportSuccess] = useState(false);

  // ★ 셀 입력 모달 상태
  const [cellModalOpen, setCellModalOpen] = useState(false);
  const [cellModalData, setCellModalData] = useState<{ processNo: string; processName: string; columnKey: string; currentValue: string }>({
    processNo: '', processName: '', columnKey: '', currentValue: ''
  });

  // ★ PFMEA 연결 모달 상태
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalProcessNo, setLinkModalProcessNo] = useState('');
  const [linkModalProcessName, setLinkModalProcessName] = useState('');

  // ===== 편집 핸들러 훅 =====
  const {
    editingRowId,
    editValues,
    handleEditStart,
    handleEditSave,
    handleEditCancel,
    handleDelete,
    handleCellChange,
  } = useEditHandlers({
    fullData, groupData, itemData,
    setFullData, setGroupData, setItemData,
  });

  // ===== Import 핸들러 훅 (전체/그룹/개별 통합) =====
  const {
    // 전체 Import
    fullFileName, fullPendingData, isFullParsing, isFullImporting, fullImportSuccess,
    fullFileInputRef, handleFullFileSelect, handleFullImport,
    downloadFullTemplate, downloadFullSampleTemplate,
    // 그룹 시트 Import
    groupFileName, groupPendingData, isGroupParsing, isGroupImporting, groupImportSuccess,
    groupFileInputRef, handleGroupFileSelect, handleGroupImport,
    downloadGroupSheetTemplate, downloadGroupSheetSampleTemplate,
    // 개별 항목 Import
    itemFileName, itemPendingData, isItemParsing, isItemImporting, itemImportSuccess,
    itemFileInputRef, handleItemFileSelect, handleItemImport,
    downloadItemTemplate, downloadItemSampleTemplate,
  } = useImportHandlers({
    selectedCpId,
    selectedSheet: groupFilter || 'processInfo',
    selectedItem: columnFilter || 'A2',
    setFullData,
    setGroupData,
    setItemData,
    setActiveTab: () => { },  // 더 이상 사용하지 않음
  });

  // ===== 워크시트 Import 핸들러 =====
  const handleWorksheetFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setWorksheetFileName(file.name);
    setIsWorksheetParsing(true);
    setWorksheetImportSuccess(false);

    try {
      const result = await parseWorksheetExcel(file);
      if (result.success) {
        setWorksheetPendingData({ rows: result.rows, merges: result.merges });
      } else {
        alert(`파싱 실패: ${result.error}`);
        setWorksheetPendingData({ rows: [], merges: [] });
      }
    } catch (error: any) {
      console.error('❌ [Worksheet] 파싱 오류:', error);
      alert('Excel 파싱 중 오류가 발생했습니다.');
      setWorksheetPendingData({ rows: [], merges: [] });
    } finally {
      setIsWorksheetParsing(false);
    }
  }, []);

  const handleWorksheetImport = useCallback(async () => {
    if (!selectedCpId?.trim()) {
      alert('CP를 먼저 선택해주세요.');
      return;
    }
    if (worksheetPendingData.rows.length === 0) {
      alert('Import할 데이터가 없습니다. Excel 파일을 먼저 선택해주세요.');
      return;
    }

    setIsWorksheetImporting(true);

    try {
      const res = await fetch('/api/control-plan/import-worksheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpNo: selectedCpId,
          rows: worksheetPendingData.rows,
          merges: worksheetPendingData.merges,
        }),
      });

      const data = await res.json();

      if (data.success || data.ok) {
        setWorksheetImportSuccess(true);
        alert(`✅ ${worksheetPendingData.rows.length}행 Import 완료!\n\n워크시트 페이지로 이동합니다.`);
        router.push(`/control-plan/worksheet?cpNo=${selectedCpId}`);
      } else {
        alert(`Import 실패: ${data.error}`);
      }
    } catch (error: any) {
      console.error('❌ [Worksheet] Import 오류:', error);
      alert('Import 중 오류가 발생했습니다.');
    } finally {
      setIsWorksheetImporting(false);
    }
  }, [selectedCpId, worksheetPendingData, router]);

  // ===== CP 목록 로드 (localStorage + DB 병렬) =====
  useEffect(() => {
    // 1. localStorage에서 먼저 로드
    try {
      const stored = localStorage.getItem('cp-projects');
      if (stored) {
        const projects: CPProject[] = JSON.parse(stored);
        setCpList(projects);
      }
    } catch (e) { console.error('CP 목록 localStorage 로드 실패:', e); }

    // 2. DB API에서도 로드 (localStorage에 없을 수 있으므로)
    fetch('/api/control-plan')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.length > 0) {
          const dbProjects: CPProject[] = data.data.map((cp: { cpNo: string; subject?: string }) => ({
            id: cp.cpNo,
            cpInfo: { subject: cp.subject || '' },
          }));
          setCpList(prev => {
            const ids = new Set(prev.map(p => p.id));
            const merged = [...prev];
            for (const p of dbProjects) {
              if (!ids.has(p.id)) merged.push(p);
            }
            return merged;
          });
        }
      })
      .catch(e => console.error('CP 목록 DB 로드 실패:', e));

    if (idFromUrl) setSelectedCpId(idFromUrl);
  }, [idFromUrl]);

  // ===== DB에서 데이터 복원 =====
  useEffect(() => {
    const loadFromDB = async () => {
      if (!selectedCpId || selectedCpId.trim() === '') return;

      try {

        // ★ 1. DB 통계 API 호출 (정확한 통계)
        const statsRes = await fetch(`/api/control-plan/${selectedCpId}/stats`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData.success) {
            setDbStats({
              processInfo: statsData.stats.processInfo || 0,
              detector: statsData.stats.detector || 0,
              controlItem: statsData.stats.controlItem || 0,
              controlMethod: statsData.stats.controlMethod || 0,
              reactionPlan: statsData.stats.reactionPlan || 0,
              groupCount: statsData.groupCount || 0,
              totalCount: statsData.totalCount || 0,
            });
          }
        }

        // ★ 2. 마스터 데이터 복원
        const res = await fetch(`/api/control-plan/${selectedCpId}/master-data`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.flatData && data.flatData.length > 0) {
            const restoredData: ImportedData[] = data.flatData.map((item: any, idx: number) => ({
              id: `db-${idx}-${Date.now()}`,
              processNo: item.processNo || '',
              processName: item.processName || '',
              category: item.category || 'processInfo',
              itemCode: item.itemCode || '',
              value: item.value || '',
              createdAt: new Date(),
            }));

            setFullData(restoredData);
            setIsCpConfirmed(true);  // ★ DB에서 데이터 로드 시 우측 패널 활성화
            return;
          }
        }

        // DB에 없으면 localStorage에서 복원
        const key = `cp-import-data-${selectedCpId}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          const { full = [], group = [], item = [] } = JSON.parse(stored);
          setFullData(full);
          setGroupData(group);
          setItemData(item);
        }
      } catch (error) {
        console.error('❌ [CP Import] 데이터 복원 실패:', error);
      }
    };

    loadFromDB();
  }, [selectedCpId]);

  // ===== 선택 핸들러 =====
  const handleRowSelect = useCallback((processNo: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(processNo)) next.delete(processNo);
      else next.add(processNo);
      return next;
    });
  }, []);

  const handleColumnClick = useCallback((key: string) => {
    setColumnFilter(key);
  }, []);

  const handleSelectAll = useCallback((processNos: string[]) => {
    setSelectedRows(processNos.length > 0 ? new Set(processNos) : new Set());
  }, []);

  // ===== 전체 저장 =====
  const handleSaveAll = async () => {
    if (!selectedCpId || selectedCpId.trim() === '') {
      alert('⚠️ CP를 선택해주세요.');
      return;
    }

    // 편집 중인 행 자동 저장
    if (editingRowId) {
      handleEditSave(editingRowId, 'individual');
    }

    setIsSaving(true);
    try {
      const allData = [...fullData, ...groupData, ...itemData];

      if (allData.length === 0) {
        alert('⚠️ 저장할 데이터가 없습니다.');
        setIsSaving(false);
        return;
      }

      const flatData = allData.map(d => ({
        id: d.id,
        processNo: d.processNo || '',
        processName: d.processName || '',
        category: d.category,
        itemCode: d.itemCode,
        value: d.value || '',
        createdAt: d.createdAt,
      })).filter(d => d.processNo && d.itemCode);


      // localStorage 저장
      localStorage.setItem('cp_master_data', JSON.stringify(flatData));
      localStorage.setItem('cp_master_saved_at', new Date().toISOString());
      localStorage.setItem(`cp-import-data-${selectedCpId}`, JSON.stringify({ full: fullData, group: groupData, item: itemData }));

      // DB 저장
      const res = await saveMasterDataset({
        cpNo: selectedCpId,
        datasetId: masterDatasetId,
        name: masterDatasetName || 'MASTER',
        setActive: true,
        replace: true,
        flatData,
      });

      if (!res.ok) {
        alert('⚠️ 마스터 DB 저장 실패!');
        setIsSaving(false);
        return;
      }

      if (res.datasetId) setMasterDatasetId(res.datasetId);

      // ★ 표준화: 기초정보 Import는 워크시트 자동생성 안함
      // - 기초정보는 cp_master_flat_items에만 저장 (입력 모달에서 활용)
      // - 셀병합된 관리계획서 Import (CP 작성화면)에서만 워크시트 자동생성

      // EP검사장치/자동검사장치만 DB에 저장 (CP 작성화면에서 활용)
      const epDevices: { processNo: string; processName: string; category: string; deviceName: string }[] = [];

      // A6: EP검사장치, A7: 자동검사장치 수집
      flatData.forEach(d => {
        if ((d.itemCode === 'A6' || d.itemCode === 'A7') && d.value && d.value.trim()) {
          const processNameData = flatData.find(p => p.processNo === d.processNo && p.itemCode === 'A2');
          epDevices.push({
            processNo: d.processNo,
            processName: processNameData?.value || d.processName || '',
            category: d.itemCode === 'A6' ? 'Error Proof' : '자동검사',
            deviceName: d.value.trim(),
          });
        }
      });


      if (epDevices.length > 0) {

        try {
          const epRes = await fetch('/api/ep-device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cpNo: selectedCpId.trim(),
              devices: epDevices,
              replaceAll: true,  // CP별로 전체 교체
              isMaster: false,
            }),
          });

          const epJson = await epRes.json();

          if (epRes.ok && epJson.success) {
          } else {
            console.error('⚠️ [EP Device] 저장 실패:', epJson.error, epJson.detail);
          }
        } catch (epError: any) {
          console.error('❌ [EP Device] API 호출 오류:', epError);
        }
      } else {
      }

      // ★ 안내 메시지 추가
      alert('✅ 기초정보가 저장되었습니다.\n\n💡 CP 작성화면에서 셀을 클릭하면 기초정보를 불러와 작성할 수 있습니다.');

      setIsSaved(true);
      setIsCpConfirmed(true);  // 우측 패널 활성화
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error: any) {
      console.error('❌ [CP Import] 저장 실패:', error);
      alert(`저장 실패: ${error.message || error}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ===== 통계 계산 =====
  const stats = {
    full: [...new Set(fullData.map(d => d.processNo))].length,
    group: [...new Set(groupData.map(d => d.processNo))].length,
    item: [...new Set(itemData.map(d => d.processNo))].length,
  };

  // ★ DB 통계 우선 사용, 없으면 React state에서 계산
  const groupCounts = dbStats ? {
    processInfo: dbStats.processInfo,
    detector: dbStats.detector,
    controlItem: dbStats.controlItem,
    controlMethod: dbStats.controlMethod,
    reactionPlan: dbStats.reactionPlan,
  } : (() => {
    // fallback: React state에서 계산 (빈 값, "Y" 제외)
    const allDataForStats = [...fullData, ...groupData, ...itemData];
    const nonEmptyDataForStats = allDataForStats.filter(d => {
      const value = (d.value || '').trim().toUpperCase();
      return value && value !== 'Y';
    });
    return {
      processInfo: nonEmptyDataForStats.filter(d => d.category === 'processInfo').length,
      detector: nonEmptyDataForStats.filter(d => d.category === 'detector').length,
      controlItem: nonEmptyDataForStats.filter(d => d.category === 'controlItem').length,
      controlMethod: nonEmptyDataForStats.filter(d => d.category === 'controlMethod').length,
      reactionPlan: nonEmptyDataForStats.filter(d => d.category === 'reactionPlan').length,
    };
  })();
  const groupCountsForDisplay = Object.values(groupCounts).filter(v => v > 0).length;
  // ★ 유효 데이터 총 건수 (DB 통계 우선)
  const validDataTotalCount = dbStats?.totalCount ?? Object.values(groupCounts).reduce((a, b) => a + b, 0);

  // 누락 건수 계산
  const REQUIRED_ITEM_CODES = ['A3', 'A4', 'A5', 'A6', 'A7', 'B1', 'B2', 'B4', 'B5', 'B6', 'B7', 'B7-1', 'B8', 'B9', 'B10'];
  const allData = [...fullData, ...groupData, ...itemData];
  const processNos = [...new Set(allData.map(d => d.processNo))];
  let missingCount = 0;
  processNos.forEach(processNo => {
    const rowData = allData.filter(d => d.processNo === processNo);
    REQUIRED_ITEM_CODES.forEach(itemCode => {
      const value = rowData.find(r => r.itemCode === itemCode)?.value || '';
      if (!value.trim()) missingCount++;
    });
  });

  return (
    <FixedLayout topNav={<CPTopNav selectedCpId={selectedCpId} />} topNavHeight={48} showSidebar={true} contentPadding="px-2 py-1">
      <div className="font-[Malgun_Gothic] flex flex-col h-full">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-1 bg-white px-2 py-0.5 rounded border border-gray-300 w-full flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base">📥</span>
            <h1 className="text-sm font-bold text-gray-800" title="CP Master Data Import">Control Plan 기초정보 Import(CP Master Import)</h1>
            <span className="text-xs text-gray-500">(CP No: {selectedCpId || '-'})</span>
          </div>
          <div className="flex gap-2" />
        </div>

        {/* Import 메뉴바 */}
        <ImportMenuBar
          selectedCpId={selectedCpId}
          cpList={cpList}
          onCpChange={setSelectedCpId}
          downloadFullTemplate={downloadFullTemplate}
          downloadFullSampleTemplate={downloadFullSampleTemplate}
          fullFileInputRef={fullFileInputRef}
          fullFileName={fullFileName}
          onFullFileSelect={handleFullFileSelect}
          onFullImport={handleFullImport}
          fullPendingCount={fullPendingData.length}
          isFullParsing={isFullParsing}
          isFullImporting={isFullImporting}
          fullImportSuccess={fullImportSuccess}
          fullDataCount={validDataTotalCount}
          groupCounts={groupCounts}
          groupCountsTotal={groupCountsForDisplay}
          selectedSheet={groupFilter || 'processInfo'}
          onSheetChange={setGroupFilter}
          downloadGroupSheetTemplate={downloadGroupSheetTemplate}
          downloadGroupSheetSampleTemplate={downloadGroupSheetSampleTemplate}
          groupFileInputRef={groupFileInputRef}
          groupFileName={groupFileName}
          onGroupFileSelect={handleGroupFileSelect}
          onGroupImport={handleGroupImport}
          groupPendingCount={groupPendingData.length}
          isGroupParsing={isGroupParsing}
          isGroupImporting={isGroupImporting}
          groupImportSuccess={groupImportSuccess}
          groupDataCount={groupData.length}
          selectedItem={columnFilter || 'A2'}
          onItemChange={setColumnFilter}
          downloadItemTemplate={downloadItemTemplate}
          downloadItemSampleTemplate={downloadItemSampleTemplate}
          itemFileInputRef={itemFileInputRef}
          itemFileName={itemFileName}
          onItemFileSelect={handleItemFileSelect}
          onItemImport={handleItemImport}
          itemPendingCount={itemPendingData.length}
          isItemParsing={isItemParsing}
          isItemImporting={isItemImporting}
          itemImportSuccess={itemImportSuccess}
          itemDataCount={itemData.length}
          // ★ 워크시트 Import
          downloadWorksheetTemplate={downloadWorksheetEmptyTemplate}
          downloadWorksheetSampleTemplate={downloadWorksheetSampleTemplate}
          worksheetFileInputRef={worksheetFileInputRef}
          worksheetFileName={worksheetFileName}
          onWorksheetFileSelect={handleWorksheetFileSelect}
          onWorksheetImport={handleWorksheetImport}
          worksheetPendingCount={worksheetPendingData.rows.length}
          isWorksheetParsing={isWorksheetParsing}
          isWorksheetImporting={isWorksheetImporting}
          worksheetImportSuccess={worksheetImportSuccess}
        />
        {/* ★ 미리보기: 워크시트 Import 시 20컬럼, 기초정보 Import 시 5탭 */}
        <div className="flex pb-[20px] flex-1 min-h-0">
          {worksheetPendingData.rows.length > 0 ? (
            <CpPreviewPanel
              rows={worksheetPendingData.rows}
              merges={worksheetPendingData.merges}
              cpId={selectedCpId}
              fileName={worksheetFileName}
              isParsing={isWorksheetParsing}
              onFileSelect={() => worksheetFileInputRef.current?.click()}
              onImport={handleWorksheetImport}
              isImporting={isWorksheetImporting}
              importSuccess={worksheetImportSuccess}
              onRowsChange={(rows) => setWorksheetPendingData(prev => ({ ...prev, rows }))}
            />
          ) : fullData.length > 0 ? (
            <CpMasterPreviewTabs data={fullData} cpId={selectedCpId} onDataChange={setFullData} />
          ) : (
            <CpPreviewPanel
              rows={[]}
              merges={[]}
              cpId={selectedCpId}
              fileName={worksheetFileName}
              isParsing={isWorksheetParsing}
              onFileSelect={() => worksheetFileInputRef.current?.click()}
              onImport={handleWorksheetImport}
              isImporting={isWorksheetImporting}
              importSuccess={worksheetImportSuccess}
              onRowsChange={(rows) => setWorksheetPendingData(prev => ({ ...prev, rows }))}
            />
          )}
        </div>
      </div>

      {/* ★ 셀 입력 모달 */}
      <CpCellInputModal
        isOpen={cellModalOpen}
        onClose={() => setCellModalOpen(false)}
        processNo={cellModalData.processNo}
        processName={cellModalData.processName}
        columnKey={cellModalData.columnKey}
        currentValue={cellModalData.currentValue}
        onSave={(processNo, columnKey, value) => {

          // itemCode 매핑
          const KEY_TO_ITEM_CODE: Record<string, string> = {
            'processNo': 'A1', 'processName': 'A2', 'level': 'A3', 'processDesc': 'A4',
            'equipment': 'A5', 'ep': 'A6', 'autoDetector': 'A7',
            'productChar': 'B1', 'processChar': 'B2', 'specialChar': 'B3', 'spec': 'B4',
            'evalMethod': 'B5', 'sampleSize': 'B6', 'frequency': 'B7', 'controlMethod': 'B7-1',
            'owner1': 'B8', 'owner2': 'B9', 'reactionPlan': 'B10',
          };
          const itemCode = KEY_TO_ITEM_CODE[columnKey] || columnKey;

          // 기존 데이터 업데이트 또는 새로 추가
          const existingIndex = itemData.findIndex(d => d.processNo === processNo && d.itemCode === itemCode);
          if (existingIndex >= 0) {
            setItemData(prev => {
              const updated = [...prev];
              updated[existingIndex] = { ...updated[existingIndex], value };
              return updated;
            });
          } else {
            const newItem: ImportedData = {
              id: `cell-${Date.now()}`,
              processNo,
              processName: cellModalData.processName,
              category: itemCode.startsWith('A') ? 'processInfo' : 'controlItem',
              itemCode,
              value,
              createdAt: new Date(),
            };
            setItemData(prev => [...prev, newItem]);
          }
        }}
      />

      {/* ★ PFMEA 연결 모달 */}
      <CpPfmeaLinkModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        processNo={linkModalProcessNo}
        processName={linkModalProcessName}
        selectedCpId={selectedCpId}
        onLink={(processNo, pfmeaId, links) => {
          // 연결된 데이터를 기초정보에 반영
          links.forEach(link => {
            // 고장형태 → 제품특성 (B1)
            if (link.fmText) {
              const newItem: ImportedData = {
                id: `link-fm-${Date.now()}-${Math.random()}`,
                processNo,
                processName: linkModalProcessName,
                category: 'controlItem',
                itemCode: 'B1',
                value: link.fmText,
                createdAt: new Date(),
              };
              setItemData(prev => [...prev, newItem]);
            }
            // 고장원인 → 공정특성 (B2)
            if (link.fcText) {
              const newItem: ImportedData = {
                id: `link-fc-${Date.now()}-${Math.random()}`,
                processNo,
                processName: linkModalProcessName,
                category: 'controlItem',
                itemCode: 'B2',
                value: link.fcText,
                createdAt: new Date(),
              };
              setItemData(prev => [...prev, newItem]);
            }
          });
          alert(`✅ 공정 ${processNo}에 ${links.length}개 항목이 연결되었습니다!`);
        }}
        onUnlink={(processNo) => {
          // 해당 공정의 연결된 데이터 삭제
          setItemData(prev => prev.filter(d => !d.id.startsWith('link-') || d.processNo !== processNo));
          alert(`공정 ${processNo}의 PFMEA 연결이 해제되었습니다.`);
        }}
      />
    </FixedLayout >
  );
}

export default function CPImportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">로딩 중...</div>}>
      <CPImportPageContent />
    </Suspense>
  );
}
