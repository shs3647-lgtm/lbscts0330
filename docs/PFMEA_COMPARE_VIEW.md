# PFMEA 좌우 비교 뷰

**URL:** `/pfmea/compare?left=<fmeaId>&right=<fmeaId>&tab=<tabId>`

## 개요

- Master(좌)와 작업 대상 FMEA(우)를 **50:50 분할**(드래그로 20~80%)로 동시에 표시한다.
- 구현은 **두 개의 iframe**으로 각각 `/pfmea/worksheet`를 로드한다. (프로젝트는 Handsontable이 아닌 HTML `<table>` 워크시트 사용)
- 쿼리: `compareEmbed=1`, `compareSide=left|right`, 좌측만 `readonly=1`.

## 동기화

| 항목 | 방식 |
|------|------|
| 탭 | 부모 `CompareTabBar`가 URL `tab` 갱신 → iframe `src` 재로드 |
| 세로 스크롤 | 자식 `onScroll` → `postMessage({ type: 'pfmea-compare-scroll', scrollTop, source })` → 부모 `useCompareScrollSync`가 상대 iframe의 `#worksheet-scroll-container` 또는 `#all-tab-scroll-wrapper`에 `scrollTop` 적용 |
| 좌측 읽기 전용 | `#fmea-worksheet-container.compare-worksheet-readonly` + `globals.css`에서 스크롤 영역만 `pointer-events` 허용 |

## 기본값

- `left` 미지정 시 `DEFAULT_COMPARE_MASTER_FMEA_ID` (`compare/constants.ts`)
- `tab`은 `COMPARE_SYNC_TAB_IDS`에 없으면 `structure`로 정규화 (`normalizeCompareTab`)

## 진입

- 일반 워크시트 우상단 **「비교 뷰」** → `left=DEFAULT_COMPARE_MASTER_FMEA_ID`, `right=현재 FMEA`, `tab=normalizeCompareTab(현재 탭)`

## 제한

- 뷰포트 너비 &lt; 900px 시 비교 페이지에서 안내 문구만 표시.
- 차이 하이라이트(공정번호 매칭)는 미구현(중기 옵션).

**최종 업데이트:** 2026-03-23
