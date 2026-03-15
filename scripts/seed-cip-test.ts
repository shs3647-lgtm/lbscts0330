/**
 * @file seed-cip-test.ts
 * @description AP개선 CIP 가상 테스트 5건 시드 (UTF-8 인코딩 보장)
 * 실행: npx tsx scripts/seed-cip-test.ts
 */

async function main() {
  const items = [
    {
      cipNo: 'CIP26-001',
      fmeaId: 'pfm26-m014',
      apLevel: 'H',
      category: 'Quality',
      failureMode: '솔더 브릿지',
      cause: '스텐실 개구부 오염',
      improvement: '[예방] 스텐실 세정 주기 4H→2H 단축 | [검출] SPI 3D 검사기 도입',
      responsible: '김품질',
      targetDate: '2026-04-15',
      status: 'Y',
      s: 8, o: 6, d: 7,
    },
    {
      cipNo: 'CIP26-002',
      fmeaId: 'pfm26-m014',
      apLevel: 'H',
      category: 'Yield',
      failureMode: '볼 조인트 크랙',
      cause: '리플로우 프로파일 편차',
      improvement: '[예방] 프로파일 모니터링 실시간 알람 추가 | [검출] X-ray 전수검사 적용',
      responsible: '박공정',
      targetDate: '2026-05-01',
      status: 'R',
      s: 9, o: 5, d: 8,
    },
    {
      cipNo: 'CIP26-003',
      fmeaId: 'pfm26-m014',
      apLevel: 'M',
      category: 'Field',
      failureMode: '와이어 리프트오프',
      cause: '본딩 패드 산화',
      improvement: '[예방] 질소 분위기 본딩 적용 | [검출] Pull test 샘플링 강화 (n=5→n=10)',
      responsible: '이설비',
      targetDate: '2026-03-01',
      completedDate: '2026-02-28',
      status: 'G',
      s: 7, o: 4, d: 6,
    },
    {
      cipNo: 'CIP26-004',
      fmeaId: 'pfm26-m014',
      apLevel: 'M',
      category: 'Cost',
      failureMode: '보이드(Void) 발생',
      cause: '수지 유동성 저하',
      improvement: '[예방] 수지 사전 가열 온도 관리 (80±5℃) | [검출] SAT(초음파) 검사 LOT당 3ea',
      responsible: '최자재',
      targetDate: '2026-04-30',
      status: 'Y',
      s: 6, o: 3, d: 5,
    },
    {
      cipNo: 'CIP26-005',
      fmeaId: 'pfm26-m014',
      apLevel: 'L',
      category: 'Safety',
      failureMode: '전기적 특성 불량 (Leakage)',
      cause: '테스트 소켓 접촉 불량',
      improvement: '[예방] 소켓 PM 주기 10K→5K shots | [검출] 바운더리 스캔 테스트 추가',
      responsible: '정테스트',
      targetDate: '2026-06-01',
      status: 'R',
      s: 5, o: 2, d: 4,
    },
  ];

  const res = await fetch('http://localhost:3000/api/cip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ items }),
  });
  const result = await res.json();
  console.log('Result:', JSON.stringify(result, null, 2));

  // 검증: 다시 읽어서 한글 확인
  const verifyRes = await fetch('http://localhost:3000/api/cip?fmeaId=pfm26-m014');
  const verifyResult = await verifyRes.json();
  for (const item of verifyResult.items || []) {
    console.log(`  ${item.cipNo}: ${item.failureMode} | ${item.cause}`);
  }
}

main().catch(console.error);
