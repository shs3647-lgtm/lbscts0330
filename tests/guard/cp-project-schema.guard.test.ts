/**
 * Guard Test: CP 프로젝트 스키마 준수 검증
 *
 * Rule 19: ControlPlan/ControlPlanItem 모델 접근 시
 * getPrismaForCp (프로젝트 스키마)를 사용해야 함.
 * getPrisma() 단독 사용으로 public에서 프로젝트 데이터 접근 금지.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const CP_ROUTE_FILES = [
  'src/app/api/control-plan/route.ts',
  'src/app/api/control-plan/[id]/route.ts',
  'src/app/api/control-plan/[id]/status/route.ts',
];

describe('CP 프로젝트 스키마 Guard (Rule 19)', () => {
  for (const relPath of CP_ROUTE_FILES) {
    const fullPath = path.resolve(process.cwd(), relPath);

    it(`${relPath} — ControlPlan 모델 접근 ��� getPrismaForCp 사용`, () => {
      const src = fs.readFileSync(fullPath, 'utf-8');

      // getPrismaForCp import가 존재해야 함
      expect(src).toContain('getPrismaForCp');

      // controlPlan.create/update/delete/findUnique 등의 호출이
      // getPrisma()가 아닌 projPrisma 또는 getPrismaForCp 결과에서 이루어져야 함
      // → import에 getPrismaForCp가 반드시 포함
      const importLine = src.match(/import\s*\{[^}]*getPrismaForCp[^}]*\}/);
      expect(importLine).not.toBeNull();
    });
  }
});
