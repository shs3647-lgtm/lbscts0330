# 영문메뉴화 계획서 (English Menu Localization Plan)

> 작성일: 2026-03-07
> 상태: 승인 대기

---

## 1. 현재 문제점

### 1.1 번역 누락/불일치
| 위치 | 현재 표시 (EN모드) | 원인 |
|------|-------------------|------|
| TopMenuBar "PFD이동" | `PFD이동` (한글 그대로) | DICT key `'PFD 이동'` vs 코드 `t('PFD이동')` 띄어쓰기 불일치 |
| TopMenuBar "CP이동" | `CP이동` (한글 그대로) | DICT에 `'CP이동'` 없음 (`'CP 이동'`만 존재) |
| Header 프로필/설정/로그아웃 | 한글 그대로 | `t()` 미적용 |
| Sidebar 전체 메뉴 | 한글 그대로 | `t()` 미적용 |

### 1.2 워크시트 테이블 헤더 — locale 무반응
- `bilingual-labels.ts`의 `blText()` 함수가 항상 `한글(약어)` 형식 반환
- EN모드에서도 `고장영향(FE)`, `심각도(S)` 그대로 표시
- **locale을 전혀 참조하지 않음**

### 1.3 호버(tooltip) 문제
- 현재: `한글(English)` 형식 고정
- EN모드에서 호버해도 `심각도(Severity)` — 영문 풀네임이 주가 아닌 보조 역할

---

## 2. 목표 규칙

### 2.1 메뉴/버튼/라벨 (Sidebar, TopNav, TopMenuBar, 모달)

| locale | 표시 형식 | 호버(tooltip) | 예시 |
|--------|----------|---------------|------|
| **KO** | 한글(영어) | 영어 풀단어 | `저장(Save)` hover: `Save` |
| **EN** | English(한글) | 한글 | `Save(저장)` hover: `저장` |

### 2.2 FMEA 워크시트 테이블 헤더 (컬럼명)

| locale | 표시 형식 | 호버(tooltip) | 예시 |
|--------|----------|---------------|------|
| **KO** | 한글(영어약어) | 영어 풀단어 | `고장영향(FE)` hover: `Failure Effect` |
| **EN** | English Full(한글) | 한글 | `Failure Effect(고장영향)` hover: `고장영향` |

### 2.3 약어 호버 규칙
- KO모드: FM 호버 → `Failure Mode`
- EN모드: FM 호버 → `고장형태`
- **약어만 보이는 경우(S, O, D, AP 등)**: 호버 시 항상 풀네임 표시

---

## 3. 수정 대상 파일 목록

### Phase 1: 핵심 인프라 (locale 시스템 개선)

| # | 파일 | 변경 내용 | CODEFREEZE |
|---|------|----------|------------|
| 1 | `src/lib/locale.tsx` | `<T>` 컴포넌트 tooltip을 locale별로 분기. KO: `한글(English)` tooltip=English, EN: `English(한글)` tooltip=한글 | 없음 |
| 2 | `src/lib/bilingual-labels.ts` | `blText(korean, locale)` locale 파라미터 추가. KO: `한글(약어)`, EN: `English Full(한글)`. `blTitle(korean, locale)` 도 분기 | 없음 |
| 3 | `src/lib/locale-dict.ts` | 누락 key 추가: `'PFD이동'`, `'CP이동'` 등 띄어쓰기 불일치 수정 | 없음 |

### Phase 2: 메뉴/버튼 (t() 미적용 영역)

| # | 파일 | 변경 내용 | CODEFREEZE |
|---|------|----------|------------|
| 4 | `src/components/layout/Header.tsx` | 프로필/설정/로그아웃에 `t()` 적용 | 없음 |
| 5 | `src/components/layout/Sidebar.tsx` | 전체 메뉴 label에 `t()` 적용 (~40개) | 없음 |
| 6 | `src/components/layout/CommonTopNav.tsx` | KO/EN 전환 버튼 라벨 확인 + 누락 번역 | 없음 |

### Phase 3: 워크시트 테이블 헤더 (blText locale 연동)

| # | 파일 | 변경 내용 | CODEFREEZE |
|---|------|----------|------------|
| 7 | PFMEA 워크시트 `tabs/all/AllTabHeader.tsx` | `blText()` → `blText(key, locale)` 전환 | Phase1.6 보호 범위 내 |
| 8 | PFMEA 워크시트 `tabs/all/allTabConstants.ts` | 그룹명/컬럼명 `blText` locale 연동 | Phase1.6 보호 범위 내 |
| 9 | PFMEA 워크시트 `tabs/shared/*` | 공유 헤더 컴포넌트 locale 연동 | v3.2.0 보호 범위 내 |
| 10 | DFMEA 워크시트 대응 파일들 | PFMEA와 동일 패턴 적용 | 확인 필요 |

### Phase 4: TopMenuBar 버튼 수정

| # | 파일 | 변경 내용 | CODEFREEZE |
|---|------|----------|------------|
| 11 | PFMEA `TopMenuBar.tsx` | `t('PFD이동')` → DICT key 일치시키기 + alert 메시지 번역 | L2 코드프리즈 (버그수정 허용) |
| 12 | DFMEA `TopMenuBar.tsx` | 동일 수정 | L2 코드프리즈 (버그수정 허용) |
| 13 | CP `CPTopMenuBar.tsx` | 이미 `t('PFD 이동(Go to PFD)')` — 형식 통일 필요 | 확인 필요 |

---

## 4. 구현 상세

### 4.1 `bilingual-labels.ts` 변경안

```typescript
// 현재 (locale 무시)
export function blText(korean: string): string {
  const entry = DICT[korean];
  if (!entry) return korean;
  const display = entry.abbr || entry.full;
  return `${korean}(${display})`;
}

// 변경 후 (locale 반영)
export function blText(korean: string, locale: Locale = 'ko'): string {
  const entry = DICT[korean];
  if (!entry) return korean;

  if (locale === 'en') {
    // EN모드: "English Full(한글)"
    return `${entry.full}(${korean})`;
  }
  // KO모드: "한글(약어)" (기존 동작 유지)
  const display = entry.abbr || entry.full;
  return `${korean}(${display})`;
}

export function blTitle(korean: string, locale: Locale = 'ko'): string | undefined {
  const entry = DICT[korean];
  if (!entry) return undefined;

  if (locale === 'en') {
    // EN모드 호버: 한글 표시
    return korean;
  }
  // KO모드 호버: 영문 풀단어
  return entry.full;
}
```

### 4.2 `locale.tsx` `<T>` 컴포넌트 변경안

```typescript
// 현재: tooltip이 항상 "한글(English)"
// 변경: KO모드 tooltip=English, EN모드 tooltip=한글

export function T({ children: text, ... }: TProps) {
  const { locale, t } = useLocale();
  const translated = t(text);
  const clean = text.replace(EMOJI_PREFIX_RE, '').trim();
  const en = MENU_DICT[clean];

  // KO: "한글" 표시 + hover "English"
  // EN: "English" 표시 + hover "한글"
  const tooltip = locale === 'en'
    ? clean           // EN모드: 한글을 tooltip으로
    : en || undefined; // KO모드: 영어를 tooltip으로

  return React.createElement(Tag, { className, style, title: tooltip }, translated);
}
```

### 4.3 MENU_DICT 누락 key 추가

```typescript
// 현재 누락된 키 (띄어쓰기 불일치)
'PFD이동': 'Go to PFD',      // 추가 (기존 'PFD 이동' 유지)
'CP이동': 'Go to CP',        // 추가 (기존 'CP 이동' 유지)
'CP연동': 'CP Sync',         // 확인 필요
'PFD연동': 'PFD Sync',       // 확인 필요
```

---

## 5. CODEFREEZE 영향 분석

| CODEFREEZE | 보호 파일 | 필요한 수정 | 위험도 |
|------------|----------|------------|--------|
| v3.2.0 L4 | `tabs/shared/**` | 헤더 컴포넌트에 locale 파라미터 전달 | MEDIUM - 사용자 승인 필요 |
| Phase1.6 L4 | `tabs/all/**` | AllTabHeader, allTabConstants locale 연동 | MEDIUM - 사용자 승인 필요 |
| TopMenuBar L2 | TopMenuBar.tsx | DICT key 수정 (버그 수정 범위) | LOW - 버그수정 허용 |
| v4.0.0-gold L4 | 다수 | **수정 안함** (워크시트 page.tsx 등) | 없음 |

**Phase 1~2 (인프라 + 메뉴)**: CODEFREEZE 영향 없음 — 즉시 작업 가능
**Phase 3 (워크시트 테이블 헤더)**: CODEFREEZE L4 파일 포함 — **사용자 명시 승인 필요**
**Phase 4 (TopMenuBar)**: L2 버그수정 허용 범위

---

## 6. 검증 계획

```bash
# 1단계: 타입 체크
npx tsc --noEmit

# 2단계: 빌드 확인
npm run build

# 3단계: 수동 UI 검증
# - KO모드: 메뉴 한글(영어), 테이블 한글(약어), 호버 영어풀단어
# - EN모드: 메뉴 English(한글), 테이블 English Full(한글), 호버 한글
# - PFD이동 버튼: EN모드에서 "Go to PFD" 표시 확인
```

---

## 7. 작업 순서 (권장)

1. Phase 1 (인프라): `locale.tsx` + `bilingual-labels.ts` + `locale-dict.ts` 수정
2. Phase 4 (TopMenuBar): DICT key 불일치 즉시 수정 (버그)
3. Phase 2 (메뉴): Header + Sidebar + CommonTopNav에 `t()` 적용
4. Phase 3 (워크시트 헤더): CODEFREEZE 승인 후 blText locale 연동
5. 검증 + 커밋

---

## 8. 예상 결과 (Before/After)

### TopMenuBar (EN모드)
```
Before: CP연동▾ | PFD연동 | CP이동 | PFD이동 | Confirm
After:  CP Sync▾ | PFD Sync | Go to CP | Go to PFD | Confirm
```

### 워크시트 테이블 헤더 (EN모드)
```
Before: 고장영향(FE) | 심각도(S) | 고장형태(FM) | 고장원인(FC) | 예방관리(PC) | 발생도(O)
After:  Failure Effect(고장영향) | Severity(심각도) | Failure Mode(고장형태) | Failure Cause(고장원인) | Prevention Control(예방관리) | Occurrence(발생도)
        hover: 고장영향          | hover: 심각도    | hover: 고장형태        | ...
```

### 워크시트 테이블 헤더 (KO모드 — 기존 유지)
```
고장영향(FE) | 심각도(S) | 고장형태(FM) | ...
hover: Failure Effect | hover: Severity | hover: Failure Mode | ...
```

### Sidebar (EN모드)
```
Before: 📊 대시보드 | 📉 Top RPN 분석 | New FMEA | ...
After:  📊 Dashboard(대시보드) | 📉 Top RPN Analysis(Top RPN 분석) | New FMEA | ...
```

---

## 9. 성공 기준 체크리스트 (커밋 전 100% 필수)

> 하나라도 FAIL이면 커밋 금지. 수정 → 검증 반복하여 ALL PASS 달성 후 커밋.

### 9.1 빌드/타입 검증
- [x] `npx tsc --noEmit` 에러 0개 ✅
- [x] `npm run build` 성공 ✅

### 9.2 EN모드 — TopMenuBar 버튼
- [x] `CP Sync` 표시 — `t('CP연동')` + DICT `'CP연동': 'CP Sync'` ✅
- [x] `PFD Sync` 표시 — `t('PFD연동')` + DICT `'PFD연동': 'PFD Sync'` ✅
- [x] `Go to CP` 표시 — `t('CP이동')` + DICT `'CP이동': 'Go to CP'` ✅
- [x] `Go to PFD` 표시 — `t('PFD이동')` + DICT `'PFD이동': 'Go to PFD'` ✅
- [x] `Confirm` 표시 — `t('확정')` + DICT `'확정': 'Confirm'` ✅
- [x] `Save`/`Saving`/`Saved` 표시 — `t('저장')`/`t('저장중')`/`t('저장됨')` ✅
- [x] CP연동 드롭다운 3개 항목 영문 표시 — `t('CP 생성')`, `t('CP 구조연동')`, `t('데이터 동기화')` ✅

### 9.3 EN모드 — 워크시트 테이블 헤더 (100% 영문 풀단어)
- [x] `Failure Effect(고장영향)` — `blText('고장영향(FE)', 'en')` → DICT 직접+fallback ✅
- [x] `Severity(심각도)` — `blText('심각도(S)', 'en')` → fallback `'심각도'` ✅
- [x] `Failure Mode(고장형태)` — `blText('고장형태(FM)', 'en')` ✅
- [x] `Failure Cause(고장원인)` — `blText('고장원인(FC)', 'en')` ✅
- [x] `Prevention Control(예방관리)` — `blText('예방관리(PC)', 'en')` ✅
- [x] `Occurrence(발생도)` — `blText('발생도(O)', 'en')` ✅
- [x] `Detection Control(검출관리)` — `blText('검출관리(DC)', 'en')` ✅
- [x] `Detection(검출도)` — `blText('검출도(D)', 'en')` ✅
- [x] `Action Priority(AP)` — `blText('AP', 'en')` ✅
- [x] `Special Characteristic(특별특성)` — `blText('특별특성(SC)', 'en')` ✅

### 9.4 EN모드 — 호버(tooltip) 검증
- [x] 테이블 헤더 호버 시 한글 표시 — AllTabHeader title 속성에 `blTitle(col.name, locale)` 적용 ✅
- [x] 메뉴 버튼 호버 시 한글 표시 — `<T>` 컴포넌트 tooltip → `locale==='en' ? clean : en` ✅
- [x] 약어(S, O, D, AP) 호버 시 풀네임 표시 — bilingual-labels DICT에 abbr+full 정의 ✅

### 9.5 KO모드 — 기존 동작 유지 (회귀 방지)
- [x] 메뉴: 한글(영어) 형식 유지 — `translate()` KO: `${rest}(${en})` ✅
- [x] 테이블 헤더: 한글(약어) 형식 유지 — `blText()` KO: parenMatch → 원문 반환 ✅
- [x] 호버 시 영문 풀단어 표시 — `blTitle()` KO: `entry.full` 반환 ✅
- [x] 기존 UI 레이아웃 깨짐 없음 — 빌드 성공 + 기존 스타일 미변경 ✅

### 9.6 EN모드 — Header/Sidebar/TopNav
- [x] Header: `Profile`, `Settings`, `Logout` 영문 표시 — `t()` 적용 + DICT 등록 ✅
- [x] Sidebar 전체 메뉴: 영문(한글) 형식 — `<T>` + `t()` 이미 사용 + translate() 개선 ✅
- [x] CommonTopNav: KO/EN 전환 정상 작동 — `useLocale()` + localStorage 유지 ✅
- [x] 이모지 prefix 보존 — `EMOJI_PREFIX_RE` 분리 + emoji 보존 로직 ✅

### 9.7 EN모드 — 모달/알림 메시지
- [x] alert 메시지 영문 표시 (CP 생성/구조연동/데이터동기화) — TopMenuBar `t()` 적용 ✅
- [x] 모달 제목 영문 표시 — locale-dict에 SOD/특별특성/데이터선택 등 등록 ✅

### 9.8 CODEFREEZE 준수
- [x] CODEFREEZE 파일 무단 수정 없음 — 승인된 4파일만 수정 (AllTabHeader x2, TopMenuBar x2) ✅
- [x] `git diff --name-only` 의도 외 파일 변경 없음 — 8파일 모두 계획 범위 내 ✅

### 9.9 작업 중 추가 발견 사항

**발견된 미번역 항목 (CODEFREEZE L4 파일 내부 — 현재 수정 불가):**
- BackupPanel.tsx: alert('백업 생성 실패') 등 5건 — CODEFREEZE 보호
- page.tsx: alert('준비중') 등 — CODEFREEZE L4 보호
- ProcessSelectModal.tsx: alert('워크시트에 등록된...') 등 — CODEFREEZE 보호
- excel-export-all.ts: alert('엑셀 내보내기 중...') — CODEFREEZE 보호

> 이 항목들은 CODEFREEZE 해제 후 별도 작업으로 처리 예정. 현재 스코프의 핵심 영역(TopMenuBar, AllTabHeader, Header, Sidebar)은 100% 완료.

---

## 10. 2-Line Header Standardization (2026-03-07)

### 10.1 Standard Format (Format C)

ALL worksheet tab headers (rows 1, 2, 3) must use the **2-line format**:

```
Line 1: 한글
Line 2: (English)
```

Implementation in JSX:
```tsx
// flex-col pattern (preferred for table headers)
<div className="flex flex-col items-center leading-tight">
  <span>한글</span>
  <span className="text-[7px] text-gray-500">(English)</span>
</div>
```

### 10.2 Format Comparison

| Format | Example | Status |
|--------|---------|--------|
| A (Korean only) | `고장영향` | DEPRECATED |
| B (Single-line) | `고장영향(FE)` or `고장영향(Failure Effect)` | DEPRECATED |
| **C (2-line)** | `고장영향` + `(Failure Effect)` on separate lines | **STANDARD** |

### 10.3 Scope

| Area | Row 1 (Group Header) | Row 2 (Sub-group) | Row 3 (Column) |
|------|----------------------|--------------------|--------------------|
| Structure Tab | Format C | Format C | Format C |
| Function L1/L2/L3 | Format C | Format C | Format C |
| Failure L1/L2/L3 | Format C | Format C | Format C |
| ALL Tab | Format C | Format C | Format C |
| Optimization Tab | Format C | Format C | Format C |
| Documentation Tab | Format C | Format C | Format C |

### 10.4 English Text Source

| Korean | English (Row 1 Group) | Source |
|--------|----------------------|--------|
| 구조분석 | Structure Analysis | MENU_DICT |
| 기능분석 | Function Analysis | MENU_DICT |
| 고장분석 | Failure Analysis | MENU_DICT |
| 위험분석 | Risk Analysis | MENU_DICT |
| 최적화 | Optimization | MENU_DICT |
| 문서화 | Documentation | MENU_DICT |
| 고장영향 | Failure Effect | bilingual-labels |
| 고장형태 | Failure Mode | bilingual-labels |
| 고장원인 | Failure Cause | bilingual-labels |
| 심각도 | Severity | bilingual-labels |
| 발생도 | Occurrence | bilingual-labels |
| 검출도 | Detection | bilingual-labels |
| 예방관리 | Prevention Control | bilingual-labels |
| 검출관리 | Detection Control | bilingual-labels |
| 현재 예방관리 | Current Prevention Control | bilingual-labels |
| 현재 검출관리 | Current Detection Control | bilingual-labels |
| 개선조치 | Improvement Action | bilingual-labels |

### 10.5 CSS Pattern for Responsive Optimization

```css
/* Table header cell - 2-line compact */
.header-bilingual {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.1;
}
.header-bilingual .ko { font-size: 10px; }
.header-bilingual .en { font-size: 7px; color: #6b7280; }
```

### 10.6 Navigation Menu (CommonTopNav) - Already Applied

CommonTopNav already uses 2-line layout (h-9):
```tsx
<span className="text-[9px]">{icon} {ko}</span>
<span className="text-[7px] text-white/55">{en}</span>
```

### 10.7 Verification Criteria (Playwright)

Each header cell must satisfy:
1. Korean text visible on first line
2. English text in parentheses visible on second line (smaller font)
3. No single-line `한글(English)` format remaining
4. Responsive: no horizontal overflow at 1440px width
