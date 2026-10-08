package com.lifely.common.health;

import com.lifely.common.AppException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class HealthService {

    private static final Logger log = LoggerFactory.getLogger(HealthService.class);

    private final JdbcTemplate jdbc;

    public HealthService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Kiểm tra backend sống và truy vấn được PostgreSQL + đọc phiên bản migration Flyway mới nhất. */
    public HealthStatus check() {
        try {
            jdbc.queryForObject("SELECT 1", Integer.class);
            List<String> versions = jdbc.queryForList(
                    "SELECT version FROM flyway_schema_history WHERE success = TRUE "
                            + "AND version IS NOT NULL ORDER BY installed_rank DESC LIMIT 1",
                    String.class);
            String version = versions.isEmpty() ? null : versions.get(0);
            return new HealthStatus("UP", "lifely-backend", Instant.now(),
                    new HealthStatus.Database("UP", version));
        } catch (Exception e) {
            log.error("Health check failed: database unavailable", e);
            throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, "DATABASE_DOWN",
                    "Cơ sở dữ liệu hiện không khả dụng");
        }
    }
}
