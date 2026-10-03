package com.lifely.admin.dto;

import com.lifely.user.Role;
import com.lifely.user.User;
import com.lifely.user.UserStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminUserDto(UUID id, String email, String fullName, String phone, List<String> roles,
                           UserStatus status, Instant createdAt) {

    public static AdminUserDto from(User u) {
        return new AdminUserDto(u.getId(), u.getEmail(), u.getFullName(), u.getPhone(),
                u.getRoles().stream().map(Role::getName).map(n -> n.replace("ROLE_", "")).sorted().toList(),
                u.getStatus(), u.getCreatedAt());
    }
}
