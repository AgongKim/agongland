@echo off
chcp 65001 > nul
echo 방화벽 포트 8080 열기 (관리자 권한 필요)
echo.

:: 관리자 권한 확인
net session > nul 2>&1
if %errorlevel% neq 0 (
  echo ❌ 관리자 권한으로 실행해주세요.
  echo    이 파일을 우클릭 → "관리자 권한으로 실행"
  pause
  exit /b 1
)

netsh advfirewall firewall delete rule name="아공랜드 채팅 서버" > nul 2>&1
netsh advfirewall firewall add rule name="아공랜드 채팅 서버" dir=in action=allow protocol=TCP localport=8080

echo ✅ 포트 8080 방화벽 허용 완료
echo    같은 네트워크의 다른 기기에서 접속 가능합니다.
echo.
pause
