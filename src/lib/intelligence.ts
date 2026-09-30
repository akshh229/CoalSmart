import type {
  Calculation,
  Conflict,
  Dataset,
  Fact,
  Metric,
  Report,
} from "./types";
import { metricLabel } from "./types";
export function reportFingerprint(
  data: Dataset,
  mineId: string,
  start: number,
  end: number,
) {
  const relevant = (x: { mineId: string; year: number }) =>
    x.mineId === mineId && x.year >= start && x.year <= end;
  return JSON.stringify({
    facts: data.facts
      .filter(relevant)
      .map((f) => [f.id, f.version, f.value, f.unit, f.status])
      .sort(),
    conflicts: data.conflicts
      .filter(relevant)
      .map((c) => [c.id, c.version, c.selectedFactId])
      .sort(),
  });
}
export function reportStale(data: Dataset, report: Report) {
  return report.evidenceFingerprint
    ? report.evidenceFingerprint !==
        reportFingerprint(data, report.mineId, report.startYear, report.endYear)
    : report.revision !== data.revision;
}

export function normalize(
  value: number,
  unit: string,
  metric: Metric,
): { value: number; unit: string } {
  if (!Number.isFinite(value) || value < 0)
    throw new Error("Value must be a finite non-negative number.");
  const factors =
    metric === "overburden"
      ? { "Mm³": 1, "m³": 0.000001, "thousand m³": 0.001 }
      : { Mt: 1, tonnes: 0.000001, kt: 0.001 };
  const factor = factors[unit as keyof typeof factors];
  if (factor === undefined)
    throw new Error("Unsupported unit for this metric.");
  return {
    value: Math.round(value * factor * 1e6) / 1e6,
    unit: metric === "overburden" ? "Mm³" : "Mt",
  };
}
export const factKey = (
  f: Pick<Fact, "mineId" | "year" | "metric" | "category">,
) => `${f.mineId}:${f.year}:${f.metric}:${f.category}`;
export function differs(a: number, b: number) {
  return (
    Math.abs(a - b) > Math.max(Math.abs(a), Math.abs(b), 1e-12) * 0.01 + 1e-10
  );
}
export function detectConflicts(
  facts: Fact[],
  previous: Conflict[] = [],
): Conflict[] {
  const groups = new Map<string, Fact[]>();
  facts
    .filter((f) => f.status !== "rejected")
    .forEach((f) =>
      groups.set(factKey(f), [...(groups.get(factKey(f)) ?? []), f]),
    );
  return [...groups.entries()]
    .filter(([, fs]) => fs.some((f) => differs(f.value, fs[0].value)))
    .map(([key, fs]) => {
      const old = previous.find((c) => c.id === key);
      const ids = fs.map((f) => f.id).sort();
      const unchanged = old && old.factIds.slice().sort().join() === ids.join();
      return {
        id: key,
        mineId: fs[0].mineId,
        year: fs[0].year,
        metric: fs[0].metric,
        category: fs[0].category,
        factIds: ids,
        selectedFactId:
          unchanged && ids.includes(old.selectedFactId ?? "")
            ? old.selectedFactId
            : null,
        version: old?.version ?? 1,
      };
    });
}
export function canonical(
  data: Dataset,
  mineId: string,
  year: number,
  metric: Metric,
): Fact | null {
  const fs = data.facts.filter(
    (f) =>
      f.mineId === mineId &&
      f.year === year &&
      f.metric === metric &&
      f.status !== "rejected",
  );
  if (!fs.length) return null;
  const conflict = data.conflicts.find(
    (c) => c.mineId === mineId && c.year === year && c.metric === metric,
  );
  if (conflict)
    return conflict.selectedFactId
      ? (fs.find((f) => f.id === conflict.selectedFactId) ?? null)
      : null;
  return (
    fs.find((f) => f.status === "approved" || f.status === "corrected") ?? fs[0]
  );
}
export function timeline(
  data: Dataset,
  mineId: string,
  metric: Metric,
  start = 2020,
  end = 2024,
) {
  return Array.from({ length: end - start + 1 }, (_, i) => {
    const year = start + i;
    const fact = canonical(data, mineId, year, metric);
    const target = canonical(data, mineId, year, "target");
    return {
      year,
      value: fact?.value ?? null,
      evidenceId: fact?.evidenceId,
      status: fact?.status,
      target: target?.value ?? null,
      targetEvidenceId: target?.evidenceId,
      conflict: data.conflicts.some(
        (c) =>
          c.mineId === mineId &&
          c.year === year &&
          c.metric === metric &&
          !c.selectedFactId,
      ),
    };
  });
}
export function latest(data: Dataset, mineId: string, metric: Metric) {
  const years = [
    ...new Set(
      data.facts
        .filter(
          (f) =>
            f.mineId === mineId &&
            f.metric === metric &&
            f.status !== "rejected",
        )
        .map((f) => f.year),
    ),
  ].sort((a, b) => b - a);
  return years.length
    ? { year: years[0], fact: canonical(data, mineId, years[0], metric) }
    : null;
}
export function percentageChange(start: number, end: number): number | null {
  return start === 0 ? null : Math.round(((end - start) / start) * 10000) / 100;
}
export function calculations(
  data: Dataset,
  mineId: string,
  start: number,
  end: number,
  metric: Metric,
): Calculation[] {
  const facts = timeline(data, mineId, metric, start, end).flatMap((p) =>
    p.evidenceId && p.value !== null
      ? [
          {
            label: `${metricLabel[metric]} · ${p.year}`,
            value: `${p.value.toFixed(2)} ${metric === "overburden" ? "Mm³" : "Mt"}`,
            evidenceIds: [p.evidenceId],
          },
        ]
      : [],
  );
  const a = canonical(data, mineId, start, metric),
    b = canonical(data, mineId, end, metric);
  if (a && b && start !== end) {
    const change = percentageChange(a.value, b.value);
    facts.push({
      label: `Change · ${start}–${end}`,
      value:
        change === null
          ? "Undefined (zero baseline)"
          : `${change > 0 ? "+" : ""}${change.toFixed(2)}%`,
      evidenceIds: [a.evidenceId, b.evidenceId],
    });
  }
  return facts;
}
export function validCitations(ids: string[], allowed: Set<string>) {
  return ids.length > 0 && ids.every((id) => allowed.has(id));
}
