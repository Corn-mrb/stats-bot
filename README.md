# 통계 봇 (Stats Bot)

디스코드 서버의 이모지 및 메시지 통계를 추적하는 봇입니다.

## 기능

### 이모지 추적
- ✅ 서버 커스텀 이모지만 추적 (유니코드 이모지 제외)
- ✅ 메시지/리액션 따로 집계 + 합산 통계
- ✅ 유저별 이모지 사용 통계 (1~30일, 기본: 오늘)
- ✅ 서버 전체 이모지 랭킹 TOP 10
- ✅ 봇 이모지 사용은 제외

### 메시지 추적
- ✅ 유저별 메시지 수 통계 (1~30일, 기본: 오늘)
- ✅ 채널별 메시지 수 TOP 10
- ✅ 봇 메시지는 제외

### 데이터 관리
- ✅ 30일 지난 데이터 자동 삭제 (매일 자정)

## 설치

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정

`.env.example` 파일을 `.env`로 복사하고 값을 입력하세요:

```bash
cp .env.example .env
nano .env
```

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
```

### 3. 봇 권한

봇에게 다음 권한이 필요합니다:
- Read Messages/View Channels
- Send Messages
- Read Message History
- Add Reactions
- Use External Emojis

**중요: Discord Developer Portal에서 MESSAGE CONTENT INTENT를 반드시 켜야 합니다!**

봇 초대 URL:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=412317240384&scope=bot%20applications.commands
```

## 실행

### PM2로 실행 (권장)
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 직접 실행
```bash
npm start
```

### 로그 확인
```bash
pm2 logs stats-bot
```

### 재시작
```bash
pm2 restart stats-bot
```

### 중지
```bash
pm2 stop stats-bot
```

## 사용법

### 슬래시 커맨드

**`/emoji_user @유저명 [시작일] [종료일]`** (본인만 보임)
- 특정 유저의 이모지 사용 TOP 10 조회
- 시작일/종료일: 1~30 (기본: 1 = 오늘)
- 예시:
  - `/emoji_user @Mr.b` → 오늘 하루
  - `/emoji_user @Mr.b 시작일:7 종료일:1` → 7일간
  - `/emoji_user @Mr.b 시작일:3 종료일:3` → 3일 전 하루

**`/message_stats @유저명 [시작일] [종료일]`** (본인만 보임)
- 특정 유저의 메시지 통계 조회
- 시작일/종료일: 1~30 (기본: 1 = 오늘)
- 총 메시지 수 + 채널별 TOP 10
- 예시:
  - `/message_stats @Mr.b` → 오늘 하루
  - `/message_stats @Mr.b 시작일:7 종료일:1` → 7일간

**`/emoji_top [시작일] [종료일]`** (모두에게 보임)
- 서버 전체 이모지 랭킹 TOP 10 조회
- 시작일/종료일: 1~30 (기본: 1 = 오늘)
- 예시:
  - `/emoji_top` → 오늘 하루
  - `/emoji_top 시작일:7 종료일:1` → 7일간

### 자동 기능

**데이터 정리**
- 매일 자정 00:00 자동 실행
- 30일 지난 데이터 자동 삭제

## 날짜 계산 방식

- **1 = 오늘** (00:00 ~ 23:59)
- **2 = 어제** (00:00 ~ 23:59)
- **7 = 7일 전** (00:00 ~ 23:59)
- 시작일 >= 종료일 형태
- 예: 시작일=7, 종료일=1 → 7일 전부터 오늘까지 (7일간)

## 데이터 관리

- SQLite 데이터베이스: `stats.db`
- 최대 30일간의 데이터 보관
- 매일 자정 자동 정리

## 문제 해결

### 슬래시 커맨드가 안 보여요
```bash
pm2 restart stats-bot
```
최대 1시간 정도 기다려야 할 수 있습니다.

### 이모지/메시지가 추적 안 돼요
1. Discord Developer Portal → Bot → MESSAGE CONTENT INTENT 켜져 있는지 확인
2. 봇에게 채널 보기/메시지 읽기 권한이 있는지 확인
3. 봇이 온라인 상태인지 확인
4. 봇 실행 후부터만 추적됩니다 (과거 메시지 추적 안 함)

### 로그 확인
```bash
pm2 logs stats-bot --lines 50
```

메시지 작성 시 이렇게 나와야 정상:
```
📝 Tracked message from 유저명: 0 emoji(s)
```

### DB 파일 위치
```
stats-bot/stats.db
```

## 라이선스

MIT
