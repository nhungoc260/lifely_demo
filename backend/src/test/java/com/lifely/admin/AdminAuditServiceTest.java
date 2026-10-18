package com.lifely.admin;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AdminAuditServiceTest {

    @Test
    void escapeLikeNeutralisesWildcardsSoSearchIsLiteral() {
        assertEquals("a\\%b\\_c\\\\d", AdminAuditService.escapeLike("a%b_c\\d"));
        assertEquals("admin", AdminAuditService.escapeLike("admin"));
    }
}
