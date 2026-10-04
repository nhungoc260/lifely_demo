package com.lifely.request;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BloodRequestRepository extends JpaRepository<BloodRequest, UUID>, JpaSpecificationExecutor<BloodRequest> {

    /** Khóa dòng (SELECT ... FOR UPDATE): các giao dịch accept đồng thời trên cùng request được xếp hàng tuần tự. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from BloodRequest r where r.id = :id")
    Optional<BloodRequest> findByIdForUpdate(@Param("id") UUID id);

    List<BloodRequest> findByRequesterIdOrderByCreatedAtDesc(UUID requesterId);

    List<BloodRequest> findByRequesterIdAndStatusIn(UUID requesterId, Collection<RequestStatus> statuses);

    long countByRequesterIdAndStatusIn(UUID requesterId, Collection<RequestStatus> statuses);

    long countByRequesterIdAndStatus(UUID requesterId, RequestStatus status);

    List<BloodRequest> findByStatusInAndDeadlineBefore(Collection<RequestStatus> statuses, Instant now);

    List<BloodRequest> findByStatusInAndVerifiedTrueAndDeadlineAfter(Collection<RequestStatus> statuses, Instant now);

    @Query("select coalesce(sum(r.unitsConfirmed), 0) from BloodRequest r where r.requesterId = :userId")
    long sumConfirmedByRequester(@Param("userId") UUID userId);
}
