\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on
BEGIN;
-- 3 donor thử: nam, nữ, nữ; hiến cách đây đúng 90 ngày (quy tắc mặc định 84, riêng nữ giả định 112 để thử nhánh nữ)
CREATE TEMP TABLE t AS SELECT d.id donor, d.user_id uid, row_number() over (order by d.id) rn FROM donor_profiles d JOIN users u ON u.id=d.user_id WHERE u.status='ACTIVE' LIMIT 3;
UPDATE donor_profiles d SET gender = CASE t.rn WHEN 1 THEN 'MALE' ELSE 'FEMALE' END, last_donation_date = current_date - 90, rejoin_reminded_for = NULL FROM t WHERE d.id=t.donor;
UPDATE privacy_settings SET receive_rejoin_reminders = true WHERE user_id IN (SELECT uid FROM t);
UPDATE privacy_settings SET receive_rejoin_reminders = false WHERE user_id = (SELECT uid FROM t WHERE rn=3);   -- người 3 tắt nhắc
-- Nhắc hiến lại: quy tắc nữ 112 ngày, nam 84 ngày; hôm nay = last+90 => chỉ nam đủ giãn cách và chỉ người bật nhắc
WITH r AS (UPDATE donor_profiles d SET rejoin_reminded_for = d.last_donation_date FROM privacy_settings p, users u
 WHERE p.user_id=d.user_id AND u.id=d.user_id AND u.status='ACTIVE' AND p.receive_rejoin_reminders AND d.last_donation_date IS NOT NULL
   AND d.rejoin_reminded_for IS DISTINCT FROM d.last_donation_date
   AND d.last_donation_date + (CASE WHEN d.gender='FEMALE' THEN 112 ELSE 84 END) <= current_date
   AND d.last_donation_date + (CASE WHEN d.gender='FEMALE' THEN 112 ELSE 84 END) >= current_date - 7
   AND d.id IN (SELECT donor FROM t)
 RETURNING d.id, d.gender)
SELECT 'nhắc lần 1: '||count(*)||' người ('||coalesce(string_agg(gender,','),'-')||') kỳ vọng 1 người nam' FROM r;
WITH r AS (UPDATE donor_profiles d SET rejoin_reminded_for = d.last_donation_date FROM privacy_settings p, users u
 WHERE p.user_id=d.user_id AND u.id=d.user_id AND u.status='ACTIVE' AND p.receive_rejoin_reminders AND d.last_donation_date IS NOT NULL
   AND d.rejoin_reminded_for IS DISTINCT FROM d.last_donation_date
   AND d.last_donation_date + (CASE WHEN d.gender='FEMALE' THEN 112 ELSE 84 END) <= current_date
   AND d.last_donation_date + (CASE WHEN d.gender='FEMALE' THEN 112 ELSE 84 END) >= current_date - 7
   AND d.id IN (SELECT donor FROM t) RETURNING 1)
SELECT 'nhắc lần 2 (chạy lặp): '||count(*)||' (kỳ vọng 0, không nhắc trùng)' FROM r;
-- Hiến lần mới => được nhắc lại cho lần hiến mới
UPDATE donor_profiles SET last_donation_date = current_date - 84 - 3 WHERE id = (SELECT donor FROM t WHERE rn=1);
WITH r AS (UPDATE donor_profiles d SET rejoin_reminded_for = d.last_donation_date WHERE d.id=(SELECT donor FROM t WHERE rn=1) AND d.rejoin_reminded_for IS DISTINCT FROM d.last_donation_date RETURNING 1)
SELECT 'đổi ngày hiến => nhắc lại được: '||count(*) FROM r;
-- Dữ liệu cũ (đủ giãn cách từ 30 ngày trước) không bị nhắc hàng loạt
SELECT 'dữ liệu cũ bị loại bởi cửa sổ 7 ngày: '||(current_date - 114 + 84 < current_date - 7);
-- Lọc ứng viên khẩn cấp theo giới (tương đương JPQL): người chưa đủ giãn cách KHÔNG được chọn
SELECT 'ứng viên khẩn cấp trong 3 người thử (nam84/nữ112): '||count(*) FROM donor_profiles d WHERE d.id IN (SELECT donor FROM t)
  AND (d.last_donation_date IS NULL OR (d.gender='FEMALE' AND d.last_donation_date <= current_date-112) OR (d.gender<>'FEMALE' AND d.last_donation_date <= current_date-84));
-- Dữ liệu sức khỏe: CHECK
SAVEPOINT a;
DO $$ BEGIN INSERT INTO donor_health_checks(donor_id) SELECT donor FROM t LIMIT 1; EXCEPTION WHEN check_violation THEN RAISE NOTICE 'bản ghi rỗng bị chặn (ck_health_any): OK'; END $$;
ROLLBACK TO a;
DO $$ BEGIN INSERT INTO donor_health_checks(donor_id, heart_rate) SELECT donor, 400 FROM t LIMIT 1; EXCEPTION WHEN check_violation THEN RAISE NOTICE 'nhịp tim 400 bị chặn (ck_health_hr): OK'; END $$;
INSERT INTO health_data_consents(user_id, granted) SELECT uid, true FROM t WHERE rn=1;
INSERT INTO donor_health_checks(donor_id, heart_rate, systolic, diastolic, weight_kg) SELECT donor, 72, 120, 80, 60.5 FROM t WHERE rn=1;
INSERT INTO donor_health_checks(donor_id, heart_rate, systolic, diastolic, weight_kg) SELECT donor, 95, 165, 85, 60.0 FROM t WHERE rn=1;
SELECT 'bản ghi sức khỏe của donor 1: '||count(*) FROM donor_health_checks WHERE donor_id=(SELECT donor FROM t WHERE rn=1);
SELECT 'donor 2 (người khác) thấy bản ghi của donor 1: '||count(*)||' (kỳ vọng 0)' FROM donor_health_checks WHERE donor_id=(SELECT donor FROM t WHERE rn=2);
-- Xóa lịch sử
WITH x AS (DELETE FROM donor_health_checks WHERE donor_id=(SELECT donor FROM t WHERE rn=1) RETURNING 1) SELECT 'đã xóa '||count(*)||' bản ghi' FROM x;
-- Xóa donor => dữ liệu sức khỏe bị xóa theo (CASCADE)
INSERT INTO donor_health_checks(donor_id, heart_rate) SELECT donor, 70 FROM t WHERE rn=2;
SAVEPOINT c; DELETE FROM donor_profiles WHERE id=(SELECT donor FROM t WHERE rn=2) AND false; ROLLBACK TO c;
SELECT 'FK cascade health (c = CASCADE): '||confdeltype::text FROM pg_constraint WHERE conrelid='donor_health_checks'::regclass AND contype='f';
-- Web Push: endpoint duy nhất; kênh PUSH hợp lệ; loại thông báo mới
INSERT INTO push_subscriptions(user_id, endpoint, p256dh, auth) SELECT uid, 'https://fcm.googleapis.com/fcm/send/test-endpoint', 'BPk', 'abc' FROM t WHERE rn=1;
DO $$ BEGIN INSERT INTO push_subscriptions(user_id, endpoint, p256dh, auth) SELECT uid, 'https://fcm.googleapis.com/fcm/send/test-endpoint', 'BPk', 'abc' FROM t WHERE rn=2; EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'endpoint trùng bị chặn (uq_push_endpoint): OK'; END $$;
WITH u AS (INSERT INTO push_subscriptions(user_id, endpoint, p256dh, auth) SELECT uid, 'https://fcm.googleapis.com/fcm/send/test-endpoint', 'NEW', 'def' FROM t WHERE rn=2 ON CONFLICT (endpoint) DO UPDATE SET user_id=EXCLUDED.user_id, p256dh=EXCLUDED.p256dh, auth=EXCLUDED.auth RETURNING user_id)
SELECT 'upsert chuyển endpoint sang người đăng nhập mới: '||(user_id=(SELECT uid FROM t WHERE rn=2)) FROM u;
INSERT INTO notification_consents(user_id, channel, granted) SELECT uid,'PUSH',true FROM t WHERE rn=1 ON CONFLICT (user_id,channel) DO UPDATE SET granted=true;
INSERT INTO notification_outbox(dedupe_key,channel,recipient_user_id,purpose,body) SELECT 'PUSH:TEST','PUSH',uid,'REJOIN_REMINDER', repeat('x',800) FROM t WHERE rn=1;
SELECT 'outbox PUSH body dài 800: OK';
INSERT INTO notifications(user_id,type,title,message) SELECT uid,'REJOIN_REMINDER','a','b' FROM t WHERE rn=1;
SELECT 'loại thông báo REJOIN_REMINDER: OK';
-- Giới tính
DO $$ BEGIN UPDATE donor_profiles SET gender='X' WHERE id=(SELECT donor FROM t LIMIT 1); EXCEPTION WHEN check_violation THEN RAISE NOTICE 'giới tính không hợp lệ bị chặn (ck_donor_gender): OK'; END $$;
ROLLBACK;
