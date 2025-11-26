## CSV Computer System Validation 개요

### 1. 요구사항 정의 (URS)
- 외부인 출입관리 방문자/감사 데이터를 CSV로 백업할 수 있어야 한다.
- CSV 파일은 SHA-256 해시와 함께 제공되어 무결성 검증이 가능해야 한다.
- CSV로부터 원본 JSON 스토리지를 완전히 복구할 수 있어야 한다.
- 백업/복구 프로세스는 자동화 테스트로 주기적으로 검증한다.

### 2. 기능/설계 사양 (FS/DS)
- `server/scripts/backup-utils.ts`  
  - `performBackup`: 방문자/감사 JSON → CSV 변환, 해시 파일 생성.  
  - `restoreFromCsv`: CSV + 해시 검증 후 JSON 스토리지 복원.  
  - `toCsv`/`fromCsv`: 특수문자(콤마/개행/따옴표) 안전 처리.
- CLI
  - `npm run backup:visitors` → `/backups` 디렉터리에 스냅샷 생성.
  - `npm run restore:visitors <visitors.csv> <audit.csv>` → 지정 CSV 복구.
- 무결성 메타데이터
  - Audit Trail 항목에 `hash` 필드를 저장하고 CSV 내보내기에도 포함.
  - Append-only NDJSON 로그(`visitor-audit-trail.ndjson`) 보조 저장.

### 3. 테스트 전략 (IQ/OQ/PQ)
- **IQ (설치 자격)**  
  - `npm run backup:visitors` / `npm run restore:visitors` 실행 가능 여부 확인.
- **OQ (운영 자격)**  
  - `npm run test:fileStore` : 스토리지 잠금 및 원자적 쓰기 검증.  
  - `npm run test:backup` : 등록 → 백업 → 삭제 → 복구 → 검증 시나리오 자동 테스트.
- **PQ (성능 자격)**  
  - 주기적(예: 일일) 백업 + 무결성 검증 로그 유지.  
  - 복구 리허설 결과를 CSV와 함께 보관.

### 4. 변경/릴리스 관리
- 백업/복구 스크립트 또는 CSV 포맷 변경 시
  1. URS/FS/DS 업데이트
  2. 관련 테스트(`test:backup`) 보강
  3. 변경 내역을 릴리스 노트에 기록
  4. 운영 환경에 적용 후 IQ/OQ 체크리스트 갱신

### 5. 운영 체크리스트
| 구분 | 항목 | 주기 |
| --- | --- | --- |
| 백업 | `npm run backup:visitors` 실행 및 로그 저장 | 매일 |
| 검증 | `.sha256` 해시 비교 | 백업 직후 |
| 복구 리허설 | 테스트 환경에서 CSV 복구 | 분기 |
| 테스트 | `npm run test:fileStore`, `npm run test:backup` | 코드 변경시 |

