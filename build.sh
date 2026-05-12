#!/bin/bash
set -e

echo "[아공랜드] 빌드 시작..."

# dist 폴더 초기화
rm -rf dist
mkdir -p dist/extension/src

# 서버 빌드
echo "[1/3] 서버 의존성 설치 중..."
cd server
npm install

echo "[2/3] 서버 exe 빌드 중... (시간이 걸릴 수 있습니다)"
npm run build:win
cd ..

# 익스텐션 복사
echo "[3/3] 익스텐션 파일 복사 중..."
cp extension/manifest.json  dist/extension/
cp extension/background.js  dist/extension/
cp extension/styles.css     dist/extension/
cp extension/src/state.js       dist/extension/src/
cp extension/src/network.js     dist/extension/src/
cp extension/src/nickname.js    dist/extension/src/
cp extension/src/songs.js       dist/extension/src/
cp extension/src/recs.js        dist/extension/src/
cp extension/src/chat.js        dist/extension/src/
cp extension/src/panel.js       dist/extension/src/
cp extension/src/connection.js  dist/extension/src/
cp extension/src/main.js        dist/extension/src/

# public 폴더 복사 (서버 HTML)
cp -r server/public dist/

# dist용 README 생성
cat > dist/README.md << 'EOF'
# 아공랜드 채팅 서버

## 파일 구성

```
agongland-server.exe   ← 서버 실행 파일
public/                ← 모바일 웹 클라이언트
extension/             ← 크롬 익스텐션 폴더
```

---

## 1. 방화벽 설정 (최초 1회)

같은 네트워크의 다른 기기(모바일 등)에서 접속하려면 포트를 열어야 합니다.

PowerShell을 **관리자 권한**으로 실행 후 아래 명령어를 붙여넣으세요.

```powershell
netsh advfirewall firewall add rule name="아공랜드 채팅 서버" dir=in action=allow protocol=TCP localport=8080
```

## 2. 서버 실행

`agongland-server.exe` 더블클릭

서버가 시작되면 접속 주소가 출력됩니다.

## 3. 크롬 익스텐션 설치

1. 크롬 주소창에 `chrome://extensions` 입력
2. 우측 상단 **개발자 모드** 활성화
3. **압축 해제된 확장 프로그램 로드** 클릭
4. `extension/` 폴더 선택

## 4. 모바일 접속

서버와 같은 Wi-Fi에 연결 후 브라우저에서 접속합니다.

```
http://서버IP:8080
```

서버 IP는 서버 실행 시 콘솔에 출력됩니다.
EOF

echo ""
echo "✅ 빌드 완료! dist/ 폴더를 Windows로 옮겨서 사용하세요."
echo ""
