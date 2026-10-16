-- Luồng B: đặt lịch hiến máu trước. TÁCH BẠCH với blood_requests (Luồng A) và với kho máu.
-- Lịch hẹn KHÔNG phải máu có sẵn: blood_inventory chỉ đổi khi nhân viên cơ sở xác nhận đã hiến (status DONATED).

CREATE TABLE donation_slots (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ NOT NULL,
    capacity        INT         NOT NULL,
    booked_count    INT         NOT NULL DEFAULT 0,
    status          VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
    created_by      UUID        REFERENCES users (id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_slot_org_start UNIQUE (organization_id, starts_at),
    CONSTRAINT ck_slot_time     CHECK (ends_at > starts_at),
    CONSTRAINT ck_slot_capacity CHECK (capacity BETWEEN 1 AND 500),
    -- Lưới an toàn cuối cùng: không bao giờ đặt quá sức chứa, kể cả khi service có lỗi.
    CONSTRAINT ck_slot_booked   CHECK (booked_count >= 0 AND booked_count <= capacity),
    CONSTRAINT ck_slot_status   CHECK (status IN ('ACTIVE', 'CLOSED'))
);
CREATE INDEX idx_slots_org_start ON donation_slots (organization_id, starts_at);

CREATE TABLE appointments (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id      UUID        NOT NULL REFERENCES donation_slots (id) ON DELETE CASCADE,
    donor_id     UUID        NOT NULL REFERENCES donor_profiles (id) ON DELETE CASCADE,
    -- BOOKED: đã đặt | CHECKED_IN: đã đến | SCREENED: đã sàng lọc | DONATED: cơ sở xác nhận đã hiến
    -- DEFERRED: sàng lọc không đạt/hoãn | NO_SHOW: không đến | CANCELLED: đã hủy
    status       VARCHAR(12) NOT NULL DEFAULT 'BOOKED',
    cancelled_at TIMESTAMPTZ,
    handled_by   UUID        REFERENCES users (id) ON DELETE SET NULL,
    handled_at   TIMESTAMPTZ,
    donation_id  UUID        REFERENCES donation_history (id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_appt_status CHECK (status IN ('BOOKED','CHECKED_IN','SCREENED','DONATED','DEFERRED','NO_SHOW','CANCELLED')),
    CONSTRAINT ck_appt_donated_has_history CHECK (status <> 'DONATED' OR donation_id IS NOT NULL)
);
-- Một người không giữ 2 chỗ còn hiệu lực trong cùng một khung giờ (chống bấm đúp / nhiều tab).
CREATE UNIQUE INDEX uq_appt_active_donor_slot ON appointments (slot_id, donor_id)
    WHERE status IN ('BOOKED','CHECKED_IN','SCREENED');
CREATE INDEX idx_appt_donor ON appointments (donor_id, status);

CREATE TRIGGER trg_slots_updated BEFORE UPDATE ON donation_slots FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_appts_updated BEFORE UPDATE ON appointments  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
