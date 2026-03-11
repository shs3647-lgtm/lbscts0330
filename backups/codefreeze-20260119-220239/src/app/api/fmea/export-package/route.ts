/**
 * FMEA 휴대용 패키지 내보내기 API
 * - 엑셀 파일 + JSON 데이터 + 메타데이터를 패키지로 생성
 * - 다른 PC에서 import하여 복원 가능
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

export const runtime = 'nodejs';

interface ExportPackage {
  metadata: {
    fmeaId: string;
    fmeaName: string;
    fmeaType: string;
    exportDate: string;
    version: string;
    exportedBy: string;
  };
  data: {
    l1Structure: any;
    l2Structures: any[];
    l3Structures: any[];
    l1Functions: any[];
    l2Functions: any[];
    l3Functions: any[];
    failureEffects: any[];
    failureModes: any[];
    failureCauses: any[];
    failureLinks: any[];
    riskAnalyses: any[];
    optimizations: any[];
    confirmedStates: any;
    legacyData: any;
  };
}

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
  }
  
  try {
    const { fmeaId, fmeaName, exportedBy } = await req.json();
    
    if (!fmeaId) {
      return NextResponse.json({ success: false, error: 'FMEA ID is required' }, { status: 400 });
    }
    
    // 1. DB에서 모든 데이터 조회
    const [
      l1Structure,
      l2Structures,
      l3Structures,
      l1Functions,
      l2Functions,
      l3Functions,
      failureEffects,
      failureModes,
      failureCauses,
      failureLinks,
      riskAnalyses,
      optimizations,
      confirmedStates,
      legacyData
    ] = await Promise.all([
      prisma.l1Structure.findFirst({ where: { fmeaId } }),
      prisma.l2Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } }),
      prisma.l3Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } }),
      prisma.l1Function.findMany({ where: { fmeaId } }),
      prisma.l2Function.findMany({ where: { fmeaId } }),
      prisma.l3Function.findMany({ where: { fmeaId } }),
      prisma.failureEffect.findMany({ where: { fmeaId } }),
      prisma.failureMode.findMany({ where: { fmeaId } }),
      prisma.failureCause.findMany({ where: { fmeaId } }),
      prisma.failureLink.findMany({ where: { fmeaId } }),
      prisma.riskAnalysis.findMany({ where: { fmeaId } }),
      prisma.optimization.findMany({ where: { fmeaId } }),
      prisma.fmeaConfirmedState.findFirst({ where: { fmeaId } }),
      prisma.fmeaLegacyData.findFirst({ where: { fmeaId } })
    ]);
    
    // 2. 패키지 구성
    const fmeaType = fmeaId.includes('-M') ? 'Master' : fmeaId.includes('-F') ? 'Family' : 'Part';
    
    const exportPackage: ExportPackage = {
      metadata: {
        fmeaId,
        fmeaName: fmeaName || l1Structure?.name || fmeaId,
        fmeaType,
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        exportedBy: exportedBy || 'System'
      },
      data: {
        l1Structure,
        l2Structures,
        l3Structures,
        l1Functions,
        l2Functions,
        l3Functions,
        failureEffects,
        failureModes,
        failureCauses,
        failureLinks,
        riskAnalyses,
        optimizations,
        confirmedStates,
        legacyData
      }
    };
    
    // 3. 통계 계산
    const stats = {
      processes: l2Structures.length,
      workElements: l3Structures.length,
      functions: l1Functions.length + l2Functions.length + l3Functions.length,
      failureLinks: failureLinks.length,
      risks: riskAnalyses.length,
      optimizations: optimizations.length
    };
    
    // 4. 폴더 생성 및 파일 저장
    const exportsDir = path.join(process.cwd(), 'exports', fmeaId);
    
    // exports 폴더가 없으면 생성
    if (!fs.existsSync(path.join(process.cwd(), 'exports'))) {
      fs.mkdirSync(path.join(process.cwd(), 'exports'), { recursive: true });
    }
    
    // FMEA ID 폴더 생성
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    // JSON 파일 저장
    const jsonPath = path.join(exportsDir, `${fmeaId}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(exportPackage, null, 2), 'utf-8');
    
    // 메타데이터 파일 저장
    const metadataPath = path.join(exportsDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify({
      ...exportPackage.metadata,
      stats
    }, null, 2), 'utf-8');
    
    // README 파일 저장
    const readmePath = path.join(exportsDir, 'README.txt');
    const readmeContent = `
========================================
FMEA 휴대용 패키지
========================================

FMEA ID: ${fmeaId}
FMEA 명: ${exportPackage.metadata.fmeaName}
유형: ${fmeaType}
내보내기 일시: ${new Date().toLocaleString('ko-KR')}
내보낸 사람: ${exportedBy || 'System'}

----------------------------------------
포함된 데이터
----------------------------------------
- 공정 수: ${stats.processes}개
- 작업요소 수: ${stats.workElements}개
- 기능 수: ${stats.functions}개
- 고장연결 수: ${stats.failureLinks}개
- 리스크 분석: ${stats.risks}개
- 최적화: ${stats.optimizations}개

----------------------------------------
사용 방법
----------------------------------------
1. 이 폴더 전체를 압축하여 공유
2. 다른 PC에서 압축 해제
3. FMEA 시스템에서 "가져오기" 선택
4. ${fmeaId}.json 파일 선택
5. 데이터 복원 완료

파일 설명:
- ${fmeaId}.json: 전체 데이터 (복원용)
- ${fmeaId}.xlsx: 엑셀 파일 (열람용) - 별도 생성 필요
- metadata.json: 메타데이터
- README.txt: 이 파일

========================================
`;
    fs.writeFileSync(readmePath, readmeContent, 'utf-8');
    
    console.log(`✅ FMEA 패키지 내보내기 완료: ${exportsDir}`);
    
    return NextResponse.json({
      success: true,
      message: `패키지 내보내기 완료: ${fmeaId}`,
      exportPath: exportsDir,
      files: [
        `${fmeaId}.json`,
        'metadata.json',
        'README.txt'
      ],
      stats,
      metadata: exportPackage.metadata
    });
    
  } catch (error: any) {
    console.error('패키지 내보내기 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// GET: 내보내기 가능한 FMEA 목록 조회
export async function GET() {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
  }
  
  try {
    // 확정된 FMEA 목록 조회
    const confirmedFmeas = await prisma.fmeaConfirmedState.findMany({
      where: {
        OR: [
          { structureConfirmed: true },
          { l1FunctionConfirmed: true }
        ]
      },
      select: {
        fmeaId: true,
        structureConfirmed: true,
        l1FunctionConfirmed: true,
        l2FunctionConfirmed: true,
        l3FunctionConfirmed: true,
        failureLinkConfirmed: true,
        riskConfirmed: true,
        optimizationConfirmed: true
      }
    });
    
    return NextResponse.json({
      success: true,
      fmeas: confirmedFmeas
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

