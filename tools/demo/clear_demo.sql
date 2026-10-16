-- Xóa toàn bộ DỮ LIỆU DEMO do seed_demo.sql tạo (và dữ liệu phát sinh từ các tài khoản demo trong lúc demo).
-- Chỉ đụng tới bản ghi của người dùng có users.is_demo = TRUE và email demo-*@lifely.demo.
\set ON_ERROR_STOP on
BEGIN;
CREATE TEMP TABLE demo_users AS SELECT id FROM users WHERE is_demo AND email LIKE 'demo-%@lifely.demo';
CREATE TEMP TABLE demo_reqs  AS SELECT id FROM blood_requests WHERE requester_id IN (SELECT id FROM demo_users)
                                   OR organization_id IN (SELECT id FROM organizations WHERE owner_user_id IN (SELECT id FROM demo_users));
DELETE FROM notification_outbox WHERE recipient_user_id IN (SELECT id FROM demo_users) OR reference_id IN (SELECT id FROM demo_reqs);
DELETE FROM notifications WHERE user_id IN (SELECT id FROM demo_users) OR reference_id IN (SELECT id FROM demo_reqs);
DELETE FROM donation_history WHERE match_id IN (SELECT id FROM matches WHERE request_id IN (SELECT id FROM demo_reqs))
   OR donor_id IN (SELECT id FROM donor_profiles WHERE user_id IN (SELECT id FROM demo_users));
DELETE FROM appointments WHERE donor_id IN (SELECT id FROM donor_profiles WHERE user_id IN (SELECT id FROM demo_users));
DELETE FROM match_events WHERE match_id IN (SELECT id FROM matches WHERE request_id IN (SELECT id FROM demo_reqs)
   OR donor_id IN (SELECT id FROM donor_profiles WHERE user_id IN (SELECT id FROM demo_users)));
DELETE FROM matches WHERE request_id IN (SELECT id FROM demo_reqs) OR donor_id IN (SELECT id FROM donor_profiles WHERE user_id IN (SELECT id FROM demo_users));
DELETE FROM request_status_history WHERE request_id IN (SELECT id FROM demo_reqs);
DELETE FROM blood_requests WHERE id IN (SELECT id FROM demo_reqs);
DELETE FROM donation_slots WHERE organization_id IN (SELECT id FROM organizations WHERE owner_user_id IN (SELECT id FROM demo_users));
DELETE FROM organizations WHERE owner_user_id IN (SELECT id FROM demo_users);   -- kho máu và nhân viên xóa theo CASCADE
DELETE FROM users WHERE id IN (SELECT id FROM demo_users);                      -- hồ sơ donor, sức khỏe, push, đồng ý xóa theo CASCADE
COMMIT;
