import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import type { Answer, Snapshot } from "../src/lib/types";
const base = process.env.EVAL_BASE_URL || "http://localhost:3000";
const data: Snapshot = await (await fetch(`${base}/api/data`)).json();
assert(
  data.connected && data.aiAvailable,
  "Configure shared storage and live AI before evaluation.",
);
const cases = [
  {
    kind: "numerical",
    question: "How did production change from 2020 to 2024?",
  },
  {
    kind: "descriptive",
    question: "What operational issues were documented in 2024?",
  },
  {
    kind: "combined",
    question:
      "How did production change from 2020 to 2024, and what operational factors are documented?",
  },
  { kind: "missing", question: "What was production in 2025?" },
  { kind: "conflict", question: "What were recoverable reserves in 2022?" },
];
const results = [];
for (const item of cases) {
  const started = Date.now();
  const response = await fetch(`${base}/api/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mineId: "m01", question: item.question }),
  });
  const answer: Answer & { error?: string } = await response.json();
  assert(response.ok, answer.error || "Live request failed.");
  const ids = [...answer.blocks, ...answer.calculations].flatMap(
    (b) => b.evidenceIds,
  );
  assert(
    ids.every((id) =>
      data.evidence.some(
        (e) =>
          e.id === id &&
          data.documents.some(
            (d) => d.id === e.documentId && d.mineId === "m01",
          ),
      ),
    ),
    "Invalid citation context.",
  );
  if (["numerical", "combined"].includes(item.kind))
    assert(
      answer.calculations.some((c) => c.value.includes("-24.53")),
      "Trend differs from ground truth.",
    );
  if (["descriptive", "combined"].includes(item.kind))
    assert(
      answer.blocks.some((b) => b.evidenceIds.length),
      "Expected supported operational observations.",
    );
  if (item.kind === "missing")
    assert(
      answer.calculations.length === 0 &&
        answer.blocks.some((b) => /insufficient evidence/i.test(b.text)),
    );
  if (item.kind === "conflict")
    assert(
      answer.calculations.some(
        (c) => c.value.includes("126.00") && c.value.includes("142.00"),
      ),
      "Reset the baseline conflict before evaluation.",
    );
  results.push({ ...item, durationMs: Date.now() - started, answer });
  console.log(`${item.kind}: passed`);
}
await mkdir("tmp", { recursive: true });
await writeFile(
  "tmp/evaluation.json",
  JSON.stringify(
    { base, evaluatedAt: new Date().toISOString(), results },
    null,
    2,
  ),
);
