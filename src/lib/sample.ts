import { detectConflicts, normalize } from "./intelligence";
import type { Dataset, Metric, Mine } from "./types";

const mines: Mine[] = [
  {
    id: "m01",
    name: "Aaranya Open Cast",
    alias: ["Aaranya OCP", "Aaranya Mine"],
    subsidiary: "Eastern Basin Coalfields",
    state: "Jharkhand",
    district: "Dhanbad",
    lat: 23.79,
    lng: 86.43,
    type: "Open cast",
    opened: 1998,
  },
  {
    id: "m02",
    name: "Koyel Valley",
    alias: ["Koyel OCP", "KV Mine"],
    subsidiary: "Eastern Basin Coalfields",
    state: "Jharkhand",
    district: "Ramgarh",
    lat: 23.63,
    lng: 85.52,
    type: "Open cast",
    opened: 2005,
  },
  {
    id: "m03",
    name: "Surya Ridge",
    alias: ["Surya Colliery", "SR OCP"],
    subsidiary: "Central Plateau Coalfields",
    state: "Chhattisgarh",
    district: "Korba",
    lat: 22.35,
    lng: 82.7,
    type: "Open cast",
    opened: 2010,
  },
  {
    id: "m04",
    name: "Mahua Deep",
    alias: ["Mahua UG", "MD Colliery"],
    subsidiary: "Central Plateau Coalfields",
    state: "Madhya Pradesh",
    district: "Singrauli",
    lat: 24.21,
    lng: 82.68,
    type: "Underground",
    opened: 1987,
  },
  {
    id: "m05",
    name: "Palash North",
    alias: ["Palash North OCP", "PN Mine"],
    subsidiary: "Western Range Coalfields",
    state: "Maharashtra",
    district: "Chandrapur",
    lat: 20.02,
    lng: 79.31,
    type: "Open cast",
    opened: 2008,
  },
];
const production = [
  [5.3, 5, 4.7, 4.5, 4.0],
  [3.1, 3.3, 3.4, 3.2, 3.6],
  [6.2, 6.6, 7.1, 7.5, 8.1],
  [2.4, 2.3, 2.1, 2.0, 1.85],
  [4.1, 4.4, 4.8, 5.0, 5.4],
];
const issues = [
  [
    "Drainage work was reported during the monsoon.",
    "Land acquisition delays affected access to the western bench.",
    "Geological disturbance was recorded at the southern seam.",
    "Equipment downtime interrupted excavation schedules.",
  ],
  [
    "Haul-road maintenance was reported.",
    "The production table omits one annual figure.",
    "A revised production return differs from the annual summary.",
    "An additional conveyor was commissioned.",
  ],
  [
    "A new shovel fleet entered service.",
    "Rail siding capacity was increased.",
    "Bench development progressed ahead of schedule.",
    "Additional dispatch capacity was recorded.",
  ],
  [
    "Underground dewatering continued.",
    "The reserve reassessment contains inconsistent values.",
    "Ventilation equipment required maintenance.",
    "A delayed panel transition was reported.",
  ],
  [
    "A dispatch-road extension was completed.",
    "Overburden clearance progressed.",
    "A second handling line was commissioned.",
    "Annual production exceeded the previous year.",
  ],
];
export function createSample(): Dataset {
  const data: Dataset = {
    mines: structuredClone(mines),
    documents: [],
    evidence: [],
    facts: [],
    chunks: [],
    conflicts: [],
    reports: [],
    events: [],
    revision: 1,
  };
  mines.forEach((mine, mi) => {
    [2021, 2022, 2023, 2024].forEach((year, di) => {
      const id = `d${String(mi * 4 + di + 1).padStart(2, "0")}`;
      const format =
        mi === 4 && year === 2024
          ? "Excel"
          : mi === 0 && year === 2023
            ? "Scanned PDF"
            : "PDF";
      data.documents.push({
        id,
        mineId: mine.id,
        title: `${mine.alias[di % mine.alias.length]} · Annual return ${year}`,
        filename: `${mine.id}-annual-${year}.${format === "Excel" ? "xlsx" : "pdf"}`,
        year,
        format,
        status: "prepared",
        pages: format === "Excel" ? 1 : 2,
      });
      const years = year === 2021 ? [2020, 2021] : [year];
      years.forEach((fy, yi) => {
        (
          ["production", "reserves", "overburden", "target"] as Metric[]
        ).forEach((metric, k) => {
          if (mi === 1 && fy === 2022 && metric === "production") return;
          const index = fy - 2020;
          const value =
            metric === "production"
              ? production[mi][index]
              : metric === "reserves"
                ? 135 + mi * 31 - index * (mi === 0 ? 4.5 : 3.2)
                : metric === "overburden"
                  ? 12 + mi * 2 + index * 0.8
                  : production[mi][index] + 0.5;
          const unit =
            metric === "overburden" ? "Mm³" : fy === 2021 ? "kt" : "Mt";
          const original =
            unit === "kt"
              ? Math.round(value * 1000)
              : Math.round(value * 100) / 100;
          const eid = `${id}-${fy}-${metric}`;
          const excerpt = `${mine.alias[di % mine.alias.length]}, calendar year ${fy}: ${metric === "reserves" ? "recoverable reserves at 31 December" : metric} = ${original} ${unit}.`;
          data.evidence.push({
            id: eid,
            documentId: id,
            mineId: mine.id,
            year: fy,
            page: 1,
            ...(format === "Excel"
              ? {
                  sheet: "Annual return",
                  cell: `${String.fromCharCode(67 + k)}${7 + yi}`,
                }
              : {}),
            excerpt,
            preview: `/samples/previews/${id}-1.png`,
          });
          data.facts.push({
            id: `f-${eid}`,
            mineId: mine.id,
            year: fy,
            metric,
            category: metric === "reserves" ? "recoverable" : "annual",
            originalValue: original,
            originalUnit: unit,
            ...normalize(original, unit, metric),
            evidenceId: eid,
            confidence: 0.9 + k * 0.015,
            status: fy <= 2021 ? "approved" : "unreviewed",
            version: 1,
          });
        });
      });
      const eid = `${id}-issue`;
      const issue = issues[mi][di];
      data.evidence.push({
        id: eid,
        documentId: id,
        mineId: mine.id,
        year,
        page: format === "Excel" ? 1 : 2,
        ...(format === "Excel" ? { sheet: "Annual return", cell: "B12" } : {}),
        excerpt: issue,
        preview: `/samples/previews/${id}-${format === "Excel" ? 1 : 2}.png`,
      });
      data.chunks.push({
        id: `ch-${id}`,
        mineId: mine.id,
        year,
        text: `${mine.name}, ${year}. ${issue} These are documented observations; causation has not been established.`,
        evidenceId: eid,
      });
      if (
        (mi === 0 && year === 2023) ||
        (mi === 1 && year === 2024) ||
        (mi === 3 && year === 2023)
      ) {
        const fy = mi === 1 ? 2023 : 2022;
        const metric = mi === 1 ? "production" : "reserves";
        const value = mi === 0 ? 142 : mi === 1 ? 3.48 : 198;
        const eid = `${id}-revised`;
        data.evidence.push({
          id: eid,
          documentId: id,
          mineId: mine.id,
          year: fy,
          page: 1,
          excerpt: `Historical ${fy} ${metric === "reserves" ? "recoverable reserves at 31 December" : "production"}: ${value} Mt. This revised return differs from the earlier annual return.`,
          preview: `/samples/previews/${id}-1.png`,
        });
        data.facts.push({
          id: `f-${eid}`,
          mineId: mine.id,
          year: fy,
          metric,
          category: metric === "reserves" ? "recoverable" : "annual",
          originalValue: value,
          originalUnit: "Mt",
          value,
          unit: "Mt",
          evidenceId: eid,
          confidence: 0.92,
          status: "unreviewed",
          version: 1,
        });
      }
    });
  });
  data.conflicts = detectConflicts(data.facts);
  return data;
}
