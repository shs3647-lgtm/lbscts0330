# Prisma `@relation` — 프로젝트 동적 스키마 TODO

> Import 파이프라인 방어선 **작업 3**: `pfmea_{fmeaId}` 스키마가 런타임에 `CREATE SCHEMA` / `LIKE public.* INCLUDING ALL` 로 복제되는 구조라, **루트 `schema.prisma`에 FailureMode↔L2Function 등 `@relation`만 추가한 migration이 기존 프로젝트 스키마 전부에 소급 적용되는지** 별도 검증 없이는 적용하지 않는다.

## 권장 후속

1. 신규 프로젝트 스키마 생성 스크립트와 Prisma migrate 산출물이 동일 FK·인덱스를 만드는지 diff 검증.
2. `prisma migrate`를 프로젝트 스키마 단위로 적용할 배포 절차 문서화 후 `@relation` 도입.

## 상태

- **2026-04-03**: 코드·migration 미적용, 본 문서로 TODO 기록만 유지.
