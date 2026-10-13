-- Nhiều nhân viên cho cùng một tổ chức: chủ tổ chức (organizations.owner_user_id) thêm các tài khoản Tổ chức khác làm nhân viên.
-- Mỗi tài khoản chỉ thuộc tối đa một tổ chức (user_id là khóa chính).
CREATE TABLE organization_members (
    user_id         UUID        PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    organization_id UUID        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    added_by        UUID        REFERENCES users (id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_org_members_org ON organization_members (organization_id);

-- Tuỳ chọn của tổ chức: khi xác nhận một lần hiến, tự cộng 1 đơn vị đúng nhóm máu người hiến vào kho (mặc định tắt).
ALTER TABLE organizations ADD COLUMN inventory_auto_add BOOLEAN NOT NULL DEFAULT FALSE;

-- Demo: 2 nhân viên của Bệnh viện Chợ Rẫy (chủ tài khoản hospital@lifely.demo), mật khẩu demo như các tài khoản khác.
INSERT INTO users (id,email,password_hash,full_name,phone,status,onboarding_step,onboarding_completed,created_at) VALUES
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0901','nhanvien1@lifely.demo','$2b$10$V0Br7Ywl7pcm6HnLeJNdYu47uejCiW1FOsHkUxjDN4Q3wjW1l9djW','Võ Thanh Tâm','0901000021','ACTIVE',6,TRUE,now() - interval '5 days'),
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0902','nhanvien2@lifely.demo','$2b$10$V0Br7Ywl7pcm6HnLeJNdYu47uejCiW1FOsHkUxjDN4Q3wjW1l9djW','Đặng Mỹ Linh','0901000022','ACTIVE',6,TRUE,now() - interval '4 days');

INSERT INTO user_roles (user_id,role_id) VALUES
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0901',3),
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0902',3);

INSERT INTO privacy_settings (user_id) VALUES
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0901'),
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0902');

INSERT INTO organization_members (user_id, organization_id, added_by)
SELECT s.id, o.id, o.owner_user_id
  FROM organizations o
  JOIN users owner ON owner.id = o.owner_user_id AND owner.email = 'hospital@lifely.demo'
  CROSS JOIN (VALUES ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0901'::uuid), ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0902'::uuid)) AS s(id);
