/**
 * @file 등록화면-종합점검-TODO.md
 * @description APQP/PFMEA/CP/PFD 등록화면 종합 점검 및 표준화 계획
 * @created 2026-01-29
 * @updated 2026-01-29 - Phase 2 표준화 작업 완료
 */

# 📋 등록화면 종합 점검 및 표준화 - 완료 ✅

## 🎯 표준화 원칙

> **PFMEA 등록화면을 표준으로 삼아 모든 모듈을 통일한다**

---

## 1. PFMEA 기본정보 테이블 (표준)

### 1.1 레이아웃 구조 (4행 × 8컬럼)

| 컬럼1 | 컬럼2 | 컬럼3 | 컬럼4 | 컬럼5 | 컬럼6 | 컬럼7 | 컬럼8 |
|-------|-------|-------|-------|-------|-------|-------|-------|
| **유형** | (M/F/P) | **문서명** | (입력) | **문서 ID** | (표시) | **상위 APQP** | (버튼+ID) |
| **공정 책임** | (입력) | **담당자** | (입력+검색) | **시작 일자** | (날짜선택) | **상위 FMEA** | (버튼+ID) |
| **고객 명** | (입력+검색) | **목표완료일** | (날짜선택) | **회사 명** | (입력) | **연동 PFD** | (버튼+ID) |
| **모델 연식** | (입력) | **엔지니어링 위치** | (입력) | **상호기능팀** | (CFT 표시) | **연동 CP** | (버튼+ID) |

### 1.2 표준 필드명 (통일 완료)

| 필드 | 표준명 | 상태 |
|------|--------|------|
| 완료일 | **목표완료일** | ✅ 완료 |
| FMEA 연동 | **연동 FMEA** | ✅ 완료 |
| CP 연동 | **연동 CP** | ✅ 완료 |
| PFD 연동 | **연동 PFD** | ✅ 완료 |
| CP 종류 | **CP 종류** (Prototype/Pre-Launch/Production/Safe Launch) | ✅ 완료 |

---

## 2. 표준화 완료 항목

### 2.1 Phase 1: 버튼 표준화 ✅ 완료

- [x] 모든 모듈 헤더 버튼 통일: 새로 작성 + 편집 + 저장
- [x] 저장 버튼 색상 통일: `bg-blue-600`
- [x] 새로고침 버튼 제거

### 2.2 Phase 2: 기본정보 테이블 표준화 ✅ 완료

- [x] **시작 일자**: 모든 모듈에 이미 존재 (확인 완료)
- [x] **목표완료일 명칭 통일**: "개정 일자", "목표 완료일" → **"목표완료일"**
- [x] **PFD 기밀수준 드롭다운**: "기밀유지 수준" → **"CP 종류"** 레이블 변경
- [x] **CP 종류 드롭다운**: Prototype/Pre-Launch/Production/Safe Launch 표시
- [x] **CFT 테이블 표준화**: 모든 모듈에서 CFTRegistrationTable 컴포넌트 사용

### 2.3 Phase 3: 연동 필드 표준화 ✅ 완료

- [x] **APQP 연동 필드 레이블**: 하위 FMEA/CP/PFD → **연동 FMEA/CP/PFD**
- [x] **APQP 연동 필드 헤더 색상**: 표준 색상 적용 (노란색/청록색/보라색)
- [x] **모든 연동 버튼 무조건 이동**: 아이콘 클릭 시 조건 없이 해당 등록화면으로 이동
  - APQP: 연동 FMEA, 연동 CP, 연동 PFD
  - PFMEA: 상위 APQP, 상위 FMEA, 연동 PFD, 연동 CP
  - CP: 상위 APQP, 상위 FMEA, 연동 PFD
  - PFD: 상위 APQP, 상위 FMEA, 연동 CP

---

## 3. 연동 필드 헤더 색상 표준

| 연동 대상 | 헤더 배경색 | Tailwind 클래스 |
|-----------|-------------|-----------------|
| APQP | 초록색 | `bg-green-600` |
| FMEA | 노란색 | `bg-yellow-600` |
| PFD | 보라색 | `bg-violet-600` |
| CP | 청록색 | `bg-teal-600` |

---

## 4. 표준 UI 패턴 (최종)

### 4.1 연동 문서 셀 (표준)

```tsx
{/* 표준 패턴 - 연동 문서 셀 */}
<td className={`${headerCell} bg-{color}-600`}>연동 {MODULE}</td>
<td className={inputCell}>
  <div className="flex items-center gap-2 px-2">
    <span
      className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-{color}-500 cursor-pointer hover:bg-{color}-600"
      onClick={() => router.push(linkedId ? `/module/register?id=${linkedId}` : '/module/register')}
      title="모듈 등록화면으로 이동"
    >{LABEL}</span>
    <span
      className="text-xs font-semibold text-{color}-600 cursor-pointer hover:underline"
      onClick={() => openModal()}
      title="선택/관리"
    >{linkedId || '-'}</span>
  </div>
</td>
```

### 4.2 날짜 필드 (표준)

| 필드명 | 용도 | 상태 |
|--------|------|------|
| **시작 일자** | 프로젝트 시작일 | ✅ 모든 모듈 적용 |
| **목표완료일** | 목표 완료 날짜 | ✅ 모든 모듈 통일 |

### 4.3 CP 종류 드롭다운 (표준)

```tsx
<select>
  <option value="">선택</option>
  <option value="Prototype">Prototype</option>
  <option value="Pre-Launch">Pre-Launch</option>
  <option value="Production">Production</option>
  <option value="Safe Launch">Safe Launch</option>
</select>
```

---

## 5. 변경된 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/app/apqp/register/page.tsx` | 목표완료일 레이블, 연동 FMEA/CP/PFD 레이블 및 색상, 아이콘 무조건 이동 |
| `src/app/pfmea/register/components/PfmeaBasicInfoTable.tsx` | 목표완료일 레이블, 아이콘 무조건 이동 |
| `src/app/control-plan/register/page.tsx` | 목표완료일 레이블, 아이콘 무조건 이동 |
| `src/app/pfd/register/components/PfdBasicInfoTable.tsx` | 목표완료일 레이블, CP 종류 레이블, 아이콘 무조건 이동 |

---

## 6. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-29 | 1.0 | 초기 문서 작성, Phase 1 완료 |
| 2026-01-29 | 2.0 | Phase 2, Phase 3 표준화 작업 완료 |
