import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionUser, requireSessionUser } from "./session";

const auth = vi.hoisted(() => ({ getClaims: vi.fn() }));
const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
);

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth }),
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/server", () => ({ connection: async () => {} }));

describe("getSessionUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve el id y el email de las claims verificadas", async () => {
    auth.getClaims.mockResolvedValue({
      data: { claims: { sub: "user-1", email: "ana@example.com" } },
      error: null,
    });
    await expect(getSessionUser()).resolves.toEqual({
      id: "user-1",
      email: "ana@example.com",
    });
  });

  it("devuelve email null si las claims no lo traen", async () => {
    auth.getClaims.mockResolvedValue({
      data: { claims: { sub: "user-1" } },
      error: null,
    });
    await expect(getSessionUser()).resolves.toEqual({
      id: "user-1",
      email: null,
    });
  });

  it("devuelve null sin sesión", async () => {
    auth.getClaims.mockResolvedValue({ data: null, error: null });
    await expect(getSessionUser()).resolves.toBeNull();
  });

  it("devuelve null si el JWT no es válido", async () => {
    auth.getClaims.mockResolvedValue({
      data: null,
      error: { code: "bad_jwt" },
    });
    await expect(getSessionUser()).resolves.toBeNull();
  });
});

describe("requireSessionUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve el usuario si hay sesión", async () => {
    auth.getClaims.mockResolvedValue({
      data: { claims: { sub: "user-1", email: "ana@example.com" } },
      error: null,
    });
    await expect(requireSessionUser()).resolves.toEqual({
      id: "user-1",
      email: "ana@example.com",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirige a /login sin sesión", async () => {
    auth.getClaims.mockResolvedValue({ data: null, error: null });
    await expect(requireSessionUser()).rejects.toThrow("NEXT_REDIRECT /login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
