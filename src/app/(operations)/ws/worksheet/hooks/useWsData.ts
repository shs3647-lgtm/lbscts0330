/**
 * @file useWsData.ts
 * @description WS 데이터 로드 + 상태 관리 훅 (PFD 훅 기반, WS 독립)
 * @version 1.0.0 - 2026-02-01
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PfdState, PfdItem } from '../types';
import { getChangeMarkers, ChangeMarker } from '@/lib/change-history';

interface UseWsDataOptions {
    /** URL wsNo 파라미터 */
    wsNoParam: string;
    /** URL cpNo 파라미터 */
    cpNoParam: string;
    /** sync 모드 여부 */
    syncMode: boolean;
}

interface UseWsDataReturn {
    /** WS 상태 */
    state: PfdState;
    /** 상태 업데이트 */
    setState: React.Dispatch<React.SetStateAction<PfdState>>;
    /** 로딩 상태 */
    loading: boolean;
    /** WS 목록 (드롭다운용) */
    wsList: Array<{ id: string; wsNo: string; subject?: string }>;
    /** 변경 마커 */
    changeMarkers: ChangeMarker;
    /** 변경 마커 설정 */
    setChangeMarkers: React.Dispatch<React.SetStateAction<ChangeMarker>>;
    /** WS 데이터 로드 함수 */
    loadWsData: (targetWsNo: string) => Promise<boolean>;
}

/**
 * WS ID 유효성 검사 함수
 */
const isValidWsNo = (wsNo: string): boolean => {
    if (!wsNo) return false;
    // 테스트 데이터 패턴 명시적 거부
    if (/^ws-?test/i.test(wsNo)) return false;
    // 타임스탬프 패턴 거부
    if (/\d{13}$/.test(wsNo)) return false;
    // WS 패턴 허용
    return /^ws/i.test(wsNo);
};

/**
 * WS 데이터 관리 훅
 */
export function useWsData(options: UseWsDataOptions): UseWsDataReturn {
    const { wsNoParam, cpNoParam, syncMode } = options;
    const router = useRouter();

    // 상태 관리
    const [state, setState] = useState<PfdState>({
        pfdNo: wsNoParam, // WS에서는 pfdNo를 wsNo로 사용
        fmeaId: '',
        cpNo: cpNoParam,
        partName: '',
        customer: '',
        items: [],
        dirty: false,
    });

    const [loading, setLoading] = useState(true);
    const [wsList, setWsList] = useState<Array<{ id: string; wsNo: string; subject?: string }>>([]);
    const [changeMarkers, setChangeMarkers] = useState<ChangeMarker>({});

    // WS 데이터 로드 함수
    const loadWsData = useCallback(async (targetWsNo: string) => {
        try {
            // WS API 호출 (현재는 PFD API 참조, 추후 WS API 구현 시 변경)
            const wsRes = await fetch(`/api/pfd/${targetWsNo}`);
            if (wsRes.ok) {
                const wsData = await wsRes.json();
                if (wsData.success) {
                    setState(prev => ({
                        ...prev,
                        pfdNo: targetWsNo,
                        cpNo: wsData.data?.cpNo || prev.cpNo || '',
                        partName: wsData.data?.partName || prev.partName || '',
                        customer: wsData.data?.customer || prev.customer || '',
                        items: wsData.data?.items || [],
                        dirty: false,
                    }));

                    // 변경 마커 로드 (WS용 - pfd 타입 재사용)
                    const markers = getChangeMarkers('pfd', targetWsNo);
                    setChangeMarkers(markers);

                    return true;
                }
            }
        } catch (error) {
            console.error('WS 로드 실패:', error);
        }
        return false;
    }, []);

    // 초기 데이터 로드 - WS는 리다이렉트 없이 빈 상태로 시작
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);

            try {
                // wsNo가 있으면 DB에서 직접 로드
                if (wsNoParam) {
                    const loaded = await loadWsData(wsNoParam);
                    if (loaded) {
                        setLoading(false);
                        return;
                    }
                }

                // ★ WS는 리다이렉트 없이 빈 상태로 시작 (PFD와 다름)
                setState(prev => ({
                    ...prev,
                    items: [],
                    dirty: false,
                }));
            } catch (error) {
                console.error('❌ [WS 워크시트] 데이터 로드 실패:', error);
            }

            setLoading(false);
        };

        loadData();
    }, [wsNoParam, syncMode, loadWsData]);

    // 로컬 저장 (Draft)
    useEffect(() => {
        if (state.dirty && state.pfdNo) {
            const draftData = {
                items: state.items,
                savedAt: new Date().toISOString(),
            };
            localStorage.setItem(`ws_draft_${state.pfdNo}`, JSON.stringify(draftData));
        }
    }, [state.items, state.dirty, state.pfdNo]);

    return {
        state,
        setState,
        loading,
        wsList,
        changeMarkers,
        setChangeMarkers,
        loadWsData,
    };
}

export default useWsData;
