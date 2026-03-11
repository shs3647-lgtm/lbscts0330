/**
 * APQP 샘플 데이터 시딩 스크립트
 * 실행: node scripts/seed-apqp.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Prisma 7.x: adapter 필수
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function seedApqp() {
  console.log('🚀 APQP 샘플 데이터 시딩 시작...\n');

  try {
    // 기존 데이터 삭제 (순서 중요: 자식 먼저)
    await prisma.apqpDeliverable.deleteMany({});
    await prisma.apqpActivity.deleteMany({});
    await prisma.apqpPhase.deleteMany({});
    await prisma.apqpSchedule.deleteMany({});
    await prisma.apqpRevision.deleteMany({});
    await prisma.apqpCftMember.deleteMany({});
    await prisma.apqpRegistration.deleteMany({});
    console.log('🗑️ 기존 APQP 데이터 삭제 완료');

    // 샘플 APQP 프로젝트 2개 생성
    const projects = [
      {
        apqpNo: 'pj26-001',
        companyName: '스마트오토',
        customerName: '현대자동차',
        subject: '도어패널 신규 개발',
        productName: '도어패널',
        modelYear: 'MY2025',
        apqpStartDate: '2026-01-13',
        status: 'planning',
        apqpResponsibleName: '홍길동',
        engineeringLocation: '울산공장',
      },
      {
        apqpNo: 'pj26-002',
        companyName: '스마트오토',
        customerName: '기아자동차',
        subject: '범퍼 양산 개발',
        productName: '프론트범퍼',
        modelYear: 'MY2026',
        apqpStartDate: '2026-02-01',
        status: 'development',
        apqpResponsibleName: '김철수',
        engineeringLocation: '화성공장',
      }
    ];

    for (const proj of projects) {
      // 1. APQP 등록정보 생성
      const apqp = await prisma.apqpRegistration.create({ data: proj });
      console.log(`✅ APQP 등록정보: ${apqp.apqpNo} - ${apqp.subject}`);

      // 2. CFT 멤버 생성
      await prisma.apqpCftMember.createMany({
        data: [
          { apqpNo: proj.apqpNo, seq: 1, role: '팀장', name: proj.apqpResponsibleName, department: '품질팀', position: '과장', phone: '010-1234-5678' },
          { apqpNo: proj.apqpNo, seq: 2, role: '설계', name: '설계담당자', department: '설계팀', position: '대리', phone: '010-2345-6789' },
          { apqpNo: proj.apqpNo, seq: 3, role: '공정', name: '공정담당자', department: '생산기술팀', position: '주임', phone: '010-3456-7890' },
          { apqpNo: proj.apqpNo, seq: 4, role: '품질', name: '품질담당자', department: '품질보증팀', position: '사원', phone: '010-4567-8901' },
          { apqpNo: proj.apqpNo, seq: 5, role: '구매', name: '구매담당자', department: '구매팀', position: '대리', phone: '010-5678-9012' },
        ]
      });
      console.log(`   └─ CFT 멤버 5명 생성`);

      // 3. 개정 이력 생성
      await prisma.apqpRevision.create({
        data: {
          apqpNo: proj.apqpNo,
          revNo: 'Rev.00',
          revDate: proj.apqpStartDate,
          description: '최초 등록',
          author: proj.apqpResponsibleName,
        }
      });
      console.log(`   └─ 개정이력 생성`);

      // 4. 5단계 Phase 생성
      const phases = await prisma.apqpPhase.createManyAndReturn({
        data: [
          { apqpNo: proj.apqpNo, phaseNo: 1, phaseName: 'Phase 1: 계획 및 정의', status: proj.apqpNo === 'pj26-001' ? 'in_progress' : 'completed', progress: proj.apqpNo === 'pj26-001' ? 30 : 100 },
          { apqpNo: proj.apqpNo, phaseNo: 2, phaseName: 'Phase 2: 제품설계 및 개발', status: proj.apqpNo === 'pj26-002' ? 'in_progress' : 'pending', progress: proj.apqpNo === 'pj26-002' ? 50 : 0 },
          { apqpNo: proj.apqpNo, phaseNo: 3, phaseName: 'Phase 3: 공정설계 및 개발', status: 'pending', progress: 0 },
          { apqpNo: proj.apqpNo, phaseNo: 4, phaseName: 'Phase 4: 제품 및 공정 유효성확인', status: 'pending', progress: 0 },
          { apqpNo: proj.apqpNo, phaseNo: 5, phaseName: 'Phase 5: 피드백, 평가 및 시정조치', status: 'pending', progress: 0 },
        ]
      });
      console.log(`   └─ 5단계 Phase 생성`);

      // 5. 일정/마일스톤 생성
      await prisma.apqpSchedule.createMany({
        data: [
          { apqpNo: proj.apqpNo, milestoneName: 'Kick-off', planDate: proj.apqpStartDate, status: proj.apqpNo === 'pj26-002' ? 'completed' : 'pending', responsible: proj.apqpResponsibleName },
          { apqpNo: proj.apqpNo, milestoneName: 'Design Review', planDate: '2026-03-15', status: 'pending', responsible: '설계담당자' },
          { apqpNo: proj.apqpNo, milestoneName: 'Design Freeze', planDate: '2026-04-30', status: 'pending', responsible: '설계담당자' },
          { apqpNo: proj.apqpNo, milestoneName: 'Tool Try-out', planDate: '2026-06-15', status: 'pending', responsible: '공정담당자' },
          { apqpNo: proj.apqpNo, milestoneName: 'PPAP', planDate: '2026-08-01', status: 'pending', responsible: '품질담당자' },
          { apqpNo: proj.apqpNo, milestoneName: 'SOP', planDate: '2026-09-01', status: 'pending', responsible: proj.apqpResponsibleName },
        ]
      });
      console.log(`   └─ 마일스톤 6개 생성`);
    }

    // 최종 확인
    const counts = {
      registrations: await prisma.apqpRegistration.count(),
      cftMembers: await prisma.apqpCftMember.count(),
      revisions: await prisma.apqpRevision.count(),
      phases: await prisma.apqpPhase.count(),
      schedules: await prisma.apqpSchedule.count(),
    };

    console.log('\n📊 저장 결과:');
    console.log(`   - APQP 등록정보: ${counts.registrations}개`);
    console.log(`   - CFT 멤버: ${counts.cftMembers}명`);
    console.log(`   - 개정이력: ${counts.revisions}개`);
    console.log(`   - Phase: ${counts.phases}개`);
    console.log(`   - 마일스톤: ${counts.schedules}개`);
    // 6. 레거시 apqp_projects 테이블에도 저장
    await prisma.aPQPProject.deleteMany({});
    await prisma.aPQPProject.createMany({
      data: projects.map(p => ({
        name: p.subject,
        productName: p.productName,
        customerName: p.customerName,
        status: p.status,
        startDate: p.apqpStartDate,
        targetDate: '2026-09-01',
      }))
    });
    console.log('✅ 레거시 apqp_projects 테이블:', projects.length, '개');

    console.log('\n🎉 APQP 샘플 데이터 저장 완료!');

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
    pool.end();
  }
}

seedApqp();

