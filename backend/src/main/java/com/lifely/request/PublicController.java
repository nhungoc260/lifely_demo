package com.lifely.request;

import com.lifely.common.ApiResponse;
import com.lifely.common.AppException;
import com.lifely.common.GeoUtils;
import com.lifely.common.PageResponse;
import com.lifely.organization.Organization;
import com.lifely.organization.OrganizationService;
import com.lifely.request.dto.PublicRequestSummary;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** API công khai cho landing page và bản đồ: không có thông tin cá nhân, không có vị trí donor. */
@RestController
@RequestMapping("/api/public")
@Tag(name = "Public")
public class PublicController {

    private final BloodRequestRepository requestRepository;
    private final OrganizationService organizationService;
    private final JdbcTemplate jdbc;
    private final boolean demoEnvironment;

    public PublicController(BloodRequestRepository requestRepository, OrganizationService organizationService,
                            JdbcTemplate jdbc, @Value("${lifely.demo-environment:true}") boolean demoEnvironment) {
        this.requestRepository = requestRepository;
        this.organizationService = organizationService;
        this.jdbc = jdbc;
        this.demoEnvironment = demoEnvironment;
    }

    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> stats() {
        Map<String, Object> row = jdbc.queryForMap("""
                SELECT
                  (SELECT count(*) FROM donor_profiles) AS registered_donors,
                  (SELECT count(*) FROM donor_profiles d JOIN users u ON u.id = d.user_id
                     WHERE d.availability_status = 'AVAILABLE' AND u.status = 'ACTIVE') AS available_donors,
                  (SELECT count(*) FROM blood_requests WHERE verified = TRUE AND deadline > now()
                     AND status IN ('VERIFIED','MATCHING','DONORS_CONTACTED','PARTIALLY_FULFILLED')) AS active_requests,
                  (SELECT count(*) FROM matches WHERE status IN ('ACCEPTED','COMPLETED')) AS successful_connections,
                  (SELECT count(*) FROM organizations WHERE verification_status = 'VERIFIED') AS verified_organizations
                """);
        Map<String, Object> out = new java.util.LinkedHashMap<>();
        row.forEach((k, v) -> out.put(toCamel(k), v));
        out.put("demoEnvironment", demoEnvironment);
        return ApiResponse.ok("OK", out);
    }

    /** Request đã xác minh còn hiệu lực, ưu tiên mức khẩn cấp rồi tới deadline. Có thể kèm lat/lng để tính khoảng cách. */
    @GetMapping("/requests")
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<PublicRequestSummary>> requests(
            @RequestParam(required = false) Double lat, @RequestParam(required = false) Double lng,
            @RequestParam(required = false) String bloodType, @RequestParam(required = false) Urgency urgency,
            @RequestParam(required = false) Double radiusKm,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "12") int size) {
        List<PublicRequestSummary> all = requestRepository
                .findByStatusInAndVerifiedTrueAndDeadlineAfter(RequestStatus.ACTIVE, Instant.now()).stream()
                .filter(r -> bloodType == null || r.getBloodType().getCode().equals(bloodType))
                .filter(r -> urgency == null || r.getUrgency() == urgency)
                .map(r -> PublicRequestSummary.from(r, distance(lat, lng, r)))
                .filter(s -> radiusKm == null || s.distanceKm() == null || s.distanceKm() <= radiusKm)
                .sorted(Comparator.comparingInt((PublicRequestSummary s) -> s.urgency().rank())
                        .thenComparing(PublicRequestSummary::deadline))
                .toList();
        return ApiResponse.ok("OK", PageResponse.ofList(all, Math.max(page, 0), Math.min(Math.max(size, 1), 50)));
    }

    @GetMapping("/requests/{id}")
    @Transactional(readOnly = true)
    public ApiResponse<PublicRequestSummary> request(@PathVariable UUID id,
                                                     @RequestParam(required = false) Double lat,
                                                     @RequestParam(required = false) Double lng) {
        BloodRequest r = requestRepository.findById(id)
                .filter(x -> x.isVerified() && x.getStatus().isActive())
                .orElseThrow(() -> AppException.notFound("REQUEST_NOT_FOUND", "Request not found"));
        return ApiResponse.ok("OK", PublicRequestSummary.from(r, distance(lat, lng, r)));
    }

    /** Danh sách bệnh viện/tổ chức đã xác minh: dùng cho ô chọn địa điểm và marker Hospital trên bản đồ. */
    @GetMapping("/organizations")
    public ApiResponse<List<Map<String, Object>>> organizations() {
        List<Map<String, Object>> out = organizationService.verified().stream().map(this::orgSummary).toList();
        return ApiResponse.ok("OK", out);
    }

    private Map<String, Object> orgSummary(Organization o) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id", o.getId());
        m.put("name", o.getName());
        m.put("type", o.getType());
        m.put("address", o.getAddress());
        m.put("city", o.getCity());
        m.put("district", o.getDistrict());
        m.put("latitude", o.getLatitude());
        m.put("longitude", o.getLongitude());
        return m;
    }

    private static Double distance(Double lat, Double lng, BloodRequest r) {
        if (lat == null || lng == null) return null;
        return GeoUtils.round2(GeoUtils.haversineKm(lat, lng, r.getLatitude().doubleValue(),
                r.getLongitude().doubleValue()));
    }

    private static String toCamel(String snake) {
        StringBuilder sb = new StringBuilder();
        boolean up = false;
        for (char c : snake.toCharArray()) {
            if (c == '_') {
                up = true;
            } else {
                sb.append(up ? Character.toUpperCase(c) : c);
                up = false;
            }
        }
        return sb.toString();
    }
}
