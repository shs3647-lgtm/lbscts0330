/**
 * 기존 ProjectLinkage에 partNo 업데이트 스크립트
 * APQP에서 partNo를 가져와서 ProjectLinkage에 저장
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('[update-linkage-partno] 시작...');

    // 모든 ProjectLinkage 조회
    const linkages = await prisma.projectLinkage.findMany({
        where: { status: 'active' }
    });

    console.log(`[update-linkage-partno] ${linkages.length}개의 ProjectLinkage 발견`);

    for (const linkage of linkages) {
        if (linkage.apqpNo) {
            // APQP에서 partNo 가져오기
            const apqp = await prisma.apqpRegistration.findFirst({
                where: { apqpNo: linkage.apqpNo },
            });

            if (apqp?.partNo) {
                console.log(`[update-linkage-partno] ${linkage.apqpNo}: partNo = ${apqp.partNo}`);

                // ProjectLinkage 업데이트 (as any로 타입 우회)
                await (prisma as any).projectLinkage.update({
                    where: { id: linkage.id },
                    data: {
                        partNo: apqp.partNo,
                        subject: apqp.subject || linkage.subject,
                    }
                });
            } else {
                console.log(`[update-linkage-partno] ${linkage.apqpNo}: APQP에 partNo 없음`);
            }
        }
    }

    console.log('[update-linkage-partno] 완료!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
