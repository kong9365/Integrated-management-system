#!/bin/bash
# 서버 시작 스크립트

echo "의존성 확인 중..."
if [ ! -d "node_modules" ]; then
  echo "의존성 설치 중..."
  npm install
fi

echo "서버 시작 중..."
npm run dev

