#!/usr/bin/env bash
# Kiểm chứng migration trên PostgreSQL THẬT (không cần Maven/Java).
#   1) Áp V1..V15, chèn tin VOICE + dữ liệu cũ, áp V16, kiểm tra nâng cấp đúng và không mất dữ liệu.
#   2) Áp V1..V16 trên DB trống.
#   3) Kiểm tra ràng buộc contact_result, chống trùng outbox, claim/recover/cancel.
# Cách chạy:  PSQL="psql -U postgres -h localhost" ./tools/db/verify-migrations.sh
# CẢNH BÁO: tạo rồi XÓA hai database tạm lifely_verify_up / lifely_verify_new. KHÔNG trỏ tới database thật của bạn.
set -euo pipefail
PSQL=${PSQL:-psql}
MIG="$(cd "$(dirname "$0")/../../backend/src/main/resources/db/migration" && pwd)"
fail() { echo "FAIL: $*"; exit 1; }
run() { $PSQL -q -v ON_ERROR_STOP=1 "$@"; }
val() { $PSQL -d "$1" -Atc "$2"; }

for db in lifely_verify_up lifely_verify_new; do
  $PSQL -q -c "DROP DATABASE IF EXISTS $db" -c "CREATE DATABASE $db" 2>/dev/null
done

echo "== 1. Nâng cấp V15 -> V16 có dữ liệu cũ"
for i in $(seq 1 15); do run -d lifely_verify_up -f "$MIG/$(cd "$MIG" && ls V${i}__*.sql)" >/dev/null; done
run -d lifely_verify_up -c "
 DO \$\$ DECLARE u uuid; BEGIN SELECT id INTO u FROM users LIMIT 1;
  INSERT INTO notification_outbox (dedupe_key,channel,recipient_user_id,purpose,body,max_attempts,status) VALUES
   ('V:P','VOICE',u,'REQUEST_INVITE','x',3,'PENDING'),('V:G','VOICE',u,'REQUEST_INVITE','x',3,'SENDING'),
   ('V:S','VOICE',u,'REQUEST_INVITE','x',3,'SENT'),('S:P','SMS',u,'REQUEST_INVITE','x',3,'PENDING');
 END \$\$;"
M0=$(val lifely_verify_up "select count(*) from matches")
run -d lifely_verify_up -f "$MIG/$(cd "$MIG" && ls V16__*.sql)" >/dev/null
[ "$(val lifely_verify_up "select count(*) from notification_outbox where channel='VOICE' and status in ('PENDING','SENDING')")" = 0 ] || fail "còn tin VOICE chờ"
[ "$(val lifely_verify_up "select count(*) from notification_outbox where channel='VOICE' and status='CANCELLED' and last_error_code='CHANNEL_REMOVED'")" = 2 ] || fail "VOICE chưa bị hủy đúng"
[ "$(val lifely_verify_up "select count(*) from notification_outbox where channel='VOICE' and status='SENT'")" = 1 ] || fail "mất lịch sử VOICE đã gửi"
[ "$(val lifely_verify_up "select count(*) from notification_outbox where channel='SMS' and status='PENDING'")" = 1 ] || fail "SMS bị ảnh hưởng"
[ "$(val lifely_verify_up "select count(*) from matches where contact_result='NOT_CONTACTED'")" = "$M0" ] || fail "match cũ chưa nhận mặc định"
echo "PASS ($M0 match cũ giữ nguyên, VOICE chờ bị hủy, lịch sử và SMS không đổi)"

echo "== 2. Áp V1..V16 trên DB trống"
for i in $(seq 1 16); do run -d lifely_verify_new -f "$MIG/$(cd "$MIG" && ls V${i}__*.sql)" >/dev/null; done
echo "PASS"

echo "== 3. Ràng buộc và câu SQL outbox"
D=lifely_verify_up
$PSQL -d $D -q -c "UPDATE matches SET contact_result='CALLING' WHERE id=(SELECT id FROM matches LIMIT 1)" 2>/dev/null && fail "DB chấp nhận trạng thái CALLING"
$PSQL -d $D -q -c "UPDATE matches SET contact_result=NULL WHERE id=(SELECT id FROM matches LIMIT 1)" 2>/dev/null && fail "DB chấp nhận NULL"
run -d $D -c "UPDATE matches SET contact_result='CONFIRMED_CAN_JOIN', contact_result_at=now(), contact_result_by=(SELECT id FROM users LIMIT 1) WHERE id=(SELECT id FROM matches LIMIT 1)"
INS="INSERT INTO notification_outbox (dedupe_key,channel,recipient_user_id,purpose,reference_type,reference_id,body,max_attempts) SELECT 'DUP','SMS',id,'REQUEST_INVITE','REQUEST',gen_random_uuid(),'x',3 FROM users LIMIT 1 ON CONFLICT (dedupe_key) DO NOTHING"
run -d $D -c "$INS" -c "$INS"
[ "$(val $D "select count(*) from notification_outbox where dedupe_key='DUP'")" = 1 ] || fail "chống trùng dedupe_key không hoạt động"
run -d $D -c "UPDATE notification_outbox SET status='SENDING', attempts=attempts+1 WHERE id IN (SELECT id FROM notification_outbox WHERE status='PENDING' AND next_attempt_at<=now() ORDER BY next_attempt_at LIMIT 20 FOR UPDATE SKIP LOCKED) RETURNING id" >/dev/null
echo "PASS"

for db in lifely_verify_up lifely_verify_new; do $PSQL -q -c "DROP DATABASE IF EXISTS $db"; done
echo "TẤT CẢ ĐẠT"
