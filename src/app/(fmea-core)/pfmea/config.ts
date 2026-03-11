/**
 * @file pfmea/config.ts
 * @description PFMEA 전용 설정
 */

import type { FMEAConfig, AttributeOption } from '@/lib/fmea-core/types';

export const PFMEA_CONFIG: FMEAConfig = {
  type: 'PFMEA',
  labels: {
    l1: '완제품 공정명',
    l2: '메인 공정명',
    l3: '작업 요소명',
    l3Attr: '4M',
  },
  colors: {
    bg: '#f5f7fa',
    text: '#333',
    line: '#e0e0e0',
    white: '#fff',
    structure: {
      main: '#1976d2',
      light: '#e3f2fd',
      dark: '#1565c0',
      text: '#0d47a1',
      zebra: '#bbdefb',
    },
    function: {
      main: '#388e3c',
      light: '#e8f5e9',
      dark: '#2e7d32',
      text: '#1b5e20',
      zebra: '#c8e6c9',
    },
    failure: {
      main: '#f57c00',
      light: '#fff3e0',
      dark: '#e65100',
      text: '#e65100',
      zebra: '#ffe0b2',
    },
    risk: {
      main: '#1976d2',
      prevention: { header: '#e3f2fd', cell: '#bbdefb' },
      detection: { header: '#e8f5e9', cell: '#c8e6c9' },
      evaluation: { header: '#fff3e0', cell: '#ffe0b2' },
    },
    opt: {
      main: '#1976d2',
      plan: { header: '#e3f2fd', cell: '#bbdefb' },
      monitor: { header: '#e8f5e9', cell: '#c8e6c9' },
      effect: { header: '#fff3e0', cell: '#ffe0b2' },
    },
  },
  attributeOptions: [
    { code: 'MN', label: 'Man', color: { bg: '#e3f2fd', border: '#90caf9', color: '#1565c0' } },
    { code: 'MC', label: 'Machine', color: { bg: '#e8f5e9', border: '#a5d6a7', color: '#2e7d32' } },
    { code: 'IM', label: 'Material', color: { bg: '#fff3e0', border: '#ffcc80', color: '#ef6c00' } },
    { code: 'EN', label: 'Environment', color: { bg: '#fce4ec', border: '#f48fb1', color: '#c2185b' } },
  ] as AttributeOption[],
  storageKeyPrefix: 'pfmea_worksheet_',
};



