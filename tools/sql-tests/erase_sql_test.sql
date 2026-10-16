\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on
BEGIN;
CREATE TEMP TABLE t AS SELECT d.id donor, d.user_id uid, (SELECT id FROM organizations WHERE verification_status='VERIFIED' LIMIT 1) org FROM donor_profiles d JOIN users u ON u.id=d.user_id WHERE u.status='ACTIVE' LIMIT 1;
INSERT INTO donation_slots(organization_id,starts_at,ends_at,capacity,booked_count) SELECT org, now()+interval '40 days', now()+interval '40 days 1 hour', 3, 2 FROM t;
CREATE TEMP TABLE s AS SELECT id FROM donation_slots WHERE starts_at > now()+interval '39 days' AND booked_count=2 AND capacity=3 LIMIT 1;
INSERT INTO appointments(slot_id,donor_id) SELECT (SELECT id FROM s), donor FROM t;
INSERT INTO health_data_consents(user_id,granted) SELECT uid,true FROM t ON CONFLICT (user_id) DO UPDATE SET granted=true;
INSERT INTO donor_health_checks(donor_id,heart_rate) SELECT donor,70 FROM t;
INSERT INTO push_subscriptions(user_id,endpoint,p256dh,auth) SELECT uid,'https://fcm.googleapis.com/fcm/send/erase-test','k','a' FROM t;
INSERT INTO notification_consents(user_id,channel,granted) SELECT uid,'PUSH',true FROM t ON CONFLICT (user_id,channel) DO UPDATE SET granted=true;
INSERT INTO notification_outbox(dedupe_key,channel,recipient_user_id,purpose,body) SELECT 'ERASE:T','PUSH',uid,'X','x' FROM t;
UPDATE donor_profiles SET gender='FEMALE', rejoin_reminded_for=current_date WHERE id=(SELECT donor FROM t);
-- === câu lệnh của UserDataExtras.erase() ===
WITH c AS (UPDATE appointments a SET status='CANCELLED', cancelled_at=now() FROM donor_profiles d WHERE a.donor_id=d.id AND d.user_id=(SELECT uid FROM t) AND a.status='BOOKED' RETURNING a.slot_id)
UPDATE donation_slots s SET booked_count = GREATEST(s.booked_count - x.n, 0) FROM (SELECT slot_id, count(*)::int AS n FROM c GROUP BY slot_id) x WHERE s.id=x.slot_id;
DELETE FROM donor_health_checks WHERE donor_id IN (SELECT id FROM donor_profiles WHERE user_id=(SELECT uid FROM t));
DELETE FROM health_data_consents WHERE user_id=(SELECT uid FROM t);
DELETE FROM push_subscriptions WHERE user_id=(SELECT uid FROM t);
DELETE FROM notification_outbox WHERE recipient_user_id=(SELECT uid FROM t);
DELETE FROM notification_consents WHERE user_id=(SELECT uid FROM t);
UPDATE donor_profiles SET gender='UNSPECIFIED', rejoin_reminded_for=NULL WHERE user_id=(SELECT uid FROM t);
-- === kiểm tra kết quả ===
SELECT 'chỗ khung giờ sau khi xóa: booked_count='||booked_count||' (kỳ vọng 1: đã trả 1 chỗ)' FROM donation_slots WHERE id=(SELECT id FROM s);
SELECT 'lịch hẹn đã chuyển sang: '||status FROM appointments WHERE slot_id=(SELECT id FROM s);
SELECT 'còn dữ liệu sức khỏe: '||(SELECT count(*) FROM donor_health_checks WHERE donor_id=(SELECT donor FROM t))||', consent: '||(SELECT count(*) FROM health_data_consents WHERE user_id=(SELECT uid FROM t))||', push: '||(SELECT count(*) FROM push_subscriptions WHERE user_id=(SELECT uid FROM t))||', kênh: '||(SELECT count(*) FROM notification_consents WHERE user_id=(SELECT uid FROM t))||', outbox: '||(SELECT count(*) FROM notification_outbox WHERE recipient_user_id=(SELECT uid FROM t))||' (kỳ vọng toàn 0)';
SELECT 'giới tính sau xóa: '||gender FROM donor_profiles WHERE id=(SELECT donor FROM t);
ROLLBACK;
