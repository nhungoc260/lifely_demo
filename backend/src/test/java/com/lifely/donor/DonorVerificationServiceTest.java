package com.lifely.donor;

import com.lifely.organization.OrgVerificationStatus;
import com.lifely.organization.Organization;
import com.lifely.organization.OrganizationRepository;
import com.lifely.request.BloodRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Chỉ chủ tổ chức ĐÃ XÁC MINH của chính yêu cầu mới tạo được mức ORG_VERIFIED. */
class DonorVerificationServiceTest {

    private final DonationHistoryRepository history = mock(DonationHistoryRepository.class);
    private final OrganizationRepository organizations = mock(OrganizationRepository.class);
    private DonorVerificationService service;
    private final UUID orgId = UUID.randomUUID();
    private final UUID orgOwner = UUID.randomUUID();
    private final UUID family = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new DonorVerificationService(history, organizations);
    }

    private Organization org(OrgVerificationStatus status) {
        Organization o = new Organization();
        o.setId(orgId);
        o.setName("Bệnh viện Chợ Rẫy");
        o.setOwnerUserId(orgOwner);
        o.setVerificationStatus(status);
        return o;
    }

    private BloodRequest requestOf(UUID organizationId) {
        BloodRequest r = new BloodRequest();
        r.setOrganizationId(organizationId);
        return r;
    }

    @Test
    void verifiedOrganizationOwnerOfTheRequestGivesFacilityLevel() {
        when(organizations.findById(orgId)).thenReturn(Optional.of(org(OrgVerificationStatus.VERIFIED)));
        when(organizations.findForUser(orgOwner)).thenReturn(Optional.of(org(OrgVerificationStatus.VERIFIED)));
        var c = service.confirmation(orgOwner, requestOf(orgId));
        assertEquals(VerificationLevel.ORG_VERIFIED, c.level());
        assertEquals(orgId, c.organizationId());
        assertEquals("Bệnh viện Chợ Rẫy", c.organizationName());
    }

    @Test
    void familyMemberOnAnOrganizationRequestOnlyGivesRequesterLevel() {
        when(organizations.findById(orgId)).thenReturn(Optional.of(org(OrgVerificationStatus.VERIFIED)));
        var c = service.confirmation(family, requestOf(orgId));
        assertEquals(VerificationLevel.REQUESTER_CONFIRMED, c.level());
        assertNull(c.organizationId());
    }

    @Test
    void unverifiedOrganizationCannotGiveFacilityLevel() {
        when(organizations.findById(orgId)).thenReturn(Optional.of(org(OrgVerificationStatus.PENDING)));
        assertEquals(VerificationLevel.REQUESTER_CONFIRMED, service.confirmation(orgOwner, requestOf(orgId)).level());
    }

    @Test
    void requestWithoutOrganizationNeverGivesFacilityLevel() {
        assertEquals(VerificationLevel.REQUESTER_CONFIRMED, service.confirmation(orgOwner, requestOf(null)).level());
    }

    @Test
    void badgeShowsTheMostRecentConfirmingFacility() {
        UUID donor = UUID.randomUUID();
        DonationHistory h = new DonationHistory();
        h.setDonatedOn(LocalDate.of(2027, 1, 1));
        h.setConfirmedByOrgName("Bệnh viện Truyền máu Huyết học");
        when(history.findFirstByDonorIdAndVerificationLevelOrderByDonatedOnDescCreatedAtDesc(donor, "ORG_VERIFIED"))
                .thenReturn(Optional.of(h));
        var badge = service.badge(donor);
        assertTrue(badge.facilityVerified());
        assertEquals("Bệnh viện Truyền máu Huyết học", badge.verifiedByName());
    }

    @Test
    void donorWithoutAnyFacilityConfirmationHasNoBadge() {
        UUID donor = UUID.randomUUID();
        when(history.findFirstByDonorIdAndVerificationLevelOrderByDonatedOnDescCreatedAtDesc(donor, "ORG_VERIFIED"))
                .thenReturn(Optional.empty());
        assertFalse(service.badge(donor).facilityVerified());
    }
}
