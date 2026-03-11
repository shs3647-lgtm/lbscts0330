/**
 * 백업 목록 조회 API (metadata API로 리다이렉트)
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

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const fmeaId = searchParams.get('fmeaId');
    
    if (!fmeaId) {
      return NextResponse.json(
        { success: false, error: 'FMEA ID is required', backups: [], total: 0 },
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
    
    // 날짜순 정렬 (최신순)
    backups.sort((a, b) => 
      new Date(b.backupDate).getTime() - new Date(a.backupDate).getTime()
    );
    
    return NextResponse.json({
      success: true,
      backups,
      total: backups.length,
    });
  } catch (error: any) {
    console.error('[백업 목록] 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message, backups: [], total: 0 },
      { status: 500 }
    );
  }
}








