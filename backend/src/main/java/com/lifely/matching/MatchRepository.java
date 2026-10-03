package com.lifely.matching;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface MatchRepository extends JpaRepository<Match, UUID> {

    List<Match> findByRequestIdOrderByMatchingScoreDesc(UUID requestId);

    List<Match> findByRequestIdAndStatusIn(UUID requestId, Collection<MatchStatus> statuses);

    List<Match> findByDonorIdOrderByCreatedAtDesc(UUID donorId);

    @Query("""
            select count(m) from Match m, BloodRequest r
            where r.id = m.requestId and m.donorId = :donorId
              and m.status in (com.lifely.matching.MatchStatus.PENDING, com.lifely.matching.MatchStatus.CONTACTED)
              and r.verified = true and r.deadline > :now
              and r.status in (com.lifely.request.RequestStatus.VERIFIED, com.lifely.request.RequestStatus.MATCHING,
                               com.lifely.request.RequestStatus.DONORS_CONTACTED,
                               com.lifely.request.RequestStatus.PARTIALLY_FULFILLED)
            """)
    long countOpenForDonor(@Param("donorId") UUID donorId, @Param("now") Instant now);

    @Query("""
            select count(m) from Match m, BloodRequest r
            where r.id = m.requestId and r.requesterId = :userId and m.status in :statuses
            """)
    long countResponsesForRequester(@Param("userId") UUID userId, @Param("statuses") Collection<MatchStatus> statuses);
}
