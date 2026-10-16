package com.lifely;

import com.lifely.auth.AuthUser;
import com.lifely.common.AppException;
import com.lifely.matching.MatchService;
import com.lifely.request.RequestService;
import com.lifely.request.dto.CreateRequestDto;
import com.lifely.request.dto.RequestResponse;
import com.lifely.request.Urgency;
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
 * Luồng A: yêu cầu gắn với cơ sở đã xác minh được huy động ngay (không chờ admin), cơ sở được báo và xác nhận/từ chối được;
 * gửi lại cùng Idempotency-Key không tạo bản thứ hai; người nhà không làm đổi hồ sơ hiến máu.
 * Cần PostgreSQL local có dữ liệu demo.   Chạy:  mvn test -Dtest=RequestFlowIT
 */
@SpringBootTest(properties = {"lifely.notify.worker-initial-delay-ms=3600000"})
class RequestFlowIT {

    @Autowired RequestService requestService;
    @Autowired MatchService matchService;
    @Autowired JdbcTemplate jdbc;
    @Autowired UserRepository userRepository;

    private AuthUser user(String email) {
        return new AuthUser(userRepository.findByEmailIgnoreCase(email).orElseThrow());
    }

    private CreateRequestDto dto(UUID org, String blood) {
        return new CreateRequestDto(blood, 2, "ignored-name", "TP. Hồ Chí Minh", null, 10.77, 106.70, Urgency.URGENT,
                Instant.now().plus(3, ChronoUnit.HOURS), "0901234567", null, org);
    }

    private void cleanup(UUID requestId) {
        jdbc.update("DELETE FROM notification_outbox WHERE reference_id=?", requestId);
        jdbc.update("DELETE FROM notifications WHERE reference_id=?", requestId);
        jdbc.update("DELETE FROM match_events WHERE match_id IN (SELECT id FROM matches WHERE request_id=?)", requestId);
        jdbc.update("DELETE FROM notifications WHERE reference_id IN (SELECT id FROM matches WHERE request_id=?)", requestId);
        jdbc.update("DELETE FROM donation_history WHERE match_id IN (SELECT id FROM matches WHERE request_id=?)", requestId);
        jdbc.update("DELETE FROM matches WHERE request_id=?", requestId);
        jdbc.update("DELETE FROM request_status_history WHERE request_id=?", requestId);
        jdbc.update("DELETE FROM blood_requests WHERE id=?", requestId);
    }

    @Test
    void facilityLinkedRequestIsMobilizedWithoutAdminAndStaffAreNotified() {
        AuthUser requester = user("requester@lifely.demo");
        UUID org = jdbc.queryForObject("SELECT id FROM organizations WHERE verification_status='VERIFIED' AND owner_user_id IS NOT NULL LIMIT 1", UUID.class);
        UUID ownerId = jdbc.queryForObject("SELECT owner_user_id FROM organizations WHERE id=?", UUID.class, org);
        jdbc.update("DELETE FROM blood_requests WHERE requester_id=? AND hospital_name IN (SELECT name FROM organizations WHERE id=?)", requester.getId(), org);
        String key = "it-key-" + UUID.randomUUID();

        RequestResponse created = requestService.create(requester, dto(org, "A+"), key);
        UUID id = created.id();
        try {
            assertNotEquals("PENDING_VERIFICATION", created.status().name(), "không bắt admin duyệt thủ công");
            assertTrue(created.verified());
            assertEquals("PENDING", created.facilityReview(), "đang chờ cơ sở xác nhận");
            assertEquals(0, created.unitsReceived(), "mới tiếp nhận: chưa có máu");
            assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM notifications WHERE user_id=? AND type='STAFF_NEW_REQUEST' AND reference_id=?", Integer.class, ownerId, id),
                    "nhân viên cơ sở được báo");

            // Gửi lại cùng khóa (bấm đúp / retry mạng) trả về đúng yêu cầu cũ
            RequestResponse replay = requestService.create(requester, dto(org, "A+"), key);
            assertEquals(id, replay.id());
            assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM blood_requests WHERE requester_id=? AND idempotency_key=?", Integer.class, requester.getId(), key));
            // Không có khóa nhưng giống hệt trong 10 phút: bị chặn
            AppException dup = assertThrows(AppException.class, () -> requestService.create(requester, dto(org, "A+"), null));
            assertEquals("DUPLICATE_REQUEST", dup.getCode());

            // Người không thuộc cơ sở không xác nhận được; cơ sở từ chối thì dừng huy động
            assertThrows(AppException.class, () -> requestService.facilityConfirm(requester, id));
            RequestResponse denied = requestService.facilityDeny(new AuthUser(userRepository.findById(ownerId).orElseThrow()), id, "Không phải của cơ sở");
            assertEquals("DENIED", denied.facilityReview());
            assertEquals("CANCELLED", denied.status().name());
            assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM notification_outbox WHERE reference_id=? AND status='PENDING'", Integer.class, id),
                    "không còn lời mời nào chờ gửi");
        } finally {
            cleanup(id);
        }
    }

    @Test
    void requesterConfirmationDoesNotChangeDonorRecordOrCountAsReceivedWhenFacilityExists() {
        AuthUser requester = user("requester@lifely.demo");
        UUID org = jdbc.queryForObject("SELECT id FROM organizations WHERE verification_status='VERIFIED' AND owner_user_id IS NOT NULL LIMIT 1", UUID.class);
        jdbc.update("DELETE FROM blood_requests WHERE requester_id=? AND hospital_name IN (SELECT name FROM organizations WHERE id=?)", requester.getId(), org);
        RequestResponse created = requestService.create(requester, dto(org, "B+"), "it-key-" + UUID.randomUUID());
        UUID id = created.id();
        try {
            UUID donorId = jdbc.queryForObject("SELECT id FROM donor_profiles LIMIT 1", UUID.class);
            int totalBefore = jdbc.queryForObject("SELECT total_donations FROM donor_profiles WHERE id=?", Integer.class, donorId);
            Object lastBefore = jdbc.queryForList("SELECT last_donation_date FROM donor_profiles WHERE id=?", donorId).get(0).get("last_donation_date");
            UUID matchId = UUID.randomUUID();
            jdbc.update("DELETE FROM matches WHERE request_id=? AND donor_id=?", id, donorId);
            jdbc.update("INSERT INTO matches (id, request_id, donor_id, matching_score, distance_km, status, contacted_at) VALUES (?,?,?,90,2,'ACCEPTED',now())", matchId, id, donorId);
            jdbc.update("UPDATE blood_requests SET units_confirmed = 1 WHERE id=?", id);

            matchService.complete(requester, matchId);   // người nhà, không phải nhân viên cơ sở

            assertEquals(totalBefore, jdbc.queryForObject("SELECT total_donations FROM donor_profiles WHERE id=?", Integer.class, donorId),
                    "người nhà không được làm đổi hồ sơ hiến máu");
            assertEquals(lastBefore, jdbc.queryForList("SELECT last_donation_date FROM donor_profiles WHERE id=?", donorId).get(0).get("last_donation_date"));
            assertEquals(0, jdbc.queryForObject("SELECT units_received FROM blood_requests WHERE id=?", Integer.class, id),
                    "yêu cầu có cơ sở: chờ cơ sở xác nhận mới tính vào lượng đã nhận");
            assertNotEquals("FULFILLED", jdbc.queryForObject("SELECT status FROM blood_requests WHERE id=?", String.class, id));
        } finally {
            cleanup(id);
        }
    }
}
