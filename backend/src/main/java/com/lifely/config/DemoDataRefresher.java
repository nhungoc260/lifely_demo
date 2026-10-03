package com.lifely.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * CHỈ dành cho môi trường demo: dữ liệu seed có deadline tương đối so với lúc chạy migration,
 * nên mỗi lần khởi động ta dời deadline để kịch bản demo (CRITICAL O+ 2/5, còn khoảng 01:42:18) luôn còn hiệu lực.
 * Tắt bằng DEMO_REFRESH_DEADLINES=false khi không phải demo.
 */
@Component
public class DemoDataRefresher implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataRefresher.class);

    private final JdbcTemplate jdbc;
    private final boolean enabled;

    public DemoDataRefresher(JdbcTemplate jdbc,
                             @Value("${lifely.demo.refresh-deadlines-on-startup:false}") boolean enabled) {
        this.jdbc = jdbc;
        this.enabled = enabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }
        int scenario = jdbc.update("""
                UPDATE blood_requests SET deadline = now() + interval '1 hour 42 minutes 18 seconds'
                WHERE hospital_name = 'LIFELY General Hospital' AND units_required = 5 AND urgency = 'CRITICAL'
                  AND status = 'PARTIALLY_FULFILLED'
                """);
        int others = jdbc.update("""
                UPDATE blood_requests SET deadline = now() + CASE urgency
                    WHEN 'CRITICAL' THEN interval '3 hours' WHEN 'URGENT' THEN interval '20 hours'
                    ELSE interval '60 hours' END
                WHERE status IN ('PENDING_VERIFICATION','VERIFIED','MATCHING','DONORS_CONTACTED','PARTIALLY_FULFILLED')
                  AND deadline < now() + interval '30 minutes'
                """);
        log.info("Demo data refreshed: scenario={}, other open requests={}", scenario, others);
    }
}
