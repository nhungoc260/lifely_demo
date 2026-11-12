# LIFELY – Website kết nối và điều phối hiến máu khẩn cấp

Link: https://lifely-demo.vercel.app

## Giới thiệu

LIFELY giúp người cần máu gấp tìm được người hiến máu phù hợp ở gần bệnh viện và điều phối phản hồi trên một kênh duy nhất, thay vì đăng mạng xã hội hay gọi điện từng người.

Khi một yêu cầu máu được tạo, hệ thống tự lọc người hiến tương thích về nhóm máu, đang sẵn sàng, đã nghỉ đủ thời gian giữa hai lần hiến và ở gần bệnh viện. Việc liên hệ đi theo từng vòng bán kính mở rộng dần (0–5 km, 5–10 km, 10–20 km, 20–50 km, rồi toàn quốc). Mọi cập nhật hiển thị theo thời gian thực, và số người nhận lời không bao giờ vượt quá số đơn vị máu cần.

LIFELY phân biệt **số người đã nhận lời** với **số đơn vị đã được cơ sở y tế xác nhận hiến thực tế**. Ngoài luồng khẩn cấp, người hiến có thể **đặt lịch hiến trước** tại cơ sở đã xác minh.

LIFELY không tự gọi điện, không thay thế bệnh viện và không quyết định ai đủ điều kiện hiến máu.

## Đối tượng sử dụng

- **Người hiến máu**: khai báo hồ sơ, bật/tắt sẵn sàng, nhận và phản hồi yêu cầu phù hợp, đặt lịch hiến, theo dõi lịch sử hiến.
- **Người cần máu**: tạo yêu cầu, theo dõi tiến độ, xác nhận người đã hiến.
- **Tổ chức y tế**: sau khi được xác minh, tạo yêu cầu đáng tin cậy, quản lý kho máu, khung giờ hiến, lịch hẹn và nhân viên.
- **Quản trị viên**: quản lý người dùng, yêu cầu, tổ chức, báo cáo vi phạm và theo dõi vận hành.
- **Khách**: xem thống kê, bản đồ và các yêu cầu công khai.

## Tính năng chính

- **Điều phối khẩn cấp**: ghép người hiến theo nhóm máu, khoảng cách và điểm ưu tiên (không dùng AI), kèm lý do được ghép; leo thang theo cấp bán kính; cập nhật realtime.
- **Cơ sở y tế**: kho máu có cảnh báo sắp hết, khung giờ hiến, quản lý lịch hẹn, nhật ký hiến máu và thống kê.
- **Người hiến**: đặt/hủy lịch, nhắc lịch, theo dõi chỉ số sức khỏe tùy chọn, kiểm soát quyền riêng tư.
- **Chi phí và hỗ trợ đi lại**:
  - Người hiến và người cần máu xem quãng đường, thời gian và chi phí tới bệnh viện bằng xe máy, Grab, Be, Xanh SM (giá ước tính, không phải giá chốt).
  - Cơ sở y tế công bố mức hỗ trợ đi lại (mặc định 50.000đ/lần hiến) và phí gửi xe, rồi ghi nhận khi đã chi, cho cả lịch hiến đặt trước và yêu cầu máu khẩn cấp gắn cơ sở. Yêu cầu của gia đình (không gắn cơ sở) không có khoản này. LIFELY không thu hay chuyển tiền.
  - Cơ sở và admin đều có trang riêng **Hỗ trợ đi lại** (menu bên trái): danh sách lượt hiến cần ghi nhận và đã ghi nhận, gộp lịch hiến đặt trước và yêu cầu khẩn cấp; admin theo dõi tổng hợp theo từng cơ sở. Hằng số giá và nguồn nằm ở `frontend/lib/travel-cost.ts`.
- **Giám sát bất thường**: yêu cầu được duyệt tự động; ca đáng ngờ được đưa vào hàng đợi để admin xem (`/admin/abuse`).
- **Bản đồ**: bệnh viện và yêu cầu gần bạn; không hiển thị vị trí người hiến.
- **Thông báo**: trong ứng dụng, email, Web Push (PWA) và SMS (mặc định tắt, chế độ mock).
- **Trải nghiệm**: dark mode, responsive, cài như ứng dụng (PWA).

## Công nghệ sử dụng

| Lớp | Công nghệ |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Leaflet (OpenStreetMap), Recharts, STOMP.js, PWA |
| Backend | Java 21, Spring Boot 3.5, Spring Data JPA, Spring WebSocket (STOMP), Springdoc OpenAPI |
| Cơ sở dữ liệu | PostgreSQL 16, Flyway (migration V1–V22) |
| Triển khai | Docker, Render (backend), Vercel (frontend) |
| Kiểm thử | JUnit, Spring Boot Test, Vitest |

---

Được xây dựng với ❤️ bởi Nguyễn Trần Như Ngọc 🐨 – 2026
