/**
 * @file route.ts
 * @description Master FMEA (Family) 원자성 데이터 전체 클론 API
 *
 * Source FMEA의 모든 원자성 테이블을 읽어 Target FMEA의 스키마로 복사합니다.
 * 복사 전 Target FMEA의 기존 데이터를 모두 삭제합니다 (force=true 동작과 동일).
 * 
 * @created 2026-03-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import { randomUUID } from 'crypto';

interface IdRemapMap {
  [oldId: string]: string;
}

function remap(idMap: IdRemapMap, oldId: string): string {
  return idMap[oldId] || oldId;
}

function remapOptional(idMap: IdRemapMap, oldId: string | null | undefined): string | null {
  if (!oldId) return null;
  return idMap[oldId] || oldId;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceFmeaId, targetFmeaId, l1Name } = body as { 
      sourceFmeaId: string; 
      targetFmeaId: string;
      l1Name?: string;
    };

    if (!sourceFmeaId || !targetFmeaId) {
      return NextResponse.json({ success: false, error: 'sourceFmeaId and targetFmeaId are required' }, { status: 400 });
    }

    const srcId = sourceFmeaId.toLowerCase();
    const tgtId = targetFmeaId.toLowerCase();

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) {
      return NextResponse.json({ success: false, error: 'Database environment not set' }, { status: 500 });
    }

    const sourceSchema = getProjectSchemaName(srcId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema: sourceSchema });
    const sourceClient = getPrismaForSchema(sourceSchema);

    const targetSchema = getProjectSchemaName(tgtId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema: targetSchema });
    const targetClient = getPrismaForSchema(targetSchema);

    if (!sourceClient || !targetClient) {
      return NextResponse.json({ success: false, error: 'Prisma client initialization failed' }, { status: 500 });
    }

    // ── 1. 타겟 기존 데이터 모두 삭제 ──
    const tx = targetClient as any;
    try {
      await tx.$transaction([
        tx.fmeaConfirmedState.deleteMany({ where: { fmeaId: tgtId } }).catch(() => {}),
        tx.failureAnalysis.deleteMany({ where: { fmeaId: tgtId } }),
        tx.riskAnalysis.deleteMany({ where: { fmeaId: tgtId } }),
        tx.failureLink.deleteMany({ where: { fmeaId: tgtId } }),
        tx.failureEffect.deleteMany({ where: { fmeaId: tgtId } }),
        tx.failureMode.deleteMany({ where: { fmeaId: tgtId } }),
        tx.failureCause.deleteMany({ where: { fmeaId: tgtId } }),
        tx.processProductChar.deleteMany({ where: { fmeaId: tgtId } }),
        tx.l3SpecialChar.deleteMany({ where: { fmeaId: tgtId } }).catch(() => {}),
        tx.l3ProcessChar.deleteMany({ where: { fmeaId: tgtId } }).catch(() => {}),
        tx.l3WorkElement.deleteMany({ where: { fmeaId: tgtId } }).catch(() => {}),
        tx.l3FourM.deleteMany({ where: { fmeaId: tgtId } }).catch(() => {}),
        tx.l3ProcessNo.deleteMany({ where: { fmeaId: tgtId } }).catch(() => {}),
        tx.l3Function.deleteMany({ where: { fmeaId: tgtId } }),
        tx.l2SpecialChar.deleteMany({ where: { fmeaId: tgtId } }).catch(() => {}),
        tx.l2Function.deleteMany({ where: { fmeaId: tgtId } }),
        tx.l2ProcessName.deleteMany({ where: { fmeaId: tgtId } }).catch(() => {}),
        tx.l2ProcessNo.deleteMany({ where: { fmeaId: tgtId } }).catch(() => {}),
        tx.l1Requirement.deleteMany({ where: { fmeaId: tgtId } }),
        tx.l1Scope.deleteMany({ where: { fmeaId: tgtId } }).catch(() => {}),
        tx.l1Function.deleteMany({ where: { fmeaId: tgtId } }),
        tx.l3Structure.deleteMany({ where: { fmeaId: tgtId } }),
        tx.l2Structure.deleteMany({ where: { fmeaId: tgtId } }),
        tx.l1Structure.deleteMany({ where: { fmeaId: tgtId } }),
      ]);
    } catch (err) {
      console.error('[clone-master] Failed to delete existing data:', err);
    }

    // ── 2. 소스 데이터 로드 ──
    const sc = sourceClient as any;
    const [
      srcL1Structs, srcL2Structs, srcL3Structs,
      srcL1Funcs, srcL2Funcs, srcL3Funcs,
      srcFEs, srcFMs, srcFCs,
      srcLinks, srcRisks, srcFAs,
      // v4 tables
      srcL1Scopes, srcL1Reqs, srcL2ProcessNos, srcL2ProcessNames, srcL2SpecialChars,
      srcProcessProductChars, srcL3ProcessNos, srcL3FourMs, srcL3WorkElements,
      srcL3ProcessChars, srcL3SpecialChars
    ] = await Promise.all([
      sc.l1Structure.findMany({ where: { fmeaId: srcId } }),
      sc.l2Structure.findMany({ where: { fmeaId: srcId } }),
      sc.l3Structure.findMany({ where: { fmeaId: srcId } }),
      sc.l1Function.findMany({ where: { fmeaId: srcId } }),
      sc.l2Function.findMany({ where: { fmeaId: srcId } }),
      sc.l3Function.findMany({ where: { fmeaId: srcId } }),
      sc.failureEffect.findMany({ where: { fmeaId: srcId } }),
      sc.failureMode.findMany({ where: { fmeaId: srcId } }),
      sc.failureCause.findMany({ where: { fmeaId: srcId } }),
      sc.failureLink.findMany({ where: { fmeaId: srcId, deletedAt: null } }),
      sc.riskAnalysis.findMany({ where: { fmeaId: srcId } }),
      sc.failureAnalysis.findMany({ where: { fmeaId: srcId } }),
      
      // V4 safe loads
      sc.l1Scope?.findMany({ where: { fmeaId: srcId } }).catch(() => []) || [],
      sc.l1Requirement?.findMany({ where: { fmeaId: srcId } }).catch(() => []) || [],
      sc.l2ProcessNo?.findMany({ where: { fmeaId: srcId } }).catch(() => []) || [],
      sc.l2ProcessName?.findMany({ where: { fmeaId: srcId } }).catch(() => []) || [],
      sc.l2SpecialChar?.findMany({ where: { fmeaId: srcId } }).catch(() => []) || [],
      sc.processProductChar?.findMany({ where: { fmeaId: srcId } }).catch(() => []) || [],
      sc.l3ProcessNo?.findMany({ where: { fmeaId: srcId } }).catch(() => []) || [],
      sc.l3FourM?.findMany({ where: { fmeaId: srcId } }).catch(() => []) || [],
      sc.l3WorkElement?.findMany({ where: { fmeaId: srcId } }).catch(() => []) || [],
      sc.l3ProcessChar?.findMany({ where: { fmeaId: srcId } }).catch(() => []) || [],
      sc.l3SpecialChar?.findMany({ where: { fmeaId: srcId } }).catch(() => []) || []
    ]);

    // ── 3. ID 맵 생성 (새 UUID 배정) ──
    const idMap: IdRemapMap = {};
    const allEntities = [
      ...srcL1Structs, ...srcL2Structs, ...srcL3Structs,
      ...srcL1Funcs, ...srcL2Funcs, ...srcL3Funcs,
      ...srcFEs, ...srcFMs, ...srcFCs,
      ...srcLinks, ...srcRisks, ...srcFAs,
      ...srcL1Scopes, ...srcL1Reqs, ...srcL2ProcessNos, ...srcL2ProcessNames, ...srcL2SpecialChars,
      ...srcProcessProductChars, ...srcL3ProcessNos, ...srcL3FourMs, ...srcL3WorkElements,
      ...srcL3ProcessChars, ...srcL3SpecialChars
    ];
    for (const entity of allEntities as any[]) {
      if (entity && entity.id && !idMap[entity.id]) {
        idMap[entity.id] = randomUUID();
      }
    }

    // ── 4. 트랜잭션으로 복사 (의존성 순서 준수!) ──
    await tx.$transaction(async (t: any) => {
      // 1. L1Structure
      if (srcL1Structs.length > 0) {
        await t.l1Structure.createMany({
          data: srcL1Structs.map((s: any) => ({
            id: remap(idMap, s.id),
            fmeaId: tgtId,
            name: l1Name || s.name,  // ★ override if provided
            confirmed: s.confirmed,
            rowIndex: s.rowIndex,
            colIndex: s.colIndex,
            parentId: remapOptional(idMap, s.parentId),
            mergeGroupId: remapOptional(idMap, s.mergeGroupId),
            rowSpan: s.rowSpan,
            colSpan: s.colSpan,
          })),
        });
      }

      // 2. L2Structure
      if (srcL2Structs.length > 0) {
        await t.l2Structure.createMany({
          data: srcL2Structs.map((s: any) => ({
            id: remap(idMap, s.id),
            fmeaId: tgtId,
            l1Id: remap(idMap, s.l1Id),
            no: s.no,
            name: s.name,
            order: s.order,
            rowIndex: s.rowIndex,
            colIndex: s.colIndex,
            parentId: remapOptional(idMap, s.parentId),
            mergeGroupId: remapOptional(idMap, s.mergeGroupId),
            rowSpan: s.rowSpan,
            colSpan: s.colSpan,
          })),
        });
      }

      // 3. L3Structure
      if (srcL3Structs.length > 0) {
        await t.l3Structure.createMany({
          data: srcL3Structs.map((s: any) => ({
            id: remap(idMap, s.id),
            fmeaId: tgtId,
            l1Id: remap(idMap, s.l1Id),
            l2Id: remap(idMap, s.l2Id),
            m4: s.m4,
            name: s.name,
            order: s.order,
            rowIndex: s.rowIndex,
            colIndex: s.colIndex,
            parentId: remapOptional(idMap, s.parentId),
            mergeGroupId: remapOptional(idMap, s.mergeGroupId),
            rowSpan: s.rowSpan,
            colSpan: s.colSpan,
          })),
        });
      }

      // 4. L1Scope
      if (srcL1Scopes.length > 0 && t.l1Scope) {
        await t.l1Scope.createMany({
          data: srcL1Scopes.map((s: any) => ({
            id: remap(idMap, s.id),
            fmeaId: tgtId,
            l1StructId: remap(idMap, s.l1StructId),
            parentId: remapOptional(idMap, s.parentId),
            scope: s.scope,
          })),
        });
      }

      // 5. L1Function
      if (srcL1Funcs.length > 0) {
        await t.l1Function.createMany({
          data: srcL1Funcs.map((f: any) => ({
            id: remap(idMap, f.id),
            fmeaId: tgtId,
            l1StructId: remap(idMap, f.l1StructId),
            category: f.category,
            functionName: f.functionName,
            requirement: f.requirement,
            parentId: remapOptional(idMap, f.parentId),
            mergeGroupId: remapOptional(idMap, f.mergeGroupId),
            rowSpan: f.rowSpan,
            colSpan: f.colSpan,
          })),
        });
      }

      // 6. L1Requirement
      if (srcL1Reqs.length > 0 && t.l1Requirement) {
        await t.l1Requirement.createMany({
          data: srcL1Reqs.map((r: any) => ({
            id: remap(idMap, r.id),
            fmeaId: tgtId,
            l1StructId: remap(idMap, r.l1StructId),
            l1FuncId: remap(idMap, r.l1FuncId),
            parentId: remapOptional(idMap, r.parentId),
            requirement: r.requirement,
            orderIndex: r.orderIndex,
          })),
        });
      }

      // 7. L2Function
      if (srcL2Funcs.length > 0) {
        await t.l2Function.createMany({
          data: srcL2Funcs.map((f: any) => ({
            id: remap(idMap, f.id),
            fmeaId: tgtId,
            l2StructId: remap(idMap, f.l2StructId),
            functionName: f.functionName,
            productChar: f.productChar,
            specialChar: f.specialChar,
            parentId: remapOptional(idMap, f.parentId),
            mergeGroupId: remapOptional(idMap, f.mergeGroupId),
            rowSpan: f.rowSpan,
            colSpan: f.colSpan,
          })),
        });
      }

      // 8. L2ProcessNo
      if (srcL2ProcessNos.length > 0 && t.l2ProcessNo) {
        await t.l2ProcessNo.createMany({
          data: srcL2ProcessNos.map((p: any) => ({
            id: remap(idMap, p.id),
            fmeaId: tgtId,
            l2StructId: remap(idMap, p.l2StructId),
            parentId: remapOptional(idMap, p.parentId),
            no: p.no,
          }))
        });
      }

      // 9. L2ProcessName
      if (srcL2ProcessNames.length > 0 && t.l2ProcessName) {
        await t.l2ProcessName.createMany({
          data: srcL2ProcessNames.map((p: any) => ({
            id: remap(idMap, p.id),
            fmeaId: tgtId,
            l2StructId: remap(idMap, p.l2StructId),
            parentId: remapOptional(idMap, p.parentId),
            name: p.name,
          }))
        });
      }

      // 10. ProcessProductChar
      if (srcProcessProductChars.length > 0 && t.processProductChar) {
        await t.processProductChar.createMany({
          data: srcProcessProductChars.map((p: any) => ({
            id: remap(idMap, p.id),
            fmeaId: tgtId,
            l2StructId: remap(idMap, p.l2StructId),
            name: p.name,
            specialChar: p.specialChar,
            orderIndex: p.orderIndex,
          }))
        });
      }

      // 11. L2SpecialChar
      if (srcL2SpecialChars.length > 0 && t.l2SpecialChar) {
        await t.l2SpecialChar.createMany({
          data: srcL2SpecialChars.map((sc: any) => ({
            id: remap(idMap, sc.id),
            fmeaId: tgtId,
            l2StructId: remap(idMap, sc.l2StructId),
            l2FuncId: remap(idMap, sc.l2FuncId),
            parentId: remapOptional(idMap, sc.parentId),
            value: sc.value,
          }))
        });
      }

      // 12. FailureEffect
      if (srcFEs.length > 0) {
        await t.failureEffect.createMany({
          data: srcFEs.map((fe: any) => ({
            id: remap(idMap, fe.id),
            fmeaId: tgtId,
            l1FuncId: remap(idMap, fe.l1FuncId),
            category: fe.category,
            effect: fe.effect,
            severity: fe.severity,
            parentId: remapOptional(idMap, fe.parentId),
            mergeGroupId: remapOptional(idMap, fe.mergeGroupId),
            rowSpan: fe.rowSpan,
            colSpan: fe.colSpan,
          })),
        });
      }

      // 13. FailureMode
      if (srcFMs.length > 0) {
        await t.failureMode.createMany({
          data: srcFMs.map((fm: any) => ({
            id: remap(idMap, fm.id),
            fmeaId: tgtId,
            l2FuncId: remap(idMap, fm.l2FuncId),
            l2StructId: remap(idMap, fm.l2StructId),
            productCharId: remapOptional(idMap, fm.productCharId),
            mode: fm.mode,
            specialChar: fm.specialChar,
            parentId: remapOptional(idMap, fm.parentId),
            feRefs: fm.feRefs || [],
            fcRefs: fm.fcRefs || [],
            mergeGroupId: remapOptional(idMap, fm.mergeGroupId),
            rowSpan: fm.rowSpan,
            colSpan: fm.colSpan,
          })),
        });
      }

      // 14. L3Function
      if (srcL3Funcs.length > 0) {
        await t.l3Function.createMany({
          data: srcL3Funcs.map((f: any) => ({
            id: remap(idMap, f.id),
            fmeaId: tgtId,
            l3StructId: remap(idMap, f.l3StructId),
            l2StructId: remap(idMap, f.l2StructId),
            functionName: f.functionName,
            processChar: f.processChar,
            specialChar: f.specialChar,
            parentId: remapOptional(idMap, f.parentId),
            mergeGroupId: remapOptional(idMap, f.mergeGroupId),
            rowSpan: f.rowSpan,
            colSpan: f.colSpan,
          })),
        });
      }

      // 15. L3ProcessChar
      if (srcL3ProcessChars.length > 0 && t.l3ProcessChar) {
        await t.l3ProcessChar.createMany({
          data: srcL3ProcessChars.map((p: any) => ({
            id: remap(idMap, p.id),
            fmeaId: tgtId,
            l3FuncId: remap(idMap, p.l3FuncId),
            l3StructId: remap(idMap, p.l3StructId),
            parentId: remapOptional(idMap, p.parentId),
            name: p.name,
            specialChar: p.specialChar,
          }))
        });
      }

      // 16. L3ProcessNo, L3FourM, L3WorkElement, L3SpecialChar
      if (srcL3ProcessNos.length > 0 && t.l3ProcessNo) {
        await t.l3ProcessNo.createMany({
          data: srcL3ProcessNos.map((p: any) => ({
            id: remap(idMap, p.id),
            fmeaId: tgtId,
            l3StructId: remap(idMap, p.l3StructId),
            parentId: remapOptional(idMap, p.parentId),
            no: p.no,
          }))
        });
      }
      if (srcL3FourMs.length > 0 && t.l3FourM) {
        await t.l3FourM.createMany({
          data: srcL3FourMs.map((p: any) => ({
            id: remap(idMap, p.id),
            fmeaId: tgtId,
            l3StructId: remap(idMap, p.l3StructId),
            parentId: remapOptional(idMap, p.parentId),
            m4: p.m4,
          }))
        });
      }
      if (srcL3WorkElements.length > 0 && t.l3WorkElement) {
        await t.l3WorkElement.createMany({
          data: srcL3WorkElements.map((p: any) => ({
            id: remap(idMap, p.id),
            fmeaId: tgtId,
            l3StructId: remap(idMap, p.l3StructId),
            parentId: remapOptional(idMap, p.parentId),
            name: p.name,
          }))
        });
      }
      if (srcL3SpecialChars.length > 0 && t.l3SpecialChar) {
        await t.l3SpecialChar.createMany({
          data: srcL3SpecialChars.map((p: any) => ({
            id: remap(idMap, p.id),
            fmeaId: tgtId,
            l3StructId: remap(idMap, p.l3StructId),
            l3ProcessCharId: remap(idMap, p.l3ProcessCharId),
            parentId: remapOptional(idMap, p.parentId),
            value: p.value,
          }))
        });
      }

      // 17. FailureCause
      if (srcFCs.length > 0) {
        await t.failureCause.createMany({
          data: srcFCs.map((fc: any) => ({
            id: remap(idMap, fc.id),
            fmeaId: tgtId,
            l3FuncId: remap(idMap, fc.l3FuncId),
            l3StructId: remap(idMap, fc.l3StructId),
            l2StructId: remap(idMap, fc.l2StructId),
            processCharId: remapOptional(idMap, fc.processCharId),
            cause: fc.cause,
            occurrence: fc.occurrence,
            parentId: remapOptional(idMap, fc.parentId),
            mergeGroupId: remapOptional(idMap, fc.mergeGroupId),
            rowSpan: fc.rowSpan,
            colSpan: fc.colSpan,
          })),
        });
      }

      // 18. FailureLink
      if (srcLinks.length > 0) {
        await t.failureLink.createMany({
          data: srcLinks.map((link: any) => ({
            id: remap(idMap, link.id),
            fmeaId: tgtId,
            fmId: remap(idMap, link.fmId),
            feId: remap(idMap, link.feId),
            fcId: remap(idMap, link.fcId),
            fmText: link.fmText,
            fmProcess: link.fmProcess,
            feText: link.feText,
            feScope: link.feScope,
            fcText: link.fcText,
            fcWorkElem: link.fcWorkElem,
            fcM4: link.fcM4,
            l2StructId: remapOptional(idMap, link.l2StructId),
            l3StructId: remapOptional(idMap, link.l3StructId),
            severity: link.severity,
            fmSeq: link.fmSeq,
            feSeq: link.feSeq,
            fcSeq: link.fcSeq,
            fmPath: link.fmPath,
            fePath: link.fePath,
            fcPath: link.fcPath,
            parentId: remapOptional(idMap, link.parentId),
            mergeGroupId: remapOptional(idMap, link.mergeGroupId),
            rowSpan: link.rowSpan,
            colSpan: link.colSpan,
          })),
        });
      }

      // 19. RiskAnalysis
      if (srcRisks.length > 0) {
        await t.riskAnalysis.createMany({
          data: srcRisks.map((risk: any) => ({
            id: remap(idMap, risk.id),
            fmeaId: tgtId,
            linkId: remap(idMap, risk.linkId),
            fmId: remapOptional(idMap, risk.fmId),
            fcId: remapOptional(idMap, risk.fcId),
            feId: remapOptional(idMap, risk.feId),
            severity: risk.severity,
            occurrence: risk.occurrence,
            detection: risk.detection,
            ap: risk.ap,
            preventionControl: risk.preventionControl,
            detectionControl: risk.detectionControl,
            lldReference: risk.lldReference || null,
          })),
        });
      }

      // 20. FailureAnalysis
      if (srcFAs.length > 0) {
        await t.failureAnalysis.createMany({
          data: srcFAs.map((fa: any) => ({
            id: remap(idMap, fa.id),
            fmeaId: tgtId,
            linkId: remap(idMap, fa.linkId),
            fmId: remap(idMap, fa.fmId),
            fmText: fa.fmText,
            fmProcessName: fa.fmProcessName,
            feId: remap(idMap, fa.feId),
            feText: fa.feText,
            feCategory: fa.feCategory,
            feSeverity: fa.feSeverity,
            fcId: remap(idMap, fa.fcId),
            fcText: fa.fcText,
            fcOccurrence: fa.fcOccurrence,
            fcWorkElementName: fa.fcWorkElementName,
            fcM4: fa.fcM4,
            l1FuncId: remap(idMap, fa.l1FuncId),
            l1Category: fa.l1Category,
            l1FuncName: fa.l1FuncName,
            l1Requirement: fa.l1Requirement,
            l2FuncId: remap(idMap, fa.l2FuncId),
            l2FuncName: fa.l2FuncName,
            l2ProductChar: fa.l2ProductChar,
            l2SpecialChar: fa.l2SpecialChar,
            l3FuncId: remap(idMap, fa.l3FuncId),
            l3FuncName: fa.l3FuncName,
            l3ProcessChar: fa.l3ProcessChar,
            l3SpecialChar: fa.l3SpecialChar,
            l1StructId: remap(idMap, fa.l1StructId),
            l1StructName: fa.l1StructName,
            l2StructId: remap(idMap, fa.l2StructId),
            l2StructNo: fa.l2StructNo,
            l2StructName: fa.l2StructName,
            l3StructId: remap(idMap, fa.l3StructId),
            l3StructM4: fa.l3StructM4,
            l3StructName: fa.l3StructName,
            order: fa.order,
            confirmed: fa.confirmed,
          })),
        });
      }
    });

    // ── ★ 2026-03-25: 전사 공용 심각도 백그라운드 갱신 ──
    try {
      const originUrl = req.nextUrl?.origin || 'http://localhost:3000';
      fetch(`${originUrl}/api/severity-recommend/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fmeaId: tgtId })
      }).catch(e => console.error('[clone-master] Background sync error:', e));
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `Master FMEA [${srcId}] was perfectly cloned to [${tgtId}]`,
      counts: {
        links: srcLinks.length,
        modes: srcFMs.length,
      }
    });
  } catch (err: any) {
    console.error('[clone-master] Error cloning:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
