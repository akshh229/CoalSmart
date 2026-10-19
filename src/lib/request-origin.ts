import { AppError } from "./review";

export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  let matches = false;
  try {
    const source = new URL(origin);
    const target = new URL(request.url);
    // Next.js can use localhost internally even when the browser uses 127.0.0.1.
    const host = request.headers.get("host") ?? target.host;
    matches =
      source.origin === origin &&
      (source.protocol === "http:" || source.protocol === "https:") &&
      source.protocol === target.protocol &&
      source.host === host.toLowerCase();
  } catch {
    // Malformed and opaque origins are rejected below.
  }

  if (!matches)
    throw new AppError("Cross-origin changes are not allowed.", 403);
}
