-- Chạy một lần bằng tài khoản superuser (postgres), ví dụ trong DBeaver hoặc:
--   psql -U postgres -f database/00_create_database.sql
-- Đổi mật khẩu trước khi dùng ngoài máy cá nhân.

CREATE ROLE lifely WITH LOGIN PASSWORD 'lifely_dev_password';

CREATE DATABASE lifely
    OWNER lifely
    ENCODING 'UTF8';
