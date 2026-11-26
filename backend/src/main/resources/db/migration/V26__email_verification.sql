-- Xác minh email: chống đăng ký trước bằng email của người khác rồi chờ họ đăng nhập Google.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Tài khoản đã tồn tại trước thay đổi này (gồm dữ liệu demo) được coi là đã xác minh để không làm gián đoạn người dùng hiện có.
UPDATE users SET email_verified = TRUE;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(64)  NOT NULL UNIQUE,   -- SHA-256 của token, không lưu token gốc
    expires_at TIMESTAMPTZ  NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verif_user ON email_verification_tokens (user_id);
