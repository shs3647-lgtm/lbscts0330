/**
 * @file page.tsx
 * @description PFD 기초정보 Excel Import 페이지 (최적화 완료)
 * @updated 2026-01-24 - 훅 기반 리팩토링: CP와 동일한 구조
 */

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PFDTopNav from '@/components/layout/PFDTopNav';
import { FixedLayout } from '@/components/layout';
import { PFDProject, ImportedData } from './types';
import { tw } from './constants';
import { useImportHandlers, useEditHandlers } from './hooks';
import { saveMasterDataset, loadActiveMasterDataset } from './utils/pfd-master-api';
import { downloadCurrentData } from './excel-template';
import { ImportMenuBar, PreviewTabs, PreviewTable, ImportStatusBar } from './components';

type PreviewTab = 'full' | 'group' | 'individual';

function PFDImportPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idFromUrl = searchParams.get('id');
  
  // 상태 관리
  const [pfdList, setPfdList] = useState<PFDProject[]>([]);
  const [selectedPfdId, setSelectedPfdId] = useState<string>(idFromUrl || '');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState('processInfo');
  const [selectedItem, setSelectedItem] = useState('processName');
  const [activeTab, setActiveTab] = useState<PreviewTab>('full');
  
  // 마스터 데이터셋 상태
  const [masterDatasetId, setMasterDatasetId] = useState<string | null>(null);
  const [masterDatasetName, setMasterDatasetName] = useState<string>('MASTER');
  
  // 데이터 저장소
  const [fullData, setFullData] = useState<ImportedData[]>([]);
  const [groupData, setGroupData] = useState<ImportedData[]>([]);
  const [itemData, setItemData] = useState<ImportedData[]>([]);

  // 미리보기 필터 상태
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [columnFilter, setColumnFilter] = useState<string>('');

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

  // ===== Import 핸들러 훅 =====
  const {
    fullFileName, fullPendingData, isFullParsing, isFullImporting, fullImportSuccess,
    fullFileInputRef, handleFullFileSelect, handleFullImport,
    downloadFullTemplate, downloadFullSampleTemplate,
    groupFileName, groupPendingData, isGroupParsing, isGroupImporting, groupImportSuccess,
    groupFileInputRef, handleGroupFileSelect, handleGroupImport,
    downloadGroupSheetTemplate, downloadGroupSheetSampleTemplate,
    itemFileName, itemPendingData, isItemParsing, isItemImporting, itemImportSuccess,
    itemFileInputRef, handleItemFileSelect, handleItemImport,
    downloadItemTemplate, downloadItemSampleTemplate,
  } = useImportHandlers({
    selectedPfdId,
    selectedSheet,
    selectedItem,
    setFullData,
    setGroupData,
    setItemData,
    setActiveTab,
  });

  // ===== PFD 목록 로드 =====
  useEffect(() => {
    const stored = localStorage.getItem('pfd-projects');
    if (stored) {
      try {
        const projects: PFDProject[] = JSON.parse(stored);
        setPfdList(projects);
        if (idFromUrl) setSelectedPfdId(idFromUrl);
        else if (projects.length > 0) setSelectedPfdId(prev => prev || projects[0].id);
      } catch (e) { console.error('PFD 목록 로드 실패:', e); }
    }
  }, [idFromUrl]);

  // ===== DB에서 데이터 복원 =====
  useEffect(() => {
    const loadFromDB = async () => {
      if (!selectedPfdId || selectedPfdId.trim() === '') return;

      try {
        const result = await loadActiveMasterDataset(selectedPfdId);
        if (result.ok && result.flatData && result.flatData.length > 0) {
          const restoredData: ImportedData[] = result.flatData.map((item: any, idx: number) => ({
            id: `db-${idx}-${Date.now()}`,
            processNo: item.processNo || '',
            processName: item.processName || '',
            category: item.category || 'processInfo',
            itemCode: item.itemCode || '',
            value: item.value || '',
            createdAt: new Date(),
          }));

          setFullData(restoredData);
          return;
        }

        // localStorage에서 복원
        const key = `pfd-import-data-${selectedPfdId}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          const { full = [], group = [], item = [] } = JSON.parse(stored);
          setFullData(full);
          setGroupData(group);
          setItemData(item);
        }
      } catch (error) {
        console.error('❌ [PFD Import] 데이터 복원 실패:', error);
      }
    };

    loadFromDB();
  }, [selectedPfdId]);

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
    setSelectedColumn(prev => prev === key ? null : key);
  }, []);

  const handleSelectAll = useCallback((processNos: string[]) => {
    setSelectedRows(processNos.length > 0 ? new Set(processNos) : new Set());
  }, []);

  // ===== 전체 저장 =====
  const handleSaveAll = async () => {
    if (!selectedPfdId || selectedPfdId.trim() === '') {
      alert('⚠️ PFD를 선택해주세요.');
      return;
    }

    // 편집 중인 행 자동 저장
    if (editingRowId) {
      handleEditSave(editingRowId, activeTab);
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
      localStorage.setItem('pfd_master_data', JSON.stringify(flatData));
      localStorage.setItem('pfd_master_saved_at', new Date().toISOString());
      localStorage.setItem(`pfd-import-data-${selectedPfdId}`, JSON.stringify({ full: fullData, group: groupData, item: itemData }));
      
      // DB 저장
      const res = await saveMasterDataset({
        datasetId: masterDatasetId,
        name: masterDatasetName || 'MASTER',
        setActive: true,
        replace: true,
        flatData,
      });
      
      if (res.datasetId) setMasterDatasetId(res.datasetId);

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error: any) {
      console.error('❌ [PFD Import] 저장 실패:', error);
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

  // 누락 건수 계산
  const REQUIRED_ITEM_CODES = ['A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4'];
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
    <FixedLayout topNav={<PFDTopNav />} topNavHeight={48} showSidebar={true} contentPadding="px-2 py-1">
      <div className="font-[Malgun_Gothic] flex flex-col h-full">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-1 bg-white px-2 py-0.5 rounded border border-gray-300 w-full flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base">📥</span>
            <h1 className="text-sm font-bold text-gray-800">PFD 기초정보 Import</h1>
            <span className="text-xs text-gray-500">(PFD No: {selectedPfdId || '-'})</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveAll} disabled={isSaving || (fullData.length === 0 && groupData.length === 0 && itemData.length === 0)} 
              className={`${isSaved ? tw.btnSuccess : (fullData.length === 0 && groupData.length === 0 && itemData.length === 0) ? tw.btnSuccessDisabled : tw.btnGreen}`}>
              {isSaved ? '✓ 저장완료' : '💾 전체저장'}
            </button>
            <button 
              onClick={() => downloadCurrentData([...fullData, ...groupData, ...itemData], selectedPfdId || 'pfd26-m001')}
              disabled={fullData.length === 0 && groupData.length === 0 && itemData.length === 0}
              className={`${(fullData.length === 0 && groupData.length === 0 && itemData.length === 0) ? tw.btnSuccessDisabled : tw.btnBlue}`}
            >
              📤 현재데이터 다운로드
            </button>
            <button onClick={() => router.push('/pfd/list')} className={tw.btnPrimary}>← 목록</button>
          </div>
        </div>

        {/* Import 메뉴바 */}
        <ImportMenuBar
          selectedPfdId={selectedPfdId}
          pfdList={pfdList}
          onPfdChange={setSelectedPfdId}
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
          fullDataCount={fullData.length}
          selectedSheet={selectedSheet}
          onSheetChange={setSelectedSheet}
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
          selectedItem={selectedItem}
          onItemChange={setSelectedItem}
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
        />

        {/* 미리보기 탭 */}
        <PreviewTabs 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          stats={stats}
          groupFilter={groupFilter}
          onGroupFilterChange={setGroupFilter}
          columnFilter={columnFilter}
          onColumnFilterChange={setColumnFilter}
        />

        {/* 미리보기 테이블 */}
        <div 
          id="pfd-import-scroll-container" 
          className={`bg-white border-2 overflow-x-auto overflow-y-auto relative w-full flex-1 ${activeTab === 'full' ? 'border-teal-500' : activeTab === 'group' ? 'border-blue-500' : 'border-orange-500'}`}
        >
          {activeTab === 'full' && (
            <PreviewTable
              data={fullData} tab="full"
              selectedRows={selectedRows} selectedColumn={selectedColumn}
              editingRowId={editingRowId} editValues={editValues}
              onRowSelect={handleRowSelect} onColumnClick={handleColumnClick}
              onEditStart={handleEditStart} onEditSave={handleEditSave}
              onEditCancel={handleEditCancel} onDelete={handleDelete}
              onCellChange={handleCellChange} onSelectAll={handleSelectAll}
            />
          )}
          {activeTab === 'group' && (
            <PreviewTable
              data={groupData} tab="group"
              selectedRows={selectedRows} selectedColumn={selectedColumn}
              editingRowId={editingRowId} editValues={editValues}
              onRowSelect={handleRowSelect} onColumnClick={handleColumnClick}
              onEditStart={handleEditStart} onEditSave={handleEditSave}
              onEditCancel={handleEditCancel} onDelete={handleDelete}
              onCellChange={handleCellChange} onSelectAll={handleSelectAll}
              groupFilter={groupFilter}
            />
          )}
          {activeTab === 'individual' && (
            <PreviewTable
              data={itemData} tab="individual"
              selectedRows={selectedRows} selectedColumn={selectedColumn}
              editingRowId={editingRowId} editValues={editValues}
              onRowSelect={handleRowSelect} onColumnClick={handleColumnClick}
              onEditStart={handleEditStart} onEditSave={handleEditSave}
              onEditCancel={handleEditCancel} onDelete={handleDelete}
              onCellChange={handleCellChange} onSelectAll={handleSelectAll}
              columnFilter={columnFilter}
            />
          )}
        </div>

        {/* 하단 상태바 */}
        <ImportStatusBar stats={stats} missingCount={missingCount} />
      </div>
    </FixedLayout>
  );
}

export default function PFDImportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">로딩 중...</div>}>
      <PFDImportPageContent />
    </Suspense>
  );
}
