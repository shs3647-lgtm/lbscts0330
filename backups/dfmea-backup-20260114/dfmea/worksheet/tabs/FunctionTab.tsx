/**
 * @file FunctionTab.tsx
 * @description FMEA 워크시트 - 기능분석(3단계) 탭 (모듈화 브리지)
 */

'use client';

export { default } from './function';
export { FunctionL1Tab, FunctionL2Tab, FunctionL3Tab } from './function';
export * from './function/types';

// Legacy placeholders (기존 코드 호환용)
export const FunctionColgroup = () => null;
export const FunctionHeader = () => null;
export const FunctionRow = () => null;
