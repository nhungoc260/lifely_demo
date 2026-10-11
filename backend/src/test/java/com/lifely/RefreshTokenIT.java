package com.lifely;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test cho refresh token (cookie httpOnly, xoay vòng, phát hiện dùng lại).
 * Cần PostgreSQL đã chạy migration V1-V8 và biến môi trường như ApiSecurityIT.
 * Chạy:  mvn test -Dtest=RefreshTokenIT
 */
@SpringBootTest
@AutoConfigureMockMvc
class RefreshTokenIT {

    private static final String COOKIE = "lifely_refresh";
    private static final String CLIENT = "X-Lifely-Client";

    @Autowired
    MockMvc mvc;

    private MvcResult login() throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"donor@lifely.demo\",\"password\":\"Lifely@2027\"}"))
                .andExpect(status().isOk()).andReturn();
    }

    private static String refreshCookieValue(MvcResult result) {
        String header = result.getResponse().getHeader("Set-Cookie");
        assertNotNull(header, "Phản hồi phải có Set-Cookie");
        assertTrue(header.startsWith(COOKIE + "="), header);
        return header.substring(header.indexOf('=') + 1, header.indexOf(';'));
    }

    private MvcResult refresh(String cookieValue) throws Exception {
        return mvc.perform(post("/api/auth/refresh").header(CLIENT, "web").cookie(new Cookie(COOKIE, cookieValue)))
                .andReturn();
    }

    @Test
    void loginSetsHttpOnlyRefreshCookieScopedToAuthPath() throws Exception {
        String header = login().getResponse().getHeader("Set-Cookie");
        assertNotNull(header);
        assertTrue(header.contains("HttpOnly"), header);
        assertTrue(header.contains("Path=/api/auth"), header);
        assertTrue(header.contains("SameSite=Lax"), header);
    }

    @Test
    void refreshWithoutClientHeaderIsForbidden() throws Exception {
        String cookie = refreshCookieValue(login());
        mvc.perform(post("/api/auth/refresh").cookie(new Cookie(COOKIE, cookie)))
                .andExpect(status().isForbidden());
    }

    @Test
    void refreshWithoutCookieIsUnauthorized() throws Exception {
        mvc.perform(post("/api/auth/refresh").header(CLIENT, "web"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    void refreshReturnsNewAccessTokenAndRotatesCookie() throws Exception {
        String first = refreshCookieValue(login());
        MvcResult res = refresh(first);
        assertTrue(res.getResponse().getStatus() == 200, res.getResponse().getContentAsString());
        assertTrue(res.getResponse().getContentAsString().contains("\"token\""));
        assertNotEquals(first, refreshCookieValue(res));
    }

    @Test
    void reusingAnOldRefreshTokenRevokesTheWholeSession() throws Exception {
        String first = refreshCookieValue(login());
        String second = refreshCookieValue(refresh(first));

        // dùng lại token cũ -> bị từ chối và cả chuỗi phiên bị hủy
        assertTrue(refresh(first).getResponse().getStatus() == 401);
        // token mới (hợp lệ trước đó) cũng không còn dùng được
        assertTrue(refresh(second).getResponse().getStatus() == 401);
    }

    @Test
    void logoutRevokesRefreshToken() throws Exception {
        String cookie = refreshCookieValue(login());
        mvc.perform(post("/api/auth/logout").header(CLIENT, "web").cookie(new Cookie(COOKIE, cookie)))
                .andExpect(status().isOk());
        MvcResult after = refresh(cookie);
        assertFalse(after.getResponse().getStatus() == 200);
    }
}
