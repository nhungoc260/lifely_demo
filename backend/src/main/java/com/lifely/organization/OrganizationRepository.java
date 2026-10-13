package com.lifely.organization;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<Organization, UUID>, JpaSpecificationExecutor<Organization> {

    Optional<Organization> findByOwnerUserId(UUID ownerUserId);

    /** Tổ chức mà tài khoản này thuộc về: là chủ tổ chức, hoặc là nhân viên được chủ thêm vào. */
    @Query(value = """
            SELECT o.* FROM organizations o
             WHERE o.owner_user_id = :userId
                OR o.id IN (SELECT m.organization_id FROM organization_members m WHERE m.user_id = :userId)
             ORDER BY (o.owner_user_id = :userId) DESC
             LIMIT 1
            """, nativeQuery = true)
    Optional<Organization> findForUser(@Param("userId") UUID userId);

    List<Organization> findByVerificationStatusOrderByNameAsc(OrgVerificationStatus status);
}
