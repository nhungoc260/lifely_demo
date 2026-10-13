package com.lifely.organization;

import com.lifely.audit.AuditService;
import com.lifely.common.AppException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Quản lý nhân viên của tổ chức. Chỉ chủ tài khoản được thêm hoặc gỡ nhân viên. */
@Service
public class OrganizationStaffService {

    static final int MAX_STAFF = 10;

    private final OrganizationRepository organizations;
    private final JdbcTemplate jdbc;
    private final AuditService audit;

    public OrganizationStaffService(OrganizationRepository organizations, JdbcTemplate jdbc, AuditService audit) {
        this.organizations = organizations;
        this.jdbc = jdbc;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public StaffOverview list(UUID userId) {
        Organization org = organizations.findForUser(userId)
                .orElseThrow(() -> AppException.notFound("ORGANIZATION_NOT_FOUND", "Hãy hoàn tất hồ sơ tổ chức trước"));
        return overview(org, userId);
    }

    @Transactional
    public StaffOverview add(UUID userId, String email) {
        Organization org = owned(userId);
        Long count = jdbc.queryForObject("SELECT count(*) FROM organization_members WHERE organization_id = ?", Long.class, org.getId());
        if (count != null && count >= MAX_STAFF) {
            throw AppException.badRequest("TOO_MANY_STAFF", "Mỗi tổ chức có tối đa " + MAX_STAFF + " nhân viên");
        }
        List<UUID> found = jdbc.query("""
                SELECT u.id FROM users u
                  JOIN user_roles ur ON ur.user_id = u.id AND ur.role_id = 3
                 WHERE lower(u.email) = lower(?) AND u.status = 'ACTIVE'
                """, (rs, i) -> rs.getObject("id", UUID.class), email.trim());
        if (found.isEmpty()) {
            throw AppException.badRequest("STAFF_NOT_FOUND",
                    "Không tìm thấy tài khoản Tổ chức đang hoạt động với email này. Nhân viên cần đăng ký tài khoản vai trò Tổ chức trước");
        }
        UUID staffId = found.get(0);
        if (staffId.equals(userId) || organizations.findByOwnerUserId(staffId).isPresent()) {
            throw AppException.conflict("STAFF_HAS_OWN_ORGANIZATION", "Tài khoản này đã là chủ của một tổ chức");
        }
        Long already = jdbc.queryForObject("SELECT count(*) FROM organization_members WHERE user_id = ?", Long.class, staffId);
        if (already != null && already > 0) {
            throw AppException.conflict("STAFF_ALREADY_MEMBER", "Tài khoản này đã là nhân viên của một tổ chức");
        }
        jdbc.update("INSERT INTO organization_members (user_id, organization_id, added_by) VALUES (?, ?, ?)",
                staffId, org.getId(), userId);
        audit.log(userId, "ORG_STAFF_ADDED", "ORGANIZATION", org.getId(), Map.of("staffUserId", staffId.toString()));
        return overview(org, userId);
    }

    @Transactional
    public StaffOverview remove(UUID userId, UUID staffId) {
        Organization org = owned(userId);
        int removed = jdbc.update("DELETE FROM organization_members WHERE user_id = ? AND organization_id = ?", staffId, org.getId());
        if (removed == 0) {
            throw AppException.notFound("STAFF_NOT_FOUND", "Không tìm thấy nhân viên này trong tổ chức");
        }
        audit.log(userId, "ORG_STAFF_REMOVED", "ORGANIZATION", org.getId(), Map.of("staffUserId", staffId.toString()));
        return overview(org, userId);
    }

    private Organization owned(UUID userId) {
        return organizations.findByOwnerUserId(userId)
                .orElseThrow(() -> AppException.forbidden("ORG_OWNER_ONLY", "Chỉ chủ tài khoản tổ chức mới quản lý nhân viên"));
    }

    private StaffOverview overview(Organization org, UUID viewerId) {
        List<StaffMember> members = new ArrayList<>();
        members.addAll(jdbc.query("SELECT id, full_name, email FROM users WHERE id = ?",
                (rs, i) -> new StaffMember(rs.getObject("id", UUID.class), rs.getString("full_name"), rs.getString("email"), "OWNER"),
                org.getOwnerUserId()));
        members.addAll(jdbc.query("""
                SELECT u.id, u.full_name, u.email FROM organization_members m
                  JOIN users u ON u.id = m.user_id
                 WHERE m.organization_id = ?
                 ORDER BY m.created_at
                """, (rs, i) -> new StaffMember(rs.getObject("id", UUID.class), rs.getString("full_name"), rs.getString("email"), "STAFF"),
                org.getId()));
        return new StaffOverview(org.getOwnerUserId().equals(viewerId), members);
    }
}
