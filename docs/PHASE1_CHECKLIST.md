# PHASE 1 – Checklist xác minh

Chạy lần lượt. Chỉ sang Phase 2 khi cả 7 mục đều đạt.

| # | Kiểm tra | Cách làm | Kết quả mong đợi |
|---|----------|----------|------------------|
| 1 | Frontend chạy | `cd frontend && npm install && npm run dev` → mở http://localhost:3000 | Thấy trang LIFELY |
| 2 | Backend chạy | `cd backend && mvn spring-boot:run` (hoặc `./mvnw`) | Log có `Started LifelyApplication` |
| 3 | PostgreSQL kết nối | Log backend có `HikariPool-1 - Start completed` | Không có lỗi kết nối |
| 4 | Migration chạy | Log có `Successfully applied 1 migration`; DBeaver thấy bảng `app_metadata`, `flyway_schema_history` | Có 2 bảng, 2 dòng trong `app_metadata` |
| 5 | `/api/health` | `curl http://localhost:8080/api/health` | JSON `success: true`, `database.status: "UP"`, `migrationVersion: "1"` |
| 6 | Frontend gọi backend | Tải lại http://localhost:3000 | Thẻ "Backend is UP", Database UP, Migration V1 |
| 7 | Bảo mật mặc định | `curl -i http://localhost:8080/api/donors/me` | HTTP 401, JSON `code: "UNAUTHORIZED"` |

Kiểm tra bổ sung:
- Tắt PostgreSQL rồi gọi `/api/health` → HTTP 503, `code: "DATABASE_DOWN"`, frontend hiện "Backend unreachable".
- Swagger UI: http://localhost:8080/swagger-ui.html
- Unit test: `cd backend && mvn test` → 2 test của `HealthServiceTest` đạt.
