package com.lifely.auth.dto;

public record AuthResponse(String token, long expiresInSeconds, UserSummary user) {
}
