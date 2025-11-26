# GitHub Codespaces 설정

이 폴더는 GitHub Codespaces에서 개발 환경을 설정하는 데 사용됩니다.

## 사용 방법

1. GitHub 저장소 페이지에서 **Code** 버튼 클릭
2. **Codespaces** 탭 선택
3. **Create codespace on main** 클릭

Codespace가 생성되면 자동으로:
- Node.js 환경이 설정됩니다
- 의존성이 설치됩니다 (`npm install`)
- 개발 서버가 시작됩니다 (`npm run dev`)

## 포트

- **5000**: Express 서버 (메인 서버)
- **5173**: Vite 개발 서버 (HMR)

포트는 자동으로 포워딩되어 브라우저에서 접근할 수 있습니다.

## 수동 실행

Codespace 터미널에서:

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

