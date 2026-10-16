-- V15: dữ liệu sức khỏe tự nguyện của người hiến (có đồng ý, xóa/xuất được), nhắc hiến lại, Web Push, đánh dấu dữ liệu demo.
-- Chỉ THÊM; không sửa bảng hay dữ liệu cũ ngoài việc đánh dấu is_demo.

-- 1. Đánh dấu dữ liệu giả (demo) để xóa được và để nhận diện rõ
ALTER TABLE users ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE users SET is_demo = TRUE WHERE email LIKE '%@lifely.demo';
CREATE INDEX idx_users_demo ON users (is_demo) WHERE is_demo;

-- 2. Giới tính (tự khai, tùy chọn) để áp quy tắc giãn cách/cân nặng; UNSPECIFIED dùng quy tắc mặc định
ALTER TABLE donor_profiles ADD COLUMN gender VARCHAR(12) NOT NULL DEFAULT 'UNSPECIFIED';
ALTER TABLE donor_profiles ADD CONSTRAINT ck_donor_gender CHECK (gender IN ('FEMALE', 'MALE', 'UNSPECIFIED'));

-- 3. Nhắc hiến lại: bật/tắt riêng, và đánh dấu đã nhắc cho đúng lần hiến gần nhất (chống nhắc trùng)
ALTER TABLE privacy_settings ADD COLUMN receive_rejoin_reminders BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE donor_profiles ADD COLUMN rejoin_reminded_for DATE;

-- 4. Dữ liệu sức khỏe: chỉ lưu khi có đồng ý; xóa theo donor (CASCADE); không có thông tin chẩn đoán
CREATE TABLE health_data_consents (
    user_id    UUID        PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    granted    BOOLEAN     NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE donor_health_checks (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id    UUID         NOT NULL REFERENCES donor_profiles (id) ON DELETE CASCADE,
    measured_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    heart_rate  SMALLINT,
    systolic    SMALLINT,
    diastolic   SMALLINT,
    weight_kg   NUMERIC(5,1),
    source      VARCHAR(12)  NOT NULL DEFAULT 'SELF_ENTERED',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_health_hr     CHECK (heart_rate IS NULL OR heart_rate BETWEEN 20 AND 250),
    CONSTRAINT ck_health_sys    CHECK (systolic   IS NULL OR systolic   BETWEEN 50 AND 260),
    CONSTRAINT ck_health_dia    CHECK (diastolic  IS NULL OR diastolic  BETWEEN 30 AND 160),
    CONSTRAINT ck_health_weight CHECK (weight_kg  IS NULL OR weight_kg  BETWEEN 20 AND 300),
    CONSTRAINT ck_health_source CHECK (source IN ('SELF_ENTERED', 'FACILITY')),
    CONSTRAINT ck_health_any    CHECK (heart_rate IS NOT NULL OR systolic IS NOT NULL OR diastolic IS NOT NULL OR weight_kg IS NOT NULL)
);
CREATE INDEX idx_health_donor_time ON donor_health_checks (donor_id, measured_at DESC);

-- 5. Web Push (miễn phí, chuẩn VAPID). Chỉ lưu endpoint + khóa công khai của trình duyệt; không bao giờ ghi vào log.
CREATE TABLE push_subscriptions (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    endpoint        TEXT         NOT NULL,
    p256dh          VARCHAR(200) NOT NULL,
    auth            VARCHAR(100) NOT NULL,
    user_agent      VARCHAR(200),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_success_at TIMESTAMPTZ,
    CONSTRAINT uq_push_endpoint UNIQUE (endpoint)
);
CREATE INDEX idx_push_user ON push_subscriptions (user_id);

-- 6. Kênh PUSH cho outbox và đồng ý theo kênh; loại thông báo nhắc hiến lại
ALTER TABLE notification_outbox DROP CONSTRAINT ck_outbox_channel;
ALTER TABLE notification_outbox ADD CONSTRAINT ck_outbox_channel CHECK (channel IN ('SMS', 'VOICE', 'PUSH'));
ALTER TABLE notification_consents DROP CONSTRAINT ck_consent_channel;
ALTER TABLE notification_consents ADD CONSTRAINT ck_consent_channel CHECK (channel IN ('SMS', 'VOICE', 'PUSH'));
ALTER TABLE notification_outbox ALTER COLUMN body TYPE VARCHAR(900);

ALTER TABLE notifications DROP CONSTRAINT ck_notif_type;
ALTER TABLE notifications ADD CONSTRAINT ck_notif_type CHECK (type IN (
    'NEW_MATCH', 'REQUEST_ACCEPTED', 'REQUEST_REJECTED', 'REQUEST_CANCELLED', 'REQUEST_VERIFIED',
    'REQUEST_EXPIRED', 'EMERGENCY_ESCALATION', 'SYSTEM',
    'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_REMINDER',
    'STAFF_NEW_REQUEST', 'STAFF_DONOR_RESPONDED', 'REJOIN_REMINDER'));
