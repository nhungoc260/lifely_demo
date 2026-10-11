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
| 153 trường entity so với schema PostgreSQL thật | 0 lệch |
| 25 cặp DTO backend ↔ interface TypeScript | 0 lệch |

Mỗi script đã được thử bằng cách cài lỗi cố ý. Lần thử đầu cho thấy hai script có lỗi (không bắt được vòng phụ thuộc, và phần kiểm query chưa từng chạy); cả hai đã sửa rồi kiểm lại trước khi tin kết quả.

## 4. Database trên PostgreSQL 16 thật
Migration V1→V6 dựng từ đầu thành công; seed đúng số lượng; CHECK `units_confirmed <= units_required` chặn 6/5; 20 phiên đồng thời giành đúng 3 slot (3/3); các câu SQL thống kê, độ phủ và ẩn danh hóa đều chạy đúng.

## 5. Việt hóa giao diện
Toàn bộ chữ hiển thị được trích bằng trình phân tích cú pháp TypeScript (JSX text, thuộc tính, toast, thông báo lỗi), dịch theo từ điển 760+ mục rồi thay đúng vị trí; nhãn sinh từ enum (trạng thái, vai trò, lý do báo cáo, hành động nhật ký) nằm trong `frontend/lib/labels.ts`. Thông báo lỗi, thông báo hệ thống và email của backend cũng bằng tiếng Việt; dữ liệu demo được việt hóa bằng migration `V7`. Đã quét lại 11 trang công khai sau khi build: 0 chuỗi tiếng Anh. Các trang cần đăng nhập được kiểm tra bằng cách trích lại chuỗi từ mã nguồn (còn 0 chuỗi giao diện tiếng Anh).

## 6. Frontend
`tsc`, `eslint` (0 lỗi), 19 test (vitest), `next build`; chạy bản production kiểm tra route và header bảo mật.

## 7. CHƯA kiểm chứng (cần bạn chạy)
- **Khởi động Spring Boot thật**: wiring bean, parse HQL lúc khởi động, Flyway trong ứng dụng, Spring Security filter chain.
- WebSocket/STOMP thực tế, gửi email Gmail thật.
- Giao diện trên trình duyệt (bản đồ, poster/QR, dark mode, 375px), luồng end-to-end frontend ↔ backend.
- `ApiSecurityIT` và `ConcurrentAcceptIT` trên PostgreSQL thật.

Cách chạy: xem `docs/TEST_CHECKLIST.md`. Nếu có lỗi khi khởi động, gửi log để sửa.

---

## 8. Cập nhật đợt "refresh token + email khẩn cấp + dữ liệu thật" (kiểm chứng riêng)

**Đã chạy thật**
- **PostgreSQL 16 thật**: migration `V1→V8` chạy sạch từ đầu (`ON_ERROR_STOP`). Seed mới: 50 user, 30 donor (đủ 8 nhóm máu), 8 tổ chức, 20 request, 113 match, 110 thông báo; tên người, bệnh viện, thông báo đều là tiếng Việt, không còn "Demo"/"Nguyễn Văn A".
- `tools/verify`: `check_spring` 0 vòng phụ thuộc / 0 endpoint trùng / 0 lỗi JPQL / 0 key cấu hình thiếu; `check_mapping` **160 trường entity** khớp schema thật (gồm `RefreshToken` ↔ `refresh_tokens`), 0 lệch; `check_contract` 25 cặp DTO↔TypeScript, 0 lệch.
- **Biên dịch Java với mã nguồn thư viện thật** (Spring Framework 6.2.15, Spring Data 3.5.9, Spring Boot 3.5.11, Spring Security 6.5.8, Jakarta Servlet/Persistence/Validation, slf4j, swagger, JUnit 5): các file mới/sửa `RefreshToken`, `RefreshTokenRepository`, `RefreshTokenService`, `RefreshCookie`, `AuthController`, `AuthService`, `NotificationService`, `RefreshTokenIT` biên dịch **0 lỗi**. Đã thử độ nhạy bằng 3 lỗi cố ý (method không tồn tại, sai kiểu trả về, sai method trong test) và `javac` bắt được cả ba. `SecurityConfig` chỉ còn lỗi do chưa nạp mã nguồn Jackson (`ObjectMapper`), không thuộc phần đã sửa. Lombok được khai triển bằng script.
- Frontend: `tsc` 0 lỗi, `eslint` **0 lỗi 0 cảnh báo** (đã thay `watch` bằng `useWatch`), **31/31 test** (12 test mới cho gia hạn phiên, đã thử phá logic để chắc test bắt được), `next build` thành công.

**Vẫn CHƯA chạy được (cần bạn chạy trên máy có Maven)**
- `mvn test`, đặc biệt `RefreshTokenIT`, `ApiSecurityIT`, `ConcurrentAcceptIT`: viết và biên dịch được nhưng chưa thực thi.
- Khởi động Spring Boot thật: wiring bean, Flyway trong ứng dụng, security filter chain với cookie/CORS credentials.
- Luồng trình duyệt thật: cookie `lifely_refresh` được trình duyệt lưu/gửi giữa `localhost:3000` và `localhost:8080`, tải lại trang vẫn đăng nhập, gia hạn tự động sau 15 phút.
- Gửi email Gmail thật cho donor khi có yêu cầu (cần `MAIL_ENABLED=true` + App Password).
- Chưa có test end-to-end trên trình duyệt (Playwright/Cypress).

## 9. Cập nhật quy tắc matching (dành nhóm máu đa năng + thời gian di chuyển theo giờ)

**Đã chạy thật (không cần Maven):** các lớp thuần `BloodCompat`, `TravelTimeEstimator`, `ScoreCalculator` cùng 3 file test (`BloodCompatTest`, `TravelTimeEstimatorTest`, `ScoreCalculatorTest`) được biên dịch và thực thi bằng bộ chạy tối giản (JUnit giả lập chỉ gồm `@Test` và `assert*`): **27/27 đạt**. Đã thử phá từng quy tắc (bỏ ưu tiên đúng nhóm, bỏ phạt đa năng, bỏ giờ cao điểm) và test báo đỏ đúng chỗ.
`MatchingService`, `MatchingProperties` và 4 file test biên dịch **0 lỗi** với mã nguồn Spring/Mockito thật; `tools/verify` vẫn 0 lỗi.

**Chưa chạy:** `MatchingScoreTest` (cần Mockito thật + Maven) và toàn bộ `mvn test`; kiểm tra bind cấu hình `lifely.matching.*` (kiểu `LocalTime`) khi khởi động Spring Boot thật.

## 10. Cập nhật điểm 5: phân cấp độ tin cậy của lần hiến máu (V9)

**Đã chạy thật**
- PostgreSQL 16: tạo lại database sạch, `V1→V9` chạy được (`ON_ERROR_STOP`). Demo có đủ ba mức (SELF_REPORTED 38, REQUESTER_CONFIRMED 7, ORG_VERIFIED 36). Ràng buộc đã thử trực tiếp: `ORG_VERIFIED` thiếu tên tổ chức, mức không hợp lệ, và hai lần hiến cho cùng một match đều bị từ chối; bản ghi hợp lệ được chấp nhận.
- `tools/verify`: 0 vòng phụ thuộc bean, 74 endpoint không trùng, 0 lỗi JPQL, **165 trường entity** khớp schema thật, 25 cặp DTO↔TypeScript không lệch.
- Biên dịch Java với mã nguồn Spring/Mockito thật: `VerificationLevel`, `DonorVerificationService`, `DonationHistory(+Repository)`, `DonationEntry`, `DonorService`, `DonorController`, `MatchService`, `RequestMatchEntry`, `VerificationLevelTest`, `DonorVerificationServiceTest` không có lỗi (chỉ còn lỗi do chưa nạp Hibernate/Jackson). Đã thử cài lỗi cố ý và `javac` bắt được.
- `VerificationLevelTest` chạy thật (cùng 27 test matching, tổng 29/29 đạt).
- Frontend: `tsc`, `eslint`, 31 test, `next build` đều đạt.

**Chưa chạy được:** `DonorVerificationServiceTest` (cần Mockito thật), `DonorVerificationIT`, `mvn test` nói chung; luồng thao tác trên trình duyệt (người nhà/tổ chức bấm xác nhận, nâng mức, huy hiệu hiển thị cho người cần máu). `MatchService.complete` (đường nâng mức) chưa có test tự động riêng, cần kiểm tra thủ công theo `docs/TEST_CHECKLIST.md`.

## 11. Giao diện theo vai trò (người dùng cuối khác khung quản trị)

**Đã chạy thật:** `tsc` 0 lỗi, `eslint` 0 lỗi, **42/42 test** frontend (có test cấu hình menu, nhãn truy cập của menu tài khoản, logic mục đang chọn), `next build` thành công cả 41 route.

**Chưa làm được:** xem giao diện thật trên trình duyệt (môi trường này không tải được trình duyệt để chụp màn hình). Cần bạn mở web, đăng nhập 4 tài khoản demo và đối chiếu theo `docs/TEST_CHECKLIST.md`, ở cả chế độ sáng/tối và rộng 375px / 768px / 1280px.

## 12. Làm lại trang chủ người hiến máu và người cần máu cho dễ hiểu

**Đã chạy thật:** `tsc` 0 lỗi, `eslint` 0 lỗi, **60/60 test** frontend, `next build` 41 route, contract DTO↔TypeScript 0 lệch. Logic trạng thái người hiến (`lib/donor-status.ts`) và câu tiến độ yêu cầu (`lib/request-progress.ts`) có test, gồm ranh giới đúng 84 ngày (ngày thứ 84 sẵn sàng, ngày thứ 83 còn nghỉ). Các khối giao diện mới được render ra HTML thật trong test để kiểm tra nội dung và nhãn truy cập. Mọi câu chữ về luồng xử lý (yêu cầu của người nhà chờ quản trị viên xác minh; "Phản hồi" = người hiến đã nhận lời hoặc từ chối) đã đối chiếu với mã backend.

**Chưa làm được:** nhìn giao diện thật (không có trình duyệt trong môi trường làm việc) và thử với người dùng thật. Cần chạy checklist mục "Trang chủ người hiến máu và người cần máu: dễ hiểu".

## 13. Kiểm tra giao diện bằng trình duyệt thật (có chụp màn hình)

**Cách làm:** chạy bản build production của frontend, mở bằng trình duyệt Chromium không đầu (headless) ở các độ rộng 1280, 1024, 768, 390px, chế độ tối và sáng. Backend không chạy được trong môi trường làm việc nên API được **giả lập bằng dữ liệu mô phỏng đúng hình dạng DTO**: ảnh chỉ để kiểm tra bố cục, không chứng minh logic nghiệp vụ.

**Lỗi tìm thấy qua ảnh thật và đã sửa (test tự động không bắt được):**
- Người hiến máu trên điện thoại: khối trạng thái bị bóp thành cột một chữ mỗi dòng (đổi sang lưới).
- Tổ chức y tế và admin trên điện thoại: thẻ vai trò trên thanh đầu bị ép thành 3 dòng, thanh đầu chật (bỏ thẻ ở màn hình hẹp, ẩn chấm "trực tiếp").
- Admin trên điện thoại: nhãn "Báo cáo vi phạm" bị cắt ở thanh dưới (thêm nhãn ngắn "Báo cáo").
- Trang tổng quan tổ chức y tế gần như trống (thêm danh sách yêu cầu đang mở/đã đóng).
- Biểu đồ admin: hai đường "Tất cả yêu cầu" và "Nguy kịch" gần như cùng màu (đường tổng đổi sang xám trung tính).
- Nút "Cần hỗ trợ?" đè lên vùng thanh điều hướng dưới ở 768px.

**Chưa kiểm tra được:** hành vi thật với backend (đăng nhập, thời gian thực), các trang con ngoài 4 trang tổng quan, trình duyệt khác Chromium (Safari/Firefox), thiết bị cảm ứng thật, độ tương phản bằng công cụ đo (chỉ xem bằng mắt), và thử với người dùng thật.
