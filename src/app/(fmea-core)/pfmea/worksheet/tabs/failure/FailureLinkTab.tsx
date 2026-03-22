/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v4.0.0-gold L4 — 이 파일을 수정하지 마세요!  ██
 * ██                                                          ██
 * ██  상태: DB중심 고장연결 + v3.0 아키텍처 완성 (2026-02-28)  ██
 * ██  검증: 270테스트 PASS / tsc 에러 0개                      ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file FailureLinkTab.tsx
 * @description 고장연결 탭 - FM 중심 연결 관리 (전면 재작성 버전)
 *
 * 핵심 구조:
 * - FE(고장영향): L1.failureScopes에서 추출
 * - FM(고장형태): L2.failureModes에서 추출
 * - FC(고장원인): L3.failureCauses에서 추출
 * - 연결: FM을 중심으로 FE와 FC를 연결 (1:N 관계)
 *
 * 데이터 구조 (정규화):
 * failureLinks: Array<{
 *   fmId: string;      // FK: L2.failureModes.id
 *   fmText: string;    // 고장형태 텍스트
 *   fmProcess: string; // 공정명
 *   feId: string;      // FK: L1.failureScopes.id (빈 문자열 가능)
 *   feText: string;    // 고장영향 텍스트
 *   feScope: string;   // 구분 (YP/SP/USER)
 *   severity: number;  // 심각도
 *   fcId: string;      // FK: L3.failureCauses.id (빈 문자열 가능)
 *   fcText: string;    // 고장원인 텍스트
 *   fcProcess: string; // 공정명
 *   fcM4: string;      // 4M
 *   fcWorkElem: string;// 작업요소명
 * }>
 */

'use client';

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FailureTabProps } from './types';
import { uid, COLORS, FONT_SIZES } from '../../constants';
import { groupFailureLinksByFM, calculateLastRowMerge } from '../../utils';
import FailureLinkTables from './FailureLinkTables';
import FailureLinkDiagram from './FailureLinkDiagram';
import FailureLinkResult from './FailureLinkResult';
import { useSVGLines } from './hooks/useSVGLines';
import { useLinkData } from './hooks/useLinkData';
import { useLinkHandlers } from './hooks/useLinkHandlers';
import { useLinkConfirm } from './hooks/useLinkConfirm';
import {
  containerStyle, rightPanelStyle, rightHeaderStyle, modeButtonStyle,
  resultButtonStyle, fmeaNameStyle, actionButtonGroupStyle, actionButtonStyle,
  fullscreenOverlayStyle
} from './FailureLinkStyles';
import { FEItem, FMItem, FCItem, LinkResult } from './FailureLinkTypes';

export default function FailureLinkTab({ state, setState, setStateSynced, setDirty, saveToLocalStorage, saveToLocalStorageOnly, saveAtomicDB }: FailureTabProps) {
  // ========== 상태 관리 ==========
  const [currentFMId, setCurrentFMId] = useState<string | null>(null);
  const [linkedFEs, setLinkedFEs] = useState<Map<string, FEItem>>(new Map());
  const [linkedFCs, setLinkedFCs] = useState<Map<string, FCItem>>(new Map());
  const [savedLinks, setSavedLinks] = useState<LinkResult[]>([]);
  const [editMode, setEditMode] = useState<'edit' | 'confirm'>('edit');
  const [viewMode, setViewMode] = useState<'diagram' | 'result'>('diagram');
  // ★★★ 2026-03-12 FIX: 기본 필터를 첫 번째 공정으로 설정 (대량 데이터 렌더링 성능 개선) ★★★
  const firstProcessNo = useMemo(() => {
    const procs = (state.l2 || []).filter((p: any) => (p.no || '').trim());
    return procs.length > 0 ? String(procs[0].no).trim() : 'all';
  }, [state.l2]);
  const [selectedProcess, setSelectedProcess] = useState<string>(firstProcessNo);
  const [feFcFilter, setFeFcFilter] = useState<string>(firstProcessNo);
  const [includeUpstream, setIncludeUpstream] = useState(false);
  const [isResultFullscreen, setIsResultFullscreen] = useState(false);

  // 고장연결 확정 상태
  const isConfirmed = (state as any).failureLinkConfirmed || false;

  // Refs
  const chainAreaRef = useRef<HTMLDivElement>(null);
  const fmNodeRef = useRef<HTMLDivElement>(null);
  const feColRef = useRef<HTMLDivElement>(null);
  const fcColRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  // ✅ 연결확정 직후 useEffect가 linkedFEs/linkedFCs를 덮어쓰지 않도록 방지
  const justConfirmedRef = useRef(false);
  // ✅ 고장매칭 자동 실행 1회 제한
  const autoMatchDoneRef = useRef(false);
  // ★★★ 2026-03-12: 고장매칭 로딩 상태 ★★★
  const [isMatching, setIsMatching] = useState(false);

  // ========== 초기 데이터 로드 (화면 전환 시에도 항상 복원) ==========
  const stateFailureLinksJson = JSON.stringify((state as any).failureLinks || []);
  useEffect(() => {
    const stateLinks = (state as any).failureLinks || [];
    // ✅ 수정: state.failureLinks가 있으면 항상 복원 (savedLinks와 비교하여 중복 방지)
    if (stateLinks.length > 0 && stateLinks.length !== savedLinks.length) {
      // 데이터 복원 완료
      setSavedLinks(stateLinks);
      isInitialLoad.current = false;
    } else if (stateLinks.length > 0 && isInitialLoad.current) {
      // 초기 로드 완료
      setSavedLinks(stateLinks);
      isInitialLoad.current = false;
    }
  }, [stateFailureLinksJson]); // ✅ JSON 문자열로 깊은 비교

  // ✅ 성능 최적화: 편집 중에는 localStorage만 저장, 전체확정에서만 DB 저장
  const saveTemp = saveToLocalStorageOnly ?? saveToLocalStorage;

  // ========== 데이터 추출 (useLinkData hook 사용) ==========
  const {
    feData,
    fmData,
    fcData,
    fmById,
    feById,
    fcById,
    rawFmById,
    rawFeById,
    rawFcById,
    enrichedLinks,
    isL1Confirmed,
    isL2Confirmed,
    isL3Confirmed,
  } = useLinkData({ state, savedLinks });

  // ========== savedLinks 변경 시 자동 동기화 + 저장 ==========
  const savedLinksJson = JSON.stringify(savedLinks);
  const prevSavedLinksRef = useRef<string>('[]');
  const saveCompletedRef = useRef(true);  // ✅ 저장 완료 여부 추적
  useEffect(() => {
    // 초기 로드 시에는 스킵 (무한 루프 방지)
    if (isInitialLoad.current) return;

    // 이전 값과 동일하면 스킵
    if (savedLinksJson === prevSavedLinksRef.current) return;
    prevSavedLinksRef.current = savedLinksJson;
    saveCompletedRef.current = false;  // ✅ 저장 필요 표시

    // savedLinks가 변경되면 state에 동기화
    // savedLinks → state 동기화

    // ✅ setStateSynced 사용하여 stateRef 즉시 동기화 (핵심 수정!)
    const updateFn = (prev: any) => {
      const currentLinks = prev.failureLinks || [];
      if (JSON.stringify(currentLinks) === savedLinksJson) {
        return prev;
      }
      return { ...prev, failureLinks: savedLinks };
    };

    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }

    setDirty(true);

    // ✅ 변경 시 자동 저장 (debounce)
    const saveTimer = setTimeout(() => {
      saveTemp?.();
      saveCompletedRef.current = true;  // ✅ 저장 완료 표시
      // 자동 저장 완료
    }, 300);

    // ✅ cleanup에서 저장이 아직 안 됐으면 즉시 저장 (탭 이동 시 데이터 손실 방지!)
    return () => {
      clearTimeout(saveTimer);
      if (!saveCompletedRef.current) {
        saveTemp?.();
        saveCompletedRef.current = true;
        // cleanup 즉시 저장
      }
    };
  }, [savedLinksJson, setState, setStateSynced, setDirty, saveTemp, savedLinks]);

  // ✅ FE/FM/FC 데이터 추출 로직은 useLinkData hook으로 분리됨

  // enrichedLinks 동기화
  useEffect(() => {
    if (savedLinks.length === 0) return;
    const nextJson = JSON.stringify(enrichedLinks);
    if (nextJson !== savedLinksJson) {
      setSavedLinks(enrichedLinks);
    }
  }, [savedLinksJson, savedLinks.length, enrichedLinks]);

  // ========== 현재 선택된 FM ==========
  const currentFM = useMemo(() => fmData.find(f => f.id === currentFMId), [fmData, currentFMId]);

  // ========== viewMode 초기화 (5ST/6ST/ALL 버튼으로 들어온 경우 result 화면 표시) ==========
  useEffect(() => {
    const requestedViewMode = (state as any).failureLinkViewMode;
    if (requestedViewMode === 'result') {
      setViewMode('result');
      setSelectedProcess('all');
      // ✅ failureLinkViewMode 플래그 초기화 (한 번만 적용)
      setState((prev: any) => {
        const { failureLinkViewMode, ...rest } = prev;
        return rest;
      });
      // 전체 화면 표시
    }
  }, [(state as any).failureLinkViewMode, setState]);

  // ========== 첫 번째 FM 자동 선택 (고장사슬 기본 표시) ==========
  useEffect(() => {
    // FM 데이터가 있고 현재 선택된 FM이 없으면 첫 번째 FM 자동 선택 (diagram 모드일 때만)
    if (viewMode === 'diagram' && fmData.length > 0 && !currentFMId) {
      const firstFM = fmData[0];
      // 첫 번째 FM 자동 선택
      setCurrentFMId(firstFM.id);
      setSelectedProcess(firstFM.processName);
    }
  }, [fmData, currentFMId, viewMode]);

  // ========== FM 공정 변경 시 FC 필터 자동 동기화 ==========
  // selectFM, goToPrevFM, goToNextFM, confirmLink 모두 setSelectedProcess를 호출하지만
  // setFeFcFilter는 호출하지 않으므로, selectedProcess 변경 시 자동 동기화
  useEffect(() => {
    setFeFcFilter(selectedProcess);
  }, [selectedProcess]);

  // ========== SVG 연결선 ==========
  const { svgPaths, drawLines } = useSVGLines(
    chainAreaRef, fmNodeRef, feColRef, fcColRef, linkedFEs, linkedFCs, currentFM
  );

  // ========== viewMode 변경 시 화살표 다시 그리기 ==========
  useEffect(() => {
    if (viewMode === 'diagram') {
      const timer1 = setTimeout(drawLines, 100);
      const timer2 = setTimeout(drawLines, 300);
      const timer3 = setTimeout(drawLines, 500);
      const timer4 = setTimeout(drawLines, 1000);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    }
  }, [viewMode, drawLines]);

  // ========== 컴포넌트 마운트/탭 전환 시 화살표 다시 그리기 ==========
  useEffect(() => {
    const timer1 = setTimeout(drawLines, 100);
    const timer2 = setTimeout(drawLines, 300);
    const timer3 = setTimeout(drawLines, 500);
    const timer4 = setTimeout(drawLines, 1000);
    const timer5 = setTimeout(drawLines, 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========== 연결 통계 계산 ==========
  const linkStats = useMemo(() => {
    // ✅ ID 기반 연결 확인 + 텍스트 fallback (ID 불일치 보정)
    const feLinkedIds = new Set<string>();
    const fcLinkedIds = new Set<string>();
    const fmLinkedIds = new Set<string>();
    const fmLinkCounts = new Map<string, { feCount: number; fcCount: number }>();

    savedLinks.forEach(link => {
      if (link.fmId) fmLinkedIds.add(link.fmId);
      if (link.feId && link.feId.trim() !== '') feLinkedIds.add(link.feId);
      if (link.fcId && link.fcId.trim() !== '') fcLinkedIds.add(link.fcId);

      // FM별 연결 카운트 (ID만 확인)
      if (!fmLinkCounts.has(link.fmId)) {
        fmLinkCounts.set(link.fmId, { feCount: 0, fcCount: 0 });
      }
      const counts = fmLinkCounts.get(link.fmId)!;

      // FE 카운트: feId만 확인
      if (link.feId && link.feId.trim() !== '') {
        counts.feCount++;
      }

      // FC 카운트: fcId만 확인
      if (link.fcId && link.fcId.trim() !== '') {
        counts.fcCount++;
      }
    });

    // ★★★ 2026-02-28 FIX: Import ID 불일치 보정 ★★★
    // Import 시 failureScopes 중복 → feData dedup 후 ID가 달라질 수 있음
    // 링크의 feId가 feData에 없지만 같은 텍스트의 FE가 있으면 → feData ID도 등록
    const feIdSet = new Set(feData.map(f => f.id));
    const feTextToId = new Map<string, string>();
    feData.forEach(fe => {
      const k = fe.text.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!feTextToId.has(k)) feTextToId.set(k, fe.id);
    });
    const fcIdSet = new Set(fcData.map(f => f.id));
    const fcTextToId = new Map<string, string>();
    fcData.forEach(fc => {
      const k = fc.text.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!fcTextToId.has(k)) fcTextToId.set(k, fc.id);
    });
    savedLinks.forEach(link => {
      // FE text fallback
      if (link.feId && !feIdSet.has(link.feId) && link.feText) {
        const matched = feTextToId.get(link.feText.trim().toLowerCase().replace(/\s+/g, ' '));
        if (matched) feLinkedIds.add(matched);
      }
      // FC text fallback
      if (link.fcId && !fcIdSet.has(link.fcId) && link.fcText) {
        const matched = fcTextToId.get(link.fcText.trim().toLowerCase().replace(/\s+/g, ' '));
        if (matched) fcLinkedIds.add(matched);
      }
    });

    // ✅ ID 기반 카운트 (텍스트 fallback으로 보정된 ID 포함)
    const feLinkedCount = feData.filter(fe => feLinkedIds.has(fe.id)).length;
    const fcLinkedCount = fcData.filter(fc => fcLinkedIds.has(fc.id)).length;
    // ★★★ fmLinkedCount: FC 연결된 FM을 "연결완료"로 카운트 (FE는 선택사항) ★★★
    const fmLinkedCount = fmData.filter(fm => {
      const counts = fmLinkCounts.get(fm.id);
      return counts && counts.fcCount > 0;
    }).length;

    return {
      feLinkedIds, feLinkedTexts: new Set<string>(), feLinkedCount, feMissingCount: feData.length - feLinkedCount,
      fcLinkedIds, fcLinkedTexts: new Set<string>(), fcLinkedCount, fcMissingCount: fcData.length - fcLinkedCount,
      fmLinkedIds, fmLinkedCount, fmMissingCount: fmData.length - fmLinkedCount,
      fmLinkCounts
    };
  }, [savedLinks, feData, fmData, fcData]);

  // ========== 누락 FM 상세 목록 계산 (FC 미연결만 누락 — FE는 선택사항) ==========
  // ★ 현재 선택 중(미확정) FC가 있는 FM도 실시간 제외
  const missingFMs = useMemo(() => {
    return fmData.filter(fm => {
      // 현재 FM에 미확정 FC가 있으면 누락에서 제외
      if (fm.id === currentFMId && linkedFCs.size > 0) return false;
      const counts = linkStats.fmLinkCounts.get(fm.id);
      if (!counts) return true;  // 연결 없음
      return counts.fcCount === 0;
    }).map(fm => {
      const counts = linkStats.fmLinkCounts.get(fm.id) || { feCount: 0, fcCount: 0 };
      return {
        ...fm,
        missingFE: counts.feCount === 0,
        missingFC: counts.fcCount === 0,
      };
    });
  }, [fmData, linkStats, currentFMId, linkedFCs.size]);

  // ========== 누락 FE/FC 목록 계산 ==========
  // ★ 현재 선택 중(미확정) FE/FC도 실시간 제외
  const missingFCs = useMemo(() => {
    return fcData.filter(fc => !linkStats.fcLinkedIds.has(fc.id) && !linkedFCs.has(fc.id));
  }, [fcData, linkStats, linkedFCs]);

  const missingFEs = useMemo(() => {
    return feData.filter(fe => !linkStats.feLinkedIds.has(fe.id) && !linkedFEs.has(fe.id));
  }, [feData, linkStats, linkedFEs]);

  // ★★★ 전체 누락 수 (FM부분연결 + FE미연결 + FC미연결) — 심각도는 선택사항 ★★★
  const totalMissingCount = missingFMs.length + missingFCs.length + missingFEs.length;

  // ========== 핸들러 hooks 사용 ==========
  const {
    selectFM,
    goToPrevFM,
    goToNextFM,
    hasPrevFM,
    hasNextFM,
    isCurrentFMLinked,
    toggleFE,
    toggleFC,
    unlinkFE,
    unlinkFC,
    confirmLink,
    unlinkCurrentFM,
    handleClearAll,
    handleReverseGenerate,
    handleAutoMatchMissing,
    getProcessOrder,
  } = useLinkHandlers({
    state,
    setState,
    setStateSynced,
    setDirty,
    saveTemp,
    saveToLocalStorage,
    saveAtomicDB,
    drawLines,
    currentFMId,
    setCurrentFMId,
    currentFM,
    linkedFEs,
    setLinkedFEs,
    linkedFCs,
    setLinkedFCs,
    savedLinks,
    setSavedLinks,
    feData,
    fmData,
    fcData,
    editMode,
    setViewMode,
    setSelectedProcess,
    justConfirmedRef,
    linkStats,
  });

  // ========== ✅ 탭 진입 시 누락 FM 자동 고장매칭 — 비활성화 (수동 버튼으로만 실행) ==========
  // ★★★ 2026-03-12 FIX: 대량 데이터(FM 152건+) 시 브라우저 멈춤 방지 — 고장매칭 버튼 수동 실행으로 변경 ★★★
  useEffect(() => {
    return;
  }, [fmData.length, feData.length, fcData.length, missingFMs.length, savedLinks.length, handleAutoMatchMissing, state]);

  // ========== ✅ 고아(Orphan) 감지 ==========
  const orphanIds = useMemo(() => {
    const validFmIds = new Set(fmData.map(fm => fm.id));
    const validFeIds = new Set(feData.map(fe => fe.id));
    const validFcIds = new Set(fcData.map(fc => fc.id));

    const orphanFmIds = new Set<string>();
    const orphanFeIds = new Set<string>();
    const orphanFcIds = new Set<string>();

    savedLinks.forEach(link => {
      if (link.fmId && !validFmIds.has(link.fmId)) orphanFmIds.add(link.fmId);
      if (link.feId && link.feId.trim() !== '' && !validFeIds.has(link.feId)) orphanFeIds.add(link.feId);
      if (link.fcId && link.fcId.trim() !== '' && !validFcIds.has(link.fcId)) orphanFcIds.add(link.fcId);
    });

    return { orphanFmIds, orphanFeIds, orphanFcIds };
  }, [savedLinks, fmData, feData, fcData]);

  // ========== ★ 전체 고아 자동 클리어 (stale 데이터 감지) ==========
  useEffect(() => {
    if (savedLinks.length === 0 || orphanIds.orphanFmIds.size === 0) return;
    // savedLinks의 모든 FM이 고아 → 이전 세션의 stale 데이터
    const allFmIdsInLinks = new Set(savedLinks.map(l => l.fmId));
    const validCount = Array.from(allFmIdsInLinks).filter(id => !orphanIds.orphanFmIds.has(id)).length;
    if (validCount === 0) {
      // 모든 FM이 고아 (stale 데이터) → 자동 초기화
      setSavedLinks([]);
    }
  }, [orphanIds.orphanFmIds, savedLinks]);

  // ========== 고아 FM을 fmData에 추가 (UI 표시용) ==========
  const fmDataWithOrphans = useMemo(() => {
    if (orphanIds.orphanFmIds.size === 0) return fmData;

    const orphanFMs: FMItem[] = [];
    const addedIds = new Set<string>();

    savedLinks.forEach(link => {
      if (orphanIds.orphanFmIds.has(link.fmId) && !addedIds.has(link.fmId)) {
        orphanFMs.push({
          id: link.fmId,
          fmNo: `🗑️${link.fmNo || 'M?'}`,
          processName: link.fmProcess || '삭제됨',
          processNo: link.fmProcessNo || '',
          text: link.fmText || '(삭제된 고장형태)',
        });
        addedIds.add(link.fmId);
      }
    });

    return [...fmData, ...orphanFMs];
  }, [fmData, orphanIds.orphanFmIds, savedLinks]);

  // ========== 전체확정/고아관리 hooks ==========
  const {
    handleConfirmAll,
    handleEditMode,
    handleDeleteOrphanFM,
    handleRestoreOrphanFM,
    savedLinksWithoutOrphans,
  } = useLinkConfirm({
    state,
    setState,
    setStateSynced,
    setDirty,
    saveTemp,
    saveToLocalStorage,
    saveAtomicDB,
    savedLinks,
    setSavedLinks,
    fmData,
    linkStats,
    orphanIds,
  });

  // ========== FM 선택 시 연결된 FE/FC 로드 ==========
  useEffect(() => {
    if (justConfirmedRef.current) {
      justConfirmedRef.current = false;
      return;
    }

    if (!currentFMId) {
      setLinkedFEs(new Map());
      setLinkedFCs(new Map());
      return;
    }

    const newFEs = new Map<string, FEItem>();
    const newFCs = new Map<string, FCItem>();

    // ★ PFMEA 공정 필터: 기본=해당공정만, 토글ON=앞공정 포함
    const fm = fmData.find(f => f.id === currentFMId);
    const fmProcessName = fm?.processName || '';
    const fmOrder = fm ? getProcessOrder(fmProcessName) : 9999;

    const fmLinks = savedLinks.filter(l => l.fmId === currentFMId);

    fmLinks.forEach(link => {
      if (link.feId && link.feId.trim() !== '') {
        const feItem = feData.find(f => f.id === link.feId);
        if (feItem) {
          newFEs.set(feItem.id, feItem);
        } else if (link.feText) {
          // ★★★ 2026-02-28 FIX: ID 불일치 시 텍스트 매칭으로 feData FE 사용 ★★★
          // Import dedup 후 feId가 feData와 다를 수 있음 → 텍스트 매칭 우선
          const normText = link.feText.trim().toLowerCase().replace(/\s+/g, ' ');
          const matchByText = feData.find(f =>
            f.text.trim().toLowerCase().replace(/\s+/g, ' ') === normText
          );
          if (matchByText) {
            newFEs.set(matchByText.id, matchByText);
          } else {
            const rawFe = rawFeById.get(link.feId);
            const tempFE: FEItem = {
              id: link.feId,
              feNo: link.feNo || '',
              scope: link.feScope || rawFe?.scope || '',
              text: link.feText || rawFe?.text || '',
              severity: link.severity ?? rawFe?.severity ?? 0,
              functionName: (link as any).feFunctionName || '',
              requirement: (link as any).feRequirement || '',
            };
            newFEs.set(link.feId, tempFE);
          }
        }
      }

      if (link.fcId && link.fcId.trim() !== '') {
        // ★ PFMEA 공정 필터: 기본=해당공정만, includeUpstream=앞공정 포함
        const fcProcessName = link.fcProcess || '';
        const isAllowed = includeUpstream
          ? (fcProcessName ? getProcessOrder(fcProcessName) <= fmOrder : true)  // 앞공정+해당공정
          : (fcProcessName === fmProcessName || !fcProcessName);               // 해당공정만
        if (!isAllowed) return;

        const fcItem = fcData.find(f => f.id === link.fcId);
        if (fcItem) {
          const itemAllowed = includeUpstream
            ? getProcessOrder(fcItem.processName) <= fmOrder
            : (fcItem.processName === fmProcessName);
          if (!itemAllowed) return;
          newFCs.set(fcItem.id, fcItem);
        } else if (link.fcText) {
          // ★★★ 2026-02-28 FIX: FC도 동일 패턴 — 텍스트 매칭 우선 ★★★
          const normText = link.fcText.trim().toLowerCase().replace(/\s+/g, ' ');
          const matchByText = fcData.find(f =>
            f.text.trim().toLowerCase().replace(/\s+/g, ' ') === normText
          );
          if (matchByText) {
            const matchAllowed = includeUpstream
              ? getProcessOrder(matchByText.processName) <= fmOrder
              : (matchByText.processName === fmProcessName);
            if (!matchAllowed) return;
            newFCs.set(matchByText.id, matchByText);
          } else {
            const rawFc = rawFcById.get(link.fcId);
            const rawProcessName = link.fcProcess || rawFc?.processName || '';
            const rawAllowed = includeUpstream
              ? (rawProcessName ? getProcessOrder(rawProcessName) <= fmOrder : true)
              : (rawProcessName === fmProcessName || !rawProcessName);
            if (!rawAllowed) return;
            const tempFC: FCItem = {
              id: link.fcId,
              fcNo: link.fcNo || '',
              processName: rawProcessName,
              m4: link.fcM4 || '',
              workElem: link.fcWorkElem || '',
              text: link.fcText || rawFc?.text || '',
              workFunction: (link as any).fcWorkFunction || '',
              processChar: (link as any).fcProcessChar || '',
            };
            newFCs.set(link.fcId, tempFC);
          }
        }
      }
    });

    setLinkedFEs(newFEs);
    setLinkedFCs(newFCs);
  }, [currentFMId, savedLinks, feData, fcData, rawFeById, rawFcById, fmData, getProcessOrder, includeUpstream]);

  // ========== 엔터키로 연결확정 ==========
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === 'Enter' && currentFMId && (linkedFEs.size > 0 || linkedFCs.size > 0)) {
        e.preventDefault();
        confirmLink();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentFMId, linkedFEs.size, linkedFCs.size, confirmLink]);

  // ========== 필수 분석 확정 여부 체크 ==========
  // 확정 상태 확인 로그 비활성화 (성능)

  // ✅ Fallback: 실제 데이터 존재 여부 확인 (확정 플래그가 false여도 데이터가 있으면 통과)
  const hasFailureEffects = (state.l1?.failureScopes || []).length > 0;
  const hasFailureModes = (state.l2 || []).some((p: any) => (p.failureModes || []).length > 0);
  const hasFailureCauses = (state.l2 || []).some((p: any) =>
    (p.failureCauses || []).length > 0 ||
    (p.l3 || []).some((we: any) => (we.failureCauses || []).length > 0)
  );

  // 데이터 존재 여부 로그 비활성화 (성능)

  // ✅ 확정 플래그 또는 실제 데이터 존재 여부로 판단
  const allAnalysisConfirmed = (isL1Confirmed || hasFailureEffects) &&
    (isL2Confirmed || hasFailureModes) &&
    (isL3Confirmed || hasFailureCauses);
  const missingAnalysis: string[] = [];
  if (!isL1Confirmed && !hasFailureEffects) missingAnalysis.push('1L 고장영향');
  if (!isL2Confirmed && !hasFailureModes) missingAnalysis.push('2L 고장형태');
  if (!isL3Confirmed && !hasFailureCauses) missingAnalysis.push('3L 고장원인');

  // ========== 렌더링 ==========

  // ✅ 미확정 상태 경고 화면
  if (!allAnalysisConfirmed) {
    return (
      <div style={{ ...containerStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#e65100' }}>
          고장분석이 완료되지 않았습니다
        </div>
        <div style={{ fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 1.8 }}>
          고장연결을 진행하려면 아래 분석을 먼저 완료하고 확정해주세요:
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {missingAnalysis.map(name => (
              <div key={name} style={{
                padding: '8px 20px',
                background: '#fff3e0',
                border: '1px solid #ffb74d',
                borderRadius: 6,
                color: '#e65100',
                fontWeight: 600
              }}>
                ❌ {name} 분석 미확정
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 16, fontSize: 11, color: '#999' }}>
          각 분석 탭에서 "확정" 버튼을 눌러 분석을 완료해주세요
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* ★★★ 2026-03-12: 고장매칭 로딩 오버레이 ★★★ */}
      {isMatching && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.45)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '32px 48px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>고장매칭 진행 중...</div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 6 }}>Matching in progress. Please wait.</div>
          </div>
        </div>
      )}
      {/* 좌측: 3개 테이블 (60%) */}
      <FailureLinkTables
        feData={feData}
        fmData={fmDataWithOrphans}
        fcData={fcData}
        currentFMId={currentFMId}
        linkedFEIds={new Set(linkedFEs.keys())}
        linkedFCIds={new Set(linkedFCs.keys())}
        linkStats={linkStats}
        selectedProcess={selectedProcess}
        feFcFilter={feFcFilter}
        orphanFmIds={orphanIds.orphanFmIds}
        orphanFeIds={orphanIds.orphanFeIds}
        orphanFcIds={orphanIds.orphanFcIds}
        onSelectFM={(id: string) => {
          selectFM(id);
          // ★ FM 클릭 시 FE/FC 필터 자동 전환
          const fm = fmDataWithOrphans.find(f => f.id === id);
          if (fm) setFeFcFilter(fm.processName);
        }}
        onToggleFE={toggleFE}
        onToggleFC={toggleFC}
        onUnlinkFE={unlinkFE}
        onUnlinkFC={unlinkFC}
        onDeleteOrphanFM={handleDeleteOrphanFM}
        onRestoreOrphanFM={handleRestoreOrphanFM}
        onProcessChange={(process: string) => {
          setSelectedProcess(process);
          // ★ FM 공정 선택 시 FC 필터도 자동 동기화 (같은 공정의 원인을 보여줘야 함)
          setFeFcFilter(process);
          // ✅ ALL 버튼 클릭 시 전체 화면(result)으로 전환
          if (process === 'all') {
            setViewMode('result');
          }
        }}
        onFeFcFilterChange={setFeFcFilter}
      />

      {/* 우측: 토글 화면 (40%) */}
      <div style={rightPanelStyle}>
        {/* ⚠️ 누락 경고 배너 (FM부분연결 + FE/FC 미연결) - 컴팩트 */}
        {totalMissingCount > 0 && !isConfirmed && (
          <div style={{
            background: 'linear-gradient(135deg, #ff9800, #e65100)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '4px',
            margin: '4px 8px',
            boxShadow: '0 2px 6px rgba(255, 152, 0, 0.3)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>⚠️ 누락: {[
                missingFMs.length > 0 ? `FM ${missingFMs.length}건` : '',
                missingFCs.length > 0 ? `FC ${missingFCs.length}건` : '',
                missingFEs.length > 0 ? `FE ${missingFEs.length}건` : '',
              ].filter(Boolean).join(', ')}</span>
              {missingFMs.length > 0 && (
                <button
                  disabled={isMatching}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMatching(true);
                    setTimeout(async () => {
                      let result: { success: boolean; message: string } | undefined;
                      try { result = await handleAutoMatchMissing(); } finally { setIsMatching(false); }
                      if (result?.message) {
                        requestAnimationFrame(() => alert(result!.message));
                      }
                    }, 50);
                  }}
                  style={{
                    background: isMatching ? '#ccc' : '#fff',
                    color: isMatching ? '#666' : '#e65100',
                    border: '1px solid #fff',
                    borderRadius: 3,
                    padding: '1px 8px',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: isMatching ? 'wait' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isMatching ? '⏳ 매칭 중...' : '🔗 고장매칭'}
                </button>
              )}
            </div>
            <div style={{ maxHeight: 110, overflowY: 'auto', fontSize: 10 }}>
              {/* 누락 FM */}
              {missingFMs.map(fm => (
                <div
                  key={`fm-${fm.id}`}
                  onClick={() => {
                    selectFM(fm.id);
                    setSelectedProcess(fm.processName);
                    setFeFcFilter(fm.processName);
                    setViewMode('diagram');
                    // ★★★ 2026-02-28: 좌측 테이블 관련 행 스크롤 ★★★
                    setTimeout(() => {
                      document.querySelector(`[data-fm-id="${fm.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 150);
                  }}
                  style={{
                    padding: '2px 6px', margin: '1px 0', borderRadius: '3px',
                    background: 'rgba(255,255,255,0.15)', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: 8,
                  }}
                  title={`${fm.processName} - ${fm.text} (클릭하여 이동)`}
                >
                  <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1 }}>
                    FM {fm.fmNo} [{fm.processName}] {fm.text}
                  </span>
                  <span style={{ fontSize: 9, opacity: 0.9, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {fm.missingFE && fm.missingFC ? 'FE·FC없음' : fm.missingFE ? 'FE없음' : 'FC없음'}
                  </span>
                </div>
              ))}
              {/* 누락 FE - 클릭 시 가장 연관 높은 FM 자동 선택 + diagram 이동 */}
              {missingFEs.map(fe => {
                // ★ FE 텍스트와 가장 연관 높은 FM 찾기 (텍스트 유사도 기반)
                const bestFM = (() => {
                  if (fmData.length === 0) return null;
                  // 1순위: FE의 functionName과 FM의 processFunction이 일치
                  if (fe.functionName) {
                    const byFunc = fmData.find(fm => fm.processFunction === fe.functionName);
                    if (byFunc) return byFunc;
                  }
                  // 2순위: FE의 requirement와 FM의 productChar가 일치
                  if (fe.requirement) {
                    const byReq = fmData.find(fm => fm.productChar === fe.requirement);
                    if (byReq) return byReq;
                  }
                  // 3순위: FE 텍스트와 FM 텍스트 키워드 겹침 (2글자 이상 단어)
                  const feWords = fe.text.replace(/[^\w가-힣]/g, ' ').split(/\s+/).filter(w => w.length >= 2);
                  let bestMatch: FMItem | null = null;
                  let bestScore = 0;
                  for (const fm of fmData) {
                    const fmWords = `${fm.text} ${fm.processFunction || ''} ${fm.productChar || ''}`.replace(/[^\w가-힣]/g, ' ').split(/\s+/).filter(w => w.length >= 2);
                    const overlap = feWords.filter(w => fmWords.some(fw => fw.includes(w) || w.includes(fw))).length;
                    if (overlap > bestScore) {
                      bestScore = overlap;
                      bestMatch = fm;
                    }
                  }
                  if (bestMatch && bestScore > 0) return bestMatch;
                  // 4순위: 첫 번째 FM (폴백)
                  return fmData[0];
                })();
                return (
                  <div
                    key={`fe-${fe.id}`}
                    onClick={() => {
                      if (bestFM) {
                        setCurrentFMId(bestFM.id);
                        setSelectedProcess(bestFM.processName);
                        setFeFcFilter(bestFM.processName);
                      }
                      setViewMode('diagram');
                      // ★★★ 2026-02-28: 좌측 FE+FM 행 스크롤 ★★★
                      setTimeout(() => {
                        document.querySelector(`[data-fe-id="${fe.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        if (bestFM) {
                          document.querySelector(`[data-fm-id="${bestFM.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }, 150);
                    }}
                    style={{
                      padding: '2px 6px', margin: '1px 0', borderRadius: '3px',
                      background: 'rgba(255,255,255,0.15)', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      gap: 8,
                    }}
                    title={bestFM
                      ? `클릭: FM ${bestFM.fmNo} "${bestFM.text}" 선택 → FE 연결`
                      : `FE ${fe.feNo} "${fe.text}" - FM 선택 후 연결해주세요`}
                  >
                    <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1 }}>
                      FE {fe.feNo} [{fe.scope}] {fe.text}
                    </span>
                    <span style={{ fontSize: 9, opacity: 0.9, color: bestFM ? '#bbdefb' : '#ffcdd2', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {bestFM ? `→ ${bestFM.fmNo}` : '미연결'}
                    </span>
                  </div>
                );
              })}
              {/* 누락 FC - 클릭 시 해당 공정 FM으로 이동 (사용자가 직접 연결) */}
              {missingFCs.map(fc => {
                const candidateFMs = fmData.filter(fm => fm.processName === fc.processName);
                const targetFM = candidateFMs[0] || null;
                return (
                  <div
                    key={`fc-${fc.id}`}
                    onClick={() => {
                      if (targetFM) {
                        setCurrentFMId(targetFM.id);
                        setSelectedProcess(targetFM.processName);
                        setFeFcFilter(targetFM.processName);
                        setViewMode('diagram');
                      } else {
                        setFeFcFilter(fc.processName);
                        setViewMode('diagram');
                      }
                      // ★★★ 2026-02-28: 좌측 FC+FM 행 스크롤 ★★★
                      setTimeout(() => {
                        document.querySelector(`[data-fc-id="${fc.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        if (targetFM) {
                          document.querySelector(`[data-fm-id="${targetFM.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }, 150);
                    }}
                    style={{
                      padding: '2px 6px', margin: '1px 0', borderRadius: '3px',
                      background: 'rgba(255,255,255,0.15)', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      gap: 8,
                    }}
                    title={targetFM
                      ? `클릭: FM ${targetFM.fmNo} "${targetFM.text}" 공정으로 이동 → 직접 연결`
                      : `FC ${fc.fcNo} - 같은 공정의 FM 없음`}
                  >
                    <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1 }}>
                      FC {fc.fcNo} [{fc.processName}] {fc.text}
                    </span>
                    <span style={{ fontSize: 9, opacity: 0.9, color: targetFM ? '#bbdefb' : '#ffcdd2', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {targetFM ? `→ ${targetFM.fmNo}` : 'FM없음'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ⚠️ 심각도 누락 배너 — 확정 여부와 무관하게 항상 표시 */}
        {/* ✅ 고장연결 완료 배너 + ALL 화면 이동 버튼 */}
        {/* ★★★ FM+FE+FC 모두 누락 0이어야 완전 완료 ★★★ */}
        {totalMissingCount === 0 && savedLinks.length > 0 && !isConfirmed && (
          <div style={{
            background: 'linear-gradient(135deg, #4caf50, #2e7d32)',
            color: '#fff',
            padding: '6px 10px',
            borderRadius: '6px',
            margin: '4px 8px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
              🎉 모든 고장연결이 완료되었습니다!
            </div>
            <div style={{ fontSize: 10, opacity: 0.9, marginBottom: 4 }}>
              아래 [전체확정] 버튼을 눌러 확정해주세요
            </div>
            <button
              onClick={() => {
                setState((prev: any) => ({ ...prev, tab: 'all', allViewSection: 'failure' }));
                try {
                  const stateId = (state as any)?.fmeaId || 'default';
                  localStorage.setItem(`pfmea_tab_${stateId}`, 'all');
                } catch (e) { /* ignore */ }
              }}
              style={{
                background: '#fff',
                color: '#2e7d32',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
              }}
            >
              📊 ALL 화면에서 결과 확인
            </button>
          </div>
        )}

        {/* 헤더 — 2줄 레이아웃 */}
        <div style={{ ...rightHeaderStyle, flexWrap: 'wrap', gap: 3, flexDirection: 'column', padding: '3px 4px' }}>
        {/* 1행: 통계 배지 */}
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'nowrap', width: '100%' }}>
          <span style={{ fontSize: 9, color: '#666', fontWeight: 600, whiteSpace: 'nowrap' }}>연결현황:</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#1565c0', background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 3, padding: '1px 5px', whiteSpace: 'nowrap' }}>FE:{linkStats.feLinkedCount}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#e65100', background: '#fff3e0', border: '1px solid #ffb74d', borderRadius: 3, padding: '1px 5px', whiteSpace: 'nowrap' }}>FM:{linkStats.fmLinkedCount}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#2e7d32', background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 3, padding: '1px 5px', whiteSpace: 'nowrap' }}>FC:{linkStats.fcLinkedCount}</span>
          {totalMissingCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#d32f2f', background: '#ffebee', border: '1px solid #ef9a9a', borderRadius: 3, padding: '1px 5px', whiteSpace: 'nowrap' }}>Miss:{totalMissingCount}</span>}
        </div>
        {/* 2행: 액션 버튼 */}
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'nowrap', width: '100%' }}>
          {/* Confirm / Re-Confirm */}
          <button
            onClick={confirmLink}
            disabled={!currentFMId || (linkedFEs.size === 0 && linkedFCs.size === 0)}
            className={currentFMId && (linkedFEs.size > 0 || linkedFCs.size > 0) ? 'blink-orange' : ''}
            title={isCurrentFMLinked ? 'Re-confirm current FM links' : 'Confirm current FM links'}
            style={{
              ...actionButtonStyle({
                bg: isCurrentFMLinked ? '#1565c0' : '#ef6c00',
                color: '#fff',
                opacity: (!currentFMId || (linkedFEs.size === 0 && linkedFCs.size === 0)) ? 0.5 : 1
              }),
              whiteSpace: 'nowrap', minWidth: 'fit-content', fontSize: 10, padding: '3px 6px',
            }}
          >
            {isCurrentFMLinked ? 'Re-Confirm' : 'Confirm'}
          </button>

          {/* ★ 고장수정 버튼 */}
          <button
            onClick={() => setViewMode('result')}
            style={{
              padding: '3px 8px', fontSize: 10, fontWeight: 700,
              border: '1px solid #7b1fa2', borderRadius: 3, cursor: 'pointer',
              whiteSpace: 'nowrap', background: '#f3e5f5', color: '#7b1fa2',
            }}
            title="고장사슬 연결 편집 — FE/FM/FC 수동 연결·조정"
          >
            ✏️ 고장수정
          </button>

          {/* Link Table */}
          <button onClick={() => setViewMode('result')} style={modeButtonStyle(viewMode === 'result')} title="FE↔FM↔FC link table">
            Table
          </button>

          {/* Chain Diagram */}
          <button onClick={() => setViewMode('diagram')} style={modeButtonStyle(viewMode === 'diagram')} title="FE→FM→FC chain diagram">
            Chain
          </button>

          {/* FA → ALL tab */}
          {isCurrentFMLinked && (
            <button
              onClick={() => {
                setState((prev: any) => {
                  let newVisibleSteps = prev.visibleSteps;
                  if (Array.isArray(prev.visibleSteps)) {
                    if (!prev.visibleSteps.includes(4)) {
                      newVisibleSteps = [...prev.visibleSteps, 4].sort((a: number, b: number) => a - b);
                    }
                  } else {
                    newVisibleSteps = [2, 3, 4, 5, 6];
                  }
                  return { ...prev, tab: 'all', allViewSection: 'failure', visibleSteps: newVisibleSteps };
                });
                try {
                  const stateId = (state as any)?.fmeaId || 'default';
                  localStorage.setItem(`pfmea_tab_${stateId}`, 'all');
                } catch (e) { /* ignore */ }
                setTimeout(() => {
                  const el = document.getElementById('all-tab-scroll-wrapper');
                  if (el) el.scrollLeft = 1000;
                }, 300);
              }}
              title="Go to Failure Analysis in ALL tab"
              style={{
                ...actionButtonStyle({ bg: '#f57c00', color: '#fff', opacity: 1 }),
                whiteSpace: 'nowrap', minWidth: 'fit-content', fontSize: 10, padding: '3px 6px',
              }}
            >
              FA{isConfirmed && totalMissingCount === 0 ? ' ✓' : ''}
            </button>
          )}

          {/* Upstream toggle */}
          <label
            title="Include upstream FC"
            style={{
              display: 'flex', alignItems: 'center', gap: 2,
              fontSize: 10, fontWeight: 600,
              color: includeUpstream ? '#1565c0' : '#666',
              padding: '2px 4px',
              background: includeUpstream ? '#e3f2fd' : '#f5f5f5',
              border: `1px solid ${includeUpstream ? '#1565c0' : '#ccc'}`,
              borderRadius: 3, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <input
              type="checkbox"
              checked={includeUpstream}
              onChange={e => setIncludeUpstream(e.target.checked)}
              style={{ width: 11, height: 11, cursor: 'pointer' }}
            />
            Upstream
          </label>

          {/* Unlink */}
          {isCurrentFMLinked && (
            <button
              onClick={unlinkCurrentFM}
              title="Unlink current FM"
              style={{
                ...actionButtonStyle({ bg: '#ff5722', color: '#fff', opacity: 1 }),
                whiteSpace: 'nowrap', minWidth: 'fit-content', fontSize: 10, padding: '3px 6px',
              }}
            >
              Unlink
            </button>
          )}

          {/* Confirm All / Done / Edit */}
          {!isConfirmed ? (
            <button
              onClick={handleConfirmAll}
              disabled={savedLinks.length === 0}
              title="Confirm all FM links"
              style={{
                ...actionButtonStyle({
                  bg: totalMissingCount === 0 && savedLinks.length > 0 ? '#2e7d32' : '#4caf50',
                  color: '#fff',
                  opacity: savedLinks.length === 0 ? 0.5 : 1
                }),
                whiteSpace: 'nowrap', minWidth: 'fit-content', fontSize: 10, padding: '3px 6px',
                ...(totalMissingCount === 0 && savedLinks.length > 0 ? {
                  boxShadow: '0 0 8px rgba(46,125,50,0.7)',
                  animation: 'pulse 1.5s infinite',
                  fontWeight: 700,
                } : {})
              }}
            >
              Confirm All
            </button>
          ) : totalMissingCount === 0 ? (
            <button
              onClick={() => {
                setState((prev: any) => {
                  let newVisibleSteps = prev.visibleSteps;
                  if (Array.isArray(prev.visibleSteps)) {
                    if (!prev.visibleSteps.includes(4)) {
                      newVisibleSteps = [...prev.visibleSteps, 4].sort((a: number, b: number) => a - b);
                    }
                  } else {
                    newVisibleSteps = [2, 3, 4, 5, 6];
                  }
                  return { ...prev, tab: 'all', allViewSection: 'failure', visibleSteps: newVisibleSteps };
                });
                try {
                  const stateId = (state as any)?.fmeaId || 'default';
                  localStorage.setItem(`pfmea_tab_${stateId}`, 'all');
                } catch (e) { /* ignore */ }
                setTimeout(() => {
                  const el = document.getElementById('all-tab-scroll-wrapper');
                  if (el) el.scrollLeft = 1000;
                }, 300);
              }}
              title="All linked — go to Failure Analysis"
              style={{
                ...actionButtonStyle({ bg: '#1b5e20', color: '#fff', opacity: 1 }),
                boxShadow: '0 0 8px rgba(27,94,32,0.7)',
                fontWeight: 700, whiteSpace: 'nowrap', minWidth: 'fit-content',
                fontSize: 10, padding: '3px 6px',
              }}
            >
              Done ✓
            </button>
          ) : (
            <button
              onClick={handleEditMode}
              style={{
                ...actionButtonStyle({ bg: '#ff9800', color: '#fff' }),
                whiteSpace: 'nowrap', minWidth: 'fit-content', fontSize: 10, padding: '3px 6px',
              }}
            >
              Edit
            </button>
          )}
        </div>{/* 2행 end */}
        </div>{/* 2줄 헤더 end */}

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-auto" style={{ display: 'flex', flexDirection: 'column' }}>
          {viewMode === 'diagram' && (
            <FailureLinkDiagram
              currentFM={currentFM}
              linkedFEs={linkedFEs}
              linkedFCs={linkedFCs}
              svgPaths={svgPaths}
              chainAreaRef={chainAreaRef}
              fmNodeRef={fmNodeRef}
              feColRef={feColRef}
              fcColRef={fcColRef}
              onPrevFM={goToPrevFM}
              onNextFM={goToNextFM}
              hasPrevFM={hasPrevFM}
              hasNextFM={hasNextFM}
            />
          )}
          {viewMode === 'result' && (
            // ✅ 고장분석 결과 화면: FM 중심으로 FE(고장영향)↔FC(고장원인) 연결 표시 (고아 제외)
            <FailureLinkResult
              savedLinks={savedLinksWithoutOrphans}
              fmData={fmData}
              onToggleFullscreen={() => setIsResultFullscreen(prev => !prev)}
              onExcelExport={async () => {
                try {
                  const { exportLinkageExcel } = await import('../../excel-export-linkage');
                  await exportLinkageExcel(state, '');
                } catch (err) {
                  console.error('[연결표 엑셀 내보내기 오류]', err);
                  alert(`엑셀 내보내기 실패: ${err instanceof Error ? err.message : String(err)}`);
                }
              }}
            />
          )}
        </div>
      </div>

      {/* 전체화면 오버레이 (Portal → body 직접 렌더링, stacking context 회피) */}
      {isResultFullscreen && createPortal(
        <div style={fullscreenOverlayStyle}>
          <FailureLinkResult
            savedLinks={savedLinksWithoutOrphans}
            fmData={fmData}
            isFullscreen
            onToggleFullscreen={() => setIsResultFullscreen(false)}
            onExcelExport={async () => {
              try {
                const { exportLinkageExcel } = await import('../../excel-export-linkage');
                await exportLinkageExcel(state, '');
              } catch (err) {
                console.error('[연결표 엑셀 내보내기 오류]', err);
                alert(`엑셀 내보내기 실패: ${err instanceof Error ? err.message : String(err)}`);
              }
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
