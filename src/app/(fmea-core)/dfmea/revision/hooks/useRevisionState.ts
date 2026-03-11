/**
 * @file hooks/useRevisionState.ts
 * @description PFMEA 개정관리 상태 관리 훅
 * @module pfmea/revision
 */

'use client';

import { useState } from 'react';
import { MeetingMinute } from '@/types/project-revision';
import { FMEAProject, RevisionRecord, FMEAInfoData } from '../types';

/**
 * PFMEA 개정관리 상태 관리 훅
 */
export function useRevisionState() {
  // 프로젝트 목록
  const [projects, setProjects] = useState<FMEAProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<FMEAProject | null>(null);
  
  // 개정 이력
  const [revisions, setRevisions] = useState<RevisionRecord[]>([]);
  
  // 회의록
  const [meetings, setMeetings] = useState<MeetingMinute[]>([]);
  
  // FMEA 등록정보
  const [fmeaInfo, setFmeaInfo] = useState<FMEAInfoData | null>(null);
  
  // 모달 상태
  const [bizInfoModalOpen, setBizInfoModalOpen] = useState(false);
  
  // 저장 상태
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('');
  
  // SOD 히스토리 표시
  const [showSODHistory, setShowSODHistory] = useState(false);
  
  // 선택된 공정/고장모드 (SOD 히스토리용)
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [selectedFailureModeId, setSelectedFailureModeId] = useState<string | null>(null);

  return {
    // 프로젝트
    projects,
    setProjects,
    selectedProject,
    setSelectedProject,
    
    // 개정 이력
    revisions,
    setRevisions,
    
    // 회의록
    meetings,
    setMeetings,
    
    // FMEA 정보
    fmeaInfo,
    setFmeaInfo,
    
    // 모달
    bizInfoModalOpen,
    setBizInfoModalOpen,
    
    // 저장 상태
    isSaving,
    setIsSaving,
    lastSaved,
    setLastSaved,
    
    // SOD 히스토리
    showSODHistory,
    setShowSODHistory,
    selectedProcessId,
    setSelectedProcessId,
    selectedFailureModeId,
    setSelectedFailureModeId,
  };
}

export default useRevisionState;
