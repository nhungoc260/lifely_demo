-- V2: toàn bộ bảng nghiệp vụ (khóa chính, khóa ngoại, unique). CHECK/trigger ở V3, index ở V4.

CREATE TABLE roles (
    id   SMALLINT    PRIMARY KEY,
    name VARCHAR(30) NOT NULL UNIQUE
);
INSERT INTO roles (id, name) VALUES
    (1, 'ROLE_DONOR'), (2, 'ROLE_REQUESTER'), (3, 'ROLE_ORGANIZATION'), (4, 'ROLE_ADMIN');

CREATE TABLE blood_types (
    id   SMALLINT   PRIMARY KEY,
    code VARCHAR(3) NOT NULL UNIQUE
);
INSERT INTO blood_types (id, code) VALUES
    (1,'O+'),(2,'O-'),(3,'A+'),(4,'A-'),(5,'B+'),(6,'B-'),(7,'AB+'),(8,'AB-');

-- Ma trận tương thích hồng cầu: donor_type có thể cho recipient_type (quy tắc ABO + Rh).
-- Chỉ phục vụ xếp hạng điều phối, KHÔNG phải quyết định y tế.
CREATE TABLE blood_compatibility (
    donor_type_id     SMALLINT NOT NULL REFERENCES blood_types (id),
    recipient_type_id SMALLINT NOT NULL REFERENCES blood_types (id),
    PRIMARY KEY (donor_type_id, recipient_type_id)
);
INSERT INTO blood_compatibility (donor_type_id, recipient_type_id)
SELECT d.id, r.id
FROM blood_types d CROSS JOIN blood_types r
WHERE (   d.code LIKE 'O%'
       OR (d.code LIKE 'A%' AND d.code NOT LIKE 'AB%' AND r.code LIKE 'A%')
       OR (d.code LIKE 'B%' AND (r.code LIKE 'B%' OR r.code LIKE 'AB%'))
       OR (d.code LIKE 'AB%' AND r.code LIKE 'AB%'))
  AND (right(d.code, 1) = '-' OR right(r.code, 1) = '+');

CREATE TABLE users (
    id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email                 VARCHAR(255) NOT NULL,
    password_hash         VARCHAR(100) NOT NULL,
    full_name             VARCHAR(150) NOT NULL,
    phone                 VARCHAR(20)  NOT NULL,
    avatar_url            VARCHAR(500),
    status                VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    failed_login_attempts INT          NOT NULL DEFAULT 0,
    locked_until          TIMESTAMPTZ,
    onboarding_step       INT          NOT NULL DEFAULT 1,
    onboarding_completed  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_users_email_lower ON users (lower(email));

CREATE TABLE user_roles (
    user_id UUID     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id SMALLINT NOT NULL REFERENCES roles (id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE password_reset_tokens (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(64)  NOT NULL UNIQUE,   -- SHA-256 của token, không lưu token gốc
    expires_at TIMESTAMPTZ  NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE privacy_settings (
    user_id                       UUID    PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    show_approximate_location     BOOLEAN NOT NULL DEFAULT TRUE,
    allow_emergency_matching      BOOLEAN NOT NULL DEFAULT TRUE,
    receive_emergency_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    show_donation_count           BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE donor_profiles (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID          NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    blood_type_id       SMALLINT      REFERENCES blood_types (id),
    city                VARCHAR(100),
    district            VARCHAR(100),
    latitude            NUMERIC(9, 6),   -- vị trí chính xác: CHỈ dùng cho matching, không bao giờ trả ra public API
    longitude           NUMERIC(9, 6),
    last_donation_date  DATE,
    availability_status VARCHAR(20)   NOT NULL DEFAULT 'NOT_AVAILABLE',
    total_donations     INT           NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE organizations (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id       UUID         NOT NULL UNIQUE REFERENCES users (id),
    name                VARCHAR(200) NOT NULL,
    type                VARCHAR(30)  NOT NULL,
    address             VARCHAR(300) NOT NULL,
    city                VARCHAR(100) NOT NULL,
    district            VARCHAR(100),
    latitude            NUMERIC(9, 6),
    longitude           NUMERIC(9, 6),
    phone               VARCHAR(20)  NOT NULL,
    email               VARCHAR(255) NOT NULL,
    contact_person      VARCHAR(150) NOT NULL,
    verification_status VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    verification_note   VARCHAR(500),
    verified_by         UUID         REFERENCES users (id),
    verified_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE organization_documents (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID         NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    doc_type        VARCHAR(50)  NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    file_url        VARCHAR(500) NOT NULL,
    uploaded_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE blood_requests (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id     UUID         NOT NULL REFERENCES users (id),
    organization_id  UUID         REFERENCES organizations (id),
    blood_type_id    SMALLINT     NOT NULL REFERENCES blood_types (id),
    units_required   INT          NOT NULL,
    units_confirmed  INT          NOT NULL DEFAULT 0,
    urgency          VARCHAR(10)  NOT NULL,
    status           VARCHAR(30)  NOT NULL DEFAULT 'CREATED',
    hospital_name    VARCHAR(200) NOT NULL,
    city             VARCHAR(100) NOT NULL,
    district         VARCHAR(100),
    latitude         NUMERIC(9, 6) NOT NULL,
    longitude        NUMERIC(9, 6) NOT NULL,
    deadline         TIMESTAMPTZ  NOT NULL,
    contact_phone    VARCHAR(20)  NOT NULL,
    description      VARCHAR(1000),
    verified         BOOLEAN      NOT NULL DEFAULT FALSE,
    verified_by      UUID         REFERENCES users (id),
    escalation_level INT          NOT NULL DEFAULT 1,
    last_escalated_at TIMESTAMPTZ,
    cancel_reason    VARCHAR(500),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE request_status_history (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id  UUID        NOT NULL REFERENCES blood_requests (id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status   VARCHAR(30) NOT NULL,
    note        VARCHAR(300),
    actor_id    UUID        REFERENCES users (id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE matches (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id     UUID          NOT NULL REFERENCES blood_requests (id) ON DELETE CASCADE,
    donor_id       UUID          NOT NULL REFERENCES donor_profiles (id),
    matching_score NUMERIC(5, 2) NOT NULL,
    distance_km    NUMERIC(7, 2) NOT NULL,
    escalation_level INT         NOT NULL DEFAULT 1,
    status         VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    contacted_at   TIMESTAMPTZ,
    responded_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_matches_request_donor UNIQUE (request_id, donor_id)
);

CREATE TABLE match_events (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id   UUID        NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
    event_type VARCHAR(30) NOT NULL,
    metadata   JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE donation_history (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id    UUID         NOT NULL REFERENCES donor_profiles (id) ON DELETE CASCADE,
    donated_on  DATE         NOT NULL,
    location    VARCHAR(200),
    source      VARCHAR(20)  NOT NULL DEFAULT 'SELF_REPORTED',
    match_id    UUID         REFERENCES matches (id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type           VARCHAR(30)  NOT NULL,
    title          VARCHAR(150) NOT NULL,
    message        VARCHAR(500) NOT NULL,
    is_read        BOOLEAN      NOT NULL DEFAULT FALSE,
    reference_type VARCHAR(30),
    reference_id   UUID,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE reports (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID         NOT NULL REFERENCES users (id),
    target_type VARCHAR(20)  NOT NULL,
    target_id   UUID         NOT NULL,
    reason      VARCHAR(30)  NOT NULL,
    description VARCHAR(1000),
    status      VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
    resolved_by UUID         REFERENCES users (id),
    resolved_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID,
    action      VARCHAR(40)  NOT NULL,
    entity_type VARCHAR(40),
    entity_id   UUID,
    metadata    JSONB,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
