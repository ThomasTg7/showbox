import { describe, expect, it } from "vitest";
import { requestHost, routeByHost } from "./admin-routing";

const HOSTS = { adminHost: "admin.openfightlatam.cl", adminOrigin: "https://admin.openfightlatam.cl" };

function route(host: string, pathname: string, hasSession = false, search = "") {
  return routeByHost({ host, pathname, search, hasSession }, HOSTS);
}

describe("routeByHost", () => {
  it("serves the admin folder at the root of the admin subdomain", () => {
    expect(route("admin.openfightlatam.cl", "/", true)).toEqual({ kind: "rewrite", pathname: "/admin" });
    expect(route("admin.openfightlatam.cl", "/boxeadores/123", true)).toEqual({ kind: "rewrite", pathname: "/admin/boxeadores/123" });
  });

  it("sends visitors without a session cookie to the login page, except on the auth pages", () => {
    expect(route("admin.openfightlatam.cl", "/boxeadores")).toEqual({ kind: "redirect", url: "https://admin.openfightlatam.cl/login" });
    expect(route("admin.openfightlatam.cl", "/login")).toEqual({ kind: "rewrite", pathname: "/admin/login" });
    expect(route("admin.openfightlatam.cl", "/recuperar")).toEqual({ kind: "rewrite", pathname: "/admin/recuperar" });
    expect(route("admin.openfightlatam.cl", "/restablecer")).toEqual({ kind: "rewrite", pathname: "/admin/restablecer" });
  });

  it("lets a server action without a session through, so requireAdmin can answer with a redirect the client follows", () => {
    expect(routeByHost({ host: "admin.openfightlatam.cl", pathname: "/usuarios", search: "", hasSession: false, isServerAction: true }, HOSTS)).toEqual({
      kind: "rewrite",
      pathname: "/admin/usuarios",
    });
  });

  it("drops a leftover /admin prefix on the admin subdomain (old bookmarks), keeping the query", () => {
    expect(route("admin.openfightlatam.cl", "/admin/boxeadores", true, "?q=vera")).toEqual({
      kind: "redirect",
      url: "https://admin.openfightlatam.cl/boxeadores?q=vera",
    });
    expect(route("admin.openfightlatam.cl", "/admin", true)).toEqual({ kind: "redirect", url: "https://admin.openfightlatam.cl/" });
  });

  it("moves /admin on the public site to the admin subdomain", () => {
    expect(route("openfightlatam.cl", "/admin/login", false, "?error=x")).toEqual({
      kind: "redirect",
      url: "https://admin.openfightlatam.cl/login?error=x",
    });
    expect(route("openfightlatam.cl", "/administrador")).toEqual({ kind: "next" });
  });

  it("leaves public pages alone", () => {
    expect(route("openfightlatam.cl", "/boxeadores/bryan-cevallos")).toEqual({ kind: "next" });
    expect(route("openfightlatam.cl", "/")).toEqual({ kind: "next" });
  });

  it("compares the host with its port (development)", () => {
    const dev = { adminHost: "admin.localhost:3000", adminOrigin: "http://admin.localhost:3000" };
    expect(routeByHost({ host: "admin.localhost:3000", pathname: "/", search: "", hasSession: true }, dev)).toEqual({
      kind: "rewrite",
      pathname: "/admin",
    });
    expect(routeByHost({ host: "localhost:3000", pathname: "/", search: "", hasSession: true }, dev)).toEqual({ kind: "next" });
  });
});

describe("requestHost", () => {
  const headers = (values: Record<string, string>) => ({ get: (name: string) => values[name.toLowerCase()] ?? null });

  it("prefers the host the browser asked for when a proxy sits in front", () => {
    expect(requestHost(headers({ "x-forwarded-host": "admin.openfightlatam.cl", host: "internal:3000" }))).toBe("admin.openfightlatam.cl");
  });

  it("falls back to the Host header, then to the given default", () => {
    expect(requestHost(headers({ host: "openfightlatam.cl" }))).toBe("openfightlatam.cl");
    expect(requestHost(headers({}), "localhost:3000")).toBe("localhost:3000");
  });
});
