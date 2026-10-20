-- Ảnh đại diện lưu dạng data URL đã thu nhỏ (khoảng 128x128), cần dài hơn 500 ký tự. Vẫn là VARCHAR để khớp kiểm tra schema của Hibernate.
ALTER TABLE users ALTER COLUMN avatar_url TYPE VARCHAR(20000);
