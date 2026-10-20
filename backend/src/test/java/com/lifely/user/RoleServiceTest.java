package com.lifely.user;

import com.lifely.audit.AuditAction;
import com.lifely.audit.AuditService;
import com.lifely.common.AppException;
import com.lifely.donor.DonorProfile;
import com.lifely.donor.DonorProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Bật thêm vai trò: chỉ DONOR/REQUESTER, không áp dụng cho tổ chức/admin, tự tạo hồ sơ người hiến khi cần. */
class RoleServiceTest {

    private final UserRepository users = mock(UserRepository.class);
    private final RoleRepository roles = mock(RoleRepository.class);
    private final DonorProfileRepository donors = mock(DonorProfileRepository.class);
    private final AuditService audit = mock(AuditService.class);
    private RoleService service;
    private final UUID id = UUID.randomUUID();

    private static Role role(String name) {
        Role r = new Role();
        r.setName(name);
        return r;
    }

    private User userWith(String... names) {
        User u = new User();
        u.setRoles(new HashSet<>());
        for (String n : names) u.getRoles().add(role(n));
        when(users.findById(id)).thenReturn(Optional.of(u));
        when(users.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        return u;
    }

    @BeforeEach
    void setUp() {
        service = new RoleService(users, roles, donors, audit);
        when(roles.findByName(Role.DONOR)).thenReturn(Optional.of(role(Role.DONOR)));
        when(roles.findByName(Role.REQUESTER)).thenReturn(Optional.of(role(Role.REQUESTER)));
        when(donors.findByUserId(id)).thenReturn(Optional.empty());
    }

    @Test
    void requesterCanBecomeDonorAndGetsProfile() {
        userWith(Role.REQUESTER);
        User out = service.addRole(id, "DONOR");
        assertTrue(out.hasRole(Role.DONOR));
        assertTrue(out.hasRole(Role.REQUESTER));
        verify(donors).save(any(DonorProfile.class));
        verify(audit).log(eq(id), eq(AuditAction.ROLE_ADDED), eq("USER"), eq(id), any());
    }

    @Test
    void donorCanBecomeRequesterWithoutNewProfile() {
        userWith(Role.DONOR);
        when(donors.findByUserId(id)).thenReturn(Optional.of(new DonorProfile(id)));
        User out = service.addRole(id, "REQUESTER");
        assertTrue(out.hasRole(Role.REQUESTER));
        verify(donors, never()).save(any(DonorProfile.class));
    }

    @Test
    void addingExistingRoleIsNoOp() {
        userWith(Role.DONOR);
        when(donors.findByUserId(id)).thenReturn(Optional.of(new DonorProfile(id)));
        service.addRole(id, "DONOR");
        verify(users, never()).save(any(User.class));
        verify(audit, never()).log(any(), any(), any(), any(), any());
    }

    @Test
    void organizationAndAdminAreRejected() {
        userWith(Role.ORGANIZATION);
        assertThrows(AppException.class, () -> service.addRole(id, "DONOR"));
        userWith(Role.ADMIN);
        assertThrows(AppException.class, () -> service.addRole(id, "REQUESTER"));
    }

    @Test
    void onlyDonorAndRequesterAllowed() {
        userWith(Role.DONOR);
        assertThrows(AppException.class, () -> service.addRole(id, "ADMIN"));
        assertThrows(AppException.class, () -> service.addRole(id, "ORGANIZATION"));
    }
}
