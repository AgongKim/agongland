# 아공랜드 채팅

유튜브 시청 중 같은 네트워크 사용자들과 실시간으로 채팅할 수 있는 서비스입니다.  
크롬 익스텐션(PC)과 웹 클라이언트(모바일)를 지원합니다.

---

## 구조

```
서버 (Node.js)  ←→  크롬 익스텐션 (PC 유튜브 오버레이)
                ←→  웹 클라이언트 (모바일 브라우저)
```

---

## 파일 구조

```
agongland/
├── build.sh                    # Mac/Linux 빌드 스크립트 (exe + 익스텐션 패키징)
│
├── server/                     # Node.js 서버
│   ├── index.js                # 진입점 — HTTP/WS 서버 설정, 연결 관리(join/close)
│   ├── lib/
│   │   ├── network.js          # 로컬 IP 조회(getLocalIP), 내부망 검증(isPrivateIP)
│   │   ├── state.js            # 공유 상태 — clients Set, songs/recommendations 배열, ID 시퀀스
│   │   └── broadcast.js        # broadcastAll(전체 전송), sanitize(XSS 방지)
│   ├── handlers/
│   │   ├── chat.js             # chat 메시지 처리
│   │   ├── songs.js            # song:add/join/edit/delete/move/list:request 처리
│   │   └── recs.js             # rec:add/edit/delete/like/list:request 처리
│   └── public/
│       └── index.html          # 모바일 웹 클라이언트
│
└── extension/                  # 크롬 익스텐션
    ├── manifest.json           # 익스텐션 설정 (권한, content_scripts 로드 순서)
    ├── background.js           # Service Worker — WebSocket 연결 유지, 탭 간 메시지 중계
    ├── styles.css              # 채팅 패널 스타일
    └── src/                    # Content Script 모듈 (유튜브 페이지에 주입)
        ├── state.js            # 공유 변수 — port, nickname, cachedIP
        ├── network.js          # WebRTC로 로컬 IP 감지(getLocalIP)
        ├── nickname.js         # 닉네임 저장/불러오기/변경 (chrome.storage)
        ├── songs.js            # 노래목록 렌더링 및 액션 처리
        ├── recs.js             # 노래추천 렌더링 및 액션 처리
        ├── chat.js             # 채팅 메시지 전송/표시
        ├── panel.js            # UI 빌드, 패널 토글, QR, 탭 전환
        ├── connection.js       # Background와 연결(connectToBackground), 메시지 수신 라우팅
        └── main.js             # 진입점 — 초기화(init), IP·닉네임 로드 후 UI 구동
```

---

## 개발 환경 실행

### 사전 요구사항
- Node.js 18 이상

### 서버 실행
```bash
cd server
npm install
npm start
```

서버가 시작되면 접속 주소가 출력됩니다.
```
채팅 서버 실행 중
  로컬:    ws://localhost:8080
  내부망:  ws://192.168.x.x:8080
```

### 크롬 익스텐션 설치
1. 크롬 주소창에 `chrome://extensions` 입력
2. 우측 상단 **개발자 모드** 활성화
3. **압축 해제된 확장 프로그램 로드** 클릭
4. `extension/` 폴더 선택

### 모바일 웹 클라이언트
같은 네트워크에서 브라우저로 접속합니다.
```
http://192.168.x.x:8080
```

---

## Windows 배포

Mac/Linux 환경에서 빌드 스크립트를 실행합니다.

```bash
./build.sh
```

`dist/` 폴더가 생성됩니다. 폴더 전체를 Windows PC로 옮긴 후 `dist/README.md`의 안내를 따르세요.

---

## 사용 방법

### PC (크롬 익스텐션)
1. 서버 실행 후 유튜브에서 영상 재생
2. 화면 우측에 채팅 패널이 자동으로 표시됩니다
3. 닉네임 입력 후 채팅 시작
4. `◀` 버튼으로 패널을 접고 펼칠 수 있습니다

### 모바일
1. 서버와 같은 Wi-Fi에 연결
2. 브라우저에서 `http://서버IP:8080` 접속
3. 닉네임 입력 후 채팅 시작

---

## 주의사항

- 서버와 클라이언트는 **같은 네트워크(내부망)** 에서만 연결 가능합니다
- 익스텐션을 새로고침한 경우 유튜브 페이지도 새로고침해야 합니다
- 서버 IP가 변경된 경우(네트워크 변경 등) 유튜브 페이지를 새로고침하면 자동으로 재감지됩니다
