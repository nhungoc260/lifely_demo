-- V1: baseline cho Phase 1.
-- Schema nghiệp vụ (users, donor_profiles, blood_requests, ...) tạo ở Phase 2 (V2+).

-- gen_random_uuid() có sẵn từ PostgreSQL 13; pgcrypto giữ lại cho tương thích.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE app_metadata (
    key        VARCHAR(100) PRIMARY KEY,
    value      VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO app_metadata (key, value) VALUES
    ('product', 'LIFELY'),
    ('schema_phase', '1');
