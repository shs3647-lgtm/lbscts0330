/**
 * @file usePfdData.ts
 * @description PFD 데이터 로드 + 상태 관리 훅
 * @extracted-from page.tsx (lines 41-435)
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PfdState, PfdItem } from '../types';
import { getChangeMarkers, ChangeMarker } from '@/lib/change-history';

interface UsePfdDataOptions {
    /** URL pfdNo 파라미터 */
    pfdNoParam: string;
    /** URL fmeaId 파라미터 */
    fmeaIdParam: string;
    /** URL cpNo 파라미터 */
    cpNoParam: string;
    /** sync 모드 여부 */
    syncMode: boolean;
}

interface UsePfdDataReturn {
    /** PFD 상태 */
    state: PfdState;
    /** 상태 업데이트 */
    setState: React.Dispatch<React.SetStateAction<PfdState>>;
    /** 로딩 상태 */
    loading: boolean;
    /** PFD 목록 (드롭다운용) */
    pfdList: Array<{ id: string; pfdNo: string; subject?: string }>;
    /** 변경 마커 */
    changeMarkers: ChangeMarker;
    /** 변경 마커 설정 */
    setChangeMarkers: React.Dispatch<React.SetStateAction<ChangeMarker>>;
    /** PFD 데이터 로드 함수 */
    loadPfdData: (targetPfdNo: string) => Promise<boolean>;
}

/**
 * PFD ID 유효성 검사 함수
 */
const isValidPfdNo = (pfdNo: string): boolean => {
    if (!pfdNo) return false;
    // 테스트 데이터 패턴 명시적 거부
    if (/^pfd-?test/i.test(pfdNo)) return false;
    // 타임스탬프 패턴 거부
    if (/\d{13}$/.test(pfdNo)) return false;
    // PFD 패턴 허용
    return /^pfdl?/i.test(pfdNo);
};

/**
 * PFD 데이터 관리 훅
 */
export function usePfdData(options: UsePfdDataOptions): UsePfdDataReturn {
    const { pfdNoParam, fmeaIdParam, cpNoParam, syncMode } = options;
    const router = useRouter();

    // 상태 관리
    const [state, setState] = useState<PfdState>({
        pfdNo: pfdNoParam,
        fmeaId: fmeaIdParam,
        cpNo: cpNoParam,
        partName: '',
        customer: '',
        items: [],
        dirty: false,
    });

    const [loading, setLoading] = useState(true);
    const [pfdList, setPfdList] = useState<Array<{ id: string; pfdNo: string; subject?: string }>>([]);
    const [changeMarkers, setChangeMarkers] = useState<ChangeMarker>({});

    // PFD 데이터 로드 함수
    const loadPfdData = useCallback(async (targetPfdNo: string) => {
        try {
            const pfdRes = await fetch(`/api/pfd/${targetPfdNo}`);
            if (pfdRes.ok) {
                const pfdData = await pfdRes.json();
                if (pfdData.success) {
                    setState(prev => ({
                        ...prev,
                        pfdNo: targetPfdNo,
                        fmeaId: pfdData.data?.fmeaId || prev.fmeaId || '',
                        cpNo: pfdData.data?.cpNo || prev.cpNo || '',
                        partName: pfdData.data?.partName || prev.partName || '',
                        customer: pfdData.data?.customer || prev.customer || '',
                        items: pfdData.data?.items || [],
                        dirty: false,
                    }));

                    // 변경 마커 로드
                    const markers = getChangeMarkers('pfd', targetPfdNo);
                    setChangeMarkers(markers);

                    return true;
                }
            }
        } catch (error) {
            console.error('PFD 로드 실패:', error);
        }
        return false;
    }, []);

    // PFD 목록 로드
    useEffect(() => {
        const loadPfdList = async () => {
            try {
                const res = await fetch('/api/pfd');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.data) {
                        const pfds = data.data
                            .filter((pfd: any) => isValidPfdNo(pfd.pfdNo))
                            .map((pfd: any) => ({
                                id: pfd.pfdNo,
                                pfdNo: pfd.pfdNo,
                                subject: pfd.subject || '',
                            }));
                        setPfdList(pfds);
                    }
                }
            } catch (error) {
                console.error('PFD 목록 로드 실패:', error);
            }
        };

        loadPfdList();
    }, []);

    // 초기 데이터 로드
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);

            try {
                // pfdNo가 있으면 DB에서 직접 로드
                if (pfdNoParam) {
                    const loaded = await loadPfdData(pfdNoParam);
                    if (loaded) {
                        setLoading(false);
                        return;
                    }
                }

                // pfdNo 미지정 시 최신 PFD 자동 로드
                if (!pfdNoParam && !syncMode) {
                    const latestRes = await fetch('/api/pfd?latest=true');
                    if (latestRes.ok) {
                        const latestData = await latestRes.json();
                        if (latestData.success && latestData.data?.pfdNo) {
                            const latestPfdNo = latestData.data.pfdNo.toLowerCase();
                            router.replace(`/pfd/worksheet?pfdNo=${latestPfdNo}`);
                            const loaded = await loadPfdData(latestPfdNo);
                            if (loaded) {
                                setLoading(false);
                                return;
                            }
                        }
                    }
                }

                // 데이터가 없으면 빈 상태로 시작
                setState(prev => ({
                    ...prev,
                    items: [],
                    dirty: false,
                }));
            } catch (error) {
                console.error('❌ [PFD 워크시트] 데이터 로드 실패:', error);
            }

            setLoading(false);
        };

        loadData();
    }, [pfdNoParam, syncMode, loadPfdData, router]);

    // 로컬 저장 (Draft)
    useEffect(() => {
        if (state.dirty && state.pfdNo) {
            const draftData = {
                items: state.items,
                savedAt: new Date().toISOString(),
            };
            localStorage.setItem(`pfd_draft_${state.pfdNo}`, JSON.stringify(draftData));
        }
    }, [state.items, state.dirty, state.pfdNo]);

    return {
        state,
        setState,
        loading,
        pfdList,
        changeMarkers,
        setChangeMarkers,
        loadPfdData,
    };
}

export default usePfdData;
