package com.lifely.common.health;

import com.lifely.common.AppException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class HealthServiceTest {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final HealthService service = new HealthService(jdbc);

    @Test
    void returnsUpWithLatestMigrationVersion() {
        when(jdbc.queryForObject("SELECT 1", Integer.class)).thenReturn(1);
        when(jdbc.queryForList(anyString(), eq(String.class))).thenReturn(List.of("1"));

        HealthStatus status = service.check();

        assertEquals("UP", status.status());
        assertEquals("UP", status.database().status());
        assertEquals("1", status.database().migrationVersion());
    }

    @Test
    void throwsDatabaseDownWhenQueryFails() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class)))
                .thenThrow(new DataAccessResourceFailureException("connection refused"));

        AppException ex = assertThrows(AppException.class, service::check);

        assertEquals("DATABASE_DOWN", ex.getCode());
    }
}
