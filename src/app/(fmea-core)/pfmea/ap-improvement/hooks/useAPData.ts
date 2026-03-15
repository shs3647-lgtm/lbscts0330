/**
 * @file useAPData.ts
 * @description AP 개선관리 데이터 로딩 훅 — 프로젝트 목록 + AP H/M 항목 조회
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { APItem, FMEAProjectSimple } from '../types';

interface UseAPDataReturn {
  projects: FMEAProjectSimple[];
  selectedFmeaId: string;
  setSelectedFmeaId: (id: string) => void;
  data: APItem[];
  loading: boolean;
  updateItem: (riskId: string, fmeaId: string, updates: Partial<APItem>) => Promise<boolean>;
  refresh: () => void;
}

export function useAPData(): UseAPDataReturn {
  const [projects, setProjects] = useState<FMEAProjectSimple[]>([]);
  const [selectedFmeaId, setSelectedFmeaId] = useState<string>('');
  const [data, setData] = useState<APItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. 프로젝트 목록 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/fmea/projects?type=P');
        const result = await res.json();
        if (cancelled) return;
        // API 응답: { success, projects, dbError? }
        // DB 에러 시에도 status 200 + projects: [] 반환됨
        const projectList = result.projects || [];
        if (projectList.length > 0) {
          const mapped: FMEAProjectSimple[] = projectList.map((p: Record<string, unknown>) => ({
            // API 응답의 id = fmeaId (lowercase)
            id: (p.id as string) || '',
            fmeaId: (p.id as string) || '',
            productName: (p.project as Record<string, string>)?.productName
              || (p.fmeaInfo as Record<string, string>)?.partName
              || (p.id as string)
              || '',
            fmeaType: (p.fmeaType as string) || 'P',
          }));
          setProjects(mapped);
          if (mapped.length > 0 && !selectedFmeaId) {
            setSelectedFmeaId(mapped[0].fmeaId);
          }
        } else if (result.dbError) {
          console.error('[useAPData] DB connection error:', result.error);
        }
      } catch (err) {
        console.error('[useAPData] Failed to load projects:', err);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. 선택된 프로젝트의 AP 데이터 로드 (RiskAnalysis + CIP 통합)
  const loadData = useCallback(async (fmeaId: string) => {
    if (!fmeaId) {
      setData([]);
      return;
    }
    setLoading(true);
    try {
      // RiskAnalysis + CIP 병렬 로드
      const [raRes, cipRes] = await Promise.all([
        fetch(`/api/ap-improvement?fmeaId=${encodeURIComponent(fmeaId)}`),
        fetch(`/api/cip?fmeaId=${encodeURIComponent(fmeaId)}`),
      ]);
      const raResult = await raRes.json();
      const cipResult = await cipRes.json();

      const raItems: APItem[] = raResult.success ? (raResult.items || []) : [];

      // CIP → APItem 매핑
      const cipItems: APItem[] = (cipResult.success && cipResult.items)
        ? cipResult.items.map((cip: Record<string, unknown>) => {
            const improvement = (cip.improvement as string) || '';
            const statusMap: Record<string, string> = { G: '완료', Y: '진행중', R: '대기' };
            return {
              id: `cip-${cip.id}`,
              riskId: `cip-${cip.id}`,
              fmeaId: (cip.fmeaId as string) || '',
              linkId: '',
              ap5: ((cip.apLevel as string) || 'M') as APItem['ap5'],
              ap6: '' as APItem['ap6'],
              specialChar: '',
              category: '' as APItem['category'],
              preventiveControl: '',
              severity: (cip.s as number) || 0,
              failureMode: (cip.failureMode as string) || '',
              failureCause: (cip.cause as string) || '',
              occurrence: (cip.o as number) || 0,
              detectionControl: '',
              detection: (cip.d as number) || 0,
              preventionAction: extractCipAction(improvement, '예방'),
              detectionAction: extractCipAction(improvement, '검출'),
              responsible: (cip.responsible as string) || '',
              status: (statusMap[(cip.status as string) || 'R'] || '대기') as APItem['status'],
              dueDate: (cip.targetDate as string) || '',
              completedDate: (cip.completedDate as string) || undefined,
              processName: (cip.category as string) || '',
            };
          })
        : [];

      setData([...raItems, ...cipItems]);
    } catch (err) {
      console.error('[useAPData] Failed to load AP data:', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedFmeaId);
  }, [selectedFmeaId, loadData]);

  // 3. 단건 업데이트 (PATCH 후 로컬 상태 반영)
  const updateItem = useCallback(async (
    riskId: string,
    fmeaId: string,
    updates: Partial<APItem>
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/ap-improvement', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riskId,
          fmeaId,
          preventionAction: updates.preventionAction,
          detectionAction: updates.detectionAction,
          responsible: updates.responsible,
          targetDate: updates.dueDate,
          status: updates.status,
          newSeverity: updates.newSeverity,
          newOccurrence: updates.newOccurrence,
          newDetection: updates.newDetection,
          completedDate: updates.completedDate,
          remarks: updates.remarks,
        }),
      });
      const result = await res.json();
      if (result.success) {
        // 로컬 상태 업데이트
        setData(prev => prev.map(item => {
          if (item.riskId !== riskId) return item;
          return {
            ...item,
            ...updates,
            optId: result.optimization?.id || item.optId,
            ap6: (result.optimization?.newAP as APItem['ap6']) || item.ap6,
          };
        }));
        return true;
      }
      console.error('[useAPData] PATCH error:', result.error);
      return false;
    } catch (err) {
      console.error('[useAPData] Failed to update item:', err);
      return false;
    }
  }, []);

  // 4. 새로고침
  const refresh = useCallback(() => {
    loadData(selectedFmeaId);
  }, [selectedFmeaId, loadData]);

  return {
    projects,
    selectedFmeaId,
    setSelectedFmeaId,
    data,
    loading,
    updateItem,
    refresh,
  };
}

/** CIP improvement 필드에서 예방/검출 조치 분리 */
function extractCipAction(improvement: string, type: '예방' | '검출'): string {
  if (!improvement) return '';
  const tag = `[${type}]`;
  const parts = improvement.split(' | ');
  const found = parts.find(p => p.startsWith(tag));
  if (found) return found.replace(tag, '').trim();
  if (type === '예방' && !improvement.includes('[검출]')) return improvement;
  return '';
}
