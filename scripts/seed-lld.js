/**
 * LLD 샘플 데이터 저장 스크립트
 */

const sampleData = [
  { lldNo: 'LLD26-001', vehicle: 'HHH', target: '설계', failureMode: 'Audio 출력 자동 Mute', location: 'FIELD', cause: 'Mode Soft Bug', category: '예방관리', improvement: '각Mode별 Mute 제어', completedDate: '2025-10-01', fmeaId: 'pfm26-001', status: 'G', appliedDate: '2025-11-12' },
  { lldNo: 'LLD26-002', vehicle: 'BBB', target: '부품', failureMode: 'AM Seek Stop 오류', location: '고객공장', cause: 'IF 미체크', category: '검출관리', improvement: 'IF 체크 추가', completedDate: '2025-04-15', fmeaId: '', status: 'R', appliedDate: '' },
  { lldNo: 'LLD26-003', vehicle: 'GVS', target: '제조', failureMode: 'AST 메모리 순서 오류', location: '', cause: 'SM 미체크', category: '예방관리', improvement: 'SM 체크 추가', completedDate: '2025-03-20', fmeaId: '', status: 'Y', appliedDate: '' },
  { lldNo: 'LLD26-004', vehicle: 'ABC', target: '설계', failureMode: 'Bluetooth 연결 끊김', location: 'FIELD', cause: '타이머 설정 오류', category: '예방관리', improvement: 'BT 타이머 5초 변경', completedDate: '2025-05-10', fmeaId: 'pfm26-002', status: 'G', appliedDate: '2025-06-15' },
  { lldNo: 'LLD26-005', vehicle: 'XYZ', target: '부품', failureMode: '커넥터 접촉 불량', location: '양산라인', cause: '핀 규격 미달', category: '검출관리', improvement: '입고검사 추가', completedDate: '2025-06-01', fmeaId: 'pfm26-001', status: 'G', appliedDate: '2025-07-20' },
  { lldNo: 'LLD26-006', vehicle: 'DEF', target: '제조', failureMode: '솔더 크랙 발생', location: '고객공장', cause: '리플로우 온도 불량', category: '예방관리', improvement: '온도 프로파일 최적화', completedDate: '', fmeaId: '', status: 'Y', appliedDate: '' },
  { lldNo: 'LLD26-007', vehicle: 'GHI', target: '설계', failureMode: 'USB 인식 실패', location: 'FIELD', cause: 'USB 드라이버 호환성', category: '예방관리', improvement: 'USB 드라이버 업데이트', completedDate: '2025-07-15', fmeaId: 'pfm26-003', status: 'G', appliedDate: '2025-08-10' },
  { lldNo: 'LLD26-008', vehicle: 'JKL', target: '부품', failureMode: 'LCD 불량화소 발생', location: '입고검사', cause: '공급사 공정 변경', category: '검출관리', improvement: '입고검사 불량화소 검출', completedDate: '', fmeaId: '', status: 'Y', appliedDate: '' },
  { lldNo: 'LLD26-009', vehicle: 'MNO', target: '제조', failureMode: 'PCB 휨 발생', location: '양산라인', cause: 'SMT 후 냉각속도 과다', category: '예방관리', improvement: '냉각 속도 조절', completedDate: '', fmeaId: '', status: 'R', appliedDate: '' },
  { lldNo: 'LLD26-010', vehicle: 'PQR', target: '설계', failureMode: 'CAN 통신 오류', location: 'FIELD', cause: '통신 프로토콜 불일치', category: '예방관리', improvement: 'CAN 프로토콜 버전 동기화', completedDate: '2025-08-20', fmeaId: 'pfm26-001', status: 'G', appliedDate: '2025-09-05' },
];

async function seedLLD() {
  try {
    const response = await fetch('http://localhost:3000/api/lessons-learned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: sampleData })
    });
    const result = await response.json();
    console.log('✅ LLD 샘플 데이터 저장 완료:', result);
  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

seedLLD();






