import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AUTH_MESSAGES, loginSchema, signupSchema } from "./auth";
import { fieldErrors } from "./errors";

function errorOf(result: { error?: z.ZodError }): z.ZodError {
  if (result.error === undefined) throw new Error("expected a ZodError");
  return result.error;
}

describe("fieldErrors", () => {
  const signupFields = signupSchema.keyof().options;

  it("returns an empty object when there are no issues", () => {
    expect(fieldErrors(new z.ZodError([]), signupFields)).toEqual({});
  });

  it("keeps only the first message of each field", () => {
    const error = errorOf(
      signupSchema.safeParse({
        email: "ana@example.com",
        password: "!!",
        confirmPassword: "otra",
      }),
    );
    expect(fieldErrors(error, signupFields)).toEqual({
      password: AUTH_MESSAGES.passwordTooShort,
      confirmPassword: AUTH_MESSAGES.passwordsDoNotMatch,
    });
  });

  it("maps every invalid field of a login form", () => {
    const error = errorOf(loginSchema.safeParse({ email: "  ", password: "" }));
    expect(fieldErrors(error, loginSchema.keyof().options)).toEqual({
      email: AUTH_MESSAGES.emailRequired,
      password: AUTH_MESSAGES.passwordRequired,
    });
  });

  it("ignores issues without a field", () => {
    const error = errorOf(loginSchema.safeParse(null));
    expect(fieldErrors(error, loginSchema.keyof().options)).toEqual({});
  });

  it("ignores fields that are not listed and non-string paths", () => {
    const error = new z.ZodError([
      { code: "custom", path: ["other"], message: "otro", input: undefined },
      { code: "custom", path: [0], message: "índice", input: undefined },
      { code: "custom", path: ["email"], message: "email", input: undefined },
    ]);
    expect(fieldErrors(error, ["email", "password"])).toEqual({
      email: "email",
    });
  });

  it("uses the top-level field for nested paths", () => {
    const error = new z.ZodError([
      {
        code: "custom",
        path: ["email", "domain"],
        message: "anidado",
        input: undefined,
      },
    ]);
    expect(fieldErrors(error, ["email"])).toEqual({ email: "anidado" });
  });
});
