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
| `npx vitest run` | PASS, 114/114 (thêm test `telHref`, nút gọi, PWA/nút cài đặt, nút trang chủ theo vai trò, định vị và tìm địa điểm) |
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

## 5d. Nút ở trang chủ theo trạng thái đăng nhập
Vấn đề (người dùng báo): đã đăng nhập mà bấm "Tôi cần máu", "Tôi muốn hiến máu", "Tham gia làm người hiến máu", "Đăng ký tổ chức" ở trang chủ vẫn bị đưa tới đăng ký/đăng nhập.
Sửa: `lib/cta.ts` (`ctaHref`) + `components/landing/cta-link.tsx`. Khách giữ hành vi cũ; người đã đăng nhập đi thẳng tới trang phù hợp vai trò (REQUESTER/ORGANIZATION tới form tạo yêu cầu, DONOR tới danh sách yêu cầu, vai trò không làm được việc đó về trang chính của họ), không bao giờ về `/register` hay `/login`. Khớp quyền backend (chỉ REQUESTER, ORGANIZATION tạo yêu cầu). Cũng sửa thanh menu trang chủ bị xuống dòng sau khi thêm nút cài đặt (`whitespace-nowrap`, nút cài đặt dạng biểu tượng). Đã kiểm bằng test đơn vị và build; **chưa** xem bằng trình duyệt thật.

## 5e. Bản đồ: định vị và tìm địa điểm (người dùng báo "lỗi hoài")
Phát hiện trong code: (1) thông báo "Không tìm thấy" / "Hiện chưa tìm kiếm được" của ô tìm kiếm được gắn `sr-only` nên **người dùng không nhìn thấy**; (2) trình duyệt gọi thẳng Nominatim, không kiểm `res.ok`, không có dự phòng; (3) mọi lỗi định vị chỉ hiện chung một câu, chỉ chờ 8 giây, không thử lại.
Sửa: `app/geocode/route.ts` (tìm qua máy chủ của app, có User-Agent định danh, dự phòng Photon, trả lỗi rõ), `components/map/map-search.tsx` (hiện thông báo rõ), `lib/geo.ts` (`locateUser`: thông báo theo từng lý do, thử lại bằng độ chính xác cao), áp vào trang bản đồ, form chọn vị trí và trang chủ. Kiểm bằng test đơn vị có giả lập mạng và `next build`.
**Chưa kiểm:** môi trường làm việc không kết nối được Nominatim/Photon nên chưa thử tìm địa điểm thật; chưa thử định vị trên thiết bị thật. Nguyên nhân gốc của lỗi người dùng gặp chưa được xác nhận.

## 5f. Ô chọn (select) ở chế độ tối
Lỗi (người dùng báo): bấm các ô "Tất cả" ở trang Bản đồ, danh sách thả xuống hiện chữ trắng trên nền trắng khi dùng chế độ tối. Nguyên nhân: không khai báo `color-scheme` nên trình duyệt vẽ danh sách gốc nền trắng, trong khi chữ kế thừa màu sáng. Sửa trong `app/globals.css` (`color-scheme` theo sáng/tối, màu nền/chữ cho `select option`), áp cho mọi ô chọn. Có test kiểm CSS; **chưa** xem bằng trình duyệt thật.

## 5g. Bấm "Tìm kiếm" trên bản đồ trong hồ sơ bị "văng" (P1)
Nguyên nhân (xác định từ code): `MapSearch` là một `<form>` nhưng được đặt trong biểu mẫu lớn của trang Hồ sơ người hiến, Hồ sơ tổ chức, Onboarding và **Tạo yêu cầu máu**. Bấm Tìm hoặc nhấn Enter làm sự kiện submit nổi lên biểu mẫu ngoài nên lưu hồ sơ, sang bước tiếp, hoặc xem trước/gửi yêu cầu máu ngoài ý muốn.
Sửa: bỏ `<form>` trong `components/map/map-search.tsx`, nút `type="button"`, Enter được xử lý riêng (`preventDefault`). Test `tests/map-search.test.ts` kiểm không còn form lồng nhau. **Chưa** thử bằng trình duyệt thật.

## 5h. Nâng cấp admin (đợt này)
Trước đó admin không nhìn được toàn cảnh (không kho máu, lịch hiến, thông báo) và nhật ký chỉ hiện mã 8 ký tự.
Đã làm:
1. **Nhật ký:** hiện tên và email người thực hiện, chi tiết đọc được (`lib/audit.ts`, dịch khóa đã biết, không in dữ liệu lạ), lọc theo người, ngày, hành động (`AdminAuditService`, truy vấn nối bảng `users`, tìm kiếm thoát ký tự `%`/`_`).
2. **Báo admin:** `AdminAlerts` + `AdminAlertListener` tạo thông báo loại SYSTEM (không đổi schema; `ck_notif_type` không cho loại mới) cho mọi admin ACTIVE **sau khi giao dịch gốc commit, trong giao dịch riêng**, lỗi không ảnh hưởng nghiệp vụ. Phát khi: báo cáo vi phạm mới, tin nhắn liên hệ mới, tổ chức gửi hồ sơ hoặc đổi thông tin quan trọng, yêu cầu máu chờ admin xác minh (ghi "KHẨN" nếu mức nguy kịch). Có chuông và mục Thông báo cho admin.
3. **Ba trang chỉ xem:** Kho máu, Lịch hiến, Thống kê vận hành (`AdminOverviewService`, endpoint `GET /api/admin/inventory|appointments|operations`). Không trả số điện thoại hay dữ liệu sức khỏe.
Kiểm chứng: toàn bộ SQL mới chạy trên PostgreSQL thật có dữ liệu mẫu (kể cả phép nối lịch hẹn bằng dữ liệu tạm đã hoàn tác); `tsc`, `eslint`, `next build`, 114 test frontend PASS; `javac` chỉ cho lỗi loại thiếu thư viện (không có lỗi cú pháp). **Chưa chạy:** `mvn test` cho các test mới (`AdminAlertsTest`, `AdminAuditServiceTest`), chạy backend thật, xem giao diện bằng trình duyệt.
Chưa làm: cảnh báo khi yêu cầu khẩn cấp đã mở rộng tìm kiếm hết cấp mà vẫn không có người hiến; Web Push và email cho admin; cờ bảo trì và chính sách phiên bản PWA; cảnh báo khi backend ngừng hoạt động (cần giám sát từ bên ngoài, Render gói miễn phí tự ngủ nên tác vụ nền không chạy khi ngủ).
Lưu ý khi dùng: cảnh báo chỉ sinh cho sự kiện **mới** sau khi triển khai, không quét lại dữ liệu cũ.

## 6. Rủi ro còn lại / cần bạn làm
1. Lưu ý khi `mvn test` báo "failed to discover tests" sau khi xóa hoặc đổi tên class: xóa thư mục `backend/target` rồi chạy lại (file `.class` cũ còn sót). Chưa chạy `mvn spring-boot:run` và các test `*IT` (cần PostgreSQL local).
2. Chạy Flyway V16 trên bản sao database trước khi dùng dữ liệu thật.
3. Bản đã triển khai (nếu có) cần cập nhật frontend và backend cùng lúc vì API consents đổi.
4. `docs/UPGRADE_REPORT.md`, `docs/OPEN_QUESTIONS.md`, `docs/REPORT_UPDATES.md` còn nhắc voice ở các đoạn lịch sử; chưa sửa.

## 7. Chưa thực hiện (cần môi trường chạy backend hoặc trình duyệt)
Test Java (unit/integration) ở backend; kiểm thử HTTP end-to-end (IDOR, kịch bản demo 14 bước); responsive/loading/lỗi trên trình duyệt thật; cài PWA và Web Push trên điện thoại; APK (không cần cho phạm vi hiện tại).

## 8. Nhóm tiếp theo đề xuất
Chạy `mvn test` thật trên máy có Maven Central, rồi `mvn spring-boot:run` và đi theo kịch bản `docs/DEMO_SCRIPT.md`; gửi lại lỗi nếu có.
