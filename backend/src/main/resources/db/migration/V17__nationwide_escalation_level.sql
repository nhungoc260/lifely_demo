-- Thêm cấp tìm kiếm thứ 5 (toàn quốc) cho yêu cầu máu khẩn cấp.
ALTER TABLE blood_requests DROP CONSTRAINT IF EXISTS ck_req_escalation;
ALTER TABLE blood_requests ADD CONSTRAINT ck_req_escalation CHECK (escalation_level BETWEEN 1 AND 5);
