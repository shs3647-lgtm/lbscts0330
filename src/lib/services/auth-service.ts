/**
 * @file auth-service.ts
 * @description 사용자 인증 서비스
 * @created 2026-01-21
 */

import { getPrisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// ============ 타입 정의 ============

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  factory: string;      // ★ 회사명 (AMPSYSTEM 등)
  department: string;   // 부서명
  engineeringLocation: string; // ★ 엔지니어링 위치 (우리 회사 공장: 천안공장 등)
  position: string;
  role: string;
  permPfmea: string;
  permDfmea: string;
  permCp: string;
  permPfd: string;
  photoUrl?: string | null;
}

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

// ============ Admin 초기화 ============

/**
 * Admin 사용자 초기화 — DB에 사용자가 0명일 때만 생성 (초기 부트스트랩 전용)
 * ★ 온프레미스: 사용자가 admin을 삭제하면 다시 생성하지 않음
 *   (다른 사용자가 있으면 의도적 삭제로 간주)
 */
export async function initializeAdmin(): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;

  try {
    // DB에 활성 사용자가 1명이라도 있으면 admin 자동 생성 안 함
    const userCount = await prisma.user.count({ where: { isActive: true } });
    if (userCount > 0) return;

    // DB에 사용자가 0명 → 최초 설정: admin 계정 생성
    const hashedPassword = await bcrypt.hash('1234', 10);
    await prisma.user.create({
      data: {
        name: 'admin',
        email: 'admin@fmea.local',
        factory: 'LBS',
        department: 'IT',
        position: 'Administrator',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        permPfmea: 'write',
        permDfmea: 'write',
        permCp: 'write',
        permPfd: 'write',
      }
    });
  } catch (error) {
    console.error('❌ Admin 초기화 실패:', error);
  }
}

// ============ 로그인/로그아웃 ============

// ============ 하드코딩된 계정 (DB 없이도 로그인 가능) ============
const HARDCODED_USERS = [
  {
    id: 'admin-default',
    name: 'admin',
    email: 'admin@fmea.local',
    password: process.env.ADMIN_DEFAULT_PASSWORD || '1234', // 환경변수 우선
    factory: 'LBS',  // ★ 회사명
    department: 'IT',
    engineeringLocation: '평택공장', // ★ 엔지니어링 위치
    position: 'Administrator',
    role: 'admin',
    permPfmea: 'write',
    permDfmea: 'write',
    permCp: 'write',
    permPfd: 'write',
  },
  {
    id: 'demo-amp',
    name: '신흥섭',
    email: 'amp@ampbiz.co.kr',
    password: process.env.DEMO_USER_PASSWORD || '1234', // 환경변수 우선
    factory: 'LBS',  // ★ 회사명
    department: 'FMEA개발팀',
    engineeringLocation: '천안공장', // ★ 엔지니어링 위치
    position: '데모사용자',
    role: 'admin',
    permPfmea: 'write',
    permDfmea: 'write',
    permCp: 'write',
    permPfd: 'write',
  },
];

/**
 * 사용자 로그인
 * - DB 사용자 정보 우선 조회
 * - DB 연결 실패 또는 사용자 없을 때 하드코딩 계정으로 폴백 (초기 설정용)
 */
export async function login(loginId: string, password: string): Promise<LoginResult> {
  const prisma = getPrisma();

  // ★ 1. DB 우선 조회 (온프레미스 배포 시 DB 사용자 정보 사용)
  if (prisma) {
    try {
      // 사용자 검색 (name 또는 email로)
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: loginId },
            { name: loginId }
          ],
          isActive: true
        }
      });

      if (user) {
        // 비밀번호가 없으면 하드코딩 비밀번호 확인
        if (!user.password) {
          const hardcodedUser = HARDCODED_USERS.find(u =>
            (u.name === loginId || u.email === loginId) && u.password === password
          );
          if (!hardcodedUser) {
            return { success: false, error: '비밀번호가 설정되지 않았습니다.' };
          }
        } else {
          // 비밀번호 검증 (전화번호 형식 자동 정규화: 하이픈 제거)
          let isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            // 전화번호 형식이면 숫자만 추출해서 재시도
            const digitsOnly = password.replace(/\D/g, '');
            if (digitsOnly !== password && digitsOnly.length >= 10) {
              isValid = await bcrypt.compare(digitsOnly, user.password);
            }
          }
          if (!isValid) {
            // 하드코딩 비밀번호로 재시도 (개발/데모용)
            const hardcodedUser = HARDCODED_USERS.find(u =>
              (u.name === loginId || u.email === loginId) && u.password === password
            );
            if (!hardcodedUser) {
              return { success: false, error: '비밀번호가 올바르지 않습니다.' };
            }
          }
        }

        // 마지막 로그인 시간 업데이트
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });

        // DB 사용자 정보 반환
        return {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            factory: user.factory,       // ★ 회사명 추가
            department: user.department,
            engineeringLocation: (user as any).engineeringLocation || '천안공장', // ★ 엔지니어링 위치
            position: user.position,
            role: user.role,
            permPfmea: user.permPfmea,
            permDfmea: user.permDfmea,
            permCp: user.permCp,
            permPfd: user.permPfd,
            photoUrl: (user as any).photoUrl || null,
          }
        };
      }
    } catch (dbError) {
      console.error('[auth] DB 로그인 조회 실패:', dbError);
    }
  }

  // ★ 2. 폴백: 하드코딩된 계정 체크 (DB 없거나 사용자 없을 때)
  const hardcodedUser = HARDCODED_USERS.find(u =>
    (u.name === loginId || u.email === loginId) && u.password === password
  );

  if (hardcodedUser) {

    // DB 연결되어 있으면 DB에서 추가 정보 가져오기
    let photoUrl: string | null = null;
    let dbUserId = hardcodedUser.id;
    if (prisma) {
      try {
        const dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: hardcodedUser.email },
              { name: hardcodedUser.name }
            ]
          },
          select: { id: true, photoUrl: true, department: true, factory: true }
        });
        if (dbUser) {
          photoUrl = dbUser.photoUrl;
          dbUserId = dbUser.id;
        }
      } catch (e) {
        console.error('[auth] DB 사용자 조회 실패:', e);
      }
    }

    return {
      success: true,
      user: {
        id: dbUserId,
        name: hardcodedUser.name,
        email: hardcodedUser.email,
        factory: hardcodedUser.factory,      // ★ 회사명 추가
        department: hardcodedUser.department,
        engineeringLocation: hardcodedUser.engineeringLocation, // ★ 엔지니어링 위치
        position: hardcodedUser.position,
        role: hardcodedUser.role,
        permPfmea: hardcodedUser.permPfmea,
        permDfmea: hardcodedUser.permDfmea,
        permCp: hardcodedUser.permCp,
        permPfd: hardcodedUser.permPfd,
        photoUrl,
      }
    };
  }

  // 로그인 실패
  if (!prisma) {
    return { success: false, error: 'Database not configured. Only admin can login.' };
  }
  return { success: false, error: '사용자를 찾을 수 없거나 비밀번호가 올바르지 않습니다.' };
}

/**
 * 접속 로그 기록
 */
export async function logAccess(data: {
  userId?: string;
  userName: string;
  projectId?: string;
  module: string;
  action: string;
  itemType?: string;
  cellAddress?: string;
  description?: string;
}): Promise<void> {
  const prisma = getPrisma();
  if (!prisma || !prisma.accessLog) return;

  try {
    await prisma.accessLog.create({
      data: {
        userId: data.userId || null,
        userName: data.userName,
        projectId: data.projectId || null,
        module: data.module,
        action: data.action,
        itemType: data.itemType || null,
        cellAddress: data.cellAddress || null,
        description: data.description || null,
      }
    });
  } catch (error) {
    console.error('[auth] 접속 로그 기록 실패:', error);
  }
}

/**
 * 접속 로그 조회
 */
export async function getAccessLogs(
  projectId?: string,
  limit: number = 50,
  module?: string,
  offset: number = 0
): Promise<{ logs: any[]; total: number }> {
  const prisma = getPrisma();
  if (!prisma || !prisma.accessLog) return { logs: [], total: 0 };

  try {
    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (module) where.module = module;

    const [logs, total] = await Promise.all([
      prisma.accessLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.accessLog.count({ where }),
    ]);

    return {
      total,
      logs: logs.map((log, idx) => ({
        id: offset + idx + 1,
        projectId: log.projectId || '',
        userName: log.userName,
        loginTime: log.loginTime.toISOString().replace('T', ' ').substring(0, 19),
        logoutTime: log.logoutTime?.toISOString().replace('T', ' ').substring(0, 19) || null,
        action: log.action === 'create' ? '추가' :
          log.action === 'update' ? '수정' :
            log.action === 'delete' ? '삭제' :
              log.action === 'login' ? '로그인' :
                log.action === 'logout' ? '로그아웃' : '조회',
        itemType: log.itemType || '-',
        cellAddress: log.cellAddress || '-',
        description: log.description || '-',
      })),
    };
  } catch (error) {
    console.error('❌ 접속 로그 조회 실패:', error);
    return { logs: [], total: 0 };
  }
}

/**
 * ★★★ 2026-02-02: 로그아웃 시간 업데이트 ★★★
 * 페이지 이탈 시 가장 최근 접속 로그의 logoutTime 업데이트
 */
export async function updateLogoutTime(userId?: string, projectId?: string, module?: string): Promise<void> {
  const prisma = getPrisma();
  if (!prisma || !prisma.accessLog) return;

  try {
    // 가장 최근 접속 로그 찾기 (같은 사용자, 프로젝트, 모듈)
    const recentLog = await prisma.accessLog.findFirst({
      where: {
        ...(userId && { userId }),
        ...(projectId && { projectId }),
        ...(module && { module }),
        logoutTime: null, // 아직 로그아웃 안된 로그
      },
      orderBy: { loginTime: 'desc' },
    });

    if (recentLog) {
      await prisma.accessLog.update({
        where: { id: recentLog.id },
        data: { logoutTime: new Date() },
      });
    }
  } catch (error) {
    console.error('[auth] 로그아웃 시간 업데이트 실패:', error);
  }
}
