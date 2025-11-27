# GitHub Actions 자동 배포 가이드

## 개요
- 브랜치: `main`
- 워크플로 파일: `.github/workflows/deploy.yml`
- 기능: 코드 푸시 시 빌드, 테스트, 배포 번들 생성 → 서버에 업로드 → PM2 재시작

## 사전 준비
1. **서버 환경**
   - Node.js 20+ / npm
   - `pm2` (선택)  
     ```bash
     npm install -g pm2
     ```
   - 애플리케이션 보관 디렉터리 예시: `/var/www/ims`
     ```
     /var/www/ims
       ├─ releases/      # 각 릴리스가 저장되는 디렉터리
       └─ current -> releases/<commit_sha>
     ```
2. **서버에서 SSH 공개키 등록**
   - GitHub Secrets에 업로드할 개인키와 페어인 공개키를 서버의 `~/.ssh/authorized_keys`에 등록

## GitHub Secrets 설정
| 이름 | 설명 |
| --- | --- |
| `DEPLOY_HOST` | 배포 대상 서버 IP 또는 호스트명 |
| `DEPLOY_USER` | SSH 사용자 |
| `DEPLOY_KEY` | SSH 개인키 (-----BEGIN 으로 시작) |
| `DEPLOY_PORT` | (선택) SSH 포트, 미입력 시 22 |
| `DEPLOY_PATH` | 서버 내 배포 루트 (`/var/www/ims` 등) |
| `PM2_PROCESS` | (선택) PM2 프로세스 이름. 미입력 시 재시작 스킵 |

> **주의**: Secrets가 하나라도 비어 있으면 “서버 업로드/배포” 단계는 자동으로 건너뜁니다.

## 워크플로 동작 순서
1. **의존성 설치**: `npm ci`
2. **정적 검사 & 테스트**: `npm run check`, `npm run test:fileStore`, `npm run test:backup`
3. **빌드**: `npm run build`
4. **아카이브**: `dist`, `package*.json`, `server/data` → `release/deploy.tar.gz`
5. **아티팩트 업로드**: 문제 발생 시 다운로드 가능
6. **서버 업로드/배포** (Secrets 설정 시)
   - `/tmp/deploy-<SHA>.tar.gz` 업로드
   - 서버에서 릴리스 디렉터리 생성
   - `npm ci --omit=dev`
   - `current` 심볼릭 링크 갱신
   - `pm2 reload <이름>` 또는 신규 `pm2 start dist/index.js`

## 서버 측 재시작 동작
```bash
pm2 reload <PM2_PROCESS> || pm2 start dist/index.js --name <PM2_PROCESS>
```
- 기존 프로세스가 없으면 새로 시작합니다.
- `PM2_PROCESS` Secrets를 비워두면 PM2 단계가 스킵되므로, 다른 방식(systemd 등)을 사용할 경우 별도로 구현하세요.

## 수동 실행
- GitHub → Actions → **Build & Deploy** → `Run workflow` 로 원하는 커밋을 즉시 배포 가능

## 트러블슈팅
| 증상 | 확인 포인트 |
| --- | --- |
| 워크플로가 “Upload bundle to server” 이전에 종료 | 테스트 실패 여부 확인 |
| “Permission denied” | 서버 SSH 권한/키 확인 |
| PM2 재시작 실패 | 서버에 pm2 설치 여부, `PM2_PROCESS` 이름 확인 |
| dist 실행 에러 | 서버에서 `node -v`, `npm -v` 확인 후 `npm ci --omit=dev`가 정상적으로 끝났는지 확인 |

## 추가 커스터마이징
- 테스트 단계가 오래 걸리면 `npm run test:*` 부분을 주석 처리하거나 조건부로 변경 가능
- `server/data` 외에 필요한 정적 자원이 있다면 `tar` 명령에 추가
- 고정 릴리스 보관 수를 제한하려면 SSH 스크립트에서 `ls -1dt releases/* | tail -n +6 | xargs rm -rf`와 같은 정리 로직을 추가하세요.

