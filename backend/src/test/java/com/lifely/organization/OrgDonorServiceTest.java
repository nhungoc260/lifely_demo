package com.lifely.organization;

import com.lifely.audit.AuditService;
import com.lifely.common.AppException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Tài khoản chưa có hồ sơ tổ chức thì không xem được danh sách và không phát sinh nhật ký. */
class OrgDonorServiceTest {

    @Test
    void withoutOrganizationItIsRejectedAndNothingIsLogged() {
        OrganizationRepository orgs = mock(OrganizationRepository.class);
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        AuditService audit = mock(AuditService.class);
        UUID uid = UUID.randomUUID();
        when(orgs.findForUser(uid)).thenReturn(Optional.empty());

        OrgDonorService service = new OrgDonorService(orgs, jdbc, audit);

        assertThrows(AppException.class, () -> service.list(uid));
        verify(audit, never()).log(any(), any(), any(), any(), any());
        verifyNoInteractions(jdbc);
    }
}
