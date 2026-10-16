package com.lifely.screening;

import com.lifely.audit.AuditService;
import com.lifely.common.AppException;
import com.lifely.matching.MatchingProperties;
import com.lifely.screening.ScreeningEvaluator.Finding;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * "Sức khỏe của tôi": số liệu tự nhập của CHÍNH người hiến. Chỉ lưu khi có đồng ý (rút được bất cứ lúc nào), xóa và xuất được.
 * Không diễn giải thành chẩn đoán. Không ghi giá trị sức khỏe vào log hay audit (chỉ ghi sự kiện và số bản ghi).
 * Mọi truy vấn đều ràng buộc theo user_id của người đang đăng nhập; không có API xem dữ liệu của người khác.
 */
@Service
public class DonorHealthService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int MAX_CHECKS_PER_DONOR = 500;
    private static final Set<String> GENDERS = Set.of("FEMALE", "MALE", "UNSPECIFIED");

    public record AddRequest(Integer heartRate, Integer systolic, Integer diastolic, Double weightKg) {
    }

    public record Evaluation(List<Finding> findings, boolean anyOutside, String disclaimer) {
    }

    public record CheckDto(UUID id, Instant measuredAt, Integer heartRate, Integer systolic, Integer diastolic,
                           Double weightKg, String source, List<Finding> findings, boolean anyOutside) {
    }

    public record Summary(String bloodType, LocalDate lastDonationDate, int totalDonations, String gender,
                          boolean canDonate, long daysUntilEligible, LocalDate eligibleOn, int intervalDays,
                          boolean consentGranted, boolean latestOutside, ScreeningRules rules, String disclaimer) {
    }

    public record Export(Instant exportedAt, String bloodType, String gender, LocalDate lastDonationDate,
                         int totalDonations, List<Row> checks, String disclaimer) {
        public record Row(Instant measuredAt, Integer heartRate, Integer systolic, Integer diastolic, Double weightKg,
                          String source) {
        }
    }

    private record Donor(UUID id, String gender, LocalDate lastDonation, int total, String bloodType) {
    }

    private final JdbcTemplate jdbc;
    private final ScreeningProperties screening;
    private final MatchingProperties matching;
    private final AuditService audit;

    public DonorHealthService(JdbcTemplate jdbc, ScreeningProperties screening, MatchingProperties matching, AuditService audit) {
        this.jdbc = jdbc;
        this.screening = screening;
        this.matching = matching;
        this.audit = audit;
    }

    // ------------------------------------------------------------------ tổng quan

    @Transactional(readOnly = true)
    public Summary summary(UUID userId) {
        Donor d = donor(userId);
        RejoinPolicy policy = matching.rejoinPolicy();
        LocalDate today = LocalDate.now(ZONE);
        List<CheckDto> latest = checks(d, 1);
        boolean latestOutside = !latest.isEmpty() && latest.get(0).anyOutside();
        return new Summary(d.bloodType(), d.lastDonation(), d.total(), d.gender(),
                policy.canDonate(d.lastDonation(), d.gender(), today), policy.daysRemaining(d.lastDonation(), d.gender(), today),
                policy.eligibleOn(d.lastDonation(), d.gender()), policy.daysFor(d.gender()), consent(userId), latestOutside,
                screening.rules(), ScreeningEvaluator.DISCLAIMER);
    }

    /** Kiểm tra nhanh, KHÔNG lưu và không cần đồng ý lưu dữ liệu. */
    @Transactional(readOnly = true)
    public Evaluation evaluate(UUID userId, AddRequest req) {
        requireAnyValue(req);
        List<Finding> f = ScreeningEvaluator.evaluate(screening.rules(), donor(userId).gender(), req.heartRate(),
                req.systolic(), req.diastolic(), req.weightKg());
        return new Evaluation(f, ScreeningEvaluator.anyOutside(f), ScreeningEvaluator.DISCLAIMER);
    }

    // ------------------------------------------------------------------ lưu / đọc / xóa / xuất

    @Transactional
    public CheckDto add(UUID userId, AddRequest req) {
        requireAnyValue(req);
        if (!consent(userId)) {
            throw AppException.conflict("HEALTH_CONSENT_REQUIRED", "Hãy đồng ý lưu dữ liệu sức khỏe trước khi lưu kết quả");
        }
        Donor d = donor(userId);
        Integer n = jdbc.queryForObject("SELECT count(*) FROM donor_health_checks WHERE donor_id = ?", Integer.class, d.id());
        if (n != null && n >= MAX_CHECKS_PER_DONOR) {
            throw AppException.conflict("HEALTH_LIMIT", "Đã đạt số bản ghi tối đa. Hãy xóa bớt lịch sử cũ.");
        }
        UUID id = jdbc.queryForObject("""
                INSERT INTO donor_health_checks (donor_id, heart_rate, systolic, diastolic, weight_kg)
                VALUES (?, ?, ?, ?, ?) RETURNING id
                """, UUID.class, d.id(), req.heartRate(), req.systolic(), req.diastolic(), req.weightKg());
        audit.log(userId, "HEALTH_CHECK_ADDED", "HEALTH", id);   // không kèm giá trị
        return checks(d, 1).get(0);
    }

    @Transactional(readOnly = true)
    public List<CheckDto> list(UUID userId, int limit) {
        List<CheckDto> newestFirst = checks(donor(userId), Math.min(Math.max(limit, 1), 200));
        List<CheckDto> asc = new ArrayList<>(newestFirst);
        Collections.reverse(asc);   // cũ -> mới để vẽ biểu đồ
        return asc;
    }

    @Transactional
    public int deleteAll(UUID userId) {
        Donor d = donor(userId);
        int n = jdbc.update("DELETE FROM donor_health_checks WHERE donor_id = ?", d.id());
        audit.log(userId, "HEALTH_DATA_DELETED", "HEALTH", userId, Map.of("count", n));
        return n;
    }

    /** Bật/rút đồng ý. Rút đồng ý chặn việc lưu mới; deleteData=true xóa luôn lịch sử đã lưu. */
    @Transactional
    public Summary setConsent(UUID userId, boolean granted, boolean deleteData) {
        jdbc.update("""
                INSERT INTO health_data_consents (user_id, granted, updated_at) VALUES (?, ?, now())
                ON CONFLICT (user_id) DO UPDATE SET granted = EXCLUDED.granted, updated_at = now()
                """, userId, granted);
        audit.log(userId, granted ? "HEALTH_CONSENT_GRANTED" : "HEALTH_CONSENT_REVOKED", "HEALTH", userId);
        if (!granted && deleteData) {
            deleteAll(userId);
        }
        return summary(userId);
    }

    @Transactional
    public Summary setGender(UUID userId, String gender) {
        if (gender == null || !GENDERS.contains(gender)) {
            throw AppException.badRequest("INVALID_GENDER", "Giá trị giới tính không hợp lệ");
        }
        jdbc.update("UPDATE donor_profiles SET gender = ? WHERE user_id = ?", gender, userId);
        return summary(userId);
    }

    @Transactional(readOnly = true)
    public Export export(UUID userId) {
        Donor d = donor(userId);
        List<Export.Row> rows = new ArrayList<>();
        for (CheckDto c : list(userId, 200)) {
            rows.add(new Export.Row(c.measuredAt(), c.heartRate(), c.systolic(), c.diastolic(), c.weightKg(), c.source()));
        }
        audit.log(userId, "HEALTH_DATA_EXPORTED", "HEALTH", userId, Map.of("count", rows.size()));
        return new Export(Instant.now(), d.bloodType(), d.gender(), d.lastDonation(), d.total(), rows,
                ScreeningEvaluator.DISCLAIMER);
    }

    /** CSV chỉ chứa số và mã nguồn nên không có rủi ro chèn công thức. */
    @Transactional(readOnly = true)
    public String exportCsv(UUID userId) {
        StringBuilder sb = new StringBuilder("thoi_diem,nhip_tim,tam_thu_mmHg,tam_truong_mmHg,can_nang_kg,nguon\n");
        for (Export.Row r : export(userId).checks()) {
            sb.append(r.measuredAt()).append(',').append(nz(r.heartRate())).append(',').append(nz(r.systolic())).append(',')
                    .append(nz(r.diastolic())).append(',').append(nz(r.weightKg())).append(',').append(r.source()).append('\n');
        }
        return sb.toString();
    }

    // ------------------------------------------------------------------ nội bộ

    private static String nz(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    private static void requireAnyValue(AddRequest r) {
        if (r.heartRate() == null && r.systolic() == null && r.diastolic() == null && r.weightKg() == null) {
            throw AppException.badRequest("NO_VALUES", "Hãy nhập ít nhất một chỉ số");
        }
        range(r.heartRate(), 20, 250, "Nhịp tim");
        range(r.systolic(), 50, 260, "Huyết áp tâm thu");
        range(r.diastolic(), 30, 160, "Huyết áp tâm trương");
        if (r.weightKg() != null && (r.weightKg() < 20 || r.weightKg() > 300)) {
            throw AppException.badRequest("INVALID_VALUE", "Cân nặng phải trong khoảng 20–300 kg");
        }
    }

    private static void range(Integer v, int min, int max, String label) {
        if (v != null && (v < min || v > max)) {
            throw AppException.badRequest("INVALID_VALUE", label + " phải trong khoảng " + min + "–" + max);
        }
    }

    private boolean consent(UUID userId) {
        Integer n = jdbc.queryForObject("SELECT count(*) FROM health_data_consents WHERE user_id = ? AND granted = TRUE",
                Integer.class, userId);
        return n != null && n > 0;
    }

    private Donor donor(UUID userId) {
        List<Donor> l = jdbc.query("""
                SELECT d.id, d.gender, d.last_donation_date, d.total_donations, bt.code
                  FROM donor_profiles d LEFT JOIN blood_types bt ON bt.id = d.blood_type_id WHERE d.user_id = ?
                """, (rs, i) -> new Donor(rs.getObject("id", UUID.class), rs.getString("gender"),
                rs.getDate("last_donation_date") == null ? null : rs.getDate("last_donation_date").toLocalDate(),
                rs.getInt("total_donations"), rs.getString("code")), userId);
        if (l.isEmpty()) {
            throw AppException.notFound("DONOR_PROFILE_NOT_FOUND", "Hãy hoàn tất hồ sơ người hiến máu trước");
        }
        return l.get(0);
    }

    private List<CheckDto> checks(Donor d, int limit) {
        ScreeningRules rules = screening.rules();
        return jdbc.query("""
                SELECT id, measured_at, heart_rate, systolic, diastolic, weight_kg, source
                  FROM donor_health_checks WHERE donor_id = ? ORDER BY measured_at DESC, created_at DESC LIMIT ?
                """, (rs, i) -> {
            Integer hr = (Integer) rs.getObject("heart_rate");
            Integer sys = (Integer) rs.getObject("systolic");
            Integer dia = (Integer) rs.getObject("diastolic");
            java.math.BigDecimal w = rs.getBigDecimal("weight_kg");
            Double weight = w == null ? null : w.doubleValue();
            List<Finding> f = ScreeningEvaluator.evaluate(rules, d.gender(), hr, sys, dia, weight);
            Timestamp t = rs.getTimestamp("measured_at");
            return new CheckDto(rs.getObject("id", UUID.class), t.toInstant(), hr, sys, dia, weight, rs.getString("source"),
                    f, ScreeningEvaluator.anyOutside(f));
        }, d.id(), limit);
    }
}
