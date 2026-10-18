package com.lifely.admin;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifely.admin.dto.AuditLogDto;
import com.lifely.common.PageResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Tra cứu nhật ký hoạt động (chỉ đọc) kèm tên người thực hiện; lọc theo hành động, người dùng và khoảng thời gian. */
@Service
public class AdminAuditService {

    private static final TypeReference<Map<String, Object>> MAP = new TypeReference<>() {
    };

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public AdminAuditService(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogDto> search(String action, String q, java.time.Instant from, java.time.Instant to,
                                            int page, int size) {
        int p = Math.max(page, 0);
        int s = Math.min(Math.max(size, 1), 100);
        StringBuilder where = new StringBuilder(" WHERE 1=1");
        List<Object> args = new ArrayList<>();
        if (action != null && !action.isBlank()) {
            where.append(" AND a.action = ?");
            args.add(action.trim());
        }
        if (q != null && !q.isBlank()) {
            where.append(" AND (lower(u.full_name) LIKE ? ESCAPE '\\' OR lower(u.email) LIKE ? ESCAPE '\\')");
            String like = "%" + escapeLike(q.trim().toLowerCase()) + "%";
            args.add(like);
            args.add(like);
        }
        if (from != null) {
            where.append(" AND a.created_at >= ?");
            args.add(Timestamp.from(from));
        }
        if (to != null) {
            where.append(" AND a.created_at < ?");
            args.add(Timestamp.from(to));
        }
        String base = " FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id" + where;
        Long total = jdbc.queryForObject("SELECT count(*)" + base, Long.class, args.toArray());
        long totalItems = total == null ? 0 : total;
        List<Object> pageArgs = new ArrayList<>(args);
        pageArgs.add(s);
        pageArgs.add((long) p * s);
        List<AuditLogDto> items = jdbc.query("""
                SELECT a.id, a.user_id, u.full_name, u.email, a.action, a.entity_type, a.entity_id,
                       a.metadata::text AS metadata, a.created_at
                """ + base + " ORDER BY a.created_at DESC, a.id LIMIT ? OFFSET ?", (rs, i) -> new AuditLogDto(
                rs.getObject("id", UUID.class), rs.getObject("user_id", UUID.class),
                rs.getString("full_name"), rs.getString("email"), rs.getString("action"),
                rs.getString("entity_type"), rs.getObject("entity_id", UUID.class),
                parse(rs.getString("metadata")), rs.getTimestamp("created_at").toInstant()), pageArgs.toArray());
        return new PageResponse<>(items, p, s, totalItems, (int) Math.ceil(totalItems / (double) s));
    }

    private Map<String, Object> parse(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return mapper.readValue(json, MAP);
        } catch (Exception e) {
            return null;
        }
    }
}
