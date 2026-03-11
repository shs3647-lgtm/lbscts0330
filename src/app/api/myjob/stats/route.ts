import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({
            total: 0, inprogress: 0, done: 0, delayed: 0
        });
    }

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. FMEA (soft-delete 제외) + 등록정보(종료일)
        const fmeas = await prisma.fmeaProject.findMany({
            where: { deletedAt: null, fmeaType: { not: 'D' } },
            select: {
                status: true,
                registration: { select: { fmeaRevisionDate: true } },
            },
        });

        // 2. CP (soft-delete 제외)
        const cps = await prisma.cpRegistration.findMany({
            where: { deletedAt: null },
            select: { status: true, cpRevisionDate: true },
        });

        // 3. PFD (soft-delete 제외)
        const pfds = await prisma.pfdRegistration.findMany({
            where: { deletedAt: null },
            select: { status: true, pfdRevisionDate: true },
        });

        // 기초정보(registration) 미등록 FMEA 제외
        const registeredFmeas = fmeas.filter(f => f.registration !== null);
        const total = registeredFmeas.length + cps.length + pfds.length;
        let inprogress = 0;
        let done = 0;
        let delayed = 0;

        // FMEA Logic
        registeredFmeas.forEach(f => {
            if (f.status === 'archived') {
                done++;
            } else {
                // 지연 판정: active + 종료일 초과
                const endStr = f.registration?.fmeaRevisionDate;
                if (endStr && new Date(endStr) < today) {
                    delayed++;
                } else {
                    inprogress++;
                }
            }
        });

        // CP Logic
        cps.forEach(c => {
            if (c.status === 'approved') {
                done++;
            } else {
                const endStr = c.cpRevisionDate;
                if (endStr && new Date(endStr) < today) {
                    delayed++;
                } else {
                    inprogress++;
                }
            }
        });

        // PFD Logic
        pfds.forEach(p => {
            if (p.status === 'active' || p.status === 'locked') {
                done++;
            } else {
                const endStr = p.pfdRevisionDate;
                if (endStr && new Date(endStr) < today) {
                    delayed++;
                } else {
                    inprogress++;
                }
            }
        });

        return NextResponse.json({
            total,
            inprogress,
            done,
            delayed,
        });

    } catch (error) {
        console.error('Stats Error:', error);
        return NextResponse.json({
            total: 0, inprogress: 0, done: 0, delayed: 0
        });
    }
}
