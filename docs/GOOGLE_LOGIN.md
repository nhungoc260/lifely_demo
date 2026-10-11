# Đăng nhập bằng Google

Người dùng bấm **Tiếp tục với Google** ở trang Đăng nhập hoặc Đăng ký.

> **Client ID của dự án đã được điền sẵn** trong `backend/src/main/resources/application.yml` và `frontend/lib/google.ts`, nên giải nén xong chạy lại là dùng được, không cần sửa file `.env`. Client ID là thông tin công khai (có trong mọi trang web dùng Google). **Client secret thì không dùng và không được đưa vào dự án.** Muốn đổi sang project Google khác hoặc tắt tính năng, xem mục "Đổi hoặc tắt" bên dưới.

## Cách hoạt động

Google chỉ cho biết **email và tên**, không biết người dùng là người hiến máu, người cần máu hay bệnh viện. Vì vậy:

1. **Email đã có tài khoản**: đăng nhập luôn, vai trò giữ nguyên.
2. **Email mới**: chưa tạo tài khoản. Giao diện chuyển sang màn hình **Hoàn tất hồ sơ** (`/register/google`) để chọn vai trò và nhập số điện thoại (bắt buộc, vì người cần máu liên hệ người hiến qua số này). Sau đó mới tạo tài khoản.
3. Người hiến máu đi tiếp vào các bước onboarding như đăng ký thường. **Tổ chức vẫn phải nộp tài liệu để quản trị viên xác minh**; vai trò **Quản trị viên không thể có được qua Google**.

Backend xác thực ID token bằng cách gọi Google, rồi kiểm tra token được cấp đúng cho ứng dụng này (`aud`), đúng nơi phát hành (`iss`), chưa hết hạn và email đã được Google xác minh. Tài khoản tạo từ Google không có mật khẩu dùng được; người dùng vẫn có thể đặt mật khẩu bằng chức năng "Quên mật khẩu".

## Cấu hình (làm một lần)

### 1. Lấy Client ID ở Google Cloud Console

1. Vào https://console.cloud.google.com, tạo một **project** mới (ví dụ `lifely`).
2. Menu **APIs & Services > OAuth consent screen** (hoặc *Google Auth Platform*): chọn **External**, điền tên ứng dụng (`LIFELY`), email hỗ trợ, email liên hệ, rồi lưu.
3. Khi ứng dụng còn ở trạng thái **Testing**, chỉ các email được thêm trong mục **Test users** mới đăng nhập được. Hãy thêm Gmail của bạn và của người sẽ demo. Muốn mọi người dùng được thì bấm **Publish app** (chỉ xin quyền cơ bản email và profile nên không cần Google duyệt).
4. **APIs & Services > Credentials > Create credentials > OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins**: thêm `http://localhost:3000` (khi đưa lên mạng, thêm cả địa chỉ web thật).
   - Không cần điền *Authorized redirect URIs*.
5. Bấm Create và copy **Client ID** (dạng `xxxx.apps.googleusercontent.com`). Không cần dùng Client secret.

### 2. Chạy lại cả hai

Tắt (`Ctrl + C`) rồi chạy lại backend (`mvn spring-boot:run`) và frontend (`npm run dev`), vì cả hai chỉ đọc cấu hình lúc khởi động. Mở http://localhost:3000/login sẽ thấy nút Google dưới nút Đăng nhập.

### Đổi hoặc tắt

- **Đổi Client ID** (project Google khác): điền cùng một giá trị vào hai nơi. Trong `.env` ở thư mục gốc: `GOOGLE_CLIENT_ID=...`. Trong `frontend/.env.local`: `NEXT_PUBLIC_GOOGLE_CLIENT_ID=...`. Biến môi trường luôn được ưu tiên hơn giá trị điền sẵn.
- **Tắt đăng nhập Google**: đặt hai biến trên thành rỗng (`GOOGLE_CLIENT_ID=` và `NEXT_PUBLIC_GOOGLE_CLIENT_ID=`), nút Google sẽ ẩn.

## Tài khoản tạo bằng Google và mật khẩu

Tài khoản tạo từ Google không có mật khẩu dùng được. Hai việc liên quan:

- **Xóa tài khoản**: hộp thoại xóa có thêm nút Google. Bấm vào và chọn đúng tài khoản Google đã đăng nhập (email phải trùng với email của tài khoản LIFELY) để xác nhận, không cần mật khẩu.
- **Đặt mật khẩu** (nếu muốn đăng nhập bằng email và mật khẩu): dùng "Quên mật khẩu". Khi chưa cấu hình gửi email (`MAIL_ENABLED=false`, mặc định), liên kết đặt lại **không được gửi qua email** mà được in trong cửa sổ terminal đang chạy backend, ở dòng có chữ `[DEV ONLY] Password reset link for <email>:`. Copy liên kết đó dán vào trình duyệt (có hiệu lực 30 phút). Muốn gửi email thật cho người dùng, làm theo `docs/EMAIL_SETUP.md`.

## Xử lý lỗi thường gặp

| Hiện tượng | Nguyên nhân và cách sửa |
|---|---|
| Không thấy nút Google | Chưa chạy lại `npm run dev`, hoặc `NEXT_PUBLIC_GOOGLE_CLIENT_ID` đang để rỗng trong `frontend/.env.local`. |
| `Error 400: origin_mismatch` | Chưa thêm đúng `http://localhost:3000` vào **Authorized JavaScript origins** (đúng cả cổng, không có dấu `/` ở cuối). Sau khi sửa có thể mất vài phút mới có hiệu lực. |
| "Access blocked" hoặc "app chưa được xác minh" | Ứng dụng đang ở chế độ Testing: thêm email vào **Test users** hoặc Publish app. |
| Báo `GOOGLE_NOT_CONFIGURED` (503) | `GOOGLE_CLIENT_ID` đang để rỗng trong `.env` của backend. |
| Google báo `invalid_client` hoặc "OAuth client was not found" | Client ID bị sai ký tự: so sánh với trang **Clients** trong Google Cloud Console rồi sửa lại ở hai nơi. |
| Báo `INVALID_GOOGLE_TOKEN` | Client ID ở backend và frontend không trùng nhau, hoặc màn hình Hoàn tất hồ sơ để quá lâu (token Google chỉ sống khoảng 1 giờ): đăng nhập Google lại. |
| Báo `GOOGLE_UNAVAILABLE` | Máy chủ backend không gọi được `oauth2.googleapis.com` (mạng, tường lửa). |
