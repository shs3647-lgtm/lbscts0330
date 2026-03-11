/**
 * @file UI-표준화.md
 * @description APQP, PFMEA, DFMEA, PFD, CP 등록화면/리스트 UI 표준화 문서
 * @created 2026-01-29
 */

# 📐 모듈 UI 표준화 가이드

## 1. 개요

APQP, PFMEA, DFMEA, PFD, CP 모듈 간 UI 일관성을 확보하기 위한 표준화 가이드입니다.

---

## 2. 현재 상태 분석

### 2.1 등록화면 헤더 버튼 현황

| 모듈 | 새로고침 | 새로 작성 | 편집 | 저장 | 저장버튼 색상 |
|------|----------|-----------|------|------|--------------|
| **APQP** | ❌ 없음 | ✅ 녹색 | ❌ 없음 | ✅ 파랑 | `#2563eb` |
| **PFMEA** | ❌ 없음 | ✅ 녹색 | ✅ 황색 | ✅ 파랑 | `#1976d2` |
| **DFMEA** | ❌ 없음 | ✅ 녹색 | ✅ 황색 | ✅ 파랑 | `#1976d2` |
| **PFD** | ✅ 파랑 | ✅ 녹색 | ✅ 황색 | ✅ 네이비 | `#1e3a5f` |
| **CP** | ✅ 파랑 | ✅ 녹색 | ✅ 황색 | ✅ 파랑 | `#blue-600` |

### 2.2 문제점

1. **버튼 구성 불일치**: APQP는 "새로 작성 + 저장"만 있음
2. **저장 버튼 색상 불일치**: 모듈마다 다른 색상
3. **새로고침 버튼 불일치**: PFD/CP만 있음
4. **편집 버튼 불일치**: APQP에는 없음

---

## 3. 표준화 규격

### 3.1 등록화면 헤더 버튼 (공통)

| 순서 | 버튼 | 아이콘 | 색상 | 설명 |
|------|------|--------|------|------|
| 1 | 새로 작성 | ➕ | `bg-green-500` | 신규 문서 생성 |
| 2 | 편집 | ✏️ | `bg-amber-500` | 기존 문서 불러오기 |
| 3 | 저장 | 💾 | `bg-blue-600` | 현재 문서 저장 |

### 3.2 버튼 스타일 규격

```css
/* 공통 버튼 스타일 */
.btn-register {
  padding: 6px 12px;      /* px-3 py-1.5 */
  font-size: 12px;        /* text-xs */
  font-weight: 600;       /* font-semibold */
  border-radius: 4px;     /* rounded */
}

/* 새로 작성 버튼 */
.btn-new {
  background: #22c55e;    /* bg-green-500 */
  color: white;
}
.btn-new:hover {
  background: #16a34a;    /* hover:bg-green-600 */
}

/* 편집 버튼 */
.btn-edit {
  background: #f59e0b;    /* bg-amber-500 */
  color: white;
}
.btn-edit:hover {
  background: #d97706;    /* hover:bg-amber-600 */
}

/* 저장 버튼 */
.btn-save {
  background: #2563eb;    /* bg-blue-600 */
  color: white;
  font-weight: 700;       /* font-bold */
  padding: 6px 16px;      /* px-4 py-1.5 */
}
.btn-save:hover {
  background: #1d4ed8;    /* hover:bg-blue-700 */
}

/* 저장 완료 상태 */
.btn-save-success {
  background: #22c55e;    /* bg-green-500 */
}

/* 저장 중 상태 */
.btn-save-loading {
  background: #d1d5db;    /* bg-gray-300 */
  color: #6b7280;         /* text-gray-500 */
}
```

### 3.3 표준 JSX 코드

```tsx
{/* 등록화면 헤더 버튼 - 표준 */}
<div className="flex gap-2">
  <button 
    onClick={handleNewRegister} 
    className="px-3 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 font-semibold"
  >
    ➕ 새로 작성
  </button>
  <button 
    onClick={() => openSelectModal('LOAD')} 
    className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 font-semibold"
  >
    ✏️ 편집
  </button>
  <button 
    onClick={handleSave} 
    disabled={saveStatus === 'saving'} 
    className={`px-4 py-1.5 text-xs font-bold rounded ${
      saveStatus === 'saving' 
        ? 'bg-gray-300 text-gray-500' 
        : saveStatus === 'saved' 
          ? 'bg-green-500 text-white' 
          : 'bg-blue-600 text-white hover:bg-blue-700'
    }`}
  >
    {saveStatus === 'saving' ? '⏳ 저장 중...' : saveStatus === 'saved' ? '✓ 저장됨' : '💾 저장'}
  </button>
</div>
```

---

## 4. 모듈별 고유 컬럼

### 4.1 등록화면 기본정보 테이블

| 필드 | APQP | PFMEA | DFMEA | PFD | CP |
|------|------|-------|-------|-----|-----|
| 유형 (M/F/P) | 개발레벨 | FMEA 유형 | FMEA 유형 | PFD 유형 | CP 유형 |
| 문서명 | APQP명 | FMEA명 | FMEA명 | PFD명 | CP명 |
| 문서 ID | APQP ID | FMEA ID | FMEA ID | PFD ID | CP ID |
| 책임 | - | 공정 책임 | 설계 책임 | 공정 책임 | 공정 책임 |
| 담당자 | 담당자 | FMEA 담당자 | FMEA 담당자 | PFD 담당자 | CP 담당자 |
| 상위 APQP | - | ✅ | ✅ | ✅ | ✅ |
| 상위 FMEA | - | ✅ | ✅ | ✅ | ✅ |
| 상위 CP | - | - | - | - | ✅ |
| 연동 PFD | - | ✅ | - | - | ✅ |
| 연동 CP | - | ✅ | - | ✅ | - |

### 4.2 공통 필드

- 회사명, 고객명, 모델 연식
- 시작일자, 목표 완료일
- 상호기능팀 (CFT)
- 기밀수준/기밀유지 수준

---

## 5. 리스트 페이지 표준

### 5.1 액션 바 구성

| 요소 | 설명 |
|------|------|
| 검색 입력 | 문서명, 고객사 검색 |
| 새로고침 | 데이터 새로고침 |
| 저장 | 변경사항 저장 |
| 수정 | 선택 항목 수정 (1개만) |
| 삭제 | 선택 항목 삭제 |
| 등록 | 새 문서 등록 |

### 5.2 테이블 헤더 색상

| 모듈 | 헤더 배경색 |
|------|-------------|
| APQP | `#2563eb` (blue-600) |
| PFMEA | `#1976d2` (blue-700) |
| DFMEA | `#1976d2` (blue-700) |
| PFD | `#1e3a5f` (navy) |
| CP | `#00587a` (teal-dark) |

---

## 6. 작업 목록

### 6.1 Phase 1: 등록화면 버튼 표준화 ✅ 완료

- [x] APQP 등록화면에 "편집" 버튼 추가
- [x] APQP 저장 버튼 색상 `bg-blue-600` 통일
- [x] PFD 저장 버튼 색상 `bg-blue-600` 통일
- [x] PFMEA 저장 버튼 색상 `bg-blue-600` 통일
- [x] DFMEA 저장 버튼 색상 `bg-blue-600` 통일
- [x] CP/PFD 새로고침 버튼 제거 (불필요)

### 6.2 Phase 2: 리스트 페이지 표준화

- [ ] 액션 바 컴포넌트 공통화 (ListActionBar)
- [ ] 테이블 스타일 통일
- [ ] 작성일 표시 통일 (최근 수정일만)

### 6.3 Phase 3: 모달 표준화

- [ ] 선택 모달 스타일 통일
- [ ] LinkageModal 전 모듈 적용

---

## 7. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-29 | 1.0 | 초기 문서 작성 |

