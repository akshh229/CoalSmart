import { describe, expect, it } from "vitest";
import { assertOrigin } from "../src/lib/request-origin";

function request(origin: string, extra: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/questions", {
    method: "POST",
    headers: { host: "127.0.0.1:3000", origin, ...extra },
  });
}

describe("browser request origins", () => {
  it("accepts the browser's host when Next.js uses an internal localhost URL", () => {
    expect(() => assertOrigin(request("http://127.0.0.1:3000"))).not.toThrow();
  });

  it.each([
    "http://localhost:3000",
    "http://127.0.0.1:4000",
    "https://127.0.0.1:3000",
    "https://untrusted.example",
    "null",
    "invalid-origin",
  ])("rejects a different or invalid browser origin: %s", (origin) => {
    expect(() => assertOrigin(request(origin))).toThrow(
      "Cross-origin changes are not allowed.",
    );
  });

  it("does not accept a forged forwarded host", () => {
    expect(() =>
      assertOrigin(
        request("https://untrusted.example", {
          "x-forwarded-host": "untrusted.example",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toThrow("Cross-origin changes are not allowed.");
  });

  it("accepts an HTTPS deployment's matching public host", () => {
    expect(() =>
      assertOrigin(
        new Request("https://internal.example/api/questions", {
          headers: {
            host: "coalsmart.vercel.app",
            origin: "https://coalsmart.vercel.app",
          },
        }),
      ),
    ).not.toThrow();
  });

  it("supports non-browser clients without an Origin header", () => {
    expect(() =>
      assertOrigin(new Request("http://localhost:3000/api/questions")),
    ).not.toThrow();
  });
});
