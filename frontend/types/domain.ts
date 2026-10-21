export type Role = "DONOR" | "REQUESTER" | "ORGANIZATION" | "ADMIN";
export type Urgency = "CRITICAL" | "URGENT" | "NORMAL";
export type RequestStatus =
  | "CREATED" | "PENDING_VERIFICATION" | "VERIFIED" | "MATCHING" | "DONORS_CONTACTED"
  | "PARTIALLY_FULFILLED" | "FULFILLED" | "CANCELLED" | "EXPIRED";
export type MatchStatus =
  | "PENDING" | "CONTACTED" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED" | "EXPIRED";
export type OrgStatus = "PENDING" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "SUSPENDED";
export type OrgType = "HOSPITAL" | "BLOOD_CENTER" | "CLINIC" | "NGO";
export type ReportStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "REJECTED";
export type ReportReason = "FAKE_REQUEST" | "SPAM" | "INCORRECT_INFORMATION" | "ABUSE" | "OTHER";
export type NotificationType =
  | "NEW_MATCH" | "REQUEST_ACCEPTED" | "REQUEST_REJECTED" | "REQUEST_CANCELLED"
  | "REQUEST_VERIFIED" | "REQUEST_EXPIRED" | "EMERGENCY_ESCALATION" | "SYSTEM"
  | "APPOINTMENT_CONFIRMED" | "APPOINTMENT_CANCELLED" | "APPOINTMENT_REMINDER"
  | "STAFF_NEW_REQUEST" | "STAFF_DONOR_RESPONDED" | "REJOIN_REMINDER";

export const BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"] as const;

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  avatarUrl: string | null;
  roles: Role[];
  onboardingCompleted: boolean;
  onboardingStep: number;
}

export interface AuthResponse {
  token: string;
  expiresInSeconds: number;
  user: UserSummary;
}

/** Kết quả đăng nhập Google: có tài khoản thì có auth, chưa có thì cần hoàn tất hồ sơ (needsProfile). */
export interface GoogleAuthResult {
  needsProfile: boolean;
  auth?: AuthResponse | null;
  email?: string | null;
  fullName?: string | null;
}

export interface DonorProfile {
  id: string;
  fullName: string;
  phone: string;
  avatarUrl: string | null;
  bloodType: string | null;
  city: string | null;
  district: string | null;
  approximateArea: string | null;
  latitude: number | null;
  longitude: number | null;
  lastDonationDate: string | null;
  availability: "AVAILABLE" | "NOT_AVAILABLE";
  totalDonations: number;
  profileComplete: boolean;
}

export interface Privacy {
  showApproximateLocation: boolean;
  allowEmergencyMatching: boolean;
  receiveEmergencyNotifications: boolean;
  showDonationCount: boolean;
}

/** Mức xác nhận một lần hiến máu: càng về sau càng đáng tin (chỉ cơ sở y tế đã xác minh mới đạt mức cuối). */
export type VerificationLevel = "SELF_REPORTED" | "REQUESTER_CONFIRMED" | "ORG_VERIFIED";

export interface DonationEntry {
  id: string;
  donatedOn: string;
  location: string | null;
  source: "SELF_REPORTED" | "LIFELY_MATCH";
  verificationLevel: VerificationLevel;
  confirmedByOrganization: string | null;
}

export interface DonorVerification {
  facilityVerified: boolean;
  facilityVerifiedDonations: number;
  requesterConfirmedDonations: number;
  verifiedByName: string | null;
}

export interface DonorDashboard {
  fullName: string;
  bloodType: string | null;
  availability: "AVAILABLE" | "NOT_AVAILABLE";
  nearbyRequests: number;
  confirmedDonations: number;
  unreadNotifications: number;
  profileComplete: boolean;
}

export interface MatchExplanation {
  bloodCompatible: boolean;
  exactTypeMatch: boolean;
  distanceKm: number;
  available: boolean;
  deadlineFeasible: boolean;
  compatibilityScore: number;
  distanceScore: number;
  availabilityScore: number;
  deadlineScore: number;
  recencyScore: number;
  disclaimer: string;
}

export interface DonorMatch {
  matchId: string;
  status: MatchStatus;
  matchingScore: number;
  distanceKm: number;
  requestId: string;
  bloodType: string;
  unitsNeeded: number;
  unitsRequired: number;
  unitsConfirmed: number;
  urgency: Urgency;
  requestStatus: RequestStatus;
  hospitalName: string;
  city: string | null;
  district: string | null;
  deadline: string;
  description: string | null;
  contactPhone: string | null;
  explanation: MatchExplanation | null;
}

export interface BloodRequest {
  id: string;
  bloodType: string;
  unitsRequired: number;
  unitsConfirmed: number;
  urgency: Urgency;
  status: RequestStatus;
  hospitalName: string;
  city: string | null;
  district: string | null;
  latitude: number;
  longitude: number;
  deadline: string;
  contactPhone: string;
  description: string | null;
  verified: boolean;
  escalationLevel: number;
  organizationId: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  /** Số đơn vị đã được cơ sở/bên điều phối xác nhận hiến thực tế (khác với số người nhận lời = unitsConfirmed). */
  unitsReceived: number;
  /** NONE | PENDING | CONFIRMED | DENIED: xác nhận của cơ sở đối với yêu cầu gắn với cơ sở đó. */
  facilityReview: "NONE" | "PENDING" | "CONFIRMED" | "DENIED";
}

export interface PublicRequest {
  id: string;
  bloodType: string;
  unitsRequired: number;
  unitsConfirmed: number;
  unitsNeeded: number;
  urgency: Urgency;
  status: RequestStatus;
  hospitalName: string;
  city: string | null;
  district: string | null;
  latitude: number;
  longitude: number;
  deadline: string;
  distanceKm: number | null;
}

export interface PublicStats {
  registeredDonors: number;
  availableDonors: number;
  activeRequests: number;
  successfulConnections: number;
  verifiedOrganizations: number;
  demoEnvironment: boolean;
}

export interface PublicOrg {
  id: string;
  name: string;
  type: OrgType;
  address: string;
  city: string;
  district: string | null;
  latitude: number;
  longitude: number;
}

export interface HistoryEntry {
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus;
  note: string | null;
  createdAt: string;
}

export type ContactResult = "NOT_CONTACTED" | "CONTACTED" | "UNREACHABLE" | "CONFIRMED_CAN_JOIN" | "CANNOT_JOIN";

export interface RequestMatchEntry {
  matchId: string;
  label: string;
  distanceKm: number;
  matchingScore: number;
  status: MatchStatus;
  respondedAt: string | null;
  donorName: string | null;
  donorPhone: string | null;
  facilityVerified: boolean;
  verifiedByName: string | null;
  contactResult: ContactResult;
  contactResultAt: string | null;
}

export interface RequesterDashboard {
  activeRequests: number;
  confirmedDonors: number;
  responses: number;
  completedRequests: number;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
}

export interface OrgDocument {
  id: string;
  docType: string;
  fileName: string;
  uploadedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  address: string;
  city: string;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  email: string;
  contactPerson: string;
  verificationStatus: OrgStatus;
  verificationNote: string | null;
  verifiedAt: string | null;
  documents: OrgDocument[];
}

export interface OrgDashboard {
  verificationStatus: OrgStatus;
  activeRequests: number;
  criticalRequests: number;
  completedRequests: number;
  responseRate: number;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  roles: Role[];
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
}

export interface AdminRequestRow {
  request: BloodRequest;
  requesterName: string | null;
  requesterEmail: string | null;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: "REQUEST" | "USER" | "ORGANIZATION";
  targetId: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AdminDashboard {
  kpi: {
    users: number; donors: number; activeRequests: number; criticalRequests: number;
    verifiedOrganizations: number; completedMatches: number; confirmedMatches: number;
    pendingVerification: number; organizationsUnderReview: number; openReports: number; newMessages: number;
  };
  requestsOverTime: { day: string; total: number; critical: number }[];
  donorGrowth: { month: string; donors: number }[];
  bloodTypeDistribution: { bloodType: string; donors: number }[];
  requestStatus: { status: RequestStatus; total: number }[];
  emergencyResponse: { urgency: Urgency; avgMinutes: number; responses: number }[];
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface RequestChangedEvent {
  requestId: string;
  unitsConfirmed: number;
  unitsRequired: number;
  status: RequestStatus;
  at: string;
}

export interface NotificationEvent {
  userId: string;
  notification: AppNotification;
  unreadCount: number;
}

export interface CoverageRing {
  radiusKm: number;
  level: "NONE" | "FEW" | "SOME" | "MANY";
  count: number | null;
}

export type ContactStatus = "NEW" | "READ" | "RESOLVED";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: ContactStatus;
  fromRegisteredUser: boolean;
  createdAt: string;
  handledAt: string | null;
}

export interface InventoryItem {
  bloodType: string;
  units: number;
  lowThreshold: number;
  low: boolean;
  updatedAt: string | null;
}

export interface DonationLogEntry {
  id: string;
  donatedOn: string;
  donorName: string;
  bloodType: string | null;
  location: string | null;
  verificationLevel: "SELF_REPORTED" | "REQUESTER_CONFIRMED" | "ORG_VERIFIED";
  confirmedAt: string | null;
}

export interface StaffMember {
  userId: string;
  fullName: string;
  email: string;
  role: "OWNER" | "STAFF";
}

export interface StaffOverview {
  owner: boolean;
  members: StaffMember[];
}

export interface InventorySettings {
  autoAdd: boolean;
}

// ---- Luồng B: lịch hiến máu
export interface DonationSlot {
  id: string; organizationId: string; organizationName: string; address: string | null; city: string | null;
  startsAt: string; endsAt: string; capacity: number; bookedCount: number; available: number; status: "ACTIVE" | "CLOSED";
}
export interface LocationChangeResult { slot: DonationSlot; updatedSlots: number; notifiedDonors: number }
export type AppointmentStatus = "BOOKED" | "CHECKED_IN" | "SCREENED" | "DONATED" | "DEFERRED" | "NO_SHOW" | "CANCELLED";
export interface Appointment {
  id: string; slotId: string; organizationId: string; organizationName: string; address: string | null;
  startsAt: string; endsAt: string; status: AppointmentStatus; canCancel: boolean; createdAt: string;
}
export interface OrgAppointment {
  id: string; slotId: string; donorName: string; bloodType: string | null; status: AppointmentStatus;
  startsAt: string; handledAt: string | null; createdAt: string;
}
export type AppointmentAction = "CHECK_IN" | "SCREEN_PASS" | "DEFER" | "NO_SHOW" | "DONATED";

// ---- Đồng ý nhận thông báo theo kênh & theo dõi phát thông báo
export interface NotificationConsents {
  inApp: boolean; email: boolean; sms: boolean;
  smsChannelEnabled: boolean; mockMode: boolean;
  push: boolean; pushChannelEnabled: boolean; rejoinReminders: boolean;
}
// Lưu ý: "VOICE" chỉ còn trong dữ liệu cũ; hệ thống không còn gọi điện tự động.
export interface DeliverySummary {
  outbox: { channel: "SMS" | "PUSH" | "VOICE"; status: "PENDING" | "SENDING" | "SENT" | "FAILED" | "CANCELLED"; total: number }[];
  responses: Record<string, number>;
  failed: number;
}
export interface InventoryMovement {
  bloodType: string; delta: number; unitsAfter: number; reason: string; referenceType: string | null; createdAt: string;
}

// ---- Sức khỏe của tôi (người hiến). Chỉ hỗ trợ sàng lọc sơ bộ, không chẩn đoán.
export type FindingStatus = "WITHIN" | "OUTSIDE" | "NOT_MEASURED";
export interface HealthFinding {
  metric: "HEART_RATE" | "SYSTOLIC" | "DIASTOLIC" | "WEIGHT"; label: string; value: number | null; unit: string;
  status: FindingStatus; rangeText: string; note: string; provisional: boolean;
}
export interface HealthCheck {
  id: string; measuredAt: string; heartRate: number | null; systolic: number | null; diastolic: number | null;
  weightKg: number | null; source: "SELF_ENTERED" | "FACILITY"; findings: HealthFinding[]; anyOutside: boolean;
}
export interface HealthRules {
  heartRateMin: number; heartRateMax: number; systolicMin: number; systolicMaxExclusive: number;
  diastolicMin: number; diastolicMaxExclusive: number; weightMinFemale: number; weightMinOther: number;
}
export type Gender = "FEMALE" | "MALE" | "UNSPECIFIED";
export interface HealthSummary {
  bloodType: string | null; lastDonationDate: string | null; totalDonations: number; gender: Gender;
  canDonate: boolean; daysUntilEligible: number; eligibleOn: string | null; intervalDays: number;
  consentGranted: boolean; latestOutside: boolean; rules: HealthRules; disclaimer: string;
}
export interface HealthEvaluation { findings: HealthFinding[]; anyOutside: boolean; disclaimer: string }
export interface HealthInput { heartRate?: number; systolic?: number; diastolic?: number; weightKg?: number }

// ---- Admin: số liệu toàn hệ thống (chỉ đọc)
export interface AdminInventory {
  byBloodType: { bloodType: string; units: number; facilities: number; lowFacilities: number }[];
  byOrganization: { organizationId: string; name: string; city: string | null; totalUnits: number; lowTypes: number; updatedAt: string }[];
  cells: { organizationId: string; bloodType: string; units: number; lowThreshold: number }[];
}
export interface AdminAppointments {
  statusCounts: { status: string; total: number }[];
  upcomingSlots: { activeSlots: number; capacity: number; booked: number };
  recent: { id: string; status: string; startsAt: string; organizationName: string; donorName: string }[];
}
export interface AdminOperations {
  notificationDelivery7d: { channel: string; status: string; total: number }[];
  topOrganizations30d: { name: string; requests: number; fulfilled: number; expired: number }[];
  contactResults: { result: string; total: number }[];
  contactLog: { matchId: string; requestId: string; result: string; at: string | null; donorName: string; staffName: string | null; bloodType: string; hospital: string }[];
  reportsByStatus: { status: string; total: number }[];
  appointmentNoShows: number;
  failedDeliveries: { channel: string; purpose: string; errorCode: string | null; attempts: number; at: string }[];
}

/** Người hiến có liên quan đến cơ sở (đã đặt lịch hoặc đã được cơ sở xác nhận hiến). Số điện thoại chỉ có khi còn lịch hẹn hiệu lực. */
export interface OrgDonorEntry {
  donorId: string;
  fullName: string;
  bloodType: string | null;
  donations: number;
  noShows: number;
  upcoming: number;
  lastVisit: string | null;
  phone: string | null;
}

/** Hồ sơ tóm tắt của người dùng cho admin (chỉ thành phố/quận, không có tọa độ). */
export interface AdminDonorInfo {
  bloodType: string | null; city: string | null; district: string | null; availability: string;
  lastDonationDate: string | null; totalDonations: number; verifiedDonations: number;
  matchesTotal: number; matchesAccepted: number; matchesCompleted: number; matchesRejected: number; matchesExpired: number;
}
export interface AdminUserOverview {
  userId: string; fullName: string; email: string; phone: string | null; status: string; avatarUrl: string | null;
  createdAt: string; lastActivityAt: string | null; requestsCreated: number; reportsAgainst: number; openReportsAgainst: number;
  donor: AdminDonorInfo | null;
}

/** Mốc nhập kho của một lần hiến (hệ thống chưa theo dõi xuất kho từng đơn vị). */
export interface DonationJourney { addedToInventory: boolean; addedAt: string | null; organizationName: string | null }
