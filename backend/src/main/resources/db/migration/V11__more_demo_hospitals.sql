-- Thêm 4 tài khoản bệnh viện demo (org8 - org11, cùng mật khẩu demo với các tài khoản org1 - org7)
-- và số liệu kho máu mẫu cho các tổ chức đã xác minh để màn hình Kho máu không trống khi demo.
INSERT INTO users (id,email,password_hash,full_name,phone,status,onboarding_step,onboarding_completed,created_at) VALUES
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0801','org8@lifely.demo','$2b$10$V0Br7Ywl7pcm6HnLeJNdYu47uejCiW1FOsHkUxjDN4Q3wjW1l9djW','Nguyễn Minh Khoa','0901000008','ACTIVE',6,TRUE,now() - interval '20 days'),
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0802','org9@lifely.demo','$2b$10$V0Br7Ywl7pcm6HnLeJNdYu47uejCiW1FOsHkUxjDN4Q3wjW1l9djW','Trần Thu Hà','0901000009','ACTIVE',6,TRUE,now() - interval '18 days'),
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0803','org10@lifely.demo','$2b$10$V0Br7Ywl7pcm6HnLeJNdYu47uejCiW1FOsHkUxjDN4Q3wjW1l9djW','Lê Hoàng Yến','0901000010','ACTIVE',6,TRUE,now() - interval '16 days'),
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0804','org11@lifely.demo','$2b$10$V0Br7Ywl7pcm6HnLeJNdYu47uejCiW1FOsHkUxjDN4Q3wjW1l9djW','Phạm Quốc Bảo','0901000011','ACTIVE',6,TRUE,now() - interval '12 days');

INSERT INTO user_roles (user_id,role_id) VALUES
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0801',3),
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0802',3),
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0803',3),
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0804',3);

INSERT INTO privacy_settings (user_id) VALUES
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0801'),
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0802'),
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0803'),
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0804');

INSERT INTO organizations (id,owner_user_id,name,type,address,city,district,latitude,longitude,phone,email,contact_person,verification_status,verified_by,verified_at) VALUES
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0801','0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0801','Bệnh viện Đại học Y Dược TP.HCM','HOSPITAL','215 Hồng Bàng, Quận 5','TP. Hồ Chí Minh','Quận 5',10.7549,106.6638,'02839000008','org8@lifely.demo','Nguyễn Minh Khoa','VERIFIED','87917977-3158-59f6-a2e6-8eb30e7f1c81',now() - interval '10 days'),
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0802','0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0802','Bệnh viện Nhi đồng 1','HOSPITAL','341 Sư Vạn Hạnh, Quận 10','TP. Hồ Chí Minh','Quận 10',10.7678,106.6697,'02839000009','org9@lifely.demo','Trần Thu Hà','VERIFIED','87917977-3158-59f6-a2e6-8eb30e7f1c81',now() - interval '10 days'),
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0803','0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0803','Bệnh viện Từ Dũ','HOSPITAL','284 Cống Quỳnh, Quận 1','TP. Hồ Chí Minh','Quận 1',10.7686,106.6877,'02839000010','org10@lifely.demo','Lê Hoàng Yến','VERIFIED','87917977-3158-59f6-a2e6-8eb30e7f1c81',now() - interval '10 days'),
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0804','0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0804','Bệnh viện 175','HOSPITAL','786 Nguyễn Kiệm, Gò Vấp','TP. Hồ Chí Minh','Gò Vấp',10.8172,106.6786,'02839000011','org11@lifely.demo','Phạm Quốc Bảo','VERIFIED','87917977-3158-59f6-a2e6-8eb30e7f1c81',now() - interval '10 days');

INSERT INTO organization_documents (organization_id,doc_type,file_name,file_url) VALUES
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0801','OPERATING_LICENSE','giay-phep-hoat-dong.pdf','/demo/giay-phep-8.pdf'),
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0802','OPERATING_LICENSE','giay-phep-hoat-dong.pdf','/demo/giay-phep-9.pdf'),
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0803','OPERATING_LICENSE','giay-phep-hoat-dong.pdf','/demo/giay-phep-10.pdf'),
 ('0b8c1f52-6a1e-4d47-9c11-5a0e2d7f0804','OPERATING_LICENSE','giay-phep-hoat-dong.pdf','/demo/giay-phep-11.pdf');

-- Kho máu mẫu cho mọi tổ chức đã xác minh: nhóm O- và AB- ít (để thấy cảnh báo "sắp hết"), các nhóm khác dồi dào hơn.
-- Chỉ thêm khi tổ chức chưa có dòng nào; số liệu thật do tổ chức tự cập nhật sau đó.
INSERT INTO blood_inventory (organization_id, blood_type, units, low_threshold)
SELECT o.id, bt.t,
       CASE bt.t
            WHEN 'O-'  THEN 1 + (abs(hashtext(o.id::text || bt.t)) % 4)
            WHEN 'AB-' THEN 2 + (abs(hashtext(o.id::text || bt.t)) % 4)
            ELSE 8 + (abs(hashtext(o.id::text || bt.t)) % 25)
       END,
       5
FROM organizations o
CROSS JOIN (VALUES ('A+'), ('A-'), ('B+'), ('B-'), ('AB+'), ('AB-'), ('O+'), ('O-')) AS bt(t)
WHERE o.verification_status = 'VERIFIED'
ON CONFLICT (organization_id, blood_type) DO NOTHING;
