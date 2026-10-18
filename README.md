# LIFELY – Website kết nối và điều phối hiến máu khẩn cấp

## Giới thiệu

LIFELY là website giúp người cần máu gấp tìm được người hiến máu phù hợp ở gần bệnh viện, và điều phối phản hồi của những người này trên một kênh duy nhất thay vì phải đăng mạng xã hội hay gọi điện từng người.

Khi một yêu cầu máu được tạo và xác minh, hệ thống tự lọc những người hiến tương thích về nhóm máu, đang sẵn sàng, đã nghỉ đủ thời gian giữa hai lần hiến và ở gần bệnh viện. Việc liên hệ được thực hiện theo từng vòng bán kính mở rộng dần (0–5 km, 5–10 km, 10–20 km, 20–50 km), người đúng nhóm máu được ưu tiên trước. Mọi cập nhật hiển thị theo thời gian thực, và số người nhận lời không bao giờ vượt quá số đơn vị máu cần.

LIFELY phân biệt rõ hai con số: **số người đã nhận lời** và **số đơn vị đã được cơ sở y tế hoặc bên điều phối xác nhận hiến thực tế**. Yêu cầu chỉ được xem là đã đủ khi lượng hiến thực tế được xác nhận.

Ngoài luồng khẩn cấp, người hiến còn có thể **đặt lịch hiến máu trước** tại các cơ sở đã được xác minh. Luồng này tách biệt với yêu cầu khẩn cấp: lịch hẹn không phải máu có sẵn, kho máu chỉ thay đổi khi cơ sở xác nhận đã hiến.

LIFELY **không tự gọi điện**. Nhân viên bấm "Gọi người hiến" (liên kết `tel:`, mở ứng dụng gọi của thiết bị) rồi tự ghi nhận kết quả liên hệ.

LIFELY không thay thế bệnh viện và không quyết định ai đủ điều kiện hiến máu.

## Đối tượng sử dụng

- **Người hiến máu**: khai báo hồ sơ và quyền riêng tư, bật/tắt trạng thái sẵn sàng, nhận yêu cầu phù hợp kèm lý do được ghép, chấp nhận hoặc từ chối, đặt lịch hiến tại cơ sở đã xác minh, theo dõi lịch sử hiến và mức xác nhận từng lần hiến, tự nhập chỉ số sức khỏe để xem sàng lọc sơ bộ (khi đã đồng ý).
- **Người cần máu**: tạo yêu cầu, theo dõi tiến độ realtime, xem độ phủ người hiến quanh bệnh viện, xác nhận người đã hiến, ghi nhận người không đến và kết quả liên hệ.
- **Tổ chức y tế**: bệnh viện, trung tâm máu, phòng khám, tổ chức thiện nguyện; hồ sơ được quản trị viên xác minh. Sau khi được xác minh, tổ chức tạo yêu cầu đáng tin cậy, xác nhận hoặc từ chối yêu cầu gắn với cơ sở mình, quản lý kho máu, khung giờ hiến, lịch hẹn và nhân viên.
- **Quản trị viên**: quản lý người dùng, yêu cầu, tổ chức, báo cáo vi phạm, tin nhắn liên hệ và nhật ký hoạt động; theo dõi tổng quan kho máu, lịch hẹn và vận hành.
- **Khách (không cần đăng nhập)**: xem thống kê, bản đồ và các yêu cầu công khai, gửi tin nhắn liên hệ.

## Tính năng chính

**Điều phối khẩn cấp**
- Ghép người hiến theo luật nhóm máu, khoảng cách Haversine và điểm ưu tiên (không dùng AI), kèm lý do được ghép để người hiến hiểu vì sao mình nhận được yêu cầu
- Leo thang theo 4 cấp bán kính; thời gian chờ giữa các cấp phụ thuộc mức khẩn cấp (5 / 15 / 60 phút)
- Cập nhật realtime qua WebSocket, không cần tải lại trang
- Xử lý đồng thời an toàn: nhiều người bấm nhận lời cùng lúc vẫn không bao giờ vượt quá số đơn vị cần
- Yêu cầu có thể gắn với cơ sở đã xác minh để huy động ngay, cơ sở xác nhận hoặc từ chối sau
- Chống gửi trùng khi tạo yêu cầu (bấm đúp, nhiều tab, mạng chập chờn)

**Cơ sở y tế**
- Kho máu theo nhóm máu với ngưỡng cảnh báo sắp hết và sổ biến động truy vết
- Khung giờ hiến máu, quản lý lịch hẹn: check-in, sàng lọc, ghi nhận đã hiến, không đến
- Nhiều nhân viên cho một tổ chức, nhật ký hiến máu và thống kê
- Xác nhận hiến máu theo ba mức tin cậy: tự khai, người nhà xác nhận, cơ sở y tế đã xác minh xác nhận

**Người hiến máu**
- Đặt và hủy lịch hiến máu, nhắc lịch và nhắc "đã có thể hiến lại"
- Theo dõi chỉ số sức khỏe (tùy chọn, có đồng ý, xóa và xuất được) với sàng lọc sơ bộ, không chẩn đoán
- Kiểm soát quyền riêng tư và đồng ý nhận từng kênh thông báo

**Bản đồ**
- Bản đồ bệnh viện và yêu cầu gần bạn, tìm kiếm địa điểm; không bao giờ hiển thị vị trí người hiến

**Thông báo**
- Thông báo trong ứng dụng, email, Web Push (PWA, cài được lên điện thoại) và SMS (mặc định tắt, chạy ở chế độ mock)
- Chỉ gửi SMS / Push khi người dùng đã đồng ý kênh đó; gửi qua outbox có thử lại, không gửi trùng

**Tài khoản và bảo mật**
- Đăng ký / đăng nhập bằng email hoặc tài khoản Google (tùy chọn); refresh token xoay vòng, khóa tài khoản khi nhập sai nhiều lần
- Xuất và xóa dữ liệu cá nhân
- Nhật ký hoạt động (audit), báo cáo vi phạm, giới hạn tần suất cho các thao tác nhạy cảm

**Trải nghiệm**
- Dark mode, giao diện responsive cho máy tính và điện thoại, cài đặt như ứng dụng (PWA) với trang ngoại tuyến

## Công nghệ sử dụng

| Lớp | Công nghệ |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Radix UI), Lucide, React Hook Form, Zod, Leaflet (OpenStreetMap, MapTiler tùy chọn), Recharts, STOMP.js, Sonner, PWA (Service Worker, Web Push) |
| Backend | Java 21, Spring Boot 3.5, Spring Security (JWT, BCrypt), Spring Data JPA / Hibernate, Jakarta Validation, Spring WebSocket (STOMP), Spring Mail, Springdoc OpenAPI (Swagger), Google Identity Services (xác thực ID token), Web Push (VAPID) |
| Cơ sở dữ liệu | PostgreSQL 16, Flyway (quản lý migration V1–V16) |
| Dịch vụ ngoài | OpenStreetMap / MapTiler (ô bản đồ), Nominatim và Photon (tìm địa điểm), Google Identity, email qua Google Apps Script / Brevo / Gmail SMTP |
| Triển khai | Docker, Render (backend), Vercel (frontend) |
| Kiểm thử | JUnit, Spring Boot Test, Vitest |
| Công cụ | VS Code, Maven, npm, pgAdmin / DBeaver, Postman, Git |

---

Được xây dựng với ❤️ bởi Nguyễn Trần Như Ngọc 🐨 – 2026
