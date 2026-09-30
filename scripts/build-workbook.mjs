import fs from "node:fs/promises";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";
const root = process.env.COALSMART_ROOT || process.cwd();
const data = JSON.parse(
  await fs.readFile(`${root}/fixtures/sample.json`, "utf8"),
);
const doc = data.documents.find((d) => d.format === "Excel");
const facts = data.facts.filter(
  (f) => f.mineId === doc.mineId && f.year === 2024,
);
const wb = Workbook.create();
const sheet = wb.worksheets.add("Annual return");
sheet.showGridLines = false;
sheet.getRange("A1:F16").format.font = {
  name: "Arial",
  size: 10,
  color: "#435C50",
};
sheet.getRange("A1:F16").format.verticalAlignment = "center";
sheet.getRange("A1:F16").format.rowHeight = 25;
sheet.getRange("A1:F16").format.columnWidth = 22;
sheet.getRange("A1:A16").format.columnWidth = 10;
sheet.getRange("B1:B16").format.columnWidth = 29;
sheet.getRange("B2").values = [["Palash North annual return 2024"]];
sheet.getRange("B2").format.font = {
  name: "Arial",
  size: 14,
  bold: true,
  color: "#254A3A",
};
sheet.getRange("B3").values = [
  ["Synthetic source data. Calendar-year observations."],
];
sheet.getRange("B4").values = [
  ["Reserves are recoverable balances at 31 December."],
];
sheet.getRange("B3:B4").format.font = {
  name: "Arial",
  size: 10,
  color: "#8B9C89",
  italic: true,
};
sheet.getRange("A6:F6").values = [
  [
    "Year",
    "Mine",
    "Production (Mt)",
    "Reserves (Mt)",
    "Overburden (Mm3)",
    "Target (Mt)",
  ],
];
sheet.getRange("A6:F6").format = {
  fill: "#315844",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  rowHeight: 30,
};
sheet.getRange("A7:F7").values = [
  [
    2024,
    "Palash North OCP",
    ...["production", "reserves", "overburden", "target"].map(
      (metric) => facts.find((f) => f.metric === metric).value,
    ),
  ],
];
sheet.getRange("C7:F7").setNumberFormat("0.00");
sheet.getRange("A7:F7").format.fill = "#F2F6ED";
sheet.getRange("B10").values = [["Documented operational observations"]];
sheet.getRange("B10").format.font = {
  name: "Arial",
  size: 11,
  bold: true,
  color: "#315844",
};
sheet.getRange("B12").values = [
  [
    data.evidence.find((e) => e.documentId === doc.id && e.id.endsWith("issue"))
      .excerpt,
  ],
];
sheet.getRange("B14").values = [
  ["Reported conditions do not establish causation."],
];
sheet.getRange("B16").values = [
  ["Source: CoalSMART synthetic sample dataset."],
];
wb.recalculate();
const checks = await wb.inspect({
  kind: "table",
  range: "Annual return!A6:F7",
  include: "values,formulas",
  tableMaxRows: 2,
  tableMaxCols: 6,
});
console.log(checks.ndjson);
const preview = await wb.render({
  sheetName: "Annual return",
  range: "A1:F17",
  scale: 1.5,
  format: "png",
});
await fs.writeFile(
  `${root}/public/samples/previews/${doc.id}-1.png`,
  new Uint8Array(await preview.arrayBuffer()),
);
const output = await SpreadsheetFile.exportXlsx(wb);
await output.save(`${root}/public/samples/${doc.filename}`);
console.log("Sample workbook and exact source preview exported.");
