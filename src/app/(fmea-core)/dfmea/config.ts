/**
 * @file dfmea/config.ts
 * @description DFMEA 전용 설정 — PFMEA config 벤치마킹
 */

import type { FMEAConfig, AttributeOption } from '@/lib/fmea-core/types';

export const DFMEA_CONFIG: FMEAConfig = {
  type: 'DFMEA',
  labels: {
    l1: '최상위 시스템명',
    l2: '초점요소명',
    l3: '부품(컴포넌트)명',
    l3Attr: 'Type',
  },
  colors: {
    bg: '#fdf6e3',
    text: '#333',
    line: '#e0e0e0',
    white: '#fff',
    structure: {
      main: '#d97706',
      light: '#fef3c7',
      dark: '#b45309',
      text: '#92400e',
      zebra: '#fde68a',
    },
    function: {
      main: '#059669',
      light: '#d1fae5',
      dark: '#047857',
      text: '#065f46',
      zebra: '#a7f3d0',
    },
    failure: {
      main: '#dc2626',
      light: '#fee2e2',
      dark: '#b91c1c',
      text: '#991b1b',
      zebra: '#fecaca',
    },
    risk: {
      main: '#d97706',
      prevention: { header: '#fef3c7', cell: '#fde68a' },
      detection: { header: '#d1fae5', cell: '#a7f3d0' },
      evaluation: { header: '#fee2e2', cell: '#fecaca' },
    },
    opt: {
      main: '#d97706',
      plan: { header: '#fef3c7', cell: '#fde68a' },
      monitor: { header: '#d1fae5', cell: '#a7f3d0' },
      effect: { header: '#fee2e2', cell: '#fecaca' },
    },
  },
  attributeOptions: [
    { code: '부품', label: 'Component', color: { bg: '#fef3c7', border: '#fcd34d', color: '#92400e' } },
    { code: '재료', label: 'Material', color: { bg: '#d1fae5', border: '#6ee7b7', color: '#065f46' } },
    { code: '인터페이스', label: 'Interface', color: { bg: '#dbeafe', border: '#93c5fd', color: '#1e40af' } },
    { code: '소프트웨어', label: 'Software', color: { bg: '#fce7f3', border: '#f9a8d4', color: '#9d174d' } },
  ] as AttributeOption[],
  storageKeyPrefix: 'dfmea_worksheet_',
};
