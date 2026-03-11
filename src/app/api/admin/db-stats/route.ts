/**
 * @file route.ts
 * @description DB 통계 API (테이블별 레코드 수)
 * @created 2026-01-26
 */

import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET: DB 통계 조회
export async function GET() {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ success: false, error: 'DB 연결 실패', stats: [] });
    }

    try {
        // 각 테이블의 레코드 수 조회 (실제 Prisma 스키마 기반)
        const p = prisma as any;  // 타입 캐스팅 (Prisma 클라이언트 재생성 전까지)
        const stats: { tableName: string; recordCount: number }[] = await Promise.all([
            p.user?.count().then((count: number) => ({ tableName: 'User', recordCount: count })) ?? Promise.resolve({ tableName: 'User', recordCount: 0 }),
            p.fmeaRegistration?.count().then((count: number) => ({ tableName: 'FmeaRegistration', recordCount: count })) ?? Promise.resolve({ tableName: 'FmeaRegistration', recordCount: 0 }),
            p.pfdRegistration?.count().then((count: number) => ({ tableName: 'PfdRegistration', recordCount: count })) ?? Promise.resolve({ tableName: 'PfdRegistration', recordCount: 0 }),
            p.cpRegistration?.count().then((count: number) => ({ tableName: 'CpRegistration', recordCount: count })) ?? Promise.resolve({ tableName: 'CpRegistration', recordCount: 0 }),
            p.apqpRegistration?.count().then((count: number) => ({ tableName: 'ApqpRegistration', recordCount: count })) ?? Promise.resolve({ tableName: 'ApqpRegistration', recordCount: 0 }),
            p.documentLink?.count().then((count: number) => ({ tableName: 'DocumentLink', recordCount: count })) ?? Promise.resolve({ tableName: 'DocumentLink', recordCount: 0 }),
            p.projectLinkage?.count().then((count: number) => ({ tableName: 'ProjectLinkage', recordCount: count })) ?? Promise.resolve({ tableName: 'ProjectLinkage', recordCount: 0 }),
            p.lessonsLearned?.count().then((count: number) => ({ tableName: 'LessonsLearned', recordCount: count })) ?? Promise.resolve({ tableName: 'LessonsLearned', recordCount: 0 }),
            p.fmeaApproval?.count().then((count: number) => ({ tableName: 'FmeaApproval', recordCount: count })) ?? Promise.resolve({ tableName: 'FmeaApproval', recordCount: 0 }),
            p.accessLog?.count().then((count: number) => ({ tableName: 'AccessLog', recordCount: count })) ?? Promise.resolve({ tableName: 'AccessLog', recordCount: 0 }),
        ]);

        // 레코드 수 기준 내림차순 정렬
        stats.sort((a, b) => b.recordCount - a.recordCount);

        return NextResponse.json({ success: true, stats });
    } catch (error: any) {
        console.error('DB 통계 조회 오류:', error);
        return NextResponse.json({ success: false, error: error.message, stats: [] });
    }
}
