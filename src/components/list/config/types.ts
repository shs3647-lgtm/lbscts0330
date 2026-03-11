/**
 * @file types.ts
 * @description 리스트 모듈 공통 타입 정의
 * @version 1.0.0
 * @created 2026-01-24
 */

export interface ListColumnConfig {
  key: string;
  header: string;
  width: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any, index: number) => React.ReactNode;
}

export interface ListModuleConfig {
  moduleName: string;           // 'PFMEA', 'DFMEA', 'CP', 'PFD', 'APQP'
  modulePrefix: string;         // 'pfm', 'dfm', 'cp', 'pfd', 'apqp'
  themeColor: string;           // '#00587a', '#f97316' 등
  headerBgColor: string;        // 테이블 헤더 배경색
  rowEvenBgColor: string;       // 짝수행 배경색
  rowHoverBgColor: string;      // 호버 배경색
  columns: ListColumnConfig[];
  apiEndpoint: string;          // '/api/fmea/projects'
  registerUrl: string;          // '/pfmea/register'
  worksheetUrl?: string;        // '/pfmea/worksheet'
  idField: string;              // 'id', 'pfdNo', 'cpNo', 'apqpNo'
  searchFields: string[];       // 검색 대상 필드
  maxSteps?: 5 | 7;             // APQP: 5, FMEA: 7
}

export interface ListItem {
  [key: string]: any;
}
