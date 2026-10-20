package com.lifely.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Tự chữa lành lịch sử Flyway trước khi migrate: repair() cập nhật checksum của migration đã áp dụng
 * (khi file migration cũ bị sửa nội dung) và dọn bản ghi migration lỗi, rồi migrate() chạy các migration còn thiếu.
 * Không cần đặt biến FLYWAY_REPAIR nữa. repair() không đổi schema/dữ liệu, chỉ sửa bảng flyway_schema_history.
 * Nếu repair() gặp lỗi thì chỉ ghi cảnh báo và vẫn thử migrate() để lỗi thật hiện ra rõ ràng.
 */
@Configuration
public class FlywayRepairConfig {
    private static final Logger log = LoggerFactory.getLogger(FlywayRepairConfig.class);

    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return flyway -> {
            try {
                flyway.repair();
            } catch (RuntimeException e) {
                log.warn("Flyway repair không thành công, vẫn tiếp tục migrate: {}", e.getMessage());
            }
            flyway.migrate();
        };
    }
}
