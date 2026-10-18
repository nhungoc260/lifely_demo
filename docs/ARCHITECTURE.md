# LIFELY – Kiến trúc và sơ đồ (Mermaid)

Các sơ đồ dưới đây viết bằng Mermaid, xem được trực tiếp trên GitHub hoặc VS Code (extension "Markdown Preview Mermaid Support"), và dùng làm nền để vẽ lại UML trong báo cáo đồ án.

> Tài liệu này được đối chiếu với mã nguồn hiện tại: schema theo Flyway **V1 → V16**, trạng thái theo các enum trong `backend/src/main/java/com/lifely`, luồng nghiệp vụ theo các lớp `*Service`. Khi sửa code, hãy cập nhật sơ đồ tương ứng.

**Hai khái niệm dễ nhầm, được dùng xuyên suốt tài liệu:**

| Cột | Ý nghĩa | Ai làm thay đổi |
|---|---|---|
| `blood_requests.units_confirmed` | Số người hiến **đã nhận lời** (chưa phải lượng máu đã hiến) | `MatchService.accept` (+1), `markNoShow` (−1) |
| `blood_requests.units_received` | Số đơn vị **đã được cơ sở / bên điều phối xác nhận hiến thực tế** | `MatchService.complete` |

Yêu cầu chỉ chuyển sang `FULFILLED` khi `units_received = units_required`. Đủ người nhận lời chỉ làm hệ thống **ngừng mời thêm**.

## 1. Kiến trúc hệ thống
```mermaid
flowchart LR
  subgraph Browser["Trình duyệt / PWA"]
    FE["Giao diện Next.js 16 + React 19"]
    SW["Service Worker: Web Push và trang offline"]
  end
  subgraph Vercel["Máy chủ Next.js"]
    RW["Rewrite /api/* sang backend (BACKEND_URL)"]
    GEO["Route /geocode: proxy tìm địa điểm"]
  end
  subgraph Backend["Máy chủ Spring Boot 3.5 (Java 21)"]
    F["Bộ lọc: RateLimitFilter, JwtAuthFilter"]
    C["Controller (tiếp nhận yêu cầu)"] --> S["Service (xử lý nghiệp vụ)"] --> R["Repository / JdbcTemplate"]
    S --> M["MatchingService (ghép người hiến)"]
    S --> N["NotificationService (thông báo trong ứng dụng)"]
    S --> OB["OutboxService (xếp hàng SMS / Push)"]
    S --> AU["AuditService (nhật ký)"]
    WS["WebSocket STOMP /ws"]
    PUB["RealtimePublisher (sau khi commit)"]
    JOBS["Tác vụ định kỳ @Scheduled"]
    WK["OutboxWorker"]
  end
  DB[("PostgreSQL 16 + Flyway")]
  FS[("Thư mục uploads: tài liệu xác minh")]
  OSM[("Ô bản đồ OpenStreetMap / MapTiler")]
  NOM[("Nominatim, dự phòng Photon")]
  GID[("Google Identity: tokeninfo")]
  MAIL[("Email: Apps Script / Brevo / Gmail SMTP")]
  PUSHSVC[("Dịch vụ Web Push của trình duyệt, VAPID")]
  SMS[("SMS: MockSmsProvider, chỉ ghi log")]

  FE -- "REST + JWT (cookie refresh httpOnly)" --> RW --> F --> C
  FE -- "WebSocket + JWT" --> WS
  FE -- "tải ô bản đồ" --> OSM
  FE -- "tìm địa điểm" --> GEO --> NOM
  FE -- "đăng nhập Google" --> GID
  S -- "xác thực ID token" --> GID
  R --> DB
  S --> FS
  N -. "sự kiện sau commit" .-> PUB
  S -. "sự kiện sau commit" .-> PUB
  PUB --> WS
  OB --> DB
  WK -- "đọc notification_outbox" --> DB
  WK --> SMS
  WK --> PUSHSVC
  PUSHSVC -. "push" .-> SW
  JOBS --> S
  S --> MAIL
```

### Tác vụ định kỳ

| Tác vụ | Lớp | Chu kỳ | Việc làm |
|---|---|---|---|
| Hết hạn yêu cầu | `RequestExpiryJob` | 60 giây | Chuyển yêu cầu quá hạn sang `EXPIRED`, hết hiệu lực các lời mời chưa phản hồi |
| Leo thang | `EscalationJob` | 30 giây | Mở rộng bán kính tìm người hiến theo cấp 1 → 4 |
| Gửi SMS / Push | `OutboxWorker` | 10 giây | Gửi các tin trong `notification_outbox` sau khi nghiệp vụ đã commit |
| Nhắc lịch hẹn | `AppointmentReminderJob` | 5 phút | Nhắc lịch `BOOKED` sắp tới giờ (mặc định trước 24 giờ) |
| Nhắc hiến lại | `RejoinReminderJob` | 1 giờ | Báo người hiến đã đủ giãn cách để hiến lại |
| Dọn refresh token | `RefreshTokenService.purgeExpired` | 03:30 hằng ngày | Xóa refresh token hết hạn |
| Báo cáo tuần | `SummaryReportService` | 08:00 thứ Hai (giờ Việt Nam) | Gửi email thống kê cho admin |
| Dời deadline dữ liệu demo | `DemoDataRefresher` | Lúc khởi động | Chỉ khi `DEMO_REFRESH_DEADLINES=true` |

## 2. ERD (sơ đồ quan hệ thực thể)
Schema có 30 bảng nghiệp vụ nên ERD được tách theo nhóm. Mỗi sơ đồ chỉ liệt kê khóa và các cột quan trọng; danh sách cột đầy đủ nằm ở `backend/src/main/resources/db/migration`.

### 2.1 Người dùng, xác thực, người hiến và tổ chức
```mermaid
erDiagram
  users ||--o{ user_roles : "có"
  roles ||--o{ user_roles : "cấp cho"
  users ||--o{ password_reset_tokens : "yêu cầu"
  users ||--o{ refresh_tokens : "phiên đăng nhập"
  users ||--|| privacy_settings : "sở hữu"
  users ||--o| donor_profiles : "là người hiến"
  users ||--o| organizations : "sở hữu"
  users ||--o| organization_members : "là nhân viên"
  organizations ||--o{ organization_members : "có nhân viên"
  organizations ||--o{ organization_documents : "tải lên"
  blood_types ||--o{ donor_profiles : "nhóm máu của"
  blood_types ||--o{ blood_compatibility : "người hiến"
  blood_types ||--o{ blood_compatibility : "người nhận"

  users {
    uuid id PK
    string email UK
    string password_hash
    string full_name
    string phone
    string status "ACTIVE, SUSPENDED"
    int failed_login_attempts
    timestamptz locked_until
    boolean is_demo
  }
  roles {
    smallint id PK
    string name UK "ROLE_DONOR, ROLE_REQUESTER, ROLE_ORGANIZATION, ROLE_ADMIN"
  }
  user_roles {
    uuid user_id PK, FK
    smallint role_id PK, FK
  }
  password_reset_tokens {
    uuid id PK
    uuid user_id FK
    string token_hash UK "SHA-256"
    timestamptz expires_at
    timestamptz used_at
  }
  refresh_tokens {
    uuid id PK
    uuid user_id FK
    string token_hash UK "SHA-256"
    uuid family_id "gom các token xoay vòng"
    timestamptz expires_at
    timestamptz revoked_at
  }
  privacy_settings {
    uuid user_id PK, FK
    boolean show_approximate_location
    boolean allow_emergency_matching
    boolean receive_emergency_notifications
    boolean show_donation_count
    boolean receive_rejoin_reminders
  }
  blood_types {
    smallint id PK
    string code UK "O+, O-, A+, A-, B+, B-, AB+, AB-"
  }
  blood_compatibility {
    smallint donor_type_id PK, FK
    smallint recipient_type_id PK, FK
  }
  donor_profiles {
    uuid id PK
    uuid user_id FK, UK
    smallint blood_type_id FK
    numeric latitude "chỉ dùng để ghép, không trả ra API công khai"
    numeric longitude
    date last_donation_date
    string availability_status "AVAILABLE, NOT_AVAILABLE"
    string gender "FEMALE, MALE, UNSPECIFIED"
    int total_donations
    date rejoin_reminded_for
  }
  organizations {
    uuid id PK
    uuid owner_user_id FK, UK
    string name
    string type "HOSPITAL, BLOOD_CENTER, CLINIC, NGO"
    numeric latitude
    numeric longitude
    string verification_status "PENDING, UNDER_REVIEW, VERIFIED, REJECTED, SUSPENDED"
    uuid verified_by FK
    boolean inventory_auto_add
  }
  organization_members {
    uuid user_id PK, FK
    uuid organization_id FK
    uuid added_by FK
  }
  organization_documents {
    uuid id PK
    uuid organization_id FK
    string doc_type
    string file_url "tên file ngẫu nhiên"
  }
```

### 2.2 Yêu cầu máu và ghép người hiến
```mermaid
erDiagram
  users ||--o{ blood_requests : "tạo"
  organizations ||--o{ blood_requests : "liên kết với"
  blood_types ||--o{ blood_requests : "cần"
  blood_requests ||--o{ request_status_history : "ghi lịch sử"
  blood_requests ||--o{ matches : "liên hệ"
  donor_profiles ||--o{ matches : "nhận"
  matches ||--o{ match_events : "ghi sự kiện"
  donor_profiles ||--o{ donation_history : "ghi nhận"
  matches |o--o| donation_history : "tạo ra khi hoàn tất"
  organizations |o--o{ donation_history : "xác nhận"
  users |o--o{ matches : "ghi kết quả liên hệ"

  blood_requests {
    uuid id PK
    uuid requester_id FK
    uuid organization_id FK
    smallint blood_type_id FK
    int units_required "1 đến 20"
    int units_confirmed "số người đã nhận lời"
    int units_received "số đơn vị đã xác nhận hiến"
    string urgency "CRITICAL, URGENT, NORMAL"
    string status "9 trạng thái, xem mục 4"
    string facility_review "NONE, PENDING, CONFIRMED, DENIED"
    numeric latitude
    numeric longitude
    timestamptz deadline
    boolean verified
    int escalation_level "1 đến 4"
    timestamptz last_escalated_at
    string idempotency_key "unique theo requester_id"
  }
  request_status_history {
    uuid id PK
    uuid request_id FK
    string from_status
    string to_status
    string note
    uuid actor_id FK
  }
  matches {
    uuid id PK
    uuid request_id FK
    uuid donor_id FK
    numeric matching_score "0 đến 100"
    numeric distance_km
    int escalation_level
    string status "xem mục 5"
    string contact_result "NOT_CONTACTED, CONTACTED, UNREACHABLE, CONFIRMED_CAN_JOIN, CANNOT_JOIN"
    uuid contact_result_by FK
    timestamptz responded_at
  }
  match_events {
    uuid id PK
    uuid match_id FK
    string event_type
    jsonb metadata
  }
  donation_history {
    uuid id PK
    uuid donor_id FK
    uuid match_id FK, UK
    date donated_on
    string source "SELF_REPORTED, LIFELY_MATCH, APPOINTMENT"
    string verification_level "SELF_REPORTED, REQUESTER_CONFIRMED, ORG_VERIFIED"
    uuid confirmed_by_user_id FK
    uuid confirmed_by_org_id FK
    string confirmed_by_org_name
  }
```
Ràng buộc quan trọng: `UNIQUE (request_id, donor_id)` trên `matches`; `CHECK (units_confirmed <= units_required)` và `CHECK (units_received <= units_required)` trên `blood_requests`.

### 2.3 Lịch hiến máu, kho máu
```mermaid
erDiagram
  organizations ||--o{ donation_slots : "mở khung giờ"
  donation_slots ||--o{ appointments : "được đặt"
  donor_profiles ||--o{ appointments : "đặt lịch"
  appointments |o--o| donation_history : "tạo ra khi DONATED"
  organizations ||--o{ blood_inventory : "tồn kho theo nhóm máu"
  organizations ||--o{ inventory_movements : "sổ biến động"
  users |o--o{ appointments : "nhân viên xử lý"
  users |o--o{ inventory_movements : "người thao tác"

  donation_slots {
    uuid id PK
    uuid organization_id FK
    timestamptz starts_at "unique cùng organization_id"
    timestamptz ends_at
    int capacity "1 đến 500"
    int booked_count "CHECK <= capacity"
    string status "ACTIVE, CLOSED"
  }
  appointments {
    uuid id PK
    uuid slot_id FK
    uuid donor_id FK
    string status "7 trạng thái, xem mục 6"
    uuid handled_by FK
    uuid donation_id FK "bắt buộc khi DONATED"
    timestamptz reminder_sent_at
    timestamptz cancelled_at
  }
  blood_inventory {
    uuid organization_id PK, FK
    string blood_type PK
    int units "0 đến 100000"
    int low_threshold "ngưỡng cảnh báo sắp hết"
  }
  inventory_movements {
    uuid id PK
    uuid organization_id FK
    string blood_type
    int delta
    int units_after
    string reason "DONATION_CONFIRMED, MANUAL_ADJUST"
    string reference_type
    uuid reference_id
    uuid actor_user_id FK
  }
```
Lịch hẹn **không phải** máu có sẵn: `blood_inventory` chỉ đổi khi nhân viên cơ sở đã xác minh xác nhận hiến máu (và cơ sở bật `inventory_auto_add`), hoặc khi chỉnh tay.

### 2.4 Thông báo, sức khỏe người hiến, báo cáo và nhật ký
```mermaid
erDiagram
  users ||--o{ notifications : "nhận"
  users ||--o{ notification_consents : "đồng ý theo kênh"
  users ||--o{ notification_outbox : "người nhận"
  users ||--o{ push_subscriptions : "thiết bị"
  users ||--o| health_data_consents : "đồng ý lưu dữ liệu sức khỏe"
  donor_profiles ||--o{ donor_health_checks : "đo"
  users ||--o{ reports : "gửi"
  users ||--o{ audit_logs : "thực hiện, không có khóa ngoại"
  users |o--o{ contact_messages : "gửi, có thể ẩn danh"

  notifications {
    uuid id PK
    uuid user_id FK
    string type "14 loại, xem NotificationType"
    boolean is_read
    string reference_type
    uuid reference_id
  }
  notification_consents {
    uuid user_id PK, FK
    string channel PK "SMS, VOICE, PUSH"
    boolean granted "không có dòng = chưa đồng ý"
  }
  notification_outbox {
    uuid id PK
    string dedupe_key UK
    string channel "SMS, PUSH, VOICE cũ đã hủy"
    uuid recipient_user_id FK
    string purpose
    string status "PENDING, SENDING, SENT, FAILED, CANCELLED"
    int attempts
    int max_attempts
    timestamptz next_attempt_at
  }
  push_subscriptions {
    uuid id PK
    uuid user_id FK
    text endpoint UK
    string p256dh
    string auth
  }
  health_data_consents {
    uuid user_id PK, FK
    boolean granted
  }
  donor_health_checks {
    uuid id PK
    uuid donor_id FK
    smallint heart_rate
    smallint systolic
    smallint diastolic
    numeric weight_kg
    string source "SELF_ENTERED, FACILITY"
  }
  reports {
    uuid id PK
    uuid reporter_id FK
    string target_type "REQUEST, USER, ORGANIZATION"
    uuid target_id
    string reason
    string status "OPEN, INVESTIGATING, RESOLVED, REJECTED"
    uuid resolved_by FK
  }
  audit_logs {
    uuid id PK
    uuid user_id
    string action
    string entity_type
    uuid entity_id
    jsonb metadata
  }
  contact_messages {
    uuid id PK
    uuid user_id FK
    string name
    string email
    string status "NEW, READ, RESOLVED"
    uuid handled_by FK
  }
```
Ngoài ra còn bảng `app_metadata` (cặp khóa/giá trị của hệ thống, tạo ở V1) không có quan hệ với bảng nào.

## 3. Phân quyền theo vai trò

| Vai trò | Nhóm endpoint chính |
|---|---|
| Công khai (không cần đăng nhập) | `/api/public/**` (thống kê, yêu cầu công khai, danh sách tổ chức, liên hệ), `/api/health`, `/api/auth/*` (đăng ký, đăng nhập, Google, refresh, quên / đặt lại mật khẩu), `/ws` (bắt tay, xác thực JWT ở CONNECT) |
| `ROLE_DONOR` | `/api/donors/me/**` (hồ sơ, sẵn sàng, quyền riêng tư, lịch sử, sức khỏe), `/api/matches/{id}` và `accept`, `reject`, `/api/slots`, `/api/appointments/**` |
| `ROLE_REQUESTER` | `/api/requests/**` (tạo, sửa, hủy, độ phủ, lịch sử), `/api/matches/{id}/complete`, `no-show`, `contact-result`, `/api/requests/{id}/matches` (cả tổ chức và admin cũng gọi được) |
| `ROLE_ORGANIZATION` | Như người cần máu, cộng thêm `/api/organizations/me/**` (hồ sơ, tài liệu, kho máu, khung giờ, lịch hẹn, nhân viên, nhật ký hiến), `facility-confirm`, `facility-deny`, `delivery/retry` |
| `ROLE_ADMIN` | `/api/admin/**` (người dùng, yêu cầu, tổ chức, báo cáo, nhật ký, kho, lịch hẹn, vận hành, tin nhắn liên hệ) |
| Mọi tài khoản đã đăng nhập | `/api/users/me/**` (xuất / xóa dữ liệu, đồng ý theo kênh), `/api/notifications/**`, `/api/push/**`, `/api/reports` |

## 4. Vòng đời yêu cầu máu
```mermaid
stateDiagram-v2
  state "Đã tạo" as CREATED
  state "Chờ xác minh" as PENDING_VERIFICATION
  state "Đã xác minh" as VERIFIED
  state "Đang ghép người hiến" as MATCHING
  state "Đã liên hệ người hiến" as DONORS_CONTACTED
  state "Đủ một phần / đủ người nhận lời" as PARTIALLY_FULFILLED
  state "Đã đủ" as FULFILLED
  state "Hết hạn" as EXPIRED
  state "Đã hủy" as CANCELLED

  [*] --> CREATED
  CREATED --> PENDING_VERIFICATION: cùng giao dịch tạo yêu cầu
  PENDING_VERIFICATION --> VERIFIED: admin xác minh, hoặc nhân viên cơ sở liên kết xác minh
  PENDING_VERIFICATION --> VERIFIED: tự động nếu tổ chức đã xác minh tạo, hoặc gắn cơ sở đã xác minh
  PENDING_VERIFICATION --> CANCELLED: admin từ chối
  VERIFIED --> MATCHING: startMatching, cùng giao dịch
  MATCHING --> DONORS_CONTACTED: mời được ít nhất 1 người (cấp 1 hoặc khi leo thang)
  DONORS_CONTACTED --> PARTIALLY_FULFILLED: có người hiến nhận lời
  PARTIALLY_FULFILLED --> FULFILLED: units_received = units_required
  CREATED --> EXPIRED: quá hạn
  PENDING_VERIFICATION --> EXPIRED: quá hạn
  VERIFIED --> EXPIRED: quá hạn
  MATCHING --> EXPIRED: quá hạn
  DONORS_CONTACTED --> EXPIRED: quá hạn
  PARTIALLY_FULFILLED --> EXPIRED: quá hạn
  CREATED --> CANCELLED: chủ yêu cầu, nhân viên cơ sở hoặc admin hủy
  PENDING_VERIFICATION --> CANCELLED: hủy, hoặc cơ sở từ chối xác nhận
  VERIFIED --> CANCELLED: hủy, hoặc cơ sở từ chối xác nhận
  MATCHING --> CANCELLED: hủy, hoặc cơ sở từ chối xác nhận
  DONORS_CONTACTED --> CANCELLED: hủy, hoặc cơ sở từ chối xác nhận
  PARTIALLY_FULFILLED --> CANCELLED: hủy, hoặc cơ sở từ chối xác nhận
  FULFILLED --> [*]
  EXPIRED --> [*]
  CANCELLED --> [*]
```
Ghi chú:
- Mọi chuyển trạng thái đều đi qua `RequestLifecycle.transition`: luôn ghi `request_status_history` và phát sự kiện realtime.
- Nhóm trạng thái "đang điều phối" (`RequestStatus.ACTIVE`) gồm `VERIFIED`, `MATCHING`, `DONORS_CONTACTED`, `PARTIALLY_FULFILLED`: hiển thị công khai, được ghép và được leo thang. Hết hạn và hủy áp dụng cho cả `CREATED` và `PENDING_VERIFICATION`.
- Nếu cấp 1 chưa có người hiến phù hợp, yêu cầu **ở lại `MATCHING`** (chỉ ghi chú vào lịch sử) cho tới khi leo thang mời được người.
- `PARTIALLY_FULFILLED` giữ nguyên khi đủ người nhận lời (`units_confirmed = units_required`) và cũng không quay lại khi có người không đến (`units_confirmed` giảm). Chỉ số đơn vị đã xác nhận hiến mới đưa yêu cầu tới `FULFILLED`.
- Yêu cầu gắn với cơ sở đã xác minh có thêm cột `facility_review`: `PENDING` → `CONFIRMED` hoặc `DENIED`. `DENIED` hủy yêu cầu và báo những người đã được mời.

## 5. Trạng thái lượt ghép (`matches.status`)
```mermaid
stateDiagram-v2
  [*] --> CONTACTED: MatchingService mời người hiến (cấp 1 đến 4)
  CONTACTED --> ACCEPTED: người hiến nhận lời
  CONTACTED --> REJECTED: người hiến từ chối
  CONTACTED --> EXPIRED: yêu cầu hết hạn, hoặc đã đủ người nhận lời
  CONTACTED --> CANCELLED: yêu cầu bị hủy
  ACCEPTED --> COMPLETED: cơ sở hoặc người nhà xác nhận đã hiến thực tế
  ACCEPTED --> CANCELLED: không đến hoặc rút lui, hoặc yêu cầu bị hủy
  REJECTED --> [*]
  EXPIRED --> [*]
  CANCELLED --> [*]
  COMPLETED --> [*]
```
- Giá trị `PENDING` có trong enum và là mặc định của cột, nhưng luồng hiện tại tạo lượt ghép thẳng ở `CONTACTED`.
- Khi yêu cầu **hết hạn**, chỉ các lượt chưa phản hồi chuyển `EXPIRED`; lượt đã `ACCEPTED` giữ nguyên để lưu vết.
- `contact_result` là một trục **độc lập**: nhân viên tự ghi kết quả sau khi gọi bằng liên kết `tel:` (`NOT_CONTACTED`, `CONTACTED`, `UNREACHABLE`, `CONFIRMED_CAN_JOIN`, `CANNOT_JOIN`). Giá trị này không đổi `status`, không cộng đơn vị và không khẳng định người hiến đủ điều kiện. Hệ thống không tự gọi điện.

## 6. Trạng thái lịch hẹn hiến máu (`appointments.status`)
```mermaid
stateDiagram-v2
  [*] --> BOOKED: người hiến đặt khung giờ
  BOOKED --> CANCELLED: người hiến hủy, trước giờ hẹn ít nhất 2 giờ
  BOOKED --> CHECKED_IN: nhân viên cơ sở check-in
  BOOKED --> NO_SHOW: nhân viên đánh dấu, chỉ sau giờ hẹn
  CHECKED_IN --> SCREENED: sàng lọc đạt
  CHECKED_IN --> DEFERRED: sàng lọc không đạt hoặc hoãn
  SCREENED --> DONATED: cơ sở xác nhận đã hiến
  SCREENED --> DEFERRED: hoãn
  DONATED --> [*]
  DEFERRED --> [*]
  NO_SHOW --> [*]
  CANCELLED --> [*]
```
`DONATED` là bước duy nhất ghi `donation_history` (nguồn `APPOINTMENT`, mức `ORG_VERIFIED`), cập nhật `donor_profiles` và cộng kho máu (nếu cơ sở bật tự cộng). Chỉ nhân viên của cơ sở **đã xác minh** mới được chuyển trạng thái.

## 7. Sequence: người hiến chấp nhận (xử lý đồng thời)
```mermaid
sequenceDiagram
  actor D as Người hiến máu
  participant API as MatchController
  participant MS as MatchService
  participant DB as PostgreSQL
  participant WS as RealtimePublisher
  actor R as Giao diện người cần máu
  D->>API: POST /api/matches/{id}/accept (JWT)
  API->>MS: accept(user, matchId)
  MS->>DB: BEGIN, đọc match, kiểm tra thuộc về người hiến (chống IDOR, trả 404)
  MS->>DB: SELECT ... FROM blood_requests FOR UPDATE
  MS->>DB: làm mới match sau khi có khóa
  alt đã phản hồi / đã đủ người nhận lời / yêu cầu đã đóng hoặc hết hạn
    MS-->>API: AppException (MATCH_ALREADY_RESPONDED, REQUEST_FULFILLED, REQUEST_CLOSED)
    API-->>D: 409
  else còn chỗ
    MS->>DB: units_confirmed + 1, match = ACCEPTED, match_events
    MS->>DB: request = PARTIALLY_FULFILLED (hoặc ghi chú tiến độ), lịch sử
    opt đã đủ người nhận lời
      MS->>DB: ngừng mời thêm: hủy SMS/Push chưa gửi, các lời mời còn chờ = EXPIRED, báo người hiến đó
    end
    MS->>DB: thông báo REQUEST_ACCEPTED cho người cần máu, báo nhân viên cơ sở, audit
    MS->>DB: COMMIT (CHECK units_confirmed <= units_required)
    DB-->>WS: sự kiện sau khi commit
    WS-->>R: /topic/requests/{id} {3 / 5}
    WS-->>R: /user/queue/notifications
    API-->>D: 200 (kèm số điện thoại liên hệ)
  end
```

## 8. Sequence: tạo yêu cầu → điều phối
```mermaid
sequenceDiagram
  actor Q as Người cần máu / tổ chức
  participant RS as RequestService
  participant MT as MatchingService
  participant DB as PostgreSQL
  participant AD as StaffAlertService / AdminAlerts
  Q->>RS: POST /api/requests (header Idempotency-Key tùy chọn)
  RS->>DB: khóa theo người tạo, tra khóa idempotency (trùng thì trả lại yêu cầu cũ)
  RS->>RS: kiểm tra hạn chót (từ 5 phút đến 7 ngày), tối đa 5 yêu cầu mở, chống trùng trong 10 phút
  RS->>DB: lưu yêu cầu + lịch sử (CREATED, PENDING_VERIFICATION), audit
  alt người tạo là tổ chức đã xác minh
    RS->>RS: markVerified, facility_review = CONFIRMED
    RS->>AD: báo đồng nghiệp cùng cơ sở
  else gắn với cơ sở đã xác minh
    RS->>RS: markVerified ngay, facility_review = PENDING
    RS->>AD: báo nhân viên cơ sở để xác nhận hoặc từ chối
  else không gắn cơ sở đã xác minh
    RS->>AD: báo mọi admin, nêu rõ nếu khẩn cấp
    Note over RS: giữ PENDING_VERIFICATION cho tới khi admin xác minh hoặc từ chối
  end
  RS->>MT: startMatching (khi đã xác minh)
  MT->>DB: request = MATCHING
  MT->>DB: lọc người hiến: sẵn sàng, tài khoản ACTIVE, cho phép ghép khẩn cấp, nhóm máu tương thích, khung tọa độ, đủ giãn cách, chưa được ghép
  MT->>MT: Haversine + chấm điểm 40/25/15/10/10, đúng nhóm máu xếp trước, lấy top N
  MT->>DB: tạo matches (CONTACTED) + match_events + thông báo NEW_MATCH
  MT->>DB: xếp hàng SMS và Push vào outbox (chỉ khi kênh bật và người hiến đã đồng ý)
  MT->>DB: request = DONORS_CONTACTED nếu mời được người
  loop mỗi 30 giây
    MT->>MT: nếu chưa đủ người nhận lời và quá thời gian chờ thì leo thang cấp 2, 3, 4
  end
```

## 9. Sequence: xác nhận đã hiến máu thực tế
```mermaid
sequenceDiagram
  actor S as Người nhà / nhân viên cơ sở / admin
  participant API as MatchController
  participant MS as MatchService
  participant VS as DonorVerificationService
  participant DB as PostgreSQL
  participant IV as InventoryService
  S->>API: POST /api/matches/{id}/complete (JWT)
  API->>MS: complete(user, matchId)
  MS->>DB: BEGIN, khóa dòng yêu cầu FOR UPDATE, kiểm tra quyền xem (sai thì 404)
  MS->>VS: confirmation(user, request)
  VS-->>MS: ORG_VERIFIED nếu là nhân viên cơ sở đã xác minh sở hữu yêu cầu, ngược lại REQUESTER_CONFIRMED
  alt lượt đã COMPLETED và người xác nhận là cơ sở
    MS->>DB: nâng mức xác nhận, cập nhật hồ sơ người hiến, cộng kho, countReceived
  else lượt chưa ở trạng thái ACCEPTED
    MS-->>API: 409 MATCH_NOT_ACCEPTED
  else hợp lệ
    MS->>DB: match = COMPLETED, ghi donation_history (LIFELY_MATCH, mức xác nhận)
    opt mức ORG_VERIFIED
      MS->>DB: donor_profiles: total_donations + 1, last_donation_date
      MS->>IV: addDonatedUnit (chỉ khi cơ sở bật tự cộng kho)
    end
    opt ORG_VERIFIED, hoặc yêu cầu không gắn cơ sở nào
      MS->>DB: units_received + 1
      opt units_received = units_required
        MS->>DB: request = FULFILLED, đóng các lời mời còn lại, báo người cần máu
      end
    end
    MS->>DB: thông báo cảm ơn người hiến, audit MATCH_COMPLETED
  end
  MS->>DB: COMMIT, sự kiện realtime phát sau khi commit
  API-->>S: 200
```
Người nhà xác nhận (mức `REQUESTER_CONFIRMED`) **không** đổi hồ sơ người hiến. Nếu yêu cầu gắn với một cơ sở, lượt hiến chỉ được tính vào `units_received` khi cơ sở xác nhận.

## 10. Sequence: đặt lịch hiến máu
```mermaid
sequenceDiagram
  actor D as Người hiến máu
  participant API as AppointmentController
  participant AS as AppointmentService
  participant DB as PostgreSQL
  D->>API: POST /api/slots/{id}/book (JWT)
  API->>AS: book(user, slotId)
  AS->>DB: đọc khung giờ của cơ sở đã xác minh
  AS->>AS: kiểm tra khung giờ ACTIVE và còn ở tương lai, đủ giãn cách từ lần hiến gần nhất
  AS->>DB: kiểm tra không trùng lịch còn hiệu lực
  AS->>DB: UPDATE donation_slots SET booked_count + 1 WHERE booked_count < capacity
  alt cập nhật 0 dòng
    AS-->>API: 409 SLOT_FULL
    API-->>D: 409
  else giữ chỗ thành công
    AS->>DB: INSERT appointments (BOOKED), unique (slot_id, donor_id) với lịch còn hiệu lực
    AS->>DB: thông báo APPOINTMENT_CONFIRMED + xếp hàng SMS/Push vào outbox, audit
    API-->>D: 200
  end
```
`CHECK (booked_count <= capacity)` ở DB là lưới an toàn cuối cùng. Hủy lịch (trước giờ hẹn ít nhất 2 giờ) trả lại chỗ bằng `booked_count - 1`.

## 11. Sequence: gửi SMS / Web Push qua outbox
```mermaid
sequenceDiagram
  participant BS as Service nghiệp vụ
  participant OB as OutboxService
  participant DB as PostgreSQL
  participant WK as OutboxWorker (mỗi 10 giây)
  participant PV as SmsProvider mock / WebPushSender
  BS->>OB: enqueue(kênh, mục đích, nội dung, dedupe_key)
  OB->>DB: INSERT notification_outbox ON CONFLICT (dedupe_key) DO NOTHING
  Note over OB: bỏ qua nếu kênh tắt hoặc người nhận chưa đồng ý (notification_consents)
  BS->>DB: COMMIT cùng giao dịch nghiệp vụ
  WK->>DB: phục hồi bản ghi SENDING bị kẹt
  WK->>DB: claim: UPDATE ... SET SENDING, attempts + 1 (FOR UPDATE SKIP LOCKED)
  Note over WK: các bước sau chạy ngoài giao dịch
  WK->>WK: kiểm tra lại: kênh còn bật, người dùng còn ACTIVE, còn đồng ý, yêu cầu còn mở, chưa quá giới hạn mỗi ngày
  alt không còn hợp lệ
    WK->>DB: status = CANCELLED (CHANNEL_DISABLED, CONSENT_REVOKED, REQUEST_CLOSED, RATE_LIMITED)
  else hợp lệ
    WK->>PV: gửi (SMS chỉ ghi log vì là mock, Push dùng VAPID)
    alt thành công
      WK->>DB: status = SENT
    else lỗi tạm thời và còn lượt thử
      WK->>DB: status = PENDING, next_attempt_at tăng dần
    else hết lượt thử
      WK->>DB: status = FAILED
    end
  end
```
Cơ chế này là *at-least-once*, không bảo đảm *exactly-once* với nhà cung cấp. Kênh `VOICE` (cuộc gọi tự động) đã bị gỡ ở V16: các tin `VOICE` chưa gửi bị hủy, hệ thống không tự gọi điện.

## 12. Use case
```mermaid
flowchart TB
  Guest(("Khách")) --> G1["Xem thống kê, yêu cầu công khai, bản đồ, poster QR"]
  Guest --> G2["Đăng ký / đăng nhập, gồm Google"]
  Guest --> G3["Gửi tin nhắn liên hệ"]

  Donor(("Người hiến máu")) --> U1["Khai báo hồ sơ, nhóm máu, vị trí và quyền riêng tư"]
  Donor --> U2["Bật/tắt trạng thái sẵn sàng"]
  Donor --> U3["Xem lý do được ghép, chấp nhận / từ chối"]
  Donor --> U10["Đặt và hủy lịch hiến máu tại cơ sở đã xác minh"]
  Donor --> U11["Nhập chỉ số sức khỏe và xem sàng lọc sơ bộ, khi đã đồng ý"]
  Donor --> U12["Bật thông báo SMS / Push, nhận nhắc hiến lại"]
  Donor --> U13["Xem lịch sử và mức xác nhận các lần hiến"]

  Requester(("Người cần máu")) --> U4["Tạo và theo dõi yêu cầu realtime"]
  Requester --> U5["Xác nhận người hiến đã hiến, ghi nhận không đến"]
  Requester --> U14["Xem độ phủ người hiến quanh bệnh viện"]
  Requester --> U15["Ghi kết quả liên hệ sau khi gọi người hiến"]
  Requester --> U16["Chia sẻ yêu cầu, in poster QR, báo cáo vi phạm"]

  Org(("Tổ chức y tế")) --> U6["Đăng ký, tải tài liệu xác minh, gửi duyệt"]
  Org --> U7["Xác nhận hoặc từ chối yêu cầu gắn với cơ sở mình"]
  Org --> U17["Quản lý kho máu và sổ biến động"]
  Org --> U18["Mở khung giờ, xử lý lịch hẹn: check-in, sàng lọc, ghi nhận hiến"]
  Org --> U19["Thêm / xóa nhân viên, xem nhật ký hiến và thống kê"]
  Org --> U20["Tạo yêu cầu máu đã xác minh sẵn"]

  Admin(("Quản trị viên")) --> U8["Xác minh hoặc từ chối yêu cầu / tổ chức"]
  Admin --> U9["Quản lý người dùng, báo cáo, nhật ký, thống kê"]
  Admin --> U21["Xem tổng quan kho máu, lịch hẹn, vận hành"]
  Admin --> U22["Xử lý tin nhắn liên hệ, nhận báo cáo tuần qua email"]
```

## 13. Bảo mật theo lớp
| Mối đe dọa | Biện pháp |
|---|---|
| Truy cập trái phép | Access token JWT ngắn hạn (15 phút) trong bộ nhớ trình duyệt; mặc định mọi endpoint cần đăng nhập; `@PreAuthorize` theo vai trò; `/api/admin/**` chỉ ADMIN |
| Đánh cắp phiên | Refresh token xoay vòng, chỉ lưu SHA-256; dùng lại token cũ thì thu hồi cả `family_id`; đổi mật khẩu thu hồi mọi phiên; cookie `httpOnly` + SameSite, `/refresh` và `/logout` đòi header `X-Lifely-Client` |
| IDOR | Service kiểm tra quyền sở hữu (`RequestAccess`, `ownMatch`); trả 404 thay vì 403 để không lộ sự tồn tại |
| Brute-force | Khóa tài khoản 15 phút sau 5 lần sai; `RateLimitFilter` giới hạn theo IP cho đăng ký, đăng nhập, Google, quên / đặt lại mật khẩu, báo cáo, liên hệ, xóa tài khoản |
| Giả mạo đăng nhập Google | Xác thực ID token qua `tokeninfo`, kiểm tra thêm `aud`, `iss`, `exp`, `email_verified` |
| SQL injection | JPA và truy vấn tham số hóa, không nối chuỗi từ dữ liệu người dùng |
| XSS | React tự escape; backend loại bỏ thẻ HTML (`Sanitizer`); header `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` |
| Tổ chức / yêu cầu giả | Tài liệu xác minh, admin duyệt; yêu cầu cần xác minh (hoặc gắn cơ sở đã xác minh và được cơ sở xác nhận); dùng tọa độ của cơ sở đã xác minh; tối đa 5 yêu cầu mở mỗi người; có báo cáo vi phạm |
| Spam và gửi trùng | Giới hạn tần suất; chống báo cáo trùng; khóa idempotency khi tạo yêu cầu; chống tạo trùng trong 10 phút; `dedupe_key` cho outbox |
| Race condition | `SELECT ... FOR UPDATE` + kiểm tra sau khi khóa + CHECK constraint ở DB; đặt lịch dùng một câu `UPDATE` có điều kiện `booked_count < capacity` |
| Rò rỉ riêng tư | Không trả tọa độ người hiến ra API; API công khai không có số điện thoại; số điện thoại chỉ hiện sau khi người hiến chấp nhận; độ phủ chỉ trả số cụ thể khi từ 3 người trở lên (k-anonymity) |
| Dữ liệu sức khỏe | Chỉ lưu khi có đồng ý; xuất và xóa được; chỉ hiển thị "trong / ngoài ngưỡng", không chẩn đoán |
| Liên lạc ngoài ý muốn | SMS / Push chỉ gửi khi kênh bật **và** người dùng đồng ý, kiểm tra lại ngay trước khi gửi; giới hạn số tin mỗi ngày; không có cuộc gọi tự động |
| Tải lên độc hại | Kiểm tra magic bytes (PDF, PNG, JPG), giới hạn 5 MB, tên file ngẫu nhiên, tải xuống qua endpoint có phân quyền |
| Quyền được xóa dữ liệu | `/api/users/me/export` và `/delete` (yêu cầu mật khẩu hoặc xác thực lại Google); ẩn danh tài khoản và xóa dữ liệu liên quan |

## 14. Class diagram (các lớp chính)
```mermaid
classDiagram
  class User { UUID id; String email; String fullName; String phone; UserStatus status; Set~Role~ roles }
  class DonorProfile { UUID id; BloodType bloodType; BigDecimal latitude; BigDecimal longitude; LocalDate lastDonationDate; AvailabilityStatus availability; String gender }
  class Organization { UUID id; String name; OrgType type; OrgVerificationStatus verificationStatus; boolean inventoryAutoAdd }
  class BloodRequest { UUID id; BloodType bloodType; int unitsRequired; int unitsConfirmed; int unitsReceived; Urgency urgency; RequestStatus status; String facilityReview; int escalationLevel; Instant deadline }
  class Match { UUID id; BigDecimal matchingScore; BigDecimal distanceKm; MatchStatus status; ContactResult contactResult }
  class DonationHistory { UUID id; LocalDate donatedOn; String source; String verificationLevel }
  class Notification { UUID id; NotificationType type; boolean readFlag }

  class RequestService { create() verifyByAdmin() rejectByAdmin() cancel() facilityConfirm() facilityDeny() }
  class RequestLifecycle { transition() note() publish() }
  class RequestAccess { canView() requireViewable() }
  class MatchingService { score() rank() startMatching() escalate() cancelOpenMatches() closeRemainingAfterFulfilled() }
  class ScoreCalculator { score() }
  class MatchService { accept() reject() complete() markNoShow() recordContactResult() }
  class DonorVerificationService { confirmation() badge() }
  class AppointmentService { book() cancel() createSlot() transition() sendDueReminders() }
  class InventoryService { get() update() addDonatedUnit() }
  class NotificationService { notify() markRead() }
  class OutboxService { enqueue() enqueuePush() cancelPending() }
  class OutboxWorker { runOnce() }
  class StaffAlertService { notifyNewRequest() notifyDonorResponded() }
  class AdminAlerts { raise() }
  class RealtimePublisher { onRequestChanged() onNotification() }
  class CoverageService { coverage() }
  class UserDataService { export() deleteAccount() }
  class EscalationJob { run() }
  class RequestExpiryJob { run() }
  class RequestExpiryService { expire() }

  User "1" --> "0..1" DonorProfile
  User "1" --> "0..1" Organization
  User "1" --> "*" BloodRequest : tạo
  Organization "1" --> "*" BloodRequest : liên kết
  BloodRequest "1" --> "*" Match
  DonorProfile "1" --> "*" Match
  DonorProfile "1" --> "*" DonationHistory
  Match "1" --> "0..1" DonationHistory
  User "1" --> "*" Notification

  RequestService --> RequestLifecycle
  RequestService --> RequestAccess
  RequestService --> MatchingService
  RequestService --> StaffAlertService
  RequestService --> AdminAlerts
  MatchService --> RequestLifecycle
  MatchService --> MatchingService
  MatchService --> DonorVerificationService
  MatchService --> InventoryService
  MatchService --> StaffAlertService
  MatchingService --> ScoreCalculator
  MatchingService --> NotificationService
  MatchingService --> OutboxService
  AppointmentService --> InventoryService
  AppointmentService --> OutboxService
  OutboxWorker --> OutboxService
  StaffAlertService --> OutboxService
  EscalationJob --> MatchingService
  RequestExpiryJob --> RequestExpiryService
  RequestExpiryService --> MatchingService
  NotificationService ..> RealtimePublisher : NotificationCreatedEvent sau commit
  RequestLifecycle ..> RealtimePublisher : RequestChangedEvent sau commit
```

## 15. Activity diagram: người hiến phản hồi một yêu cầu
```mermaid
flowchart TD
  A(["Nhận thông báo NEW_MATCH, SMS hoặc Push"]) --> B["Mở chi tiết yêu cầu + lý do được ghép"]
  B --> C{"Quyết định"}
  C -- "Từ chối" --> D["Xác nhận từ chối"] --> E["match = REJECTED"] --> Z(["Kết thúc"])
  C -- "Chấp nhận" --> F["POST /matches/id/accept"]
  F --> G["Khóa dòng yêu cầu bằng FOR UPDATE"]
  G --> H{"Còn chỗ và còn hạn?"}
  H -- "Không" --> I["409 REQUEST_FULFILLED / REQUEST_CLOSED / MATCH_ALREADY_RESPONDED"] --> Z
  H -- "Có" --> J["units_confirmed + 1, match = ACCEPTED, request = PARTIALLY_FULFILLED"]
  J --> K{"Đã đủ người nhận lời?"}
  K -- "Có" --> L["Ngừng mời thêm: các lời mời còn chờ hết hiệu lực, báo người hiến đó"]
  K -- "Chưa" --> M["Tiếp tục chờ thêm người nhận lời"]
  L --> N["Thông báo + WebSocket cho người cần máu và nhân viên cơ sở"]
  M --> N
  N --> O["Người hiến thấy số điện thoại liên hệ"]
  O --> P["Đến hiến máu, cơ sở hoặc người nhà xác nhận đã hiến"]
  P --> Q["match = COMPLETED, ghi lịch sử hiến, units_received + 1"]
  Q --> R{"units_received = units_required?"}
  R -- "Có" --> S["request = FULFILLED"] --> Z
  R -- "Chưa" --> Z
```

## 16. Activity diagram: leo thang khi chưa đủ người
```mermaid
flowchart TD
  S(["Tác vụ chạy mỗi 30 giây"]) --> R["Lấy yêu cầu đang điều phối, đã xác minh, còn hạn, chưa đủ người nhận lời, chưa tới cấp 4"]
  R --> D{"Quá thời gian chờ theo mức khẩn cấp? 5 / 15 / 60 phút"}
  D -- "Chưa" --> S
  D -- "Rồi" --> U["Khóa dòng yêu cầu và kiểm tra lại điều kiện"]
  U --> L["Tăng cấp: 0-5 → 5-10 → 10-20 → 20-50 km"]
  L --> M["Lọc → Haversine → chấm điểm → đúng nhóm máu trước → top N"]
  M --> C["Tạo match + thông báo + SMS/Push qua outbox, giới hạn số người mỗi vòng"]
  C --> T["Thông báo cho người cần máu: đã mở rộng vùng tìm kiếm"]
  T --> ST{"Đang MATCHING / VERIFIED và mời được người?"}
  ST -- "Có" --> DC["request = DONORS_CONTACTED"] --> S
  ST -- "Không" --> NT["Chỉ ghi chú vào lịch sử"] --> S
```
Số người được mời mỗi vòng là `min(15, số còn thiếu × 3)`. Người hiến đã ở cấp trước không bị mời lại (`UNIQUE (request_id, donor_id)`).

## 17. Sequence: đăng nhập bằng Google
```mermaid
sequenceDiagram
  actor U as Người dùng
  participant FE as Giao diện Next.js
  participant G as Google
  participant API as AuthController
  participant AS as AuthService
  participant V as GoogleIdTokenVerifier
  participant DB as PostgreSQL
  U->>FE: bấm nút "Tiếp tục với Google"
  FE->>G: mở cửa sổ chọn tài khoản
  G-->>FE: ID token (credential)
  FE->>API: POST /api/auth/google {credential}
  API->>AS: googleLogin(credential)
  AS->>V: verify(credential)
  V->>G: kiểm tra chữ ký và thời hạn (tokeninfo)
  G-->>V: thông tin token
  V-->>AS: email đã xác minh + tên (kiểm tra aud, iss, exp, email_verified)
  AS->>DB: tìm người dùng theo email
  alt đã có tài khoản
    AS-->>API: phiên đăng nhập (vai trò giữ nguyên)
    API-->>FE: 200 JWT + cookie refresh
  else email mới
    API-->>FE: 200 needsProfile = true
    FE->>U: màn hình Hoàn tất hồ sơ (chọn vai trò, nhập số điện thoại)
    U->>FE: gửi vai trò + số điện thoại
    FE->>API: POST /api/auth/google/register
    API->>AS: googleRegister (xác thực lại token)
    AS->>DB: tạo người dùng (mật khẩu ngẫu nhiên), quyền riêng tư, hồ sơ người hiến nếu là người hiến
    API-->>FE: 201 JWT + cookie refresh
  end
```
