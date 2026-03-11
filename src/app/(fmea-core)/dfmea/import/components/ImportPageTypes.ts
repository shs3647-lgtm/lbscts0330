/**
 * @file ImportPageTypes.ts
 * @description Import 페이지 컴포넌트 공통 타입 정의
 * @author AI Assistant
 * @created 2026-01-21
 */

import { ImportedFlatData, FailureChain } from '../types';
import { ParseResult } from '../excel-parser';
import { ChangeItem } from './DataCompareModal';
import { BackupInfo } from '../hooks';

// =====================================================
// 공통 상태 타입
// =====================================================

export interface FMEAProject {
  id: string;
  fmeaNo?: string;
  fmeaType?: 'M' | 'F' | 'P' | string; // M=마스터, F=패밀리, P=파트
  fmeaInfo?: {
    subject?: string;
    customerName?: string;
    companyName?: string;
    modelYear?: string;
  };
  project?: {
    productName?: string;
    customer?: string;
    startDate?: string;
  };
  // 상위 FMEA 연결 정보
  parentFmeaId?: string | null;
  parentFmeaType?: string | null;
  revisionNo?: string;
}

export interface ImportPageState {
  // FMEA 선택
  fmeaList: FMEAProject[];
  selectedFmeaId: string;
  masterDatasetId: string | null;
  masterDatasetName: string;
  
  // Import 상태
  importType: 'full' | 'partial';
  fileName: string;
  flatData: ImportedFlatData[];
  isLoaded: boolean;
  isParsing: boolean;
  parseResult: ParseResult | null;
  pendingData: ImportedFlatData[];
  isImporting: boolean;
  importSuccess: boolean;
  
  // 미리보기
  previewColumn: string;
  selectedRows: Set<string>;
  
  // 관계형 탭
  relationTab: 'A' | 'B' | 'C';
  
  // Item Import
  partialItemCode: string;
  partialFileName: string;
  partialPendingData: ImportedFlatData[];
  isPartialParsing: boolean;

  // 저장 상태
  isSaved: boolean;
  isSaving: boolean;
  dirty: boolean;
  selectedRelationRows: Set<string>;

  // 비교 모드
  isCompareMode: boolean;
  dbData: ImportedFlatData[];
  confirmSelections: Set<string>;
  isAnalysisCompareMode: boolean;
  analysisDbData: ImportedFlatData[];
  analysisCellConfirms: Set<string>;

  // 고장 인과관계
  isFailureChainPopupOpen: boolean;
  failureChainProcessNo: string;
  failureChains: FailureChain[];
}

// =====================================================
// Header 컴포넌트 Props
// =====================================================

export type MasterDataType = 'M' | 'F' | 'P';
export type MasterApplyStatus = 'applied' | 'not_applied';

export interface MasterDataState {
  masterType: MasterDataType;
  masterFmeaId: string;
  applyStatus: MasterApplyStatus;
  itemCount: number;
  dataCount: number;
}

// ★★★ 2026-02-08: 기초정보 데이터 현황 (BD Status) ★★★
export interface BdStatusItem {
  fmeaId: string;
  fmeaType: 'M' | 'F' | 'P' | string;
  fmeaName: string;
  bdId: string;
  parentFmeaId?: string | null;
  parentBdId?: string;
  companyName?: string;          // ★ v2.4.0: 회사명
  customerName?: string;
  revisionNo?: string;
  startDate?: string;
  createdAt?: string;            // ★ v2.4.0: BD 생성일자
  processCount?: number;         // ★ v2.4.0: 공정갯수(PFMEA) / 초점요소수(DFMEA)
  itemCount: number;
  dataCount: number;
  fmCount?: number;              // FM(고장형태) 고유 수
  fcCount?: number;              // FC(고장원인) 고유 수
  sourceFmeaId?: string | null;  // ★ 연동 원본 FMEA ID
  version?: number;              // ★ BD 버전
  isActive?: boolean;            // ★ v2.4.0: soft delete 상태 (false = 삭제됨)
}

export interface ImportHeaderProps {
  fmeaList: FMEAProject[];
  selectedFmeaId: string;
  setSelectedFmeaId: (id: string) => void;
  mode: string | null;
  fmeaTypeFromUrl: string | null;
  onDownloadSample: (fmeaName: string) => void;
  onDownloadEmpty: (fmeaName: string) => void;
  // 마스터 데이타 Import 활용 (레거시)
  masterData?: MasterDataState;
  onMasterTypeChange?: (type: MasterDataType) => void;
  onMasterFmeaSelect?: (fmeaId: string) => void;
  onMasterApplyChange?: (status: MasterApplyStatus) => void;
  // ★★★ 2026-02-08: 기초정보 데이터 현황 ★★★
  bdStatusList?: BdStatusItem[];
  onCopyFromParent?: () => void;
  onSelectAndCopy?: (targetFmeaId: string) => void;
}

// =====================================================
// Input Section 컴포넌트 Props
// =====================================================

export interface ImportInputSectionProps {
  // FMEA Import
  isParsing: boolean;
  fileName: string;
  pendingData: ImportedFlatData[];
  importSuccess: boolean;
  isImporting: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
  
  // Item Import
  partialItemCode: string;
  setPartialItemCode: (code: string) => void;
  setPreviewColumn: (col: string) => void;
  isPartialParsing: boolean;
  partialFileName: string;
  partialPendingData: ImportedFlatData[];
  partialFileInputRef: React.RefObject<HTMLInputElement | null>;
  onPartialFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPartialImport: () => void;
  
  // 분석 데이터
  relationTab: 'A' | 'B' | 'C';
  setRelationTab: (tab: 'A' | 'B' | 'C') => void;
}

// =====================================================
// Preview Panel 컴포넌트 Props
// =====================================================

export interface ImportPreviewPanelProps {
  // 데이터
  flatData: ImportedFlatData[];
  previewData: ImportedFlatData[];
  previewColumn: string;
  setPreviewColumn: (col: string) => void;
  selectedRows: Set<string>;
  processNoMap: Map<string, string>;
  
  // 비교 모드
  isCompareMode: boolean;
  dbData: ImportedFlatData[];
  confirmSelections: Set<string>;
  
  // 저장 상태
  isSaved: boolean;
  isSaving: boolean;
  
  // 핸들러
  onDownloadPreview: () => void;
  onDownloadAll: () => void;
  onAllDelete: () => void;
  onDeleteSelected: () => void;
  onSave: () => void;
  onShowBackup: () => void;
  onRowSelect: (id: string) => void;
  onEditCell: (id: string, value: string) => void;
  onReorder: (from: number, to: number) => void;
  getDisplayProcessNo: (processNo: string) => string;
  
  // 비교 모드 핸들러
  onSelectAllConfirm: (checked: boolean) => void;
  onConfirmSave: () => void;
  onCancelCompare: () => void;
  onToggleConfirm: (id: string) => void;
  onStartCompare: () => void;
}

// =====================================================
// Relation Panel 컴포넌트 Props
// =====================================================

export interface ImportRelationPanelProps {
  // 데이터
  flatData: ImportedFlatData[];
  relationData: any[];
  relationTab: 'A' | 'B' | 'C';
  setRelationTab: (tab: 'A' | 'B' | 'C') => void;
  setPreviewColumn: (col: string) => void;
  selectedRelationRows: Set<string>;
  stats: { aCount: number; bCount: number; cCount: number; processCount: number };
  
  // 비교 모드
  isAnalysisCompareMode: boolean;
  analysisDbData: ImportedFlatData[];
  analysisCellConfirms: Set<string>;
  
  // 핸들러
  onDownload: () => void;
  onAllDelete: () => void;
  onDeleteSelected: () => void;
  onSave: () => void;
  onRowSelect: (processNo: string) => void;
  onOpenFailurePopup: (processNo: string) => void;
  setFlatData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  
  // 비교 모드 핸들러
  onStartAnalysisCompare: () => void;
  onCancelAnalysisCompare: () => void;
  onSelectAllAnalysisConfirm: (checked: boolean) => void;
  onToggleAnalysisCellConfirm: (processNo: string, itemCode: string) => void;
  onAnalysisConfirmSave: () => void;
  isAnalysisCellChanged: (processNo: string, itemCode: string, value: string | undefined) => boolean;
  isAnalysisCellNew: (processNo: string, itemCode: string) => boolean;
}

// =====================================================
// Backup Modal 컴포넌트 Props
// =====================================================

export interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  backupList: BackupInfo[];
  onRestore: (backup: BackupInfo) => void;
  onDelete: (timestamp: string) => void;
}
