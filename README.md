# 돌봄온(DolbomON) — 노인 맞춤형 IoT 홈 셋팅 & 대화형 UI 서비스(MVP)

정영우9272님, 제안서·데모용으로 바로 사용할 수 있는 README 초안을 마크다운으로 정리했습니다. 저장소 루트에 README.md로 저장해 활용하세요.

---

## 개요
돌봄온은 노인의 안전·편의·건강을 돕는 방문형 IoT 홈 셋팅 서비스의 MVP입니다. 로컬 허브(Node.js), 메시징(MQTT), 엣지 디바이스(ESP32/Zigbee), 대화형 음성 UI(브라우저), 보호자 알림(웹훅/SMS)을 최소 구성으로 구현합니다.

- 핵심 가치: 말 한마디로 켜지는 안심, 설치형 토탈 케어, 오프라인 우선 비상 동작
- 주요 기능: 조명 제어, 비상 호출, 낙상/가스 이상 감지, 보호자 알림, 이벤트 대시보드

---

## 아키텍처
- 허브 서버: Node.js(Express) + MQTT + SQLite — REST API/대시보드 제공
- 메시징: Mosquitto MQTT 브로커
- 디바이스: Zigbee2MQTT(선택), ESP32 센서/버튼(MQTT)
- 음성 UI: 브라우저(Web Speech API) → 허브 /api/voice
- 알림: 웹훅(슬랙/노션 등), 선택적 SMS(NCP SENS)

---

## 디렉터리 구조
```
dolbomon/
├─ docker-compose.yml
├─ .env
├─ mqtt/
│  └─ mosquitto.conf
├─ hub/
│  ├─ package.json
│  └─ index.js          # API, MQTT, 간이 NLU, 대시보드
├─ z2m/                 # Zigbee2MQTT(선택)
│  └─ configuration.yaml
├─ web-voice/
│  └─ index.html        # 브라우저 음성 콘솔
└─ esp32/
   ├─ boot.py
   └─ main.py
```

---

## 빠른 시작(도커 권장)
1. 환경 설정(.env 예시)
   ```
   MQTT_URL=mqtt://mqtt:1883
   PORT=8080
   ALERT_WEBHOOK=https://webhook.site/your-url
   SENS_ACCESS_KEY=
   SENS_SECRET_KEY=
   SENS_SERVICE_ID=
   SENS_CALLING_NUMBER=
   ALERT_MOBILE=
   ```
2. 서비스 기동
   ```
   docker compose up -d
   ```
3. 접속 경로
   - 대시보드: http://localhost:8080/dashboard
   - 이벤트 API: http://localhost:8080/api/events?limit=50
   - 헬스 체크: http://localhost:8080/api/health
4. 음성 콘솔
   - web-voice/index.html 열기 → “거실 불 켜줘”, “비상이야” 등 발화 테스트

---

## 주요 기능
- 음성 제어: “거실 불 켜줘/꺼줘”, “비상/도와줘/살려줘”
- 안전 감지: ESP32 비상 버튼·가스 센서 ALERT, Zigbee 이벤트 수집
- 보호자 알림: 웹훅 기본, 선택적 SMS 연동
- 대시보드: 최근 이벤트 테이블(설치/시연용 간단 뷰)

---

## API 요약
- POST /api/voice
  - 입력: { "text": "거실 불 켜줘" }
  - 출력: { "reply": "거실 불을 켰습니다." }
- POST /api/control
  - 입력: { "id": "zigbee2mqtt/living_light", "command": { "state": "ON" } }
- GET /api/events?limit=200 — 최근 이벤트
- GET/POST /api/devices — 장치 조회/등록

---

## Zigbee2MQTT(선택)
- USB 동글 연결 후 z2m/configuration.yaml의 serial.port를 실제 포트로 설정
- 페어링 완료 시 토픽 예: `zigbee2mqtt/living_light` → `/set` 명령으로 제어

---

## ESP32 예시(마이크로파이썬)
- boot.py: Wi‑Fi 연결
- main.py: PIR/가스/비상버튼 → MQTT 게시, 로컬 부저/LED 경보
- `MQTT_HOST`를 허브(도커 호스트) IP로 설정

---

## 보안·프라이버시 가이드
- 운영 전환: MQTT 계정/비밀번호 적용, 허브 API 토큰화
- 센서 우선순위: 비영상(레이더/PIR) 우선, 카메라는 선택 옵션
- 데이터: 알림·로그 보존 기간과 동의 범위 명시

---

## 테스트 시나리오
- 음성: “거실 불 켜줘/꺼줘”, “비상이에요/도와줘/살려줘”
- 버튼: ESP32 비상 버튼 → 웹훅/대시보드 ALERT 확인
- 가스: 임계값 초과 → ALERT 로그, 안전동작(저밝기 조명 점등)

---

## 로드맵(요약)
1. 기획·요구정의 → 고객·현장 인터뷰, 설치/보안 표준 수립  
2. 설계·조달 → 기기 구성 확정, 오프라인 핵심 명령 결정, 벤더 검증  
3. 개발·내부검증 → MVP 구현, 오탐/미탐 기준선 설정  
4. 파일럿1(10가구) → 설치·교육, 지표 수집·튜닝  
5. 고도화/운영 → 원격 진단, 요금제·약관, 매뉴얼 정비  
6. 파일럿2(50가구) → 레퍼런스 확보, B2B/B2G 영업  
7. 상용/스케일업 → 채널 확장, 단위경제성 검증

---

## 트러블슈팅
- 음성 인식 불가: 브라우저 마이크 권한, HTTPS 환경 권장
- MQTT 연결 실패: 1883 포트/방화벽, MQTT_URL 확인
- Zigbee 제어 불가: 페어링·토픽 경로(…/set) 확인
- CORS 이슈: 허브 CORS 활성화, 동일 호스트/포트 사용 권장

---

## 라이선스/고지
본 코드는 제안·파일럿 데모 목적의 예시이며, 상용 배포 전 보안·안정성 검증이 필요합니다. 외부 서비스(SMS/웹훅) 사용 시 해당 약관을 준수하십시오.

---

필요하시면 본 README를 발표용 한 장 요약, 영문 버전, 또는 이미지 인포그래픽 포함 버전으로도 변환해 드리겠습니다.
