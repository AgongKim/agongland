@echo off
chcp 65001 > nul
echo [아공랜드] 빌드 시작...

:: dist 폴더 초기화
if exist dist rmdir /s /q dist
mkdir dist
mkdir dist\extension

:: 서버 빌드
echo [1/3] 서버 의존성 설치 중...
cd server
call npm install
if %errorlevel% neq 0 ( echo 오류: npm install 실패 & pause & exit /b 1 )

echo [2/3] 서버 exe 빌드 중... (시간이 걸릴 수 있습니다)
call npm run build:win
if %errorlevel% neq 0 ( echo 오류: 빌드 실패 & pause & exit /b 1 )
cd ..

:: 익스텐션 복사
echo [3/3] 익스텐션 파일 복사 중...
copy extension\manifest.json  dist\extension\
copy extension\background.js  dist\extension\
copy extension\content_script.js dist\extension\
copy extension\styles.css     dist\extension\

:: 실행 스크립트 복사
copy 시작.bat      dist\
copy 방화벽-설정.bat dist\

echo.
echo ✅ 빌드 완료! dist\ 폴더를 배포하세요.
echo.
pause
