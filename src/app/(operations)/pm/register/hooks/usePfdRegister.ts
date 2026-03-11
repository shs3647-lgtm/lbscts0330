'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PFDInfo, PFDType, CFTMember, CFTAccessLog } from '../types/pfdRegister';
import { generatePFDId, generateLinkedPfdNo } from '../../utils/pfdIdUtils';

// 초기값
const INITIAL_PFD: PFDInfo = {
    companyName: '', engineeringLocation: '', customerName: '', modelYear: '',
    subject: '', pfdStartDate: '', pfdRevisionDate: '', pfdId: '', pfdType: 'P',
    processResponsibility: '', confidentialityLevel: '', securityLevel: '',
    pfdResponsibleName: '', linkedCpNo: '', createdAt: '', updatedAt: '',
};

const REQUIRED_ROLES = ['Champion', 'Technical Leader', 'Leader', 'PM', 'Moderator'];

const createInitialCFTMembers = (): CFTMember[] => [
    { id: crypto.randomUUID(), projectId: '', factory: '', role: 'Champion', name: '', department: '', position: '', responsibility: '', phone: '', email: '', remark: '' },
    { id: crypto.randomUUID(), projectId: '', factory: '', role: 'Technical Leader', name: '', department: '', position: '', responsibility: '', phone: '', email: '', remark: '' },
    { id: crypto.randomUUID(), projectId: '', factory: '', role: 'Leader', name: '', department: '', position: '', responsibility: '', phone: '', email: '', remark: '' },
    { id: crypto.randomUUID(), projectId: '', factory: '', role: 'PM', name: '', department: '', position: '', responsibility: '', phone: '', email: '', remark: '' },
    { id: crypto.randomUUID(), projectId: '', factory: '', role: 'Moderator', name: '', department: '', position: '', responsibility: '', phone: '', email: '', remark: '' },
    ...Array(5).fill(null).map(() => ({ id: crypto.randomUUID(), projectId: '', factory: '', role: 'CFT 팀원' as const, name: '', department: '', position: '', responsibility: '', phone: '', email: '', remark: '' })),
];

function ensureRequiredCFTRoles(members: CFTMember[]): CFTMember[] {
    const result = [...members];
    for (const role of REQUIRED_ROLES) {
        if (!result.some(m => m.role === role)) {
            result.push({ id: crypto.randomUUID(), projectId: '', factory: '', role, name: '', department: '', position: '', responsibility: '', phone: '', email: '', remark: '' });
        }
    }
    if (!result.some(m => m.role === 'CFT 팀원')) {
        result.push({ id: crypto.randomUUID(), projectId: '', factory: '', role: 'CFT 팀원', name: '', department: '', position: '', responsibility: '', phone: '', email: '', remark: '' });
    }
    const sorted: CFTMember[] = [];
    for (const role of REQUIRED_ROLES) { const m = result.find(x => x.role === role); if (m) sorted.push(m); }
    return [...sorted, ...result.filter(m => !REQUIRED_ROLES.includes(m.role))];
}

interface UsePfdRegisterReturn {
    // 상태
    pfdInfo: PFDInfo;
    setPfdInfo: React.Dispatch<React.SetStateAction<PFDInfo>>;
    cftMembers: CFTMember[];
    setCftMembers: React.Dispatch<React.SetStateAction<CFTMember[]>>;
    pfdId: string;
    setPfdId: React.Dispatch<React.SetStateAction<string>>;
    saveStatus: 'idle' | 'saving' | 'saved';
    setSaveStatus: React.Dispatch<React.SetStateAction<'idle' | 'saving' | 'saved'>>;
    accessLogs: CFTAccessLog[];
    originalData: PFDInfo | null;
    setOriginalData: React.Dispatch<React.SetStateAction<PFDInfo | null>>;

    // 연동 상태
    selectedBasePfd: string | null;
    setSelectedBasePfd: React.Dispatch<React.SetStateAction<string | null>>;
    selectedParentApqp: string | null;
    setSelectedParentApqp: React.Dispatch<React.SetStateAction<string | null>>;
    selectedParentFmea: string | null;
    setSelectedParentFmea: React.Dispatch<React.SetStateAction<string | null>>;
    fmeaLocked: boolean;
    setFmeaLocked: React.Dispatch<React.SetStateAction<boolean>>;
    cpLocked: boolean;
    setCpLocked: React.Dispatch<React.SetStateAction<boolean>>;

    // 모드
    isEditMode: boolean;
    editId: string | null;
    fromFmeaId: string | null;
    fromCpNo: string | null;

    // 함수
    updateField: (field: keyof PFDInfo, value: string) => void;
    handleSave: () => Promise<void>;
    handleNewRegister: () => void;
    loadAccessLogs: () => Promise<void>;
}

export function usePfdRegister(
    linkedCpList: { cpId: string; cpType: PFDType; status: string }[],
    setLinkedCpList: React.Dispatch<React.SetStateAction<{ cpId: string; cpType: PFDType; status: string }[]>>
): UsePfdRegisterReturn {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('id')?.toLowerCase() || null;
    const fromFmeaId = searchParams.get('fmeaId')?.toLowerCase() || null;
    const fromCpNo = searchParams.get('cpNo')?.toLowerCase() || null;
    const isEditMode = !!editId;

    // 상태
    const [pfdInfo, setPfdInfo] = useState<PFDInfo>(INITIAL_PFD);
    const [cftMembers, setCftMembers] = useState<CFTMember[]>(createInitialCFTMembers());
    const [pfdId, setPfdId] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [accessLogs, setAccessLogs] = useState<CFTAccessLog[]>([]);
    const [originalData, setOriginalData] = useState<PFDInfo | null>(null);

    // 연동 상태
    const [selectedBasePfd, setSelectedBasePfd] = useState<string | null>(null);
    const [selectedParentApqp, setSelectedParentApqp] = useState<string | null>(null);
    const [selectedParentFmea, setSelectedParentFmea] = useState<string | null>(null);
    const [fmeaLocked, setFmeaLocked] = useState(false);
    const [cpLocked, setCpLocked] = useState(false);

    // 접속 로그
    const loadAccessLogs = useCallback(async () => {
        if (!pfdId && !editId) return;
        try {
            const targetId = pfdId || editId;
            const res = await fetch(`/api/auth/access-log?projectId=${targetId}&module=PFD`);
            const data = await res.json();
            if (data.success) setAccessLogs(data.logs || []);
        } catch (e) { console.error('[접속로그 로드] 오류:', e); setAccessLogs([]); }
    }, [pfdId, editId]);

    // 필드 업데이트
    const updateField = (field: keyof PFDInfo, value: string) => {
        setPfdInfo(prev => ({ ...prev, [field]: value }));
    };

    // 데이터 로드
    useEffect(() => {
        const loadData = async () => {
            const targetId = isEditMode ? editId : localStorage.getItem('pfd-last-edited');
            if (!targetId) return;

            let project: any = null;

            // API 로드
            try {
                const res = await fetch(`/api/pfd?pfdNo=${targetId}`);
                const data = await res.json();
                if (data.success && data.data) {
                    project = data.data;
                }
            } catch (e) {
            }

            // localStorage 폴백
            if (!project) {
                try {
                    const stored = localStorage.getItem('pfd-projects');
                    if (stored) {
                        const projects = JSON.parse(stored);
                        project = projects.find((p: any) => p.id?.toLowerCase() === targetId.toLowerCase());
                    }
                } catch (e) { console.error('[localStorage 파싱] 오류:', e); }
            }

            if (project) {
                const projectId = (project.pfdNo || project.id).toLowerCase();
                const projectType = (project.pfdType || 'P') as PFDType;

                const loadedInfo: PFDInfo = {
                    companyName: project.companyName || project.pfdInfo?.companyName || '',
                    engineeringLocation: project.engineeringLocation || project.pfdInfo?.engineeringLocation || '',
                    customerName: project.customerName || project.pfdInfo?.customerName || '',
                    modelYear: project.modelYear || project.pfdInfo?.modelYear || '',
                    subject: project.subject || project.pfdInfo?.subject || '',
                    pfdStartDate: project.pfdStartDate || project.pfdInfo?.pfdStartDate || '',
                    pfdRevisionDate: project.pfdRevisionDate || project.pfdInfo?.pfdRevisionDate || '',
                    pfdId: projectId,
                    pfdType: projectType,
                    processResponsibility: project.processResponsibility || project.pfdInfo?.processResponsibility || '',
                    confidentialityLevel: project.confidentialityLevel || project.pfdInfo?.confidentialityLevel || '',
                    pfdResponsibleName: project.pfdResponsibleName || project.pfdInfo?.pfdResponsibleName || '',
                    linkedCpNo: project.linkedCpNo || project.cpNo || '',
                    securityLevel: project.securityLevel || '',
                    createdAt: project.createdAt || '',
                    updatedAt: project.updatedAt || '',
                };

                setPfdId(projectId);
                setPfdInfo(loadedInfo);
                setOriginalData(loadedInfo);

                if (project.cftMembers?.length > 0) setCftMembers(ensureRequiredCFTRoles(project.cftMembers));
                if (projectType === 'M') setSelectedBasePfd(projectId);
                else if (project.parentPfdId) setSelectedBasePfd(project.parentPfdId.toLowerCase());
                if (project.parentApqpNo) setSelectedParentApqp(project.parentApqpNo);

                // 상위 FMEA
                const loadedFmeaId = project.parentFmeaId || project.fmeaId;
                if (loadedFmeaId) {
                    setSelectedParentFmea(loadedFmeaId.toLowerCase());
                    setFmeaLocked(true);
                }

                // 연동 CP (Hook 상태 동기화)
                const loadedCpNo = project.linkedCpNo || project.cpNo;
                if (loadedCpNo) {
                    setLinkedCpList([{ cpId: loadedCpNo, cpType: projectType, status: 'linked' }]);
                    setCpLocked(true);
                }

                if (!isEditMode) router.replace(`/pfd/register?id=${projectId}`);
            }
        };
        loadData();
    }, [isEditMode, editId, router, setLinkedCpList]);

    // FMEA 연동 감지
    useEffect(() => {
        if (fromFmeaId) {
            setSelectedParentFmea(fromFmeaId);
            setFmeaLocked(true);
        }
    }, [fromFmeaId]);

    // CP 연동 감지
    useEffect(() => {
        if (fromCpNo) {
            setLinkedCpList([{ cpId: fromCpNo, cpType: 'P', status: 'pending' }]);
            setCpLocked(true);
        }
    }, [fromCpNo, setLinkedCpList]);

    // ★★★ ProjectLinkage에서 기초정보 로드 (폴백: APQP/FMEA 직접 조회) ★★★
    useEffect(() => {
        // 기본 정보가 이미 채워져 있으면 스킵 (수동 입력 우선)
        if (pfdInfo.companyName || pfdInfo.customerName || pfdInfo.subject) return;

        // pfdId 또는 상위 APQP/FMEA가 있어야 로드
        if (!pfdId && !selectedParentApqp && !selectedParentFmea) return;

        const loadBaseInfo = async () => {
            try {
                // 1. 먼저 ProjectLinkage에서 시도
                const queryParam = pfdId ? `pfdNo=${pfdId}`
                    : selectedParentApqp ? `apqpNo=${selectedParentApqp}`
                        : selectedParentFmea ? `pfmeaId=${selectedParentFmea}`
                            : null;

                if (queryParam) {
                    const res = await fetch(`/api/project-linkage?${queryParam}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.data?.[0]) {
                            const linkage = data.data[0];

                            if (linkage.apqpNo && !selectedParentApqp) setSelectedParentApqp(linkage.apqpNo);
                            if (linkage.pfmeaId && !selectedParentFmea) {
                                setSelectedParentFmea(linkage.pfmeaId);
                                setFmeaLocked(false);
                            }

                            setPfdInfo(prev => ({
                                ...prev,
                                companyName: prev.companyName || linkage.companyName || '',
                                customerName: prev.customerName || linkage.customerName || '',
                                modelYear: prev.modelYear || linkage.modelYear || '',
                                subject: prev.subject || linkage.subject || '',
                                engineeringLocation: prev.engineeringLocation || linkage.engineeringLocation || '',
                                pfdStartDate: prev.pfdStartDate || linkage.startDate || '',
                                pfdRevisionDate: prev.pfdRevisionDate || linkage.revisionDate || '',
                                processResponsibility: prev.processResponsibility || linkage.processResponsibility || '',
                                confidentialityLevel: prev.confidentialityLevel || linkage.confidentialityLevel || '',
                                pfdResponsibleName: prev.pfdResponsibleName || linkage.responsibleName || '',
                            }));
                            return; // 성공하면 종료
                        }
                    }
                }

                // 2. ProjectLinkage에 없으면 APQP에서 직접 조회 (폴백)
                if (selectedParentApqp) {
                    const apqpRes = await fetch(`/api/apqp?id=${selectedParentApqp}`);
                    if (apqpRes.ok) {
                        const apqpData = await apqpRes.json();
                        const apqp = apqpData.apqps?.[0] || apqpData.projects?.[0];
                        if (apqp) {
                            setPfdInfo(prev => ({
                                ...prev,
                                companyName: prev.companyName || apqp.companyName || '',
                                customerName: prev.customerName || apqp.customerName || '',
                                modelYear: prev.modelYear || apqp.modelYear || '',
                                subject: prev.subject || apqp.subject || apqp.productName || '',
                                engineeringLocation: prev.engineeringLocation || apqp.engineeringLocation || '',
                                pfdStartDate: prev.pfdStartDate || apqp.apqpStartDate || '',
                                pfdRevisionDate: prev.pfdRevisionDate || apqp.apqpRevisionDate || '',
                                processResponsibility: prev.processResponsibility || apqp.processResponsibility || '',
                                confidentialityLevel: prev.confidentialityLevel || apqp.confidentialityLevel || '',
                                pfdResponsibleName: prev.pfdResponsibleName || apqp.apqpResponsibleName || '',
                            }));
                            return;
                        }
                    }
                }

                // 3. APQP도 없으면 FMEA에서 직접 조회 (폴백)
                if (selectedParentFmea) {
                    const fmeaRes = await fetch(`/api/pfmea?id=${selectedParentFmea}`);
                    if (fmeaRes.ok) {
                        const fmeaData = await fmeaRes.json();
                        const fmea = fmeaData.projects?.[0];
                        if (fmea) {
                            setPfdInfo(prev => ({
                                ...prev,
                                companyName: prev.companyName || fmea.companyName || '',
                                customerName: prev.customerName || fmea.customerName || '',
                                modelYear: prev.modelYear || fmea.modelYear || '',
                                subject: prev.subject || fmea.subject || '',
                                engineeringLocation: prev.engineeringLocation || fmea.engineeringLocation || '',
                                pfdStartDate: prev.pfdStartDate || fmea.startDate || '',
                                pfdRevisionDate: prev.pfdRevisionDate || fmea.revisionDate || '',
                                processResponsibility: prev.processResponsibility || fmea.processResponsibility || '',
                                confidentialityLevel: prev.confidentialityLevel || fmea.confidentialityLevel || '',
                                pfdResponsibleName: prev.pfdResponsibleName || fmea.responsibleName || '',
                            }));
                        }
                    }
                }
            } catch (e) {
                console.error('[PM 기초정보 로드] 오류:', e);
            }
        };
        loadBaseInfo();
    }, [pfdId, selectedParentApqp, selectedParentFmea]);

    // 저장
    const handleSave = async () => {
        if (!pfdInfo.subject?.trim()) {
            alert('PFD명을 입력해주세요.');
            return;
        }
        setSaveStatus('saving');

        try {
            const basePfdId = (pfdId || generatePFDId(pfdInfo.pfdType)).toLowerCase();
            const finalId = generateLinkedPfdNo(basePfdId);
            if (!pfdId) setPfdId(finalId);

            const res = await fetch('/api/pfd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pfdNo: finalId,
                    pfdInfo: {
                        pfdType: pfdInfo.pfdType,
                        subject: pfdInfo.subject,
                        companyName: pfdInfo.companyName,
                        customerName: pfdInfo.customerName,
                        modelYear: pfdInfo.modelYear,
                        pfdStartDate: pfdInfo.pfdStartDate,
                        pfdRevisionDate: pfdInfo.pfdRevisionDate,
                        processResponsibility: pfdInfo.processResponsibility,
                        pfdResponsibleName: pfdInfo.pfdResponsibleName,
                        engineeringLocation: pfdInfo.engineeringLocation,
                        confidentialityLevel: pfdInfo.confidentialityLevel,
                    },
                    cftMembers: cftMembers.filter(m => m.name?.trim()),
                    parentApqpNo: selectedParentApqp,
                    parentFmeaId: selectedParentFmea,
                    linkedCpNo: linkedCpList[0]?.cpId || null,
                    basePfdId: selectedBasePfd,
                    linkedCpNos: linkedCpList.map(cp => cp.cpId),
                }),
            });

            const result = await res.json();
            if (!result.success) throw new Error(result.error);

            localStorage.setItem('pfd-last-edited', finalId);
            setOriginalData({ ...pfdInfo });

            setSaveStatus('saved');
            if (!isEditMode) router.replace(`/pfd/register?id=${finalId}`);
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (e: any) {
            alert('저장 실패: ' + (e.message || '알 수 없는 오류'));
            setSaveStatus('idle');
        }
    };

    // 새로 등록
    const handleNewRegister = () => {
        if (confirm('새로운 PFD를 등록하시겠습니까?')) {
            setPfdInfo(INITIAL_PFD);
            setCftMembers(createInitialCFTMembers());
            setPfdId(generatePFDId('P'));
            setSelectedBasePfd(null);
            setSelectedParentApqp(null);
            setSelectedParentFmea(null);
            setLinkedCpList([]);
            setFmeaLocked(false);
            setCpLocked(false);
            localStorage.removeItem('pfd-last-edited');
            localStorage.removeItem('pfd-temp-data');
            router.replace('/pfd/register');
        }
    };

    return {
        pfdInfo, setPfdInfo, cftMembers, setCftMembers, pfdId, setPfdId,
        saveStatus, setSaveStatus, accessLogs, originalData, setOriginalData,
        selectedBasePfd, setSelectedBasePfd, selectedParentApqp, setSelectedParentApqp,
        selectedParentFmea, setSelectedParentFmea, fmeaLocked, setFmeaLocked,
        cpLocked, setCpLocked, isEditMode, editId, fromFmeaId, fromCpNo,
        updateField, handleSave, handleNewRegister, loadAccessLogs,
    };
}
