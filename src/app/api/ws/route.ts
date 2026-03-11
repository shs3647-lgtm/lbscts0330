/**
 * @file route.ts
 * @description WS (작업표준서) 등록 API - PFD 등록 수준 확장
 *
 * GET /api/ws?wsNo=xxx - 단일 WS 조회 (대소문자 무시)
 * GET /api/ws - WS 목록 조회
 * POST /api/ws - WS 생성/수정 (upsert) + ProjectLinkage 연동
 * DELETE /api/ws?wsNo=xxx - WS 삭제
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
        const wsNo = searchParams.get('wsNo');
        const cpNo = searchParams.get('cpNo');

        // 단일 WS 조회 (대소문자 무시)
        if (wsNo) {
            const wsNoLower = wsNo.toLowerCase();
            const ws = await prisma.wsRegistration.findFirst({
                where: {
                    OR: [
                        { wsNo: wsNo },
                        { wsNo: wsNoLower },
                    ],
                    deletedAt: null,
                },
            });

            // ★ ProjectLinkage에서 공통 데이터 병합
            if (ws) {
                let linkageData: Record<string, unknown> | null = null;
                try {
                    const linkage = await (prisma as any).projectLinkage.findFirst({
                        where: {
                            OR: [
                                { wsNo: wsNoLower },
                                { cpNo: ws.cpNo?.toLowerCase() },
                                { apqpNo: ws.parentApqpNo?.toLowerCase() },
                            ].filter(cond => Object.values(cond)[0] != null),
                            status: 'active'
                        }
                    });
                    if (linkage) linkageData = linkage;
                } catch { /* ProjectLinkage 미지원 시 무시 */ }

                const mergedData = {
                    ...ws,
                    customerName: (linkageData?.customerName as string) || ws.customerName || '',
                    companyName: (linkageData?.companyName as string) || ws.companyName || '',
                    modelYear: (linkageData?.modelYear as string) || ws.modelYear || '',
                    partNo: (linkageData?.partNo as string) || ws.partNo || '',
                    partName: (linkageData?.partName as string) || ws.partName || '',
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

        const wsItems = await prisma.wsRegistration.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        return NextResponse.json({
            success: true,
            data: wsItems,
        });
    } catch (error) {
        console.error('[WS API] GET Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch WS items' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const prisma = getDb();
        const body = await request.json();
        const {
            wsNo,
            wsInfo,
            cftMembers,
            parentApqpNo,
            parentFmeaId,
            linkedCpNo,
            linkedCpNos,
            // 레거시 필드 (직접 전달)
            subject: directSubject,
            processName: directProcessName,
            revision,
            manager,
            status,
            cpNo: directCpNo,
            processNo,
        } = body;

        if (!wsNo) {
            return NextResponse.json(
                { success: false, error: 'wsNo is required' },
                { status: 400 }
            );
        }

        // wsInfo 객체 또는 직접 필드에서 데이터 추출
        const data: Record<string, unknown> = {
            subject: wsInfo?.subject || directSubject,
            processName: wsInfo?.processName || directProcessName,
            revision: revision,
            manager: wsInfo?.wsResponsibleName || manager,
            status: status || 'active',
            cpNo: directCpNo || linkedCpNo,
            processNo: processNo,
            companyName: wsInfo?.companyName,
            customerName: wsInfo?.customerName,
            modelYear: wsInfo?.modelYear,
            engineeringLocation: wsInfo?.engineeringLocation,
            processResponsibility: wsInfo?.processResponsibility,
            wsResponsibleName: wsInfo?.wsResponsibleName,
            wsStartDate: wsInfo?.wsStartDate,
            wsRevisionDate: wsInfo?.wsRevisionDate,
            confidentialityLevel: wsInfo?.confidentialityLevel,
            securityLevel: wsInfo?.securityLevel,
            partName: wsInfo?.partName,
            partNo: wsInfo?.partNo,
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

        const existing = await prisma.wsRegistration.findUnique({
            where: { wsNo },
        });

        let ws;
        if (existing) {
            ws = await prisma.wsRegistration.update({
                where: { wsNo },
                data: cleanData,
            });
        } else {
            ws = await prisma.wsRegistration.create({
                data: { wsNo, ...cleanData },
            });
        }

        // ★ ProjectLinkage 연동 (PFD API 패턴 동일)
        try {
            const apqpNo = parentApqpNo?.toLowerCase();
            const wsNoLower = wsNo.toLowerCase();
            const partNameValue = wsInfo?.partName || wsInfo?.subject || directSubject || '';
            const unifiedSubject = partNameValue ? `${partNameValue}+생산공정` : '';

            let existingLinkage = null;
            if (apqpNo) {
                existingLinkage = await (prisma as any).projectLinkage.findFirst({
                    where: { apqpNo, status: 'active' }
                });
            }
            if (!existingLinkage) {
                existingLinkage = await (prisma as any).projectLinkage.findFirst({
                    where: { wsNo: wsNoLower, status: 'active' }
                });
            }

            const commonData = {
                wsNo: wsNoLower,
                cpNo: (directCpNo || linkedCpNo)?.toLowerCase() || existingLinkage?.cpNo || null,
                pfmeaId: parentFmeaId?.toLowerCase() || existingLinkage?.pfmeaId || null,
                subject: unifiedSubject || existingLinkage?.subject || '',
                projectName: unifiedSubject || existingLinkage?.projectName || '',
                customerName: wsInfo?.customerName || existingLinkage?.customerName || '',
                companyName: wsInfo?.companyName || existingLinkage?.companyName || '',
                modelYear: wsInfo?.modelYear || existingLinkage?.modelYear || '',
                partNo: wsInfo?.partNo || existingLinkage?.partNo || '',
                engineeringLocation: wsInfo?.engineeringLocation || existingLinkage?.engineeringLocation || '',
                processResponsibility: wsInfo?.processResponsibility || existingLinkage?.processResponsibility || '',
                responsibleName: wsInfo?.wsResponsibleName || existingLinkage?.responsibleName || '',
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
            data: ws,
            message: existing ? 'WS 업데이트 완료' : 'WS 생성 완료',
        });
    } catch (error) {
        console.error('[WS API] POST Error:', error);
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
// DELETE: WS 삭제
// ============================================================================

export async function DELETE(request: NextRequest) {
    try {
        const prisma = getDb();
        const { searchParams } = new URL(request.url);
        const wsNo = searchParams.get('wsNo');

        if (!wsNo) {
            return NextResponse.json(
                { success: false, error: 'wsNo는 필수입니다' },
                { status: 400 }
            );
        }

        // 대소문자 무시 검색
        const existing = await prisma.wsRegistration.findFirst({
            where: {
                OR: [
                    { wsNo: wsNo },
                    { wsNo: wsNo.toLowerCase() },
                ],
            },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: '존재하지 않는 WS입니다' },
                { status: 404 }
            );
        }

        // ★ Soft Delete (deletedAt 설정)
        await prisma.wsRegistration.update({
            where: { wsNo: existing.wsNo },
            data: { deletedAt: new Date() }
        });

        return NextResponse.json({
            success: true,
            message: `WS ${wsNo} 삭제 완료`,
        });
    } catch (error) {
        console.error('[WS API] DELETE Error:', error);
        return NextResponse.json(
            { success: false, error: 'Delete Failed', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
