/**
 * @file InfoBar.tsx
 * @description L4 정보바 (고객/프로젝트/품명/품번/날짜 정보 표시)
 * @author AI Assistant
 * @created 2025-12-25
 * @version 1.0.0
 */

'use client';

import { Badge } from '@/components/ui/badge';

interface ProjectInfo {
  customerName?: string;
  projectName?: string;
  productName?: string;
  partNumber?: string;
  startDate?: string;
  endDate?: string;
  stage?: string;
}

interface InfoBarProps {
  /** 프로젝트 정보 */
  project?: ProjectInfo;
}

/**
 * 정보바 컴포넌트 (L4)
 * 
 * @description
 * 현재 작업 중인 FMEA 프로젝트의 기본 정보를 표시합니다.
 * 높이: 32px
 */
export function InfoBar({ project }: InfoBarProps) {
  const info = project || {
    customerName: '현대자동차',
    projectName: 'EV 신모델 개발',
    productName: 'Brake System',
    partNumber: 'BS-2025-001',
    startDate: '25/01/01',
    endDate: '25/12/31',
    stage: 'PILOT1',
  };

  return (
    <div className="fixed top-[124px] left-12 right-0 z-20 h-8 bg-blue-50 border-b border-blue-200">
      <div className="flex h-full items-center gap-4 px-4 text-sm">
        {/* 고객 */}
        <div className="flex items-center gap-1">
          <span className="text-gray-500">고객</span>
          <span className="font-medium text-gray-800">{info.customerName}</span>
        </div>

        {/* 프로젝트명 */}
        <div className="flex items-center gap-1">
          <span className="text-gray-500">프로젝트명</span>
          <span className="font-medium text-gray-800">{info.projectName}</span>
        </div>

        {/* 품명 */}
        <div className="flex items-center gap-1">
          <span className="text-gray-500">품명</span>
          <span className="font-medium text-gray-800">{info.productName}</span>
        </div>

        {/* 품번 */}
        <div className="flex items-center gap-1">
          <span className="text-gray-500">품번</span>
          <span className="font-medium text-gray-800">{info.partNumber}</span>
        </div>

        {/* 시작일 */}
        <div className="flex items-center gap-1">
          <span className="text-gray-500">시작일</span>
          <span className="font-medium text-gray-800">{info.startDate}</span>
        </div>

        {/* 종료일 */}
        <div className="flex items-center gap-1">
          <span className="text-gray-500">종료일</span>
          <span className="font-medium text-gray-800">{info.endDate}</span>
        </div>

        {/* 단계 배지 */}
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          {info.stage}
        </Badge>
      </div>
    </div>
  );
}

export default InfoBar;



