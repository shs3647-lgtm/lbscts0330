/**
 * @file types.ts
 * @description 도움말 시스템 공통 타입
 */

export type Language = 'ko' | 'en';

export interface ManualItem {
  category: string;
  title: string;
  content: string;
  keywords: string[];
  paths?: string[];
}
