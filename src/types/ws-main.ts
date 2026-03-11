/**
 * WS Main Document Types
 * 작업 표준서 통합 관리 화면 타입 정의
 */

export interface WSMainDocument {
  // 표준 정보
  documentId: string;              // 문서 ID (WS-MAIN-001)
  standardNo: string;              // 표준번호 (WS-001)
  processNo: string;               // 공정번호 (J17)
  processName: string;             // 공정명 (조립)
  productName: string;             // 품명 (J18)
  partNo: string;                  // 품번 (MP-HD-001)
  
  // 개정 정보
  establishDate: string;           // 제정일자 (YYYY-MM-DD)
  revisionDate: string;            // 개정일자 (YYYY-MM-DD)
  revisionNo: string;              // 개정번호 (Rev.01)
  
  // 안전 보호구
  safetyEquipment: SafetyEquipment;
  
  // 결재 정보
  approval: ApprovalInfo;
  
  // 공정도 (작업 사진)
  processImages: ProcessImage[];
  
  // 설비 및 Tools
  equipmentTools: string[];        // ['프레스', '금형', '다이']
  
  // 부품 리스트
  partsList: PartItem[];
  
  // 작업 방법
  workMethod: WorkStep[];
  
  // 에스컬레이션 기준
  escalationStandards?: {
    first: string;   // 1차보고
    second: string;  // 2차보고
    third: string;   // 3차보고
    fourth: string;  // 4차보고
    fifth: string;   // 5차보고
  };
  
  // 재가동 검증 기준
  restartVerification?: {
    abnormalOccurrence: string;    // 이상발생
    emergencyAction: string;       // 긴급조치
    processInspection: string;     // 공정점검
    productVerification: string;   // 제품검증
    restart: string;               // 재가동
  };
  
  // 메타데이터
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'draft' | 'review' | 'approved';
  
  // CP 연동
  cpDocumentId?: string;           // 연결된 CP 문서 ID
  cpProcessNo?: string;            // CP 공정번호
  cpLinkage?: {                    // CP 연동 정보 (v3.27.1)
    cpDocumentId: string;
    processNo: string;
    lastSyncAt: string;
  };
}

export interface SafetyEquipment {
  gloves: boolean;               // 장갑
  safetyShoes: boolean;          // 안전화
  helmet: boolean;               // 안전모
  mask: boolean;                 // 마스크
  earplugs: boolean;             // 귀마개
  safetyGlasses: boolean;        // 보안경
}

export interface ApprovalInfo {
  author: string;                // 작성자
  reviewer: string;              // 검토자
  approver: string;              // 승인자
  authorSign?: string;           // 작성 서명 (Base64 이미지)
  reviewerSign?: string;         // 검토 서명 (Base64 이미지)
  approverSign?: string;         // 승인 서명 (Base64 이미지)
  authorDate?: string;           // 작성 일자
  reviewerDate?: string;         // 검토 일자
  approverDate?: string;         // 승인 일자
}

export interface ProcessImage {
  id: string;                    // 이미지 ID
  url: string;                   // 이미지 URL (Base64)
  fileName: string;              // 파일명
  order: number;                 // 순서
  description?: string;          // 설명
  uploadedAt: string;            // 업로드 일시
}

export interface PartItem {
  no: number;                    // 순번
  partName: string;              // 부품명
  quantity: number;              // 수량
}

export interface WorkStep {
  step?: number;                 // 작업순서 (옵션)
  order?: string;                // 작업순서 (문자열, v3.27.1)
  content: string;               // 작업내용
  managementStandard?: string;   // 관리기준 (v3.27.1)
}

/**
 * WS Main 초기 데이터 생성
 */
export function createEmptyWSMainDocument(
  standardNo?: string,
  processNo?: string
): WSMainDocument {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  return {
    documentId: `WS-MAIN-${Date.now()}`,
    standardNo: standardNo || 'WS-001',
    processNo: processNo || '',
    processName: '',
    productName: '',
    partNo: '',
    
    establishDate: today,
    revisionDate: today,
    revisionNo: 'Rev.00',
    
    safetyEquipment: {
      gloves: false,
      safetyShoes: false,
      helmet: false,
      mask: false,
      earplugs: false,
      safetyGlasses: false
    },
    
    approval: {
      author: '',
      reviewer: '',
      approver: ''
    },
    
    processImages: [],
    equipmentTools: [],
    partsList: [],
    workMethod: [],
    
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    createdBy: 'System',
    status: 'draft'
  };
}

/**
 * WS Main 샘플 데이터 생성
 */
export function createSampleWSMainDocument(): WSMainDocument {
  const baseDoc = createEmptyWSMainDocument('WS-001', 'J17');
  
  return {
    ...baseDoc,
    processName: '조립',
    productName: 'J18',
    partNo: 'MP-HD-001',
    
    safetyEquipment: {
      gloves: true,
      safetyShoes: true,
      helmet: true,
      mask: true,
      earplugs: true,
      safetyGlasses: true
    },
    
    approval: {
      author: '홍길동',
      reviewer: '김철수',
      approver: '이영희'
    },
    
    equipmentTools: ['프레스', '금형', '다이'],
    
    partsList: [
      { no: 1, partName: '1번 부품', quantity: 2 },
      { no: 2, partName: '2번 부품', quantity: 2 },
      { no: 3, partName: '3번 부품', quantity: 1 },
      { no: 4, partName: '4번 부품', quantity: 3 }
    ],
    
    workMethod: [
      { step: 1, content: '설비 스위치를 on 한다', managementStandard: '전압 확인' },
      { step: 2, content: '설비운전 조건을 확인한다', managementStandard: '온도 확인' },
      { step: 3, content: '부품을 설비에 장착한다', managementStandard: '위치 확인' },
      { step: 4, content: '설비를 작동한다', managementStandard: '속도 확인' },
      { step: 5, content: '조립품을 설비에서 인출한다', managementStandard: '품질 확인' },
      { step: 6, content: '박스에 조립품을 담는다', managementStandard: '포장 확인' }
    ],
    
    escalationStandards: {
      first: '현장관리자',
      second: '실무자',
      third: '생산팀장',
      fourth: '공장장',
      fifth: '대표이사'
    },
    
    restartVerification: {
      abnormalOccurrence: '공정중단',
      emergencyAction: '수리,복구',
      processInspection: '관리계획서',
      productVerification: '제품검사',
      restart: '생산재가동'
    },
    
    cpLinkage: {
      cpDocumentId: '',
      processNo: '',
      lastSyncAt: ''
    }
  };
}

