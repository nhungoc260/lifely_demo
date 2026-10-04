# Database

| File | Mục đích |
|---|---|
| `00_create_database.sql` | Tạo user `lifely` và database `lifely` (chạy một lần bằng `postgres`) |
| `reset_dev_db.sql` | Xóa và tạo lại database rỗng (**chỉ dev**) |
| `tools/generate_seed.py` | Sinh `V5__seed_data.sql` (dữ liệu demo, tất định). `pip install bcrypt` rồi chạy |

Migration thật nằm ở `backend/src/main/resources/db/migration` (Flyway tự chạy khi backend khởi động).

## Kết nối bằng DBeaver Community
1. New Database Connection → PostgreSQL.
2. Host `localhost`, Port `5432`, Database `lifely`, Username `lifely`, Password theo `.env`.
3. Test Connection → Finish. Bảng `flyway_schema_history` cho biết các migration đã áp dụng.

## Quy tắc quan trọng
- **Không sửa** migration đã chạy; muốn đổi schema hãy thêm `V7__...sql`.
- Ràng buộc `ck_req_units_confirmed` là lớp bảo vệ cuối cùng: `units_confirmed` không bao giờ vượt `units_required`.
