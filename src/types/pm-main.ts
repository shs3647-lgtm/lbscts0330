/**
 * @file pm-main.ts
 * @description PM Main Document 타입 정의
 * @version 1.0.0
 */

export interface WorkStep {
    step: number;
    content: string;
}

export interface PartItem {
    no: number;
    partName: string;
    quantity: number;
}

// 설비/TOOL 상세 정보
export interface EquipmentItem {
    id: string;                    // 고유 ID
    name: string;                  // 설비/TOOL명
    equipmentNo?: string;          // 설비번호
    type: 'equipment' | 'tool';    // 구분 (설비/TOOL)
    specification?: string;        // 규격
    manufacturer?: string;         // 제조사
    location?: string;             // 위치
    status: 'normal' | 'checking' | 'broken' | 'disposed';  // 상태
    checkCycle?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';  // 점검 주기
    lastCheckDate?: string;        // 최근 점검일
    nextCheckDate?: string;        // 다음 점검 예정일
    checkHistory?: {               // 점검 이력
        date: string;
        checker: string;
        result: 'pass' | 'fail' | 'conditional';
        note?: string;
    }[];
    image?: string;                // 설비 사진 (Base64)
    note?: string;                 // 비고
}

// 빈 설비 아이템 생성 함수
export function createEmptyEquipmentItem(): EquipmentItem {
    return {
        id: `EQ-${Date.now()}`,
        name: '',
        type: 'equipment',
        status: 'normal',
    };
}

export interface PMMainDocument {
    // 문서 기본 정보
    documentId: string;
    standardNo: string;
    establishDate: string;
    revisionDate: string;
    revisionNo: string;

    // 결재 정보
    approval: {
        author: string;
        reviewer: string;
        approver: string;
    };

    // 공정 기본 정보
    processNo: string;
    processName: string;
    productName: string;
    partNo: string;

    // 안전보호구
    safetyEquipment: {
        gloves: boolean;
        safetyShoes: boolean;
        helmet: boolean;
        mask: boolean;
        earplugs: boolean;
        safetyGlasses: boolean;
    };

    // 작업 방법
    workMethod: WorkStep[];

    // 작업 공정도 이미지 (Base64 또는 URL)
    processImage?: string;

    // 설비 및 부품 (구버전 호환용 - string[] 유지)
    equipmentTools: string[];

    // 설비/TOOL 상세 정보 (신규)
    equipmentList?: EquipmentItem[];

    // 부품 리스트
    partsList: PartItem[];

    // 메타 정보
    createdAt: string;
    updatedAt: string;

    // 기존 호환성 유지 (필요 시)
    pmNo?: string;
    subject?: string;
    productNo?: string;
    customer?: string;
    supplier?: string;
    processOwner?: string;
    teamMembers?: string[];
    status?: 'draft' | 'review' | 'approved';
}

export function createEmptyPMMainDocument(): PMMainDocument {
    return {
        documentId: '',
        standardNo: '',
        establishDate: new Date().toISOString().split('T')[0],
        revisionDate: '',
        revisionNo: '',
        approval: {
            author: '',
            reviewer: '',
            approver: ''
        },
        processNo: '',
        processName: '',
        productName: '',
        partNo: '',
        safetyEquipment: {
            gloves: false,
            safetyShoes: false,
            helmet: false,
            mask: false,
            earplugs: false,
            safetyGlasses: false
        },
        workMethod: [],
        equipmentTools: [],
        partsList: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft'
    };
}
