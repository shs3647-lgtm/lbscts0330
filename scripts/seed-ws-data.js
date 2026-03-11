/**
 * WS 가상 데이터 주입 스크립트
 * 실행: node scripts/seed-ws-data.js
 */
const http = require('http');

const WS_DATA = [
  {
    wsNo: 'ws26-p001',
    wsInfo: {
      pfdType: 'P', subject: '프론트 범퍼 조립 작업표준서',
      companyName: 'AMPSYSTEM', customerName: '현대자동차', modelYear: '2026 NX4',
      wsStartDate: '2026-01-15', wsRevisionDate: '2026-06-30',
      processResponsibility: '생산기술팀', wsResponsibleName: '김철수',
      engineeringLocation: '울산 1공장', confidentialityLevel: 'Production',
      securityLevel: 'Internal', partName: '프론트 범퍼', partNo: 'BMP-FR-001',
      processName: '범퍼 조립',
    },
    parentApqpNo: 'APQP-2026-001', parentFmeaId: 'pfm26-p001',
    linkedCpNo: 'cp26-p001',
  },
  {
    wsNo: 'ws26-p002',
    wsInfo: {
      pfdType: 'P', subject: '리어 범퍼 도장 작업표준서',
      companyName: 'AMPSYSTEM', customerName: '기아', modelYear: '2026 EV9',
      wsStartDate: '2026-02-01', wsRevisionDate: '2026-07-31',
      processResponsibility: '도장팀', wsResponsibleName: '이영희',
      engineeringLocation: '화성 2공장', confidentialityLevel: 'Pre-Launch',
      securityLevel: 'Confidential', partName: '리어 범퍼', partNo: 'BMP-RR-002',
      processName: '도장 공정',
    },
    parentApqpNo: 'APQP-2026-002', parentFmeaId: 'pfm26-p002',
    linkedCpNo: 'cp26-p002',
  },
  {
    wsNo: 'ws26-m001',
    wsInfo: {
      pfdType: 'M', subject: '엔진 블록 가공 마스터 WS',
      companyName: 'AMPSYSTEM', customerName: '현대자동차', modelYear: '2026 GN7',
      wsStartDate: '2026-01-10', wsRevisionDate: '2026-05-15',
      processResponsibility: '가공팀', wsResponsibleName: '박지훈',
      engineeringLocation: '아산 공장', confidentialityLevel: 'Production',
      securityLevel: 'Internal', partName: '엔진 블록', partNo: 'ENG-BLK-100',
      processName: 'CNC 가공',
    },
    parentApqpNo: 'APQP-2026-003',
  },
  {
    wsNo: 'ws26-f001',
    wsInfo: {
      pfdType: 'F', subject: '전기차 배터리 팩 조립 패밀리 WS',
      companyName: 'AMPSYSTEM', customerName: '기아', modelYear: '2026 EV6',
      wsStartDate: '2026-03-01', wsRevisionDate: '2026-09-30',
      processResponsibility: '전장팀', wsResponsibleName: '최민수',
      engineeringLocation: '광주 공장', confidentialityLevel: 'Prototype',
      securityLevel: 'Confidential', partName: '배터리 팩', partNo: 'BAT-PCK-200',
      processName: '배터리 조립',
    },
    parentFmeaId: 'pfm26-f001', linkedCpNo: 'cp26-f001',
  },
  {
    wsNo: 'ws26-p003',
    wsInfo: {
      pfdType: 'P', subject: '서스펜션 용접 작업표준서',
      companyName: 'AMPSYSTEM', customerName: '제네시스', modelYear: '2026 GV80',
      wsStartDate: '2026-01-20', wsRevisionDate: '2026-08-15',
      processResponsibility: '용접팀', wsResponsibleName: '정수아',
      engineeringLocation: '울산 2공장', confidentialityLevel: 'Production',
      securityLevel: 'Internal', partName: '서스펜션 암', partNo: 'SUS-ARM-050',
      processName: '로봇 용접',
    },
    parentApqpNo: 'APQP-2026-005', parentFmeaId: 'pfm26-p003',
    linkedCpNo: 'cp26-p003',
  },
  {
    wsNo: 'ws26-p004',
    wsInfo: {
      pfdType: 'P', subject: '헤드램프 렌즈 성형 WS',
      companyName: 'AMPSYSTEM', customerName: '현대자동차', modelYear: '2026 아이오닉7',
      wsStartDate: '2026-02-10', wsRevisionDate: '2026-07-20',
      processResponsibility: '사출팀', wsResponsibleName: '한서연',
      engineeringLocation: '천안 공장', confidentialityLevel: 'Pre-Launch',
      securityLevel: 'Internal', partName: '헤드램프 렌즈', partNo: 'HLP-LNS-300',
      processName: '사출 성형',
    },
    linkedCpNo: 'cp26-p004',
  },
  {
    wsNo: 'ws26-p005',
    wsInfo: {
      pfdType: 'P', subject: '와이어 하네스 조립 작업표준서',
      companyName: 'AMPSYSTEM', customerName: '기아', modelYear: '2026 셀토스',
      wsStartDate: '2026-03-05', wsRevisionDate: '2026-10-31',
      processResponsibility: '전장조립팀', wsResponsibleName: '윤재호',
      engineeringLocation: '서산 공장', confidentialityLevel: 'Production',
      securityLevel: 'Public', partName: '와이어 하네스', partNo: 'WHN-ASM-400',
      processName: '수동 조립',
    },
    parentApqpNo: 'APQP-2026-007',
  },
  {
    wsNo: 'ws26-f002',
    wsInfo: {
      pfdType: 'F', subject: '차체 프레스 가공 패밀리 WS',
      companyName: 'AMPSYSTEM', customerName: '제네시스', modelYear: '2026 G90',
      wsStartDate: '2026-01-05', wsRevisionDate: '2026-04-30',
      processResponsibility: '프레스팀', wsResponsibleName: '송다은',
      engineeringLocation: '울산 3공장', confidentialityLevel: 'Production',
      securityLevel: 'Internal', partName: '도어 패널', partNo: 'DR-PNL-500',
      processName: '프레스 가공',
    },
    parentApqpNo: 'APQP-2026-008', parentFmeaId: 'pfm26-f002',
    linkedCpNo: 'cp26-f002',
  },
  {
    wsNo: 'ws26-p006',
    wsInfo: {
      pfdType: 'P', subject: '브레이크 디스크 선삭 WS',
      companyName: 'AMPSYSTEM', customerName: '현대자동차', modelYear: '2025 투싼',
      wsStartDate: '2025-11-01', wsRevisionDate: '2026-03-15',
      processResponsibility: '정밀가공팀', wsResponsibleName: '오정민',
      engineeringLocation: '아산 공장', confidentialityLevel: 'Production',
      securityLevel: 'Internal', partName: '브레이크 디스크', partNo: 'BRK-DSC-600',
      processName: 'CNC 선삭',
    },
    parentFmeaId: 'pfm25-p010', linkedCpNo: 'cp25-p010',
  },
  {
    wsNo: 'ws26-p007',
    wsInfo: {
      pfdType: 'P', subject: '시트 쿠션 봉제 작업표준서',
      companyName: 'AMPSYSTEM', customerName: '기아', modelYear: '2026 스포티지',
      wsStartDate: '2026-04-01', wsRevisionDate: '2026-12-31',
      processResponsibility: '내장팀', wsResponsibleName: '임하늘',
      engineeringLocation: '광주 공장', confidentialityLevel: 'Prototype',
      securityLevel: 'Confidential', partName: '시트 쿠션', partNo: 'ST-CSN-700',
      processName: '봉제 가공',
    },
  },
];

function postData(item) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(item);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/ws',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ wsNo: item.wsNo, success: parsed.success, details: parsed.details || parsed.error });
        } catch (e) {
          resolve({ wsNo: item.wsNo, success: false, error: data });
        }
      });
    });
    req.on('error', (e) => reject(e));
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log(`[WS Seed] ${WS_DATA.length}건 가상 데이터 주입 시작...`);
  for (const item of WS_DATA) {
    try {
      const result = await postData(item);
      console.log(`  ${result.success ? '✅' : '❌'} ${item.wsNo} - ${item.wsInfo.subject}${result.details ? ' [' + result.details + ']' : ''}`);
    } catch (e) {
      console.error(`  ❌ ${item.wsNo} - 오류: ${e.message}`);
    }
  }
  console.log('[WS Seed] 완료!');
}

main();
