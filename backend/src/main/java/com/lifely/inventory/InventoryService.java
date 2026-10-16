package com.lifely.inventory;

import com.lifely.audit.AuditService;
import com.lifely.common.AppException;
import com.lifely.organization.Organization;
import com.lifely.organization.OrganizationRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class InventoryService {

    private final OrganizationRepository organizations;
    private final JdbcTemplate jdbc;
    private final AuditService audit;

    public InventoryService(OrganizationRepository organizations, JdbcTemplate jdbc, AuditService audit) {
        this.organizations = organizations;
        this.jdbc = jdbc;
        this.audit = audit;
    }

    /** Kho máu của tổ chức: luôn trả đủ 8 nhóm máu, nhóm chưa khai báo là 0 đơn vị. */
    @Transactional(readOnly = true)
    public List<InventoryItem> get(UUID userId) {
        return load(mine(userId).getId());
    }

    /** Ghi đè các nhóm máu được gửi lên (nhóm không gửi giữ nguyên) rồi trả lại toàn bộ kho. */
    @Transactional
    public List<InventoryItem> update(UUID userId, UpdateInventoryRequest req) {
        Organization org = mine(userId);
        Set<String> seen = new HashSet<>();
        for (UpdateInventoryRequest.Entry e : req.items()) {
            if (!seen.add(e.bloodType())) {
                throw AppException.badRequest("DUPLICATE_BLOOD_TYPE", "Mỗi nhóm máu chỉ được gửi một lần");
            }
            if (!InventoryItem.BLOOD_TYPES.contains(e.bloodType())) {
                throw AppException.badRequest("INVALID_BLOOD_TYPE", "Nhóm máu không hợp lệ");
            }
        }
        for (UpdateInventoryRequest.Entry e : req.items()) {
            // Khóa dòng hiện có để cập nhật thủ công và tự cộng không ghi đè lẫn nhau; ghi sổ biến động theo chênh lệch.
            List<Integer> before = jdbc.queryForList(
                    "SELECT units FROM blood_inventory WHERE organization_id = ? AND blood_type = ? FOR UPDATE",
                    Integer.class, org.getId(), e.bloodType());
            int old = before.isEmpty() ? 0 : before.get(0);
            jdbc.update("""
                    INSERT INTO blood_inventory (organization_id, blood_type, units, low_threshold, updated_at)
                    VALUES (?, ?, ?, ?, now())
                    ON CONFLICT (organization_id, blood_type)
                    DO UPDATE SET units = EXCLUDED.units, low_threshold = EXCLUDED.low_threshold, updated_at = now()
                    """, org.getId(), e.bloodType(), e.units(), e.lowThreshold());
            if (e.units() != old) {
                recordMovement(org.getId(), e.bloodType(), e.units() - old, e.units(), "MANUAL_ADJUST", null, null, userId);
            }
        }
        audit.log(userId, "INVENTORY_UPDATED", "ORGANIZATION", org.getId(), Map.of("bloodTypes", req.items().size()));
        return load(org.getId());
    }

    @Transactional(readOnly = true)
    public InventorySettings settings(UUID userId) {
        UUID orgId = mine(userId).getId();
        return new InventorySettings(Boolean.TRUE.equals(
                jdbc.queryForObject("SELECT inventory_auto_add FROM organizations WHERE id = ?", Boolean.class, orgId)));
    }

    @Transactional
    public InventorySettings updateSettings(UUID userId, boolean autoAdd) {
        Organization org = mine(userId);
        jdbc.update("UPDATE organizations SET inventory_auto_add = ? WHERE id = ?", autoAdd, org.getId());
        audit.log(userId, "INVENTORY_SETTINGS_UPDATED", "ORGANIZATION", org.getId(), Map.of("autoAdd", autoAdd));
        return new InventorySettings(autoAdd);
    }

    /**
     * Khi tổ chức xác nhận một lần hiến máu: nếu tổ chức bật "tự cộng vào kho" thì cộng 1 đơn vị đúng nhóm máu người hiến.
     * Trả true nếu đã cộng.
     */
    @Transactional
    public boolean addDonatedUnit(UUID orgId, String bloodType) {
        return addDonatedUnit(orgId, bloodType, null, null, null);
    }

    /** Như trên, kèm tham chiếu và người thao tác để ghi sổ biến động (truy vết). */
    @Transactional
    public boolean addDonatedUnit(UUID orgId, String bloodType, String referenceType, UUID referenceId, UUID actorUserId) {
        if (orgId == null || bloodType == null || !InventoryItem.BLOOD_TYPES.contains(bloodType)) {
            return false;
        }
        Boolean on = jdbc.queryForObject("SELECT inventory_auto_add FROM organizations WHERE id = ?", Boolean.class, orgId);
        if (!Boolean.TRUE.equals(on)) {
            return false;
        }
        Integer after = jdbc.queryForObject("""
                INSERT INTO blood_inventory (organization_id, blood_type, units, low_threshold, updated_at)
                VALUES (?, ?, 1, ?, now())
                ON CONFLICT (organization_id, blood_type)
                DO UPDATE SET units = LEAST(blood_inventory.units + 1, 100000), updated_at = now()
                RETURNING units
                """, Integer.class, orgId, bloodType, InventoryItem.DEFAULT_THRESHOLD);
        recordMovement(orgId, bloodType, 1, after == null ? 1 : after, "DONATION_CONFIRMED", referenceType, referenceId,
                actorUserId);
        return true;
    }

    /** Lịch sử biến động kho (mới nhất trước, tối đa 100 dòng). */
    @Transactional(readOnly = true)
    public List<Movement> movements(UUID userId) {
        return jdbc.query("""
                SELECT blood_type, delta, units_after, reason, reference_type, created_at
                  FROM inventory_movements WHERE organization_id = ? ORDER BY created_at DESC LIMIT 100
                """, (rs, i) -> new Movement(rs.getString("blood_type"), rs.getInt("delta"), rs.getInt("units_after"),
                rs.getString("reason"), rs.getString("reference_type"),
                rs.getObject("created_at", OffsetDateTime.class).toInstant()), mine(userId).getId());
    }

    public record Movement(String bloodType, int delta, int unitsAfter, String reason, String referenceType,
                           java.time.Instant createdAt) {
    }

    private void recordMovement(UUID orgId, String bloodType, int delta, int unitsAfter, String reason,
                                String referenceType, UUID referenceId, UUID actorUserId) {
        jdbc.update("""
                INSERT INTO inventory_movements (organization_id, blood_type, delta, units_after, reason,
                       reference_type, reference_id, actor_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, orgId, bloodType, delta, unitsAfter, reason, referenceType, referenceId, actorUserId);
    }

    private List<InventoryItem> load(UUID orgId) {
        Map<String, InventoryItem> stored = new HashMap<>();
        jdbc.query("SELECT blood_type, units, low_threshold, updated_at FROM blood_inventory WHERE organization_id = ?",
                rs -> {
                    String type = rs.getString("blood_type");
                    OffsetDateTime at = rs.getObject("updated_at", OffsetDateTime.class);
                    stored.put(type, InventoryItem.of(type, rs.getInt("units"), rs.getInt("low_threshold"),
                            at == null ? null : at.toInstant()));
                }, orgId);
        return InventoryItem.BLOOD_TYPES.stream()
                .map(t -> stored.getOrDefault(t, InventoryItem.of(t, 0, InventoryItem.DEFAULT_THRESHOLD, null)))
                .toList();
    }

    private Organization mine(UUID userId) {
        return organizations.findForUser(userId)
                .orElseThrow(() -> AppException.notFound("ORGANIZATION_NOT_FOUND", "Hãy hoàn tất hồ sơ tổ chức trước"));
    }
}
