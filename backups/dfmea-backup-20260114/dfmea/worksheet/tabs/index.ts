/**
 * @file tabs/index.ts
 * @description FMEA 워크시트 탭 컴포넌트 export
 */

export { default as StructureTab, StructureColgroup, StructureHeader, StructureRow } from './StructureTab';
export { default as FunctionTab, FunctionColgroup, FunctionHeader, FunctionRow } from './FunctionTab';
export { default as FailureTab, FailureColgroup, FailureHeader, FailureRow } from './FailureTab';
export { default as RiskTab, RiskHeader, RiskRow } from './RiskTab';
export { default as OptTab, OptHeader, OptRow } from './OptTab';
export { default as DocTab, DocHeader, DocRow } from './DocTab';
export { default as AllViewTab, AllViewHeader } from './AllViewTab';

// 공용 컴포넌트
export * from './shared';

