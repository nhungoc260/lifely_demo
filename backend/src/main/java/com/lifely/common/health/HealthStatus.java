package com.lifely.common.health;

import java.time.Instant;

public record HealthStatus(String status, String service, Instant timestamp, Database database) {

    public record Database(String status, String migrationVersion) {
    }
}
