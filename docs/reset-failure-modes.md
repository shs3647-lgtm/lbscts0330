# 고장형태 데이터 초기화 방법

## 방법 1: 브라우저 콘솔에서 실행 (권장)

1. 브라우저 개발자도구 열기 (F12)
2. Console 탭 선택
3. 아래 스크립트 복사/붙여넣기 후 Enter:

```javascript
// 현재 FMEA ID 확인
const currentUrl = window.location.href;
const fmeaIdMatch = currentUrl.match(/[?&]id=([^&]+)/);
const fmeaId = fmeaIdMatch ? fmeaIdMatch[1] : null;

if (!fmeaId) {
  console.error('FMEA ID를 찾을 수 없습니다. URL에 ?id=... 파라미터가 있는지 확인하세요.');
} else {
  // 워크시트 데이터 로드
  const keys = [`pfmea_worksheet_${fmeaId}`, `fmea-worksheet-${fmeaId}`];
  let found = false;
  
  for (const key of keys) {
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      console.log('[초기화 전] 고장형태 개수:', parsed.l2?.reduce((sum, p) => sum + (p.failureModes?.length || 0), 0) || 0);
      
      // 모든 공정의 failureModes 초기화
      if (parsed.l2) {
        parsed.l2.forEach(p => {
          p.failureModes = [];
        });
        parsed.failureL2Confirmed = false; // 확정 상태도 초기화
      }
      
      // 저장
      localStorage.setItem(key, JSON.stringify(parsed));
      console.log('[초기화 완료] 고장형태 데이터가 삭제되었습니다.');
      console.log('[초기화 후] 고장형태 개수: 0');
      found = true;
      break;
    }
  }
  
  if (!found) {
    console.warn('저장된 데이터를 찾을 수 없습니다.');
  } else {
    // 페이지 새로고침
    console.log('페이지를 새로고침합니다...');
    setTimeout(() => location.reload(), 1000);
  }
}
```

## 방법 2: 전체 워크시트 데이터 삭제

```javascript
// 모든 워크시트 데이터 삭제
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('pfmea_worksheet_') || key.startsWith('fmea-worksheet-')) {
    localStorage.removeItem(key);
    console.log('삭제:', key);
  }
});
console.log('모든 워크시트 데이터가 삭제되었습니다.');
location.reload();
```

## 방법 3: 원자성 DB도 함께 삭제

```javascript
// 원자성 DB도 함께 삭제
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('pfmea_worksheet_') || 
      key.startsWith('fmea-worksheet-') ||
      key.startsWith('fmea_worksheet_db_')) {
    localStorage.removeItem(key);
    console.log('삭제:', key);
  }
});
console.log('모든 워크시트 데이터와 원자성 DB가 삭제되었습니다.');
location.reload();
```






