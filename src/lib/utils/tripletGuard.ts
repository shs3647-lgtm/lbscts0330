/**
 * @file tripletGuard.ts
 * @description TripletGroup 모델 존재 여부 안전 체크 유틸
 *
 * Prisma 클라이언트가 스키마 변경 전 캐시를 사용하거나,
 * DB에 TripletGroup 테이블이 아직 없는 경우를 방어한다.
 */
import { NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hasTripletModel(prisma: any): boolean {
  return prisma != null && typeof prisma.tripletGroup === 'object';
}

export function tripletNotReadyResponse() {
  return NextResponse.json(
    { success: true, triplets: [], message: 'TripletGroup model not available. Restart dev server after prisma generate.' },
    { status: 200 }
  );
}

export function tripletNotReadyErrorResponse() {
  return NextResponse.json(
    { success: false, error: 'TripletGroup model not available. Run: npx prisma generate && restart dev server.' },
    { status: 503 }
  );
}
