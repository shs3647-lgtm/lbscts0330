# DFMEA (Design FMEA) 모듈 시스템 아키텍처 및 로드맵

## 1. 개요 (Overview)
현재 성공적으로 구축/운영 중인 PFMEA(공정 FMEA) 코어 엔진을 기반으로, AIAG-VDA 1판 규격에 부합하는 완전히 독립적이면서도 유기적으로 연동되는 **DFMEA 모듈**을 신규 개발하기 위한 아키텍처 설계도입니다.

## 2. 기본 원칙 (Core Principles)
1. **SSoT (Single Source of Truth) 유지:** 기존 DB 모델을 최대한 재사용하되, 필드 확장을 통해 DFMEA와 PFMEA 데이터를 단일 스키마 내에서 효율적으로 관리한다.
2. **독립된 UI 라우팅:** 시스템 사용자의 뷰(브라우저화면)는 완벽히 분리(`pfmea/` vs `dfmea/`)하여 도메인 용어(공정 vs 설계) 혼선을 방지한다.
3. **Data Linkage (데이터 연쇄):** DFMEA의 설계적 고장형태(FM)는 추후 버튼 클릭 한 번으로 PFMEA 파이프라인으로 Import 될 수 있도록 연결점을 마련한다.

## 3. 프론트엔드 라우팅 구조 (Next.js App Router)
기존 `(fmea-core)` 하위에 `dfmea` 라우트 그룹을 생성하여 PFMEA와 대칭되는 메뉴를 구성합니다.

```text
src/app/(fmea-core)/
  ├─ pfmea/ (기존)
  └─ dfmea/ (신규)
       ├─ dashboard/     # DFMEA 전용 요약 대시보드
       ├─ library/       # 설계 표준/라이브러리 관리 (블록도, 경계도 등)
       ├─ lld/           # 설계 교훈 사례 (Design LLD)
       └─ worksheet/     # DFMEA 7단계 워크시트 (Design FMEA 7-Step)
```

## 4. 백엔드 및 컴포넌트 재사용 정책
* **트리 엔진 재사용:** L1-L2-L3 노드 렌더링 로직(`React Flow` 또는 커스텀 트리)은 로직만 분리해 재사용.
* **리스크 계산기:** AP(Action Priority) 계산 유틸리티는 공용 함수(`riskOptUtils.ts`)를 공유하되, **S, O, D 채점 기준표(Rating Table)** 데이터는 설계(DFMEA) 전용 마스터 테이블을 바라보게 분리.

## 5. 단계별 개발 로드맵
* **Phase 1:** DB 스키마 설계 및 Prisma 마이그레이션 (`schema.prisma` 확장)
* **Phase 2:** 사이드바 메뉴 연동 및 DFMEA 라우트/페이지 껍데기 생성
* **Phase 3:** DFMEA 엑셀 Import/Export 파서 엔진 개발
* **Phase 4:** 7단계 워크시트 프론트엔드 구현 및 DB 연동
* **Phase 5:** DFMEA ➔ PFMEA 전환(Import) 기능 구현
