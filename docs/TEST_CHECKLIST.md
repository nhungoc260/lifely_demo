# Checklist chạy thử toàn hệ thống (một lần)

## A. Khởi động
| # | Việc | Kỳ vọng |
|---|---|---|
| 1 | Tạo DB: chạy `database/00_create_database.sql` | user + database `lifely` |
| 2 | `cp .env.example .env` rồi `cd backend && mvn -N wrapper:wrapper && ./mvnw spring-boot:run` | log: `Successfully applied 6 migrations`, `Started LifelyApplication`, `Demo data refreshed` |
| 3 | `curl localhost:8080/api/health` | `database.status = UP`, `migrationVersion = 6` |
| 4 | `cd frontend && npm install && npm run dev` | http://localhost:3000 hiện landing, "LIFELY NETWORK ACTIVE", số liệu thật |
| 5 | `mvn test` | các unit test đạt |
| 6 | `mvn test -Dtest=ApiSecurityIT` và `-Dtest=ConcurrentNhận lờiIT` | đạt |
| 7 | Import Postman collection, chạy theo thứ tự | các test đạt |

## B. Luồng nghiệp vụ trên giao diện
| # | Kịch bản | Kỳ vọng |
|---|---|---|
| 1 | Đăng ký Donor mới → onboarding 6 bước → "Lưu & Tiếp tục sau" ở bước 3 → đăng nhập lại | quay lại đúng bước |
| 2 | Donor bật Sẵn sàng hiến máu, hồ sơ đủ | dashboard hiện "Sẵn sàng hiến máu", có request gần |
| 3 | Requester tạo request O+ (xem trước → Create) | trạng thái *Chờ xác minh* |
| 4 | Admin → Requests → Verify | request chuyển *Đã liên hệ người hiến*, donor phù hợp nhận thông báo realtime |
| 5 | Donor mở request → xem giải thích → Nhận lời | requester thấy xác nhận tăng **không reload** |
| 6 | Với request cần 2: để 3 donor cùng Nhận lời | chỉ 2 thành công, người còn lại thấy "Yêu cầu này không còn nhận thêm người hiến máu" |
| 7 | Requester "Đánh dấu đã hiến" | donor có thêm 1 dòng lịch sử, tổng hiến +1 |
| 8 | Requester hủy request | donor liên quan nhận thông báo hủy |
| 9 | Donor B truy cập match của Donor A (đổi id trong URL/API) | 404 |
| 10 | Donor vào `/admin/dashboard` | bị chuyển về trang của donor; gọi API admin → 403 |
| 11 | Organization chưa verified tạo request | Pending verification; admin verify tổ chức → request sau tự verified |
| 12 | Quên mật khẩu → lấy link trong log backend → đặt lại | đăng nhập được bằng mật khẩu mới |
| 13 | 5 lần đăng nhập sai | tài khoản khóa 15 phút (429) |
| 14 | Dark mode, màn 375 / 768 / 1280 px | không tràn ngang, sidebar ↔ bottom nav |
| 15 | Chờ ~5 phút với request CRITICAL chưa đủ người | thông báo "Đã mở rộng phạm vi tìm kiếm", level 2 |

## C. Liên hệ & email
| # | Kịch bản | Kỳ vọng |
|---|---|---|
| 1 | Vào `/info/contact`, gửi tin nhắn (đăng nhập hoặc không) | thông báo "Đã gửi tin nhắn" |
| 2 | Admin → Tin nhắn | thấy tin ở trạng thái New, dashboard hiện "1 new message(s)" |
| 3 | Bật `MAIL_ENABLED=true` + BREVO_API_KEY, gửi tin mới | Gmail admin nhận email "[LIFELY] Tin nhan lien he moi..." |
| 4 | Admin dashboard → "Gửi báo cáo này qua email" | Gmail nhận báo cáo tổng hợp; nếu chưa cấu hình email thì báo lỗi `MAIL_DISABLED` rõ ràng |
| 5 | Gửi 6+ tin liên tiếp trong 1 phút | bị giới hạn tần suất (429) |

## D. Tính năng bổ sung
| # | Kịch bản | Kỳ vọng |
|---|---|---|
| 1 | Requester tạo request, chọn nhóm máu + vị trí | khung "Độ phủ người hiến máu" hiện 4 vòng 5/10/20/50 km; vùng quá ít donor chỉ ghi "Một vài", không có số |
| 2 | Chọn vị trí rất xa (ví dụ Hà Nội) | báo "No available donors…" kèm số điện thoại nhân viên |
| 3 | Request đã verified → trang chi tiết → "Chia sẻ yêu cầu này" | Sao chép liên kết / Chia sẻ / Poster để in hoạt động |
| 4 | Mở poster, bấm Print | A4 có nhóm máu lớn, QR; quét QR mở `/requests/{id}` |
| 5 | Request chưa verified | mục Share báo "có sau khi được xác minh"; `/requests/{id}` public trả 404 |
| 6 | Donor: Profile / Dashboard | thấy thẻ "Sẵn sàng được kết nối" hoặc "Đang nghỉ đến …" và cột mốc huy hiệu |
| 7 | Donor → Profile → "Tải dữ liệu của tôi" | tải file JSON, **không** chứa mật khẩu |
| 8 | Donor → "Xóa tài khoản" nhập sai mật khẩu | báo "Mật khẩu không đúng" |
| 9 | Dùng tài khoản test mới → xóa tài khoản đúng mật khẩu | bị đăng xuất; đăng nhập lại thất bại; admin vẫn thấy request cũ ở dạng ẩn danh |
| 10 | Admin → Yêu cầu → Xem | thấy chi tiết, donor đã ghép, lịch sử, nút Xác minh / Từ chối / Hủy |
| 11 | Vào đường dẫn không tồn tại | trang 404 của LIFELY; lỗi giao diện → trang "Đã xảy ra sự cố" có Thử lại |
| 12 | `npm test` trong `frontend/` | 19 test đạt |


> Giao diện đã được việt hóa toàn bộ: các tên nút/nhãn ở trên là bản tiếng Việt. Một số từ phổ biến (Admin, email, QR) được giữ nguyên.

## Phiên đăng nhập (refresh token)
- [ ] Đăng nhập `donor@lifely.demo`, F5 trang dashboard: vẫn đăng nhập (không bị đẩy về /login).
- [ ] DevTools > Application > Cookies: có `lifely_refresh`, cột **HttpOnly** được tích, Path `/api/auth`. localStorage **không** chứa JWT (chỉ có `lifely.session = 1`).
- [ ] Đặt `JWT_EXPIRATION_MINUTES=1`, đợi hơn 1 phút rồi thao tác: ứng dụng tự gia hạn, không bị đăng xuất; tab Network thấy `POST /api/auth/refresh`.
- [ ] Bấm Đăng xuất, F5: về trang đăng nhập; cookie `lifely_refresh` đã bị xóa.
- [ ] Mở 2 tab, đăng xuất ở tab A: tab B gia hạn thất bại và quay về đăng nhập.
- [ ] Admin khóa tài khoản donor đang đăng nhập: sau tối đa 15 phút (hoặc lần gia hạn kế) donor bị đăng xuất.
- [ ] Đổi/đặt lại mật khẩu: các thiết bị khác phải đăng nhập lại.

## Email khẩn cấp
- [ ] Cấu hình `MAIL_*`, tạo donor bằng email thật, tạo request khớp: donor nhận email "[LIFELY] Yêu cầu khẩn cấp gần bạn".
- [ ] Donor tắt "nhận thông báo khẩn cấp": không nhận email nữa, thông báo trong ứng dụng vẫn có.

## Xác nhận hiến máu theo cấp độ tin cậy
- [ ] Đăng nhập donor: trang **Lịch sử hiến máu** có thẻ tóm tắt và mỗi lần hiến có nhãn (Tự khai báo / Người nhà xác nhận / Cơ sở y tế xác nhận).
- [ ] Requester (người nhà) mở yêu cầu của mình, bấm "Đánh dấu đã hiến" cho một donor đã nhận lời: lần hiến ghi ở mức **Người nhà xác nhận**, donor KHÔNG có huy hiệu cơ sở y tế.
- [ ] Đăng nhập `hospital@lifely.demo` (Bệnh viện Chợ Rẫy, đã xác minh), mở yêu cầu của tổ chức, bấm "Xác nhận đã hiến (cơ sở y tế)": lần hiến ở mức **Cơ sở y tế xác nhận**, donor nhận thông báo, huy hiệu xuất hiện bên cạnh donor trong danh sách của người cần máu.
- [ ] Với lần hiến người nhà đã ghi nhận trước, tổ chức bấm "Xác nhận với tư cách cơ sở y tế": mức được nâng, **số lần hiến không tăng thêm**; bấm lần nữa không đổi gì.
- [ ] Tổ chức chưa xác minh (PENDING) hoặc tổ chức khác không nâng được mức; admin bấm xác nhận chỉ ra mức Người nhà xác nhận.
- [ ] Audit log có bản ghi MATCH_COMPLETED kèm `verificationLevel`.

## Giao diện theo vai trò
- [ ] `donor@lifely.demo` và `requester@lifely.demo`: có thanh menu **ngang** phía trên (không có thanh bên), mục đầu tiên là **Trang chủ** (dashboard của vai trò, không còn mục "Tổng quan" trùng), menu **không bị rớt dòng** ở độ rộng 1024px, 1280px, 1440px; chuông có số thông báo chưa đọc; avatar mở menu tài khoản (có nhãn vai trò, Hồ sơ/Dữ liệu, Trang giới thiệu LIFELY, Đăng xuất); có chân trang với tuyên bố y tế.
- [ ] Người cần máu có nút **Tạo yêu cầu máu** nổi bật trên thanh menu; người hiến máu thì không.
- [ ] `hospital@lifely.demo` (xanh lam) và `admin@lifely.demo` (xám than): có thanh bên, thẻ vai trò, và nút **Trang chủ LIFELY**; admin có dòng "Khu vực quản trị".
- [ ] Bốn vai trò nhìn khác nhau ngay từ cái nhìn đầu tiên; chữ trên thẻ KPI của người hiến máu là "Sẵn sàng" (không còn "Available").
- [ ] Rộng 375px: thanh điều hướng dưới có nút Trang chủ; không tràn ngang. Chế độ tối: màu nhãn và đường viền vẫn đọc rõ.
- [ ] Menu tài khoản đóng khi bấm ra ngoài hoặc nhấn Esc; điều hướng bằng bàn phím được.

## Trang chủ người hiến máu và người cần máu: dễ hiểu
- [ ] **Người hiến máu:** chỉ có MỘT khối trạng thái ở đầu trang. Với `donor@lifely.demo` (đang trong thời gian nghỉ) khối này nói "đang trong thời gian nghỉ", KHÔNG đồng thời hiện "sẵn sàng hiến máu". Tắt công tắc "Nhận yêu cầu hiến máu" thì khối đổi thành "đang tắt nhận yêu cầu"; bật lại thì đổi lại, không cần tải lại trang.
- [ ] Phần "Yêu cầu đang chờ bạn trả lời" nằm ngay dưới khối trạng thái (không phải cuộn xuống mới thấy), có câu giải thích "Mức phù hợp". Khi đang nghỉ/tắt mà vẫn còn yêu cầu cũ, có dòng nhắc "đã được gửi cho bạn trước đó".
- [ ] Ba thẻ số liệu bên dưới có nhãn dễ hiểu; thẻ "Mốc tiếp theo" không lặp lại trạng thái sẵn sàng.
- [ ] **Người cần máu:** chỉ có một nút tạo yêu cầu ở thanh menu (không còn nút thứ hai trong trang). Mỗi yêu cầu có một câu nói rõ đang ở bước nào (ví dụ "Đang chờ quản trị viên xác minh…", "Chưa có ai nhận lời…") và dòng "x/y người đã nhận lời".
- [ ] Yêu cầu đã hủy/hết hạn/đủ người nằm trong mục thu gọn "Yêu cầu đã đóng", không lẫn với yêu cầu đang mở.
- [ ] Tài khoản chưa có yêu cầu nào: hiện khối 3 bước hướng dẫn và nút "Tạo yêu cầu máu".
- [ ] Nhờ một người chưa từng dùng LIFELY mở thử hai trang này và hỏi: "Bạn nghĩ mình cần làm gì tiếp theo?". Nếu họ trả lời sai hoặc do dự thì ghi lại câu chữ gây khó hiểu.
