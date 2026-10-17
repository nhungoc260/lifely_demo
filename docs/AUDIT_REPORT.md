# Báo cáo audit và đợt thay đổi #1: gỡ gọi tự động, thêm gọi thủ công

Ngày: 17/10/2026. Phạm vi: nhóm công việc P1 "liên hệ người hiến". Các module khác chưa audit sâu trong đợt này.

## 1. Hiện trạng đã xác minh
| Hạng mục | Kết quả |
|---|---|
| Kiến trúc | Next.js 16 (frontend) + Spring Boot 3.5 / Java 21 + PostgreSQL, Flyway V1→V15 (nay thêm V16) |
| Repo | Zip không có `.git`; đã lưu bản baseline để đối chiếu |
| Frontend baseline | `tsc` PASS, `eslint` PASS, `vitest` 76/76 PASS |
| Backend | Trong môi trường làm việc `mvn` bị chặn; đã được người dùng chạy thật trên máy của họ (xem mục 5) |

## 2. Vấn đề phát hiện (P1)
Mâu thuẫn với định hướng "chỉ gọi thủ công bằng `tel:`": code có hạ tầng **cuộc gọi tự động** (provider mock, mặc định tắt): `VoiceCallProvider`, `MockVoiceProvider`, kênh `VOICE` trong outbox (MatchingService, StaffAlertService, OutboxService, OutboxWorker), cấu hình `NOTIFY_VOICE_ENABLED`, trường `voice` trong consents API, công tắc "Cuộc gọi tự động" trong giao diện.
Thiếu: nút "Gọi người hiến" rõ ràng cho nhân viên và nơi ghi nhận kết quả liên hệ do nhân viên tự khai.

## 3. Thay đổi đã thực hiện
**Backend (sửa):** MatchingService, StaffAlertService, OutboxService, OutboxWorker, NotifyProperties, ConsentService, SendResult, Match, MatchService, MatchController, RequestMatchEntry, AuditAction, application.yml.
**Backend (thêm):** `ContactResult`, migration `V16__manual_contact_result_remove_voice.sql`, endpoint `POST /api/matches/{id}/contact-result`.
**Backend (xóa):** `VoiceCallProvider`, `MockVoiceProvider`.
**Frontend (thêm):** `lib/phone.ts` (`telHref`), `components/requests/call-donor.tsx`, `tests/phone.test.ts`, `tests/call-donor.test.ts`.
**Frontend (sửa):** types, services, consent-card, request-detail-view, facility-delivery.
**Khác:** `.env.example`, `docs/NOTIFICATIONS.md`, `docs/DEMO_SCRIPT.md`.

Ảnh hưởng API: consents API không còn trường `voice` / `voiceChannelEnabled`; `RequestMatchEntry` thêm `contactResult`, `contactResultAt`.
Ảnh hưởng DB (V16, chỉ thêm, không sửa V14/V15): 3 cột mới ở `matches` (mặc định `NOT_CONTACTED`) + CHECK; hủy tin VOICE đang PENDING/SENDING. Ràng buộc kênh `VOICE` của V14/V15 được giữ để không đụng dữ liệu lịch sử. Rollback: bỏ 3 cột và CHECK mới (không mất dữ liệu nghiệp vụ khác).

## 4. Quy tắc của nút gọi
- `tel:` chỉ mở ứng dụng gọi điện của thiết bị; không có gọi từ backend.
- Số điện thoại do **máy chủ** trả về, chỉ cho chủ yêu cầu / nhân viên cơ sở liên kết / admin, và chỉ khi người hiến đã nhận lời (logic có sẵn `access.canView`, nay dùng chung cho `contact-result`).
- Bấm gọi không ghi nhận gì. Chỉ khi nhân viên chọn kết quả mới lưu. Kết quả không đổi trạng thái match, không cộng đơn vị máu, không nói người hiến đủ điều kiện.

## 5. Kết quả kiểm thử
| Lệnh | Kết quả |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint .` | PASS |
| `npx vitest run` | PASS, 88/88 (thêm 3 test `telHref`, 4 test nút gọi, 5 test PWA/nút cài đặt) |
| `npx next build` | PASS |
| `javac` toàn bộ backend, so với baseline | **Chỉ kiểm cú pháp**: không có lỗi cú pháp mới; mọi chênh lệch lỗi đều do thiếu thư viện (Lombok, jakarta.validation, JUnit). Không phải kiểm kiểu đầy đủ |
| `mvn test` (JDK 21, Maven 3.9.9, chạy trên máy người dùng sau khi xóa `target`) | **PASS**: 95 test, 0 lỗi, 0 bỏ qua, gồm `ContactResultTest` và `noAutomatedVoiceChannelExists`. Các test `*IT` cần PostgreSQL bị loại trừ theo `pom.xml` nên **NOT RUN** |
| Migration V1→V16 trên DB trống (PostgreSQL 16 thật) | **PASS** |
| Nâng cấp V15→V16 với 113 match và tin VOICE/SMS có sẵn | **PASS** (VOICE chờ bị hủy, lịch sử VOICE đã gửi và SMS giữ nguyên, match cũ = NOT_CONTACTED) |
| Ràng buộc `contact_result`; chống trùng outbox; claim/recover/cancel (SQL thật) | **PASS** (`tools/db/verify-migrations.sh`) |
| 101 câu SQL thuần trong code Java chạy `PREPARE` trên schema thật | **PASS**, 0 lỗi bảng/cột. JPQL (Hibernate) không thuộc phạm vi kiểm này |
| Đối chiếu 146 field của 18 entity JPA với cột DB | **PASS**, 0 lệch (gồm 3 cột mới của `Match`) |
| Kiểm thử trên điện thoại thật (mở trình gọi) | **NOT RUN** |

## 5b. Kiểm tra PWA (đọc code, chưa thử trên thiết bị)
- Manifest đủ `name`, `start_url`, `scope`, `display: standalone`, icon 192/512/maskable.
- Service worker chỉ cache trang offline và icon; không cache API, token hay dữ liệu cá nhân; push chỉ mở đường dẫn cùng nguồn. Không có vấn đề cần sửa.
- Đã thêm nút **Cài ứng dụng** (`components/pwa/install-button.tsx`): chỉ hiện khi trình duyệt cho phép cài (`beforeinstallprompt`) hoặc trên iPhone/iPad (hiện hướng dẫn "Thêm vào Màn hình chính"); ẩn khi đã cài. Đặt ở thanh trên cùng của trang chủ và của ứng dụng. Chưa thử trên thiết bị thật.
- DevTools (người dùng chụp) báo manifest hợp lệ; 2 cảnh báo "Richer PWA Install UI" chỉ gợi ý thêm ảnh chụp màn hình vào manifest, không chặn cài đặt.
- Chưa kiểm: cài đặt thật trên Android/iOS, Web Push thật (cần khóa VAPID). Xem `docs/DEVICE_TEST_CHECKLIST.md`.

## 5c. Rà soát phân quyền (đọc code, chưa chạy)
- `SecurityConfig`: `anyRequest().authenticated()`, `/api/admin/**` chỉ ADMIN, chỉ `/api/public/**`, health, đăng nhập/đăng ký/refresh/quên mật khẩu và handshake `/ws/**` là công khai. 29 endpoint không có `@PreAuthorize` đều thuộc nhóm "người dùng đã đăng nhập, thao tác trên chính mình" hoặc công khai có chủ ý.
- WebSocket: CONNECT bắt buộc JWT của tài khoản ACTIVE; SUBSCRIBE `/topic/requests/{id}` kiểm quyền theo yêu cầu; client không được SEND.
- API công khai (`PublicRequestSummary`) không có số điện thoại, người tạo hay bệnh nhân. Swagger/api-docs tắt ở profile prod.
- Việc **chưa** kiểm: thử chủ động đổi ID để vượt quyền (IDOR) bằng HTTP thật, vì cần chạy backend.

## 6. Rủi ro còn lại / cần bạn làm
1. Lưu ý khi `mvn test` báo "failed to discover tests" sau khi xóa hoặc đổi tên class: xóa thư mục `backend/target` rồi chạy lại (file `.class` cũ còn sót). Chưa chạy `mvn spring-boot:run` và các test `*IT` (cần PostgreSQL local).
2. Chạy Flyway V16 trên bản sao database trước khi dùng dữ liệu thật.
3. Bản đã triển khai (nếu có) cần cập nhật frontend và backend cùng lúc vì API consents đổi.
4. `docs/UPGRADE_REPORT.md`, `docs/OPEN_QUESTIONS.md`, `docs/REPORT_UPDATES.md` còn nhắc voice ở các đoạn lịch sử; chưa sửa.

## 7. Chưa thực hiện (cần môi trường chạy backend hoặc trình duyệt)
Test Java (unit/integration) ở backend; kiểm thử HTTP end-to-end (IDOR, kịch bản demo 14 bước); responsive/loading/lỗi trên trình duyệt thật; cài PWA và Web Push trên điện thoại; APK (không cần cho phạm vi hiện tại).

## 8. Nhóm tiếp theo đề xuất
Chạy `mvn test` thật trên máy có Maven Central, rồi `mvn spring-boot:run` và đi theo kịch bản `docs/DEMO_SCRIPT.md`; gửi lại lỗi nếu có.
