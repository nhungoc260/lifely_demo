# Thông báo: in-app, email, SMS (mock), Web Push — và gọi điện thủ công

| Kênh | Trạng thái | Cách bật |
|---|---|---|
| In-app (WebSocket + danh sách) | Chạy thật, luôn bật | – |
| Web Push (thông báo đẩy) | **Chạy thật** khi đã đặt khóa VAPID và `NOTIFY_PUSH_ENABLED=true` (đã kiểm chứng mã hóa và gửi với dịch vụ push giả; **chưa thử với điện thoại thật**) | `tools/push/generate-vapid-keys.sh`, đặt `VAPID_*`, bật cờ |
| Email | Chạy thật nếu cấu hình mail (có sẵn từ trước) | `MAIL_ENABLED=true` + thông tin Brevo/Gmail/Apps Script |
| SMS | **Mock** (không gửi thật), mặc định TẮT | `NOTIFY_SMS_ENABLED=true` (vẫn là mock) |
| Cuộc gọi tự động | **Không có** (đã gỡ từ V16). LIFELY không bao giờ tự gọi điện | — |

## Luồng
1. Nghiệp vụ (mời người hiến, đặt lịch, nhắc lịch, báo nhân viên) gọi `OutboxService.enqueue(...)` **trong cùng transaction**. Rollback thì không có gì được gửi.
2. `enqueue` chỉ ghi khi kênh được bật **và** người nhận đã đồng ý kênh đó; `dedupe_key` unique nên xử lý lại cùng sự kiện không tạo tin thứ hai.
3. `OutboxWorker` (mỗi 10 giây) nhận việc bằng `FOR UPDATE SKIP LOCKED` trong transaction ngắn, **gọi nhà cung cấp ngoài transaction**,
   kiểm tra lại ngay trước khi gửi (kênh còn bật, người dùng còn hoạt động và còn đồng ý, yêu cầu còn mở, giới hạn 5 SMS mỗi người mỗi 24 giờ),
   rồi ghi kết quả. Lỗi tạm thời được thử lại tối đa 3 lần với độ trễ 30s, 60s; lỗi vĩnh viễn hoặc hết lần thử ⇒ `FAILED` (nhân viên xếp lại được ở màn chi tiết yêu cầu).
4. Yêu cầu đủ người nhận lời / hủy / hết hạn / bị cơ sở từ chối ⇒ các lời mời chưa gửi bị hủy (`CANCELLED`).
5. Nhật ký nằm ở bảng `notification_outbox` (kênh, người nhận theo ID nội bộ, trạng thái, số lần thử, mã lỗi). Không lưu số điện thoại; tra theo `user_id` lúc gửi.

Không đảm bảo exactly-once: đây là at-least-once. Nội dung tin không có dữ liệu bệnh nhân và có lưu ý rằng việc đủ điều kiện hiến máu do cơ sở y tế quyết định.

## Tích hợp nhà cung cấp thật (chưa làm)
Hiện **chưa khảo sát** điều kiện đăng ký, xác minh số, giới hạn dùng thử, phí và thanh toán của bất kỳ nhà cung cấp SMS nào tại Việt Nam; không giả định dịch vụ nào miễn phí.
Khi đã chọn nhà cung cấp và được phép phát sinh chi phí: thêm một bean `SmsProvider`, đặt `NOTIFY_PROVIDER` khác `mock`, đọc khóa API từ biến môi trường (không ghi vào source), bật kênh.
Test tự động không bao giờ gửi thật: dùng `MockSmsProvider` (có `forceResult` để mô phỏng timeout).

## Web Push
- Miễn phí, chuẩn VAPID; không cần dịch vụ trả phí. Cần **HTTPS** (trừ localhost). iPhone chỉ nhận khi đã "Thêm vào MH chính" (iOS 16.4 trở lên).
- Người dùng bật ở **Hồ sơ → Kênh nhận thông báo**; đăng ký thiết bị chính là đồng ý kênh PUSH. Hủy hết thiết bị = rút đồng ý và hủy tin chưa gửi.
- Đi qua cùng outbox/worker như SMS: chống trùng, thử lại có giới hạn, dừng khi yêu cầu đóng, giới hạn 20 tin mỗi người mỗi ngày. Subscription hết hạn (HTTP 404/410) tự bị xóa.
- Dùng cho: lời mời khẩn cấp, cảnh báo nhân viên cơ sở, xác nhận và nhắc lịch hẹn, nhắc "có thể hiến lại". Nội dung không có dữ liệu bệnh nhân hay dữ liệu sức khỏe.
- Chống SSRF: chỉ gửi tới `https` và host thuộc danh sách dịch vụ push đã biết (`lifely.push.allowed-host-suffixes`).

## Gọi điện thủ công (không tự động)

- LIFELY tự tìm người hiến phù hợp và gửi thông báo (in-app, Web Push, SMS mock nếu bật). **Không có cuộc gọi tự động, không dùng Voice API.**
- Trên trang chi tiết yêu cầu, với người hiến **đã nhận lời**, nhân viên thấy nút **Gọi người hiến** (liên kết `tel:`): bấm sẽ mở ứng dụng gọi điện mặc định của thiết bị, nhân viên tự bấm gọi.
- Số điện thoại chỉ được máy chủ trả về cho chủ yêu cầu / nhân viên cơ sở liên kết / admin và chỉ khi lượt đã nhận lời. Số thiếu hoặc không hợp lệ thì nút bị thay bằng thông báo.
- Việc bấm nút **không** ghi nhận gì. Nhân viên tự chọn kết quả (Chưa liên hệ / Đã liên hệ / Không liên lạc được / Xác nhận có thể tham gia / Không thể tham gia) qua `POST /api/matches/{id}/contact-result`. Giá trị này chỉ là ghi chú điều phối: không đổi trạng thái match, không cộng đơn vị máu, không có nghĩa đủ điều kiện hiến máu.
- Migration V16 hủy mọi tin kênh VOICE còn chờ; worker hủy tin kênh không còn hỗ trợ (`CHANNEL_UNSUPPORTED`).
