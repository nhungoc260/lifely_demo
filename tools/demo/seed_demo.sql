-- DỮ LIỆU DEMO (GIẢ) cho LIFELY. Chạy lại nhiều lần được (idempotent): làm mới trạng thái theo ngày hiện tại.
-- Mọi bản ghi do script này tạo đều: email dạng demo-*@lifely.demo (TLD .demo không tồn tại), số điện thoại 00000000xx
-- (không phải số điện thoại thật, không gọi/nhắn được), users.is_demo = TRUE. Xóa bằng tools/demo/clear_demo.sql.
-- Mật khẩu KHÔNG nằm trong file này: seed_demo.sh truyền bcrypt hash tính từ biến môi trường DEMO_PASSWORD.
\set ON_ERROR_STOP on
BEGIN;

-- ---- tài khoản
INSERT INTO users (id, email, password_hash, full_name, phone, is_demo) VALUES
 ('d0000000-0000-4000-8000-000000000001', 'demo-requester@lifely.demo',       :'hash', '[DEMO] Người cần máu',          '0000000001', TRUE),
 ('d0000000-0000-4000-8000-000000000002', 'demo-donor-eligible@lifely.demo',  :'hash', '[DEMO] Người hiến đủ điều kiện', '0000000002', TRUE),
 ('d0000000-0000-4000-8000-000000000003', 'demo-donor-deferred@lifely.demo',  :'hash', '[DEMO] Người hiến cần hoãn',     '0000000003', TRUE),
 ('d0000000-0000-4000-8000-000000000004', 'demo-donor-female@lifely.demo',    :'hash', '[DEMO] Người hiến nữ',           '0000000004', TRUE),
 ('d0000000-0000-4000-8000-000000000005', 'demo-hospital@lifely.demo',        :'hash', '[DEMO] Nhân viên bệnh viện',     '0000000005', TRUE),
 ('d0000000-0000-4000-8000-000000000006', 'demo-admin@lifely.demo',           :'hash', '[DEMO] Quản trị viên',           '0000000006', TRUE)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone, is_demo = TRUE, status = 'ACTIVE';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM (VALUES
  ('demo-requester@lifely.demo', 'ROLE_REQUESTER'), ('demo-donor-eligible@lifely.demo', 'ROLE_DONOR'),
  ('demo-donor-deferred@lifely.demo', 'ROLE_DONOR'), ('demo-donor-female@lifely.demo', 'ROLE_DONOR'),
  ('demo-hospital@lifely.demo', 'ROLE_ORGANIZATION'), ('demo-admin@lifely.demo', 'ROLE_ADMIN')) v(email, role)
JOIN users u ON u.email = v.email JOIN roles r ON r.name = v.role
ON CONFLICT DO NOTHING;

INSERT INTO privacy_settings (user_id)
SELECT id FROM users WHERE email LIKE 'demo-%@lifely.demo' ON CONFLICT (user_id) DO NOTHING;

-- ---- bệnh viện đã xác minh (giả), bật tự cộng kho khi xác nhận hiến
INSERT INTO organizations (id, owner_user_id, name, type, address, city, district, latitude, longitude, phone, email,
                           contact_person, verification_status, verified_at, inventory_auto_add)
VALUES ('d0000000-0000-4000-8000-0000000000a1', 'd0000000-0000-4000-8000-000000000005',
        '[DEMO] Bệnh viện Demo LIFELY (dữ liệu giả)', 'HOSPITAL', 'Địa chỉ giả cho demo, Quận 1', 'TP. Hồ Chí Minh', 'Quận 1',
        10.776900, 106.700900, '0000000010', 'demo-hospital@lifely.demo', 'Người liên hệ (giả)', 'VERIFIED', now(), TRUE)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, verification_status = 'VERIFIED', inventory_auto_add = TRUE;

INSERT INTO blood_inventory (organization_id, blood_type, units, low_threshold) VALUES
 ('d0000000-0000-4000-8000-0000000000a1', 'O+', 8, 5), ('d0000000-0000-4000-8000-0000000000a1', 'A+', 5, 5),
 ('d0000000-0000-4000-8000-0000000000a1', 'B+', 4, 5), ('d0000000-0000-4000-8000-0000000000a1', 'O-', 2, 5)
ON CONFLICT (organization_id, blood_type) DO NOTHING;

-- ---- người hiến: tình trạng khác nhau (ngày tính theo hôm nay nên demo luôn đúng)
--  1) đủ điều kiện: nam, O+, hiến lần cuối 100 ngày trước (> 84 ngày), chỉ số bình thường
--  2) cần hoãn: nam, A+, mới hiến 30 ngày trước (còn 54 ngày) và có một lần đo huyết áp ngoài ngưỡng
--  3) nữ, B+, hiến 90 ngày trước (đủ giãn cách theo quy tắc mặc định); cân nặng 43 kg (đạt mức của nữ, sẽ không đạt mức của nam),
--     có một lần đo nhịp tim 58 (ngoài ngưỡng)
INSERT INTO donor_profiles (user_id, blood_type_id, city, district, latitude, longitude, last_donation_date,
                            availability_status, total_donations, gender)
SELECT u.id, bt.id, 'TP. Hồ Chí Minh', v.district, v.lat, v.lng, current_date - v.days, 'AVAILABLE', v.total, v.gender
FROM (VALUES
  ('demo-donor-eligible@lifely.demo', 'O+', 'Quận 1',  10.7790, 106.7020, 100, 6, 'MALE'),
  ('demo-donor-deferred@lifely.demo', 'A+', 'Quận 3',  10.7830, 106.6900,  30, 3, 'MALE'),
  ('demo-donor-female@lifely.demo',   'B+', 'Quận 10', 10.7720, 106.6670,  90, 2, 'FEMALE')) v(email, code, district, lat, lng, days, total, gender)
JOIN users u ON u.email = v.email JOIN blood_types bt ON bt.code = v.code
ON CONFLICT (user_id) DO UPDATE SET blood_type_id = EXCLUDED.blood_type_id, latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude, last_donation_date = EXCLUDED.last_donation_date, availability_status = 'AVAILABLE',
  total_donations = EXCLUDED.total_donations, gender = EXCLUDED.gender, rejoin_reminded_for = NULL;

-- ---- dữ liệu sức khỏe giả (có đồng ý lưu), làm mới mỗi lần seed
INSERT INTO health_data_consents (user_id, granted)
SELECT id, TRUE FROM users WHERE email IN ('demo-donor-eligible@lifely.demo', 'demo-donor-deferred@lifely.demo', 'demo-donor-female@lifely.demo')
ON CONFLICT (user_id) DO UPDATE SET granted = TRUE, updated_at = now();

DELETE FROM donor_health_checks WHERE donor_id IN
  (SELECT d.id FROM donor_profiles d JOIN users u ON u.id = d.user_id WHERE u.email LIKE 'demo-donor-%@lifely.demo');

INSERT INTO donor_health_checks (donor_id, measured_at, heart_rate, systolic, diastolic, weight_kg)
SELECT d.id, now() - make_interval(days => v.ago), v.hr, v.sys, v.dia, v.kg
FROM (VALUES
  ('demo-donor-eligible@lifely.demo', 42, 68, 118, 76, 68.0), ('demo-donor-eligible@lifely.demo', 28, 72, 122, 80, 68.5),
  ('demo-donor-eligible@lifely.demo', 14, 70, 120, 78, 68.2), ('demo-donor-eligible@lifely.demo',  3, 74, 124, 80, 68.0),
  ('demo-donor-deferred@lifely.demo', 40, 80, 128, 82, 74.0), ('demo-donor-deferred@lifely.demo', 21, 84, 138, 88, 74.3),
  ('demo-donor-deferred@lifely.demo', 10, 88, 150, 92, 74.1), ('demo-donor-deferred@lifely.demo',  2, 92, 166, 98, 74.0),
  ('demo-donor-female@lifely.demo',   35, 64, 108, 70, 43.0), ('demo-donor-female@lifely.demo',   20, 66, 110, 72, 43.2),
  ('demo-donor-female@lifely.demo',    9, 62, 106, 68, 43.0), ('demo-donor-female@lifely.demo',    2, 58, 104, 66, 43.1)
) v(email, ago, hr, sys, dia, kg)
JOIN users u ON u.email = v.email JOIN donor_profiles d ON d.user_id = u.id;

COMMIT;
