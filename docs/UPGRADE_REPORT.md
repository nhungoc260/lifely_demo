# Báo cáo nâng cấp LIFELY (Luồng A/B, thông báo, nhất quán dữ liệu)

> **Đọc trước:** phần backend Java trong bản nâng cấp này **chưa được compile hay chạy test** (môi trường làm việc không truy cập được Maven Central).
> Phần đã chạy thật: migration trên PostgreSQL 16, các câu SQL/đồng thời ở tầng DB, frontend (tsc, eslint, vitest, `next build`).
> Việc đầu tiên cần làm trên máy bạn: `cd backend && mvn test` rồi `mvn test -Dtest='*IT'` (xem mục 7).

## 1. Kiến trúc đã có (được tái sử dụng, không viết lại)
Spring Boot 3.5 + PostgreSQL + Flyway; Next.js 16. Đã có: vòng đời yêu cầu có lịch sử trạng thái, matching theo vòng bán kính, leo thang/hết hạn tự động,
khóa `SELECT … FOR UPDATE` + CHECK ở DB cho accept, thông báo in-app + email sau commit, WebSocket, phân quyền, audit, kho máu, phân cấp xác nhận hiến (V9).

## 2. Lỗi / rủi ro đã xác định và cách xử lý
| # | Vấn đề | Xử lý |
|---|---|---|
| 1 | Chưa có Luồng B (đặt lịch) | Module `appointment` + V13 (tách hẳn khỏi yêu cầu máu và kho) |
| 2 | Bệnh viện không được báo khi có yêu cầu mới | `StaffAlertService`: in-app (+SMS/Voice nếu bật và đã đồng ý) cho **đúng** nhân viên cơ sở được gắn |
| 3 | Không có SMS/gọi tự động; email không log/retry | Outbox + worker + adapter `SmsProvider`/`VoiceCallProvider` (mock mặc định) |
| 4 | Yêu cầu người dùng thường phải chờ admin | Yêu cầu gắn **cơ sở đã xác minh** được huy động ngay, đánh dấu "chờ cơ sở xác nhận"; cơ sở từ chối ⇒ dừng toàn bộ. Yêu cầu không gắn cơ sở vẫn cần admin |
| 5 | "Số người nhận lời" bị coi là "đã có máu" (FULFILLED khi đủ người bấm đồng ý) | Tách `units_confirmed` (nhận lời) khỏi `units_received` (cơ sở xác nhận hiến). Đủ người nhận lời chỉ dừng mời thêm; `FULFILLED` chỉ khi đủ `units_received` |
| 6 | Người nhà gọi `complete` làm đổi `lastDonationDate`/`totalDonations` của người hiến | Chỉ nhân viên cơ sở (ORG_VERIFIED) được đổi hồ sơ người hiến, cộng kho và tính vào lượng nhận. Người nhà chỉ ghi nhận mức thấp |
| 7 | Tạo yêu cầu không idempotent, giới hạn 5 yêu cầu có race | Header `Idempotency-Key` + unique index + advisory lock theo người dùng + chặn yêu cầu trùng trong 10 phút |
| 8 | Kho: cập nhật ghi đè tuyệt đối, không có lịch sử | Khóa dòng khi cập nhật + sổ `inventory_movements` cho mọi thay đổi |
| 9 | Đồng ý chỉ là một cờ chung | `notification_consents` theo kênh SMS/VOICE (mặc định **chưa đồng ý**), rút đồng ý hủy tin chưa gửi |
| 10 | Matching vẫn mời người đang giữ lời nhận cho yêu cầu khác còn mở | `findCandidates` loại các donor này |

## 3. Migration
- `V13__donation_slots_appointments.sql`: `donation_slots` (CHECK `booked_count <= capacity`), `appointments` (unique một người một khung giờ còn hiệu lực).
- `V14__outbox_consent_ledger_idempotency.sql`: `units_received`, `facility_review`, `idempotency_key`, mở rộng `ck_history_source` và `ck_notif_type`,
  `appointments.reminder_sent_at`, `notification_consents`, `notification_outbox`, `inventory_movements`.
- Chạy sạch V1→V14 trên PostgreSQL 16 (DB trống). Dữ liệu cũ được backfill `units_received` từ số lượt COMPLETED.

## 4. API / trạng thái / quy tắc
- Lịch hẹn: `GET /api/slots`, `POST /api/slots/{id}/book`, `GET /api/appointments/mine`, `POST /api/appointments/{id}/cancel` (DONOR);
  `POST|GET /api/organizations/me/slots`, `POST …/slots/{id}/close`, `GET …/slots/{id}/appointments`, `POST …/appointments/{id}/status` (ORGANIZATION, cơ sở đã xác minh).
- Trạng thái lịch: `BOOKED → CHECKED_IN | NO_SHOW`, `CHECKED_IN → SCREENED | DEFERRED`, `SCREENED → DONATED | DEFERRED`. Chỉ `DONATED` mới ghi lịch sử hiến, cập nhật hồ sơ và cộng kho (nếu cơ sở bật tự cộng).
- Hủy lịch chỉ trước giờ hẹn ≥ 2 giờ (hằng số `CANCEL_CUTOFF`, **cần cơ sở y tế xác nhận quy tắc**). Muốn đổi lịch: hủy rồi đặt lại.
- Yêu cầu máu: `POST /api/requests/{id}/facility-confirm|facility-deny`, `POST /api/matches/{id}/no-show`, `GET /api/requests/{id}/delivery`, `POST …/delivery/retry`.
- Đồng ý: `GET|PUT /api/users/me/consents`. Kho: `GET /api/organizations/me/inventory/movements`.
- `POST /api/requests` nhận header tùy chọn `Idempotency-Key` (8–64 ký tự `[A-Za-z0-9_-]`).
- Giới hạn: không có bước "đủ người nhận lời mà không ai đến thì mở lại tự động" ngoài `no-show` thủ công; nếu đã ở cấp tìm kiếm cuối thì không mời thêm được.

## 5. Tình trạng SMS / cuộc gọi
**Chỉ có adapter và chế độ mock; chưa tích hợp nhà cung cấp thật.** Cả hai kênh tắt mặc định; mock chỉ ghi log (che số điện thoại).
Chưa khảo sát điều kiện/giá của nhà cung cấp SMS/Voice nào tại Việt Nam và không giả định dịch vụ nào miễn phí. Xem `docs/NOTIFICATIONS.md`.

## 6. Việc đã kiểm chứng thật và kết quả
| Hạng mục | Kết quả |
|---|---|
| Migration V1→V14 trên DB trống (PostgreSQL 16) | Chạy sạch |
| 25 phiên song song đặt khung giờ 5 chỗ (câu `UPDATE` nguyên tử của service) | 5 thành công, 20 bị từ chối, `booked_count = 5`; ghi đè 6 bị CHECK chặn; đặt trùng bị unique index chặn |
| SQL outbox: dedupe, claim `SKIP LOCKED`, retry có độ trễ, hủy theo yêu cầu, xếp lại tin lỗi | Đúng |
| SQL lịch hẹn, nhắc lịch (lần 2 không nhắc lại), ghi lịch sử hiến, kho + sổ biến động, advisory lock, idempotency, CHECK `units_received` | Đúng |
| Frontend `tsc`, `eslint`, `vitest` (67/67), `next build` | Đạt |
| `javac` (kiểm cú pháp, không có thư viện) | Không có lỗi cú pháp; **không kiểm được kiểu/ngữ nghĩa** |
| Backend `mvn test`, các `*IT`, unit test Java mới | **Chưa chạy** |

## 7. Cách chạy
```
# DB: PostgreSQL local, user/db lifely (xem application.yml). Flyway tự chạy V1→V14 khi backend khởi động.
cd backend && mvn test                              # unit test (đã thêm test cho outbox, retry, mock, ma trận trạng thái lịch)
mvn test -Dtest='ConcurrentAcceptIT,AppointmentConcurrencyIT,AppointmentFlowIT,OutboxIT,OutboxDisabledIT'
mvn spring-boot:run
cd frontend && npm ci && npm run dev
```
Các IT cần PostgreSQL có dữ liệu demo và tự dọn dữ liệu của chúng. `ConcurrentAcceptIT` đã được sửa theo ngữ nghĩa mới (đủ người nhận lời ⇒ `PARTIALLY_FULFILLED`, `units_received = 0`).

## 8. Giới hạn còn lại và điều cần cơ sở y tế xác nhận
- Backend Java chưa compile: có thể còn lỗi biên dịch/test cần sửa sau lần `mvn test` đầu tiên.
- Chưa có xác minh số điện thoại: SMS/Voice chỉ dựa vào việc người dùng tự bật đồng ý.
- SMS/Voice là at-least-once (không đảm bảo exactly-once); tin đang `SENDING` không rút lại được, chỉ được kiểm tra lại ngay trước khi gửi.
- Dữ liệu demo cũ do người nhà đã xác nhận trước đây đã cập nhật hồ sơ người hiến; nếu cơ sở nâng mức xác nhận sau này, `totalDonations` của các bản ghi cũ đó có thể bị cộng thêm một lần.
- Cần cơ sở y tế xác nhận: quy tắc hủy lịch (2 giờ), giãn cách giữa hai lần hiến (84 ngày), sức chứa khung giờ, quy trình sàng lọc và tiếp nhận, và việc LIFELY có được ghi nhận kho máu hay không.
- Ô mô tả yêu cầu vẫn là văn bản tự do hiển thị cho người hiến: người dùng cần được nhắc không nhập tên/chẩn đoán bệnh nhân.


---

# Bổ sung vòng 2: Sức khỏe, nhắc hiến lại, Web Push, PWA, chuẩn bị bảo vệ

> **Lưu ý về phạm vi.** Phần bổ sung này giả định "các mục 0–9 của prompt chính" đã có PWA, Web Push, kiểm tra đủ điều kiện và dữ liệu sức khỏe. Trong zip nhận được **không có** những thứ đó (cũng không có trường giới tính) và mình chưa nhận được prompt chính. Vì vậy mình dựng **bản tối thiểu** của các phần nền đó để A, B, C chạy được. Nếu prompt chính có yêu cầu cụ thể khác, các phần này có thể phải chỉnh lại.

## Đã thêm
- **Migration `V15`**: `users.is_demo`, `donor_profiles.gender` và `rejoin_reminded_for`, `privacy_settings.receive_rejoin_reminders`, `health_data_consents`, `donor_health_checks`, `push_subscriptions`, kênh `PUSH` cho outbox và đồng ý, loại thông báo `REJOIN_REMINDER`. Chỉ thêm, không sửa V1–V14.
- **A. Sức khỏe của tôi** (`/donor/health`): tổng quan, trạng thái "Có thể hiến / Còn X ngày", kiểm tra nhanh (không lưu) và lưu khi có đồng ý, biểu đồ nhịp tim và huyết áp bằng SVG thuần (không thư viện, chế độ tối, vừa điện thoại, có bảng thay thế), chú thích trong/ngoài ngưỡng **không chẩn đoán**, xuất JSON/CSV, xóa lịch sử, rút đồng ý.
- **B. Nhắc hiến lại**: `RejoinReminderService` nhắc đúng một lần cho mỗi lần hiến, chỉ người đã bật loại nhắc này (tách với thông báo khẩn cấp), quy tắc riêng cho nữ cấu hình được. **Thông báo khẩn cấp chỉ gửi cho người đã đủ giãn cách** (truy vấn ứng viên đã theo giới).
- **Web Push** chạy bằng JDK (RFC 8291 + VAPID), không thêm thư viện; PWA (manifest, icon, service worker, trang ngoại tuyến); bật/tắt thiết bị và "Gửi thử" trong Hồ sơ.
- **C. Chuẩn bị bảo vệ**: dữ liệu demo giả (`tools/demo`), `DEMO_SCRIPT.md`, `DEVICE_TEST_CHECKLIST.md`, `REPORT_UPDATES.md`, `SECURITY_REVIEW.md`. **D.** `OPEN_QUESTIONS.md`.
- **Sửa lỗi quyền riêng tư phát hiện khi rà soát**: xóa tài khoản chỉ ẩn danh hóa nên dữ liệu mới sẽ còn lại; đã thêm `UserDataExtras` (xóa + xuất).
- Nút **Gọi ngay** rõ ràng sau khi nhận lời; mục menu tới trang mới cho người hiến.

## Đã chạy thật (và kết quả)
| Hạng mục | Kết quả |
|---|---|
| Migration V1→V15 trên DB trống | Chạy sạch |
| Mã hóa Web Push + VAPID, đối chiếu thư viện độc lập (`http_ece`, `web-push`) | 12/12 đạt (gồm tiếng Việt và nội dung 3900 ký tự) |
| `WebPushSender` gửi tới dịch vụ push giả (201/410/404/429/503/400, giải mã, chữ ký) | 13/13 đạt |
| Ngưỡng sàng lọc + giãn cách (Java thuần, trường hợp biên, quy tắc nữ) | 24/24 đạt |
| SQL nhắc hiến lại (một lần/lần hiến, tôn trọng tắt nhắc, giới tính, chống bắn hàng loạt dữ liệu cũ), dữ liệu sức khỏe, push, xóa tài khoản | Đúng |
| Seed demo chạy 2 lần; script xóa với dữ liệu phát sinh | Không nhân đôi; xóa sạch, dữ liệu khác nguyên vẹn |
| Frontend `tsc`, `eslint`, `vitest` (76), `next build`, `next start` (manifest, icon, header service worker, trang offline) | Đạt |
| `javac` kiểm cú pháp toàn bộ Java | Không lỗi cú pháp (không kiểm được kiểu) |

Chạy lại: `tools/push-verify/run.sh` (không cần Maven) và `tools/sql-tests/*`.

## Chưa kiểm chứng
- **Backend Java vẫn chưa compile/chạy test** (`mvn test`, các `*IT` mới: `HealthIT`, `AccountErasureIT`, `RequestFlowIT`, `OutboxIT`, `AppointmentConcurrencyIT`, `AppointmentFlowIT`). Cần chạy trên máy nhóm.
- Thông báo đẩy tới **trình duyệt/điện thoại thật**, cài PWA trên iPhone/Android, APK (xem `DEVICE_TEST_CHECKLIST.md`).
- Spring `BCryptPasswordEncoder` chấp nhận hash `$2b$` do `seed_demo.sh` tạo: dự kiến có (mẫu regex của Spring cho phép `2b`), **chưa thử đăng nhập thật**.

## Cách chạy phần mới
```
# 1. Khóa Web Push (miễn phí): in ra màn hình, tự đặt vào biến môi trường, KHÔNG commit khóa riêng
tools/push/generate-vapid-keys.sh        # -> VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, NOTIFY_PUSH_ENABLED=true
# 2. Dữ liệu demo giả
DEMO_PASSWORD=... PGPASSWORD=... tools/demo/seed_demo.sh          # tạo / làm mới
PGPASSWORD=... tools/demo/seed_demo.sh --clear                      # xóa
# 3. Kiểm chứng độc lập (không cần Maven)
tools/push-verify/run.sh
```
