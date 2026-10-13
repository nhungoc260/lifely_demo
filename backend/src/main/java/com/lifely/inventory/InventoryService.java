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
            jdbc.update("""
                    INSERT INTO blood_inventory (organization_id, blood_type, units, low_threshold, updated_at)
                    VALUES (?, ?, ?, ?, now())
                    ON CONFLICT (organization_id, blood_type)
                    DO UPDATE SET units = EXCLUDED.units, low_threshold = EXCLUDED.low_threshold, updated_at = now()
                    """, org.getId(), e.bloodType(), e.units(), e.lowThreshold());
        }
        audit.log(userId, "INVENTORY_UPDATED", "ORGANIZATION", org.getId(), Map.of("bloodTypes", req.items().size()));
        return load(org.getId());
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
        return organizations.findByOwnerUserId(userId)
                .orElseThrow(() -> AppException.notFound("ORGANIZATION_NOT_FOUND", "Hãy hoàn tất hồ sơ tổ chức trước"));
    }
}
