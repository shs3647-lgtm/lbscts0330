import { describe, it, expect } from 'vitest';
import { validateFailureLinksJSON, failureLinkSchema } from '@/lib/failure-link-utils';

describe('M-2: FailureLink Zod 검증', () => {
  const validLink = {
    id: 'test-uuid-001',
    fmeaId: 'FMEA-001',
    fmId: 'fm-uuid-001',
    feId: 'fe-uuid-001',
    fcId: 'fc-uuid-001',
    severity: 8,
    occurrence: 4,
    detection: 6,
    ap: 'H' as const,
    rpn: 192,
  };

  it('유효한 링크 통과', () => {
    const result = failureLinkSchema.safeParse(validLink);
    expect(result.success).toBe(true);
  });

  it('feId/fcId 빈 문자열 허용', () => {
    const link = { ...validLink, feId: '', fcId: '' };
    const result = failureLinkSchema.safeParse(link);
    expect(result.success).toBe(true);
  });

  it('fmId 빈 문자열 거부', () => {
    const link = { ...validLink, fmId: '' };
    const result = failureLinkSchema.safeParse(link);
    expect(result.success).toBe(false);
  });

  it('id 누락 거부', () => {
    const { id, ...noId } = validLink;
    const result = failureLinkSchema.safeParse(noId);
    expect(result.success).toBe(false);
  });

  it('severity 범위 초과 거부 (11)', () => {
    const link = { ...validLink, severity: 11 };
    const result = failureLinkSchema.safeParse(link);
    expect(result.success).toBe(false);
  });

  it('severity 범위 미달 거부 (0)', () => {
    const link = { ...validLink, severity: 0 };
    const result = failureLinkSchema.safeParse(link);
    expect(result.success).toBe(false);
  });

  it('ap 잘못된 값 거부', () => {
    const link = { ...validLink, ap: 'X' };
    const result = failureLinkSchema.safeParse(link);
    expect(result.success).toBe(false);
  });

  it('validateFailureLinksJSON: 유효/무효 분리', () => {
    const links = [
      validLink,
      { ...validLink, id: 'test-2', fmId: '' },  // invalid: fmId empty
      { ...validLink, id: 'test-3', severity: 15 }, // invalid: severity > 10
    ];
    const { valid, invalidCount } = validateFailureLinksJSON(links);
    expect(valid).toHaveLength(1);
    expect(invalidCount).toBe(2);
  });

  it('validateFailureLinksJSON: 빈 배열 정상 처리', () => {
    const { valid, invalidCount } = validateFailureLinksJSON([]);
    expect(valid).toHaveLength(0);
    expect(invalidCount).toBe(0);
  });
});
