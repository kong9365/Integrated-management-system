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

### 회사 내부망/방화벽으로 인한 접근 불가
회사 내부망이나 방화벽 정책에 의해 GitHub Codespaces 포트 포워딩이 차단될 수 있습니다.

**해결 방법:**

1. **VPN 사용**
   - 회사 VPN에 연결하여 외부 네트워크로 접속

2. **모바일 핫스팟 사용**
   - 스마트폰의 모바일 데이터를 사용하여 회사 네트워크를 우회

3. **네트워크 관리자에게 문의**
   - 다음 도메인/포트에 대한 접근 허용 요청:
     - `*.github.dev` (GitHub Codespaces 도메인)
     - 포트 5000, 5173 (HTTP)

4. **로컬 개발 환경 사용**
   - Codespaces 대신 로컬 컴퓨터에서 개발:
   ```bash
   git clone https://github.com/kong9365/Integrated-management-system.git
   cd Integrated-management-system
   npm install
   npm run dev
   ```

5. **프록시 설정 (회사 프록시 사용 시)**
   - Codespaces 터미널에서 프록시 환경 변수 설정:
   ```bash
   export HTTP_PROXY=http://프록시주소:포트
   export HTTPS_PROXY=http://프록시주소:포트
   npm install
   npm run dev
   ```

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

