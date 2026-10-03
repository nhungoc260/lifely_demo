package com.lifely.auth;

import com.lifely.user.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Principal của người dùng đã xác thực. Được dựng lại từ DB ở mỗi request nên khóa tài khoản có hiệu lực ngay. */
public class AuthUser implements UserDetails {

    private final UUID id;
    private final String email;
    private final Set<String> roles;

    public AuthUser(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.roles = user.getRoles().stream().map(r -> r.getName()).collect(Collectors.toSet());
    }

    public UUID getId() {
        return id;
    }

    public Set<String> getRoles() {
        return roles;
    }

    public boolean hasRole(String role) {
        return roles.contains(role);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream().map(SimpleGrantedAuthority::new).collect(Collectors.toSet());
    }

    @Override
    public String getPassword() {
        return "";
    }

    @Override
    public String getUsername() {
        return email;
    }
}
