/**
 * Guard Test: PFD 프로젝트 스키마 준수 검증
 *
 * Rule 19: pfdItem 모델 접근 시
 * getPrismaForPfd (프로젝트 스키마)를 사용해야 함.
 * getPrisma() 단독으로 pfdItem CRUD 금지.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const PFD_ROUTE_FILES_NEEDING_PROJECT_SCHEMA = [
  'src/app/api/pfd/route.ts',
  'src/app/api/pfd/[id]/revision/route.ts',
];

describe('PFD 프로젝트 스키마 Guard (Rule 19)', () => {
  for (const relPath of PFD_ROUTE_FILES_NEEDING_PROJECT_SCHEMA) {
    const fullPath = path.resolve(process.cwd(), relPath);

    it(`${relPath} — pfdItem 접근 시 getPrismaForPfd 사용`, () => {
      const src = fs.readFileSync(fullPath, 'utf-8');

      // pfdItem 모델 접근�� 있는 파일은 getPrismaForPfd import 필수
      if (src.includes('pfdItem')) {
        expect(src).toContain('getPrismaForPfd');

        const importLine = src.match(
          /import\s*\{[^}]*getPrismaForPfd[^}]*\}/
        );
        expect(importLine).not.toBeNull();
      }
    });
  }
});
