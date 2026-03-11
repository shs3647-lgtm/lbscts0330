/**
 * @file useApqpSave.ts
 * @description APQP 저장 로직 - DB 저장, ProjectLinkage 동기화, 하위 문서 연동
 */

'use client';

import { useCallback, useState } from 'react';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { CFTMember, REQUIRED_ROLES } from '@/components/tables/CFTRegistrationTable';
import { APQPInfo } from '../types';
import { syncToLocalStorage, recordChangeHistory } from '../utils';

interface UseApqpSaveParams {
  apqpId: string;
  apqpInfo: APQPInfo;
  cftMembers: CFTMember[];
  linkedFmea: string | null;
  linkedDfmea: string | null;
  linkedCp: string | null;
  linkedPfd: string | null;
  isEditMode: boolean;
  originalData: APQPInfo | null;
  userName: string;
  setOriginalData: (data: APQPInfo) => void;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved') => void;
  setIsCreateModalOpen: (open: boolean) => void;
  recordAccessLog: (action: string, itemType: string, description: string, projectId?: string) => Promise<void>;
  router: AppRouterInstance;
}

export function useApqpSave(params: UseApqpSaveParams) {
  const {
    apqpId, apqpInfo, cftMembers,
    linkedFmea, linkedDfmea, linkedCp, linkedPfd,
    isEditMode, originalData, userName,
    setOriginalData, setSaveStatus, setIsCreateModalOpen,
    recordAccessLog, router,
  } = params;

  // CFT 미입력 경고 모달 상태
  const [cftAlertRoles, setCftAlertRoles] = useState<string[]>([]);

  const handleSave = useCallback(async () => {
    if (!apqpId) {
      alert('APQP ID가 없습니다. "새로 작성" 버튼을 눌러 ID를 먼저 생성해주세요.');
      setIsCreateModalOpen(true);
      return;
    }
    if (!apqpInfo.subject?.trim()) { alert('APQP명을 입력해주세요.'); return; }

    // 필수 역할 미입력 경고
    const missingRoles = REQUIRED_ROLES.filter(role => {
      const member = cftMembers.find(m => m.role === role);
      return !member || !member.name?.trim();
    });
    if (missingRoles.length > 0) {
      setCftAlertRoles(missingRoles);
    }

    setSaveStatus('saving');

    try {
      const finalId = apqpId.toLowerCase();

      // DB 저장
      const res = await fetch('/api/apqp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apqpNo: finalId,
          apqpInfo: { ...apqpInfo, apqpId: finalId },
          cftMembers: cftMembers.filter(m => m.name?.trim()),
          linkedFmea: linkedFmea || null,
          linkedDfmea: linkedDfmea || null,
          linkedCp: linkedCp || null,
          linkedPfd: linkedPfd || null,
        }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      // ProjectLinkage 동기화
      try {
        await fetch('/api/project-linkage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apqpNo: finalId,
            pfmeaId: linkedFmea || null,
            dfmeaId: linkedDfmea || null,
            pfdNo: linkedPfd || null,
            cpNo: linkedCp || null,
            companyName: apqpInfo.companyName,
            engineeringLocation: apqpInfo.engineeringLocation,
            customerName: apqpInfo.customerName,
            modelYear: apqpInfo.modelYear,
            subject: apqpInfo.subject,
            projectName: apqpInfo.subject,
            startDate: apqpInfo.apqpStartDate,
            revisionDate: apqpInfo.apqpRevisionDate,
            processResponsibility: apqpInfo.processResponsibility,
            confidentialityLevel: apqpInfo.confidentialityLevel,
            responsibleName: apqpInfo.apqpResponsibleName,
            partNo: apqpInfo.partNo,
          }),
        });
      } catch (linkageErr) { console.error('[ProjectLinkage 동기화] 오류:', linkageErr); }

      // 연동된 PFMEA/DFMEA에 parentApqpNo 업데이트
      try {
        const syncBody = (id: string) => ({
          id,
          parentApqpNo: finalId,
          initialSync: true,
          companyName: apqpInfo.companyName,
          customerName: apqpInfo.customerName,
          modelYear: apqpInfo.modelYear,
          subject: apqpInfo.subject,
          engineeringLocation: apqpInfo.engineeringLocation,
          startDate: apqpInfo.apqpStartDate,
          revisionDate: apqpInfo.apqpRevisionDate,
          processResponsibility: apqpInfo.processResponsibility,
          confidentialityLevel: apqpInfo.confidentialityLevel,
          responsibleName: apqpInfo.apqpResponsibleName,
        });

        if (linkedFmea) {
          await fetch('/api/fmea/info', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(syncBody(linkedFmea)),
          });
        }
        if (linkedDfmea) {
          await fetch('/api/fmea/info', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(syncBody(linkedDfmea)),
          });
        }
      } catch (linkErr) { console.error('[FMEA 연동 동기화] 오류:', linkErr); }

      if (originalData) recordChangeHistory(finalId, apqpInfo, originalData, userName);
      syncToLocalStorage(finalId, apqpInfo, cftMembers, linkedFmea || '', linkedCp || '');
      localStorage.setItem('apqp-last-edited', finalId);
      setOriginalData({ ...apqpInfo });

      await recordAccessLog(
        isEditMode ? 'update' : 'create',
        '기초정보',
        isEditMode ? `APQP 수정: ${apqpInfo.subject}` : `APQP 등록: ${apqpInfo.subject}`,
        finalId,
      );

      setSaveStatus('saved');
      if (!isEditMode) router.replace(`/apqp/register?id=${finalId}`);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e: any) {
      alert('저장 실패: ' + (e.message || '알 수 없는 오류'));
      setSaveStatus('idle');
    }
  }, [
    apqpId, apqpInfo, cftMembers,
    linkedFmea, linkedDfmea, linkedCp, linkedPfd,
    isEditMode, originalData, userName,
    setOriginalData, setSaveStatus, setIsCreateModalOpen,
    recordAccessLog, router,
  ]);

  return { handleSave, cftAlertRoles, setCftAlertRoles };
}
