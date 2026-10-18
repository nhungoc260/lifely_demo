package com.lifely.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Mặc định chỉ chạy migrate (giống hành vi chuẩn của Spring Boot).
 * Khi đặt FLYWAY_REPAIR=true, chạy repair() trước migrate() để cập nhật checksum
 * của migration đã áp dụng (dùng MỘT LẦN sau khi sửa nội dung file migration cũ, ví dụ V5).
 * Xong việc thì xóa biến FLYWAY_REPAIR.
 */
@Configuration
public class FlywayRepairConfig {

    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy(@Value("${FLYWAY_REPAIR:false}") boolean repair) {
        return flyway -> {
            if (repair) {
                flyway.repair();
            }
            flyway.migrate();
        };
    }
}
