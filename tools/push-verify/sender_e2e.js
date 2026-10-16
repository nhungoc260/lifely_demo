const http = require('http'), crypto = require('crypto'), { execFile } = require('child_process'), ece = require('http_ece'), webpush = require('web-push');
const b64 = b => Buffer.from(b).toString('base64url');
let pass = 0, fail = 0; const ok = (n, c, x='') => { (c ? pass++ : fail++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
const ua = crypto.createECDH('prime256v1'); ua.generateKeys(); const auth = crypto.randomBytes(16);
const vapid = webpush.generateVAPIDKeys();
const received = {};
const codes = { '/ok': 201, '/gone': 410, '/notfound': 404, '/limit': 429, '/down': 503, '/bad': 400 };
const server = http.createServer((req, res) => { const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => { received[req.url] = { headers: req.headers, body: Buffer.concat(chunks) }; res.statusCode = codes[req.url] || 500; res.end(); }); });
const probe = (path, payload) => new Promise(r => execFile('java', ['-cp', process.env.OUT_STUBS, 'SenderProbe', `http://127.0.0.1:${server.address().port}${path}`, b64(ua.getPublicKey()), b64(auth), vapid.publicKey, vapid.privateKey, Buffer.from(payload).toString('base64')], { encoding: 'utf8' }, (e, out) => r((out || '').trim())));
server.listen(0, '127.0.0.1', async () => {
  const payload = JSON.stringify({ title: 'Có người cần máu gần bạn', body: 'Nhóm O+ tại Bệnh viện A', url: '/donor/requests' });
  ok('201 => OK', (await probe('/ok', payload)).startsWith('OK 201'));
  ok('410 => GONE (xóa subscription)', (await probe('/gone', payload)).startsWith('GONE 410'));
  ok('404 => GONE', (await probe('/notfound', payload)).startsWith('GONE 404'));
  ok('429 => RETRY', (await probe('/limit', payload)).startsWith('RETRY 429'));
  ok('503 => RETRY', (await probe('/down', payload)).startsWith('RETRY 503'));
  ok('400 => FAIL (không thử lại)', (await probe('/bad', payload)).startsWith('FAIL 400'));
  const r = received['/ok'];
  ok('header Content-Encoding: aes128gcm', r.headers['content-encoding'] === 'aes128gcm');
  ok('có TTL và Urgency=high', r.headers['ttl'] === '86400' && r.headers['urgency'] === 'high');
  let plain = ''; try { plain = ece.decrypt(r.body, { version: 'aes128gcm', privateKey: ua, authSecret: auth }).toString('utf8'); } catch (e) { plain = 'ERR ' + e.message; }
  ok('dịch vụ push nhận được bản tin giải mã đúng', plain === payload);
  const m = /^vapid t=([^,]+), k=(.+)$/.exec(r.headers['authorization'] || '');
  ok('Authorization theo chuẩn VAPID', !!m && m[2] === vapid.publicKey);
  if (m) { const [h, c, s] = m[1].split('.'); const pub = crypto.createPublicKey({ key: Buffer.concat([Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200', 'hex'), Buffer.from(m[2], 'base64url')]), format: 'der', type: 'spki' });
    ok('chữ ký VAPID hợp lệ', crypto.verify('sha256', Buffer.from(h + '.' + c), { key: pub, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url')));
    ok('aud = nguồn của endpoint', JSON.parse(Buffer.from(c, 'base64url').toString()).aud === `http://127.0.0.1:${server.address().port}`); }
  // Chưa cấu hình khóa => không gửi
  const none = await new Promise(rs => execFile('java', ['-cp', process.env.OUT_STUBS, 'SenderProbe', 'http://127.0.0.1:1/x', b64(ua.getPublicKey()), b64(auth), '', '', Buffer.from('x').toString('base64')], { encoding: 'utf8' }, (e, out) => rs((out || '').trim())));
  ok('thiếu khóa VAPID => FAIL, không gửi gì', none.startsWith('FAIL 0 configured=false'), none);
  console.log(`\n${pass} đạt, ${fail} lỗi`); server.close(); process.exit(fail ? 1 : 0);
});
