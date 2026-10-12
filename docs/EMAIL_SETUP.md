# Bật gửi email (quên mật khẩu, thông báo) bằng Brevo

Mặc định `MAIL_ENABLED=false`: hệ thống **không gửi email**. Khi đó "Quên mật khẩu" chỉ in liên kết đặt lại vào terminal backend (dòng `[DEV ONLY] Password reset link`).

LIFELY gửi mail qua **API HTTPS của Brevo** (miễn phí 300 mail/ngày). Không dùng SMTP nên chạy được cả trên Render gói miễn phí (Render chặn cổng SMTP 25/465/587).

## Cách 0: Gmail qua Google Apps Script (khuyên dùng khi deploy, miễn phí, không cần số điện thoại)

Dùng chính Gmail của bạn gửi mail qua một đoạn script nhỏ của Google. Backend gọi script bằng HTTPS (cổng 443) nên chạy được trên Render gói miễn phí. Mail gửi từ Gmail thật nên ít vào Spam. Giới hạn của Google: khoảng 100 người nhận mỗi ngày với Gmail thường.

1. Vào https://script.google.com (đăng nhập đúng Gmail muốn dùng để gửi), bấm **Dự án mới** (New project).
2. Xóa code mẫu, dán toàn bộ nội dung file `tools/apps-script-mail.gs`. Đổi `SECRET` thành một chuỗi bí mật dài do bạn tự đặt, rồi bấm **Lưu**.
3. Bấm **Triển khai** (Deploy) > **Tùy chọn triển khai mới** > loại **Ứng dụng web** (Web app):
   - Thực thi dưới dạng (Execute as): **Tôi** (Me)
   - Ai có quyền truy cập (Who has access): **Bất kỳ ai** (Anyone)
4. Bấm **Triển khai**. Google hỏi cấp quyền: chọn tài khoản, bấm **Nâng cao** > **Đi tới ... (không an toàn)** > **Cho phép** (đây là script của chính bạn).
5. Copy **URL ứng dụng web** (dạng `https://script.google.com/macros/s/.../exec`).
6. Điền vào `.env`:
```
MAIL_ENABLED=true
MAIL_APPS_SCRIPT_URL=<URL vừa copy>
MAIL_APPS_SCRIPT_SECRET=<đúng SECRET đã đặt ở bước 2>
ADMIN_NOTIFY_EMAIL=<Gmail nhận thông báo của admin>
```
7. Chạy lại backend. Log phải có dòng `Email: ĐÃ BẬT (Gmail qua Apps Script)`.

Nếu sửa script sau này, phải **Triển khai > Quản lý bản triển khai > Sửa > Phiên bản mới** thì thay đổi mới có hiệu lực.

## Chọn cách gửi khác

- **Gmail SMTP** (đơn giản, chạy trên máy cá nhân): điền `MAIL_ENABLED=true`, `MAIL_USERNAME`, `MAIL_PASSWORD` (App Password 16 ký tự lấy ở https://myaccount.google.com/apppasswords; dấu cách được tự bỏ), `ADMIN_NOTIFY_EMAIL`. Để trống `BREVO_API_KEY`. **Không dùng được trên Render gói miễn phí** vì Render chặn cổng SMTP.
- **Brevo API** (dùng khi deploy): điền `BREVO_API_KEY` và `MAIL_FROM`, làm theo phần dưới. Có `BREVO_API_KEY` thì hệ thống tự ưu tiên Brevo.

## 1. Tạo tài khoản và API key Brevo

1. Đăng ký tại https://www.brevo.com (có thể dùng Gmail của bạn).
2. **Senders, Domains & Dedicated IPs > Senders > Add a sender**: nhập tên `LIFELY` và Gmail của bạn, Brevo gửi mã xác minh về Gmail, nhập mã để xác minh.
3. **SMTP & API > API Keys > Generate a new API key**, đặt tên `LIFELY`, copy chuỗi bắt đầu bằng `xkeysib-` (chỉ hiện một lần).

## 2. Điền vào `.env` (thư mục gốc `LIFELY`)

```
MAIL_ENABLED=true
BREVO_API_KEY=xkeysib-...
MAIL_FROM=<Gmail đã xác minh làm Sender ở bước 1>
MAIL_FROM_NAME=LIFELY
ADMIN_NOTIFY_EMAIL=<Gmail nhận thông báo của admin>
```

Khi deploy (Render...), đặt các biến này trong Environment Variables thay vì file `.env`.

## 3. Chạy lại backend và kiểm tra

- `Email: ĐÃ BẬT (Brevo API), gửi từ x***@gmail.com`: đã sẵn sàng.
- `Email: ĐANG TẮT (...)`: thiếu `MAIL_ENABLED=true`, `MAIL_FROM` hoặc `BREVO_API_KEY`.

Vào trang **Quên mật khẩu**, nhập email của một tài khoản có thật. Mail đến trong vài giây, nhớ xem cả mục **Spam**. Lần đầu gửi từ Gmail cá nhân qua Brevo dễ vào Spam hơn.

## Nếu mail không đến

Tìm trong log backend dòng `Email to ... could not be sent`:

| Lý do | Cách sửa |
|---|---|
| `HTTP 401` | API key sai hoặc bị xóa. Tạo lại key. |
| `HTTP 400` kèm "sender" | `MAIL_FROM` chưa xác minh làm Sender trong Brevo. |
| `HTTP 403` | Tài khoản Brevo chưa được kích hoạt gửi mail giao dịch; xem email/thông báo từ Brevo. |
| Không có dòng lỗi | Xem mục Spam, và chắc chắn email nhập vào đã đăng ký trong hệ thống. |
