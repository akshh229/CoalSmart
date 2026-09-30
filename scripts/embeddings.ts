import { createClient } from "@supabase/supabase-js";
import { createSample } from "../src/lib/sample";
import {
  embed,
  embeddingModel,
  modelConfigured,
} from "../src/lib/model-provider";
if (
  !process.env.SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  !modelConfigured()
)
  throw new Error("Set Supabase and AI provider variables first.");
const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const { data: existing, error } = await client
  .from("chunks")
  .select("id,embedding_model")
  .not("embedding", "is", null);
if (error)
  throw new Error(
    "Could not read chunks. Apply both migrations and seed first.",
  );
const pending = createSample().chunks.filter(
  (c) =>
    !existing.some(
      (e) => e.id === c.id && e.embedding_model === embeddingModel(),
    ),
);
for (const chunk of pending) {
  const embedding = await embed(chunk.text);
  const { error } = await client
    .from("chunks")
    .update({ embedding, embedding_model: embeddingModel() })
    .eq("id", chunk.id);
  if (error) throw new Error("Embedding update failed.");
}
console.log(
  `${pending.length} new chunk embeddings saved using ${embeddingModel()}.`,
);
