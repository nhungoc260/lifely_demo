# Bộ kiểm tra tĩnh (chạy được không cần khởi động Spring)

Các script này phát hiện những lỗi mà trình biên dịch Java **không** thấy nhưng sẽ làm Spring hỏng khi khởi động hoặc làm giao diện sai dữ liệu.

| Script | Kiểm tra gì |
|---|---|
| `check_spring.py` | vòng phụ thuộc giữa các bean, endpoint trùng ("Ambiguous mapping"), tên thuộc tính trong JPQL và derived query, key `@Value`/`@ConfigurationProperties` có trong `application.yml`, tên role trong `@PreAuthorize` |
| `check_mapping.py` | mọi trường entity JPA khớp bảng/cột/kiểu trong **PostgreSQL thật** (tương đương `ddl-auto: validate`, nhưng báo toàn bộ lỗi một lần). Cần DB `lifely` đã chạy migration |
| `check_contract.py` | các record DTO ở backend khớp từng trường với interface TypeScript ở `frontend/types/domain.ts` |

```bash
pip install pyyaml
python tools/verify/check_spring.py
python tools/verify/check_mapping.py     # cần PostgreSQL local + migration
python tools/verify/check_contract.py
```
Mỗi script in số lỗi; kết quả mong đợi là `0`. Chạy lại sau mỗi lần sửa entity, repository, DTO hoặc controller.
