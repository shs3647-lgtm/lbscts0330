/**
 * @file route.ts
 * @description 기존 연동 데이터를 ProjectLinkage 테이블로 동기화
 * @version 1.2.0
 * @created 2026-01-27
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * POST: 기존 데이터를 ProjectLinkage로 동기화
 */
export async function POST(request: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    try {
        let created = 0;
        let updated = 0;
        let skipped = 0;

        // 1. PFMEA에서 연동 정보 수집
        const fmeaProjects = await prisma.fmeaProject.findMany({
            select: {
                fmeaId: true,
                parentApqpNo: true,
                registration: {
                    select: {
                        subject: true,
                        customerName: true,
                        linkedCpNo: true,
                        linkedPfdNo: true,
                    },
                },
            },
        });

        for (const fmea of fmeaProjects) {
            const pfmeaId = fmea.fmeaId.toLowerCase();
            const apqpNo = fmea.parentApqpNo?.toLowerCase() || null;
            const pfdNo = fmea.registration?.linkedPfdNo?.toLowerCase() || null;
            const cpNo = fmea.registration?.linkedCpNo?.toLowerCase() || null;
            const projectName = fmea.registration?.subject || null;
            const customerName = fmea.registration?.customerName || null;

            // 기존 연동 찾기
            const existing = await prisma.projectLinkage.findFirst({
                where: { pfmeaId, status: 'active' },
            });

            if (existing) {
                if ((!existing.apqpNo && apqpNo) || (!existing.pfdNo && pfdNo) || (!existing.cpNo && cpNo)) {
                    await prisma.projectLinkage.update({
                        where: { id: existing.id },
                        data: {
                            apqpNo: apqpNo || existing.apqpNo,
                            pfdNo: pfdNo || existing.pfdNo,
                            cpNo: cpNo || existing.cpNo,
                            projectName: projectName || existing.projectName,
                            customerName: customerName || existing.customerName,
                        },
                    });
                    updated++;
                } else {
                    skipped++;
                }
            } else {
                await prisma.projectLinkage.create({
                    data: { apqpNo, pfmeaId, pfdNo, cpNo, projectName, customerName, status: 'active', linkType: 'auto' },
                });
                created++;
            }
        }

        // 2. PFD에서 연동 정보 수집
        const pfdProjects = await prisma.pfdRegistration.findMany({
            select: {
                pfdNo: true,
                fmeaId: true,
                cpNo: true,
                linkedCpNos: true,
                subject: true,
                customerName: true,
            },
        });

        for (const pfd of pfdProjects) {
            const pfdNo = pfd.pfdNo.toLowerCase();
            const pfmeaId = pfd.fmeaId?.toLowerCase() || null;

            // CP 목록 처리
            let cpList: string[] = [];
            if (pfd.linkedCpNos) {
                try {
                    const parsed = JSON.parse(pfd.linkedCpNos);
                    cpList = Array.isArray(parsed) ? parsed.map((c: string) => c.toLowerCase()) : [pfd.linkedCpNos.toLowerCase()];
                } catch {
                    cpList = [pfd.linkedCpNos.toLowerCase()];
                }
            } else if (pfd.cpNo) {
                cpList = [pfd.cpNo.toLowerCase()];
            }

            // 각 CP에 대해 별도 레코드 처리
            if (cpList.length > 0) {
                for (const cpNo of cpList) {
                    const existing = await prisma.projectLinkage.findFirst({
                        where: { pfdNo, cpNo, status: 'active' },
                    });
                    if (!existing) {
                        const pfmeaLinkage = pfmeaId ? await prisma.projectLinkage.findFirst({ where: { pfmeaId, status: 'active' } }) : null;
                        await prisma.projectLinkage.create({
                            data: {
                                apqpNo: pfmeaLinkage?.apqpNo || null,
                                pfmeaId,
                                pfdNo,
                                cpNo,
                                projectName: pfd.subject || pfmeaLinkage?.projectName || null,
                                customerName: pfd.customerName || pfmeaLinkage?.customerName || null,
                                status: 'active',
                                linkType: 'auto',
                            },
                        });
                        created++;
                    } else skipped++;
                }
            } else if (pfmeaId) {
                const existing = await prisma.projectLinkage.findFirst({ where: { pfmeaId, pfdNo, status: 'active' } });
                if (existing && !existing.pfdNo) {
                    await prisma.projectLinkage.update({ where: { id: existing.id }, data: { pfdNo } });
                    updated++;
                } else if (!existing) {
                    await prisma.projectLinkage.create({
                        data: { apqpNo: null, pfmeaId, pfdNo, cpNo: null, projectName: pfd.subject, customerName: pfd.customerName, status: 'active', linkType: 'auto' },
                    });
                    created++;
                } else skipped++;
            }
        }

        // 3. CP에서 연동 정보 수집
        const cpProjects = await prisma.controlPlan.findMany({
            select: { cpNo: true, fmeaId: true, fmeaNo: true, projectName: true, customer: true },
        });

        for (const cp of cpProjects) {
            const cpNo = cp.cpNo.toLowerCase();
            const pfmeaId = (cp.fmeaNo || cp.fmeaId)?.toLowerCase() || null;

            if (pfmeaId) {
                const existing = await prisma.projectLinkage.findFirst({ where: { pfmeaId, cpNo, status: 'active' } });
                if (!existing) {
                    const pfmeaLinkage = await prisma.projectLinkage.findFirst({ where: { pfmeaId, status: 'active' } });
                    await prisma.projectLinkage.create({
                        data: {
                            apqpNo: pfmeaLinkage?.apqpNo || null,
                            pfmeaId,
                            pfdNo: pfmeaLinkage?.pfdNo || null,
                            cpNo,
                            projectName: cp.projectName || pfmeaLinkage?.projectName || null,
                            customerName: cp.customer || pfmeaLinkage?.customerName || null,
                            status: 'active',
                            linkType: 'auto',
                        },
                    });
                    created++;
                } else skipped++;
            }
        }


        const allLinkages = await prisma.projectLinkage.findMany({
            where: { status: 'active' },
            orderBy: { updatedAt: 'desc' },
        });

        return NextResponse.json({
            success: true,
            message: `동기화 완료: 생성 ${created}건, 업데이트 ${updated}건, 스킵 ${skipped}건`,
            stats: { created, updated, skipped, total: allLinkages.length },
            data: allLinkages,
        });
    } catch (error: any) {
        console.error('[Sync API] 오류:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * GET: 동기화 상태 확인
 */
export async function GET(request: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    try {
        const linkages = await prisma.projectLinkage.findMany({
            where: { status: 'active' },
            orderBy: { updatedAt: 'desc' },
        });

        const stats = {
            total: linkages.length,
            withApqp: linkages.filter((l: any) => l.apqpNo).length,
            withPfmea: linkages.filter((l: any) => l.pfmeaId).length,
            withPfd: linkages.filter((l: any) => l.pfdNo).length,
            withCp: linkages.filter((l: any) => l.cpNo).length,
            complete: linkages.filter((l: any) => l.apqpNo && l.pfmeaId && l.pfdNo && l.cpNo).length,
        };

        return NextResponse.json({ success: true, stats, data: linkages });
    } catch (error: any) {
        console.error('[Sync API] 조회 오류:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
