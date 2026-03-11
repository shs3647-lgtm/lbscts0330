# DFMEA 등록화면 PRD (Product Requirements Document)

## 버전 정보
- **버전**: 1.0.0
- **최종 수정일**: 2026-01-24
- **작성자**: AI Assistant
- **상태**: 코드프리즈

---

## 1. 개요

### 1.1 목적
DFMEA(Design Failure Mode and Effects Analysis) 등록화면은 설계 FMEA 프로젝트 기초 정보를 등록하고 관리하는 화면입니다.

### 1.2 범위
- DFMEA 프로젝트 기초정보 등록
- CFT(Cross Functional Team) 멤버 관리
- 상위 APQP 연결
- 상위 DFMEA 계층 구조 관리

---

## 2. 화면 구성

### 2.1 레이아웃
- **FixedLayout** 사용 (showSidebar=true, contentPadding="px-1 py-2")
- **TopNav**: DFMEATopNav 컴포넌트
- **사이드바**: 48px 고정
- **구분선**: 5px

### 2.2 주요 섹션
1. **기획 및 준비 (1단계)** - 기본정보 테이블
2. **FMEA 기초 정보등록** - Master/Family/Part 선택
3. **CFT 리스트** - 팀원 등록 테이블
4. **CFT 접속 로그** - 활동 기록

---

## 3. 데이터 구조

### 3.1 FMEAInfo 인터페이스
```typescript
interface FMEAInfo {
  companyName: string;
  engineeringLocation: string;
  customerName: string;
  modelYear: string;
  subject: string;
  fmeaStartDate: string;
  fmeaRevisionDate: string;
  fmeaId: string;
  fmeaType: 'M' | 'F' | 'P';
  designResponsibility: string;
  confidentialityLevel: string;
  fmeaResponsibleName: string;
}
```

### 3.2 ID 생성 규칙
- **Master**: `dfm{년도}-m{순번}` (예: dfm26-m001)
- **Family**: `dfm{년도}-f{순번}` (예: dfm26-f001)
- **Part**: `dfm{년도}-p{순번}` (예: dfm26-p001)

---

## 4. 기능 명세

### 4.1 저장 기능
- localStorage 기반 임시 저장
- 변경 이력 기록 (recordChangeHistory)
- 자동 임시 저장

### 4.2 모달 기능
- DatePickerModal: 날짜 선택
- BizInfoSelectModal: 사업정보 선택
- UserSelectModal: 사용자 선택
- ApqpSelectModal: APQP 연결

### 4.3 연계 기능
- 상위 APQP 선택
- 상위 DFMEA 선택 (M/F/P)

---

## 5. PFMEA vs DFMEA 차이점

| 항목 | PFMEA | DFMEA |
|------|-------|-------|
| 책임 필드명 | 공정 책임 | 설계 책임 |
| ID 접두어 | pfm | dfm |
| 테마 색상 | #00587a | #00587a |
| AI 예측 | 지원 | 미지원 (추후 추가) |

---

## 6. 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0.0 | 2026-01-24 | CP 구조 기반 수평전개 완료 (1897줄 → 575줄) |

---

## 7. 코드프리즈

### 7.1 완료된 기능
- [x] FixedLayout 적용
- [x] DatePickerModal 통합
- [x] 변경 이력 기록
- [x] 자동 임시 저장
- [x] 상위 연결 (APQP, DFMEA)
- [x] layout.tsx 충돌 해결
- [x] 코드 최적화 (70% 감소)

### 7.2 코드프리즈 선언
```
★★★ UI/UX 코드프리즈 - 2026-01-24 ★★★
- 등록화면 레이아웃 확정
- 추가 기능 개발 시 별도 브랜치에서 진행
```
