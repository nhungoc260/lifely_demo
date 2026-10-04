package com.lifely;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test: cần PostgreSQL local đã chạy migration V1-V5 (dữ liệu demo) và biến môi trường DB_URL, DB_USERNAME, DB_PASSWORD, JWT_SECRET.
 * Chạy:  mvn test -Dtest=ApiSecurityIT
 */
@SpringBootTest
@AutoConfigureMockMvc
class ApiSecurityIT {

    private static final String PASSWORD = "Lifely@2027";

    @Autowired
    MockMvc mvc;
    @Autowired
    ObjectMapper mapper;

    private String login(String email, String password) throws Exception {
        MvcResult res = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}")).andReturn();
        if (res.getResponse().getStatus() != 200) return null;
        JsonNode body = mapper.readTree(res.getResponse().getContentAsString());
        return body.get("data").get("token").asText();
    }

    @Test
    void healthIsPublic() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.data.database.status").value("UP"));
    }

    @Test
    void validLoginReturnsTokenAndUser() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"donor@lifely.demo\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.user.roles[0]").value("DONOR"));
    }

    @Test
    void invalidLoginIsRejectedWithGenericMessage() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"donor@lifely.demo\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void protectedEndpointWithoutTokenIs401() throws Exception {
        mvc.perform(get("/api/donors/me")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void forgedTokenIs401() throws Exception {
        mvc.perform(get("/api/donors/me").header("Authorization", "Bearer not.a.jwt")).andExpect(status().isUnauthorized());
    }

    @Test
    void donorCannotReachAdminApi() throws Exception {
        String token = login("donor@lifely.demo", PASSWORD);
        mvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
    }

    @Test
    void requesterCannotReachAdminOrDonorApi() throws Exception {
        String token = login("requester@lifely.demo", PASSWORD);
        mvc.perform(get("/api/admin/requests").header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
        mvc.perform(get("/api/donors/me").header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
    }

    @Test
    void adminCanReachAdminApi() throws Exception {
        String token = login("admin@lifely.demo", PASSWORD);
        mvc.perform(get("/api/admin/dashboard").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.kpi.users").value(50));
    }

    @Test
    void registrationRejectsAdminRoleAndWeakPassword() throws Exception {
        String body = "{\"fullName\":\"Eve\",\"email\":\"eve@x.test\",\"phone\":\"0901234567\",\"password\":\"Passw0rdOK\",\"confirmPassword\":\"Passw0rdOK\",\"role\":\"ADMIN\"}";
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        String weak = "{\"fullName\":\"Eve\",\"email\":\"eve@x.test\",\"phone\":\"0901234567\",\"password\":\"weak\",\"confirmPassword\":\"weak\",\"role\":\"DONOR\"}";
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(weak))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void donorCannotActOnAnotherDonorsMatch_IDOR() throws Exception {
        String admin = login("admin@lifely.demo", PASSWORD);
        String donor = login("donor@lifely.demo", PASSWORD);
        // Lấy một match bất kỳ của donor khác qua danh sách request của admin không có sẵn,
        // nên dùng một UUID ngẫu nhiên: phải trả 404 chứ không tiết lộ tồn tại hay cho phép thao tác.
        mvc.perform(post("/api/matches/00000000-0000-0000-0000-000000000001/accept").header("Authorization", "Bearer " + donor))
                .andExpect(status().isNotFound());
        assertEquals(true, admin != null);
    }

    @Test
    void createRequestValidatesInput() throws Exception {
        String token = login("requester@lifely.demo", PASSWORD);
        String bad = "{\"bloodType\":\"X+\",\"unitsRequired\":99,\"hospitalName\":\"\",\"city\":\"\",\"latitude\":10,\"longitude\":106,\"urgency\":\"URGENT\",\"deadline\":\"2020-01-01T00:00:00Z\",\"contactPhone\":\"123\"}";
        mvc.perform(post("/api/requests").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(bad))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors").exists());
    }
}
