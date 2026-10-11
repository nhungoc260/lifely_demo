-- XÓA TOÀN BỘ dữ liệu và tạo lại database rỗng. CHỈ dùng trên máy phát triển!
-- Chạy bằng tài khoản postgres, khi KHÔNG có ứng dụng nào đang kết nối:
--   psql -U postgres -f database/reset_dev_db.sql
-- Sau đó khởi động lại backend: Flyway sẽ chạy lại V1 → V9 và nạp dữ liệu demo.

DROP DATABASE IF EXISTS lifely;
CREATE DATABASE lifely OWNER lifely ENCODING 'UTF8';
