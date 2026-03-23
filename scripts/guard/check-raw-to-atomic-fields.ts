/**
 * @file check-raw-to-atomic-fields.ts
 * @description ⛔ pre-commit GUARD — raw-to-atomic.ts 필수 필드 누락 감지
 *
 * 사용법: npx tsx scripts/guard/check-raw-to-atomic-fields.ts
 * pre-commit 훅에서 자동 실행됨
 */

import * as fs from 'fs';
import * as path from 'path';

const FILE = path.resolve(__dirname, '../../src/lib/fmea-core/raw-to-atomic.ts');

// ⛔ 절대 누락 불가 (모델명 → 필수 필드 목록)
const REQUIRED_FIELDS: Record<string, string[]> = {
  'l1Requirement.createMany': ['parentId'],
  'failureMode.createMany':   ['feRefs', 'fcRefs'],
  'failureLink.createMany':   ['l2StructId', 'l3StructId'],
  'riskAnalysis.createMany':  ['fmId', 'fcId', 'feId'],
};

function extractBlock(src: string, keyword: string): string {
  const idx = src.indexOf(keyword);
  if (idx === -1) return '';
  return src.slice(idx, idx + 800);
}

const src = fs.readFileSync(FILE, 'utf-8');
let errors = 0;

for (const [model, fields] of Object.entries(REQUIRED_FIELDS)) {
  const block = extractBlock(src, model);
  if (!block) {
    console.error(`❌ [GUARD] ${model} 블록을 찾을 수 없음`);
    errors++;
    continue;
  }
  for (const field of fields) {
    if (!block.includes(field)) {
      console.error(`❌ [GUARD] ${model} 에서 "${field}" 필드 누락! — 절대 삭제 금지`);
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(`\n⛔ GUARD 실패: ${errors}개 필수 필드 누락`);
  console.error('raw-to-atomic.ts의 필수 필드는 Prisma 캐시 문제 등 어떤 이유로도 제거 불가.');
  console.error('캐시 문제는 getPrisma()의 stale 감지 로직으로 해결하세요 (src/lib/prisma.ts).');
  process.exit(1);
} else {
  console.log('✅ GUARD 통과: raw-to-atomic.ts 모든 필수 필드 정상');
  process.exit(0);
}
