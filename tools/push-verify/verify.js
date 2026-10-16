const crypto = require('crypto'), { execFileSync } = require('child_process'), ece = require('http_ece'), webpush = require('web-push');
const b64 = b => Buffer.from(b).toString('base64url');
let pass = 0, fail = 0;
const ok = (name, cond, extra='') => { (cond ? pass++ : fail++); console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' ' + extra : '')); };
const java = (...args) => execFileSync('java', ['-cp', process.env.OUT_PURE, 'Harness', ...args], { encoding: 'utf8' }).trim();

// 1. Mã hóa: nhiều nội dung, gồm tiếng Việt có dấu và nội dung dài
for (const text of ['Xin chào', 'LIFELY: Cần máu O+ tại Bệnh viện Chợ Rẫy. Mở ứng dụng để phản hồi.', JSON.stringify({title:'Nhắc hiến máu', body:'Bạn đã có thể hiến máu lại', url:'/donor/health'}), 'x'.repeat(3900)]) {
  const ua = crypto.createECDH('prime256v1'); ua.generateKeys();
  const auth = crypto.randomBytes(16);
  const body = Buffer.from(java('enc', b64(ua.getPublicKey()), b64(auth), Buffer.from(text, 'utf8').toString('base64')), 'base64url');
  let plain = null;
  try { plain = ece.decrypt(body, { version: 'aes128gcm', privateKey: ua, authSecret: auth }).toString('utf8'); } catch (e) { plain = 'ERR ' + e.message; }
  ok('decrypt bằng http_ece khớp (' + text.length + ' ký tự)', plain === text, plain === text ? '' : plain.slice(0, 80));
}
// 2. Cấu trúc header RFC 8291
{
  const ua = crypto.createECDH('prime256v1'); ua.generateKeys(); const auth = crypto.randomBytes(16);
  const body = Buffer.from(java('enc', b64(ua.getPublicKey()), b64(auth), Buffer.from('hi').toString('base64')), 'base64url');
  ok('rs = 4096', body.readUInt32BE(16) === 4096);
  ok('idlen = 65 và khóa bắt đầu 0x04', body[20] === 65 && body[21] === 4);
}
// 3. Giải mã sai khóa thì phải lỗi (không "giải mã được" bằng khóa khác)
{
  const ua = crypto.createECDH('prime256v1'); ua.generateKeys(); const other = crypto.createECDH('prime256v1'); other.generateKeys(); const auth = crypto.randomBytes(16);
  const body = Buffer.from(java('enc', b64(ua.getPublicKey()), b64(auth), Buffer.from('bí mật').toString('base64')), 'base64url');
  let threw = false; try { ece.decrypt(body, { version: 'aes128gcm', privateKey: other, authSecret: auth }); } catch (e) { threw = true; }
  ok('khóa sai không giải mã được', threw);
}
// 4. VAPID: Node xác minh chữ ký ES256 do Java tạo
{
  const keys = webpush.generateVAPIDKeys();
  const hdr = java('vapid', keys.privateKey, keys.publicKey, 'https://fcm.googleapis.com', 'mailto:demo@example.invalid');
  const m = /^vapid t=([^,]+), k=(.+)$/.exec(hdr);
  ok('định dạng header vapid t=..., k=...', !!m);
  const [h, c, s] = m[1].split('.');
  const pub = crypto.createPublicKey({ key: Buffer.concat([Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200', 'hex'), Buffer.from(m[2], 'base64url')]), format: 'der', type: 'spki' });
  const valid = crypto.verify('sha256', Buffer.from(h + '.' + c), { key: pub, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url'));
  ok('chữ ký JWT ES256 hợp lệ', valid);
  ok('k trùng khóa công khai', m[2] === keys.publicKey);
  const claims = JSON.parse(Buffer.from(c, 'base64url').toString());
  ok('claims aud/sub/exp đúng', claims.aud === 'https://fcm.googleapis.com' && claims.sub === 'mailto:demo@example.invalid' && claims.exp > Date.now()/1000);
  ok('chữ ký 64 byte', Buffer.from(s, 'base64url').length === 64);
}
console.log(`\n${pass} đạt, ${fail} lỗi`); process.exit(fail ? 1 : 0);
