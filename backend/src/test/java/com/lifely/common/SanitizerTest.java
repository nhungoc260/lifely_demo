package com.lifely.common;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class SanitizerTest {

    @Test
    void stripsHtmlTags() {
        assertEquals("alert(1)Room 5", Sanitizer.plain("<script>alert(1)</script>Room 5"));
    }

    @Test
    void blankBecomesNull() {
        assertNull(Sanitizer.plain("   "));
        assertNull(Sanitizer.plain("<b></b>"));
        assertNull(Sanitizer.plain(null));
    }

    @Test
    void keepsVietnameseText() {
        assertEquals("Bệnh viện Quận 1", Sanitizer.plain("  Bệnh viện Quận 1 "));
    }
}
