# PFMEA 좌우 비교 뷰

**URL:** `/pfmea/compare?left=<fmeaId>&right=<fmeaId>&tab=<tabId>`

## 개요

- Master(좌)와 작업 대상 FMEA(우)를 **50:50 분할**(드래그로 20~80%)로 동시에 표시한다.
- 구현은 **두 개의 iframe**으로 각각 `/pfmea/worksheet`를 로드한다. (프로젝트는 Handsontable이 아닌 HTML `<table>` 워크시트 사용)
- 쿼리: `compareEmbed=1`, `compareSide=left|right`, 좌측만 `readonly=1`.

## 동기화

| 항목 | 방식 |
|------|------|
| 탭 | 부모 `CompareTabBar`가 URL `tab` 갱신 → iframe `src` 재로드. **iframe 내부**는 `compareEmbed=1`일 때 **URL `tab`만** 적용 — `useWorksheetDataLoader` / 초기 hydration에서 FMEA별 `localStorage` 탭을 쓰면 좌우 불일치 발생하므로 사용하지 않음. |
| 세로 스크롤 | `postMessage`에 **`scrollRatio`(0~1)** + `scrollTop` — 탭마다 실제 스크롤이 `#worksheet-scroll-container`가 아니라 **중첩 `overflow-auto`** 인 경우가 있어, 워크시트에서 **`document` 캡처 단계 `scroll` 리스너**로 보고. 부모 `useCompareScrollSync`는 상대 문서의 `findPrimaryScrollEl`에 비율 적용. |
| 읽기 전용(좌) | `globals.css`: 중첩 `.overflow-auto` 등에 `pointer-events: auto !important` — 휠/스크롤바가 동작하도록 함. |
| 상단 크롬 | 비교 페이지 1행은 워크시트 **TopMenuBar와 동일 인디고 그라데이션**, `CompareTabBar`는 **TabMenu**와 동일 톤(`h-9`, indigo, 활성 탭 노란 테두리). 배경 `#f5f7fb` (= `COLORS.bg`). |
| 좌측 읽기 전용 | `#fmea-worksheet-container.compare-worksheet-readonly` + `globals.css`에서 스크롤 영역만 `pointer-events` 허용 |

## 기본값

- `left` 미지정 시 `DEFAULT_COMPARE_MASTER_FMEA_ID` (`compare/constants.ts`)
- `tab`은 `COMPARE_SYNC_TAB_IDS`에 없으면 `structure`로 정규화 (`normalizeCompareTab`)

## 편집 / 저장 (iframe)

- 비교 모드에서는 일반 워크시트 **TopMenuBar가 숨겨져** 저장 버튼이 없었음 → `compareEmbed=1`일 때 **`CompareEmbedToolbar`** 표시.
- **우측** (`readonly` 없음): 작업 FMEA명, 수정 여부, **저장** 버튼, **Ctrl+S**.
- **좌측** (`readonly=1`): Master 읽기 전용 안내(편집 불가).

## 레이아웃

- **사이드바 + PFMEA 상단 네비**는 일반 워크시트와 동일하게 유지 (`SidebarRouter`, `PFMEATopNav`).
- **「비교 종료」**: FMEA 선택 줄 **우측**(`ml-auto`) + 하단 푸터(중복으로 항상 보이게). 우측 FMEA가 있으면 해당 워크시트로, 없으면 리스트로 이동.
- 좁은 화면(&lt;900px) 안내 화면에도 **비교 종료** 버튼 제공.

## 진입

- 워크시트 **탭 메뉴 줄 우측** **「비교 뷰」** → `left=DEFAULT_COMPARE_MASTER_FMEA_ID`, `right=현재 FMEA`, `tab=normalizeCompareTab(현재 탭)`

## 제한

- 뷰포트 너비 &lt; 900px 시 비교 페이지에서 안내 문구만 표시.
- 차이 하이라이트(공정번호 매칭)는 미구현(중기 옵션).

**최종 업데이트:** 2026-03-23
