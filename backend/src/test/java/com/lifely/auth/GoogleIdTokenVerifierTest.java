package com.lifely.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifely.common.AppException;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GoogleIdTokenVerifierTest {

    private static final String CLIENT_ID = "test-client.apps.googleusercontent.com";

    private final ObjectMapper mapper = new ObjectMapper();
    private final GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier(CLIENT_ID, mapper);

    private JsonNode claims(String aud, String iss, String emailVerified, long expiresInSeconds) throws Exception {
        long exp = Instant.now().getEpochSecond() + expiresInSeconds;
        return mapper.readTree("""
                {"aud":"%s","iss":"%s","email":" Nhu.Ngoc@Gmail.com ","email_verified":"%s","name":"Như Ngọc","exp":"%d"}
                """.formatted(aud, iss, emailVerified, exp));
    }

    @Test
    void acceptsValidTokenAndNormalizesEmail() throws Exception {
        GoogleIdTokenVerifier.GoogleProfile profile =
                verifier.validateClaims(claims(CLIENT_ID, "https://accounts.google.com", "true", 600));
        assertEquals("nhu.ngoc@gmail.com", profile.email());
        assertEquals("Như Ngọc", profile.name());
    }

    @Test
    void acceptsIssuerWithoutScheme() throws Exception {
        assertEquals("nhu.ngoc@gmail.com",
                verifier.validateClaims(claims(CLIENT_ID, "accounts.google.com", "true", 600)).email());
    }

    @Test
    void rejectsTokenIssuedForAnotherApp() throws Exception {
        AppException e = assertThrows(AppException.class,
                () -> verifier.validateClaims(claims("other-app", "https://accounts.google.com", "true", 600)));
        assertEquals("INVALID_GOOGLE_TOKEN", e.getCode());
    }

    @Test
    void rejectsUnknownIssuer() throws Exception {
        AppException e = assertThrows(AppException.class,
                () -> verifier.validateClaims(claims(CLIENT_ID, "https://evil.example.com", "true", 600)));
        assertEquals("INVALID_GOOGLE_TOKEN", e.getCode());
    }

    @Test
    void rejectsExpiredToken() throws Exception {
        AppException e = assertThrows(AppException.class,
                () -> verifier.validateClaims(claims(CLIENT_ID, "https://accounts.google.com", "true", -10)));
        assertEquals("INVALID_GOOGLE_TOKEN", e.getCode());
    }

    @Test
    void rejectsUnverifiedEmail() throws Exception {
        AppException e = assertThrows(AppException.class,
                () -> verifier.validateClaims(claims(CLIENT_ID, "https://accounts.google.com", "false", 600)));
        assertEquals("GOOGLE_EMAIL_NOT_VERIFIED", e.getCode());
    }

    @Test
    void disabledWhenClientIdMissing() {
        GoogleIdTokenVerifier disabled = new GoogleIdTokenVerifier("  ", mapper);
        assertFalse(disabled.isEnabled());
        AppException e = assertThrows(AppException.class, () -> disabled.verify("any-token"));
        assertEquals("GOOGLE_NOT_CONFIGURED", e.getCode());
        assertTrue(verifier.isEnabled());
    }
}
