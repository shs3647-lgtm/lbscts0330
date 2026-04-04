# Rule 16: API/SQL 패턴 — Prisma ORM 우선, Raw SQL snake_case 필수

> **Raw SQL에서 PascalCase 테이블명 사용 절대 금지.**
> **Prisma `@@map`으로 매핑된 snake_case 이름만 사용한다.**

---

## 원칙

1. **Prisma ORM 우선**: `$queryRawUnsafe`/`$executeRawUnsafe` 대신 Prisma API(`findMany`, `count`, `create`) 우선
2. **raw SQL 허용 조건**: 동적 스키마(`SET search_path`), `information_schema` 조회 등 Prisma 미지원 시만
3. **테이블명**: `@@map` snake_case — `fmea_projects` (O), `"FmeaProject"` (X)
4. **컬럼명**: Prisma `@map` 또는 필드명 쌍따옴표 — `"fmeaId"` (O), `fmea_id` (X)
5. **CREATE TABLE**: `LIKE public.{snake_case_table} INCLUDING ALL` (미래 컬럼 자동 상속)

## 주요 Prisma → SQL 매핑

| 코드 모델명 | SQL 테이블명 | 주의 컬럼 |
|-------------|-------------|----------|
| `FmeaLegacyData` | `fmea_legacy_data` | `data` (not `legacyData`) |
| `FailureMode` | `failure_modes` | `mode` (not `name`) |
| `RiskAnalysis` | `risk_analyses` | |
| `FmeaConfirmedState` | `fmea_confirmed_states` | |
| `CpMasterFlatItem` | `cp_master_flat_items` | `cpNo` 없음 (datasets에) |
| `L2Structure` | `l2_structures` | |
| `L3Structure` | `l3_structures` | |
| `FailureLink` | `failure_links` | |
| `FailureCause` | `failure_causes` | |
| `FailureEffect` | `failure_effects` | |

## 코드 예시

```typescript
// ❌ 금지
await pool.query('SELECT "legacyData" FROM "FmeaLegacyData"');

// ✅ 필수
await pool.query('SELECT data FROM fmea_legacy_data WHERE "fmeaId" = $1', [id]);
```

## 프로젝트 스키마 Raw SQL 패턴

```typescript
// 스키마 설정
await prisma.$executeRawUnsafe(`SET search_path TO "${schema}", public`);

// 테이블 생성 (snake_case)
await prisma.$executeRawUnsafe(
  `CREATE TABLE IF NOT EXISTS "${schema}".l2_structures (LIKE public.l2_structures INCLUDING ALL)`
);

// 데이터 조회
const rows = await prisma.$queryRawUnsafe(
  `SELECT "fmeaId", "processNo" FROM "${schema}".l2_structures WHERE "fmeaId" = $1`, fmeaId
);
```

## CP/PFD 라우트 주의사항

- `cpNo`는 `cp_master_datasets`에만 존재
- `cp_master_flat_items` 조회 시 관계(`dataset: { cpNo }`) 사용 필수

## 새 API 라우트 작성 시 필수 패턴

```typescript
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    const fmeaId = req.nextUrl.searchParams.get('fmeaId');
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ error: 'Invalid fmeaId' }, { status: 400 });
    }

    // 프로젝트 스키마 사용
    const schema = getProjectSchemaName(fmeaId);
    const prisma = getPrismaForSchema(schema);

    const data = await prisma.l2Structure.findMany({ where: { fmeaId } });
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=60' } // 참조 데이터
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
```

## 과거 실패 사례

| 사고 | 원인 | 교훈 |
|------|------|------|
| PascalCase 테이블 조회 → 0건 반환 | PostgreSQL은 대소문자 구분 (따옴표 시) | `@@map` snake_case만 사용 |
| `"legacyData"` 컬럼 조회 실패 | 실제 DB 컬럼명은 `data` | Prisma `@map` 확인 후 사용 |
| `cpNo` 직접 JOIN 실패 | `cp_master_flat_items`에 `cpNo` 없음 | 관계 테이블 경유 |
| public에 Atomic 데이터 저장 | `getPrisma()` 사용 | `getPrismaForSchema(schema)` 필수 |
