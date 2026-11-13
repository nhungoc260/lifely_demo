-- Giá xăng dùng để ước tính chi phí đi lại (xe máy). Admin cập nhật theo công bố của Petrolimex, giữ lịch sử.
-- Mặt hàng: xăng E10 RON 95 Mức 3 (RON 95-III), Vùng 1, đã gồm thuế GTGT.
CREATE TABLE fuel_prices (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    effective_date DATE         NOT NULL,
    price_vnd      INT          NOT NULL CHECK (price_vnd BETWEEN 10000 AND 60000),
    label          VARCHAR(120) NOT NULL DEFAULT 'Petrolimex vùng 1, xăng E10 RON 95 Mức 3',
    source         VARCHAR(200),
    created_by     UUID REFERENCES users(id),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- Mỗi ngày một giá; cập nhật lại trong ngày thì ghi đè.
CREATE UNIQUE INDEX uq_fuel_prices_date ON fuel_prices (effective_date);

INSERT INTO fuel_prices (effective_date, price_vnd, source) VALUES
    ('2026-11-11', 21150, 'Petrolimex công bố ngày 11/11/2026'),
    ('2026-11-12', 19840, 'Petrolimex công bố ngày 12/11/2026');
