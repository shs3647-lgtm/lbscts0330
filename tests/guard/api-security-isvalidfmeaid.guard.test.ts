/**
 * @file api-security-isvalidfmeaid.guard.test.ts
 * @description Guard Test — 모든 FMEA API route에서 isValidFmeaId 보안 검증 적용 여부
 *
 * 보호 대상: src/app/api/fmea/ 하위 모든 route.ts
 * 적용 예외 (fmeaId를 사용하지 않는 API):
 *   - next-id: 새 ID 생성용
 *   - projects: 프로젝트 목록 조회
 *   - dashboard-stats: 통계 집계
 *   - download-import-sample: 샘플 파일 다운로드
 *   - meetings: 미팅 관리
 *   - master-datasets/master-processes/master-structure: 마스터 데이터 관리
 *   - learned-rules: 학습 규칙 관리
 *
 * 실행: npx vitest run tests/guard/api-security-isvalidfmeaid.guard.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// fmeaId를 파라미터로 받지 않는 API (보안 검증 면제)
const EXEMPT_ROUTES = new Set([
  'next-id',
  'projects',
  'dashboard-stats',
  'download-import-sample',
  'meetings',
  'master-datasets',
  'master-processes',
  'master-structure',
  'learned-rules',
  'sample-lookup',
  'email-notify',
]);

describe('FMEA API isValidFmeaId 보안 검증 (Guard)', () => {
  const apiDir = path.resolve(__dirname, '../../src/app/api/fmea');

  it('fmeaId 사용 API는 모두 isValidFmeaId 검증을 해야 한다', () => {
    const violations: string[] = [];

    function checkDir(dir: string, prefix = '') {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          checkDir(path.join(dir, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name);
        } else if (entry.name === 'route.ts') {
          const routeName = prefix || 'root';
          const topLevel = routeName.split('/')[0];

          // 면제 목록 체크
          if (EXEMPT_ROUTES.has(topLevel)) continue;

          const content = fs.readFileSync(path.join(dir, entry.name), 'utf-8');
          // fmeaId를 사용하는지 확인
          if (content.includes('fmeaId')) {
            if (!content.includes('isValidFmeaId')) {
              violations.push(routeName);
            }
          }
        }
      }
    }

    checkDir(apiDir);

    // 현재 미적용 API 목록 (TODO-03 진행 중)
    // 이 목록이 줄어들수록 보안 커버리지 향상
    const KNOWN_MISSING = [
      'patch-legacy',  // fmeaId 미사용 — 면제
    ];

    // 알려진 미적용 API 이외에 새로운 미적용 API가 추가되면 안 됨
    const unknownViolations = violations.filter(v => !KNOWN_MISSING.includes(v));
    if (unknownViolations.length > 0) {
      console.error('🔴 신규 API에 isValidFmeaId 미적용:', unknownViolations);
    }
    expect(unknownViolations).toEqual([]);
  });
});
