-- Địa điểm hiến máu riêng cho từng khung giờ (cơ sở có thể đổi địa điểm, mở điểm hiến lưu động...).
-- NULL = dùng địa chỉ trong hồ sơ cơ sở (hành vi cũ). Các khung giờ đã có được chụp lại địa chỉ hiện tại
-- để sau này đổi địa chỉ hồ sơ không làm đổi lịch đã mở.
ALTER TABLE donation_slots ADD COLUMN location_address VARCHAR(300);
UPDATE donation_slots s SET location_address = o.address FROM organizations o WHERE o.id = s.organization_id;
