-- V6: tin nhắn liên hệ gửi tới admin (lưu trong DB để không bao giờ mất, dù email gửi lỗi).

CREATE TABLE contact_messages (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         REFERENCES users (id) ON DELETE SET NULL,
    name       VARCHAR(150) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    phone      VARCHAR(20),
    message    VARCHAR(2000) NOT NULL,
    status     VARCHAR(20)  NOT NULL DEFAULT 'NEW',
    handled_by UUID         REFERENCES users (id),
    handled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_contact_status CHECK (status IN ('NEW', 'READ', 'RESOLVED'))
);

CREATE INDEX idx_contact_status ON contact_messages (status, created_at DESC);
