/**
 * @file /api/license
 * @description 라이선스 검증 API
 * GET: 현재 라이선스 상태 반환
 */

import { NextResponse } from 'next/server';
import { verifyLicense } from '@/lib/license';

export async function GET() {
  const result = verifyLicense();
  return NextResponse.json(result);
}
