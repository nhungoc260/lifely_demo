-- Hỗ trợ đi lại cho người hiến máu: cơ sở y tế công bố chính sách, ghi nhận đã chi, admin theo dõi.
-- Căn cứ: người hiến máu tình nguyện được cơ sở tiếp nhận máu hỗ trợ tiền đi lại tối đa 50.000đ/lần hiến (bằng tiền mặt).
-- LIFELY chỉ công bố và ghi nhận, không thu hay chuyển tiền.

-- Mức hỗ trợ đi lại cơ sở công bố (mặc định 50.000đ) và phí gửi xe máy tại cơ sở (NULL = chưa cập nhật).
ALTER TABLE organizations ADD COLUMN travel_support_vnd INT NOT NULL DEFAULT 50000;
ALTER TABLE organizations ADD COLUMN parking_fee_vnd INT;
ALTER TABLE organizations ADD CONSTRAINT ck_org_travel_support CHECK (travel_support_vnd BETWEEN 0 AND 500000);
ALTER TABLE organizations ADD CONSTRAINT ck_org_parking_fee CHECK (parking_fee_vnd IS NULL OR parking_fee_vnd BETWEEN 0 AND 200000);

-- Ghi nhận cơ sở đã chi hỗ trợ cho lần hiến này (NULL = chưa ghi nhận). Chỉ ghi được khi lịch đã DONATED.
ALTER TABLE appointments ADD COLUMN travel_support_paid_vnd INT;
ALTER TABLE appointments ADD COLUMN travel_support_paid_at TIMESTAMPTZ;
ALTER TABLE appointments ADD CONSTRAINT ck_appt_travel_support
    CHECK (travel_support_paid_vnd IS NULL OR (travel_support_paid_vnd BETWEEN 1 AND 500000 AND status = 'DONATED'));
