/**
 * 백업 메타데이터 관리 API
 */
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export const runtime = 'nodejs';

interface BackupMetadata {
  fmeaId: string;
  fmeaName: string;
  backupType: 'auto' | 'manual';
  backupDate: string;
  filePaths: {
    excel?: string;
    json?: string;
    snapshot?: string;
  };
  stats: {
    processes: number;
    workElements: number;
    functions: number;
    failureLinks: number;
    risks: number;
    optimizations: number;
  };
}

// POST: 메타데이터 저장
export async function POST(req: NextRequest) {
  try {
    const metadata: BackupMetadata = await req.json();
    
    if (!metadata.fmeaId) {
      return NextResponse.json(
        { success: false, error: 'FMEA ID is required' },
        { status: 400 }
      );
    }
    
    // 백업 디렉토리 생성
    const backupsDir = path.join(process.cwd(), 'backups', 'projects', metadata.fmeaId);
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    
    // 메타데이터 파일 경로
    const metadataPath = path.join(backupsDir, 'metadata.json');
    
    // 기존 메타데이터 로드
    let allBackups: BackupMetadata[] = [];
    if (fs.existsSync(metadataPath)) {
      try {
        const existing = fs.readFileSync(metadataPath, 'utf-8');
        allBackups = JSON.parse(existing);
      } catch (e) {
        console.warn('[백업 메타데이터] 기존 파일 읽기 실패, 새로 생성');
      }
    }
    
    // 새 백업 추가
    allBackups.push(metadata);
    
    // 날짜순 정렬 (최신순)
    allBackups.sort((a, b) => 
      new Date(b.backupDate).getTime() - new Date(a.backupDate).getTime()
    );
    
    // 메타데이터 저장
    fs.writeFileSync(metadataPath, JSON.stringify(allBackups, null, 2), 'utf-8');
    
    console.log(`✅ 백업 메타데이터 저장 완료: ${metadata.fmeaId}`);
    
    return NextResponse.json({
      success: true,
      message: '백업 메타데이터 저장 완료',
      totalBackups: allBackups.length,
    });
  } catch (error: any) {
    console.error('[백업 메타데이터] 저장 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET: 백업 목록 조회
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const fmeaId = searchParams.get('fmeaId');
    
    if (!fmeaId) {
      return NextResponse.json(
        { success: false, error: 'FMEA ID is required' },
        { status: 400 }
      );
    }
    
    const metadataPath = path.join(
      process.cwd(),
      'backups',
      'projects',
      fmeaId,
      'metadata.json'
    );
    
    if (!fs.existsSync(metadataPath)) {
      return NextResponse.json({
        success: true,
        backups: [],
        total: 0,
      });
    }
    
    const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
    const backups: BackupMetadata[] = JSON.parse(metadataContent);
    
    return NextResponse.json({
      success: true,
      backups,
      total: backups.length,
    });
  } catch (error: any) {
    console.error('[백업 메타데이터] 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message, backups: [], total: 0 },
      { status: 500 }
    );
  }
}








