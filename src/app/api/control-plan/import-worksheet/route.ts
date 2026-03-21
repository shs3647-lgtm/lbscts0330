/**
 * @file route.ts
 * @description CP 병합된 워크시트 Excel → 원자성 DB 저장 API
 * 
 * POST /api/control-plan/import-worksheet
 * - Excel 파일의 병합 정보를 읽어 원자성 테이블에 저장
 * - 공정번호 병합 시 rowSpan/mergeGroupId 기록
 * 
 * @created 2026-01-24
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getPrismaForCp } from '@/lib/project-schema';

export const runtime = 'nodejs';

interface WorksheetRow {
    rowIndex: number;
    processNo: string;
    processName: string;
    level?: string;
    processDesc?: string;
    equipment?: string;
    productChar?: string;
    processChar?: string;
    specialChar?: string;
    spec?: string;
    evalMethod?: string;
    sampleSize?: string;
    frequency?: string;
    controlMethod?: string;
    owner1?: string;
    owner2?: string;
    reactionPlan?: string;
}

interface MergeInfo {
    startRow: number;
    endRow: number;
    column: string; // 'processNo', 'processName', 'processDesc', etc.
}

interface ImportWorksheetRequest {
    cpNo: string;
    rows: WorksheetRow[];
    merges: MergeInfo[];
}

export async function POST(req: NextRequest) {
    // ★★★ 2026-02-05: API 응답 형식 통일 (ok → success) ★★★
    const publicPrisma = getPrisma();
    if (!publicPrisma) {
        return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    try {
        const body = (await req.json()) as ImportWorksheetRequest;
        const { cpNo, rows, merges } = body;


        if (!cpNo?.trim()) {
            return NextResponse.json({ success: false, error: 'cpNo가 필요합니다' }, { status: 400 });
        }

        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ success: false, error: '데이터가 비어있습니다' }, { status: 400 });
        }

        // CP 등록정보 확인 (public 스키마 — 메타데이터)
        const registration = await publicPrisma.cpRegistration.findUnique({
            where: { cpNo: cpNo.trim() },
        });

        if (!registration) {
            return NextResponse.json({
                success: false,
                error: `CP 등록정보가 없습니다: ${cpNo}`
            }, { status: 404 });
        }

        // ★ 프로젝트 스키마 Prisma 클라이언트 획득
        const cpPrisma = await getPrismaForCp(cpNo.trim());
        if (!cpPrisma) {
            return NextResponse.json({ success: false, error: 'CP 프로젝트 스키마 연결 실패' }, { status: 500 });
        }

        // 병합 정보를 rowIndex 기반 맵으로 변환
        // { rowIndex: { column: { startRow, endRow, isFirst } } }
        const mergeMap = new Map<number, Map<string, { startRow: number; endRow: number; rowSpan: number; isFirst: boolean }>>();

        merges.forEach(merge => {
            for (let row = merge.startRow; row <= merge.endRow; row++) {
                if (!mergeMap.has(row)) {
                    mergeMap.set(row, new Map());
                }
                mergeMap.get(row)!.set(merge.column, {
                    startRow: merge.startRow,
                    endRow: merge.endRow,
                    rowSpan: merge.endRow - merge.startRow + 1,
                    isFirst: row === merge.startRow,
                });
            }
        });


        await cpPrisma.$transaction(async (tx: any) => {
            // ── 1. 기존 원자성 데이터 삭제 ──
            await tx.cpAtomicReactionPlan.deleteMany({ where: { cpNo } });
            await tx.cpAtomicControlMethod.deleteMany({ where: { cpNo } });
            await tx.cpAtomicControlItem.deleteMany({ where: { cpNo } });
            await tx.cpAtomicDetector.deleteMany({ where: { cpNo } });
            await tx.cpAtomicProcess.deleteMany({ where: { cpNo } });

            // ── 2. ControlPlan + ControlPlanItem 생성 (워크시트 렌더링용) ──
            let cp = await tx.controlPlan.findUnique({ where: { cpNo } });
            if (!cp) {
                cp = await tx.controlPlan.create({
                    data: {
                        cpNo,
                        fmeaId: registration.fmeaId || `import-${cpNo}`,
                        fmeaNo: registration.fmeaNo || '',
                        projectName: registration.subject || '',
                        partName: registration.partName || '',
                        partNo: registration.partNo || '',
                        customer: registration.customerName || '',
                        status: 'draft',
                        step: 1,
                    },
                });
            }
            // 기존 ControlPlanItem 삭제 (재Import)
            await tx.controlPlanItem.deleteMany({ where: { cpId: cp.id } });

            // ── 3. 각 행을 원자성 + ControlPlanItem 동시 저장 ──
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowIndex = row.rowIndex || i + 1;

                // 병합 정보 확인
                const rowMerges = mergeMap.get(rowIndex);
                const processNoMerge = rowMerges?.get('processNo');

                // 고유 ID 생성
                const processId = `${cpNo}-R${String(rowIndex).padStart(3, '0')}`;

                // 공정 rowSpan 계산 (processNo 기준)
                const processRowSpan = processNoMerge?.isFirst ? processNoMerge.rowSpan : 1;
                const processMergeGroupId = processNoMerge
                    ? `${cpNo}-P${processNoMerge.startRow}`
                    : undefined;
                const processParentId = processNoMerge && !processNoMerge.isFirst
                    ? `${cpNo}-R${String(processNoMerge.startRow).padStart(3, '0')}`
                    : undefined;

                // CpAtomicProcess 저장
                await tx.cpAtomicProcess.create({
                    data: {
                        id: processId,
                        cpNo,
                        processNo: row.processNo || '',
                        processName: row.processName || '',
                        level: row.level || null,
                        processDesc: row.processDesc || null,
                        equipment: row.equipment || null,
                        sortOrder: i,
                        rowIndex,
                        mergeGroupId: processMergeGroupId,
                        parentId: processParentId,
                        rowSpan: processNoMerge?.isFirst ? processRowSpan : 0,
                        colSpan: 1,
                    },
                });

                // CpAtomicControlItem 저장
                if (row.productChar || row.processChar || row.specialChar || row.spec) {
                    await tx.cpAtomicControlItem.create({
                        data: {
                            id: `${processId}-CI1`,
                            cpNo,
                            processNo: row.processNo || '',
                            processId,
                            productChar: row.productChar || null,
                            processChar: row.processChar || null,
                            specialChar: row.specialChar || null,
                            spec: row.spec || null,
                            sortOrder: i,
                            rowIndex,
                            rowSpan: 1,
                            colSpan: 1,
                        },
                    });
                }

                // CpAtomicControlMethod 저장
                if (row.evalMethod || row.sampleSize || row.frequency || row.controlMethod || row.owner1 || row.owner2) {
                    await tx.cpAtomicControlMethod.create({
                        data: {
                            id: `${processId}-CM1`,
                            cpNo,
                            processNo: row.processNo || '',
                            processId,
                            evalMethod: row.evalMethod || null,
                            sampleSize: row.sampleSize || null,
                            frequency: row.frequency || null,
                            controlMethod: row.controlMethod || null,
                            owner1: row.owner1 || null,
                            owner2: row.owner2 || null,
                            sortOrder: i,
                            rowIndex,
                            rowSpan: 1,
                            colSpan: 1,
                        },
                    });
                }

                // CpAtomicReactionPlan 저장
                if (row.reactionPlan) {
                    await tx.cpAtomicReactionPlan.create({
                        data: {
                            id: `${processId}-RP1`,
                            cpNo,
                            processNo: row.processNo || '',
                            processId,
                            productChar: row.productChar || null,
                            processChar: row.processChar || null,
                            reactionPlan: row.reactionPlan || null,
                            sortOrder: i,
                            rowIndex,
                            rowSpan: 1,
                            colSpan: 1,
                        },
                    });
                }

                // ★ ControlPlanItem 저장 (워크시트 렌더링용)
                await tx.controlPlanItem.create({
                    data: {
                        cpId: cp.id,
                        processNo: row.processNo || '',
                        processName: row.processName || '',
                        processLevel: row.level || null,
                        processDesc: row.processDesc || null,
                        equipment: row.equipment || null,
                        productChar: row.productChar || null,
                        processChar: row.processChar || null,
                        specialChar: row.specialChar || null,
                        specTolerance: row.spec || null,
                        evalMethod: row.evalMethod || null,
                        sampleSize: row.sampleSize || null,
                        sampleFreq: row.frequency || null,
                        controlMethod: row.controlMethod || null,
                        owner1: row.owner1 || null,
                        owner2: row.owner2 || null,
                        reactionPlan: row.reactionPlan || null,
                        linkStatus: 'imported',
                        sortOrder: i,
                    },
                });
            }

        });

        // 저장된 데이터 확인 (프로젝트 스키마)
        const savedProcesses = await cpPrisma.cpAtomicProcess.count({ where: { cpNo } });
        const savedItems = await cpPrisma.cpAtomicControlItem.count({ where: { cpNo } });

        return NextResponse.json({
            success: true,
            message: `${rows.length}개 행 Import 완료`,
            counts: {
                processes: savedProcesses,
                controlItems: savedItems,
            },
        });

    } catch (error: any) {
        console.error('❌ [CP Import Worksheet] 오류:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Import 실패'
        }, { status: 500 });
    }
}
