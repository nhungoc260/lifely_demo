# Hướng dẫn deploy LIFELY miễn phí (Neon + Render + Vercel + UptimeRobot)

Thứ tự: **Neon (DB) → Render (backend) → Vercel (frontend) → quay lại Render sửa 2 biến → UptimeRobot**.

## 1. Neon: database
1. neon.tech → Create project (Postgres 16, region Singapore).
2. Bấm Connect, lấy host / database / user / password.
3. Ghép:
   - `DB_URL=jdbc:postgresql://<host>/<database>?sslmode=require`
   - `DB_USERNAME=<user>`
   - `DB_PASSWORD=<password>`

## 2. Render: backend
1. dashboard.render.com → New → Web Service → chọn repo GitHub.
2. Root Directory: `backend` · Runtime: **Docker** · Instance type: **Free**.
3. Health Check Path: `/api/health`
4. Environment Variables:

| Biến | Giá trị |
|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | từ Neon |
| `JWT_SECRET` | chuỗi ngẫu nhiên >= 32 ký tự (đừng dùng chuỗi dev) |
| `DEMO_ENVIRONMENT` | `true` |
| `DEMO_REFRESH_DEADLINES` | `true` |
| `LOG_RESET_LINK` | `false` |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAME_SITE` | `Lax` |
| `FRONTEND_URL` | tạm điền `https://placeholder.vercel.app`, sửa ở bước 4 |
| `CORS_ALLOWED_ORIGINS` | như trên, sửa ở bước 4 |
| `MAIL_ENABLED` | `true` |
| `MAIL_APPS_SCRIPT_URL`, `MAIL_APPS_SCRIPT_SECRET` | copy từ file `.env` trên máy |
| `ADMIN_NOTIFY_EMAIL` | email của bạn |
| `GOOGLE_CLIENT_ID` | (nếu dùng đăng nhập Google) |

5. Deploy. Lần đầu build mất vài phút. Xong mở `https://<tên>.onrender.com/api/health` phải có kết quả.

## 3. Vercel: frontend
1. vercel.com → Add New → Project → chọn repo.
2. Root Directory: `frontend` (framework tự nhận Next.js).
3. Environment Variables:

| Biến | Giá trị |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<tên>.onrender.com` |
| `BACKEND_URL` | `https://<tên>.onrender.com` |
| `NEXT_PUBLIC_USE_PROXY` | `true` |
| `NEXT_PUBLIC_SITE_URL` | link Vercel (điền sau khi có, rồi Redeploy) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | (nếu dùng Google) |
| `NEXT_PUBLIC_SUPPORT_NAME` | Như Ngọc |
| `NEXT_PUBLIC_SUPPORT_PHONE` | số đã được đồng ý hiển thị công khai |

4. Deploy, nhận link dạng `https://<tên>.vercel.app`.

> Vì sao có `BACKEND_URL` + `NEXT_PUBLIC_USE_PROXY`: trình duyệt gọi `/api/...` cùng domain Vercel rồi Vercel chuyển sang Render,
> nên cookie đăng nhập là cookie bên thứ nhất và chạy được trên Safari/iPhone. Realtime (WebSocket) vẫn nối thẳng tới Render.

## 4. Quay lại Render
Sửa `FRONTEND_URL` và `CORS_ALLOWED_ORIGINS` thành link Vercel thật (không có dấu `/` cuối) → Save → tự redeploy.

Nếu dùng Google login: Google Cloud Console → Credentials → Authorized JavaScript origins → thêm link Vercel.

## 5. UptimeRobot: chống ngủ
New Monitor → HTTP(s) → URL `https://<tên>.onrender.com/api/health` → Interval 5 phút.

## Lưu ý
- Render free: 512 MB RAM, ngủ sau 15 phút không có truy cập (đã có UptimeRobot), ổ đĩa tạm nên `uploads/` mất khi redeploy.
- Không commit file `.env`. Secret chỉ dán vào Render/Vercel.
- Mở điện thoại bằng link Vercel, không dùng link Render.
