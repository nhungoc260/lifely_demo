# LIFELY – Website kết nối và điều phối hiến máu khẩn cấp

> **Connect. Donate. Save a Life.**

## Giới thiệu

LIFELY là website giúp người cần máu gấp tìm được người hiến máu phù hợp ở gần bệnh viện, và điều phối phản hồi của những người này trên một kênh duy nhất thay vì phải đăng mạng xã hội hay gọi điện từng người.

Khi một yêu cầu máu được tạo và xác minh, hệ thống tự lọc những người hiến tương thích về nhóm máu, đang sẵn sàng và ở gần bệnh viện. Việc liên hệ được thực hiện theo từng vòng bán kính mở rộng dần (0–5 km, 5–10 km, 10–20 km, 20–50 km). Mọi cập nhật hiển thị theo thời gian thực, và số người đã xác nhận không bao giờ vượt quá số đơn vị máu cần.

LIFELY không thay thế bệnh viện và không quyết định ai đủ điều kiện hiến máu.

## Đối tượng sử dụng

- **Người hiến máu**: nhận yêu cầu phù hợp kèm lý do được ghép, chấp nhận hoặc từ chối, theo dõi lịch sử hiến.
- **Người cần máu**: tạo yêu cầu, theo dõi tiến độ realtime, xác nhận người đã hiến.
- **Tổ chức y tế**: bệnh viện, trung tâm máu; hồ sơ được quản trị viên xác minh.
- **Quản trị viên**: quản lý người dùng, yêu cầu, tổ chức, báo cáo và nhật ký hoạt động.

## Tính năng chính

- Ghép người hiến theo luật nhóm máu và khoảng cách Haversine (không dùng AI)
- Cập nhật realtime qua WebSocket, không cần tải lại trang
- Bản đồ bệnh viện và yêu cầu gần bạn, không bao giờ hiển thị vị trí người hiến
- Chia sẻ yêu cầu và poster A4 có mã QR để gia đình dán tại bệnh viện
- Thông báo trong ứng dụng và qua email
- Đăng ký / đăng nhập nhanh bằng tài khoản Google (tùy chọn)
- Dark mode, giao diện responsive cho cả máy tính và điện thoại

## Công nghệ sử dụng

| Lớp | Công nghệ |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Radix UI), Lucide, React Hook Form, Zod, Leaflet (OpenStreetMap, MapTiler tùy chọn), Recharts, STOMP.js |
| Backend | Java 21, Spring Boot 3.5, Spring Security (JWT, BCrypt), Spring Data JPA / Hibernate, Jakarta Validation, Spring WebSocket (STOMP), Spring Mail, Springdoc OpenAPI (Swagger), Google Identity Services (xác thực ID token) |
| Cơ sở dữ liệu | PostgreSQL 16, Flyway (quản lý migration) |
| Kiểm thử | JUnit, Spring Boot Test, Vitest |
| Công cụ | VS Code, Maven, npm, pgAdmin / DBeaver, Postman, Git |

---

Được xây dựng với ❤️ bởi Nguyễn Trần Như Ngọc 🐨 – 2026