/**
 * localStorage의 프로젝트 기초정보 데이터를 DB로 마이그레이션
 * 
 * 실행 방법:
 * 1. 브라우저 콘솔에서 실행하거나
 * 2. Node.js 환경에서 실행 (localStorage 접근 불가하므로 브라우저 콘솔 권장)
 * 
 * 브라우저 콘솔 실행:
 * 1. http://localhost:3000 접속
 * 2. F12 → Console 탭
 * 3. 아래 코드 복사/붙여넣기
 */

// 브라우저 콘솔에서 실행할 코드
const migrateProjectsToDB = async () => {
  console.log('🔄 프로젝트 기초정보 데이터 마이그레이션 시작...');
  
  // localStorage에서 데이터 로드
  const storageKey = 'ss-bizinfo-projects';
  const localData = localStorage.getItem(storageKey);
  
  if (!localData) {
    console.log('ℹ️ localStorage에 프로젝트 기초정보 데이터가 없습니다.');
    return;
  }
  
  const projects = JSON.parse(localData);
  console.log(`📦 localStorage에서 ${projects.length}개 프로젝트 기초정보 발견`);
  
  if (projects.length === 0) {
    console.log('ℹ️ 마이그레이션할 데이터가 없습니다.');
    return;
  }
  
  // DB에 저장
  let successCount = 0;
  let errorCount = 0;
  
  for (const project of projects) {
    try {
      const response = await fetch('/api/bizinfo/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: project.customerName,
          customerCode: project.customerCode || null,
          factory: project.factory || null,
          modelYear: project.modelYear || null,
          program: project.program || null,
          productName: project.productName || null,
          partNo: project.partNo || null,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          successCount++;
          console.log(`✅ ${project.customerName} - ${project.productName || 'N/A'} 마이그레이션 완료`);
        } else {
          errorCount++;
          console.error(`❌ ${project.customerName} - ${project.productName || 'N/A'} 마이그레이션 실패:`, data.error);
        }
      } else {
        errorCount++;
        const errorData = await response.json();
        console.error(`❌ ${project.customerName} - ${project.productName || 'N/A'} 마이그레이션 실패:`, errorData.error);
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ ${project.customerName} - ${project.productName || 'N/A'} 마이그레이션 오류:`, error);
    }
  }
  
  console.log(`\n✅ 마이그레이션 완료: 성공 ${successCount}개, 실패 ${errorCount}개`);
  
  if (successCount > 0) {
    console.log('💡 localStorage 데이터는 백업용으로 유지됩니다.');
    console.log('💡 DB에 정상 저장되었는지 확인: http://localhost:3000/admin/db-viewer');
  }
};

// 브라우저 콘솔에서 실행
if (typeof window !== 'undefined') {
  // 브라우저 환경
  console.log('📋 마이그레이션 함수 준비 완료');
  console.log('💡 migrateProjectsToDB() 함수를 실행하세요.');
  window.migrateProjectsToDB = migrateProjectsToDB;
} else {
  // Node.js 환경 (실행 불가)
  console.log('⚠️ 이 스크립트는 브라우저 콘솔에서 실행해야 합니다.');
  console.log('💡 http://localhost:3000 접속 → F12 → Console → migrateProjectsToDB() 실행');
}

module.exports = { migrateProjectsToDB };








