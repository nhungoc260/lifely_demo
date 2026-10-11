import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function makeJwt(expSecondsFromNow: number): string {
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${enc({ alg: "HS256" })}.${enc({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow })}.sig`;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const ok = (data: unknown) => json(200, { success: true, message: "ok", data });
const unauthorized = () => json(401, { success: false, message: "Bạn cần đăng nhập", code: "UNAUTHORIZED" });

function stubBrowser(initialStorage: Record<string, string> = {}) {
  const storage = new Map(Object.entries(initialStorage));
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
      removeItem: (k: string) => void storage.delete(k),
    },
  });
  return storage;
}

async function load() {
  vi.resetModules();
  const store = await import("@/lib/auth-store");
  const api = await import("@/lib/api");
  return { tokenStore: store.tokenStore, ...api };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("tokenStore", () => {
  it("keeps the access token in memory only; storage holds just a non-secret hint", async () => {
    const storage = stubBrowser();
    const { tokenStore } = await load();
    tokenStore.set("secret-access-token");
    expect([...storage.values()]).not.toContain("secret-access-token");
    expect(storage.get("lifely.session")).toBe("1");
    tokenStore.set(null);
    expect(storage.has("lifely.session")).toBe(false);
    expect(tokenStore.get()).toBeNull();
  });

  it("starts in restoring state only when a session hint exists", async () => {
    stubBrowser({ "lifely.session": "1" });
    expect((await load()).tokenStore.isRestoring()).toBe(true);
    stubBrowser();
    expect((await load()).tokenStore.isRestoring()).toBe(false);
  });

  it("bumps the session id on sign-in/out but not when the token is merely refreshed", async () => {
    stubBrowser();
    const { tokenStore } = await load();
    const s0 = tokenStore.getSession();
    tokenStore.set("a");
    const s1 = tokenStore.getSession();
    tokenStore.set("b"); // gia hạn
    expect(tokenStore.getSession()).toBe(s1);
    tokenStore.set(null);
    expect(s1).toBeGreaterThan(s0);
    expect(tokenStore.getSession()).toBeGreaterThan(s1);
  });
});

describe("apiFetch + refresh token", () => {
  it("on 401 refreshes once via the httpOnly cookie, then retries with the new token", async () => {
    stubBrowser();
    const { tokenStore, apiFetch } = await load();
    tokenStore.set(makeJwt(600));
    const fresh = makeJwt(900);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(ok({ token: fresh }))
      .mockResolvedValueOnce(ok({ hello: "world" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch<{ hello: string }>("/api/users/me")).resolves.toEqual({ hello: "world" });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [refreshUrl, refreshInit] = fetchMock.mock.calls[1];
    expect(refreshUrl).toContain("/api/auth/refresh");
    expect(refreshInit.credentials).toBe("include");
    expect(refreshInit.headers["X-Lifely-Client"]).toBe("web");
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe(`Bearer ${fresh}`);
    expect(tokenStore.get()).toBe(fresh);
  });

  it("signs the user out when the refresh token is rejected", async () => {
    stubBrowser();
    const { tokenStore, apiFetch } = await load();
    tokenStore.set(makeJwt(600));
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(unauthorized())
        .mockResolvedValueOnce(json(401, { success: false, message: "hết hạn", code: "INVALID_REFRESH_TOKEN" })),
    );
    await expect(apiFetch("/api/users/me")).rejects.toMatchObject({ status: 401 });
    expect(tokenStore.get()).toBeNull();
  });

  it("does not sign out on a network error during refresh", async () => {
    stubBrowser();
    const { tokenStore, apiFetch } = await load();
    const t = makeJwt(600);
    tokenStore.set(t);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(unauthorized()).mockRejectedValueOnce(new TypeError("network down")),
    );
    await expect(apiFetch("/api/users/me")).rejects.toMatchObject({ status: 401 });
    expect(tokenStore.get()).toBe(t);
  });

  it("shares one refresh request between concurrent 401s", async () => {
    stubBrowser();
    const { tokenStore, apiFetch } = await load();
    tokenStore.set(makeJwt(600));
    const fresh = makeJwt(900);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/api/auth/refresh")) return ok({ token: fresh });
      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization;
      return auth === `Bearer ${fresh}` ? ok({ done: true }) : unauthorized();
    });
    vi.stubGlobal("fetch", fetchMock);

    await Promise.all([apiFetch("/api/a"), apiFetch("/api/b"), apiFetch("/api/c")]);
    const refreshCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes("/api/auth/refresh"));
    expect(refreshCalls).toHaveLength(1);
  });

  it("refreshes proactively when the access token is about to expire", async () => {
    stubBrowser();
    const { tokenStore, apiFetch } = await load();
    tokenStore.set(makeJwt(5)); // còn 5 giây < ngưỡng 30 giây
    const fresh = makeJwt(900);
    const fetchMock = vi.fn().mockResolvedValueOnce(ok({ token: fresh })).mockResolvedValueOnce(ok({ fine: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/users/me");
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/auth/refresh");
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(`Bearer ${fresh}`);
  });

  it("logoutRequest never throws, even when the network is down", async () => {
    stubBrowser();
    const { logoutRequest } = await load();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(logoutRequest()).resolves.toBeUndefined();
  });
});
