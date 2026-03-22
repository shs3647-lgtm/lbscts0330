# Smart FMEA 온프레미스 최적화 가이드

> **작성일**: 2026-03-22
> **최종 업데이트**: 2026-03-22
> **대상**: C:\autom-fmea
> **목표**: 핵심기능 완성 상태에서 레거시 정리 + 온프레미스(Café24 VPS) 배포 최적화
> **배포 환경**: Café24 VPS 4GB RAM / Nginx + PM2 / PostgreSQL / fmea.ampsystem.co.kr

---

## 1. 현재 상태 진단

### 1.1 프로젝트 규모

```
라우트: 216개
Prisma 모델: 60+개
프로젝트 스키마 테이블: 57개 (pfmea_{fmeaId})
excel-parser: 928행 (5개 파서 포맷 지원)
Import 파이프라인: ~2,000행 (레거시 3,500행에서 정리 완료)
```

### 1.2 핵심기능 (구현 완료)

```
✅ FMEA 등록/관리
✅ 엑셀 Import → Atomic DB 생성
✅ 워크시트 (HTML table + Tailwind CSS) 렌더링/편집/저장
✅ 구조트리 (ST) / 기능분석 (FN) / 고장분석 (FA)
✅ 리스크분석 (RA) — SOD/AP
✅ 관리계획서 (CP) / 공정흐름도 (PFD)
✅ ALL 탭 통합 뷰
✅ 프로젝트 스키마 분리 (fmeaId별 독립 DB)
✅ FailureLink/RiskAnalysis (고장사슬)
✅ pipeline-verify (5단계 검증 — warn 시 RED)
✅ scope 중앙 상수화 (YP/SP/USER — scope-constants.ts)
✅ Import 통계표 8컬럼 (원본/고유/중복/UUID/SA/FK/pgsql/API)
✅ FE→L1F / FM→L2F 행번호 기반 FK 정확 매핑
✅ L1Function 편집 영구저장 (syncConfirmedFlags 역동기화)
✅ autofix B5/A6 DB 즉시 저장 + re-import 시 보존
✅ Import→워크시트 이동 시 fresh=1 강제 새로고침
```

### 1.3 해결 완료 (2026-03-22)

```
✅ 마스터 JSON 파이프라인 삭제 (export-master, load-master, import-excel-file, seed-from-master, reset-master)
✅ 중간 변환 레이어 삭제 (import-builder, prefix-utils, atomicToChains, atomicToFlatData, supplementMissingItems)
✅ 레거시 유틸 삭제 (uuid-generator, uuid-rules, sample-data-loader)
✅ 디버그 스크립트 삭제 (debug-page-error 3개, check/fix/rebuild 스크립트 9개)
✅ 'YOUR PLANT'/'Ship to Plant' 하드코딩 → scope-constants.ts 중앙화 (49개 파일)
✅ Handsontable 완전 제거 (Rule 14) → HTML table + Tailwind CSS
```

### 1.4 남은 정리 대상

```
⬜ standalone 빌드 미적용
⬜ DB 인덱스 미최적화
⬜ 미사용 API 라우트 추가 정리
⬜ 번들 사이즈 최적화 (dynamic import)
```

---

## 2. 레거시 제거 (Phase 1) — ✅ 완료

### 2.1 삭제 완료: 마스터 JSON 파이프라인

| 파일 | 행수 | 상태 |
|------|------|------|
| `src/app/api/fmea/export-master/route.ts` | ~200 | ✅ 삭제 |
| `src/app/api/fmea/load-master/route.ts` | ~150 | ✅ 삭제 |
| `src/app/api/fmea/import-excel-file/route.ts` | ~300 | ✅ 삭제 |
| `src/app/api/fmea/seed-from-master/` | ~200 | ✅ 삭제 |
| `src/app/api/fmea/reset-master/` | ~100 | ✅ 삭제 |
| `data/master-fmea/*.json` | 144K행 | ✅ 삭제 |
| `src/lib/sample-data-loader.ts` | ~100 | ✅ 삭제 |

### 2.2 삭제 완료: 중간 변환 레이어

| 파일 | 행수 | 상태 |
|------|------|------|
| `import/utils/atomicToFlatData.ts` | ~200 | ✅ 삭제 |
| `import/utils/atomicToChains.ts` | ~150 | ✅ 삭제 |
| `import/utils/supplementMissingItems.ts` | ~300 | ✅ 삭제 |
| `import/stepb-parser/import-builder.ts` | ~850 | ✅ 삭제 |
| `import/stepb-parser/prefix-utils.ts` | ~100 | ✅ 삭제 |
| `src/lib/uuid-generator.ts` | ~160 | ✅ 삭제 |
| `src/lib/uuid-rules.ts` | ~460 | ✅ 삭제 |

### 2.3 DB 테이블/모델 — 보존 결정

```prisma
// ⚠️ 삭제 불가 — Import staging에 현재 사용 중
model PfmeaMasterDataset { ... }      // Import flatData 메타 (dataset 관리)
model PfmeaMasterFlatItem { ... }     // flatData DB 저장 (autofix B5/A6 보존에 필수)

// 검토 필요
model FmeaLegacyData { ... }          // 워크시트 캐시 — Atomic 전환 후 삭제 가능
```

### 2.4 정리 대상: 미사용 API 라우트 후보

```
확인 필요 (사용 여부 체크 후 삭제):
  /api/fmea/resave-import       — 재Import (위치기반으로 대체)
  /api/fmea/reverse-import      — 역Import (위치기반으로 대체)
  /api/fmea/patch-legacy        — 레거시 패치
  /api/fmea/seed-missing-we     — WE 시딩
  /api/fmea/generate-roundtrip-excel — 라운드트립 (위치기반으로 대체)
```

### 2.5 실제 효과

```
삭제 코드: ~5,400행 + JSON 144K행
삭제 파일: 25+ 파일
하드코딩 정리: 49개 파일 scope 중앙화
신규 유틸: scope-constants.ts, import-verification-columns.ts, useImportVerification.ts
신규 API: verify-counts (DB 카운트 검증)
```

---

## 3. 온프레미스 빌드 최적화 (Phase 2)

### 3.1 Next.js standalone 빌드

```js
// next.config.js
module.exports = {
  output: 'standalone',        // ★ 핵심: node_modules 없이 독립 실행

  // 번들 분석
  experimental: {
    optimizePackageImports: [
      'exceljs',
      'lodash',
    ],
  },

  // 이미지 최적화 (외부 CDN 의존 제거)
  images: {
    unoptimized: true,         // 온프레미스에서는 로컬 이미지 사용
  },

  // 정적 자산 인라인
  assetPrefix: '',             // CDN 없이 로컬 서빙
};
```

**standalone 빌드 효과**:
- `node_modules` (수백MB) → `.next/standalone` (~50MB)로 축소
- PM2로 `node .next/standalone/server.js` 한 줄로 실행
- 외부 네트워크 의존 제거 (인터넷 불안정한 기업 현장 대응)

### 3.2 번들 사이즈 최적화

```bash
# 번들 분석
npx @next/bundle-analyzer

# 예상 큰 패키지:
#   exceljs: ~400KB — Import 페이지에서만 로드 (dynamic import)
#   lodash: ~70KB — tree-shaking 또는 lodash-es로 교체
#   chart.js: ~200KB — 대시보드에서만 로드 (dynamic import)
```

```typescript
// dynamic import로 무거운 라이브러리 지연 로딩
// Import 페이지
const ExcelParser = dynamic(() => import('./excel-parser'), { ssr: false });

// 워크시트 — HTML table + Tailwind (Handsontable 사용 금지, Rule 14)
```

### 3.3 API 라우트 최적화

```
핵심 유지 (PFMEA):
  /api/fmea/route.ts (GET/POST)           — 워크시트 로드/저장
  /api/fmea/save-from-import/             — Import (다이렉트)
  /api/fmea/save-position-import/         — Import (위치기반)
  /api/fmea/create-with-import/           — 등록+Import
  /api/fmea/projects/                     — 프로젝트 목록
  /api/fmea/next-id/                      — ID 채번
  /api/fmea/pipeline-verify/              — 검증 (5단계, warn=RED)
  /api/fmea/verify-counts/               — DB 카운트 검증 (신규)
  /api/fmea/atom-map/                     — Atomic Cell Save (PATCH)
  /api/fmea/rebuild-atomic/              — Atomic 재구축
  /api/fmea/info/                         — FMEA 정보
  /api/fmea/revisions/                    — 리비전
  /api/fmea/version-backup/               — 백업
  /api/fmea/export-package/               — 엑셀 내보내기
  /api/fmea/deep-verify/                  — 6대 카테고리 42규칙 검증

핵심 유지 (CP/PFD):
  /api/fmea/cp-pfd-verify/               — CP/PFD 검증
  /api/fmea/sync-cp-pfd/                 — CP/PFD 동기화

기타 유지:
  /api/fmea/meetings/                    — 미팅
  /api/fmea/approval/                    — 승인
  /api/pfmea/master/                     — 기초정보 staging (flatData)
```

---

## 4. DB 최적화 (Phase 3)

### 4.1 스키마 아키텍처 (확정)

```
PostgreSQL
├── public 스키마 (공통 데이터만)
│    ├── fmea_projects          — 프로젝트 메타
│    ├── fmea_registrations     — 기초정보
│    ├── users                  — 사용자
│    ├── kr_industry_detection  — 산업DB (DC)
│    ├── kr_industry_prevention — 산업DB (PC)
│    ├── lld_filter_code        — LLD 교훈DB
│    ├── master_fmea_reference  — 마스터 참조 (Living DB)
│    ├── pfmea_master_datasets  — Import staging 메타
│    └── pfmea_master_flat_items — Import staging 데이터
│
└── pfmea_{fmeaId} 스키마 (프로젝트별 Atomic DB)
     ├── l1_structures, l2_structures, l3_structures
     ├── l1_functions, l2_functions, l3_functions
     ├── failure_effects, failure_modes, failure_causes
     ├── failure_links, risk_analyses, optimizations
     ├── process_product_chars
     └── ... (CP/PFD 관련 30+ 테이블)

★ Atomic DB는 프로젝트 스키마에만 존재
★ public 폴백 없음 — 없으면 "Import 먼저" 안내
```

### 4.2 인덱스 추가

```sql
-- 프로젝트 스키마 내 인덱스 (각 pfmea_{fmeaId} 스키마에 적용)

-- 구조 계층 조회 최적화
CREATE INDEX idx_l2_l1id ON l2_structures(l1_id);
CREATE INDEX idx_l3_l2id ON l3_structures(l2_id);

-- 고장 분석 조회 최적화
CREATE INDEX idx_fm_product_char ON failure_modes(product_char_id);
CREATE INDEX idx_fe_l1func ON failure_effects(l1_func_id);
CREATE INDEX idx_fc_l3func ON failure_causes(l3_func_id);

-- 고장사슬 조회 최적화 (워크시트 렌더링 핵심)
CREATE INDEX idx_fl_fm ON failure_links(fm_id);
CREATE INDEX idx_fl_fe ON failure_links(fe_id);
CREATE INDEX idx_fl_fc ON failure_links(fc_id);
CREATE INDEX idx_ra_link ON risk_analyses(link_id);

-- AP 우선순위 필터링
CREATE INDEX idx_ra_ap ON risk_analyses(ap);
CREATE INDEX idx_ra_severity ON risk_analyses(severity DESC);
```

### 4.3 PostgreSQL 설정 (4GB RAM, Smart FMEA 단독)

```ini
# postgresql.conf 최적화
# ★ 4GB RAM에 Smart FMEA 단독 운영 기준

# 메모리
shared_buffers = 1GB              # RAM의 25%
effective_cache_size = 3GB        # RAM의 75%
work_mem = 16MB                   # 쿼리당 정렬/해시 메모리
maintenance_work_mem = 256MB      # VACUUM, CREATE INDEX

# WAL
wal_buffers = 64MB
checkpoint_completion_target = 0.9

# 연결
max_connections = 30              # Smart FMEA 단독: 넉넉
```

### 4.4 Prisma 연결 풀

```env
# .env
DATABASE_URL="postgresql://user:pass@localhost:5432/smartfmea?schema=public&connection_limit=10&pool_timeout=20"
```

---

## 5. Café24 VPS 배포 구성 (Phase 4)

### 5.1 아키텍처 (Smart FMEA 단독 권장)

```
Café24 VPS (4GB RAM)
│
├── Nginx (80/443)
│    └── fmea.ampsystem.co.kr    → localhost:3000  (Smart FMEA)
│
├── PM2
│    └── smart-fmea  (standalone, ~50MB, 포트 3000)
│
├── PostgreSQL (5432)
│    └── smartfmea_db
│         ├── public (공통: 프로젝트목록, 사용자, 산업DB, LLD, 마스터참조)
│         └── pfmea_{fmeaId} (프로젝트별 Atomic DB)
│
└── 메모리 분배 (4GB)
     ├── PostgreSQL: ~1.5GB (shared_buffers 1GB + 오버헤드)
     ├── Smart FMEA: ~600MB (Import 시 일시적 피크 대응)
     ├── Nginx + OS: ~200MB
     └── 여유: ~1.7GB
```

> ★ 4GB VPS에 4개 앱 동시 운영은 빠듯함. Smart FMEA 단독 운영 권장.
> QMS/SPC/APQP는 별도 VPS 또는 8GB 이상 서버에서 운영.

### 5.2 PM2 ecosystem 설정

```js
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'smart-fmea',
      script: '.next/standalone/server.js',
      cwd: '/home/deploy/smart-fmea',
      env: {
        PORT: 3000,
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://...',
      },
      instances: 1,
      max_memory_restart: '600M', // ★ Import 시 일시적 메모리 피크 대응
      exp_backoff_restart_delay: 100,
    },
  ],
};
```

### 5.3 Nginx 설정

```nginx
# /etc/nginx/sites-available/fmea.ampsystem.co.kr
server {
    listen 80;
    server_name fmea.ampsystem.co.kr;

    # gzip 압축 (번들 사이즈 ~70% 감소)
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;

    # 정적 자산 캐싱
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # API 요청
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # 타임아웃 (대량 Import 대응)
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # 나머지 요청
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### 5.4 SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d fmea.ampsystem.co.kr
# 자동 갱신 설정
sudo crontab -e
# 0 0 1 * * certbot renew --quiet
```

---

## 6. 배포 스크립트

### 6.1 빌드 + 배포 (Windows → VPS)

```powershell
# deploy.ps1 — Windows에서 실행
$VPS = "deploy@ampsystem.co.kr"
$APP_DIR = "/home/deploy/smart-fmea"

# 1. 빌드
Write-Host "빌드 시작..."
npm run build

# 2. standalone 패키지 생성
Write-Host "패키지 생성..."
$DEPLOY_DIR = ".next/standalone"

# 3. 정적 자산 복사 (standalone에 포함 안 됨)
Copy-Item -Recurse -Force ".next/static" "$DEPLOY_DIR/.next/static"
Copy-Item -Recurse -Force "public" "$DEPLOY_DIR/public"

# 4. VPS로 전송
Write-Host "VPS 전송..."
scp -r $DEPLOY_DIR/* "${VPS}:${APP_DIR}/"
scp .env.production "${VPS}:${APP_DIR}/.env"
scp ecosystem.config.js "${VPS}:${APP_DIR}/"

# 5. PM2 재시작
Write-Host "PM2 재시작..."
ssh $VPS "cd $APP_DIR && pm2 reload ecosystem.config.js --env production"

Write-Host "배포 완료!"
```

### 6.2 VPS 초기 설정

```bash
# VPS에서 1회 실행
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2
sudo npm install -g pm2

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres createdb smartfmea_db
sudo -u postgres psql -c "CREATE USER fmea_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL ON DATABASE smartfmea_db TO fmea_user;"

# Prisma 마이그레이션
cd /home/deploy/smart-fmea
npx prisma migrate deploy

# PM2 시작 + 부팅 시 자동시작
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 7. 모니터링

### 7.1 PM2 모니터링

```bash
pm2 monit                # 실시간 모니터링
pm2 logs smart-fmea      # 로그 확인
pm2 status               # 상태 확인
```

### 7.2 헬스체크 API

```typescript
// src/app/api/health/route.ts — 신규 추가
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export async function GET() {
  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      db: 'connected',
      memory: process.memoryUsage(),
    });
  } catch (e) {
    return NextResponse.json({ status: 'unhealthy', error: String(e) }, { status: 500 });
  }
}
```

### 7.3 DB 백업 (cron)

```bash
# /etc/cron.d/fmea-backup
0 2 * * * deploy pg_dump -U fmea_user smartfmea_db | gzip > /home/deploy/backups/fmea_$(date +\%Y\%m\%d).sql.gz
# 7일 이상 된 백업 삭제
0 3 * * * deploy find /home/deploy/backups -name "*.gz" -mtime +7 -delete
```

---

## 8. 실행 순서 체크리스트

### Phase 1: 레거시 제거 — ✅ 완료 (2026-03-22)

```
✅ 마스터 JSON 관련 7개 파일 삭제
✅ 중간 변환 레이어 7개 파일 삭제
✅ 디버그 스크립트 12개 삭제
✅ 'YOUR PLANT' 하드코딩 → scope-constants.ts 중앙화 (49개 파일)
✅ FE→L1F / FM→L2F 행번호 기반 FK 정확 매핑
✅ L1Function 편집 → atomicDB 역동기화 (syncConfirmedFlags)
✅ autofix B5/A6 DB 즉시 저장 + re-import 시 selective replace
✅ pipeline-verify warn→RED 엄격화
✅ Import 통계표 FK/pgsql/API 3컬럼 추가
✅ npx tsc --noEmit 타입 체크 통과
```

### Phase 2: 빌드 최적화 (1일)

```
⬜ next.config.js에 output: 'standalone' 추가
⬜ dynamic import 적용 (ExcelJS, Chart.js 등)
⬜ npm run build 성공 확인
⬜ standalone 폴더 크기 확인 (목표: ~50MB 이하)
⬜ node .next/standalone/server.js 로컬 실행 테스트
```

### Phase 3: DB 최적화 (반나절)

```
⬜ 프로젝트 스키마 인덱스 추가 SQL 작성
⬜ PostgreSQL 설정 최적화 (postgresql.conf)
⬜ Prisma connection_limit 설정
⬜ 워크시트 로드 속도 측정 (목표: 1초 이내)
```

### Phase 4: VPS 배포 (1일)

```
⬜ Café24 VPS 접속 확인
⬜ Node.js 20 + PM2 + PostgreSQL 설치
⬜ Nginx 설정 + SSL 인증서
⬜ 첫 배포 (deploy.ps1 실행)
⬜ fmea.ampsystem.co.kr 접속 확인
⬜ 엑셀 Import → 워크시트 렌더링 통합 테스트
⬜ PM2 모니터링 + DB 백업 cron 설정
```

---

## 9. 예상 최종 결과

| 항목 | AS-IS | TO-BE |
|------|-------|-------|
| 코드량 (Import 파이프라인) | ~3,500행 | ~2,000행 (Phase 1 완료) |
| 삭제된 코드 | - | ~5,400행 + 144K행 JSON |
| 하드코딩 scope 문자열 | 49개 파일 분산 | scope-constants.ts 1곳 |
| Import 통계 검증 | 5컬럼 | 8컬럼 (FK/pgsql/API 추가) |
| FK 고아 발생 | 빈번 | 0건 (행번호 매칭) |
| autofix 재발 | 매 로그인 72건 반복 | 1회 실행 후 영구 보존 |
| standalone 패키지 | 해당 없음 | ~50MB (Phase 2) |
| 외부 네트워크 의존 | CDN, npm | 없음 (완전 독립) |
| 워크시트 로드 | 2~3초 | 1초 이내 (인덱스, Phase 3) |
| VPS 메모리 사용 | - | ~600MB (단독 운영) |
| 배포 방식 | 수동 | deploy.ps1 원클릭 (Phase 4) |
