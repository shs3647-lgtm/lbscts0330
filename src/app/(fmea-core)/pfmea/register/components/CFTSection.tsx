/**
 * @file components/CFTSection.tsx
 * @description PFMEA 등록 - CFT 리스트 섹션
 * @module pfmea/register
 */

'use client';

import { CFTRegistrationTable, CFTMember } from '@/components/tables/CFTRegistrationTable';

interface CFTSectionProps {
  cftMembers: CFTMember[];
  setCftMembers: React.Dispatch<React.SetStateAction<CFTMember[]>>;
  onUserSearch: (index: number) => void;
  onSave: () => Promise<void>;
  onReset: () => void;
  saveStatus: 'idle' | 'saving' | 'saved';
}

/**
 * CFT 리스트 섹션 컴포넌트
 */
export function CFTSection({
  cftMembers,
  setCftMembers,
  onUserSearch,
  onSave,
  onReset,
  saveStatus,
}: CFTSectionProps) {
  // 단일 역할 중복 체크 및 처리
  const handleMembersChange = (newMembers: CFTMember[]) => {
    const SINGLE_ROLES = ['Champion', 'Leader', 'PM', 'Moderator'];

    for (const role of SINGLE_ROLES) {
      const membersWithRole = newMembers.filter(m => m.role === role);
      if (membersWithRole.length > 1) {
        let firstFound = false;
        const cleanedMembers = newMembers.filter((m) => {
          if (m.role === role) {
            if (!firstFound) {
              firstFound = true;
              return true;
            } else {
              return false;
            }
          }
          return true;
        });
        setCftMembers(cleanedMembers);
        return;
      }
    }

    setCftMembers(newMembers);
  };

  return (
    <div id="cft-section" className="mt-6 scroll-mt-20">
      <CFTRegistrationTable
        title="CFT 리스트"
        members={cftMembers}
        onMembersChange={handleMembersChange}
        onUserSearch={onUserSearch}
        onSave={onSave}
        onReset={onReset}
        saveStatus={saveStatus}
        minRows={6}
      />
    </div>
  );
}

export default CFTSection;
