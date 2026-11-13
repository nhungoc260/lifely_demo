-- Đánh dấu giá xăng do hệ thống tự lấy (true) hay admin nhập tay (false). Giá nhập tay luôn được ưu tiên.
ALTER TABLE fuel_prices ADD COLUMN auto BOOLEAN NOT NULL DEFAULT FALSE;
