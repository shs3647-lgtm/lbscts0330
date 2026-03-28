/**
 * S=1 레코드 재평가 스크립트 (AIAG-VDA 심각도 기준)
 * 
 * 시드 데이터의 S=1 레코드를 FE 텍스트 키워드로 재평가하여 올바른 심각도를 부여합니다.
 * 
 * AIAG-VDA 심각도 기준:
 * S=10: 법적 규제 위반, 인명 사고 (안전)
 * S=9:  법적 규제 위반 (규제), 안전 관련 (경고 없이)
 * S=8:  제품 작동 불능, 고객 매우 불만족
 * S=7:  제품 기능 저하, 고객 불만족
 * S=6:  제품 외관/편의 결함, 고객 경미 불만
 * S=5:  중간 정도 결함 (약간의 성능 저하)
 * S=4:  경미한 결함 (약간의 외관 결함)
 * S=3:  사소한 결함 (거의 인지 불가)
 * S=2:  매우 경미한 영향 (판별 어려움)
 * S=1:  영향 없음 → ★ FMEA에서 "영향 없음"이면 FE 자체가 불필요
 */

const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'prisma', 'seed-data', '10_severity_usage_records.json');
const data = require(seedPath);

// AIAG-VDA 키워드 → 심각도 매핑
const SEVERITY_KEYWORDS = [
  // S=10: 사망·인체 위해·법규 위반 (안전)
  { rating: 10, keywords: ['사망', '인체', '인명', '화재', '폭발', '감전'] },
  // S=9: 법규 위반·리콜·안전 (규제)
  { rating: 9, keywords: ['법적', '리콜', 'RoHS', '법규', '규제 위반', '안전사고', '규제'] },
  // S=8: 기능 상실·작동 불능·라인 정지
  { rating: 8, keywords: ['작동 불능', '기능 상실', '라인 정지', '라인정지', '생산 중단', '전수', 'Open/Short', '전기적 Open'] },
  // S=7: 기능 저하·수율 심각 저하·고객 불만·불량 유출
  { rating: 7, keywords: ['수율 저하', '수율 손실', '수율 심각', '고객 불만', '품질 저하', '불량 유출', 'Spec Out', '특성 이상', '불량 수령', '신뢰성 저하', '신뢰도 하락', 'Wafer 파손', 'Wafer 손실', '크랙', '파손', '손상', '미검출', '유출', '패턴 불량'] },
  // S=6: 외관 결함·부분 기능 저하·생산 차질
  { rating: 6, keywords: ['외관 결함', '외관 불량', '도장 불량', '내구성 저하', '부식', '기능 저하', '조립 불량', '생산 차질', '출고 지연', '산포 불량', '정렬 오차', '오염', '누락', '혼입', '정전기', 'Skip', 'Interlock'] },
  // S=5: 식별 오류·데이터 오류·관리 오류
  { rating: 5, keywords: ['식별 불가', '라벨 오류', '데이터 입력 오류', '정보 누락', 'LOT 관리', '검사 샘플', '수량 불일치'] },
];

let changed = 0;
let unchanged = 0;

data.forEach(record => {
  if (record.severity !== 1) return;
  
  const fe = record.feText || '';
  let newSeverity = 6; // 기본값: 매칭 안 되면 S=6 (중간 결함)
  let matched = false;

  for (const rule of SEVERITY_KEYWORDS) {
    for (const kw of rule.keywords) {
      if (fe.includes(kw)) {
        newSeverity = rule.rating;
        matched = true;
        break;
      }
    }
    if (matched) break;
  }

  record.severity = newSeverity;
  changed++;
});

console.log(`재평가 완료: ${changed}건 변경, ${data.length - changed}건 유지`);

// 재평가 결과 통계
const stats = {};
data.forEach(r => {
  stats[r.severity] = (stats[r.severity] || 0) + 1;
});
console.log('심각도 분포:', stats);

// 저장
fs.writeFileSync(seedPath, JSON.stringify(data, null, 2), 'utf-8');
console.log(`저장 완료: ${seedPath}`);
