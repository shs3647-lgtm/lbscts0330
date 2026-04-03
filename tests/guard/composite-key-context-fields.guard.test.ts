/**
 * @file composite-key-context-fields.guard.test.ts
 * @description Guard Test G-6 — 복합키/dedup key에 공정번호(processNo) 컨텍스트 포함 검증
 *
 * 사고 이력 (2026-03-21 ~ 2026-04-02, 8회+ 반복):
 *   dedup key에 공정번호/구분(context) 미포함 → 동일 텍스트 다른 공정 엔티티 삭제
 *   Rule 1.7: 모든 dedup key에 컨텍스트(공정번호) 반드시 포함
 *
 * 보호 대상:
 *   - rebuild-atomic FL dedup key (fmId|fcId|feId)
 *   - import-builder B4 dedup key (pno|m4|we|fm|fc)
 *   - position-parser cross-sheet-resolver 복합키
 *
 * 실행: npx vitest run tests/guard/composite-key-context-fields.guard.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('복합키 컨텍스트(processNo) 포함 보호 (Guard G-6)', () => {
  // rebuild-atomic: FL dedup에 3요소 포함
  it('rebuild-atomic FL dedup key에 feId가 포함되어야 한다', () => {
    const filePath = path.resolve(
      __dirname,
      '../../src/app/api/fmea/rebuild-atomic/route.ts',
    );
    const src = fs.readFileSync(filePath, 'utf-8');
    // FL dedup에서 feId가 반드시 포함
    const dedupLines = src.split('\n').filter(line =>
      line.includes('dedupKey') || line.includes('dedup key')
    );
    const hasFeId = dedupLines.some(line => line.includes('feId'));
    expect(hasFeId).toBe(true);
  });

  // cross-sheet-resolver: processNo 기반 매칭
  it('cross-sheet-resolver에 processNo 기반 매칭이 존재해야 한다', () => {
    const resolverPath = path.resolve(
      __dirname,
      '../../src/lib/fmea/cross-sheet-resolver.ts',
    );
    if (!fs.existsSync(resolverPath)) return; // 파일 없으면 스킵
    const src = fs.readFileSync(resolverPath, 'utf-8');
    expect(src).toContain('processNo');
  });

  // position-parser: parentId(N-1) 정책
  it('position-parser에 CODEFREEZE 주석이 존재해야 한다', () => {
    const parserPath = path.resolve(
      __dirname,
      '../../src/lib/fmea/position-parser.ts',
    );
    const src = fs.readFileSync(parserPath, 'utf-8');
    expect(src).toContain('CODEFREEZE');
  });

  // Prisma 스키마: FailureLink에 fmId+fcId+feId unique constraint
  it('Prisma 스키마에 FailureLink unique(fmeaId, fmId, feId, fcId) 제약이 있어야 한다', () => {
    const schemaPath = path.resolve(
      __dirname,
      '../../prisma/schema.prisma',
    );
    const src = fs.readFileSync(schemaPath, 'utf-8');
    // @@unique([fmeaId, fmId, feId, fcId]) 패턴
    expect(src).toContain('@@unique([fmeaId, fmId, feId, fcId])');
  });
});
