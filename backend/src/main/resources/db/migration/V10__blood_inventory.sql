-- Kho máu của tổ chức y tế: số đơn vị đang có theo từng nhóm máu và ngưỡng cảnh báo sắp hết.
-- Mỗi tổ chức có tối đa 8 dòng (một dòng cho mỗi nhóm máu); nhóm chưa khai báo được coi là 0 đơn vị.
CREATE TABLE blood_inventory (
    organization_id UUID        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    blood_type      VARCHAR(3)  NOT NULL,
    units           INT         NOT NULL DEFAULT 0,
    low_threshold   INT         NOT NULL DEFAULT 5,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, blood_type),
    CONSTRAINT chk_inventory_blood_type CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    CONSTRAINT chk_inventory_units CHECK (units >= 0 AND units <= 100000),
    CONSTRAINT chk_inventory_threshold CHECK (low_threshold >= 0 AND low_threshold <= 100000)
);
