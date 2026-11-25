import { describe, expect, it } from "vitest";
import {
  DASHBOARD_PATH,
  LOGIN_PATH,
  isAuthPath,
  isPrivatePath,
  resolveAuthRedirect,
  safeNextPath,
} from "./routes";

describe("isPrivatePath", () => {
  it.each([
    "/dashboard",
    "/dashboard/",
    "/dashboard/x",
    "/dashboard/candidaturas/123",
  ])("%s es privada", (path) => {
    expect(isPrivatePath(path)).toBe(true);
  });

  it.each([
    "/",
    "//",
    "",
    "/login",
    "/registro",
    "/dashboardx",
    "/dashboard-x",
    "/otro/dashboard",
    "/Dashboard",
  ])("%s no es privada", (path) => {
    expect(isPrivatePath(path)).toBe(false);
  });
});

describe("isAuthPath", () => {
  it.each(["/login", "/registro", "/login/"])("%s es de auth", (path) => {
    expect(isAuthPath(path)).toBe(true);
  });

  it.each(["/", "/dashboard", "/loginx", "/login/otra", "/registros", ""])(
    "%s no es de auth",
    (path) => {
      expect(isAuthPath(path)).toBe(false);
    },
  );
});

describe("safeNextPath", () => {
  it.each(["/dashboard", "/dashboard/x?filtro=abierta#top", "/", "/a//b"])(
    "acepta la ruta interna %s",
    (value) => {
      expect(safeNextPath(value)).toBe(value);
    },
  );

  it.each([
    ["vacío", ""],
    ["protocol-relative", "//evil.com"],
    ["protocol-relative con ruta", "//evil.com/dashboard"],
    ["URL absoluta https", "https://evil.com"],
    ["URL absoluta http", "http://evil.com/dashboard"],
    ["javascript:", "javascript:alert(1)"],
    ["barra invertida", "/\\evil"],
    ["barra invertida doble", "\\\\evil.com"],
    ["ruta relativa sin barra", "dashboard"],
    ["tabulador que el navegador elimina", "/\t/evil.com"],
    ["salto de línea", "/\n/evil.com"],
    ["carácter DEL", "/\u007F/evil.com"],
  ])("rechaza %s", (_label, value) => {
    expect(safeNextPath(value)).toBe(DASHBOARD_PATH);
  });

  it("rechaza null y undefined", () => {
    expect(safeNextPath(null)).toBe(DASHBOARD_PATH);
    expect(safeNextPath(undefined)).toBe(DASHBOARD_PATH);
  });

  it("usa el fallback indicado", () => {
    expect(safeNextPath("//evil.com", "/")).toBe("/");
    expect(safeNextPath("/dashboard", "/")).toBe("/dashboard");
  });
});

describe("resolveAuthRedirect", () => {
  it("sin usuario en ruta privada redirige a login conservando el destino", () => {
    expect(resolveAuthRedirect("/dashboard", "", false)).toEqual({
      kind: "redirect",
      pathname: LOGIN_PATH,
      next: "/dashboard",
    });
  });

  it("conserva la query string en el destino", () => {
    expect(
      resolveAuthRedirect("/dashboard/x", "?estado=abierta", false),
    ).toEqual({
      kind: "redirect",
      pathname: LOGIN_PATH,
      next: "/dashboard/x?estado=abierta",
    });
  });

  it("sin usuario en rutas públicas no redirige", () => {
    expect(resolveAuthRedirect("/", "", false)).toEqual({ kind: "none" });
    expect(resolveAuthRedirect("/login", "", false)).toEqual({ kind: "none" });
    expect(resolveAuthRedirect("/registro", "", false)).toEqual({
      kind: "none",
    });
    expect(resolveAuthRedirect("/dashboardx", "", false)).toEqual({
      kind: "none",
    });
  });

  it("con usuario en login o registro redirige al dashboard sin next", () => {
    expect(resolveAuthRedirect("/login", "?next=/x", true)).toEqual({
      kind: "redirect",
      pathname: DASHBOARD_PATH,
    });
    expect(resolveAuthRedirect("/registro", "", true)).toEqual({
      kind: "redirect",
      pathname: DASHBOARD_PATH,
    });
  });

  it("con usuario en rutas privadas o públicas no redirige", () => {
    expect(resolveAuthRedirect("/dashboard", "", true)).toEqual({
      kind: "none",
    });
    expect(resolveAuthRedirect("/", "", true)).toEqual({ kind: "none" });
  });
});
