/**
 * @file dfmea/config.ts
 * @description DFMEA 전용 설정
 */

import type { FMEAConfig, AttributeOption } from '@/lib/fmea-core/types';

export const DFMEA_CONFIG: FMEAConfig = {
  type: 'DFMEA',
  labels: {
    l1: '다음 상위수준',
    l2: '초점 요소',
    l3: '다음 하위수준',
    l3Attr: '4M',
  },
  colors: {
    bg: '#f5f7fa',
    text: '#333',
    line: '#e0e0e0',
    white: '#fff',
    structure: {
      main: '#1a237e',
      light: '#e8eaf6',
      dark: '#0d1642',
      text: '#1a237e',
      zebra: '#c5cae9',
    },
    function: {
      main: '#303f9f',
      light: '#e8eaf6',
      dark: '#1a237e',
      text: '#1a237e',
      zebra: '#c5cae9',
    },
    failure: {
      main: '#283593',
      light: '#e8eaf6',
      dark: '#1a237e',
      text: '#1a237e',
      zebra: '#c5cae9',
    },
    risk: {
      main: '#283593',
      prevention: { header: '#e8eaf6', cell: '#c5cae9' },
      detection: { header: '#e3f2fd', cell: '#bbdefb' },
      evaluation: { header: '#fff3e0', cell: '#ffe0b2' },
    },
    opt: {
      main: '#283593',
      plan: { header: '#e3f2fd', cell: '#bbdefb' },
      monitor: { header: '#e8eaf6', cell: '#c5cae9' },
      effect: { header: '#e8f5e9', cell: '#c8e6c9' },
    },
  },
  attributeOptions: [
    { code: 'PC', label: '물리적 연결', color: { bg: '#e8eaf6', border: '#9fa8da', color: '#3949ab' } },
    { code: 'ME', label: '재료 교환', color: { bg: '#e3f2fd', border: '#90caf9', color: '#1565c0' } },
    { code: 'ET', label: '에너지 전달', color: { bg: '#fff3e0', border: '#ffcc80', color: '#ef6c00' } },
    { code: 'DE', label: '데이터 교환', color: { bg: '#e8f5e9', border: '#a5d6a7', color: '#2e7d32' } },
    { code: 'HM', label: '휴먼-머신', color: { bg: '#fce4ec', border: '#f48fb1', color: '#c2185b' } },
  ] as AttributeOption[],
  storageKeyPrefix: 'dfmea_worksheet_',
};



