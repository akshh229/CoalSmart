import { mkdir, writeFile } from "node:fs/promises";
import { createSample } from "../src/lib/sample";
const data = createSample();
await mkdir("fixtures", { recursive: true });
await mkdir("public/samples/previews", { recursive: true });
await writeFile("fixtures/sample.json", JSON.stringify(data, null, 2));
await writeFile(
  "fixtures/ground-truth.json",
  JSON.stringify(
    {
      description:
        "Synthetic ground truth. Facts cite matching source pages or workbook cells.",
      facts: data.facts.map((f) => ({
        id: f.id,
        mineId: f.mineId,
        year: f.year,
        metric: f.metric,
        value: f.value,
        unit: f.unit,
        evidenceId: f.evidenceId,
      })),
      conflicts: data.conflicts.map((c) => c.id),
      heroProductionChange: -24.53,
    },
    null,
    2,
  ),
);
console.log(
  `${data.documents.length} documents, ${data.facts.length} facts, ${data.conflicts.length} conflicts exported.`,
);
