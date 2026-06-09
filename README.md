# BRG XR Project

WebRTC 기반 원격 XR 지원 플랫폼입니다. PC 메인 화면과 모바일/웹뷰 클라이언트 간 **양방향 영상·오디오**, **실시간 캔버스 드로잉**, **채팅**을 제공합니다.

## 기술 스택

- **서버**: Node.js, Express, Socket.IO
- **미디어**: mediasoup (SFU), WebRTC
- **클라이언트**: HTML / JavaScript, jQuery, Literally Canvas
- **DB**: MongoDB (채널/세션)

## 프로젝트 구조

```
metaXR/
├── bin/www              # HTTP 서버 엔트리포인트
├── app.js               # Express 앱 설정
├── sfu/loopback.js      # mediasoup SFU (WebRTC 시그널링)
├── socket/              # Socket.IO (채팅, draw, room 이벤트)
├── routes/              # REST API (채널 매칭 등)
├── public/
│   ├── main_page.html       # PC 메인 화면 (송수신)
│   ├── webview_page.html    # 모바일/WebView 화면 (송수신)
│   ├── xr_mobielogin.html   # 모바일 로그인
│   └── javascripts/
│       ├── publish_mainpage.js   # 메인 Publish
│       ├── publish.js            # WebView Publish
│       ├── subscribe.js          # 메인 Subscribe (webview 영상 수신)
│       ├── subscribe_webview.js  # WebView Subscribe (main 영상 수신)
│       └── control_LC.JS         # 캔버스 드로잉 + Socket 제어
└── package.json
```

## 역할 분리

| 페이지 | Publish | Subscribe | 수신 대상 |
|---|---|---|---|
| `main_page` | `publish_mainpage.js` | `subscribe.js` | webview 카메라 (`wantRole: webview`) |
| `webview_page` | `publish.js` | `subscribe_webview.js` | main 카메라 (`wantRole: mainpage`) |

## Room Code (방 입장)

양쪽 클라이언트가 **동일한 room code**를 사용해야 연결됩니다.

| 입장 방식 | 설명 |
|---|---|
| 로그인 페이지 | API 인증 후 `sessionStorage.code` 저장 |
| URL 파라미터 | `webview_page.html?code=ROOM_ID` |
| Android WebView | `Android.getCode()` JS 브릿지 |

> room code 문자열이 정확히 같아야 합니다 (대소문자 포함).

### 소켓 채널

- **일반 Socket.IO** (`/`): 채팅, 캔버스 draw, ready 이벤트 → `join room`
- **WebRTC Socket.IO** (`/dynamic-{code숫자변환}`): mediasoup 영상/오디오

## 설치 및 실행

### 요구 사항

- Node.js 18+
- MongoDB (채널 API 사용 시)

### 설치

```bash
cd metaXR
npm install
```

### mediasoup-client 빌드 (필요 시)

```bash
npm run build-client
```

### 서버 실행

```bash
npm start
# 기본 포트: 3000
```

### 접속 URL

```
# PC 메인
http://<서버주소>:3000/main_page.html

# 모바일 / WebView
http://<서버주소>:3000/webview_page.html?code=ROOM_ID
```

## 주요 기능

### WebRTC 양방향 영상

- main ↔ webview 카메라/오디오 송수신
- 역할 기반 producer/consumer 라우팅 (`role`, `wantRole`)
- Android WebView extmap 충돌 패치 포함

### 실시간 캔버스 드로잉

- Literally Canvas 기반 펜/화살표/지우기
- Socket.IO `draw` 이벤트로 실시간 동기화
- **정규화 좌표 (`normalized-v1`)**: 화면 크기가 달라도 동일 위치에 표시
- `object-fit: contain` 영상 표시 영역 기준 좌표 보정

### 채팅

- Socket.IO `chat` 이벤트
- 메인 페이지 채팅 UI / 웹뷰 상단 알림

## 환경 변수

`.env` 파일 (선택):

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/metaxr
```

## 개발 참고

### 서버 로그 확인 포인트

```
-- produce role= mainpage / webview
-- consume wantRole= ...
-- produce --- kind= audio
-- resume -- kind=audio
```

### Android WebView 연동

```javascript
// 네이티브에서 room code 전달
window.Android.getCode()  // → sessionStorage.code
```

### iOS / 앱 패키징

- 웹 브라우저 접속: Xcode 불필요
- App Store 배포: WKWebView 래퍼 앱 + Xcode 필요
- 백엔드 서버는 Linux 등에서 그대로 운영

## 라이선스

Private — BRG XR Project
