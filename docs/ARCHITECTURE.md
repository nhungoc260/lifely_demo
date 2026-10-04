# LIFELY – Kiến trúc và sơ đồ (Mermaid)

Các sơ đồ dưới đây viết bằng Mermaid, xem được trực tiếp trên GitHub hoặc VS Code (extension "Markdown Preview Mermaid Support"), và dùng làm nền để vẽ lại UML trong báo cáo đồ án.

## 1. Kiến trúc hệ thống
```mermaid
flowchart LR
  subgraph Browser
    FE[Next.js frontend]
  end
  subgraph Backend[Spring Boot backend]
    C[Controller] --> S[Service] --> R[Repository]
    S --> M[MatchingService]
    S --> N[NotificationService]
    WS[STOMP WebSocket /ws]
    J[Jobs: expiry, escalation]
  end
  DB[(PostgreSQL)]
  OSM[(OpenStreetMap tiles / Nominatim)]
  FE -- REST + JWT --> C
  FE -- WebSocket + JWT --> WS
  FE -- tiles --> OSM
  R --> DB
  N -. sau commit .-> WS
  J --> S
```

## 2. ERD
```mermaid
erDiagram
  users ||--o{ user_roles : has
  roles ||--o{ user_roles : grants
  users ||--|| privacy_settings : owns
  users ||--o| donor_profiles : "is donor"
  users ||--o| organizations : "owns"
  blood_types ||--o{ donor_profiles : "type of"
  blood_types ||--o{ blood_requests : "needs"
  blood_types ||--o{ blood_compatibility : "donor/recipient"
  users ||--o{ blood_requests : creates
  organizations ||--o{ blood_requests : "linked to"
  organizations ||--o{ organization_documents : uploads
  blood_requests ||--o{ request_status_history : logs
  blood_requests ||--o{ matches : "contacts"
  donor_profiles ||--o{ matches : "receives"
  matches ||--o{ match_events : logs
  donor_profiles ||--o{ donation_history : records
  users ||--o{ notifications : receives
  users ||--o{ reports : files
  users ||--o{ audit_logs : "acts in"
  users ||--o{ password_reset_tokens : requests
```

## 3. Vòng đời request
```mermaid
stateDiagram-v2
  [*] --> CREATED
  CREATED --> PENDING_VERIFICATION
  PENDING_VERIFICATION --> VERIFIED: admin / verified org
  PENDING_VERIFICATION --> CANCELLED: rejected
  VERIFIED --> MATCHING
  MATCHING --> DONORS_CONTACTED
  DONORS_CONTACTED --> PARTIALLY_FULFILLED: donor accepts
  PARTIALLY_FULFILLED --> FULFILLED: confirmed = required
  DONORS_CONTACTED --> FULFILLED
  MATCHING --> EXPIRED: deadline
  DONORS_CONTACTED --> EXPIRED: deadline
  PARTIALLY_FULFILLED --> EXPIRED: deadline
  CREATED --> CANCELLED
  VERIFIED --> CANCELLED
  MATCHING --> CANCELLED
  DONORS_CONTACTED --> CANCELLED
  PARTIALLY_FULFILLED --> CANCELLED
```

## 4. Sequence: donor chấp nhận (xử lý đồng thời)
```mermaid
sequenceDiagram
  actor D as Donor
  participant API as MatchController
  participant MS as MatchService
  participant DB as PostgreSQL
  participant WS as RealtimePublisher
  actor R as Requester UI
  D->>API: POST /api/matches/{id}/accept (JWT)
  API->>MS: accept(user, matchId)
  MS->>DB: BEGIN; đọc match, kiểm tra thuộc donor (chống IDOR)
  MS->>DB: SELECT ... FROM blood_requests FOR UPDATE
  MS->>DB: refresh match
  alt đã đủ người / hết hạn / đã phản hồi
    MS-->>API: AppException (REQUEST_FULFILLED...)
    API-->>D: 409
  else còn chỗ
    MS->>DB: units_confirmed + 1, match=ACCEPTED, history, notification, audit
    MS->>DB: COMMIT (CHECK units_confirmed <= units_required)
    DB-->>WS: sau commit
    WS-->>R: /topic/requests/{id} {3 / 5}
    API-->>D: 200
  end
```

## 5. Sequence: tạo request → điều phối
```mermaid
sequenceDiagram
  actor Q as Requester
  participant RS as RequestService
  participant MT as MatchingService
  participant DB as PostgreSQL
  Q->>RS: POST /api/requests
  RS->>DB: lưu request + lịch sử (CREATED, PENDING_VERIFICATION)
  alt tổ chức đã xác minh
    RS->>RS: markVerified
  else cần xác minh
    Note over RS: admin hoặc bệnh viện liên kết xác minh sau
  end
  RS->>MT: startMatching
  MT->>DB: lọc donor (nhóm máu, sẵn sàng, bounding box, chưa match)
  MT->>MT: Haversine + điểm 40/25/15/10/10, sắp xếp, lấy top N
  MT->>DB: tạo matches (CONTACTED) + notifications
  loop mỗi 30 giây
    MT->>MT: nếu chưa đủ người và quá hạn chờ → leo thang cấp 2, 3, 4
  end
```

## 6. Use case
```mermaid
flowchart TB
  Donor((Donor)) --> U1[Khai báo hồ sơ & quyền riêng tư]
  Donor --> U2[Bật/tắt sẵn sàng]
  Donor --> U3[Xem lý do match, chấp nhận / từ chối]
  Requester((Requester)) --> U4[Tạo & theo dõi request realtime]
  Requester --> U5[Xác nhận donor đã hiến]
  Org((Organization)) --> U6[Đăng ký, tải tài liệu xác minh]
  Org --> U7[Xác nhận request của bệnh viện mình]
  Admin((Admin)) --> U8[Xác minh request / tổ chức]
  Admin --> U9[Quản lý user, report, audit, thống kê]
```

## 7. Bảo mật theo lớp
| Mối đe dọa | Biện pháp |
|---|---|
| Truy cập trái phép | JWT stateless; mặc định mọi endpoint cần đăng nhập; `@PreAuthorize` theo role |
| IDOR | Service kiểm tra quyền sở hữu; trả 404 thay vì 403 để không lộ sự tồn tại |
| Brute-force | Khóa tài khoản 15 phút sau 5 lần sai + giới hạn tần suất theo IP |
| SQL injection | JPA/parameterized query, không nối chuỗi từ input |
| XSS | React tự escape; backend loại bỏ thẻ HTML; header `nosniff` |
| Fake organization / request | Tài liệu xác minh, admin duyệt; request cần xác minh; giới hạn 5 request mở / người; report |
| Spam | Rate limit đăng ký/đăng nhập/report; chống report trùng |
| Race condition | `SELECT ... FOR UPDATE` + kiểm tra sau khóa + CHECK constraint ở DB |
| Rò rỉ riêng tư | Không trả tọa độ donor ra API công khai; SĐT chỉ hiện sau khi donor chấp nhận |
| Upload độc hại | Kiểm tra magic bytes, giới hạn 5 MB, tên file ngẫu nhiên, tải qua endpoint có phân quyền |

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
  User "1" --> "*" BloodRequest : creates
  BloodRequest "1" --> "*" Match
  DonorProfile "1" --> "*" Match
  User "1" --> "*" Notification
  RequestService --> RequestLifecycle
  RequestService --> MatchingService
  MatchService --> RequestLifecycle
  MatchService --> MatchingService
  MatchingService --> NotificationService
  NotificationService ..> RealtimePublisher : event sau commit
  RequestLifecycle ..> RealtimePublisher : event sau commit
```

## 9. Activity diagram: donor phản hồi một request
```mermaid
flowchart TD
  A([Nhận thông báo NEW_MATCH]) --> B[Mở chi tiết request + lý do được ghép]
  B --> C{Quyết định}
  C -- Từ chối --> D[Xác nhận 'Decline'] --> E[match = REJECTED] --> Z([Kết thúc])
  C -- Chấp nhận --> F[POST /matches/id/accept]
  F --> G[Khóa dòng request FOR UPDATE]
  G --> H{Còn chỗ và còn hạn?}
  H -- Không --> I[409 REQUEST_FULFILLED / REQUEST_CLOSED] --> Z
  H -- Có --> J[units_confirmed + 1, match = ACCEPTED]
  J --> K{Đã đủ số lượng?}
  K -- Có --> L[request = FULFILLED, báo các donor còn chờ]
  K -- Chưa --> M[request = PARTIALLY_FULFILLED]
  L --> N[Thông báo + WebSocket cho requester]
  M --> N
  N --> O[Donor thấy SĐT liên hệ] --> Z
```

## 10. Activity diagram: leo thang khi chưa đủ người
```mermaid
flowchart TD
  S([Job mỗi 30 giây]) --> R[Lấy request ACTIVE, đã xác minh, chưa đủ, còn hạn]
  R --> D{Quá thời gian chờ theo mức khẩn cấp?}
  D -- Chưa --> S
  D -- Rồi --> L{Đã ở cấp 4?}
  L -- Có --> S
  L -- Chưa --> U[Tăng cấp: 0-5 → 5-10 → 10-20 → 20-50 km]
  U --> M[Lọc → Haversine → chấm điểm → sắp xếp → top N]
  M --> C[Tạo match + thông báo, không gửi cho tất cả cùng lúc]
  C --> T[Thông báo requester: Search area widened] --> S
```
