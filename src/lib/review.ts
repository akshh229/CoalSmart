import { randomUUID } from "node:crypto";
import {
  detectConflicts,
  factKey,
  normalize,
  reportStale,
} from "./intelligence";
import { createSample } from "./sample";
import type { Dataset, Report } from "./types";

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export type Mutation =
  | {
      kind: "review";
      id: string;
      expectedVersion: number;
      action: "approve" | "reject" | "correct";
      value?: number;
      unit?: string;
    }
  | {
      kind: "resolve";
      id: string;
      expectedVersion: number;
      selectedFactId: string | null;
    }
  | { kind: "reset"; expectedRevision: number }
  | { kind: "import" }
  | { kind: "report"; report: Report }
  | { kind: "approve-report"; id: string; expectedVersion: number };
const checkVersion = (actual: number, expected: number) => {
  if (actual !== expected)
    throw new AppError(
      "This record changed in another session. Refresh and try again.",
      409,
    );
};
export function applyMutation(
  current: Dataset,
  input: Mutation,
  sessionId: string,
): Dataset {
  const data = structuredClone(current);
  let before: unknown = null;
  let after: unknown = null;
  let recordId: string = "dataset";
  if (input.kind === "review") {
    if (!createSample().facts.some((f) => f.id === input.id))
      throw new AppError("Only seeded sample facts may be reviewed.");
    const f = data.facts.find((f) => f.id === input.id);
    if (!f) throw new AppError("Fact not found.", 404);
    checkVersion(f.version, input.expectedVersion);
    before = structuredClone(f);
    recordId = f.id;
    if (input.action === "correct") {
      if (input.value === undefined || !input.unit)
        throw new AppError("A corrected value and unit are required.");
      try {
        Object.assign(f, normalize(input.value, input.unit, f.metric));
      } catch {
        throw new AppError("Choose a supported unit for this metric.");
      }
      f.status = "corrected";
    } else f.status = input.action === "approve" ? "approved" : "rejected";
    f.version++;
    after = structuredClone(f);
    // Any review of competing evidence requires an explicit new conflict decision.
    const previous = data.conflicts.map((c) =>
      c.id === factKey(f)
        ? { ...c, selectedFactId: null, version: c.version + 1 }
        : c,
    );
    data.conflicts = detectConflicts(data.facts, previous);
    data.revision++;
  } else if (input.kind === "resolve") {
    const c = data.conflicts.find((c) => c.id === input.id);
    if (!c) throw new AppError("Conflict not found.", 404);
    checkVersion(c.version, input.expectedVersion);
    if (
      input.selectedFactId !== null &&
      !c.factIds.includes(input.selectedFactId)
    )
      throw new AppError("Select a fact from this conflict.");
    before = structuredClone(c);
    c.selectedFactId = input.selectedFactId;
    c.version++;
    after = structuredClone(c);
    recordId = c.id;
    data.revision++;
  } else if (input.kind === "reset") {
    checkVersion(data.revision, input.expectedRevision);
    const baseline = createSample();
    baseline.revision = data.revision + 1;
    baseline.reports = data.reports;
    baseline.events = data.events;
    baseline.facts = baseline.facts.map((f) => ({
      ...f,
      version: (data.facts.find((old) => old.id === f.id)?.version ?? 0) + 1,
    }));
    baseline.conflicts = baseline.conflicts.map((c) => ({
      ...c,
      version:
        (data.conflicts.find((old) => old.id === c.id)?.version ?? 0) + 1,
    }));
    Object.assign(data, baseline);
    after = { revision: data.revision };
  } else if (input.kind === "import") {
    // The initial seed is the sample pack. Imports are deliberately idempotent.
    return data;
  } else if (input.kind === "report") {
    if (reportStale(data, input.report))
      throw new AppError(
        "Facts changed during report generation. Generate a new brief.",
        409,
      );
    data.reports.unshift(input.report);
    after = input.report;
    recordId = input.report.id;
  } else {
    const report = data.reports.find((r) => r.id === input.id);
    if (!report) throw new AppError("Report not found.", 404);
    checkVersion(report.version, input.expectedVersion);
    if (reportStale(data, report))
      throw new AppError(
        "This report is stale. Generate a new brief before approving.",
        409,
      );
    before = structuredClone(report);
    report.status = "approved";
    report.version++;
    after = structuredClone(report);
    recordId = report.id;
  }
  data.events.push({
    id: randomUUID(),
    sessionId,
    action: input.kind === "review" ? input.action : input.kind,
    recordId,
    before,
    after,
    at: new Date().toISOString(),
  });
  return data;
}
