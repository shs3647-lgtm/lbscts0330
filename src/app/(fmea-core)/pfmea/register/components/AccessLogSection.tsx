/**
 * @file components/AccessLogSection.tsx
 * @description PFMEA 등록 - CFT 접속 로그 섹션
 * @module pfmea/register
 */

'use client';

import { usePathname } from 'next/navigation';
import { CFTAccessLogTable } from '@/components/tables/CFTAccessLogTable';
import { CFTAccessLog } from '@/types/project-cft';
import { CFTMember } from '@/components/tables/CFTRegistrationTable';

interface AccessLogSectionProps {
  accessLogs: CFTAccessLog[];
  cftMembers: CFTMember[];
}

/**
 * CFT 접속 로그 섹션 컴포넌트
 */
export function AccessLogSection({
  accessLogs,
  cftMembers,
}: AccessLogSectionProps) {
  const logPathname = usePathname();
  const isDfmea = logPathname?.includes('/dfmea/') ?? false;
  const activeMemberCount = cftMembers.filter(m => m.name).length;

  return (
    <>
      {/* 접속 로그 테이블 */}
      <div className="flex items-center gap-2 mt-6 mb-2">
        <span>📊</span>
        <h2 className="text-sm font-bold text-gray-700">CFT 접속 로그</h2>
      </div>
      <CFTAccessLogTable accessLogs={accessLogs} maxRows={5} />

      {/* 하단 상태바 */}
      <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex justify-between text-xs text-gray-500">
        <span>총 {activeMemberCount}명의 CFT 멤버 | 접속 로그 {accessLogs.length}건</span>
        <span>버전: {isDfmea ? 'D' : 'P'}-FMEA Suite v3.0 | 사용자: FMEA Lead</span>
      </div>
    </>
  );
}

export default AccessLogSection;
