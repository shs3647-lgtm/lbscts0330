import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ total: 0, inprogress: 0, done: 0, delayed: 0 });
    }

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // ★ 3개 쿼리 병렬 실행 + 최소 select (status + 종료일만)
        const [fmeas, cps, pfds] = await Promise.all([
            prisma.fmeaProject.findMany({
                where: { deletedAt: null, fmeaType: { not: 'D' } },
                select: { status: true, registration: { select: { fmeaRevisionDate: true } } },
            }),
            prisma.cpRegistration.findMany({
                where: { deletedAt: null },
                select: { status: true, cpRevisionDate: true },
            }),
            prisma.pfdRegistration.findMany({
                where: { deletedAt: null },
                select: { status: true, pfdRevisionDate: true },
            }),
        ]);

        // registration 없는 FMEA 제외
        const registeredFmeas = fmeas.filter(f => f.registration !== null);
        let inprogress = 0, done = 0, delayed = 0;

        for (const f of registeredFmeas) {
            if (f.status === 'archived') { done++; continue; }
            const end = f.registration?.fmeaRevisionDate;
            if (end && new Date(end) < today) { delayed++; } else { inprogress++; }
        }

        for (const c of cps) {
            if (c.status === 'approved') { done++; continue; }
            const end = c.cpRevisionDate;
            if (end && new Date(end) < today) { delayed++; } else { inprogress++; }
        }

        for (const p of pfds) {
            if (p.status === 'active' || p.status === 'locked') { done++; continue; }
            const end = p.pfdRevisionDate;
            if (end && new Date(end) < today) { delayed++; } else { inprogress++; }
        }

        const total = inprogress + done + delayed;

        return NextResponse.json(
            { total, inprogress, done, delayed },
            { headers: { 'Cache-Control': 'private, max-age=30' } },
        );
    } catch (error) {
        console.error('Stats Error:', error);
        return NextResponse.json({ total: 0, inprogress: 0, done: 0, delayed: 0 });
    }
}
