/**
 * @file /api/fmea/version-backup/route.ts
 * @description FMEA 버전별 백업 API - 백업 생성, 조회, 복구
 * @created 2026-01-19
 * @lines ~200 (500줄 미만 원칙)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ============================================================================
// 타입 정의
// ============================================================================

interface BackupCreateRequest {
  fmeaId: string;
  version: string;      // "1.00", "1.01", "2.00"
  versionType: 'MAJOR' | 'MINOR';
  backupData: object;   // 전체 FMEA 데이터
  changeNote?: string;
  triggerType: 'MANUAL' | 'AUTO_CONFIRM' | 'MAJOR_REVISION' | 'RESTORE';
  createdBy?: string;
}

interface BackupRestoreRequest {
  fmeaId: string;
  version: string;
}

// ============================================================================
// GET - 백업 목록 조회
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fmeaId = searchParams.get('fmeaId');
    
    if (!fmeaId) {
      return NextResponse.json({ error: 'fmeaId is required' }, { status: 400 });
    }
    
    // DB에서 백업 목록 조회
    const backups = await prisma.fmeaVersionBackup.findMany({
      where: { fmeaId: fmeaId.toLowerCase() },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fmeaId: true,
        version: true,
        revMajor: true,
        revMinor: true,
        versionType: true,
        dataSize: true,
        compressed: true,
        changeNote: true,
        triggerType: true,
        createdBy: true,
        createdAt: true,
        // backupData는 목록에서 제외 (용량 절약)
      },
    });
    
    return NextResponse.json({
      success: true,
      backups,
      count: backups.length,
    });
    
  } catch (error) {
    console.error('[version-backup] GET 오류:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch backups',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// ============================================================================
// POST - 백업 생성
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: BackupCreateRequest = await request.json();
    const { fmeaId, version, versionType, backupData, changeNote, triggerType, createdBy } = body;
    
    if (!fmeaId || !version || !backupData) {
      return NextResponse.json({ error: 'fmeaId, version, backupData are required' }, { status: 400 });
    }
    
    // 버전 파싱 (예: "1.05" → revMajor: 1, revMinor: 5)
    const [majorStr, minorStr] = version.split('.');
    const revMajor = parseInt(majorStr, 10) || 1;
    const revMinor = parseInt(minorStr, 10) || 0;
    
    // JSON 직렬화
    const jsonStr = JSON.stringify(backupData);
    const dataSize = new Blob([jsonStr]).size;
    
    // 중복 버전 확인 (동일 버전이 있으면 덮어쓰기)
    const normalizedFmeaId = fmeaId.toLowerCase();
    
    const existing = await prisma.fmeaVersionBackup.findUnique({
      where: { fmeaId_version: { fmeaId: normalizedFmeaId, version } },
    });
    
    let backup;
    
    if (existing) {
      // 기존 백업 업데이트
      backup = await prisma.fmeaVersionBackup.update({
        where: { id: existing.id },
        data: {
          backupData: jsonStr,
          dataSize,
          changeNote: changeNote || existing.changeNote,
          triggerType,
          createdBy: createdBy || 'admin',
          createdAt: new Date(),
        },
      });
      console.log(`[version-backup] 백업 업데이트: ${fmeaId} v${version}`);
    } else {
      // 새 백업 생성
      backup = await prisma.fmeaVersionBackup.create({
        data: {
          fmeaId: normalizedFmeaId,
          version,
          revMajor,
          revMinor,
          versionType: versionType || 'MINOR',
          backupData: jsonStr,
          dataSize,
          compressed: false,
          changeNote,
          triggerType,
          createdBy: createdBy || 'admin',
        },
      });
      console.log(`[version-backup] 백업 생성: ${fmeaId} v${version}`);
    }
    
    return NextResponse.json({
      success: true,
      backup: {
        id: backup.id,
        fmeaId: backup.fmeaId,
        version: backup.version,
        dataSize: backup.dataSize,
        createdAt: backup.createdAt,
      },
    });
    
  } catch (error) {
    console.error('[version-backup] POST 오류:', error);
    return NextResponse.json({ 
      error: 'Failed to create backup',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// ============================================================================
// PUT - 백업에서 복구
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body: BackupRestoreRequest = await request.json();
    const { fmeaId, version } = body;
    
    if (!fmeaId || !version) {
      return NextResponse.json({ error: 'fmeaId and version are required' }, { status: 400 });
    }
    
    const normalizedFmeaId = fmeaId.toLowerCase();
    
    // 백업 데이터 조회
    const backup = await prisma.fmeaVersionBackup.findUnique({
      where: { fmeaId_version: { fmeaId: normalizedFmeaId, version } },
    });
    
    if (!backup) {
      return NextResponse.json({ error: `Backup not found: ${fmeaId} v${version}` }, { status: 404 });
    }
    
    // JSON 파싱
    let backupData;
    try {
      backupData = JSON.parse(backup.backupData);
    } catch (parseError) {
      return NextResponse.json({ error: 'Failed to parse backup data' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      backup: {
        id: backup.id,
        fmeaId: backup.fmeaId,
        version: backup.version,
        versionType: backup.versionType,
        changeNote: backup.changeNote,
        createdAt: backup.createdAt,
      },
      data: backupData,
    });
    
  } catch (error) {
    console.error('[version-backup] PUT 오류:', error);
    return NextResponse.json({ 
      error: 'Failed to restore backup',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
