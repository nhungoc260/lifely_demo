package com.lifely.organization;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OrganizationDocumentRepository extends JpaRepository<OrganizationDocument, UUID> {

    List<OrganizationDocument> findByOrganizationIdOrderByUploadedAtDesc(UUID organizationId);

    long countByOrganizationId(UUID organizationId);
}
