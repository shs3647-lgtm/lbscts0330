/**
 * @file pfmea/revision/components/index.ts
 * @description 개정관리 (Revision History) 컴포넌트 export
 * @module pfmea/revision/components
 * @created 2026-01-19
 * @updated 2026-01-27 - RevisionTable, ProjectInfoTable 추가
 */

export { default as ChangeHistoryTable, recordConfirmHistory } from './ChangeHistoryTable';
export { RevisionTable } from './RevisionTable';
export { ProjectInfoTable } from './ProjectInfoTable';
export { ApprovalFlowBar } from './ApprovalFlowBar';

// 하위 호환성: SODHistoryTable은 ChangeHistoryTable의 별칭
export { default as SODHistoryTable } from './ChangeHistoryTable';

