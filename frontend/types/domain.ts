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
  | "REQUEST_VERIFIED" | "REQUEST_EXPIRED" | "EMERGENCY_ESCALATION" | "SYSTEM";

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
