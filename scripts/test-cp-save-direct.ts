/**
 * CP 저장 직접 테스트 스크립트
 * 
 * 사용법: npx tsx scripts/test-cp-save-direct.ts
 */

import { getPrisma } from '../src/lib/prisma';

async function main() {
  const prisma = getPrisma();
  if (!prisma) {
    console.error('❌ DB 연결 실패');
    process.exit(1);
  }

  const cpNo = 'cp26-m001';

  console.log('🔍 CP 저장 직접 테스트 시작...\n');

  try {
    // 1. CP 등록정보 확인
    console.log('1️⃣ CP 등록정보 확인:');
    const registration = await prisma.cpRegistration.findUnique({
      where: { cpNo },
    });
    
    if (!registration) {
      console.error('❌ CP 등록정보가 없습니다:', cpNo);
      process.exit(1);
    }
    
    console.log('   ✅ CP 등록정보 존재:', registration.cpNo);

    // 2. 샘플 데이터 생성
    console.log('\n2️⃣ 샘플 데이터 생성:');
    const sampleFlatData = [
      { processNo: '10', category: 'processInfo', itemCode: 'A1', value: '10' },
      { processNo: '10', category: 'processInfo', itemCode: 'A2', value: '프레스' },
      { processNo: '20', category: 'processInfo', itemCode: 'A1', value: '20' },
      { processNo: '20', category: 'processInfo', itemCode: 'A2', value: '용접' },
    ];
    
    console.log('   샘플 데이터:', sampleFlatData.length, '건');

    // 3. API 직접 호출 시뮬레이션
    console.log('\n3️⃣ 데이터 변환 테스트:');
    
    const processMap = new Map<string, { processNo: string; processName: string }>();
    
    // A1로 processNo 추출
    sampleFlatData
      .filter(item => item.itemCode === 'A1')
      .forEach((item) => {
        const processNo = item.value?.trim() || item.processNo?.trim() || '';
        if (processNo) {
          processMap.set(processNo, {
            processNo,
            processName: '',
          });
        }
      });
    
    // A2로 processName 설정
    sampleFlatData
      .filter(item => item.itemCode === 'A2' && item.value && item.value.trim())
      .forEach((item) => {
        const processNo = item.processNo?.trim() || '';
        const proc = processMap.get(processNo);
        if (proc) {
          proc.processName = item.value.trim();
        }
      });
    
    console.log('   processMap:', {
      size: processMap.size,
      processes: Array.from(processMap.entries()).map(([no, proc]) => ({
        processNo: no,
        processName: proc.processName || '(없음)',
      })),
    });

    // 4. DB 저장 테스트
    if (processMap.size > 0) {
      console.log('\n4️⃣ DB 저장 테스트:');
      
      await prisma.$transaction(async (tx: any) => {
        // 기존 데이터 삭제
        await tx.cpProcess.deleteMany({ where: { cpNo: registration.cpNo } });
        
        // 새 데이터 저장
        for (const [processNo, proc] of processMap.entries()) {
          if (proc.processName) {
            await tx.cpProcess.create({
              data: {
                cpNo: registration.cpNo,
                processNo: processNo.trim(),
                processName: proc.processName.trim(),
                sortOrder: 0,
              },
            });
            console.log(`   ✅ 저장: ${processNo} - ${proc.processName}`);
          }
        }
      });
      
      // 저장 확인
      const saved = await prisma.cpProcess.findMany({
        where: { cpNo: registration.cpNo },
      });
      
      console.log('\n5️⃣ 저장 확인:');
      console.log('   저장된 데이터:', saved.length, '건');
      saved.forEach(p => {
        console.log(`   - ${p.processNo}: ${p.processName}`);
      });
    } else {
      console.error('❌ processMap이 비어있습니다.');
    }

    console.log('\n✅ 테스트 완료');
  } catch (error: any) {
    console.error('❌ 테스트 실패:', error);
    process.exit(1);
  }
}

main().catch(console.error);




