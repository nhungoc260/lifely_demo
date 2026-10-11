package com.lifely.donor;

import com.lifely.organization.OrganizationRepository;
import com.lifely.request.BloodRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Quyết định ai được tạo mức xác nhận nào và tổng hợp "huy hiệu cơ sở y tế đã xác nhận" của donor.
 * Quy tắc: chỉ CHỦ của tổ chức ĐÃ XÁC MINH và là tổ chức gắn với chính yêu cầu máu đó mới tạo được ORG_VERIFIED.
 * Mọi người khác (người nhà, admin) chỉ tạo được REQUESTER_CONFIRMED: admin không phải cơ sở y tế.
 */
@Service
public class DonorVerificationService {

    /** Kết quả xác nhận: mức + tổ chức (chỉ có khi ORG_VERIFIED). */
    public record Confirmation(VerificationLevel level, UUID organizationId, String organizationName) {
    }

    /** Huy hiệu của một donor: có lần hiến nào được cơ sở y tế xác nhận chưa, bởi cơ sở nào gần nhất. */
    public record Badge(boolean facilityVerified, String verifiedByName) {
    }

    /** Tóm tắt cho chính donor xem. */
    public record Summary(boolean facilityVerified, long facilityVerifiedDonations, long requesterConfirmedDonations,
                          String verifiedByName) {
    }

    private final DonationHistoryRepository historyRepository;
    private final OrganizationRepository organizationRepository;

    public DonorVerificationService(DonationHistoryRepository historyRepository,
                                    OrganizationRepository organizationRepository) {
        this.historyRepository = historyRepository;
        this.organizationRepository = organizationRepository;
    }

    @Transactional(readOnly = true)
    public Confirmation confirmation(UUID confirmerUserId, BloodRequest request) {
        if (request.getOrganizationId() != null) {
            return organizationRepository.findById(request.getOrganizationId())
                    .filter(o -> o.isVerified() && o.getOwnerUserId().equals(confirmerUserId))
                    .map(o -> new Confirmation(VerificationLevel.ORG_VERIFIED, o.getId(), o.getName()))
                    .orElseGet(DonorVerificationService::byRequester);
        }
        return byRequester();
    }

    /** Một truy vấn, dùng cho danh sách người hiến mà người cần máu nhìn thấy. */
    @Transactional(readOnly = true)
    public Badge badge(UUID donorId) {
        return historyRepository
                .findFirstByDonorIdAndVerificationLevelOrderByDonatedOnDescCreatedAtDesc(
                        donorId, VerificationLevel.ORG_VERIFIED.name())
                .map(h -> new Badge(true, h.getConfirmedByOrgName()))
                .orElse(new Badge(false, null));
    }

    @Transactional(readOnly = true)
    public Summary summary(UUID donorId) {
        Badge badge = badge(donorId);
        return new Summary(badge.facilityVerified(),
                historyRepository.countByDonorIdAndVerificationLevel(donorId, VerificationLevel.ORG_VERIFIED.name()),
                historyRepository.countByDonorIdAndVerificationLevel(donorId,
                        VerificationLevel.REQUESTER_CONFIRMED.name()),
                badge.verifiedByName());
    }

    private static Confirmation byRequester() {
        return new Confirmation(VerificationLevel.REQUESTER_CONFIRMED, null, null);
    }
}
