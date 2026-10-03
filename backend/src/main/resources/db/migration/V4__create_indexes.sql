-- V4: index cho các truy vấn nóng (matching, danh sách request, thông báo, admin).

CREATE INDEX idx_donor_blood_type     ON donor_profiles (blood_type_id);
CREATE INDEX idx_donor_availability   ON donor_profiles (availability_status);
CREATE INDEX idx_donor_city           ON donor_profiles (city);
-- Lọc donor theo vùng (bounding box) trước khi tính Haversine
CREATE INDEX idx_donor_geo ON donor_profiles (latitude, longitude)
    WHERE availability_status = 'AVAILABLE';

CREATE INDEX idx_req_blood_type       ON blood_requests (blood_type_id);
CREATE INDEX idx_req_urgency          ON blood_requests (urgency);
CREATE INDEX idx_req_status           ON blood_requests (status);
CREATE INDEX idx_req_deadline         ON blood_requests (deadline);
CREATE INDEX idx_req_organization     ON blood_requests (organization_id);
CREATE INDEX idx_req_requester        ON blood_requests (requester_id);
CREATE INDEX idx_req_city             ON blood_requests (city);
CREATE INDEX idx_req_created_at       ON blood_requests (created_at DESC);

CREATE INDEX idx_history_request      ON request_status_history (request_id, created_at);
CREATE INDEX idx_match_request        ON matches (request_id, status);
CREATE INDEX idx_match_donor          ON matches (donor_id, status);
CREATE INDEX idx_match_events_match   ON match_events (match_id, created_at);
CREATE INDEX idx_donation_donor       ON donation_history (donor_id, donated_on DESC);

CREATE INDEX idx_notif_user_unread    ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX idx_org_status           ON organizations (verification_status);
CREATE INDEX idx_org_docs             ON organization_documents (organization_id);
CREATE INDEX idx_report_status        ON reports (status, created_at DESC);
CREATE INDEX idx_audit_user           ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_action         ON audit_logs (action, created_at DESC);
CREATE INDEX idx_reset_user           ON password_reset_tokens (user_id);
