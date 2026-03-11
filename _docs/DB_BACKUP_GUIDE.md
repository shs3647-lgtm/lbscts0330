# DB 백업 및 복원 가이드

## 📋 개요

FMEA 프로젝트 데이터베이스 백업 및 복원 스크립트 가이드

**생성일:** 2026-01-11  
**목적:** FMEA 프로젝트 데이터베이스 백업, 복원, 정리 자동화

---

## 🔧 백업 방법

### 1. 전체 DB 백업 (PowerShell)

```powershell
.\scripts\backup-db.ps1
```

**결과:**
- 파일: `backups/db/fmea_db_full_YYYYMMDD_HHMMSS.sql`
- 형식: PostgreSQL custom format (pg_dump)
- 용도: 전체 DB 백업 (모든 FMEA 프로젝트 포함)

### 2. 전체 DB 백업 (Node.js)

```bash
node scripts/backup-db.js
```

**결과:**
- 파일: `backups/db/fmea_db_full_YYYYMMDD_HHMMSS.sql`
- 형식: PostgreSQL custom format (pg_dump)

### 3. 특정 FMEA 프로젝트 백업 (Node.js)

```bash
node scripts/backup-db.js PFM26-M001
```

**결과:**
- 파일: `backups/db/fmea_PFM26-M001_YYYYMMDD_HHMMSS.json`
- 형식: JSON (프로젝트별 데이터만)
- 포함 테이블:
  - fmea_projects
  - fmea_registrations
  - fmea_cft_members
  - fmea_worksheet_data
  - fmea_confirmed_states
  - fmea_legacy_data
  - failure_links
  - failure_causes
  - failure_modes
  - failure_effects
  - l1_structures, l2_structures, l3_structures
  - l1_functions, l2_functions, l3_functions
  - risk_analyses
  - optimizations

---

## 🔄 복원 방법

### 1. 전체 DB 복원 (SQL 파일)

```bash
node scripts/restore-db.js backups/db/fmea_db_full_20260111_120000.sql
```

**⚠️ 주의:** 기존 데이터가 모두 삭제됩니다!

### 2. 특정 FMEA 프로젝트 복원 (JSON 파일)

```bash
node scripts/restore-db.js backups/db/fmea_PFM26-M001_20260111_120000.json
```

**✅ 안전:** 해당 프로젝트 데이터만 복원됩니다.

---

## 🗑️ 백업 데이터 정리 (삭제 기준)

백업 파일이 계속 쌓이면 디스크 공간을 차지하므로, 정기적으로 정리해야 합니다.

### 기본 사용법

```bash
node scripts/cleanup-backups.js
```

### 삭제 기준 옵션

#### 1. 일수 기준 (--days=N)

N일 이상 된 백업 삭제

```bash
# 30일 이상 된 백업 삭제
node scripts/cleanup-backups.js --days=30
```

**예시:**
- `--days=30`: 30일 이상 된 백업 삭제
- `--days=7`: 7일 이상 된 백업 삭제
- `--days=90`: 90일 이상 된 백업 삭제

#### 2. 개수 기준 (--keep=N)

최신 N개만 유지, 나머지 삭제

```bash
# 최신 10개만 유지
node scripts/cleanup-backups.js --keep=10
```

**예시:**
- `--keep=10`: 최신 10개만 유지
- `--keep=5`: 최신 5개만 유지
- `--keep=30`: 최신 30개만 유지

#### 3. 크기 기준 (--max-size=SIZE)

총 백업 크기가 지정된 크기 초과 시 오래된 것부터 삭제

```bash
# 총 크기가 10GB 초과 시 오래된 것부터 삭제
node scripts/cleanup-backups.js --max-size=10GB
```

**지원 단위:**
- `GB`: 기가바이트
- `MB`: 메가바이트
- `KB`: 킬로바이트
- `B`: 바이트

**예시:**
- `--max-size=10GB`: 10GB 초과 시 삭제
- `--max-size=1GB`: 1GB 초과 시 삭제
- `--max-size=500MB`: 500MB 초과 시 삭제

#### 4. 조합 사용

여러 기준을 동시에 사용 가능

```bash
# 30일 이상 된 백업 삭제 + 최신 10개 유지
node scripts/cleanup-backups.js --days=30 --keep=10
```

#### 5. 시뮬레이션 (--dry-run)

실제 삭제하지 않고 삭제 대상만 확인

```bash
# 삭제 대상만 확인 (실제 삭제 안함)
node scripts/cleanup-backups.js --days=30 --dry-run
```

**출력 예시:**
```
🔍 [DRY RUN] 실제 삭제하지 않습니다.

  - fmea_db_full_20251201_120000.sql (150.23 MB, 45일 전)
  - fmea_db_full_20251205_120000.sql (152.45 MB, 41일 전)
  - fmea_PFM26-M001_20251210_120000.json (2.34 MB, 36일 전)

✅ [DRY RUN] 완료 (실제 삭제되지 않음)
```

### 정리 예시

```bash
# 1. 현재 상태 확인 (dry-run)
node scripts/cleanup-backups.js --days=30 --dry-run

# 2. 30일 이상 된 백업 삭제
node scripts/cleanup-backups.js --days=30

# 3. 최신 10개만 유지
node scripts/cleanup-backups.js --keep=10

# 4. 10GB 초과 시 삭제
node scripts/cleanup-backups.js --max-size=10GB

# 5. 복합 정리 (30일 이상 + 최신 10개 유지)
node scripts/cleanup-backups.js --days=30 --keep=10
```

### 정리 결과 출력

```
=== 백업 데이터 정리 시작 ===

현재 백업 파일: 25개 (2.5 GB)

📅 30일 이상 된 백업: 15개
📦 최신 10개 제외한 백업: 15개

삭제 대상: 15개 (1.2 GB)

삭제 시작...

  삭제: fmea_db_full_20251201_120000.sql (150.23 MB, 45일 전)
  삭제: fmea_db_full_20251205_120000.sql (152.45 MB, 41일 전)
  ...
  ✅ 백업 로그 정리 완료

✅ 정리 완료!
삭제: 15개 (1.2 GB)
남은 백업: 10개 (1.3 GB)
```

---

## 📊 백업 로그

모든 백업은 `backups/db/backup.log`에 기록됩니다.

**로그 형식:**
```
YYYY-MM-DDTHH:MM:SS | 파일경로 | 크기(MB) | FMEA_ID 또는 FULL
```

**예시:**
```
2026-01-11T12:00:00 | backups/db/fmea_db_full_20260111_120000.sql | 150.23 MB | FULL
2026-01-11T12:05:00 | backups/db/fmea_PFM26-M001_20260111_120500.json | 2.34 MB | PFM26-M001
```

**정리 스크립트 실행 시:**
- 삭제된 백업 파일의 로그는 자동으로 제거됩니다.

---

## 🔍 백업 파일 확인

### 전체 DB 백업 파일 확인

```bash
# PostgreSQL custom format 파일 정보 확인
pg_restore --list backups/db/fmea_db_full_YYYYMMDD_HHMMSS.sql
```

### 프로젝트 백업 파일 확인

```bash
# JSON 파일 내용 확인 (일부)
node -e "const d=require('./backups/db/fmea_PFM26-M001_YYYYMMDD_HHMMSS.json');console.log('FMEA ID:',d.fmeaId);console.log('테이블:',Object.keys(d.tables))"
```

---

## ⚙️ 설정

### PostgreSQL 연결 정보

스크립트 내 기본 설정:
- Host: `localhost`
- Port: `5432`
- Database: `fmea_db`
- User: `postgres`
- Password: `postgres`

**환경변수로 변경 가능:**
```bash
# Windows PowerShell
$env:PGPASSWORD = "your_password"

# Linux/Mac
export PGPASSWORD=your_password
```

### 백업 디렉토리 변경

기본값: `scripts/../backups/db`

**PowerShell:**
```powershell
.\scripts\backup-db.ps1 -BackupDir "D:\Backups\FMEA"
```

**Node.js:**
스크립트 내 `BACKUP_DIR` 변수 수정

---

## 🔐 보안 주의사항

1. **백업 파일 보안**
   - 백업 파일에 DB 비밀번호는 포함되지 않습니다
   - 하지만 모든 데이터가 포함되므로 보안 관리 필요

2. **백업 파일 저장**
   - 소스 코드 저장소에 커밋하지 마세요
   - `.gitignore`에 `backups/` 추가 권장

3. **복원 시 주의**
   - 전체 DB 복원 시 기존 데이터 모두 삭제됨
   - 복원 전 반드시 현재 DB 백업 권장

4. **정리 시 주의**
   - `--dry-run` 옵션으로 먼저 확인 권장
   - 삭제된 백업은 복구 불가능

---

## 🆘 문제 해결

### pg_dump 명령어 없음

**Windows:**
1. PostgreSQL 설치 시 "Command Line Tools" 포함 확인
2. 또는 PostgreSQL 설치 경로를 PATH에 추가:
   ```
   C:\Program Files\PostgreSQL\15\bin
   ```

### 백업 파일 크기 0

- PostgreSQL 서버가 실행 중인지 확인
- DB 연결 정보 확인
- pg_dump 실행 권한 확인

### 복원 실패

- 백업 파일 형식 확인 (`.sql` 또는 `.json`)
- PostgreSQL 서버 실행 확인
- DB 연결 정보 확인
- 기존 데이터 충돌 가능성 (복원 전 백업 권장)

### 정리 스크립트 오류

- 백업 디렉토리 존재 확인
- 파일 읽기/쓰기 권한 확인
- Node.js 버전 확인 (v14 이상 권장)

---

## 📝 자동화 예시

### 일일 백업 (Windows 작업 스케줄러)

```powershell
# 매일 오전 3시 백업
schtasks /create /tn "FMEA DB Backup" /tr "powershell -File C:\01_new_sdd\fmea-onpremise\scripts\backup-db.ps1" /sc daily /st 03:00
```

### 주간 정리 (Windows 작업 스케줄러)

```powershell
# 매주 일요일 오전 4시 정리 (30일 이상 된 백업 삭제)
schtasks /create /tn "FMEA DB Cleanup" /tr "node C:\01_new_sdd\fmea-onpremise\scripts\cleanup-backups.js --days=30" /sc weekly /d SUN /st 04:00
```

### 프로젝트별 백업

```bash
# 여러 프로젝트 백업
node scripts/backup-db.js PFM26-M001
node scripts/backup-db.js PFM26-M002
node scripts/backup-db.js PFM26-M003
```

### 정기 백업 + 정리 스크립트

```bash
# 1. 전체 DB 백업
node scripts/backup-db.js

# 2. 30일 이상 된 백업 삭제 (dry-run으로 먼저 확인)
node scripts/cleanup-backups.js --days=30 --dry-run

# 3. 실제 삭제
node scripts/cleanup-backups.js --days=30

# 4. 최신 20개만 유지
node scripts/cleanup-backups.js --keep=20
```

---

## 📌 권장 사항

### 백업 전략

1. **일일 백업**: 전체 DB 백업 (자동화 권장)
2. **주간 정리**: 30일 이상 된 백업 삭제
3. **월간 정리**: 최신 20개만 유지
4. **프로젝트 백업**: 중요한 프로젝트는 별도 백업

### 정리 전략

1. **일수 기준**: 30일 이상 된 백업 삭제
2. **개수 기준**: 최신 20개만 유지
3. **크기 기준**: 총 10GB 초과 시 삭제

**권장 조합:**
```bash
# 30일 이상 + 최신 20개 유지
node scripts/cleanup-backups.js --days=30 --keep=20
```

---

## 📚 관련 문서

- [DB_SCHEMA.md](./DB_SCHEMA.md) - 데이터베이스 스키마 구조
- [DB_STATUS_BACKUP.md](./DB_STATUS_BACKUP.md) - DB 상태 및 백업 정보

---

**최종 업데이트:** 2026-01-11  
**작성자:** FMEA Development Team

