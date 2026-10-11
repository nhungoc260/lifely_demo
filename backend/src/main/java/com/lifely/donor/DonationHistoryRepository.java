package com.lifely.donor;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DonationHistoryRepository extends JpaRepository<DonationHistory, UUID> {

    List<DonationHistory> findByDonorIdOrderByDonatedOnDescCreatedAtDesc(UUID donorId);

    long countByDonorIdAndVerificationLevel(UUID donorId, String verificationLevel);

    Optional<DonationHistory> findFirstByDonorIdAndVerificationLevelOrderByDonatedOnDescCreatedAtDesc(
            UUID donorId, String verificationLevel);

    Optional<DonationHistory> findFirstByMatchId(UUID matchId);
}
