-- V16: (1) Nhân viên ghi nhận kết quả liên hệ thủ công với người hiến (gọi bằng tel: trên thiết bị của họ).
--      (2) Ngừng kênh cuộc gọi tự động: hủy các tin VOICE chưa gửi. KHÔNG xóa dữ liệu, KHÔNG sửa V14/V15.
-- Chỉ thêm cột/ràng buộc mới; dữ liệu cũ nhận giá trị mặc định NOT_CONTACTED.

ALTER TABLE matches
    ADD COLUMN contact_result    VARCHAR(20) NOT NULL DEFAULT 'NOT_CONTACTED',
    ADD COLUMN contact_result_at TIMESTAMPTZ,
    ADD COLUMN contact_result_by UUID REFERENCES users (id);

ALTER TABLE matches
    ADD CONSTRAINT ck_matches_contact_result
        CHECK (contact_result IN ('NOT_CONTACTED', 'CONTACTED', 'UNREACHABLE', 'CONFIRMED_CAN_JOIN', 'CANNOT_JOIN'));

-- Tin cuộc gọi tự động đang chờ/đang gửi không bao giờ được thực hiện.
UPDATE notification_outbox
   SET status = 'CANCELLED', last_error_code = 'CHANNEL_REMOVED'
 WHERE channel = 'VOICE' AND status IN ('PENDING', 'SENDING');
