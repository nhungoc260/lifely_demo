package com.lifely.donor;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DonorProfileRepository extends JpaRepository<DonorProfile, UUID> {

    Optional<DonorProfile> findByUserId(UUID userId);

    /**
     * Bước "Filter" của matching: chỉ lấy donor sẵn sàng, tài khoản ACTIVE, đồng ý emergency matching,
     * nhóm máu tương thích, nằm trong bounding box và chưa được match với request này.
     * Khoảng cách chính xác (Haversine) được tính ở tầng service trên tập kết quả đã giới hạn.
     */
    @Query("""
            select d from DonorProfile d
            where d.availabilityStatus = com.lifely.donor.AvailabilityStatus.AVAILABLE
              and d.bloodType.id in :bloodTypeIds
              and d.latitude between :minLat and :maxLat
              and d.longitude between :minLng and :maxLng
              and (d.lastDonationDate is null
                   or (d.gender = 'FEMALE' and d.lastDonationDate <= :latestAllowedDonationFemale)
                   or (d.gender <> 'FEMALE' and d.lastDonationDate <= :latestAllowedDonation))
              and exists (select 1 from User u where u.id = d.userId
                          and u.status = com.lifely.user.UserStatus.ACTIVE)
              and exists (select 1 from PrivacySettings p where p.userId = d.userId
                          and p.allowEmergencyMatching = true)
              and not exists (select 1 from com.lifely.matching.Match m
                              where m.requestId = :requestId and m.donorId = d.id)
              and not exists (select 1 from com.lifely.matching.Match m2, com.lifely.request.BloodRequest r2
                              where m2.donorId = d.id and r2.id = m2.requestId
                                and m2.status = com.lifely.matching.MatchStatus.ACCEPTED
                                and r2.status in (com.lifely.request.RequestStatus.VERIFIED,
                                                  com.lifely.request.RequestStatus.MATCHING,
                                                  com.lifely.request.RequestStatus.DONORS_CONTACTED,
                                                  com.lifely.request.RequestStatus.PARTIALLY_FULFILLED))
            """)
    List<DonorProfile> findCandidates(@Param("bloodTypeIds") Collection<Short> bloodTypeIds,
                                      @Param("minLat") BigDecimal minLat,
                                      @Param("maxLat") BigDecimal maxLat,
                                      @Param("minLng") BigDecimal minLng,
                                      @Param("maxLng") BigDecimal maxLng,
                                      @Param("latestAllowedDonation") LocalDate latestAllowedDonation,
                                      @Param("latestAllowedDonationFemale") LocalDate latestAllowedDonationFemale,
                                      @Param("requestId") UUID requestId,
                                      Pageable pageable);
}
