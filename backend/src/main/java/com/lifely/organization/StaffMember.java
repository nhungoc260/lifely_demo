package com.lifely.organization;

import java.util.UUID;

/** Một thành viên của tổ chức: chủ tài khoản (OWNER) hoặc nhân viên (STAFF). */
public record StaffMember(UUID userId, String fullName, String email, String role) {
}
