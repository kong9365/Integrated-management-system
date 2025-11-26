# 품질관리팀 통합 관리 시스템

품질관리팀의 업무를 통합 관리하는 웹 기반 시스템입니다.

## 주요 기능

- **장비 가동현황 모니터링**: CDS 시스템 연동 실시간 장비 상태 모니터링
- **문서 관리**: 품질 문서 및 표준서 관리
- **예약 관리**: 장비 및 시설 예약 관리
- **사용자 관리**: 시스템 사용자 및 권한 관리
- **보고서**: 통계 및 분석 보고서
- **공구 관리**: 공구 대여 및 관리
- **점검 체크리스트**: 장비 점검 및 유지보수 체크리스트
- **안전 관리**: 안전 교육 및 사고 관리

## 기술 스택

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Radix UI
- TanStack Query
- Wouter (라우팅)

### Backend
- Express.js
- Node.js
- TypeScript

### CDS API 연동
- OpenLab Sample Scheduler API v2
- 실시간 장비 상태 수집

## 설치 및 실행

### 개발 환경 설정

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

서버는 `http://localhost:5000`에서 실행됩니다.

### 프로덕션 빌드

```bash
# 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

## 환경 변수

CDS API 인증 정보 (선택사항):

```bash
CDS_USERNAME=10077
CDS_PASSWORD=kd10077
```

기본값이 설정되어 있어 바로 사용 가능합니다.

## 프로젝트 구조

```
Integrated management system/
├── client/              # 프론트엔드 소스 코드
│   └── src/
│       ├── components/  # 재사용 가능한 컴포넌트
│       ├── pages/       # 페이지 컴포넌트
│       └── lib/         # 유틸리티 함수
├── server/              # 백엔드 소스 코드
│   ├── routes/         # API 라우트
│   └── cds-api-client.ts  # CDS API 클라이언트
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## API 엔드포인트

### CDS 장비 API

- `GET /api/cds/instruments` - 모든 장비 상태 조회
- `GET /api/cds/instruments/:name` - 특정 장비 상태 조회
- `GET /api/cds/stats` - 장비 상태 통계 조회

## 디자인 시스템

KD Red를 메인 브랜드 컬러로 사용합니다. 자세한 내용은 [design_guidelines.md](./design_guidelines.md)를 참조하세요.

## 라이선스

MIT

