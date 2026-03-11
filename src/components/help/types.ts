/**
 * @file help/types.ts
 * @description 공용 도움말 모듈 타입 정의
 * CODEFREEZE
 */

/** 도움말 섹션 정의 */
export interface HelpSectionDef {
  key: string;
  label: string;
  component: React.ComponentType;
}

/** 도움말 매뉴얼 메타 정보 */
export interface HelpManualMeta {
  title: string;
  module: string;
  version: string;
  lastUpdated: string;
}
