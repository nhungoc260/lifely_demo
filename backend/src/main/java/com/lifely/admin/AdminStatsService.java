package com.lifely.admin;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Số liệu tổng hợp cho dashboard admin, truy vấn trực tiếp từ PostgreSQL. */
@Service
public class AdminStatsService {

    private static final String ACTIVE = "('VERIFIED','MATCHING','DONORS_CONTACTED','PARTIALLY_FULFILLED')";

    private final JdbcTemplate jdbc;

    public AdminStatsService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dashboard() {
        Map<String, Object> kpi = jdbc.queryForMap("""
                SELECT
                  (SELECT count(*) FROM users) AS users,
                  (SELECT count(*) FROM donor_profiles) AS donors,
                  (SELECT count(*) FROM blood_requests WHERE status IN %s) AS active_requests,
                  (SELECT count(*) FROM blood_requests WHERE urgency = 'CRITICAL' AND status IN %s) AS critical_requests,
                  (SELECT count(*) FROM organizations WHERE verification_status = 'VERIFIED') AS verified_organizations,
                  (SELECT count(*) FROM matches WHERE status = 'COMPLETED') AS completed_matches,
                  (SELECT count(*) FROM matches WHERE status IN ('ACCEPTED','COMPLETED')) AS confirmed_matches,
                  (SELECT count(*) FROM blood_requests WHERE status = 'PENDING_VERIFICATION') AS pending_verification,
                  (SELECT count(*) FROM organizations WHERE verification_status = 'UNDER_REVIEW') AS organizations_under_review,
                  (SELECT count(*) FROM reports WHERE status IN ('OPEN','INVESTIGATING')) AS open_reports,
                  (SELECT count(*) FROM contact_messages WHERE status = 'NEW') AS new_messages
                """.formatted(ACTIVE, ACTIVE));

        List<Map<String, Object>> requestsOverTime = jdbc.queryForList("""
                SELECT to_char(d::date, 'YYYY-MM-DD') AS day, count(r.id) AS total,
                       count(r.id) FILTER (WHERE r.urgency = 'CRITICAL') AS critical
                FROM generate_series(current_date - 13, current_date, interval '1 day') d
                LEFT JOIN blood_requests r ON r.created_at::date = d::date
                GROUP BY d ORDER BY d
                """);
        List<Map<String, Object>> donorGrowth = jdbc.queryForList("""
                SELECT to_char(m, 'YYYY-MM') AS month, count(u.id) AS donors
                FROM generate_series(date_trunc('month', current_date) - interval '5 months',
                                     date_trunc('month', current_date), interval '1 month') m
                LEFT JOIN (SELECT x.id, x.created_at FROM users x
                           JOIN user_roles ur ON ur.user_id = x.id AND ur.role_id = 1) u
                       ON date_trunc('month', u.created_at) = m
                GROUP BY m ORDER BY m
                """);
        List<Map<String, Object>> bloodTypes = jdbc.queryForList("""
                SELECT bt.code AS blood_type, count(d.id) AS donors
                FROM blood_types bt LEFT JOIN donor_profiles d ON d.blood_type_id = bt.id
                GROUP BY bt.id, bt.code ORDER BY bt.id
                """);
        List<Map<String, Object>> statuses = jdbc.queryForList(
                "SELECT status, count(*) AS total FROM blood_requests GROUP BY status ORDER BY total DESC");
        List<Map<String, Object>> response = jdbc.queryForList("""
                SELECT r.urgency, round(avg(extract(epoch FROM (m.responded_at - m.contacted_at)) / 60)::numeric, 1) AS avg_minutes,
                       count(*) AS responses
                FROM matches m JOIN blood_requests r ON r.id = m.request_id
                WHERE m.status IN ('ACCEPTED','COMPLETED') AND m.responded_at IS NOT NULL AND m.contacted_at IS NOT NULL
                GROUP BY r.urgency ORDER BY r.urgency
                """);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("kpi", camel(kpi));
        out.put("requestsOverTime", requestsOverTime);
        out.put("donorGrowth", donorGrowth);
        out.put("bloodTypeDistribution", camelList(bloodTypes));
        out.put("requestStatus", statuses);
        out.put("emergencyResponse", camelList(response));
        return out;
    }

    private static Map<String, Object> camel(Map<String, Object> in) {
        Map<String, Object> out = new LinkedHashMap<>();
        in.forEach((k, v) -> out.put(toCamel(k), v));
        return out;
    }

    private static List<Map<String, Object>> camelList(List<Map<String, Object>> in) {
        return in.stream().map(AdminStatsService::camel).toList();
    }

    private static String toCamel(String snake) {
        StringBuilder sb = new StringBuilder();
        boolean up = false;
        for (char c : snake.toCharArray()) {
            if (c == '_') {
                up = true;
            } else {
                sb.append(up ? Character.toUpperCase(c) : c);
                up = false;
            }
        }
        return sb.toString();
    }
}
