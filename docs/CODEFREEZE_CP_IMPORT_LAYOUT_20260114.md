# 코드프리즈: CP Import 페이지 메뉴바 고정 크기 및 반응형 레이아웃

**코드프리즈 날짜**: 2026-01-14  
**태그**: `codefreeze-20260114-cp-import-layout`  
**커밋**: `6d6a2af`

## 핵심 변경 내용

### 1. 메뉴바 고정 크기 (1414px)
- **헤더 영역**: `w-[1414px] min-w-[1414px] max-w-[1414px] flex-shrink-0`
- **메뉴 영역 (3행 입력 영역)**: `w-[1414px] min-w-[1414px] max-w-[1414px] flex-shrink-0`
- **결과**: 브라우저 viewport 크기와 무관하게 항상 1414px 고정
- **검증**: Playwright 테스트로 다양한 viewport 크기(1920x1080, 1536x864, 1280x720)에서 검증 완료

### 2. 미리보기 워크시트 영역 반응형
- **미리보기 컨테이너**: `w-full flex-1`
- **결과**: 메뉴바 아래 남은 공간을 모두 차지하여 반응형 동작
- **스크롤**: `overflow-x-auto overflow-y-auto`로 가로/세로 스크롤 지원

### 3. 하단 상태바 반응형
- **하단 상태바**: `w-full flex-shrink-0`
- **결과**: 미리보기 영역과 동일한 너비로 반응형 동작

## 수정된 파일

### 1. `src/app/control-plan/import/page.tsx`
- **메인 컨테이너**: `h-screen overflow-hidden bg-[#f5f7fa] px-4 py-2 pt-9 font-[Malgun_Gothic] flex flex-col`
- **헤더 영역**: 고정 크기 1414px, `flex-shrink-0` 추가
- **메뉴 영역**: 고정 크기 1414px, `flex-shrink-0` 추가
- **미리보기 영역**: `w-full flex-1`로 반응형 설정
- **하단 상태바**: `w-full flex-shrink-0`로 반응형 설정

### 2. `tests/cp-import-layout.spec.ts` (신규)
- **테스트 파일**: 8개 테스트 케이스
- **검증 항목**:
  1. 메뉴바 고정 크기 검증 (헤더 + 3행 입력 영역)
  2. 미리보기 영역 반응형 동작 검증
  3. 브라우저 배율 변경 시 메뉴바 크기 유지
  4. 레이아웃 구조 검증 (flex 컨테이너)
  5. 메뉴바 flex-shrink 검증
  6. 미리보기 영역 flex-1 검증
  7. 전체 레이아웃 스크롤 동작 확인
  8. 다양한 viewport 크기에서 레이아웃 안정성 확인

## 동작 방식

### 레이아웃 구조
```
메인 컨테이너 (flex flex-col)
├── 헤더 (1414px 고정, flex-shrink-0)
├── 메뉴 영역 (1414px 고정, flex-shrink-0)
├── 미리보기 탭 (flex-shrink-0)
├── 미리보기 영역 (flex-1, 반응형)
└── 하단 상태바 (w-full, 반응형)
```

### 크기 고정 원리
1. **min-w, max-w 동시 설정**: `min-w-[1414px] max-w-[1414px]`로 고정 크기 강제
2. **flex-shrink-0**: Flex 컨테이너에서 축소 방지
3. **w-[1414px]**: 기본 너비 설정

### 반응형 동작 원리
1. **flex-1**: 남은 공간을 모두 차지
2. **w-full**: 부모 컨테이너 너비에 맞춤
3. **overflow-x-auto overflow-y-auto**: 내용이 넘치면 스크롤 생성

## 검증 결과

### Playwright 테스트 결과
- **총 8개 테스트 모두 통과** (24.7초)
- **다양한 viewport 크기**: 1920x1080, 1536x864, 1280x720 모두 통과
- **메뉴바 크기**: 모든 viewport에서 1414px 고정 확인

### 테스트 시나리오
1. ✅ 메뉴바 고정 크기: 헤더=1414px, 메뉴=1414px
2. ✅ 미리보기 영역 반응형: viewport에 따라 크기 변함
3. ✅ 브라우저 배율 변경: viewport 크기 변경 시에도 메뉴바 1414px 유지
4. ✅ 레이아웃 구조: flex 컨테이너 구조 확인
5. ✅ flex-shrink: 메뉴바 flex-shrink=0 확인
6. ✅ flex-1: 미리보기 영역 flex-grow=1 확인
7. ✅ 스크롤 동작: 정상 작동 확인
8. ✅ 레이아웃 안정성: 모든 viewport 크기에서 안정적

## 기술적 제약사항

### 제어 가능한 부분
- ✅ Viewport 크기 변화: CSS `min-width`, `max-width`, `flex-shrink-0`로 제어
- ✅ 레이아웃 구조: Flexbox로 메뉴바 고정, 미리보기 영역 반응형

### 제어 불가능한 부분
- ❌ 브라우저 Zoom 레벨: 브라우저가 전체 페이지를 스케일하므로 CSS로 완전 제어 불가
- ❌ OS 레벨 확대: Windows 디스플레이 스케일링 등

**참고**: 브라우저 zoom은 CSS로 제어할 수 없지만, 일반적으로 사용자는 브라우저 zoom보다는 viewport 크기 조정을 더 자주 사용합니다.

## 롤백 방법

```bash
git checkout codefreeze-20260114-cp-import-layout^
```

또는

```bash
git reset --hard 6d6a2af^
```

## 관련 문서
- `src/app/control-plan/import/page.tsx`: Import 페이지 메인 컴포넌트
- `tests/cp-import-layout.spec.ts`: 레이아웃 테스트
- `docs/CODEFREEZE_CP_IMPORT_COMPLETE_20260113.md`: 이전 코드프리즈 문서

