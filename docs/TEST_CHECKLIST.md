# Checklist chạy thử toàn hệ thống (một lần)

## A. Khởi động
| # | Việc | Kỳ vọng |
|---|---|---|
| 1 | Tạo DB: chạy `database/00_create_database.sql` | user + database `lifely` |
| 2 | `cp .env.example .env` rồi `cd backend && mvn -N wrapper:wrapper && ./mvnw spring-boot:run` | log: `Successfully applied 5 migrations`, `Started LifelyApplication`, `Demo data refreshed` |
| 3 | `curl localhost:8080/api/health` | `database.status = UP`, `migrationVersion = 5` |
| 4 | `cd frontend && npm install && npm run dev` | http://localhost:3000 hiện landing, "LIFELY NETWORK ACTIVE", số liệu thật |
| 5 | `mvn test` | các unit test đạt |
| 6 | `mvn test -Dtest=ApiSecurityIT` và `-Dtest=ConcurrentAcceptIT` | đạt |
| 7 | Import Postman collection, chạy theo thứ tự | các test đạt |

## B. Luồng nghiệp vụ trên giao diện
| # | Kịch bản | Kỳ vọng |
|---|---|---|
| 1 | Đăng ký Donor mới → onboarding 6 bước → "Save & Continue Later" ở bước 3 → đăng nhập lại | quay lại đúng bước |
| 2 | Donor bật Available, hồ sơ đủ | dashboard hiện "Available", có request gần |
| 3 | Requester tạo request O+ (xem trước → Create) | trạng thái *Pending verification* |
| 4 | Admin → Requests → Verify | request chuyển *Donors contacted*, donor phù hợp nhận thông báo realtime |
| 5 | Donor mở request → xem giải thích → Accept | requester thấy xác nhận tăng **không reload** |
| 6 | Với request cần 2: để 3 donor cùng Accept | chỉ 2 thành công, người còn lại thấy "Request is no longer accepting donors" |
| 7 | Requester "Mark donated" | donor có thêm 1 dòng lịch sử, tổng hiến +1 |
| 8 | Requester hủy request | donor liên quan nhận thông báo hủy |
| 9 | Donor B truy cập match của Donor A (đổi id trong URL/API) | 404 |
| 10 | Donor vào `/admin/dashboard` | bị chuyển về trang của donor; gọi API admin → 403 |
| 11 | Organization chưa verified tạo request | Pending verification; admin verify tổ chức → request sau tự verified |
| 12 | Quên mật khẩu → lấy link trong log backend → đặt lại | đăng nhập được bằng mật khẩu mới |
| 13 | 5 lần đăng nhập sai | tài khoản khóa 15 phút (429) |
| 14 | Dark mode, màn 375 / 768 / 1280 px | không tràn ngang, sidebar ↔ bottom nav |
| 15 | Chờ ~5 phút với request CRITICAL chưa đủ người | thông báo "Search area widened", level 2 |
