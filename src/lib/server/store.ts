import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createSample } from "../sample";
import { AppError, applyMutation, type Mutation } from "../review";
import type { Dataset, Snapshot } from "../types";
import { modelConfigured } from "../model-provider";

export const databaseConfigured = () =>
  Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
export const aiConfigured = modelConfigured;
export function database() {
  if (!databaseConfigured())
    throw new AppError(
      "Shared storage is not configured. Add Supabase credentials to enable changes.",
      503,
    );
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function readState(): Promise<{ data: Dataset; version: number }> {
  const { data, error } = await database()
    .from("demo_state")
    .select("data,version")
    .eq("id", "sample")
    .single();
  if (error || !data)
    throw new AppError(
      "Shared storage is unavailable or unseeded. Apply the migration and run npm run seed.",
      503,
    );
  return data as { data: Dataset; version: number };
}
export async function snapshot(): Promise<Snapshot> {
  if (!databaseConfigured())
    return {
      ...createSample(),
      connected: false,
      aiAvailable: aiConfigured(),
      storageError:
        "Read-only preview. Configure Supabase to save shared demo reviews.",
    };
  try {
    const { data } = await readState();
    return { ...data, connected: true, aiAvailable: aiConfigured() };
  } catch (error) {
    return {
      ...createSample(),
      connected: false,
      aiAvailable: aiConfigured(),
      storageError:
        error instanceof Error ? error.message : "Shared storage unavailable.",
    };
  }
}
export async function mutate(input: Mutation, sessionId: string) {
  const current = await readState();
  const updated = applyMutation(current.data, input, sessionId);
  if (input.kind === "import") return updated;
  const { data, error } = await database().rpc("commit_demo", {
    expected_version: current.version,
    next_data: updated,
  });
  if (error) throw new AppError("The shared update failed. Try again.", 503);
  if (!data)
    throw new AppError(
      "Another visitor updated the dataset. Refresh and retry.",
      409,
    );
  return updated;
}
