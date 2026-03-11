/**
 * @file document-link-types.ts
 * @description 문서 연동 관련 타입 정의
 * @version 1.0.0
 * @created 2026-01-27
 */

// 문서 유형
export type DocumentType = 'PFMEA' | 'PFD' | 'CP';

// 문서 레벨 (M/F/P)
export type DocumentLevel = 'M' | 'F' | 'P';

// 연동 상태
export type LinkStatus = 'auto' | 'linked' | 'pending';

// 연동 아이템
export interface LinkedItem {
    id: string;            // 연동 문서 ID (예: cpl26-f001)
    type: DocumentLevel;   // 유형 (M/F/P)
    status: LinkStatus;    // 상태
    sourceId?: string;     // 원본 문서 ID
    createdAt?: string;    // 생성일시
}

// 연동 관계
export interface DocumentLink {
    id: string;
    sourceType: DocumentType;
    sourceId: string;
    targetType: DocumentType;
    targetId: string;
    linkStatus: LinkStatus;
    createdAt: string;
    updatedAt: string;
}

// 연동 요약 (목록 표시용)
export interface LinkSummary {
    totalCount: number;
    linkedCount: number;
    pendingCount: number;
    autoCount: number;
    items: LinkedItem[];
}

// 모달 Props
export interface DocumentLinkModalProps {
    isOpen: boolean;
    onClose: () => void;

    // 원본 문서 정보
    sourceType: DocumentType;
    sourceId: string;
    sourceDocType: DocumentLevel;

    // 연동 대상 문서 유형
    targetType: DocumentType;

    // 연동 목록
    linkedItems: LinkedItem[];
    onLinkedItemsChange: (items: LinkedItem[]) => void;

    // ID 생성 함수
    generateLinkedId: (sourceId: string, existingIds: string[]) => string;
}
