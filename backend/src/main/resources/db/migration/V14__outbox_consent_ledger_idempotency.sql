-- V14: tách "số người nhận lời" khỏi "lượng máu thực nhận", đồng ý theo kênh, outbox thông báo,
-- sổ biến động kho, idempotency tạo yêu cầu, xác nhận của cơ sở y tế, lịch hẹn (nhắc lịch, nguồn hiến).

-- 1. Lượng đã được cơ sở/bên điều phối XÁC NHẬN hiến thực tế. units_confirmed giữ nguyên nghĩa "số người đã nhận lời".
ALTER TABLE blood_requests ADD COLUMN units_received INT NOT NULL DEFAULT 0;
UPDATE blood_requests r SET units_received =
    LEAST(r.units_required, (SELECT count(*) FROM matches m WHERE m.request_id = r.id AND m.status = 'COMPLETED'));
ALTER TABLE blood_requests ADD CONSTRAINT ck_req_units_received
    CHECK (units_received >= 0 AND units_received <= units_required);

-- 2. Xác nhận của cơ sở đối với yêu cầu gắn với cơ sở đó: NONE (không gắn cơ sở) | PENDING | CONFIRMED | DENIED
ALTER TABLE blood_requests ADD COLUMN facility_review VARCHAR(10) NOT NULL DEFAULT 'NONE';
ALTER TABLE blood_requests ADD CONSTRAINT ck_req_facility_review
    CHECK (facility_review IN ('NONE', 'PENDING', 'CONFIRMED', 'DENIED'));

-- 3. Idempotency khi tạo yêu cầu (bấm đúp, nhiều tab, retry mạng)
ALTER TABLE blood_requests ADD COLUMN idempotency_key VARCHAR(64);
CREATE UNIQUE INDEX uq_req_idempotency ON blood_requests (requester_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- 4. Nguồn lần hiến: thêm APPOINTMENT (hiến theo lịch hẹn đã được cơ sở xác nhận)
ALTER TABLE donation_history DROP CONSTRAINT ck_history_source;
ALTER TABLE donation_history ADD CONSTRAINT ck_history_source
    CHECK (source IN ('SELF_REPORTED', 'LIFELY_MATCH', 'APPOINTMENT'));

-- 5. Loại thông báo mới (lịch hẹn, cảnh báo cho nhân viên cơ sở)
ALTER TABLE notifications DROP CONSTRAINT ck_notif_type;
ALTER TABLE notifications ADD CONSTRAINT ck_notif_type CHECK (type IN (
    'NEW_MATCH', 'REQUEST_ACCEPTED', 'REQUEST_REJECTED', 'REQUEST_CANCELLED', 'REQUEST_VERIFIED',
    'REQUEST_EXPIRED', 'EMERGENCY_ESCALATION', 'SYSTEM',
    'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_REMINDER',
    'STAFF_NEW_REQUEST', 'STAFF_DONOR_RESPONDED'));

-- 6. Nhắc lịch: đánh dấu đã nhắc (cập nhật nguyên tử nên không nhắc trùng)
ALTER TABLE appointments ADD COLUMN reminder_sent_at TIMESTAMPTZ;

-- 7. Đồng ý nhận SMS / cuộc gọi tự động. Không có dòng = CHƯA đồng ý. In-app và email dùng privacy_settings hiện có.
CREATE TABLE notification_consents (
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    channel    VARCHAR(10) NOT NULL,
    granted    BOOLEAN     NOT NULL DEFAULT FALSE,
    source     VARCHAR(20) NOT NULL DEFAULT 'USER_SETTINGS',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, channel),
    CONSTRAINT ck_consent_channel CHECK (channel IN ('SMS', 'VOICE'))
);

-- 8. Outbox: ghi CÙNG transaction với nghiệp vụ; worker gửi sau khi commit. Không lưu số điện thoại (tra theo user_id lúc gửi).
CREATE TABLE notification_outbox (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    dedupe_key          VARCHAR(200) NOT NULL,
    channel             VARCHAR(10)  NOT NULL,
    recipient_user_id   UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    purpose             VARCHAR(30)  NOT NULL,
    reference_type      VARCHAR(20),
    reference_id        UUID,
    body                VARCHAR(500) NOT NULL,
    status              VARCHAR(10)  NOT NULL DEFAULT 'PENDING',
    attempts            INT          NOT NULL DEFAULT 0,
    max_attempts        INT          NOT NULL DEFAULT 3,
    next_attempt_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_error_code     VARCHAR(60),
    provider_message_id VARCHAR(100),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    sent_at             TIMESTAMPTZ,
    CONSTRAINT uq_outbox_dedupe UNIQUE (dedupe_key),
    CONSTRAINT ck_outbox_channel CHECK (channel IN ('SMS', 'VOICE')),
    CONSTRAINT ck_outbox_status  CHECK (status IN ('PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELLED')),
    CONSTRAINT ck_outbox_attempts CHECK (attempts >= 0 AND max_attempts BETWEEN 1 AND 10)
);
CREATE INDEX idx_outbox_due ON notification_outbox (status, next_attempt_at);
CREATE INDEX idx_outbox_ref ON notification_outbox (reference_type, reference_id);
CREATE INDEX idx_outbox_user_sent ON notification_outbox (recipient_user_id, channel, sent_at);

-- 9. Sổ biến động kho máu (truy vết): mọi thay đổi số đơn vị đều có một dòng
CREATE TABLE inventory_movements (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    blood_type      VARCHAR(3)  NOT NULL,
    delta           INT         NOT NULL,
    units_after     INT         NOT NULL,
    reason          VARCHAR(30) NOT NULL,
    reference_type  VARCHAR(20),
    reference_id    UUID,
    actor_user_id   UUID        REFERENCES users (id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_move_reason CHECK (reason IN ('DONATION_CONFIRMED', 'MANUAL_ADJUST'))
);
CREATE INDEX idx_move_org ON inventory_movements (organization_id, created_at DESC);

CREATE TRIGGER trg_outbox_updated BEFORE UPDATE ON notification_outbox FOR EACH ROW EXECUTE FUNCTION set_updated_at();
