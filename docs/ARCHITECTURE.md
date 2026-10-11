# LIFELY – Kiến trúc và sơ đồ (Mermaid)

Các sơ đồ dưới đây viết bằng Mermaid, xem được trực tiếp trên GitHub hoặc VS Code (extension "Markdown Preview Mermaid Support"), và dùng làm nền để vẽ lại UML trong báo cáo đồ án.

## 1. Kiến trúc hệ thống
```mermaid
flowchart LR
  subgraph Browser["Trình duyệt"]
    FE["Giao diện Next.js"]
  end
  subgraph Backend["Máy chủ Spring Boot"]
    C["Controller (tiếp nhận yêu cầu)"] --> S["Service (xử lý nghiệp vụ)"] --> R["Repository (truy cập dữ liệu)"]
    S --> M["MatchingService (ghép người hiến)"]
    S --> N["NotificationService (thông báo)"]
    WS["WebSocket STOMP /ws"]
    J["Tác vụ định kỳ: hết hạn, leo thang"]
  end
  DB[("PostgreSQL")]
  OSM[("Bản đồ OpenStreetMap / Nominatim")]
  FE -- "REST + JWT" --> C
  FE -- "WebSocket + JWT" --> WS
  FE -- "tải bản đồ" --> OSM
  R --> DB
  N -. "sau khi commit" .-> WS
  J --> S
```

## 2. ERD (sơ đồ quan hệ thực thể)
```mermaid
erDiagram
  users ||--o{ user_roles : "có"
  roles ||--o{ user_roles : "cấp cho"
  users ||--|| privacy_settings : "sở hữu"
  users ||--o| donor_profiles : "là người hiến"
  users ||--o| organizations : "sở hữu"
  blood_types ||--o{ donor_profiles : "nhóm máu của"
  blood_types ||--o{ blood_requests : "cần"
  blood_types ||--o{ blood_compatibility : "người hiến / người nhận"
  users ||--o{ blood_requests : "tạo"
  organizations ||--o{ blood_requests : "liên kết với"
  organizations ||--o{ organization_documents : "tải lên"
  blood_requests ||--o{ request_status_history : "ghi lịch sử"
  blood_requests ||--o{ matches : "liên hệ"
  donor_profiles ||--o{ matches : "nhận"
  matches ||--o{ match_events : "ghi sự kiện"
  donor_profiles ||--o{ donation_history : "ghi nhận"
  users ||--o{ notifications : "nhận"
  users ||--o{ reports : "gửi"
  users ||--o{ audit_logs : "thực hiện"
  users ||--o{ password_reset_tokens : "yêu cầu"
```

## 3. Vòng đời yêu cầu máu
```mermaid
stateDiagram-v2
  state "Đã tạo" as CREATED
  state "Chờ xác minh" as PENDING_VERIFICATION
  state "Đã xác minh" as VERIFIED
  state "Đang ghép người hiến" as MATCHING
  state "Đã liên hệ người hiến" as DONORS_CONTACTED
  state "Đủ một phần" as PARTIALLY_FULFILLED
  state "Đã đủ" as FULFILLED
  state "Hết hạn" as EXPIRED
  state "Đã hủy" as CANCELLED

  [*] --> CREATED
  CREATED --> PENDING_VERIFICATION
  PENDING_VERIFICATION --> VERIFIED: quản trị viên / tổ chức đã xác minh
  PENDING_VERIFICATION --> CANCELLED: bị từ chối
  VERIFIED --> MATCHING
  MATCHING --> DONORS_CONTACTED
  DONORS_CONTACTED --> PARTIALLY_FULFILLED: có người hiến chấp nhận
  PARTIALLY_FULFILLED --> FULFILLED: số đã xác nhận = số cần
  DONORS_CONTACTED --> FULFILLED
  MATCHING --> EXPIRED: quá hạn
  DONORS_CONTACTED --> EXPIRED: quá hạn
  PARTIALLY_FULFILLED --> EXPIRED: quá hạn
  CREATED --> CANCELLED
  VERIFIED --> CANCELLED
  MATCHING --> CANCELLED
  DONORS_CONTACTED --> CANCELLED
  PARTIALLY_FULFILLED --> CANCELLED
```

## 4. Sequence: người hiến chấp nhận (xử lý đồng thời)
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
  MS->>DB: BEGIN, đọc match, kiểm tra thuộc về người hiến (chống IDOR)
  MS->>DB: SELECT ... FROM blood_requests FOR UPDATE
  MS->>DB: làm mới match
  alt đã đủ người / hết hạn / đã phản hồi
    MS-->>API: AppException (REQUEST_FULFILLED...)
    API-->>D: 409
  else còn chỗ
    MS->>DB: units_confirmed + 1, match = ACCEPTED, lịch sử, thông báo, audit
    MS->>DB: COMMIT (CHECK units_confirmed <= units_required)
    DB-->>WS: sau khi commit
    WS-->>R: /topic/requests/{id} {3 / 5}
    API-->>D: 200
  end
```

## 5. Sequence: tạo yêu cầu → điều phối
```mermaid
sequenceDiagram
  actor Q as Người cần máu
  participant RS as RequestService
  participant MT as MatchingService
  participant DB as PostgreSQL
  Q->>RS: POST /api/requests
  RS->>DB: lưu yêu cầu + lịch sử (CREATED, PENDING_VERIFICATION)
  alt tổ chức đã xác minh
    RS->>RS: markVerified
  else cần xác minh
    Note over RS: quản trị viên hoặc bệnh viện liên kết sẽ xác minh sau
  end
  RS->>MT: startMatching
  MT->>DB: lọc người hiến (nhóm máu, sẵn sàng, khung tọa độ, chưa được ghép)
  MT->>MT: Haversine + chấm điểm 40/25/15/10/10, sắp xếp, lấy top N
  MT->>DB: tạo matches (CONTACTED) + thông báo
  loop mỗi 30 giây
    MT->>MT: nếu chưa đủ người và quá thời gian chờ thì leo thang cấp 2, 3, 4
  end
```

## 6. Use case
```mermaid
flowchart TB
  Donor(("Người hiến máu")) --> U1["Khai báo hồ sơ và quyền riêng tư"]
  Donor --> U2["Bật/tắt trạng thái sẵn sàng"]
  Donor --> U3["Xem lý do được ghép, chấp nhận / từ chối"]
  Requester(("Người cần máu")) --> U4["Tạo và theo dõi yêu cầu realtime"]
  Requester --> U5["Xác nhận người hiến đã hiến máu"]
  Org(("Tổ chức y tế")) --> U6["Đăng ký, tải tài liệu xác minh"]
  Org --> U7["Xác nhận yêu cầu của bệnh viện mình"]
  Admin(("Quản trị viên")) --> U8["Xác minh yêu cầu / tổ chức"]
  Admin --> U9["Quản lý người dùng, báo cáo, nhật ký, thống kê"]
```

## 7. Bảo mật theo lớp
| Mối đe dọa | Biện pháp |
|---|---|
| Truy cập trái phép | JWT stateless; mặc định mọi endpoint cần đăng nhập; `@PreAuthorize` theo vai trò |
| IDOR | Service kiểm tra quyền sở hữu; trả 404 thay vì 403 để không lộ sự tồn tại |
| Brute-force | Khóa tài khoản 15 phút sau 5 lần sai + giới hạn tần suất theo IP |
| SQL injection | JPA/truy vấn tham số hóa, không nối chuỗi từ dữ liệu người dùng |
| XSS | React tự escape; backend loại bỏ thẻ HTML; header `nosniff` |
| Tổ chức / yêu cầu giả | Tài liệu xác minh, quản trị viên duyệt; yêu cầu cần xác minh; giới hạn 5 yêu cầu mở mỗi người; có báo cáo vi phạm |
| Spam | Giới hạn tần suất đăng ký/đăng nhập/báo cáo; chống báo cáo trùng |
| Race condition | `SELECT ... FOR UPDATE` + kiểm tra sau khi khóa + CHECK constraint ở DB |
| Rò rỉ riêng tư | Không trả tọa độ người hiến ra API công khai; số điện thoại chỉ hiện sau khi người hiến chấp nhận |
| Tải lên độc hại | Kiểm tra magic bytes, giới hạn 5 MB, tên file ngẫu nhiên, tải xuống qua endpoint có phân quyền |

## 8. Class diagram (các lớp chính)
```mermaid
classDiagram
  class User { UUID id; String email; String fullName; UserStatus status; Set~Role~ roles }
  class DonorProfile { UUID id; BloodType bloodType; BigDecimal latitude; BigDecimal longitude; LocalDate lastDonationDate; AvailabilityStatus availability }
  class Organization { UUID id; String name; OrgVerificationStatus verificationStatus }
  class BloodRequest { UUID id; BloodType bloodType; int unitsRequired; int unitsConfirmed; Urgency urgency; RequestStatus status; Instant deadline }
  class Match { UUID id; BigDecimal matchingScore; BigDecimal distanceKm; MatchStatus status }
  class Notification { UUID id; NotificationType type; boolean readFlag }
  class RequestService { create() verifyByAdmin() cancel() }
  class MatchingService { score() rank() startMatching() escalate() }
  class MatchService { accept() reject() complete() }
  class RequestLifecycle { transition() note() publish() }
  class NotificationService { notify() markRead() }
  class RealtimePublisher { onRequestChanged() onNotification() }
  class CoverageService { coverage() }
  class UserDataService { export() deleteAccount() }
  User "1" --> "0..1" DonorProfile
  User "1" --> "0..1" Organization
  User "1" --> "*" BloodRequest : tạo
  BloodRequest "1" --> "*" Match
  DonorProfile "1" --> "*" Match
  User "1" --> "*" Notification
  RequestService --> RequestLifecycle
  RequestService --> MatchingService
  MatchService --> RequestLifecycle
  MatchService --> MatchingService
  MatchingService --> NotificationService
  NotificationService ..> RealtimePublisher : sự kiện sau commit
  RequestLifecycle ..> RealtimePublisher : sự kiện sau commit
```

## 9. Activity diagram: người hiến phản hồi một yêu cầu
```mermaid
flowchart TD
  A(["Nhận thông báo NEW_MATCH"]) --> B["Mở chi tiết yêu cầu + lý do được ghép"]
  B --> C{"Quyết định"}
  C -- "Từ chối" --> D["Xác nhận từ chối"] --> E["match = REJECTED"] --> Z(["Kết thúc"])
  C -- "Chấp nhận" --> F["POST /matches/id/accept"]
  F --> G["Khóa dòng yêu cầu bằng FOR UPDATE"]
  G --> H{"Còn chỗ và còn hạn?"}
  H -- "Không" --> I["409 REQUEST_FULFILLED / REQUEST_CLOSED"] --> Z
  H -- "Có" --> J["units_confirmed + 1, match = ACCEPTED"]
  J --> K{"Đã đủ số lượng?"}
  K -- "Có" --> L["request = FULFILLED, báo cho các người hiến còn chờ"]
  K -- "Chưa" --> M["request = PARTIALLY_FULFILLED"]
  L --> N["Thông báo + WebSocket cho người cần máu"]
  M --> N
  N --> O["Người hiến thấy số điện thoại liên hệ"] --> Z
```

## 10. Activity diagram: leo thang khi chưa đủ người
```mermaid
flowchart TD
  S(["Tác vụ chạy mỗi 30 giây"]) --> R["Lấy yêu cầu đang hoạt động, đã xác minh, chưa đủ, còn hạn"]
  R --> D{"Quá thời gian chờ theo mức khẩn cấp?"}
  D -- "Chưa" --> S
  D -- "Rồi" --> L{"Đã ở cấp 4?"}
  L -- "Có" --> S
  L -- "Chưa" --> U["Tăng cấp: 0-5 → 5-10 → 10-20 → 20-50 km"]
  U --> M["Lọc → Haversine → chấm điểm → sắp xếp → top N"]
  M --> C["Tạo match + thông báo, không gửi cho tất cả cùng lúc"]
  C --> T["Thông báo cho người cần máu: đã mở rộng vùng tìm kiếm"] --> S
<<<<<<< HEAD
```

## 11. Sequence: đăng nhập bằng Google
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
  V-->>AS: email đã xác minh + tên (kiểm tra aud, iss, exp)
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
    AS->>DB: tạo người dùng, quyền riêng tư, hồ sơ người hiến
    API-->>FE: 201 JWT + cookie refresh
  end
=======
>>>>>>> 2d7349796eb3a10c80928b6d467d04aa2e04840e
```
