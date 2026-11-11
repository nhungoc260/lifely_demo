-- Hỗ trợ đi lại cho người hiến theo YÊU CẦU MÁU KHẨN CẤP (không chỉ lịch hiến đặt trước).
-- Chỉ áp dụng cho yêu cầu gắn cơ sở y tế đã xác minh và lượt hiến đã được cơ sở xác nhận. LIFELY không thu hay chuyển tiền.

ALTER TABLE matches ADD COLUMN travel_support_paid_vnd INT;
ALTER TABLE matches ADD COLUMN travel_support_paid_at TIMESTAMPTZ;
ALTER TABLE matches ADD CONSTRAINT ck_match_travel_support
    CHECK (travel_support_paid_vnd IS NULL OR (travel_support_paid_vnd BETWEEN 1 AND 500000 AND status = 'COMPLETED'));

-- Cờ bất thường áp dụng được cho lượt hiến khẩn cấp.
ALTER TABLE abuse_flags DROP CONSTRAINT abuse_flags_subject_type_check;
ALTER TABLE abuse_flags ADD CONSTRAINT abuse_flags_subject_type_check
    CHECK (subject_type IN ('REQUEST', 'APPOINTMENT', 'ORGANIZATION', 'MATCH'));
