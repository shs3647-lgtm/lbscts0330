/**
 * @file pfmea.config.tsx
 * @description PFMEA 리스트 설정
 * @version 1.0.0
 * @created 2026-01-24
 */

import React from 'react';
import { ListModuleConfig } from './types';
import TypeBadge, { extractTypeFromId } from '../TypeBadge';
import StepBadge from '../StepBadge';

export const PFMEA_CONFIG: ListModuleConfig = {
  moduleName: 'PFMEA',
  modulePrefix: 'pfm',
  themeColor: '#00587a',
  headerBgColor: '#00587a',
  rowEvenBgColor: '#e3f2fd',
  rowHoverBgColor: 'blue-50',
  apiEndpoint: '/api/fmea/projects',
  registerUrl: '/pfmea/register',
  worksheetUrl: '/pfmea/worksheet',
  idField: 'id',
  searchFields: ['id', 'project.projectName', 'fmeaInfo.subject', 'project.customer'],
  maxSteps: 7,
  columns: [
    { key: 'no', header: 'No', width: '35px', align: 'center' },
    { key: 'id', header: 'FMEA ID', width: '85px', align: 'center' },
    { key: 'type', header: 'TYPE', width: '40px', align: 'center' },
    { key: 'parentFmeaId', header: '상위 FMEA', width: '70px', align: 'center' },
    { key: 'project.projectName', header: '프로젝트명', width: '140px', align: 'left' },
    { key: 'fmeaInfo.subject', header: 'FMEA명', width: '140px', align: 'left' },
    { key: 'project.customer', header: '고객사', width: '65px', align: 'center' },
    { key: 'fmeaInfo.modelYear', header: '모델명', width: '60px', align: 'center' },
    { key: 'fmeaInfo.designResponsibility', header: '공정책임', width: '65px', align: 'center' },
    { key: 'fmeaInfo.fmeaResponsibleName', header: '담당자', width: '55px', align: 'center' },
    { key: 'cftCount', header: 'CFT', width: '35px', align: 'center' },
    { key: 'fmeaInfo.fmeaStartDate', header: '시작일', width: '75px', align: 'center' },
    { key: 'fmeaInfo.fmeaRevisionDate', header: '개정일', width: '75px', align: 'center' },
    { key: 'revisionNo', header: 'Rev', width: '40px', align: 'center' },
    { key: 'step', header: '단계', width: '50px', align: 'center' },
  ],
};

// PFMEA 전용 셀 렌더러
export const pfmeaCellRenderers = {
  type: (value: any, row: any) => {
    const typeCode = extractTypeFromId(row.id, 'pfm');
    return <TypeBadge typeCode={typeCode} />;
  },
  step: (value: any) => <StepBadge step={value || 1} maxSteps={7} />,
  cftCount: (value: any, row: any) => {
    const count = row.cftMembers?.filter((m: any) => m.name?.trim()).length || 0;
    return count > 0 ? (
      <span className="text-blue-600 text-[9px] font-bold">{count}</span>
    ) : null;
  },
};
