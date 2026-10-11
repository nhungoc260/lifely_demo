# Bật gửi email (quên mật khẩu, thông báo)

Mặc định `MAIL_ENABLED=false`: hệ thống **không gửi email**. Khi đó "Quên mật khẩu" chỉ in liên kết đặt lại vào cửa sổ terminal của backend (dòng có chữ `[DEV ONLY] Password reset link`). Muốn người dùng nhận email thật, làm các bước sau.

## 1. Tạo mật khẩu ứng dụng cho Gmail dùng để gửi

1. Vào https://myaccount.google.com/security và bật **Xác minh 2 bước** cho Gmail đó (nếu chưa bật).
2. Vào https://myaccount.google.com/apppasswords, đặt tên `LIFELY`, bấm **Create**.
3. Copy chuỗi 16 ký tự Google hiện ra và **viết liền, không có dấu cách**. Đây là mật khẩu riêng cho việc gửi mail, không phải mật khẩu Gmail. Có thể xóa nó bất cứ lúc nào trong trang này.

## 2. Điền vào file `.env` (thư mục gốc `LIFELY`)

**Cách nhanh (khuyên dùng):** mở terminal trong thư mục `LIFELY` và chạy

```powershell
powershell -ExecutionPolicy Bypass -File .\setup-mail.ps1
```

Script hỏi Gmail dùng để gửi và mật khẩu ứng dụng (dán vào, không hiện ra màn hình, dấu cách tự được bỏ), rồi tự ghi 4 dòng bên dưới vào `.env`. Lưu ý: Gmail nhập vào phải **đúng tài khoản Google đã tạo mật khẩu ứng dụng**, nếu không Gmail sẽ báo sai mật khẩu.

**Cách thủ công:** sửa các dòng sau trong `.env`

```
MAIL_ENABLED=true
MAIL_USERNAME=<Gmail dùng để gửi>
MAIL_PASSWORD=<16 ký tự mật khẩu ứng dụng>
ADMIN_NOTIFY_EMAIL=<Gmail nhận thông báo của admin>
```

File `.env` đã nằm trong `.gitignore`, không được commit lên GitHub.

## 3. Chạy lại backend và kiểm tra

Khi backend khởi động sẽ in một dòng cho biết trạng thái:

- `Email: ĐÃ BẬT, gửi từ x***@gmail.com`: đã sẵn sàng.
- `Email: ĐANG TẮT (...)`: chưa bật, đọc lại bước 2 (thường do thiếu `MAIL_ENABLED=true` hoặc `MAIL_USERNAME`).

Sau đó vào trang **Quên mật khẩu**, nhập email của một tài khoản có thật. Email đến trong vài giây, nhớ xem cả mục **Spam**. Sau khi đặt lại mật khẩu xong, người dùng nhận thêm một email xác nhận "Mật khẩu LIFELY đã được đổi".

## Nếu mail vẫn không đến

Tìm trong terminal backend dòng `Email to ... could not be sent:`, phía sau là lý do:

| Lý do thường gặp | Cách sửa |
|---|---|
| `Authentication failed` / `Username and Password not accepted` | Sai mật khẩu ứng dụng (có dấu cách, copy thiếu) hoặc Gmail chưa bật Xác minh 2 bước. Tạo lại mật khẩu ứng dụng. |
| `Could not connect to host` / `timeout` | Mạng hoặc tường lửa chặn cổng 587 tới `smtp.gmail.com`. |
| Không có dòng lỗi và không có mail | Xem mục Spam, và chắc chắn email nhập vào là email đã đăng ký trong hệ thống. |
