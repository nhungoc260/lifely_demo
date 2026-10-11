package com.lifely;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Endpoint huy hiệu xác nhận hiến máu: chỉ DONOR xem được, dữ liệu lịch sử có mức xác nhận. Cần DB đã chạy V1-V9. */
@SpringBootTest
@AutoConfigureMockMvc
class DonorVerificationIT {

    @Autowired
    MockMvc mvc;
    @Autowired
    ObjectMapper mapper;

    private String token(String email) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"Lifely@2027\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return mapper.readTree(body).path("data").path("token").asText();
    }

    @Test
    void donorSeesVerificationSummary() throws Exception {
        mvc.perform(get("/api/donors/me/verification").header("Authorization", "Bearer " + token("donor@lifely.demo")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.facilityVerifiedDonations").isNumber())
                .andExpect(jsonPath("$.data.requesterConfirmedDonations").isNumber());
    }

    @Test
    void nonDonorCannotReadTheDonorVerificationEndpoint() throws Exception {
        mvc.perform(get("/api/donors/me/verification").header("Authorization", "Bearer " + token("requester@lifely.demo")))
                .andExpect(status().isForbidden());
    }

    @Test
    void historyEntriesCarryTheirVerificationLevel() throws Exception {
        String body = mvc.perform(get("/api/donors/me/history").header("Authorization", "Bearer " + token("donor@lifely.demo")))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode data = mapper.readTree(body).path("data");
        for (JsonNode entry : data) {
            String level = entry.path("verificationLevel").asText();
            assertTrue(level.equals("SELF_REPORTED") || level.equals("REQUESTER_CONFIRMED") || level.equals("ORG_VERIFIED"), level);
        }
    }

    @Test
    void anonymousUserIsRejected() throws Exception {
        mvc.perform(get("/api/donors/me/verification")).andExpect(status().isUnauthorized());
    }
}
