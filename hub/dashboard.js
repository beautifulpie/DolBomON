// dashboard.js (선택) — index.js에 추가 가능
app.get('/dashboard/events', (req, res) => {
  db.all(`SELECT ts, deviceId, event, value FROM events ORDER BY ts DESC LIMIT 200`, [], (err, rows) => {
    if (err) return res.status(500).send(err.message);
    const html = `
      <html><head><meta charset="utf-8"><title>돌봄온 이벤트</title>
      <style>body{font-family:sans-serif;padding:16px} table{border-collapse:collapse;width:100%}
      td,th{border:1px solid #ddd;padding:8px}</style></head><body>
      <h2>최근 이벤트</h2>
      <table><tr><th>시간</th><th>디바이스</th><th>이벤트</th><th>값</th></tr>
      ${rows.map(r=>`<tr><td>${r.ts}</td><td>${r.deviceId}</td><td>${r.event}</td><td>${r.value}</td></tr>`).join('')}
      </table></body></html>`;
    res.send(html);
  });
});