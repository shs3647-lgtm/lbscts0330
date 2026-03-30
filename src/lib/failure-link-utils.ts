/**
 * @status CODEFREEZE L4 (Pipeline Protection) u{1F512}
 * @freeze_level L4 (Critical - DFMEA Pre-Development Snapshot)
 * @frozen_date 2026-03-30
 * @snapshot_tag codefreeze-v5.0-pre-dfmea-20260330
 * @allowed_changes NONE ???ъ슜??紐낆떆???뱀씤 + full test pass ?꾩닔
 * @manifest CODEFREEZE_PIPELINE_MANIFEST.md
 */
/**
 * @file failure-link-utils.ts
 * @description FailureLinks 3중 보호 순수 함수 (테스트 가능)
 *
 * 1. preserveFailureLinks — 빈 배열 POST 시 기존 링크 보존
 * 2. filterValidLinks — FK 검증 필터
 * 3. computeCompletenessScore — 후보 completeness 점수 (failureLinks 가중치)
 * 4. validateFailureLinksJSON — Zod 스키마 기반 JSON 유효성 검증 (M-2)
 */

import { z } from 'zod';

// FailureLink JSON 검증 스키마 (M-2)
const uuidOrEmpty = z.string(); // UUID or empty string allowed

export const failureLinkSchema = z.object({
  id: z.string().min(1),
  fmeaId: z.string().min(1),
  fmId: z.string().min(1),
  feId: uuidOrEmpty,
  fcId: uuidOrEmpty,
  linkType: z.string().optional(),
  severity: z.number().int().min(1).max(10).optional(),
  occurrence: z.number().int().min(1).max(10).optional(),
  detection: z.number().int().min(1).max(10).optional(),
  ap: z.enum(['H', 'M', 'L']).optional(),
  rpn: z.number().int().min(0).optional(),
});

export type ValidatedFailureLink = z.infer<typeof failureLinkSchema>;

/**
 * FailureLink JSON 배열 검증 (M-2: 저장 전 유효성 검사)
 * - 유효한 링크만 반환, 무효한 링크는 경고 로그
 */
export function validateFailureLinksJSON(
  links: unknown[],
): { valid: ValidatedFailureLink[]; invalidCount: number } {
  const valid: ValidatedFailureLink[] = [];
  let invalidCount = 0;

  for (const link of links) {
    const result = failureLinkSchema.safeParse(link);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalidCount++;
      console.error('[FailureLink] 유효성 검증 실패:', result.error.issues[0]?.message);
    }
  }

  return { valid, invalidCount };
}

/** FailureLink 최소 인터페이스 (FK 검증용) */
export interface LinkFKFields {
  fmId?: string;
  feId?: string;
  fcId?: string;
}

/**
 * 빈 배열 POST 시 기존 링크 보존
 * - incoming이 비어있고 existing이 있으면 existing 반환
 * - 그 외에는 incoming 그대로 반환
 * ★ P5: Race condition 감지 — incoming이 기존보다 크게 적으면 경고 로그
 */
export function preserveFailureLinks<T>(incoming: T[], existing: T[]): T[] {
  if (incoming.length === 0 && existing.length > 0) return existing;
  // ★ P5: 동시 편집 감지 경고 (기존 링크의 50% 이상 소실 시)
  if (incoming.length > 0 && existing.length > 0 && incoming.length < existing.length * 0.5) {
    console.error(`[preserveFailureLinks] ⚠️ 동시 편집 의심: incoming=${incoming.length}, existing=${existing.length} — 링크 소실 가능`);
  }
  return incoming;
}

/**
 * FK 검증 필터 — fmId/fcId 필수, feId 선택적 (FMEA 표준: FE 없이 FM-FC 연결 허용)
 * @returns { valid: 통과 링크[], dropped: 제외 건수, feIdEmpty: feId 미지정 건수 }
 */
export function filterValidLinks<T extends LinkFKFields>(
  links: T[],
  fmIds: Set<string>,
  feIds: Set<string>,
  fcIds: Set<string>,
): { valid: T[]; dropped: number; feIdEmpty: number } {
  const valid = links.filter(link =>
    !!link.fmId && !!link.fcId &&
    fmIds.has(link.fmId) && fcIds.has(link.fcId) &&
    (!link.feId || feIds.has(link.feId))
  );
  const feIdEmpty = valid.filter(link => !link.feId).length;
  return { valid, dropped: links.length - valid.length, feIdEmpty };
}

/**
 * 후보 completeness 점수 계산 (failureLinks 가중치 포함)
 * - L1 이름: +50
 * - L2 유의미 공정: +20 each
 * - L3 작업요소: +5 each
 * - L1/L2/L3 기능: +10/+10/+5 each
 * - FM+FC: +2 each
 * - FE: +2 each
 * - failureLinks 존재: +100 (핵심 가중치)
 */
export function computeCompletenessScore(candidate: any): number {
  let score = 0;

  // L1
  const l1Name = String(candidate?.l1?.name || '').trim();
  if (l1Name) score += 50;

  // L2
  const l2 = Array.isArray(candidate?.l2) ? candidate.l2 : [];
  score += l2.filter((p: any) => String(p?.name || p?.no || '').trim()).length * 20;

  // L3
  score += l2.reduce((a: number, p: any) =>
    a + (Array.isArray(p?.l3) ? p.l3.length : 0), 0) * 5;

  // L1 functions
  score += (Array.isArray(candidate?.l1?.functions) ? candidate.l1.functions.length : 0) * 10;

  // L2 functions
  score += l2.reduce((a: number, p: any) =>
    a + (Array.isArray(p?.functions) ? p.functions.length : 0), 0) * 10;

  // L3 functions
  score += l2.reduce((a: number, p: any) => {
    const l3s = Array.isArray(p?.l3) ? p.l3 : [];
    return a + l3s.reduce((b: number, l3: any) =>
      b + (Array.isArray(l3?.functions) ? l3.functions.length : 0), 0);
  }, 0) * 5;

  // FM + FC
  const fmCount = l2.reduce((a: number, p: any) =>
    a + (Array.isArray(p?.failureModes) ? p.failureModes.length : 0), 0);
  const fcCount = l2.reduce((a: number, p: any) =>
    a + (Array.isArray(p?.failureCauses) ? p.failureCauses.length : 0), 0);
  score += (fmCount + fcCount) * 2;

  // FE
  score += (Array.isArray(candidate?.l1?.failureScopes)
    ? candidate.l1.failureScopes.length : 0) * 2;

  // ★★★ failureLinks 가중치 — 링크 있는 후보 우선 선택 (링크 손실 방지)
  const linkCount = Array.isArray(candidate?.failureLinks) ? candidate.failureLinks.length : 0;
  score += linkCount > 0 ? 100 : 0;

  return score;
}
