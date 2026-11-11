-- Chống lạm dụng: duyệt tự động, phát hiện bất thường thì dừng ngay và đưa vào hàng đợi cho admin theo dõi.
-- Mục tiêu: người lợi dụng để nhận tiền hỗ trợ đi lại hoặc quà tặng (tạo yêu cầu giả, nhiều tài khoản chung SĐT,
-- hiến dồn dập, cơ sở xác nhận khống). LIFELY không trả tiền cho ai; hàng đợi chỉ là sổ giám sát.

-- Vị trí nhà / nơi bệnh nhân đang ở (tuỳ chọn) để hiện khoảng cách và chi phí tới bệnh viện, đồng thời làm tín hiệu đối chiếu.
ALTER TABLE blood_requests ADD COLUMN home_latitude NUMERIC(9,6);
ALTER TABLE blood_requests ADD COLUMN home_longitude NUMERIC(9,6);
ALTER TABLE blood_requests ADD CONSTRAINT ck_req_home CHECK (
    (home_latitude IS NULL AND home_longitude IS NULL)
    OR (home_latitude BETWEEN -90 AND 90 AND home_longitude BETWEEN -180 AND 180));

CREATE TABLE abuse_flags (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_type VARCHAR(20)  NOT NULL CHECK (subject_type IN ('REQUEST', 'APPOINTMENT', 'ORGANIZATION')),
    subject_id   UUID         NOT NULL,
    rule_code    VARCHAR(40)  NOT NULL,
    severity     VARCHAR(10)  NOT NULL CHECK (severity IN ('MEDIUM', 'HIGH')),
    -- NONE: chỉ cảnh báo; AUTO_CANCELLED: yêu cầu đã bị hủy ngay; SUPPORT_BLOCKED: không cho ghi nhận hỗ trợ đi lại
    auto_action  VARCHAR(20)  NOT NULL DEFAULT 'NONE' CHECK (auto_action IN ('NONE', 'AUTO_CANCELLED', 'SUPPORT_BLOCKED')),
    detail       VARCHAR(500) NOT NULL,
    status       VARCHAR(12)  NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'DISMISSED', 'CONFIRMED')),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    reviewed_by  UUID REFERENCES users(id),
    reviewed_at  TIMESTAMPTZ,
    review_note  VARCHAR(500)
);
CREATE INDEX idx_abuse_flags_status ON abuse_flags (status, created_at DESC);
-- Một quy tắc chỉ mở một cờ cho cùng đối tượng cho tới khi admin xử lý (tránh spam hàng đợi).
CREATE UNIQUE INDEX uq_abuse_flags_open ON abuse_flags (subject_type, subject_id, rule_code) WHERE status = 'OPEN';
