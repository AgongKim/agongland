#!/bin/bash
set -e

echo "[아공랜드] 빌드 시작..."

# dist 폴더 초기화
rm -rf dist
mkdir -p dist/extension

# 서버 빌드
echo "[1/3] 서버 의존성 설치 중..."
cd server
npm install

echo "[2/3] 서버 exe 빌드 중... (시간이 걸릴 수 있습니다)"
npm run build:win
cd ..

# 익스텐션 복사
echo "[3/3] 익스텐션 파일 복사 중..."
cp extension/manifest.json    dist/extension/
cp extension/background.js    dist/extension/
cp extension/content_script.js dist/extension/
cp extension/styles.css       dist/extension/

# 실행 스크립트 복사
cp 방화벽-설정.bat dist/

echo ""
echo "✅ 빌드 완료! dist/ 폴더를 Windows로 옮겨서 사용하세요."
echo ""
