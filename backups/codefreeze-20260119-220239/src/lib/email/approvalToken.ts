/**
 * @file approvalToken.ts
 * @description 결재 토큰 생성 및 검증
 * @created 2026-01-19
 */

import crypto from 'crypto';

// ============================================================================
// 타입 정의
// ============================================================================

export interface ApprovalTokenPayload {
  fmeaId: string;
  revisionId: string;
  revisionNumber: string;
  approvalType: 'CREATE' | 'REVIEW' | 'APPROVE';
  approverEmail: string;
  approverName: string;
  requesterId: string;
  requesterName: string;
  createdAt: number;
  expiresAt: number;
}

// ============================================================================
// 토큰 생성
// ============================================================================

const SECRET_KEY = process.env.APPROVAL_SECRET_KEY || 'fmea-approval-secret-key-2026';

export const generateApprovalToken = (payload: Omit<ApprovalTokenPayload, 'createdAt' | 'expiresAt'>): string => {
  const now = Date.now();
  const fullPayload: ApprovalTokenPayload = {
    ...payload,
    createdAt: now,
    expiresAt: now + (7 * 24 * 60 * 60 * 1000), // 7일 후 만료
  };
  
  const payloadStr = JSON.stringify(fullPayload);
  const payloadBase64 = Buffer.from(payloadStr).toString('base64url');
  
  // HMAC 서명 생성
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payloadBase64)
    .digest('base64url');
  
  return `${payloadBase64}.${signature}`;
};

// ============================================================================
// 토큰 검증
// ============================================================================

export const verifyApprovalToken = (token: string): { valid: boolean; payload?: ApprovalTokenPayload; error?: string } => {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: '잘못된 토큰 형식입니다.' };
    }
    
    const [payloadBase64, signature] = parts;
    
    // 서명 검증
    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(payloadBase64)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      return { valid: false, error: '토큰 서명이 유효하지 않습니다.' };
    }
    
    // 페이로드 파싱
    const payloadStr = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const payload: ApprovalTokenPayload = JSON.parse(payloadStr);
    
    // 만료 확인
    if (Date.now() > payload.expiresAt) {
      return { valid: false, error: '토큰이 만료되었습니다.' };
    }
    
    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: '토큰 검증 중 오류가 발생했습니다.' };
  }
};

// ============================================================================
// 토큰에서 정보 추출 (검증 없이)
// ============================================================================

export const decodeApprovalToken = (token: string): ApprovalTokenPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    
    const payloadStr = Buffer.from(parts[0], 'base64url').toString('utf8');
    return JSON.parse(payloadStr);
  } catch {
    return null;
  }
};
