-- Phân cấp độ tin cậy của mỗi lần hiến máu theo NGƯỜI xác nhận:
--   SELF_REPORTED       : donor tự khai (chỉ để tham khảo)
--   REQUESTER_CONFIRMED : người nhà/bên điều phối xác nhận (độ tin cậy thấp)
--   ORG_VERIFIED        : tổ chức y tế đã được admin xác minh xác nhận (cao nhất)
ALTER TABLE donation_history
    ADD COLUMN verification_level     VARCHAR(20) NOT NULL DEFAULT 'SELF_REPORTED',
    ADD COLUMN confirmed_by_user_id   UUID REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN confirmed_by_org_id    UUID REFERENCES organizations (id) ON DELETE SET NULL,
    ADD COLUMN confirmed_by_org_name  VARCHAR(200),
    ADD COLUMN confirmed_at           TIMESTAMPTZ;

ALTER TABLE donation_history
    ADD CONSTRAINT chk_donation_verification_level
        CHECK (verification_level IN ('SELF_REPORTED', 'REQUESTER_CONFIRMED', 'ORG_VERIFIED')),
    -- mức ORG_VERIFIED bắt buộc phải biết tổ chức nào xác nhận
    ADD CONSTRAINT chk_donation_org_verified_has_org
        CHECK (verification_level <> 'ORG_VERIFIED' OR confirmed_by_org_name IS NOT NULL);

CREATE INDEX idx_donation_history_donor_level ON donation_history (donor_id, verification_level);
CREATE UNIQUE INDEX uq_donation_history_match ON donation_history (match_id) WHERE match_id IS NOT NULL;

-- Dữ liệu cũ: các lần hiến ghi nhận qua LIFELY trước đây do người dùng bấm xác nhận -> mức thấp.
UPDATE donation_history SET verification_level = 'REQUESTER_CONFIRMED' WHERE source = 'LIFELY_MATCH';

-- Yêu cầu thuộc tổ chức đã xác minh: coi như tổ chức đó xác nhận (chủ tổ chức là người thao tác).
UPDATE donation_history dh
   SET verification_level = 'ORG_VERIFIED', confirmed_by_org_id = o.id, confirmed_by_org_name = o.name,
       confirmed_by_user_id = o.owner_user_id, confirmed_at = dh.created_at
  FROM matches m
  JOIN blood_requests r ON r.id = m.request_id
  JOIN organizations o ON o.id = r.organization_id
 WHERE dh.match_id = m.id AND o.verification_status = 'VERIFIED';

-- Dữ liệu DEMO: một nửa số lần hiến tự khai tại cơ sở đã xác minh được mô phỏng là đã có cơ sở đó xác nhận,
-- để màn hình demo có đủ cả ba mức. Môi trường thật không nên chạy bước này.
UPDATE donation_history dh
   SET verification_level = 'ORG_VERIFIED', confirmed_by_org_id = o.id, confirmed_by_org_name = o.name,
       confirmed_by_user_id = o.owner_user_id, confirmed_at = dh.created_at
  FROM organizations o
 WHERE dh.source = 'SELF_REPORTED' AND dh.location = o.name AND o.verification_status = 'VERIFIED'
   AND mod(abs(hashtext(dh.id::text)), 2) = 0;

-- Dữ liệu DEMO: một nửa số lần hiến tự khai tại Hội Chữ thập đỏ (chưa có tổ chức đã xác minh) mô phỏng mức "người nhà xác nhận".
UPDATE donation_history
   SET verification_level = 'REQUESTER_CONFIRMED', confirmed_at = created_at
 WHERE source = 'SELF_REPORTED' AND location LIKE 'Hội Chữ thập đỏ%'
   AND mod(abs(hashtext(id::text)), 2) = 0;
