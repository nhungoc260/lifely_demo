/** Đọc thời điểm hết hạn (ms epoch) từ payload JWT. Chỉ để quyết định gia hạn sớm; backend vẫn là nơi xác thực thật. */
export function jwtExpiresAt(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Còn bao nhiêu ms nữa token hết hạn; null nếu không đọc được. */
export function msUntilExpiry(token: string, now = Date.now()): number | null {
  const exp = jwtExpiresAt(token);
  return exp === null ? null : exp - now;
}
