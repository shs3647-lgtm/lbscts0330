/**
 * 오래된 백업 파일 자동 정리 API
 * - 30일 이상 된 백업 파일 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { fmeaId, days = 30 } = await req.json();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    let deletedCount = 0;
    
    if (fmeaId) {
      // 특정 프로젝트만 정리
      const projectDir = path.join(process.cwd(), 'backups', 'projects', fmeaId);
      if (fs.existsSync(projectDir)) {
        deletedCount = await cleanupDirectory(projectDir, cutoffDate);
      }
    } else {
      // 전체 프로젝트 정리
      const backupsDir = path.join(process.cwd(), 'backups', 'projects');
      if (fs.existsSync(backupsDir)) {
        const projects = fs.readdirSync(backupsDir);
        for (const project of projects) {
          const projectDir = path.join(backupsDir, project);
          if (fs.statSync(projectDir).isDirectory()) {
            deletedCount += await cleanupDirectory(projectDir, cutoffDate);
          }
        }
      }
    }
    
    console.log(`✅ 백업 정리 완료: ${deletedCount}개 파일 삭제`);
    
    return NextResponse.json({
      success: true,
      deletedCount,
      message: `${deletedCount}개 백업 파일이 삭제되었습니다.`,
    });
  } catch (error: any) {
    console.error('[백업 정리] 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message, deletedCount: 0 },
      { status: 500 }
    );
  }
}

async function cleanupDirectory(dirPath: string, cutoffDate: Date): Promise<number> {
  let deletedCount = 0;
  
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      // 디렉토리는 재귀적으로 처리하지 않음 (프로젝트별로만 정리)
      if (stats.isFile()) {
        const fileDate = stats.mtime;
        if (fileDate < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`[백업 정리] 삭제: ${filePath}`);
        }
      }
    }
    
    // metadata.json 업데이트 (삭제된 파일 제거)
    const metadataPath = path.join(dirPath, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      try {
        const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
        const backups = JSON.parse(metadataContent);
        const filtered = backups.filter((backup: any) => {
          const backupDate = new Date(backup.backupDate);
          return backupDate >= cutoffDate;
        });
        
        if (filtered.length !== backups.length) {
          fs.writeFileSync(metadataPath, JSON.stringify(filtered, null, 2), 'utf-8');
          console.log(`[백업 정리] 메타데이터 업데이트: ${dirPath}`);
        }
      } catch (e) {
        console.warn(`[백업 정리] 메타데이터 업데이트 실패: ${dirPath}`, e);
      }
    }
  } catch (error) {
    console.error(`[백업 정리] 디렉토리 처리 실패: ${dirPath}`, error);
  }
  
  return deletedCount;
}








