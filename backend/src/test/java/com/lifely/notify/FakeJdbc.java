package com.lifely.notify;

import org.springframework.jdbc.core.JdbcTemplate;

import java.util.ArrayList;
import java.util.List;

/** JdbcTemplate giả cho unit test: ghi lại các câu SQL ghi và trả giá trị cấu hình sẵn. Không cần DB. */
class FakeJdbc extends JdbcTemplate {

    final List<String> updates = new ArrayList<>();
    final List<Object[]> updateArgs = new ArrayList<>();
    int consentCount = 1;
    int updateResult = 1;

    @Override
    @SuppressWarnings("unchecked")
    public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
        return (T) Integer.valueOf(consentCount);
    }

    @Override
    public int update(String sql, Object... args) {
        updates.add(sql);
        updateArgs.add(args);
        return updateResult;
    }

    boolean anyUpdateContains(String fragment) {
        return updates.stream().anyMatch(u -> u.contains(fragment));
    }
}
