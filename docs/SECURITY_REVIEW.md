# Rà soát bảo mật và quyền riêng tư

Phạm vi: các tính năng thêm trong lần nâng cấp này và những luồng liên quan. Cột "bằng chứng" nói rõ đã kiểm tra bằng cách nào; mục nào chưa chạy thật được ghi rõ.

## 1. Ai xem được gì
| Dữ liệu | Ai xem được | Cơ chế | Bằng chứng |
|---|---|---|---|
| Số điện thoại **người hiến** | Người cần máu / cơ sở / admin của **đúng yêu cầu**, và **chỉ sau khi người hiến nhận lời** (hoặc đã hiến) | `MatchService.requesterEntry`: `reveal` chỉ khi `ACCEPTED/COMPLETED` | Đọc code |
| Số điện thoại **người cần máu** | Người hiến **chỉ sau khi họ nhận lời** | `MatchService.toDonorResponse`: `showContact` | Đọc code |
| Dữ liệu sức khỏe (nhịp tim, huyết áp, cân nặng) | **Chỉ chính người hiến đó**. Không có API nào cho người cần máu, cơ sở hay admin xem | Chỉ `DonorHealthService` đọc bảng; mọi truy vấn gắn `user_id` của người đang đăng nhập; `@PreAuthorize("hasRole('DONOR')")` | Đọc code (grep: chỉ 1 lớp truy cập bảng); SQL: người khác thấy 0 bản ghi (`tools/sql-tests/health_sql_test.sql`) |
| Vị trí người hiến | Không trả ra ngoài DTO nào; chỉ dùng để tính khoảng cách. Người hiến tự xuất được dữ liệu của mình | Đọc code | Đọc code |
| Vị trí yêu cầu | Công khai trên bản đồ (tọa độ do người tạo chọn) | `PublicRequestSummary` | **Cải thiện cần làm**: làm tròn tọa độ hoặc bắt chọn cơ sở y tế, tránh lộ địa chỉ nhà |
| Đăng ký thiết bị push (endpoint, khóa) | Không ai qua API; không nằm trong xuất dữ liệu (chỉ số lượng thiết bị) | Không có DTO trả ra | Đọc code |
| Nhật ký gửi SMS/push | Nhân viên/chủ yêu cầu chỉ thấy **số lượng theo trạng thái**, không thấy số điện thoại hay danh tính | `DeliveryService` | Đọc code |
| Admin | Thấy email, SĐT, vai trò; **không** có endpoint xem dữ liệu sức khỏe | `AdminUserDto` | Đọc code |

## 2. Log và dữ liệu nhạy cảm
- Đã grep mọi câu lệnh `log.*` trong backend: không có câu nào ghi số điện thoại, endpoint push, khóa, token hay chỉ số sức khỏe. Chế độ giả lập SMS/gọi chỉ ghi số đã che (`*******123`) và khóa chống trùng.
- Cấu hình: không bật `show-sql`, không có bộ lọc ghi nội dung request, `include-stacktrace: never`.
- Nhật ký nghiệp vụ (`audit_logs`) chỉ ghi sự kiện và **số lượng** (ví dụ "đã xóa N bản ghi sức khỏe"), không ghi giá trị.
- Web Push: `WebPushSender` chỉ ghi mã trạng thái HTTP, không ghi endpoint hay nội dung.

## 3. Các biện pháp đã làm
- **Chống SSRF khi gửi push**: server chỉ gửi tới `https` và host thuộc danh sách dịch vụ push đã biết (`fcm.googleapis.com`, `push.services.mozilla.com`, `push.apple.com`, `notify.windows.com`); từ chối `localhost`, IP nội bộ, `user:pass@`, host giả dạng. Có test (`PushEndpointSecurityTest`).
- **Khóa VAPID riêng** chỉ đọc từ biến môi trường; mặc định rỗng trong cấu hình; không có trong source (đã grep). Sinh khóa bằng `tools/push/generate-vapid-keys.sh`.
- **Đồng ý**: SMS/gọi/push mặc định chưa đồng ý; lưu dữ liệu sức khỏe cần bật riêng và rút được bất cứ lúc nào; nhắc hiến lại tách riêng với thông báo khẩn cấp.
- **Xóa tài khoản** trước đây chỉ ẩn danh hóa nên dữ liệu mới (sức khỏe, thiết bị push, đồng ý, lịch hẹn, nhật ký thông báo) sẽ còn lại. Đã bổ sung `UserDataExtras.erase` và đưa các dữ liệu này vào "Dữ liệu của tôi" (xuất). SQL đã chạy thật: xóa sạch và trả lại chỗ trong khung giờ (`tools/sql-tests/erase_sql_test.sql`).
- **Service worker** không lưu bất kỳ phản hồi API hay trang cá nhân nào; chỉ lưu trang ngoại tuyến và biểu tượng. Liên kết khi bấm thông báo chỉ mở đường dẫn cùng nguồn.
- Nội dung SMS/push **không có dữ liệu bệnh nhân hay dữ liệu sức khỏe**, và không khẳng định người hiến đủ điều kiện hay có sẵn máu.

## 4. Những điểm nhóm cần nêu trong báo cáo (hạn chế hiện có)
1. **Dữ liệu sức khỏe là dữ liệu nhạy cảm.** Nhóm cần đối chiếu quy định bảo vệ dữ liệu cá nhân hiện hành của Việt Nam (có Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân, quy định riêng cho dữ liệu nhạy cảm; nhóm tự kiểm tra bản còn hiệu lực). Bản đồ án dùng **dữ liệu giả**.
2. Chưa mã hóa ở mức trường (chỉ HTTPS khi truyền và mã hóa đĩa của nhà cung cấp hạ tầng).
3. Chưa có chính sách lưu trữ tự động hết hạn cho dữ liệu sức khỏe và nhật ký.
4. Chưa có xác thực hai lớp cho nhân viên cơ sở và admin.
5. Chưa kiểm thử xâm nhập, chưa đánh giá tác động bảo vệ dữ liệu.
6. Ô mô tả yêu cầu là văn bản tự do và hiển thị cho người hiến: người dùng có thể vô tình ghi tên hoặc chẩn đoán bệnh nhân. Cần dòng nhắc trên biểu mẫu.
7. Giới hạn tần suất theo IP (`RateLimitFilter`) chỉ áp cho: đăng nhập, đăng ký, đăng nhập Google, quên/đặt lại mật khẩu, báo cáo vi phạm, liên hệ và xóa tài khoản. Các API mới **không** có giới hạn theo IP; chúng chỉ bị chặn bởi giới hạn nghiệp vụ: yêu cầu trùng trong 10 phút và số yêu cầu mở tối đa, tối đa 10 thiết bị push mỗi người, tối đa 500 bản ghi sức khỏe mỗi người, và số SMS/gọi/push mỗi người mỗi ngày (kể cả "Gửi thử"). Nên thêm giới hạn theo IP cho `/api/push/*` và `/api/donors/me/health/*` nếu triển khai thật.

## 5. Phát hiện cần xử lý trước khi triển khai thật (có sẵn từ trước, **chưa sửa**)
- `frontend/lib/support.ts` chứa **họ tên, số điện thoại, email cá nhân** của thành viên trong mã nguồn. Nên chuyển sang biến môi trường hoặc bỏ khi công khai mã nguồn.
- Migration cũ `V5__seed_data.sql` chứa **băm mật khẩu của tài khoản demo** cho toàn bộ dữ liệu mẫu cũ (`*@lifely.demo`). Không được chạy trên cơ sở dữ liệu sản xuất; V15 đã đánh dấu các tài khoản này `is_demo = TRUE` để nhận diện. `tools/demo/clear_demo.sql` chỉ xóa bộ `demo-*@lifely.demo` mới, **không** xóa bộ cũ; muốn xóa bộ cũ cần thao tác riêng có kiểm soát.
- Mật khẩu của bộ demo mới **không** nằm trong repo: truyền qua biến `DEMO_PASSWORD` khi chạy `seed_demo.sh`.

## 6. Chưa kiểm chứng
Toàn bộ backend Java chưa được compile/chạy test trong môi trường này; các kết luận "đọc code" ở trên dựa vào đọc mã, không phải chạy ứng dụng. Cần chạy `mvn test` và thử thủ công bằng hai tài khoản khác vai trò để xác nhận không lộ dữ liệu.
