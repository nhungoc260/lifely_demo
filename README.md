# LIFELY — Emergency Blood Donor Coordination Platform

> **Connect. Donate. Save a Life.**

Đề tài đồ án: *LIFELY – Xây dựng Website kết nối và điều phối người hiến máu trong tình huống khẩn cấp.*

> **Trạng thái: PHASE 1 – Project Setup.** Các mục đánh dấu _(Phase N)_ sẽ được hoàn thiện ở phase tương ứng.

## 1. Giới thiệu
LIFELY là nền tảng web kết nối người cần máu với người hiến máu phù hợp ở gần, và điều phối phản hồi qua một kênh duy nhất. LIFELY **không** thay thế bệnh viện, **không** quyết định ai đủ điều kiện hiến máu.

## 2–5. Vấn đề, giải pháp, người dùng, tính năng _(hoàn thiện dần theo phase)_
Bốn nhóm người dùng: Donor, Requester, Organization, Admin. Trọng tâm: **kết nối – lọc – điều phối – theo dõi – xác nhận**.

## 6. Kiến trúc
```
Next.js (frontend, :3000) --REST/WebSocket--> Spring Boot (backend, :8080) --JDBC--> PostgreSQL (:5432)
```
Backend theo tầng Controller → Service → Repository → Database.

## 7. Công nghệ
| Lớp | Công nghệ |
|-----|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui (cấu hình thủ công), Lucide, React Hook Form, Zod |
| Backend | Java 21, Spring Boot 3.5.11, Spring Security (JWT, BCrypt), Spring Data JPA/Hibernate, Jakarta Validation, WebSocket (STOMP), Springdoc OpenAPI |
| Database | PostgreSQL 14+ (đã thử trên 16), Flyway |
| Công cụ | VS Code, DBeaver Community, Postman, Git. Không dùng Docker |

## 8. Thiết kế database _(Phase 2)_
Hiện có migration `V1__baseline.sql` (bảng `app_metadata`). Schema nghiệp vụ bắt đầu từ V2.

## 9–12. Cài đặt

### Yêu cầu
JDK 21, Maven 3.9+, Node.js 20.9+ (khuyến nghị 22), PostgreSQL 14+, Git.

### PostgreSQL
1. Cài PostgreSQL local.
2. Mở DBeaver, kết nối bằng tài khoản `postgres`, chạy file `database/00_create_database.sql` (tạo user `lifely` và database `lifely`).
   Hoặc: `psql -U postgres -f database/00_create_database.sql`.

### Biến môi trường
```bash
cp .env.example .env                       # backend đọc file này (../.env)
cp .env.example frontend/.env.local        # frontend chỉ cần NEXT_PUBLIC_API_URL
```
Sửa `JWT_SECRET` thành chuỗi ngẫu nhiên ≥ 32 ký tự (`openssl rand -base64 48`). Không commit `.env`.

### Backend
Lần đầu cần tạo Maven Wrapper (một lần, cần Maven đã cài):
```bash
cd backend
mvn -N wrapper:wrapper        # sinh mvnw / mvnw.cmd
```
Sau đó:
```bash
./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run
```
Swagger UI: http://localhost:8080/swagger-ui.html

### Frontend
```bash
cd frontend
npm install
npm run dev                   # http://localhost:3000
```

## 13. Biến môi trường
| Biến | Nơi dùng | Ý nghĩa |
|------|----------|---------|
| `DB_URL` | backend | JDBC URL, mặc định `jdbc:postgresql://localhost:5432/lifely` |
| `DB_USERNAME` | backend | mặc định `lifely` |
| `DB_PASSWORD` | backend | bắt buộc |
| `JWT_SECRET` | backend | bắt buộc, ≥ 32 ký tự, app không khởi động nếu thiếu |
| `CORS_ALLOWED_ORIGINS` | backend | mặc định `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | frontend | mặc định `http://localhost:8080` |

## 14. Tài khoản demo _(Phase 2/4, ghi ở đây khi có seed data)_

## 15. API
Swagger/OpenAPI: `/swagger-ui.html`. Phase 1 có `GET /api/health`. Mọi API trả về `{ success, message, data }` hoặc `{ success: false, message, code }`.

## 16. Kiểm thử
```bash
cd backend && mvn test
```
Postman: import `postman/LIFELY.postman_collection.json`. Checklist: `docs/PHASE1_CHECKLIST.md`.

## 17–18. Bảo mật và quyền riêng tư
Đã có từ Phase 1: API stateless, mặc định mọi endpoint cần đăng nhập, 401/403 trả JSON chuẩn, CORS theo whitelist, không lộ stack trace, secret chỉ qua biến môi trường. Phân quyền theo role, chống brute-force, audit log: _(Phase 4, 14, 16)_.

## 19. Giới hạn của prototype
LIFELY chưa tích hợp: hệ thống bệnh án điện tử (EMR) của bệnh viện, hồ sơ sức khỏe quốc gia, kho máu, xác minh danh tính của nhà nước, cổng SMS chính thức, xác minh đủ điều kiện hiến máu chính thức. Hệ thống **không** kết nối với bệnh viện thật.

## 20. Hướng phát triển
Hospital API, tích hợp ngân hàng máu, SMS, Zalo, xác minh danh tính, ứng dụng di động, triển khai đa vùng. Không triển khai AI.

## 21. Medical Disclaimer
LIFELY is a coordination platform and does not provide medical diagnosis, treatment, transfusion decisions, or final donor eligibility decisions. Final eligibility and transfusion decisions must be made by qualified healthcare professionals.
