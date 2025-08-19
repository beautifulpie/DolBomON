// index.js
require('dotenv').config();
const express = require('express');
const mqtt = require('mqtt');
const axios = require('axios');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(express.json());
app.use(cors());

// DB(간단 로그/기기 테이블)
const db = new sqlite3.Database('./dolbomon.db');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS devices(
    id TEXT PRIMARY KEY, type TEXT, location TEXT, meta TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS events(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts DATETIME DEFAULT CURRENT_TIMESTAMP,
    deviceId TEXT, event TEXT, value TEXT
  )`);
});

// MQTT 연결
const client = mqtt.connect(process.env.MQTT_URL);
client.on('connect', () => {
  console.log('MQTT connected');
  // Zigbee2MQTT 예: zigbee2mqtt/+/set, zigbee2mqtt/+
  client.subscribe('zigbee2mqtt/+');
  client.subscribe('dolbomon/sensor/+');     // ESP32 센서 이벤트
  client.subscribe('dolbomon/cmd/+');        // 테스트용
});
client.on('message', (topic, msg) => {
  const payload = msg.toString();
  // 이벤트 저장
  db.run(`INSERT INTO events(deviceId, event, value) VALUES(?,?,?)`,
    [topic, 'msg', payload]);

  // 간단한 이상 감지 룰
  if (topic.includes('gas') && payload.includes('ALERT')) {
    sendAlert('가스 이상 감지', { topic, payload });
    safetyActions();
  }
  if (topic.includes('fall') && payload.includes('ALERT')) {
    sendAlert('낙상 의심 감지', { topic, payload });
    safetyActions();
  }
});

// 보호자 알림(웹훅 예시)
async function sendAlert(title, data) {
  try {
    await axios.post(process.env.ALERT_WEBHOOK, { title, data });
    console.log('Alert sent:', title);
  } catch (e) {
    console.error('Alert failed', e.message);
  }
}

// 안전 동작(야간 저밝기 점등 등)
function safetyActions() {
  // 예: 거실 조명 ON
  client.publish('zigbee2mqtt/living_light/set', JSON.stringify({ state: "ON", brightness: 100 }));
}

// 디바이스 등록/조회/제어 API
app.post('/api/devices', (req, res) => {
  const { id, type, location, meta } = req.body;
  db.run(`INSERT OR REPLACE INTO devices(id,type,location,meta) VALUES(?,?,?,?)`,
    [id, type, location, JSON.stringify(meta || {})],
    err => err ? res.status(500).json({ error: err.message }) : res.json({ ok: true })
  );
});
app.get('/api/devices', (req, res) => {
  db.all(`SELECT * FROM devices`, [], (err, rows) =>
    err ? res.status(500).json({ error: err.message }) : res.json(rows));
});
app.post('/api/control', (req, res) => {
  const { id, command } = req.body; // id 예: zigbee2mqtt/living_light
  client.publish(`${id}/set`, JSON.stringify(command));
  res.json({ ok: true });
});

// 간단 NLU(규칙 기반)
function parseKoreanCommand(text) {
  const t = text.replace(/\s/g, '');
  // 장소
  const place = /거실|안방|침실|부엌|현관|욕실/.exec(t)?.[0] || '거실';
  // 기기/행동
  if (t.includes('불켜') || t.includes('조명켜')) return { intent: 'LIGHT_ON', place };
  if (t.includes('불꺼') || t.includes('조명꺼')) return { intent: 'LIGHT_OFF', place };
  if (t.includes('비상') || t.includes('도와줘') || t.includes('살려줘')) return { intent: 'EMERGENCY' };
  if (t.includes('라디오켜') || t.includes('라디오틀어')) return { intent: 'RADIO_ON' };
  if (t.includes('라디오꺼')) return { intent: 'RADIO_OFF' };
  return { intent: 'UNKNOWN' };
}

function placeToTopic(place) {
  switch (place) {
    case '거실': return 'zigbee2mqtt/living_light';
    case '안방':
    case '침실': return 'zigbee2mqtt/bed_light';
    case '부엌': return 'zigbee2mqtt/kitchen_light';
    default: return 'zigbee2mqtt/living_light';
  }
}

// 음성 명령 처리 API
app.post('/api/voice', (req, res) => {
  const { text } = req.body;
  const { intent, place } = parseKoreanCommand(text || '');
  if (intent === 'LIGHT_ON') {
    client.publish(`${placeToTopic(place)}/set`, JSON.stringify({ state: "ON" }));
    return res.json({ reply: `${place} 불을 켰습니다.` });
  }
  if (intent === 'LIGHT_OFF') {
    client.publish(`${placeToTopic(place)}/set`, JSON.stringify({ state: "OFF" }));
    return res.json({ reply: `${place} 불을 껐습니다.` });
  }
  if (intent === 'EMERGENCY') {
    sendAlert('비상 호출', { by: 'voice' });
    safetyActions();
    return res.json({ reply: '비상 연락을 진행합니다. 잠시만 기다려 주세요.' });
  }
  return res.json({ reply: '지금은 잘 이해하지 못했어요. 다시 한 번 말씀해 주세요.' });
});

app.listen(process.env.PORT, () => console.log('Hub API on', process.env.PORT));