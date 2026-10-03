package com.lifely.auth.dto;

import com.lifely.user.Role;
import com.lifely.user.User;

import java.util.List;
import java.util.UUID;

public record UserSummary(UUID id, String email, String fullName, String phone, String avatarUrl,
                          List<String> roles, boolean onboardingCompleted, int onboardingStep) {

    public static UserSummary from(User u) {
        List<String> roles = u.getRoles().stream()
                .map(Role::getName).map(n -> n.replace("ROLE_", "")).sorted().toList();
        return new UserSummary(u.getId(), u.getEmail(), u.getFullName(), u.getPhone(), u.getAvatarUrl(),
                roles, u.isOnboardingCompleted(), u.getOnboardingStep());
    }
}
