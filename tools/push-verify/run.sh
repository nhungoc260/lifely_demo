#!/usr/bin/env bash
# Kiểm chứng Web Push và logic ngưỡng sàng lọc mà KHÔNG cần Maven: biên dịch các lớp thuần Java của backend rồi đối chiếu
# với thư viện tham chiếu độc lập của Node (web-push, http_ece). Cần: JDK 17+ (javac), Node.js 18+, npm.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
src="$here/../../backend/src/main/java/com/lifely"
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
export OUT_PURE="$work/pure" OUT_STUBS="$work/stubs-out"
mkdir -p "$OUT_PURE" "$OUT_STUBS"

echo "== biên dịch các lớp thuần (không cần Spring/Lombok)"
javac -d "$OUT_PURE" "$src"/push/WebPushCrypto.java "$src"/screening/ScreeningRules.java "$src"/screening/ScreeningEvaluator.java \
      "$src"/screening/RejoinPolicy.java "$here"/src/Harness.java "$here"/src/PureCheck.java
javac -d "$OUT_STUBS" "$here"/stubs/org/slf4j/*.java "$here"/stubs/org/springframework/stereotype/*.java \
      "$here"/stubs/com/lifely/push/PushProperties.java "$src"/push/WebPushCrypto.java "$src"/push/WebPushSender.java "$here"/src/SenderProbe.java

echo "== cài thư viện tham chiếu (npm)"
cd "$here" && npm install --no-audit --no-fund --silent

echo "== 1/3 ngưỡng sàng lọc + giãn cách (Java thuần)"
java -Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8 -cp "$OUT_PURE" PureCheck | tail -2
echo "== 2/3 mã hóa RFC 8291 + chữ ký VAPID đối chiếu http_ece / web-push"
node verify.js | tail -3
echo "== 3/3 WebPushSender đầu-cuối với dịch vụ push giả"
node sender_e2e.js | tail -3
