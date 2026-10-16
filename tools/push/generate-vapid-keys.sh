#!/usr/bin/env bash
# Sinh cặp khóa VAPID (miễn phí) cho Web Push. Không ghi gì vào file; in ra màn hình để bạn tự đặt vào biến môi trường.
# KHÔNG commit khóa riêng. Yêu cầu Node.js (đã có sẵn khi chạy frontend).
set -euo pipefail
node -e '
const c = require("crypto");
const e = c.createECDH("prime256v1"); e.generateKeys();
const b = x => Buffer.from(x).toString("base64url");
console.log("VAPID_PUBLIC_KEY=" + b(e.getPublicKey()));
console.log("VAPID_PRIVATE_KEY=" + b(e.getPrivateKey()));
console.log("VAPID_SUBJECT=mailto:ban@example.com   # đổi thành email liên hệ của nhóm");
console.log("NOTIFY_PUSH_ENABLED=true");
'
