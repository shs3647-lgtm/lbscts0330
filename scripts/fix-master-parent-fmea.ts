/**
 * Master FMEA의 parentFmeaId, parentFmeaType 수정 스크립트
 * 
 * 문제:
 * - Master FMEA의 parentFmeaId가 소문자로 저장됨
 * - Master FMEA의 parentFmeaType이 'P'로 잘못 저장됨 (올바른 값: 'M')
 * 
 * 해결:
 * - fmeaType = 'M'인 경우 parentFmeaId = 자기 자신 (대문자)
 * - fmeaType = 'M'인 경우 parentFmeaType = 'M'
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// 환경 변수 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.');
  console.error('💡 .env 파일에 DATABASE_URL을 설정해주세요.');
  process.exit(1);
}

// Prisma Client 생성 (adapter 필요)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function fixMasterParentFmea() {
  try {
    console.log('🔧 Master FMEA의 parentFmeaId, parentFmeaType 수정 시작...\n');

    // 1. Master FMEA 조회 (fmeaType = 'M')
    const masterFmeas = await prisma.fmeaProject.findMany({
      where: {
        fmeaType: 'M',
      },
    });

    console.log(`📊 발견된 Master FMEA: ${masterFmeas.length}개\n`);

    if (masterFmeas.length === 0) {
      console.log('✅ 수정할 Master FMEA가 없습니다.');
      return;
    }

    // 2. 각 Master FMEA 수정
    for (const master of masterFmeas) {
      const correctParentId = master.fmeaId.toUpperCase();
      const correctParentType = 'M';

      const needsFix = 
        master.parentFmeaId !== correctParentId || 
        master.parentFmeaId?.toLowerCase() === correctParentId.toLowerCase() ||
        master.parentFmeaType !== correctParentType;

      if (!needsFix) {
        console.log(`✅ ${master.fmeaId}: 이미 올바른 값 (parentFmeaId: ${master.parentFmeaId}, parentFmeaType: ${master.parentFmeaType})`);
        continue;
      }

      console.log(`🔧 ${master.fmeaId} 수정 중...`);
      console.log(`   현재: parentFmeaId=${master.parentFmeaId}, parentFmeaType=${master.parentFmeaType}`);
      console.log(`   수정: parentFmeaId=${correctParentId}, parentFmeaType=${correctParentType}`);

      await prisma.fmeaProject.update({
        where: { fmeaId: master.fmeaId },
        data: {
          parentFmeaId: correctParentId,
          parentFmeaType: correctParentType,
          updatedAt: new Date(),
        },
      });

      console.log(`   ✅ 수정 완료\n`);
    }

    console.log('✅ 모든 Master FMEA 수정 완료!');
  } catch (error: any) {
    console.error('❌ 오류 발생:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
fixMasterParentFmea()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });

