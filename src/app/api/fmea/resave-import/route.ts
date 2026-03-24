/**
 * @file resave-import/route.ts
 * @description DEPRECATED (2026-03-25) — 레거시 Re-save API
 *
 * 레거시 파서 삭제에 따라 이 API는 더 이상 사용되지 않습니다.
 * Re-import는 save-position-import를 사용하세요.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: '[DEPRECATED] resave-import API는 삭제되었습니다. save-position-import를 사용하세요.',
      redirect: '/api/fmea/save-position-import',
    },
    { status: 410 }
  );
}
