package com.lifely.organization;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<Organization, UUID>, JpaSpecificationExecutor<Organization> {

    Optional<Organization> findByOwnerUserId(UUID ownerUserId);

    List<Organization> findByVerificationStatusOrderByNameAsc(OrgVerificationStatus status);
}
