package com.lifely.matching;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Giá trị enum phải khớp ràng buộc CHECK của migration V16 và đúng 5 trạng thái nghiệp vụ. */
class ContactResultTest {

    @Test
    void enumMatchesMigrationCheckConstraint() throws IOException {
        String sql = Files.readString(Path.of("src/main/resources/db/migration/V16__manual_contact_result_remove_voice.sql"),
                StandardCharsets.UTF_8);
        for (ContactResult r : ContactResult.values()) {
            assertTrue(sql.contains("'" + r.name() + "'"), "V16 thiếu giá trị " + r);
        }
        assertEquals(5, ContactResult.values().length);
    }

    @Test
    void noAutomaticCallStateExists() {
        assertTrue(Arrays.stream(ContactResult.values()).noneMatch(r -> r.name().contains("CALLING")),
                "Không có trạng thái 'đang gọi/đã gọi thành công' vì hệ thống không gọi điện");
    }
}
