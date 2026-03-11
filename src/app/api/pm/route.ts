/**
 * @file route.ts
 * @description PM (예방보전) 등록 API - PFD 등록 수준 확장
 *
 * GET /api/pm?pmNo=xxx - 단일 PM 조회 (대소문자 무시)
 * GET /api/pm - PM 목록 조회
 * POST /api/pm - PM 생성/수정 (upsert) + ProjectLinkage 연동
 * DELETE /api/pm?pmNo=xxx - PM 삭제
 *
 * @updated 2026-02-10 PFD 등록 동등 필드 지원 + DELETE/대소문자/ProjectLinkage 추가
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function getDb() {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Database not initialized');
    return prisma;
}

export async function GET(request: NextRequest) {
    try {
        const prisma = getDb();
        const { searchParams } = new URL(request.url);
        const pmNo = searchParams.get('pmNo');
        const cpNo = searchParams.get('cpNo');

        // 단일 PM 조회 (대소문자 무시)
        if (pmNo) {
            const pmNoLower = pmNo.toLowerCase();
            const pm = await prisma.pmRegistration.findFirst({
                where: {
                    OR: [
                        { pmNo: pmNo },
                        { pmNo: pmNoLower },
                    ],
                    deletedAt: null,
                },
            });

            // ★ ProjectLinkage에서 공통 데이터 병합
            if (pm) {
                let linkageData: Record<string, unknown> | null = null;
                try {
                    const linkage = await (prisma as any).projectLinkage.findFirst({
                        where: {
                            OR: [
                                { pmNo: pmNoLower },
                                { cpNo: pm.cpNo?.toLowerCase() },
                                { apqpNo: pm.parentApqpNo?.toLowerCase() },
                            ].filter(cond => Object.values(cond)[0] != null),
                            status: 'active'
                        }
                    });
                    if (linkage) linkageData = linkage;
                } catch { /* ProjectLinkage 미지원 시 무시 */ }

                const mergedData = {
                    ...pm,
                    customerName: (linkageData?.customerName as string) || pm.customerName || '',
                    companyName: (linkageData?.companyName as string) || pm.companyName || '',
                    modelYear: (linkageData?.modelYear as string) || pm.modelYear || '',
                    partNo: (linkageData?.partNo as string) || pm.partNo || '',
                    partName: (linkageData?.partName as string) || pm.partName || '',
                };

                return NextResponse.json({ success: true, data: mergedData });
            }

            return NextResponse.json({ success: true, data: null });
        }

        // 목록 조회
        const whereClause: Record<string, unknown> = {
            status: { not: 'deleted' },
            deletedAt: null,
        };
        if (cpNo) whereClause.cpNo = cpNo;

        const pmItems = await prisma.pmRegistration.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        return NextResponse.json({
            success: true,
            data: pmItems,
        });
    } catch (error) {
        console.error('[PM API] GET Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch PM items' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const prisma = getDb();
        const body = await request.json();
        const {
            pmNo,
            pmInfo,
            cftMembers,
            parentApqpNo,
            parentFmeaId,
            linkedCpNo,
            linkedCpNos,
            // 레거시 필드
            subject: directSubject,
            machineName: directMachineName,
            maintenanceType,
            manager,
            startDate,
            endDate,
            status,
            cpNo: directCpNo,
            processNo,
        } = body;

        if (!pmNo) {
            return NextResponse.json(
                { success: false, error: 'pmNo is required' },
                { status: 400 }
            );
        }

        const data: Record<string, unknown> = {
            subject: pmInfo?.subject || directSubject,
            machineName: pmInfo?.machineName || directMachineName,
            maintenanceType: maintenanceType,
            manager: pmInfo?.pmResponsibleName || manager,
            startDate: startDate,
            endDate: endDate,
            status: status || 'planned',
            cpNo: directCpNo || linkedCpNo,
            processNo: processNo,
            companyName: pmInfo?.companyName,
            customerName: pmInfo?.customerName,
            modelYear: pmInfo?.modelYear,
            engineeringLocation: pmInfo?.engineeringLocation,
            processResponsibility: pmInfo?.processResponsibility,
            pmResponsibleName: pmInfo?.pmResponsibleName,
            pmStartDate: pmInfo?.pmStartDate,
            pmRevisionDate: pmInfo?.pmRevisionDate,
            confidentialityLevel: pmInfo?.confidentialityLevel,
            securityLevel: pmInfo?.securityLevel,
            partName: pmInfo?.partName,
            partNo: pmInfo?.partNo,
            parentApqpNo: parentApqpNo,
            parentFmeaId: parentFmeaId,
            linkedCpNo: linkedCpNo,
            linkedCpNos: linkedCpNos ? JSON.stringify(linkedCpNos) : undefined,
            cftMembers: cftMembers ? JSON.stringify(cftMembers) : undefined,
        };

        // undefined 제거
        const cleanData = Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined)
        );

        const existing = await prisma.pmRegistration.findUnique({
            where: { pmNo },
        });

        let pm;
        if (existing) {
            pm = await prisma.pmRegistration.update({
                where: { pmNo },
                data: cleanData,
            });
        } else {
            pm = await prisma.pmRegistration.create({
                data: { pmNo, ...cleanData },
            });
        }

        // ★ ProjectLinkage 연동 (PFD API 패턴 동일)
        try {
            const apqpNo = parentApqpNo?.toLowerCase();
            const pmNoLower = pmNo.toLowerCase();
            const partNameValue = pmInfo?.partName || pmInfo?.subject || directSubject || '';
            const unifiedSubject = partNameValue ? `${partNameValue}+생산공정` : '';

            let existingLinkage = null;
            if (apqpNo) {
                existingLinkage = await (prisma as any).projectLinkage.findFirst({
                    where: { apqpNo, status: 'active' }
                });
            }
            if (!existingLinkage) {
                existingLinkage = await (prisma as any).projectLinkage.findFirst({
                    where: { pmNo: pmNoLower, status: 'active' }
                });
            }

            const commonData = {
                pmNo: pmNoLower,
                cpNo: (directCpNo || linkedCpNo)?.toLowerCase() || existingLinkage?.cpNo || null,
                pfmeaId: parentFmeaId?.toLowerCase() || existingLinkage?.pfmeaId || null,
                subject: unifiedSubject || existingLinkage?.subject || '',
                projectName: unifiedSubject || existingLinkage?.projectName || '',
                customerName: pmInfo?.customerName || existingLinkage?.customerName || '',
                companyName: pmInfo?.companyName || existingLinkage?.companyName || '',
                modelYear: pmInfo?.modelYear || existingLinkage?.modelYear || '',
                partNo: pmInfo?.partNo || existingLinkage?.partNo || '',
                engineeringLocation: pmInfo?.engineeringLocation || existingLinkage?.engineeringLocation || '',
                processResponsibility: pmInfo?.processResponsibility || existingLinkage?.processResponsibility || '',
                responsibleName: pmInfo?.pmResponsibleName || existingLinkage?.responsibleName || '',
            };

            if (existingLinkage) {
                await (prisma as any).projectLinkage.update({
                    where: { id: existingLinkage.id },
                    data: commonData,
                });
            } else {
                await (prisma as any).projectLinkage.create({
                    data: {
                        ...commonData,
                        apqpNo: apqpNo || null,
                        linkType: 'auto',
                        status: 'active',
                    },
                });
            }
        } catch { /* ProjectLinkage 저장 실패 시 계속 진행 */ }

        return NextResponse.json({
            success: true,
            data: pm,
            message: existing ? 'PM 업데이트 완료' : 'PM 생성 완료',
        });
    } catch (error) {
        console.error('[PM API] POST Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Save Failed',
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}

// ============================================================================
// DELETE: PM 삭제
// ============================================================================

export async function DELETE(request: NextRequest) {
    try {
        const prisma = getDb();
        const { searchParams } = new URL(request.url);
        const pmNo = searchParams.get('pmNo');

        if (!pmNo) {
            return NextResponse.json(
                { success: false, error: 'pmNo는 필수입니다' },
                { status: 400 }
            );
        }

        // 대소문자 무시 검색
        const existing = await prisma.pmRegistration.findFirst({
            where: {
                OR: [
                    { pmNo: pmNo },
                    { pmNo: pmNo.toLowerCase() },
                ],
            },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: '존재하지 않는 PM입니다' },
                { status: 404 }
            );
        }

        // ★ Soft Delete (deletedAt 설정)
        await prisma.pmRegistration.update({
            where: { pmNo: existing.pmNo },
            data: { deletedAt: new Date() }
        });

        return NextResponse.json({
            success: true,
            message: `PM ${pmNo} 삭제 완료`,
        });
    } catch (error) {
        console.error('[PM API] DELETE Error:', error);
        return NextResponse.json(
            { success: false, error: 'Delete Failed', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
