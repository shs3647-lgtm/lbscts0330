# DB 백업 및 복원 가이드

## 📋 개요

FMEA 프로젝트 데이터베이스 백업 및 복원 스크립트

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

## 📊 백업 로그

모든 백업은 `backups/db/backup.log`에 기록됩니다.

**로그 형식:**
```
YYYY-MM-DDTHH:MM:SS | 파일경로 | 크기(MB) | FMEA_ID 또는 FULL
```

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

## 📝 예시

### 일일 백업 (자동화)

**Windows 작업 스케줄러:**
```powershell
# 매일 오전 3시 백업
schtasks /create /tn "FMEA DB Backup" /tr "powershell -File C:\01_new_sdd\fmea-onpremise\scripts\backup-db.ps1" /sc daily /st 03:00
```

### 프로젝트별 백업

```bash
# 여러 프로젝트 백업
node scripts/backup-db.js PFM26-M001
node scripts/backup-db.js PFM26-M002
node scripts/backup-db.js PFM26-M003
```










