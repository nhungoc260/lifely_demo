# Báo cáo kiểm chứng

Tài liệu này ghi **chính xác** cái gì đã được kiểm chứng, bằng cách nào, và cái gì **chưa**. Mục tiêu là bạn biết rõ mức độ tin cậy trước khi chạy.

## 1. Đã biên dịch backend với mã nguồn thư viện thật
Môi trường phát triển không tải được Maven Central, nên backend được biên dịch bằng `javac` với `-sourcepath` trỏ vào **mã nguồn** (GitHub) của đúng các phiên bản dự án dùng: Spring Framework 6.2.15, Spring Boot 3.5.11, Spring Security 6.5.8, Spring Data 3.5.9, Hibernate 6.6.40, Jackson 2.19.2, Jakarta Persistence/Validation/Servlet, JJWT 0.12.6, Swagger core 2.2.30, SLF4J 2.0.17, JUnit 5.12.2, Mockito 5.17.0. Lombok được khai triển bằng script (getter/setter/constructor).
- Kết quả: **0 lỗi biên dịch trong 151 file Java** (main + test).
- Đã thử độ nhạy: cố ý chèn lỗi (kiểu sai, method không tồn tại, gọi sai method trên repository) và `javac` bắt được cả ba.
- Giới hạn: đây là kiểm tra kiểu/chữ ký. Nó không chạy Spring, nên không chứng minh ứng dụng khởi động được.

## 2. Test Java đã CHẠY thật: 18/18 đạt
JUnit 5 được biên dịch từ mã nguồn rồi chạy: `GeoUtilsTest` (4), `BloodCompatTest` (5), `SanitizerTest` (3) và `MatchingScoreTest` (6, chạy trên bản trích nguyên văn hàm `score()`).
Chưa chạy được vì cần Mockito/Spring/PostgreSQL: `HealthServiceTest`, `ApiSecurityIT`, `ConcurrentAcceptIT` (đã biên dịch được).

## 3. Kiểm tra tĩnh những lỗi Spring hay gặp (`tools/verify`)
| Kiểm tra | Kết quả |
|---|---|
| Vòng phụ thuộc giữa 46 bean | 0 |
| Endpoint trùng trong 71 endpoint | 0 |
| Thuộc tính sai trong JPQL / derived query (17 repository) | 0 |
| Key cấu hình thiếu | 0 |
| 154 trường entity so với schema PostgreSQL thật | 0 lệch |
| 25 cặp DTO backend ↔ interface TypeScript | 0 lệch |

Mỗi script đã được thử bằng cách cài lỗi cố ý. Lần thử đầu cho thấy hai script có lỗi (không bắt được vòng phụ thuộc, và phần kiểm query chưa từng chạy); cả hai đã sửa rồi kiểm lại trước khi tin kết quả.

## 4. Database trên PostgreSQL 16 thật
Migration V1→V6 dựng từ đầu thành công; seed đúng số lượng; CHECK `units_confirmed <= units_required` chặn 6/5; 20 phiên đồng thời giành đúng 3 slot (3/3); các câu SQL thống kê, độ phủ và ẩn danh hóa đều chạy đúng.

## 5. Frontend
`tsc`, `eslint` (0 lỗi), 19 test (vitest), `next build`; chạy bản production kiểm tra route và header bảo mật.

## 6. CHƯA kiểm chứng (cần bạn chạy)
- **Khởi động Spring Boot thật**: wiring bean, parse HQL lúc khởi động, Flyway trong ứng dụng, Spring Security filter chain.
- WebSocket/STOMP thực tế, gửi email Gmail thật.
- Giao diện trên trình duyệt (bản đồ, poster/QR, dark mode, 375px), luồng end-to-end frontend ↔ backend.
- `ApiSecurityIT` và `ConcurrentAcceptIT` trên PostgreSQL thật.

Cách chạy: xem `docs/TEST_CHECKLIST.md`. Nếu có lỗi khi khởi động, gửi log để sửa.
