package com.lifely.audit;

/** Các hành động được ghi audit (đặc tả mục 93). Tuyệt đối không ghi password, JWT hay secret vào metadata. */
public final class AuditAction {

    public static final String LOGIN = "LOGIN";
    public static final String USER_REGISTERED = "USER_REGISTERED";
    public static final String REQUEST_CREATED = "REQUEST_CREATED";
    public static final String REQUEST_VERIFIED = "REQUEST_VERIFIED";
    public static final String REQUEST_REJECTED = "REQUEST_REJECTED";
    public static final String REQUEST_CANCELLED = "REQUEST_CANCELLED";
    public static final String MATCH_ACCEPTED = "MATCH_ACCEPTED";
    public static final String MATCH_REJECTED = "MATCH_REJECTED";
    public static final String MATCH_COMPLETED = "MATCH_COMPLETED";
    public static final String ORGANIZATION_VERIFIED = "ORGANIZATION_VERIFIED";
    public static final String ORGANIZATION_REJECTED = "ORGANIZATION_REJECTED";
    public static final String ORGANIZATION_SUSPENDED = "ORGANIZATION_SUSPENDED";
    public static final String USER_SUSPENDED = "USER_SUSPENDED";
    public static final String USER_ACTIVATED = "USER_ACTIVATED";
    public static final String REPORT_CREATED = "REPORT_CREATED";
    public static final String REPORT_UPDATED = "REPORT_UPDATED";
    public static final String PASSWORD_RESET = "PASSWORD_RESET";
    public static final String ACCOUNT_EXPORTED = "ACCOUNT_EXPORTED";
    public static final String ACCOUNT_DELETED = "ACCOUNT_DELETED";

    private AuditAction() {
    }
}
