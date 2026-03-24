/**
 * @file /api/health/route.ts
 * @description 헬스체크 엔드포인트
 * Docker, Kubernetes, 로드밸런서에서 애플리케이션 상태를 확인하는데 사용
 *
 * @endpoint GET /api/health
 * @returns 200 - 정상, 503 - 서비스 불가
 */

import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export async function GET() {
  const startTime = Date.now();

  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: 0,
    checks: {
      app: 'ok',
      database: 'unknown',
      memory: 'ok',
    },
  };

  // 1. 데이터베이스 연결 체크
  try {
    const prisma = getPrisma();
    if (prisma) {
      await prisma.$queryRaw`SELECT 1`;
      checks.checks.database = 'ok';
    } else {
      console.error('[Health Check] getPrisma() returned null. DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'MISSING');
      checks.checks.database = 'not_configured';
      checks.status = 'degraded';
    }
  } catch (error) {
    console.error('[Health Check] Database connection failed:', error);
    checks.checks.database = 'fail';
    checks.status = 'unhealthy';
  }

  // 2. 메모리 사용량 체크
  const memoryUsage = process.memoryUsage();
  const heapUsedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

  if (heapUsedPercent > 95) {
    checks.checks.memory = 'critical';
    checks.status = 'unhealthy';
  } else if (heapUsedPercent > 85) {
    checks.checks.memory = 'warning';
    if (checks.status === 'healthy') {
      checks.status = 'degraded';
    }
  }

  // 3. 응답 시간 계산
  checks.responseTime = Date.now() - startTime;

  // 4. 상태 코드 결정 — unhealthy만 503, degraded는 200 (서비스 가용)
  const statusCode = checks.status === 'unhealthy' ? 503 : 200;

  return NextResponse.json(checks, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
