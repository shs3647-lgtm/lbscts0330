/**
 * FMEA 휴대용 패키지 가져오기 API
 * - JSON 파일에서 데이터를 읽어 DB에 복원
 * - 기존 데이터가 있으면 덮어쓰기 또는 새 ID 생성
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

interface ImportPackage {
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
    const body = await req.json();
    const { packageData, mode = 'overwrite', newFmeaId } = body;
    
    // packageData는 ImportPackage 형식의 JSON
    const pkg: ImportPackage = packageData;
    
    if (!pkg || !pkg.metadata || !pkg.data) {
      return NextResponse.json({ 
        success: false, 
        error: '유효하지 않은 패키지 형식입니다' 
      }, { status: 400 });
    }
    
    const targetFmeaId = mode === 'new' && newFmeaId ? newFmeaId : pkg.metadata.fmeaId;
    
    console.log(`📦 FMEA 패키지 가져오기 시작: ${targetFmeaId} (mode: ${mode})`);
    
    // 트랜잭션으로 모든 데이터 저장
    const result = await prisma.$transaction(async (tx) => {
      // 기존 데이터 삭제 (overwrite 모드)
      if (mode === 'overwrite') {
        await tx.optimization.deleteMany({ where: { fmeaId: targetFmeaId } });
        await tx.riskAnalysis.deleteMany({ where: { fmeaId: targetFmeaId } });
        await tx.failureLink.deleteMany({ where: { fmeaId: targetFmeaId } });
        await tx.failureCause.deleteMany({ where: { fmeaId: targetFmeaId } });
        await tx.failureMode.deleteMany({ where: { fmeaId: targetFmeaId } });
        await tx.failureEffect.deleteMany({ where: { fmeaId: targetFmeaId } });
        await tx.l3Function.deleteMany({ where: { fmeaId: targetFmeaId } });
        await tx.l2Function.deleteMany({ where: { fmeaId: targetFmeaId } });
        await tx.l1Function.deleteMany({ where: { fmeaId: targetFmeaId } });
        await tx.l3Structure.deleteMany({ where: { fmeaId: targetFmeaId } });
        await tx.l2Structure.deleteMany({ where: { fmeaId: targetFmeaId } });
        await tx.l1Structure.deleteMany({ where: { fmeaId: targetFmeaId } });
        await tx.fmeaConfirmedState.deleteMany({ where: { fmeaId: targetFmeaId } });
        await tx.fmeaLegacyData.deleteMany({ where: { fmeaId: targetFmeaId } });
      }
      
      const stats = {
        l1Structure: 0,
        l2Structures: 0,
        l3Structures: 0,
        l1Functions: 0,
        l2Functions: 0,
        l3Functions: 0,
        failureEffects: 0,
        failureModes: 0,
        failureCauses: 0,
        failureLinks: 0,
        riskAnalyses: 0,
        optimizations: 0
      };
      
      // L1 Structure
      if (pkg.data.l1Structure) {
        await tx.l1Structure.create({
          data: {
            id: pkg.data.l1Structure.id,
            fmeaId: targetFmeaId,
            name: pkg.data.l1Structure.name,
            confirmed: pkg.data.l1Structure.confirmed || false
          }
        });
        stats.l1Structure = 1;
      }
      
      // L2 Structures
      if (pkg.data.l2Structures?.length > 0) {
        for (const item of pkg.data.l2Structures) {
          await tx.l2Structure.create({
            data: {
              id: item.id,
              fmeaId: targetFmeaId,
              l1Id: item.l1Id,
              no: item.no,
              name: item.name,
              order: item.order || 0
            }
          });
        }
        stats.l2Structures = pkg.data.l2Structures.length;
      }
      
      // L3 Structures
      if (pkg.data.l3Structures?.length > 0) {
        for (const item of pkg.data.l3Structures) {
          await tx.l3Structure.create({
            data: {
              id: item.id,
              fmeaId: targetFmeaId,
              l1Id: item.l1Id,
              l2Id: item.l2Id,
              m4: item.m4,
              name: item.name,
              order: item.order || 0
            }
          });
        }
        stats.l3Structures = pkg.data.l3Structures.length;
      }
      
      // L1 Functions
      if (pkg.data.l1Functions?.length > 0) {
        for (const item of pkg.data.l1Functions) {
          await tx.l1Function.create({
            data: {
              id: item.id,
              fmeaId: targetFmeaId,
              l1StructId: item.l1StructId,
              category: item.category,
              functionName: item.functionName,
              requirement: item.requirement
            }
          });
        }
        stats.l1Functions = pkg.data.l1Functions.length;
      }
      
      // L2 Functions
      if (pkg.data.l2Functions?.length > 0) {
        for (const item of pkg.data.l2Functions) {
          await tx.l2Function.create({
            data: {
              id: item.id,
              fmeaId: targetFmeaId,
              l2StructId: item.l2StructId,
              functionName: item.functionName,
              productChar: item.productChar,
              specialChar: item.specialChar
            }
          });
        }
        stats.l2Functions = pkg.data.l2Functions.length;
      }
      
      // L3 Functions
      if (pkg.data.l3Functions?.length > 0) {
        for (const item of pkg.data.l3Functions) {
          await tx.l3Function.create({
            data: {
              id: item.id,
              fmeaId: targetFmeaId,
              l3StructId: item.l3StructId,
              l2StructId: item.l2StructId,
              functionName: item.functionName,
              processChar: item.processChar,
              specialChar: item.specialChar
            }
          });
        }
        stats.l3Functions = pkg.data.l3Functions.length;
      }
      
      // Failure Effects
      if (pkg.data.failureEffects?.length > 0) {
        for (const item of pkg.data.failureEffects) {
          await tx.failureEffect.create({
            data: {
              id: item.id,
              fmeaId: targetFmeaId,
              l1FuncId: item.l1FuncId,
              category: item.category,
              effect: item.effect,
              severity: item.severity
            }
          });
        }
        stats.failureEffects = pkg.data.failureEffects.length;
      }
      
      // Failure Modes
      if (pkg.data.failureModes?.length > 0) {
        for (const item of pkg.data.failureModes) {
          await tx.failureMode.create({
            data: {
              id: item.id,
              fmeaId: targetFmeaId,
              l2FuncId: item.l2FuncId,
              l2StructId: item.l2StructId,
              productCharId: item.productCharId,
              mode: item.mode,
              specialChar: item.specialChar
            }
          });
        }
        stats.failureModes = pkg.data.failureModes.length;
      }
      
      // Failure Causes
      if (pkg.data.failureCauses?.length > 0) {
        for (const item of pkg.data.failureCauses) {
          await tx.failureCause.create({
            data: {
              id: item.id,
              fmeaId: targetFmeaId,
              l3FuncId: item.l3FuncId,
              l3StructId: item.l3StructId,
              l2StructId: item.l2StructId,
              cause: item.cause,
              occurrence: item.occurrence
            }
          });
        }
        stats.failureCauses = pkg.data.failureCauses.length;
      }
      
      // Failure Links
      if (pkg.data.failureLinks?.length > 0) {
        for (const item of pkg.data.failureLinks) {
          await tx.failureLink.create({
            data: {
              id: item.id,
              fmeaId: targetFmeaId,
              fmId: item.fmId,
              feId: item.feId,
              fcId: item.fcId
            }
          });
        }
        stats.failureLinks = pkg.data.failureLinks.length;
      }
      
      // Risk Analyses
      if (pkg.data.riskAnalyses?.length > 0) {
        for (const item of pkg.data.riskAnalyses) {
          await tx.riskAnalysis.create({
            data: {
              id: item.id,
              fmeaId: targetFmeaId,
              linkId: item.linkId,
              severity: item.severity,
              occurrence: item.occurrence,
              detection: item.detection,
              ap: item.ap,
              preventionControl: item.preventionControl,
              detectionControl: item.detectionControl
            }
          });
        }
        stats.riskAnalyses = pkg.data.riskAnalyses.length;
      }
      
      // Optimizations
      if (pkg.data.optimizations?.length > 0) {
        for (const item of pkg.data.optimizations) {
          await tx.optimization.create({
            data: {
              id: item.id,
              fmeaId: targetFmeaId,
              riskId: item.riskId,
              recommendedAction: item.recommendedAction,
              responsible: item.responsible,
              targetDate: item.targetDate,
              newSeverity: item.newSeverity,
              newOccurrence: item.newOccurrence,
              newDetection: item.newDetection,
              newAP: item.newAP,
              status: item.status,
              completedDate: item.completedDate,
              remarks: item.remarks
            }
          });
        }
        stats.optimizations = pkg.data.optimizations.length;
      }
      
      // Confirmed States
      if (pkg.data.confirmedStates) {
        await tx.fmeaConfirmedState.create({
          data: {
            fmeaId: targetFmeaId,
            structureConfirmed: pkg.data.confirmedStates.structureConfirmed || false,
            l1FunctionConfirmed: pkg.data.confirmedStates.l1FunctionConfirmed || false,
            l2FunctionConfirmed: pkg.data.confirmedStates.l2FunctionConfirmed || false,
            l3FunctionConfirmed: pkg.data.confirmedStates.l3FunctionConfirmed || false,
            failureL1Confirmed: pkg.data.confirmedStates.failureL1Confirmed || false,
            failureL2Confirmed: pkg.data.confirmedStates.failureL2Confirmed || false,
            failureL3Confirmed: pkg.data.confirmedStates.failureL3Confirmed || false,
            failureLinkConfirmed: pkg.data.confirmedStates.failureLinkConfirmed || false,
            riskConfirmed: pkg.data.confirmedStates.riskConfirmed || false,
            optimizationConfirmed: pkg.data.confirmedStates.optimizationConfirmed || false
          }
        });
      }
      
      // Legacy Data
      if (pkg.data.legacyData) {
        await tx.fmeaLegacyData.create({
          data: {
            fmeaId: targetFmeaId,
            data: pkg.data.legacyData.data,
            version: pkg.data.legacyData.version || '1.0.0'
          }
        });
      }
      
      return stats;
    });
    
    console.log(`✅ FMEA 패키지 가져오기 완료: ${targetFmeaId}`);
    console.log('   통계:', result);
    
    return NextResponse.json({
      success: true,
      message: `패키지 가져오기 완료: ${targetFmeaId}`,
      fmeaId: targetFmeaId,
      originalFmeaId: pkg.metadata.fmeaId,
      mode,
      stats: result,
      metadata: pkg.metadata
    });
    
  } catch (error: any) {
    console.error('패키지 가져오기 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

