\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on
-- kiểu tham số như pgjdbc gửi (int4 / int8)
PREPARE p1(bigint) AS SELECT (now() + ($1 * interval '1 second')) > now();
PREPARE p2(int)    AS SELECT (now() - ($1 * interval '1 minute')) < now();
PREPARE p3(int)    AS SELECT (now() + ($1 * interval '1 hour')) > now();
EXECUTE p1(60); EXECUTE p2(5); EXECUTE p3(24);
BEGIN;
-- dữ liệu thử
INSERT INTO notification_consents(user_id,channel,granted) SELECT id,'SMS',true FROM users WHERE email='donor@lifely.demo' ON CONFLICT (user_id,channel) DO UPDATE SET granted=true;
CREATE TEMP TABLE t_ids AS SELECT (SELECT id FROM users WHERE email='donor@lifely.demo') uid, (SELECT id FROM blood_requests WHERE status IN ('DONORS_CONTACTED','PARTIALLY_FULFILLED','MATCHING') AND deadline>now() LIMIT 1) rid;
SELECT 'uid ok: '||(uid IS NOT NULL)||', rid ok: '||(rid IS NOT NULL) FROM t_ids;
INSERT INTO notification_outbox(dedupe_key,channel,recipient_user_id,purpose,reference_type,reference_id,body)
  SELECT 'SMS:T1', 'SMS', uid, 'REQUEST_INVITE','REQUEST',rid,'x' FROM t_ids;
-- dedupe: lần 2 không thêm
WITH i AS (INSERT INTO notification_outbox(dedupe_key,channel,recipient_user_id,purpose,reference_type,reference_id,body)
  SELECT 'SMS:T1','SMS',uid,'REQUEST_INVITE','REQUEST',rid,'x' FROM t_ids ON CONFLICT (dedupe_key) DO NOTHING RETURNING 1)
SELECT 'dedupe chèn lại: '||count(*)||' dòng (kỳ vọng 0)' FROM i;
-- claim
WITH c AS (UPDATE notification_outbox SET status='SENDING', attempts=attempts+1
  WHERE id IN (SELECT id FROM notification_outbox WHERE status='PENDING' AND next_attempt_at<=now() ORDER BY next_attempt_at LIMIT 20 FOR UPDATE SKIP LOCKED)
 RETURNING id, channel, recipient_user_id, purpose, reference_type, reference_id, body, attempts, max_attempts, dedupe_key)
SELECT 'claim: '||count(*)||' dòng, attempts='||max(attempts) FROM c;
-- retry có delay
UPDATE notification_outbox SET status='PENDING', last_error_code='PROVIDER_EXCEPTION', next_attempt_at=now()+(30::bigint*interval '1 second') WHERE dedupe_key='SMS:T1';
SELECT 'sau retry: '||status||', còn chờ '||round(extract(epoch from next_attempt_at-now()))||'s' FROM notification_outbox WHERE dedupe_key='SMS:T1';
-- không được claim lại trước hạn
SELECT 'claim khi chưa tới hạn: '||count(*)||' (kỳ vọng 0)' FROM notification_outbox WHERE status='PENDING' AND next_attempt_at<=now();
-- hủy theo tham chiếu
WITH x AS (UPDATE notification_outbox SET status='CANCELLED', last_error_code='REFERENCE_CLOSED' WHERE reference_type='REQUEST' AND reference_id=(SELECT rid FROM t_ids) AND purpose='REQUEST_INVITE' AND status='PENDING' RETURNING 1) SELECT 'cancelPending (đang chờ retry): '||count(*)||' dòng' FROM x;
-- retryFailed
UPDATE notification_outbox SET status='FAILED' WHERE dedupe_key='SMS:T1';
WITH y AS (UPDATE notification_outbox o SET status='PENDING', attempts=0, next_attempt_at=now(), last_error_code=NULL WHERE o.reference_type='REQUEST' AND o.reference_id=(SELECT rid FROM t_ids) AND o.status='FAILED' AND EXISTS (SELECT 1 FROM blood_requests r WHERE r.id=o.reference_id AND r.deadline>now() AND r.status IN ('VERIFIED','MATCHING','DONORS_CONTACTED','PARTIALLY_FULFILLED')) RETURNING 1) SELECT 'retryFailed: '||count(*)||' dòng' FROM y;
-- summary
SELECT channel||'/'||status||'='||count(*) FROM notification_outbox WHERE reference_type='REQUEST' AND reference_id=(SELECT rid FROM t_ids) GROUP BY channel,status;
-- recoverStuck
UPDATE notification_outbox SET status='SENDING', attempts=1, updated_at=now()-interval '10 minutes' WHERE dedupe_key='SMS:T1';
-- trigger set_updated_at ghi đè updated_at → kiểm tra hành vi thật
SELECT 'updated_at sau UPDATE (trigger): '||(updated_at>now()-interval '1 minute') FROM notification_outbox WHERE dedupe_key='SMS:T1';
ROLLBACK;
