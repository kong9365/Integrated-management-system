# GitHub Codespaces 설정

이 폴더는 GitHub Codespaces에서 개발 환경을 설정하는 데 사용됩니다.

## 사용 방법

1. GitHub 저장소 페이지에서 **Code** 버튼 클릭
2. **Codespaces** 탭 선택
3. **Create codespace on main** 클릭

Codespace가 생성되면 자동으로:
- Node.js 환경이 설정됩니다
- 의존성이 설치됩니다 (`npm install`)

## 서버 실행

### 자동 실행 (권장)
Codespace가 생성된 후, 터미널에서 다음 명령을 실행하세요:

```bash
npm run dev
```

### 수동 실행
만약 자동 실행이 되지 않으면:

```bash
# 1. 의존성 확인 및 설치
npm install

# 2. 개발 서버 실행
npm run dev
```

서버가 시작되면 터미널에 다음과 같은 메시지가 표시됩니다:
```
서버가 포트 5000에서 실행 중입니다 (개발 모드)
접속 주소: http://localhost:5000
```

## 포트 접속

1. Codespaces 하단의 **포트** 탭을 클릭
2. 포트 **5000**을 찾습니다
3. 포트 옆의 **공개** 버튼을 클릭하여 공개 설정
4. **브라우저에서 열기** 아이콘을 클릭하거나 URL을 복사하여 접속

포트는 자동으로 포워딩되어 브라우저에서 접근할 수 있습니다.

## 문제 해결

### 502 Bad Gateway 오류
서버가 실행되지 않았을 때 발생합니다. 터미널에서 `npm run dev`를 실행하세요.

### 포트가 표시되지 않음
1. 터미널에서 서버가 실행 중인지 확인
2. 포트 탭에서 "포트 추가" 버튼을 클릭하여 수동으로 5000 포트 추가

### 의존성 오류
```bash
rm -rf node_modules package-lock.json
npm install
```

## 기타 명령어

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# TypeScript 타입 체크
npm run check
```

