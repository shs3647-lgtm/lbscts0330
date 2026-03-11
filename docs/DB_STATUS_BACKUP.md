# FMEA DB 상태 백업
> 생성일시: 2026-01-11
> 코드프리즈 태그: codefreeze-20260111-db-structure-redesign

## fmeaId별 데이터 현황

### PFM26-M001 (Master FMEA)

| 테이블 | 데이터 수 | 설명 |
|--------|-----------|------|
| fmea_projects | 1건 | 프로젝트 기본 정보 |
| fmea_registrations | 1건 | 등록 정보 (1단계) |
| fmea_cft_members | 5건 | CFT 멤버 |
| fmea_worksheet_data | 1건 | 워크시트 JSON |
| fmea_confirmed_states | 1건 | 확정 상태 |
| failure_causes | 6건 | 고장원인 (FC) |
| failure_modes | 6건 | 고장형태 (FM) |
| failure_effects | 4건 | 고장영향 (FE) |
| failure_links | 47건 | 고장연결 |
| l1_structures | 1건 | 완제품 구조 |
| l2_structures | 2건 | 메인공정 구조 |
| l3_structures | 4건 | 작업요소 구조 |
| l1_functions | 3건 | 완제품 기능 |
| l2_functions | 4건 | 메인공정 기능 |
| l3_functions | 4건 | 작업요소 기능 |

## 등록된 프로젝트

| FMEA ID | Type | Subject |
|---------|------|---------|
| PFM26-M001 | M (Master) | 타이어 제조공정 PFMEA |

## DB 스키마 구조

```
public/
├── fmea_projects        ← 프로젝트 기본 (fmeaId, fmeaType, status)
├── fmea_registrations   ← 등록정보 (회사명, 고객사, FMEA명)
├── fmea_cft_members     ← CFT 멤버 (역할, 이름, 부서)
├── fmea_worksheet_data  ← 워크시트 JSON
├── fmea_confirmed_states← 확정 상태
├── fmea_legacy_data     ← 레거시 (하위호환)
├── l[1-3]_structures    ← 구조분석
├── l[1-3]_functions     ← 기능분석
├── failure_*            ← 고장분석
└── ...
```

## 데이터 관리 방식

- **스키마**: public 스키마만 사용
- **프로젝트 구분**: 각 테이블의 `fmeaId` 컬럼으로 분리
- **FK 관계**: fmea_projects.fmeaId를 기준으로 연결
