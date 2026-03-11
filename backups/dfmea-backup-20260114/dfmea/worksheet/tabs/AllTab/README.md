# AllTab 모듈 구조

## 📁 디렉토리 구조
```
AllTab/
├── index.tsx              # 메인 컴포넌트 (재export)
├── AllTabRenderer.tsx     # 렌더러 로직 (< 300줄)
├── AllTabHeader.tsx       # 헤더 컴포넌트 (< 200줄)
├── AllTabRow.tsx          # 데이터 행 컴포넌트 (< 200줄)
├── AllTabStyles.ts        # 스타일 함수
├── constants.ts           # 상수 및 타입 정의
└── README.md              # 이 파일
```

## 🎯 분할 전략
1. **AllTabHeader.tsx**: 헤더 렌더링 로직
2. **AllTabRow.tsx**: 데이터 행 렌더링 로직
3. **AllTabRenderer.tsx**: 메인 렌더러 (축소)
4. **constants.ts**: 색상, 타입 정의
5. **AllTabStyles.ts**: 스타일 함수

## 📊 파일 크기 목표
- 각 파일 < 300줄
- 총합: 동일하거나 약간 증가 (타입 중복 등)
- 가독성 및 유지보수성 극대화



