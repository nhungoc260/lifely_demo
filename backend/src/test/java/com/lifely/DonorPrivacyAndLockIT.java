package com.lifely;

import com.lifely.auth.AuthUser;
import com.lifely.common.AppException;
import com.lifely.matching.MatchService;
import com.lifely.matching.dto.RequestMatchEntry;
import com.lifely.request.RequestService;
import com.lifely.request.Urgency;
import com.lifely.request.dto.CreateRequestDto;
import com.lifely.request.dto.RequestResponse;
import com.lifely.request.dto.UpdateRequestDto;
import com.lifely.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Che liên hệ người hiến trước khi nhận lời (người nhà) + khóa sửa SĐT/mô tả sau khi cơ sở xác nhận.
 * Cần PostgreSQL local có dữ liệu demo.   Chạy:  mvn test -Dtest=DonorPrivacyAndLockIT
 */
@SpringBootTest(properties = {"lifely.notify.worker-initial-delay-ms=3600000"})
class DonorPrivacyAndLockIT {

    @Autowired RequestService requestService;
    @Autowired MatchService matchService;
    @Autowired JdbcTemplate jdbc;
    @Autowired UserRepository userRepository;

    private AuthUser user(String email) {
        return new AuthUser(userRepository.findByEmailIgnoreCase(email).orElseThrow());
    }

    private void cleanup(UUID requestId) {
        jdbc.update("DELETE FROM notification_outbox WHERE reference_id=?", requestId);
        jdbc.update("DELETE FROM notifications WHERE reference_id=?", requestId);
        jdbc.update("DELETE FROM match_events WHERE match_id IN (SELECT id FROM matches WHERE request_id=?)", requestId);
        jdbc.update("DELETE FROM notifications WHERE reference_id IN (SELECT id FROM matches WHERE request_id=?)", requestId);
        jdbc.update("DELETE FROM matches WHERE request_id=?", requestId);
        jdbc.update("DELETE FROM request_status_history WHERE request_id=?", requestId);
        jdbc.update("DELETE FROM blood_requests WHERE id=?", requestId);
    }

    @Test
    void familySeesDonorContactOnlyAfterAcceptOrFacilityConfirm_andContentLocksAfterConfirm() {
        AuthUser requester = user("requester@lifely.demo");
        UUID org = jdbc.queryForObject("SELECT id FROM organizations WHERE verification_status='VERIFIED' AND owner_user_id IS NOT NULL LIMIT 1", UUID.class);
        UUID ownerId = jdbc.queryForObject("SELECT owner_user_id FROM organizations WHERE id=?", UUID.class, org);
        AuthUser staff = new AuthUser(userRepository.findById(ownerId).orElseThrow());
        jdbc.update("DELETE FROM blood_requests WHERE requester_id=? AND hospital_name IN (SELECT name FROM organizations WHERE id=?)", requester.getId(), org);

        CreateRequestDto dto = new CreateRequestDto("O+", 2, "ignored-name", "TP. Hồ Chí Minh", null, 10.77, 106.70, Urgency.URGENT,
                Instant.now().plus(3, ChronoUnit.HOURS), "0901234567", null, org, null, null);
        RequestResponse created = requestService.create(requester, dto, "it-key-" + UUID.randomUUID());
        UUID id = created.id();
        try {
            UUID donorId = jdbc.queryForObject("SELECT id FROM donor_profiles LIMIT 1", UUID.class);
            UUID matchId = UUID.randomUUID();
            jdbc.update("DELETE FROM matches WHERE request_id=? AND donor_id=?", id, donorId);
            jdbc.update("INSERT INTO matches (id, request_id, donor_id, matching_score, distance_km, status, contacted_at) VALUES (?,?,?,90,2,'PENDING',now())", matchId, id, donorId);

            // Chưa nhận lời, cơ sở chưa xác nhận: người nhà không thấy tên/số; nhân viên cơ sở thì thấy
            RequestMatchEntry asFamily = matchService.listForRequest(requester, id).stream().filter(e -> e.matchId().equals(matchId)).findFirst().orElseThrow();
            assertNull(asFamily.donorName());
            assertNull(asFamily.donorPhone());
            RequestMatchEntry asStaff = matchService.listForRequest(staff, id).stream().filter(e -> e.matchId().equals(matchId)).findFirst().orElseThrow();
            assertNotNull(asStaff.donorPhone(), "nhân viên cơ sở cần số để liên hệ gấp");

            // Người nhà không ghi nhận kết quả liên hệ với người hiến chưa nhận lời
            AppException denied = assertThrows(AppException.class,
                    () -> matchService.recordContactResult(requester, matchId, com.lifely.matching.ContactResult.CONTACTED));
            assertEquals("CONTACT_NOT_AVAILABLE", denied.getCode());

            // Cơ sở xác nhận: người nhà thấy liên hệ, và nội dung bị khóa
            requestService.facilityConfirm(staff, id);
            RequestMatchEntry afterConfirm = matchService.listForRequest(requester, id).stream().filter(e -> e.matchId().equals(matchId)).findFirst().orElseThrow();
            assertNotNull(afterConfirm.donorPhone());

            AppException locked = assertThrows(AppException.class,
                    () -> requestService.update(requester, id, new UpdateRequestDto("0987654321", null, null)));
            assertEquals("REQUEST_CONTENT_LOCKED", locked.getCode());
            // Nhân viên cơ sở vẫn sửa được
            assertDoesNotThrow(() -> requestService.update(staff, id, new UpdateRequestDto("0987654321", null, null)));
        } finally {
            cleanup(id);
        }
    }
}
