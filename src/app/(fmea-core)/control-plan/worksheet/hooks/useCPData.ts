/**
 * @file useCPData.ts
 * @description CP 데이터 로드 및 상태 관리 훅
 * @extracted-from page.tsx (lines 574-750)
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CPState, CPItem } from '../types';
import { EPDevice } from '@/app/(fmea-core)/pfmea/worksheet/types/epDevice';

interface CPListItem {
    id: string;
    cpNo: string;
    subject?: string;
}

interface UseCPDataOptions {
    /** URL 파라미터: cpNo */
    cpNoParam: string;
    /** URL 파라미터: fmeaId */
    fmeaIdParam: string;
    /** 동기화 모드 여부 */
    syncMode: boolean;
}

interface UseCPDataReturn {
    /** CP 상태 */
    state: CPState;
    /** CP 상태 설정 */
    setState: React.Dispatch<React.SetStateAction<CPState>>;
    /** 로딩 상태 */
    loading: boolean;
    /** CP 목록 (드롭다운용) */
    cpList: CPListItem[];
    /** EP 장치 목록 */
    epDevices: EPDevice[];
    /** EP 장치 설정 */
    setEpDevices: React.Dispatch<React.SetStateAction<EPDevice[]>>;
    /** FMEA에서 데이터 동기화 */
    syncFromFmea: (fmeaId: string) => Promise<void>;
    /** CP 데이터 로드 */
    loadCpData: (targetCpNo: string) => Promise<boolean>;
}

/**
 * CP 데이터 로드 및 상태 관리 훅
 */
export function useCPData(options: UseCPDataOptions): UseCPDataReturn {
    const { cpNoParam, fmeaIdParam, syncMode } = options;
    const router = useRouter();

    // CP 상태
    const [state, setState] = useState<CPState>({
        cpNo: cpNoParam,
        fmeaId: fmeaIdParam,
        fmeaNo: '',
        linkedPfdNo: '',
        partName: '',
        customer: '',
        items: [],
        dirty: false,
    });

    const [loading, setLoading] = useState(true);
    const [cpList, setCpList] = useState<CPListItem[]>([]);
    const [epDevices, setEpDevices] = useState<EPDevice[]>([]);

    const syncFromFmea = useCallback(async (fmeaId: string) => {
        try {
            const res = await fetch(`/api/pfmea/${fmeaId}`);
            if (!res.ok) return;

            const data = await res.json();
            if (!data.success || !data.data) return;

            const fmea = data.data;
            const newItems: CPItem[] = [];
            const uid = () => `cpi-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

            const makeBase = (proc: any, charIdx: number): CPItem => ({
                id: uid(),
                cpId: cpNoParam,
                processNo: proc.no || '',
                processName: proc.name || '',
                processLevel: (proc.level || 'Main').trim(),
                processDesc: proc.function || proc.desc || '',
                partName: '',
                equipment: '',
                workElement: '',
                detectorNo: false,
                detectorEp: false,
                detectorAuto: false,
                epDeviceIds: '',
                autoDeviceIds: '',
                productChar: '',
                processChar: '',
                specialChar: '',
                charIndex: charIdx,
                specTolerance: '',
                evalMethod: '',
                sampleSize: '',
                sampleFreq: '',
                controlMethod: '',
                owner1: '',
                owner2: '',
                reactionPlan: '',
                sortOrder: newItems.length,
                refSeverity: null,
                refOccurrence: null,
                refDetection: null,
                refAp: null,
                linkStatus: 'linked',
            });

            (fmea.l2 || []).forEach((proc: any) => {
                let charIdx = 0;

                // L2 제품특성 매핑
                (proc.productChars || []).forEach((pc: any) => {
                    const item = makeBase(proc, charIdx++);
                    item.productChar = pc.name || '';
                    item.specialChar = pc.specialChar || '';
                    item.refSeverity = pc.severity ?? null;
                    newItems.push(item);
                });

                // L3 작업요소 + 공정특성 매핑
                (proc.l3 || []).forEach((l3: any) => {
                    const l3Name = (l3.name || '').trim();
                    if (!l3Name || l3Name.startsWith('00 ') || /^\d+\s+00\s/.test(l3Name)) return;
                    const m4 = (l3.m4 || l3.fourM || '').trim();
                    if (m4 === 'MN') return;

                    const pChars = (l3.processChars || l3.functions?.flatMap((f: any) => f.processChars || []) || []);

                    if (pChars.length > 0) {
                        pChars.forEach((pc: any) => {
                            const item = makeBase(proc, charIdx++);
                            item.equipment = l3Name;
                            item.workElement = l3Name;
                            item.processChar = pc.name || pc || '';
                            newItems.push(item);
                        });
                    } else {
                        const item = makeBase(proc, charIdx++);
                        item.equipment = l3Name;
                        item.workElement = l3Name;
                        newItems.push(item);
                    }
                });

                if (charIdx === 0) {
                    newItems.push(makeBase(proc, 0));
                }
            });

            if (newItems.length > 0) {
                setState(prev => ({
                    ...prev,
                    fmeaNo: fmea.fmeaNo || fmeaId,
                    partName: fmea.partName || fmea.project?.productName || '',
                    customer: fmea.customer || fmea.project?.customer || '',
                    items: newItems,
                    dirty: true,
                }));
            }
        } catch (error) {
            console.error('FMEA 동기화 실패:', error);
        }
    }, [cpNoParam]);

    // CP 데이터 로드
    const loadCpData = useCallback(async (targetCpNo: string): Promise<boolean> => {
        try {
            const cpRes = await fetch(`/api/control-plan/${targetCpNo}/items`);
            if (cpRes.ok) {
                const cpData = await cpRes.json();
                if (cpData.success) {
                    const cpHeader = cpData.cp || {};
                    setState(prev => {
                        const effectiveFmeaId = cpHeader.fmeaId || cpHeader.linkedPfmeaNo || prev.fmeaId || '';
                        return {
                            ...prev,
                            cpNo: targetCpNo,
                            fmeaId: effectiveFmeaId,
                            fmeaNo: cpHeader.fmeaNo || prev.fmeaNo || '',
                            linkedPfdNo: cpHeader.linkedPfdNo || prev.linkedPfdNo || '',
                            partName: cpHeader.partName || prev.partName || '',
                            customer: cpHeader.customer || prev.customer || '',
                            items: cpData.data || [],
                            dirty: false,
                            partNameMode: (cpHeader.partNameMode as 'A' | 'B') || 'A',
                            status: (cpHeader.status as 'draft' | 'review' | 'approved') || prev.status || 'draft',
                        };
                    });
                    return true;
                }
            }
        } catch (error) {
            console.error('CP 데이터 로드 오류:', error);
        }
        return false;
    }, []);

    // CP 목록 로드 (드롭다운용)
    useEffect(() => {
        const loadCpList = async () => {
            try {
                const res = await fetch('/api/control-plan');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.data) {
                        const cps = data.data.map((cp: any) => ({
                            id: cp.cpNo,
                            cpNo: cp.cpNo,
                            subject: cp.subject || '',
                        }));
                        setCpList(cps);
                    }
                }
            } catch (error) {
                console.error('CP 목록 로드 실패:', error);
            }
        };

        const timer = setTimeout(loadCpList, 100);
        return () => clearTimeout(timer);
    }, []);

    // EP검사장치 로드
    useEffect(() => {
        const loadEpDevices = async () => {
            try {
                const params = new URLSearchParams();
                if (state.cpNo && state.cpNo !== '__NEW__') params.set('cpNo', state.cpNo);
                if (state.fmeaId) params.set('fmeaId', state.fmeaId);

                const res = await fetch(`/api/ep-device?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.data) {
                        setEpDevices(data.data);
                    }
                }
            } catch (error) {
                console.error('EP검사장치 로드 실패:', error);
            }
        };

        const timer = setTimeout(loadEpDevices, 100);
        return () => clearTimeout(timer);
    }, [state.cpNo, state.fmeaId]);

    // 초기 데이터 로드
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);

            try {
                // cpNo 파라미터가 있으면 해당 CP 로드
                if (cpNoParam) {
                    const loaded = await loadCpData(cpNoParam);
                    if (loaded) {
                        setLoading(false);
                        return;
                    }
                }

                // cpNo 미지정 시 최신 CP 조회
                if (!cpNoParam && !syncMode) {
                    const latestRes = await fetch('/api/control-plan?latest=true');
                    if (latestRes.ok) {
                        const latestData = await latestRes.json();
                        if (latestData.success && latestData.data?.cpNo) {
                            const latestCpNo = latestData.data.cpNo.toLowerCase();
                            router.replace(`/control-plan/worksheet?cpNo=${latestCpNo}`);

                            const loaded = await loadCpData(latestCpNo);
                            if (loaded) {
                                setLoading(false);
                                return;
                            }
                        }
                    }
                }

                // FMEA 동기화 모드
                if (syncMode && fmeaIdParam) {
                    await syncFromFmea(fmeaIdParam);
                } else {
                    setState(prev => ({
                        ...prev,
                        items: [],
                        dirty: false,
                    }));
                }
            } catch (error) {
                console.error('❌ [CP 워크시트] 데이터 로드 실패:', error);
            }

            setLoading(false);
        };

        loadData();
    }, [cpNoParam, fmeaIdParam, syncMode, syncFromFmea, loadCpData, router]);

    return {
        state,
        setState,
        loading,
        cpList,
        epDevices,
        setEpDevices,
        syncFromFmea,
        loadCpData,
    };
}

export default useCPData;
