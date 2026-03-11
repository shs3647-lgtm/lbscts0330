# PFD 렌더링 수정 TODO

## 완료된 작업 (2026-01-31 22:00)
1. ✅ PFD pfdConstants.ts - NO 컬럼 추가 (charNo)
2. ✅ PFD 렌더러 - charNo 렌더링 로직 추가
3. ✅ PFD useRowSpan - partName/equipment 병합 로직 CP와 동일하게 수정
4. ✅ CP→PFD sync API - processLevel, partName, equipment 필드 매핑 수정
5. ✅ 데이터 검증 유틸리티 생성 (sync-validation.ts)
6. ✅ 변경 이력 관리 유틸리티 생성 (change-history.ts)
7. ✅ CP 워크시트 - 연동 전 데이터 검증 추가
8. ✅ CP 워크시트 - 연동 후 변경 이력 저장 추가

## 완료된 작업 (2026-01-31 23:50)
1. ✅ PFD 워크시트 page.tsx에서 changeMarkers 로드 및 렌더러에 전달
2. ✅ 변경 이력 보기 버튼/모달 추가
3. ✅ 변경 마커 초기화(승인) 기능 추가
4. ✅ PFD 렌더러에서 changeMarkers prop 연결
5. ✅ PFD 행 스타일에 변경 마커 적용 확인

## 커밋 메시지
```
feat: CP↔PFD 연동 데이터 검증 및 변경 이력 기능

- CP→PFD 연동 전 기존 데이터 비교 검증
- 데이터 불일치 시 사용자 확인 다이얼로그
- 변경 이력 저장 (localStorage)
- 변경된 셀 시각적 표시 (노란색 배경, 주황 테두리, C번호 배지)
- PFD NO 컬럼 추가 (공정별 순번, CP와 동일)
- PFD 부품명/설비 병합 로직 CP와 일치
```
