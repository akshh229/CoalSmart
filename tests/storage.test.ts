import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { createSample } from "../src/lib/sample";
const configured = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
describe.skipIf(!configured)("Supabase integration", () => {
  it("persists the fixture and protects concurrent commits", async () => {
    const db = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    const { data: state, error } = await db
      .from("demo_state")
      .select("data,version")
      .eq("id", "sample")
      .single();
    expect(error).toBeNull();
    expect(state?.data.documents).toHaveLength(20);
    const result = await db.rpc("commit_demo", {
      expected_version: state!.version - 1,
      next_data: createSample(),
    });
    expect(result.error).toBeNull();
    expect(result.data).toBe(false);
  });
  it("keeps structured facts and evidence projections in sync", async () => {
    const db = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    const { count, error } = await db
      .from("facts")
      .select("*", { count: "exact", head: true });
    expect(error).toBeNull();
    expect(count).toBe(102);
    const { count: evidenceCount } = await db
      .from("evidence")
      .select("*", { count: "exact", head: true });
    expect(evidenceCount).toBe(122);
  });
  it("enforces atomic IP and global AI budgets", async () => {
    const db = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    const id = randomUUID(),
      day = `test-day-${id}`,
      ip = `test-ip-${id}`;
    const args = {
      ip_bucket: ip,
      day_bucket: day,
      minute_limit: 2,
      day_limit: 3,
    };
    const results = await Promise.all(
      Array.from({ length: 4 }, () => db.rpc("consume_ai", args)),
    );
    expect(results.every((r) => !r.error)).toBe(true);
    expect(results.filter((r) => r.data === true)).toHaveLength(2);
    const third = await db.rpc("consume_ai", {
      ...args,
      ip_bucket: `other-${id}`,
    });
    expect(third.data).toBe(true);
    const fourth = await db.rpc("consume_ai", {
      ...args,
      ip_bucket: `third-${id}`,
    });
    expect(fourth.data).toBe(false);
    await db
      .from("ai_usage")
      .delete()
      .in("bucket", [ip, day, `other-${id}`]);
  });
});
