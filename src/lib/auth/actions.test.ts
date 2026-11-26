import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { login, logout, signup } from "./actions";
import { AUTH_ERROR_MESSAGES } from "./errors";
import {
  AUTH_NOTICES,
  INITIAL_LOGIN_STATE,
  INITIAL_SIGNUP_STATE,
} from "./form-state";
import { AUTH_MESSAGES } from "@/lib/validation/auth";

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}));
const createClient = vi.hoisted(() => vi.fn(async () => ({ auth })));
const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
);
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));

function formDataOf(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(entries)) {
    formData.append(name, value);
  }
  return formData;
}

const PASSWORD = "clave-de-prueba-1";

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("login", () => {
  it("con datos inválidos no llama a Supabase y devuelve errores por campo", async () => {
    const state = await login(
      INITIAL_LOGIN_STATE,
      formDataOf({ email: "no-es-un-email", password: "" }),
    );

    expect(createClient).not.toHaveBeenCalled();
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    expect(state).toEqual({
      fieldErrors: {
        email: AUTH_MESSAGES.emailInvalid,
        password: AUTH_MESSAGES.passwordRequired,
      },
      formError: null,
      notice: null,
      values: { email: "no-es-un-email" },
    });
  });

  it("sin campos devuelve los errores de obligatorio y email vacío", async () => {
    const state = await login(INITIAL_LOGIN_STATE, new FormData());

    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    expect(state.fieldErrors).toEqual({
      email: AUTH_MESSAGES.emailRequired,
      password: AUTH_MESSAGES.passwordRequired,
    });
    expect(state.values).toEqual({ email: "" });
  });

  it("con credenciales inválidas devuelve el mensaje genérico y conserva el email", async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "invalid_credentials", status: 400 },
    });

    const state = await login(
      INITIAL_LOGIN_STATE,
      formDataOf({ email: "Ana@Example.com ", password: PASSWORD }),
    );

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "ana@example.com",
      password: PASSWORD,
    });
    expect(state.formError).toBe("Email o contraseña incorrectos");
    expect(state.fieldErrors).toEqual({});
    expect(state.values).toEqual({ email: "Ana@Example.com " });
    expect(JSON.stringify(state)).not.toContain(PASSWORD);
    expect(redirect).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith("[auth] login failed", {
      code: "invalid_credentials",
    });
  });

  it("con un error desconocido devuelve el mensaje genérico", async () => {
    const failure = new Error("fetch failed");
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: failure,
    });

    const state = await login(
      INITIAL_LOGIN_STATE,
      formDataOf({ email: "ana@example.com", password: PASSWORD }),
    );

    expect(state.formError).toBe(AUTH_ERROR_MESSAGES.generic);
    // Only name and message of the error, not the object itself.
    expect(consoleError).toHaveBeenCalledWith("[auth] login failed", {
      name: "Error",
      message: "fetch failed",
    });
    expect(consoleError.mock.calls[0]?.[1]).not.toBe(failure);
  });

  it("si va bien redirige al next interno", async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: { user: {}, session: {} },
      error: null,
    });

    await expect(
      login(
        INITIAL_LOGIN_STATE,
        formDataOf({
          email: "ana@example.com",
          password: PASSWORD,
          next: "/dashboard/123",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT /dashboard/123");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it.each([
    ["un next externo", "https://evil.example"],
    ["un next protocol-relative", "//evil.example"],
    ["un next vacío", ""],
  ])("con %s redirige al dashboard", async (_case, next) => {
    auth.signInWithPassword.mockResolvedValue({
      data: { user: {}, session: {} },
      error: null,
    });

    await expect(
      login(
        INITIAL_LOGIN_STATE,
        formDataOf({ email: "ana@example.com", password: PASSWORD, next }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT /dashboard");
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });
});

describe("signup", () => {
  const valid = {
    email: "nueva@example.com",
    password: PASSWORD,
    confirmPassword: PASSWORD,
  };

  it("con datos inválidos no llama a Supabase y devuelve errores por campo", async () => {
    const state = await signup(
      INITIAL_SIGNUP_STATE,
      formDataOf({
        email: "nueva@example.com",
        password: "corta",
        confirmPassword: "otra",
      }),
    );

    expect(createClient).not.toHaveBeenCalled();
    expect(auth.signUp).not.toHaveBeenCalled();
    expect(state.fieldErrors).toEqual({
      password: AUTH_MESSAGES.passwordTooShort,
      confirmPassword: AUTH_MESSAGES.passwordsDoNotMatch,
    });
    expect(state.values).toEqual({ email: "nueva@example.com" });
    expect(JSON.stringify(state)).not.toContain("corta");
  });

  it("con un email ya registrado devuelve un mensaje claro", async () => {
    auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "user_already_exists", status: 422 },
    });

    const state = await signup(INITIAL_SIGNUP_STATE, formDataOf(valid));

    expect(auth.signUp).toHaveBeenCalledWith({
      email: "nueva@example.com",
      password: PASSWORD,
    });
    expect(state.formError).toBe(AUTH_ERROR_MESSAGES.emailTaken);
    expect(state.values).toEqual({ email: "nueva@example.com" });
    expect(JSON.stringify(state)).not.toContain(PASSWORD);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sin sesión (confirmación por email) devuelve un aviso", async () => {
    auth.signUp.mockResolvedValue({
      data: { user: {}, session: null },
      error: null,
    });

    const state = await signup(INITIAL_SIGNUP_STATE, formDataOf(valid));

    expect(state.notice).toBe(AUTH_NOTICES.confirmEmail);
    expect(state.formError).toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("si va bien redirige al next saneado", async () => {
    auth.signUp.mockResolvedValue({
      data: { user: {}, session: {} },
      error: null,
    });

    await expect(
      signup(
        INITIAL_SIGNUP_STATE,
        formDataOf({ ...valid, next: "/\\evil.example" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT /dashboard");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("sin campos marca todos como obligatorios", async () => {
    const state = await signup(INITIAL_SIGNUP_STATE, new FormData());

    expect(auth.signUp).not.toHaveBeenCalled();
    expect(state.fieldErrors).toEqual({
      email: AUTH_MESSAGES.emailRequired,
      password: AUTH_MESSAGES.passwordRequired,
      confirmPassword: AUTH_MESSAGES.confirmPasswordRequired,
    });
  });
});

describe("logout", () => {
  it("cierra la sesión y redirige a /login", async () => {
    auth.signOut.mockResolvedValue({ error: null });

    await expect(logout()).rejects.toThrow("NEXT_REDIRECT /login");
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("redirige a /login aunque Supabase falle y registra el error", async () => {
    auth.signOut.mockResolvedValue({ error: { code: "session_not_found" } });

    await expect(logout()).rejects.toThrow("NEXT_REDIRECT /login");
    expect(consoleError).toHaveBeenCalledWith("[auth] logout failed", {
      code: "session_not_found",
    });
  });
});
