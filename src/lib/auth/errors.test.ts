import { describe, expect, it } from "vitest";
import {
  AUTH_ERROR_MESSAGES,
  authErrorCode,
  authErrorLog,
  authErrorMessage,
} from "./errors";

describe("authErrorCode", () => {
  it("lee el código de un error de Supabase", () => {
    expect(authErrorCode({ code: "invalid_credentials", status: 400 })).toBe(
      "invalid_credentials",
    );
  });

  it.each([
    ["null", null],
    ["un texto", "invalid_credentials"],
    ["un error sin código", new Error("boom")],
    ["un código que no es texto", { code: 400 }],
  ])("devuelve null con %s", (_case, error) => {
    expect(authErrorCode(error)).toBeNull();
  });
});

describe("authErrorMessage", () => {
  it.each([
    ["invalid_credentials", AUTH_ERROR_MESSAGES.invalidCredentials],
    ["email_not_confirmed", AUTH_ERROR_MESSAGES.emailNotConfirmed],
    ["over_request_rate_limit", AUTH_ERROR_MESSAGES.rateLimited],
    ["unexpected_failure", AUTH_ERROR_MESSAGES.generic],
    // A signup-only code must not leak into the login flow.
    ["user_already_exists", AUTH_ERROR_MESSAGES.generic],
  ])("login: %s", (code, message) => {
    expect(authErrorMessage({ code }, "login")).toBe(message);
  });

  it.each([
    ["user_already_exists", AUTH_ERROR_MESSAGES.emailTaken],
    ["email_exists", AUTH_ERROR_MESSAGES.emailTaken],
    ["weak_password", AUTH_ERROR_MESSAGES.weakPassword],
    ["over_email_send_rate_limit", AUTH_ERROR_MESSAGES.rateLimited],
    ["invalid_credentials", AUTH_ERROR_MESSAGES.generic],
    ["signup_disabled", AUTH_ERROR_MESSAGES.generic],
  ])("signup: %s", (code, message) => {
    expect(authErrorMessage({ code }, "signup")).toBe(message);
  });

  it("usa el mensaje genérico si el error no tiene código", () => {
    expect(authErrorMessage(new Error("fetch failed"), "login")).toBe(
      AUTH_ERROR_MESSAGES.generic,
    );
  });

  it("no hereda claves del prototipo como códigos", () => {
    expect(authErrorMessage({ code: "toString" }, "login")).toBe(
      AUTH_ERROR_MESSAGES.generic,
    );
  });
});

describe("authErrorLog", () => {
  it("de un error de Supabase solo conserva name, code y message", () => {
    const error = Object.assign(new Error("Invalid login credentials"), {
      name: "AuthApiError",
      code: "invalid_credentials",
      status: 400,
      request: { email: "ana@example.com", password: "secreta1" },
    });

    const logged = authErrorLog(error);

    expect(logged).toEqual({
      name: "AuthApiError",
      code: "invalid_credentials",
      message: "Invalid login credentials",
    });
    expect(JSON.stringify(logged)).not.toContain("secreta1");
    expect(JSON.stringify(logged)).not.toContain("ana@example.com");
  });

  it("lee name y message heredados de Error", () => {
    expect(authErrorLog(new TypeError("fetch failed"))).toEqual({
      name: "TypeError",
      message: "fetch failed",
    });
  });

  it("omite los campos que faltan o no son texto", () => {
    expect(authErrorLog({ code: "weak_password" })).toEqual({
      code: "weak_password",
    });
    expect(authErrorLog({ code: 42, message: { detail: "x" } })).toEqual({});
  });

  it("con algo que no es un objeto devuelve un objeto vacío", () => {
    for (const value of [null, undefined, "boom", 500]) {
      expect(authErrorLog(value)).toEqual({});
    }
  });
});
