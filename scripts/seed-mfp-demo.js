/**
 * M/F/P 데모 데이터 시드 스크립트
 * 타이어 제조 산업 예시 - FmeaSelectModal 7컬럼 테이블 확인용
 *
 * 실행: node scripts/seed-mfp-demo.js
 */
const http = require('http');

const BASE = 'http://localhost:3000';

function post(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const url = new URL(path, BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = http.request(options, (res) => {
      let chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf-8');
        try { resolve(JSON.parse(text)); } catch { resolve(text); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const PROJECTS = [
  // ===== Master FMEA =====
  {
    fmeaId: 'pfm26-m001',
    fmeaType: 'M',
    project: {
      projectName: '타이어 제조공정 표준 PFMEA',
      customer: '일반 (전 고객 공통)',
      productName: '타이어',
      department: '품질보증부',
      leader: '김품질',
      startDate: '2026-01-15',
    },
    fmeaInfo: {
      companyName: '한국타이어공업',
      engineeringLocation: '대전공장',
      customerName: '일반 (전 고객 공통)',
      modelYear: '2026',
      subject: '타이어 제조공정 표준 PFMEA',
      fmeaStartDate: '2026-01-15',
      fmeaRevisionDate: '2026-02-17',
      fmeaProjectName: '타이어 제조공정 표준',
      designResponsibility: '품질보증부',
      confidentialityLevel: '사업용도',
      fmeaResponsibleName: '김품질',
      partName: '타이어',
      partNo: 'TIRE-STD-2026',
    },
    cftMembers: [
      { role: 'Champion', name: '김품질', department: '품질보증부', position: '부장' },
      { role: 'Leader', name: '이공정', department: '생산기술부', position: '차장' },
    ],
    revisionNo: 'Rev.00',
  },
  {
    fmeaId: 'pfm26-m002',
    fmeaType: 'M',
    project: {
      projectName: '브레이크 패드 제조공정 표준 PFMEA',
      customer: '일반 (전 고객 공통)',
      productName: '브레이크 패드',
      department: '품질보증부',
      leader: '박안전',
      startDate: '2026-01-20',
    },
    fmeaInfo: {
      companyName: '한국브레이크공업',
      engineeringLocation: '울산공장',
      customerName: '일반 (전 고객 공통)',
      modelYear: '2026',
      subject: '브레이크 패드 제조공정 표준 PFMEA',
      fmeaStartDate: '2026-01-20',
      fmeaRevisionDate: '2026-02-10',
      fmeaProjectName: '브레이크 패드 제조공정 표준',
      designResponsibility: '품질보증부',
      confidentialityLevel: '기밀',
      fmeaResponsibleName: '박안전',
      partName: '브레이크 패드',
      partNo: 'BRK-STD-2026',
    },
    cftMembers: [
      { role: 'Champion', name: '박안전', department: '품질보증부', position: '부장' },
    ],
    revisionNo: 'Rev.00',
  },

  // ===== Family FMEA =====
  {
    fmeaId: 'pfm26-f001',
    fmeaType: 'F',
    project: {
      projectName: '승용차용 타이어 PFMEA',
      customer: '현대자동차',
      productName: '승용차용 타이어',
      department: '생산기술부',
      leader: '이공정',
      startDate: '2026-02-01',
    },
    fmeaInfo: {
      companyName: '한국타이어공업',
      engineeringLocation: '대전공장',
      customerName: '현대자동차',
      modelYear: '2026',
      subject: '승용차용 타이어 PFMEA',
      fmeaStartDate: '2026-02-01',
      fmeaRevisionDate: '2026-02-17',
      fmeaProjectName: '승용차용 타이어',
      designResponsibility: '생산기술부',
      confidentialityLevel: '사업용도',
      fmeaResponsibleName: '이공정',
      partName: '승용차용 타이어',
      partNo: 'TIRE-PC-2026',
    },
    cftMembers: [
      { role: 'Leader', name: '이공정', department: '생산기술부', position: '차장' },
      { role: 'PM', name: '정설계', department: '설계부', position: '과장' },
    ],
    parentFmeaId: 'pfm26-m001',
    parentFmeaType: 'M',
    revisionNo: 'Rev.00',
  },
  {
    fmeaId: 'pfm26-f002',
    fmeaType: 'F',
    project: {
      projectName: '트럭버스용 타이어 PFMEA',
      customer: '대형차량 OEM',
      productName: '트럭버스용 타이어',
      department: '생산기술부',
      leader: '최중장',
      startDate: '2026-02-05',
    },
    fmeaInfo: {
      companyName: '한국타이어공업',
      engineeringLocation: '금산공장',
      customerName: '대형차량 OEM',
      modelYear: '2026',
      subject: '트럭버스용 타이어 PFMEA',
      fmeaStartDate: '2026-02-05',
      fmeaRevisionDate: '2026-02-15',
      fmeaProjectName: '트럭버스용 타이어',
      designResponsibility: '생산기술부',
      confidentialityLevel: '사업용도',
      fmeaResponsibleName: '최중장',
      partName: '트럭버스용 타이어',
      partNo: 'TIRE-TB-2026',
    },
    cftMembers: [
      { role: 'Leader', name: '최중장', department: '생산기술부', position: '차장' },
    ],
    parentFmeaId: 'pfm26-m001',
    parentFmeaType: 'M',
    revisionNo: 'Rev.00',
  },
  {
    fmeaId: 'pfm26-f003',
    fmeaType: 'F',
    project: {
      projectName: '산업용 타이어 PFMEA',
      customer: '중장비 제조사',
      productName: '산업용 타이어',
      department: '특수제품부',
      leader: '한산업',
      startDate: '2026-02-08',
    },
    fmeaInfo: {
      companyName: '한국타이어공업',
      engineeringLocation: '대전공장',
      customerName: '중장비 제조사',
      modelYear: '2026',
      subject: '산업용 타이어 PFMEA',
      fmeaStartDate: '2026-02-08',
      fmeaRevisionDate: '2026-02-17',
      fmeaProjectName: '산업용 타이어',
      designResponsibility: '특수제품부',
      confidentialityLevel: '독점',
      fmeaResponsibleName: '한산업',
      partName: '산업용 타이어',
      partNo: 'TIRE-IND-2026',
    },
    cftMembers: [
      { role: 'Leader', name: '한산업', department: '특수제품부', position: '과장' },
    ],
    parentFmeaId: 'pfm26-m001',
    parentFmeaType: 'M',
    revisionNo: 'Rev.00',
  },

  // ===== Part FMEA =====
  {
    fmeaId: 'pfm26-p001',
    fmeaType: 'P',
    project: {
      projectName: '소나타 26MY 타이어 PFMEA',
      customer: '현대자동차',
      productName: '소나타 26MY 타이어',
      department: '생산기술부',
      leader: '이공정',
      startDate: '2026-02-10',
    },
    fmeaInfo: {
      companyName: '한국타이어공업',
      engineeringLocation: '대전공장',
      customerName: '현대자동차',
      modelYear: '2026',
      subject: '소나타 26MY 타이어 PFMEA',
      fmeaStartDate: '2026-02-10',
      fmeaRevisionDate: '2026-02-17',
      fmeaProjectName: '소나타 26MY 타이어',
      designResponsibility: '생산기술부',
      confidentialityLevel: '사업용도',
      fmeaResponsibleName: '이공정',
      partName: '소나타 26MY 타이어',
      partNo: '225/45R17-SNT26',
    },
    cftMembers: [
      { role: 'Leader', name: '이공정', department: '생산기술부', position: '차장' },
      { role: 'PM', name: '정설계', department: '설계부', position: '과장' },
      { role: '팀원', name: '강검사', department: '품질검사부', position: '대리' },
    ],
    parentFmeaId: 'pfm26-f001',
    parentFmeaType: 'F',
    revisionNo: 'Rev.00',
  },
  {
    fmeaId: 'pfm26-p002',
    fmeaType: 'P',
    project: {
      projectName: 'K5 26MY 타이어 PFMEA',
      customer: '기아',
      productName: 'K5 26MY 타이어',
      department: '생산기술부',
      leader: '이공정',
      startDate: '2026-02-12',
    },
    fmeaInfo: {
      companyName: '한국타이어공업',
      engineeringLocation: '대전공장',
      customerName: '기아',
      modelYear: '2026',
      subject: 'K5 26MY 타이어 PFMEA',
      fmeaStartDate: '2026-02-12',
      fmeaRevisionDate: '2026-02-17',
      fmeaProjectName: 'K5 26MY 타이어',
      designResponsibility: '생산기술부',
      confidentialityLevel: '사업용도',
      fmeaResponsibleName: '이공정',
      partName: 'K5 26MY 타이어',
      partNo: '215/55R17-K5-26',
    },
    cftMembers: [
      { role: 'Leader', name: '이공정', department: '생산기술부', position: '차장' },
    ],
    parentFmeaId: 'pfm26-f001',
    parentFmeaType: 'F',
    revisionNo: 'Rev.00',
  },
  {
    fmeaId: 'pfm26-p003',
    fmeaType: 'P',
    project: {
      projectName: '그랜저 26MY 타이어 PFMEA',
      customer: '현대자동차',
      productName: '그랜저 26MY 타이어',
      department: '생산기술부',
      leader: '송양산',
      startDate: '2026-02-14',
    },
    fmeaInfo: {
      companyName: '한국타이어공업',
      engineeringLocation: '대전공장',
      customerName: '현대자동차',
      modelYear: '2026',
      subject: '그랜저 26MY 타이어 PFMEA',
      fmeaStartDate: '2026-02-14',
      fmeaRevisionDate: '2026-02-17',
      fmeaProjectName: '그랜저 26MY 타이어',
      designResponsibility: '생산기술부',
      confidentialityLevel: '기밀',
      fmeaResponsibleName: '송양산',
      partName: '그랜저 26MY 타이어',
      partNo: '235/55R18-GRJ26',
    },
    cftMembers: [
      { role: 'Leader', name: '송양산', department: '생산기술부', position: '과장' },
      { role: '팀원', name: '윤조립', department: '조립과', position: '대리' },
    ],
    parentFmeaId: 'pfm26-f001',
    parentFmeaType: 'F',
    revisionNo: 'Rev.00',
  },
];

async function main() {
  console.log('=== M/F/P 데모 데이터 시드 시작 ===\n');

  for (const proj of PROJECTS) {
    const label = `[${proj.fmeaType}] ${proj.fmeaId} - ${proj.fmeaInfo.subject}`;
    try {
      const res = await post('/api/fmea/projects', proj);
      if (res.success) {
        console.log(`  ✅ ${label}`);
      } else {
        console.log(`  ⚠️ ${label} → ${res.error || res.message || JSON.stringify(res)}`);
      }
    } catch (err) {
      console.log(`  ❌ ${label} → ${err.message}`);
    }
  }

  console.log('\n=== 시드 완료 (M:2, F:3, P:3 = 총 8건) ===');
  console.log('브라우저에서 PFMEA 등록 화면 → Master/Family/Part 선택 모달 확인\n');
}

main().catch(console.error);
