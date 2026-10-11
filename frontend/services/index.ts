import { get, post, put, qs, apiFetch } from "@/lib/api";
import type {
  AdminDashboard, AdminRequestRow, ContactMessage, ContactStatus, CoverageRing, AdminUser, AppNotification, AuditLogEntry, AuthResponse, BloodRequest, GoogleAuthResult,
  DonationEntry, DonorDashboard, DonorMatch, DonorProfile, HistoryEntry, MatchStatus, Organization, OrgDashboard,
  OrgStatus, Page, Privacy, PublicOrg, PublicRequest, PublicStats, Report, ReportReason, ReportStatus,
  DonorVerification, RequestMatchEntry, RequesterDashboard, RequestStatus, UserSummary,
} from "@/types/domain";

// ---- auth
export const authApi = {
  register: (b: { fullName: string; email: string; phone: string; password: string; confirmPassword: string; role: string }) =>
    post<AuthResponse>("/api/auth/register", b, false),
  login: (b: { email: string; password: string }) => post<AuthResponse>("/api/auth/login", b, false),
  google: (credential: string) => post<GoogleAuthResult>("/api/auth/google", { credential }, false),
  googleRegister: (b: { credential: string; fullName: string; phone: string; role: string }) =>
    post<AuthResponse>("/api/auth/google/register", b, false),
  forgot: (email: string) => post<null>("/api/auth/forgot-password", { email }, false),
  reset: (token: string, password: string) => post<null>("/api/auth/reset-password", { token, password }, false),
  saveOnboarding: (step: number, completed: boolean) =>
    put<UserSummary>("/api/users/me/onboarding", { step, completed }),
};

// ---- public
export const publicApi = {
  stats: () => get<PublicStats>("/api/public/stats", false),
  requests: (p: { lat?: number; lng?: number; bloodType?: string; urgency?: string; radiusKm?: number; page?: number; size?: number }) =>
    get<Page<PublicRequest>>(`/api/public/requests${qs(p)}`, false),
  request: (id: string, lat?: number, lng?: number) =>
    get<PublicRequest>(`/api/public/requests/${id}${qs({ lat, lng })}`, false),
  organizations: () => get<PublicOrg[]>("/api/public/organizations", false),
  contact: (b: { name: string; email: string; phone?: string; message: string }) =>
    post<null>("/api/public/contact", b),
};

// ---- donor
export const donorApi = {
  me: () => get<DonorProfile>("/api/donors/me"),
  update: (b: Partial<{ fullName: string; phone: string; bloodType: string; city: string; district: string; latitude: number; longitude: number; lastDonationDate: string }>) =>
    put<DonorProfile>("/api/donors/me", b),
  setAvailability: (availability: "AVAILABLE" | "NOT_AVAILABLE") => put<DonorProfile>("/api/donors/me/availability", { availability }),
  privacy: () => get<Privacy>("/api/donors/me/privacy"),
  updatePrivacy: (b: Privacy) => put<Privacy>("/api/donors/me/privacy", b),
  history: () => get<DonationEntry[]>("/api/donors/me/history"),
  verification: () => get<DonorVerification>("/api/donors/me/verification"),
  addDonation: (b: { donatedOn: string; location?: string }) => post<DonationEntry>("/api/donors/me/history", b),
  dashboard: () => get<DonorDashboard>("/api/donors/me/dashboard"),
  matches: (status?: MatchStatus) => get<DonorMatch[]>(`/api/donors/me/matches${qs({ status })}`),
  match: (id: string) => get<DonorMatch>(`/api/matches/${id}`),
  accept: (id: string) => post<DonorMatch>(`/api/matches/${id}/accept`),
  reject: (id: string) => post<DonorMatch>(`/api/matches/${id}/reject`),
};

// ---- requester / organization
export interface CreateRequestInput {
  bloodType: string; unitsRequired: number; hospitalName: string; city: string; district?: string;
  latitude: number; longitude: number; urgency: string; deadline: string; contactPhone: string;
  description?: string; organizationId?: string;
}
export const requestApi = {
  create: (b: CreateRequestInput) => post<BloodRequest>("/api/requests", b),
  list: (p: { status?: RequestStatus; page?: number; size?: number }) => get<Page<BloodRequest>>(`/api/requests${qs(p)}`),
  dashboard: () => get<RequesterDashboard>("/api/requests/dashboard"),
  coverage: (bloodType: string, lat: number, lng: number) =>
    get<CoverageRing[]>(`/api/requests/coverage${qs({ bloodType, lat, lng })}`),
  detail: (id: string) => get<BloodRequest>(`/api/requests/${id}`),
  history: (id: string) => get<HistoryEntry[]>(`/api/requests/${id}/history`),
  matches: (id: string) => get<RequestMatchEntry[]>(`/api/requests/${id}/matches`),
  cancel: (id: string, reason?: string) => post<BloodRequest>(`/api/requests/${id}/cancel`, { reason }),
  complete: (matchId: string) => post<RequestMatchEntry>(`/api/matches/${matchId}/complete`),
};

export const notificationApi = {
  list: (p: { unreadOnly?: boolean; page?: number; size?: number }) => get<Page<AppNotification>>(`/api/notifications${qs(p)}`),
  unread: () => get<{ unread: number }>("/api/notifications/unread-count"),
  read: (id: string) => put<AppNotification>(`/api/notifications/${id}/read`),
  readAll: () => put<{ updated: number }>("/api/notifications/read-all"),
};

export const accountApi = {
  delete: (b: { password?: string; googleCredential?: string }) => post<null>("/api/users/me/delete", b),
};

export const reportApi = {
  create: (b: { targetType: string; targetId: string; reason: ReportReason; description?: string }) =>
    post<Report>("/api/reports", b),
};

export const orgApi = {
  me: () => get<Organization | null>("/api/organizations/me"),
  save: (b: Omit<Organization, "id" | "verificationStatus" | "verificationNote" | "verifiedAt" | "documents">) =>
    put<Organization>("/api/organizations/me", b),
  upload: (docType: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch<Organization>(`/api/organizations/me/documents${qs({ docType })}`, { method: "POST", body: fd });
  },
  submit: () => post<Organization>("/api/organizations/me/submit"),
  dashboard: () => get<OrgDashboard>("/api/organizations/me/dashboard"),
  requests: (p: { status?: RequestStatus; page?: number; size?: number }) =>
    get<Page<BloodRequest>>(`/api/organizations/me/requests${qs(p)}`),
  verifyRequest: (id: string) => post<BloodRequest>(`/api/organizations/me/requests/${id}/verify`),
};

export const adminApi = {
  dashboard: () => get<AdminDashboard>("/api/admin/dashboard"),
  users: (p: { q?: string; role?: string; status?: string; page?: number; size?: number; sort?: string; dir?: string }) =>
    get<Page<AdminUser>>(`/api/admin/users${qs(p)}`),
  setUserStatus: (id: string, action: "suspend" | "activate") => post<AdminUser>(`/api/admin/users/${id}/${action}`),
  requests: (p: { urgency?: string; bloodType?: string; status?: string; city?: string; page?: number; size?: number; sort?: string; dir?: string }) =>
    get<Page<AdminRequestRow>>(`/api/admin/requests${qs(p)}`),
  request: (id: string) => get<AdminRequestRow>(`/api/admin/requests/${id}`),
  requestHistory: (id: string) => get<HistoryEntry[]>(`/api/admin/requests/${id}/history`),
  requestAction: (id: string, action: "verify" | "reject" | "cancel", note?: string) =>
    post<BloodRequest>(`/api/admin/requests/${id}/${action}`, action === "verify" ? undefined : { note }),
  organizations: (p: { status?: OrgStatus; q?: string; page?: number; size?: number }) =>
    get<Page<Organization>>(`/api/admin/organizations${qs(p)}`),
  orgAction: (id: string, action: "verify" | "reject" | "suspend", note?: string) =>
    post<Organization>(`/api/admin/organizations/${id}/${action}`, { note }),
  reports: (p: { status?: ReportStatus; page?: number; size?: number }) => get<Page<Report>>(`/api/admin/reports${qs(p)}`),
  updateReport: (id: string, status: ReportStatus) => put<Report>(`/api/admin/reports/${id}`, { status }),
  messages: (p: { status?: ContactStatus; page?: number; size?: number }) => get<Page<ContactMessage>>(`/api/admin/messages${qs(p)}`),
  updateMessage: (id: string, status: ContactStatus) => put<ContactMessage>(`/api/admin/messages/${id}`, { status }),
  emailSummary: () => post<null>("/api/admin/summary/email"),
  auditLogs: (p: { action?: string; page?: number; size?: number }) => get<Page<AuditLogEntry>>(`/api/admin/audit-logs${qs(p)}`),
};
