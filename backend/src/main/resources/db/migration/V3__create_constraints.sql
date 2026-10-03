-- V3: ràng buộc dữ liệu. Đây là lớp phòng thủ cuối cùng, kể cả khi service có lỗi.

ALTER TABLE users
    ADD CONSTRAINT ck_users_status CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    ADD CONSTRAINT ck_users_attempts CHECK (failed_login_attempts >= 0);

ALTER TABLE donor_profiles
    ADD CONSTRAINT ck_donor_availability CHECK (availability_status IN ('AVAILABLE', 'NOT_AVAILABLE')),
    ADD CONSTRAINT ck_donor_lat CHECK (latitude  IS NULL OR latitude  BETWEEN -90  AND 90),
    ADD CONSTRAINT ck_donor_lng CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
    ADD CONSTRAINT ck_donor_total CHECK (total_donations >= 0),
    ADD CONSTRAINT ck_donor_last_date CHECK (last_donation_date IS NULL OR last_donation_date <= CURRENT_DATE + 1);

ALTER TABLE donation_history
    ADD CONSTRAINT ck_history_source CHECK (source IN ('SELF_REPORTED', 'LIFELY_MATCH'));

ALTER TABLE organizations
    ADD CONSTRAINT ck_org_type CHECK (type IN ('HOSPITAL', 'BLOOD_CENTER', 'CLINIC', 'NGO')),
    ADD CONSTRAINT ck_org_status CHECK (verification_status IN ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED'));

ALTER TABLE blood_requests
    ADD CONSTRAINT ck_req_units_required  CHECK (units_required BETWEEN 1 AND 20),
    -- Bất biến quan trọng nhất của hệ thống: không bao giờ xác nhận quá số cần (2/2, không bao giờ 3/2).
    ADD CONSTRAINT ck_req_units_confirmed CHECK (units_confirmed >= 0 AND units_confirmed <= units_required),
    ADD CONSTRAINT ck_req_urgency CHECK (urgency IN ('CRITICAL', 'URGENT', 'NORMAL')),
    ADD CONSTRAINT ck_req_status CHECK (status IN ('CREATED', 'PENDING_VERIFICATION', 'VERIFIED', 'MATCHING',
        'DONORS_CONTACTED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED', 'EXPIRED')),
    ADD CONSTRAINT ck_req_lat CHECK (latitude  BETWEEN -90  AND 90),
    ADD CONSTRAINT ck_req_lng CHECK (longitude BETWEEN -180 AND 180),
    ADD CONSTRAINT ck_req_escalation CHECK (escalation_level BETWEEN 1 AND 4);

ALTER TABLE matches
    ADD CONSTRAINT ck_match_status CHECK (status IN ('PENDING', 'CONTACTED', 'ACCEPTED', 'REJECTED',
        'CANCELLED', 'COMPLETED', 'EXPIRED')),
    ADD CONSTRAINT ck_match_score CHECK (matching_score BETWEEN 0 AND 100),
    ADD CONSTRAINT ck_match_distance CHECK (distance_km >= 0);

ALTER TABLE notifications
    ADD CONSTRAINT ck_notif_type CHECK (type IN ('NEW_MATCH', 'REQUEST_ACCEPTED', 'REQUEST_REJECTED',
        'REQUEST_CANCELLED', 'REQUEST_VERIFIED', 'REQUEST_EXPIRED', 'EMERGENCY_ESCALATION', 'SYSTEM'));

ALTER TABLE reports
    ADD CONSTRAINT ck_report_target CHECK (target_type IN ('REQUEST', 'USER', 'ORGANIZATION')),
    ADD CONSTRAINT ck_report_reason CHECK (reason IN ('FAKE_REQUEST', 'SPAM', 'INCORRECT_INFORMATION', 'ABUSE', 'OTHER')),
    ADD CONSTRAINT ck_report_status CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'REJECTED'));

-- updated_at tự cập nhật
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated          BEFORE UPDATE ON users          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_donor_profiles_updated BEFORE UPDATE ON donor_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_organizations_updated  BEFORE UPDATE ON organizations  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_blood_requests_updated BEFORE UPDATE ON blood_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_matches_updated        BEFORE UPDATE ON matches        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
