package com.lifely.request;

import com.lifely.common.AppException;
import com.lifely.organization.OrganizationRepository;
import com.lifely.user.Role;
import com.lifely.user.UserRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/** Quy tắc truy cập request, dùng chung cho REST và WebSocket (chống IDOR ở backend). */
@Component
public class RequestAccess {

    private final BloodRequestRepository requestRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;

    public RequestAccess(BloodRequestRepository requestRepository, OrganizationRepository organizationRepository,
                         UserRepository userRepository) {
        this.requestRepository = requestRepository;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
    }

    /** Người được xem/quản lý request: chủ yêu cầu, chủ tổ chức liên kết, hoặc admin. */
    public boolean canView(UUID userId, BloodRequest r) {
        if (r.getRequesterId().equals(userId)) {
            return true;
        }
        if (userRepository.findById(userId).map(u -> u.hasRole(Role.ADMIN)).orElse(false)) {
            return true;
        }
        return r.getOrganizationId() != null && organizationRepository.findById(r.getOrganizationId())
                .map(o -> o.getOwnerUserId().equals(userId)).orElse(false);
    }

    @Transactional(readOnly = true)
    public boolean canViewById(UUID userId, UUID requestId) {
        return requestRepository.findById(requestId).map(r -> canView(userId, r)).orElse(false);
    }

    public BloodRequest requireViewable(UUID userId, UUID requestId) {
        BloodRequest r = requestRepository.findById(requestId)
                .orElseThrow(() -> AppException.notFound("REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu"));
        if (!canView(userId, r)) {
            // Trả 404 thay vì 403 để không tiết lộ sự tồn tại của request người khác.
            throw AppException.notFound("REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu");
        }
        return r;
    }
}
