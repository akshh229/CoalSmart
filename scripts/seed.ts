import { createClient } from "@supabase/supabase-js";
import { createSample } from "../src/lib/sample";
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Set Supabase variables in .env.local first.");
const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const { data, error } = await client.rpc("seed_demo", {
  seed_data: createSample(),
});
if (error)
  throw new Error(
    "Seed failed. Apply supabase/migrations/001_coalsmart.sql first.",
  );
console.log(
  data
    ? "Sample dataset seeded."
    : "Sample dataset already exists; existing reviews preserved.",
);
