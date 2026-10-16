# Kiểm thử SQL trực tiếp trên PostgreSQL

Các script này kiểm tra tầng database của Luồng B / outbox (không cần Maven). Cần DB `lifely` đã chạy Flyway V1→V14 (user `lifely`, mật khẩu theo `application.yml`).

- `slot_race.sh`: 25 phiên song song đặt khung giờ 5 chỗ ⇒ kỳ vọng đúng 5 thành công, `booked_count = 5`.
- `outbox_sql_test.sql`: dedupe, claim `SKIP LOCKED`, retry có độ trễ, hủy theo yêu cầu, xếp lại tin lỗi (chạy trong transaction rồi ROLLBACK).
- `appt_sql_test.sql`: đặt/hủy/nhắc lịch, ghi lịch sử hiến, kho và sổ biến động, idempotency, các CHECK (chạy rồi ROLLBACK).

Đây là kiểm thử SQL, không thay thế `mvn test` / các `*IT` của backend.
- `health_sql_test.sql`: nhắc hiến lại (một lần mỗi lần hiến, theo giới), lọc ứng viên theo giãn cách, dữ liệu sức khỏe (ràng buộc, riêng tư, xóa), Web Push (endpoint duy nhất, chuyển người đăng nhập).
- `erase_sql_test.sql`: câu lệnh xóa dữ liệu cá nhân khi xóa tài khoản (trả chỗ lịch hẹn, xóa sức khỏe/push/đồng ý/nhật ký).
