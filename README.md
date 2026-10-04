# LIFELY — Emergency Blood Donor Coordination Platform

> **Connect. Donate. Save a Life.**

Đề tài đồ án: *LIFELY – Xây dựng Website kết nối và điều phối người hiến máu trong tình huống khẩn cấp.*

---

## 1. Project Introduction
LIFELY là nền tảng web kết nối người cần máu với người hiến máu phù hợp ở gần, và điều phối phản hồi qua một kênh duy nhất: **kết nối – lọc – điều phối – theo dõi – xác nhận**.
LIFELY **không** thay thế bệnh viện và **không** quyết định ai đủ điều kiện hiến máu.

## 2. Real-world Problem
Khi bệnh nhân cần máu gấp, gia đình thường phải đăng mạng xã hội, gọi từng người, tự tìm người cùng nhóm máu ở gần bệnh viện, tự đếm số người đã xác nhận và xử lý nhiều người cùng phản hồi.

## 3. Solution
Yêu cầu được xác minh, hệ thống lọc donor tương thích và ở gần (luật + khoảng cách Haversine, **không dùng AI**), liên hệ theo vòng bán kính mở rộng dần (0–5 → 5–10 → 10–20 → 20–50 km), cập nhật realtime, và đảm bảo số xác nhận không bao giờ vượt số cần.

## 4. Target Users
Donor · Requester · Organization (bệnh viện/trung tâm, cần admin xác minh) · Admin.

## 5. Features
| Nhóm | Tính năng |
|---|---|
| Landing | Hero + trạng thái mạng lưới (dữ liệu thật từ API), thống kê, cách hoạt động, request gần bạn, bản đồ, trust, footer, SEO, sitemap |
| Auth | Đăng ký/đăng nhập JWT, quên/đặt lại mật khẩu, khóa tài khoản sau 5 lần sai, rate limit |
| Donor | Onboarding 6 bước (lưu & tiếp tục sau), dashboard, bật/tắt sẵn sàng, request được ghép + **giải thích vì sao**, chấp nhận/từ chối, lịch sử hiến, quyền riêng tư, thông báo realtime |
| Requester | Tạo request có xem trước, theo dõi **realtime** (2/5 → 3/5 không reload), timeline vòng đời, donor đã ghép, xác nhận đã hiến, hủy |
| Organization | Hồ sơ, tải tài liệu xác minh, dashboard, request của tổ chức, xác minh request gắn với bệnh viện mình |
| Admin | Dashboard + biểu đồ, quản lý user/request/tổ chức/report, audit log |
| Bản đồ | Leaflet + OpenStreetMap, lọc, bán kính, tìm địa điểm; không bao giờ hiển thị vị trí donor |
| Hỗ trợ | Nút "Need help?" trên mọi trang: gọi nhân viên (Như Ngọc, đổi được trong `.env`), nhắc gọi 115 khi nguy kịch, trợ lý FAQ **theo kịch bản, không AI** |
| Khác | Dark mode (thiết kế riêng), responsive (sidebar / bottom nav), accessibility, Swagger |

## 6. Architecture
Xem **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** (kiến trúc, ERD, vòng đời, sequence, use case, bảng bảo mật; viết bằng Mermaid).
```
Next.js (:3000) --REST + WebSocket(STOMP)--> Spring Boot (:8080) --JDBC--> PostgreSQL (:5432)
```
Backend: Controller → Service → Repository → Database.

## 7. Tech Stack
| Lớp | Công nghệ |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Radix), Lucide, React Hook Form, Zod, Leaflet, Recharts, STOMP.js |
| Backend | Java 21, Spring Boot 3.5.11, Spring Security (JWT, BCrypt), Spring Data JPA/Hibernate, Jakarta Validation, WebSocket, Springdoc OpenAPI |
| Database | PostgreSQL 14+ (đã thử trên 16), Flyway |
| Công cụ | VS Code, DBeaver Community, Postman, Git. **Không dùng Docker** |

## 8. Database Design
Flyway migration trong `backend/src/main/resources/db/migration`:
`V1__baseline` · `V2__create_tables` · `V3__create_constraints` · `V4__create_indexes` · `V5__seed_data`.
Điểm đáng chú ý: `CHECK (units_confirmed <= units_required)`, `UNIQUE (request_id, donor_id)`, ma trận tương thích máu, index cho truy vấn matching, `updated_at` tự cập nhật bằng trigger.
Dữ liệu demo sinh bởi `database/tools/generate_seed.py` (50 users, 30 donors, 8 tổ chức, 20 requests, 107 matches, 102 notifications, đủ 8 nhóm máu và mọi trạng thái).

## 9. Installation
Yêu cầu: **JDK 21, Maven 3.9+, Node.js 20.9+ (khuyến nghị 22), PostgreSQL 14+, Git.**

## 10. PostgreSQL Setup
1. Cài PostgreSQL local.
2. Mở DBeaver → kết nối bằng `postgres` → chạy `database/00_create_database.sql` (tạo user `lifely` và database `lifely`).
   Hoặc: `psql -U postgres -f database/00_create_database.sql`.

## 11. Backend Setup
```bash
cp .env.example .env                  # sửa JWT_SECRET (>= 32 ký tự)
cd backend
mvn -N wrapper:wrapper                # một lần: sinh mvnw / mvnw.cmd
./mvnw spring-boot:run                # Windows: mvnw.cmd spring-boot:run
```
Flyway tự chạy V1→V5 khi khởi động. Swagger UI: http://localhost:8080/swagger-ui.html

## 12. Frontend Setup
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                           # http://localhost:3000
```

## 13. Environment Variables
| Biến | Nơi dùng | Ý nghĩa |
|---|---|---|
| `DB_URL` | backend | mặc định `jdbc:postgresql://localhost:5432/lifely` |
| `DB_USERNAME` / `DB_PASSWORD` | backend | mặc định `lifely` / bắt buộc |
| `JWT_SECRET` | backend | bắt buộc, ≥ 32 ký tự, thiếu là app không khởi động |
| `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL` | backend | mặc định `http://localhost:3000` |
| `DEMO_ENVIRONMENT`, `DEMO_REFRESH_DEADLINES` | backend | dời deadline dữ liệu seed mỗi lần chạy để demo luôn còn hiệu lực |
| `LOG_RESET_LINK` | backend | `true` = in link đặt lại mật khẩu vào log (chưa có email). **Đặt `false` ở production** |
| `UPLOAD_DIR` | backend | thư mục lưu tài liệu tổ chức |
| `NEXT_PUBLIC_SUPPORT_NAME`, `NEXT_PUBLIC_SUPPORT_PHONE` | frontend | tên và số điện thoại nhân viên hỗ trợ hiển thị công khai |
| `NEXT_PUBLIC_API_URL` | frontend | mặc định `http://localhost:8080` |

## 14. Demo Accounts
**Chỉ dùng cho môi trường demo.** Mật khẩu tất cả: `Lifely@2027`

| Email | Vai trò |
|---|---|
| `admin@lifely.demo` | Admin |
| `donor@lifely.demo` | Donor (O+, Quận 1) |
| `requester@lifely.demo` | Requester |
| `hospital@lifely.demo` | Organization (LIFELY General Hospital, đã xác minh) |

**Kịch bản demo (mục 90):** request CRITICAL · O+ · cần 5 đơn vị · LIFELY General Hospital · đã xác nhận 2/5 · còn khoảng 01:42:18.
1. Mở hai cửa sổ: `hospital@lifely.demo` → *Requests* → mở request O+ (cần 5), và `donor@lifely.demo` → *Requests*.
2. Donor mở request (Donor A, 2.1 km, 95%) → xem phần "Why this request was matched to you" → **Accept**.
3. Cửa sổ hospital tự đổi **2 / 5 → 3 / 5** mà không reload.

## 15. API Documentation
Swagger/OpenAPI: `/swagger-ui.html` · JSON: `/api-docs`. Postman: `postman/LIFELY.postman_collection.json` (33 request kèm test).
Định dạng: thành công `{ success, message, data }`; lỗi `{ success:false, message, code[, errors] }`.

## 16. Testing
```bash
cd backend
mvn test                              # unit test (không cần DB): Haversine, tương thích máu, điểm matching, sanitizer
mvn test -Dtest=ApiSecurityIT         # integration: auth, phân quyền, IDOR, validation (cần PostgreSQL + seed)
mvn test -Dtest=ConcurrentAcceptIT    # 6 donor accept cùng lúc request cần 2: đúng 2 thành công
```
Checklist chạy thử toàn hệ thống: **[docs/TEST_CHECKLIST.md](docs/TEST_CHECKLIST.md)**.

## 17. Security
JWT stateless · BCrypt · mặc định mọi endpoint cần đăng nhập · `@PreAuthorize` theo role · kiểm tra quyền sở hữu ở service (chống IDOR) · khóa tài khoản + rate limit · CHECK constraint + khóa dòng cho accept đồng thời · sanitize đầu vào · upload kiểm tra magic bytes · không lộ stack trace · audit log (không ghi mật khẩu/JWT) · WebSocket xác thực JWT ở CONNECT và phân quyền ở SUBSCRIBE.
Chi tiết ở bảng cuối `docs/ARCHITECTURE.md`.

## 18. Privacy
Tọa độ chính xác của donor chỉ dùng để matching, **không** có trong API công khai; chỉ hiển thị quận/huyện. Số điện thoại donor chỉ hiện cho requester **sau khi donor chấp nhận**; số điện thoại requester chỉ hiện cho donor đã chấp nhận. Không lưu thông tin bệnh nhân. Donor tự bật/tắt matching, thông báo, hiển thị khu vực.

## 19. Limitations
- Prototype **chưa** tích hợp EMR bệnh viện, hồ sơ sức khỏe quốc gia, kho máu, xác minh danh tính của nhà nước, cổng SMS chính thức, xác minh đủ điều kiện hiến máu chính thức. **Hệ thống không kết nối với bệnh viện thật.**
- Chưa có email/SMS: link đặt lại mật khẩu được ghi vào log (dev).
- JWT lưu trong `localStorage` (đủ cho prototype; production nên dùng cookie httpOnly + CSRF).
- Rate limit và WebSocket broker chạy trong bộ nhớ một instance (nhiều instance cần Redis/broker ngoài).
- Tài liệu xác minh lưu trên đĩa cục bộ (production nên dùng object storage riêng tư).
- Danh sách request công khai lọc/phân trang trong bộ nhớ (đủ cho quy mô nhỏ).
- Quy tắc "84 ngày giữa hai lần hiến" chỉ là tham số điều phối có thể chỉnh (`lifely.matching.min-days-between-donations`), **không** phải quyết định y tế.

## 20. Future Development
Hospital API · tích hợp ngân hàng máu · SMS/Zalo · xác minh danh tính · xác minh donor chính thức · ứng dụng di động · triển khai đa vùng. Không triển khai AI.

## 21. Medical Disclaimer
LIFELY is a coordination platform and does not provide medical diagnosis, treatment, transfusion decisions, or final donor eligibility decisions. Final eligibility and transfusion decisions must be made by qualified healthcare professionals.
