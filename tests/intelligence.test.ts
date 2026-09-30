import { describe, it, expect } from "vitest";
import {
  calculations,
  canonical,
  detectConflicts,
  differs,
  latest,
  normalize,
  percentageChange,
  timeline,
  validCitations,
  reportFingerprint,
  reportStale,
} from "../src/lib/intelligence";
import { createSample } from "../src/lib/sample";
import { applyMutation } from "../src/lib/review";
import type { Report } from "../src/lib/types";
describe("sample evidence and mining intelligence", () => {
  it("stales reports only when their mine and period change", () => {
    const data = createSample();
    const report: Report = {
      id: "r",
      mineId: "m01",
      startYear: 2023,
      endYear: 2024,
      createdAt: "",
      status: "draft",
      revision: data.revision,
      version: 1,
      sections: [],
      evidenceFingerprint: reportFingerprint(data, "m01", 2023, 2024),
    };
    const unrelated = data.facts.find((f) => f.mineId === "m02")!;
    const changed = applyMutation(
      data,
      {
        kind: "review",
        id: unrelated.id,
        expectedVersion: unrelated.version,
        action: "approve",
      },
      "test",
    );
    expect(reportStale(changed, report)).toBe(false);
    const relevant = changed.facts.find(
      (f) => f.mineId === "m01" && f.year === 2024,
    )!;
    const edited = applyMutation(
      changed,
      {
        kind: "review",
        id: relevant.id,
        expectedVersion: relevant.version,
        action: "correct",
        value: 4.2,
        unit: "Mt",
      },
      "test",
    );
    expect(reportStale(edited, report)).toBe(true);
  });
  it("contains twenty documents, five mines, and three ground-truth conflicts", () => {
    const d = createSample();
    expect(d.documents).toHaveLength(20);
    expect(d.mines).toHaveLength(5);
    expect(d.conflicts).toHaveLength(3);
    expect(d.documents.some((x) => x.format === "Scanned PDF")).toBe(true);
    expect(d.documents.some((x) => x.format === "Excel")).toBe(true);
  });
  it("links every fact and chunk to a real sample evidence record", () => {
    const d = createSample();
    for (const f of [...d.facts, ...d.chunks])
      expect(
        d.evidence.some(
          (e) =>
            e.id === f.evidenceId &&
            d.documents.some((doc) => doc.id === e.documentId),
        ),
      ).toBe(true);
  });
  it("normalizes mass and volume while retaining precision", () => {
    expect(normalize(4820, "kt", "production")).toEqual({
      value: 4.82,
      unit: "Mt",
    });
    expect(normalize(126000000, "tonnes", "reserves").value).toBe(126);
    expect(normalize(12000000, "m³", "overburden")).toEqual({
      value: 12,
      unit: "Mm³",
    });
  });
  it("rejects negative, non-finite and dimensionally incompatible values", () => {
    expect(() => normalize(-1, "Mt", "production")).toThrow();
    expect(() => normalize(Infinity, "Mt", "production")).toThrow();
    expect(() => normalize(2, "Mt", "overburden")).toThrow();
  });
  it("flags differences strictly above one percent", () => {
    expect(differs(100, 101)).toBe(false);
    expect(differs(100, 102)).toBe(true);
    expect(differs(0, 0)).toBe(false);
    expect(differs(0, 1)).toBe(true);
  });
  it("does not compare different mines, periods or reserve categories", () => {
    const d = createSample();
    const a = d.facts[0];
    expect(
      detectConflicts([a, { ...a, id: "different", mineId: "m02", value: 99 }]),
    ).toHaveLength(0);
    expect(
      detectConflicts([a, { ...a, id: "different", year: 2025, value: 99 }]),
    ).toHaveLength(0);
    expect(
      detectConflicts([
        a,
        { ...a, id: "different", category: "geological", value: 99 },
      ]),
    ).toHaveLength(0);
  });
  it("returns no canonical value for an unresolved conflict", () => {
    expect(canonical(createSample(), "m01", 2022, "reserves")).toBeNull();
  });
  it("selects an explicitly resolved fact over approved alternatives", () => {
    const d = createSample(),
      c = d.conflicts[0];
    const selected = c.factIds[1];
    const next = applyMutation(
      d,
      {
        kind: "resolve",
        id: c.id,
        expectedVersion: c.version,
        selectedFactId: selected,
      },
      "test",
    );
    expect(canonical(next, c.mineId, c.year, c.metric)?.id).toBe(selected);
  });
  it("preserves missing years as null rather than zero", () => {
    const row = timeline(createSample(), "m02", "production").find(
      (p) => p.year === 2022,
    );
    expect(row?.value).toBeNull();
    expect(row?.evidenceId).toBeUndefined();
  });
  it("calculates the hero decline using exact structured values", () => {
    expect(percentageChange(5.3, 4)).toBe(-24.53);
    const cs = calculations(createSample(), "m01", 2020, 2024, "production");
    expect(cs.at(-1)?.value).toBe("-24.53%");
    expect(cs.at(-1)?.evidenceIds).toHaveLength(2);
  });
  it("exposes a zero baseline as undefined", () => {
    expect(percentageChange(0, 2)).toBeNull();
  });
  it("does not silently fall back to an older year when the newest year is disputed", () => {
    const d = createSample();
    const f = d.facts.find(
      (f) => f.mineId === "m01" && f.year === 2024 && f.metric === "production",
    )!;
    d.facts.push({ ...f, id: "alternate", value: 6 });
    d.conflicts = detectConflicts(d.facts);
    expect(latest(d, "m01", "production")).toEqual({ year: 2024, fact: null });
  });
  it("rejects empty and invented evidence citations", () => {
    const ids = new Set(["e01"]);
    expect(validCitations(["e01"], ids)).toBe(true);
    expect(validCitations([], ids)).toBe(false);
    expect(validCitations(["made-up"], ids)).toBe(false);
  });
});
describe("shared review behavior", () => {
  it("keeps corrections separate from the original extracted value", () => {
    const d = createSample(),
      f = d.facts[0];
    const next = applyMutation(
      d,
      {
        kind: "review",
        id: f.id,
        expectedVersion: f.version,
        action: "correct",
        value: 4900,
        unit: "kt",
      },
      "test-session",
    );
    const corrected = next.facts.find((x) => x.id === f.id)!;
    expect(corrected.value).toBe(4.9);
    expect(corrected.originalValue).toBe(f.originalValue);
    expect(corrected.evidenceId).toBe(f.evidenceId);
    expect(next.events[0].sessionId).toBe("test-session");
    expect(next.revision).toBe(d.revision + 1);
  });
  it("rejects stale edits without changing the source dataset", () => {
    const d = createSample();
    expect(() =>
      applyMutation(
        d,
        {
          kind: "review",
          id: d.facts[0].id,
          expectedVersion: 9,
          action: "approve",
        },
        "test",
      ),
    ).toThrow("changed");
    expect(d.events).toHaveLength(0);
  });
  it("only reviews seeded sample records", () => {
    const d = createSample();
    expect(() =>
      applyMutation(
        d,
        {
          kind: "review",
          id: "unknown",
          expectedVersion: 1,
          action: "approve",
        },
        "test",
      ),
    ).toThrow("seeded");
  });
  it("rejection removes a competing value and clears its conflict", () => {
    const d = createSample(),
      c = d.conflicts[0],
      f = d.facts.find((f) => f.id === c.factIds[1])!;
    const next = applyMutation(
      d,
      {
        kind: "review",
        id: f.id,
        expectedVersion: f.version,
        action: "reject",
      },
      "test",
    );
    expect(next.conflicts.some((x) => x.id === c.id)).toBe(false);
    expect(canonical(next, c.mineId, c.year, c.metric)).not.toBeNull();
  });
  it("clears a previous conflict decision when its evidence changes", () => {
    let d = createSample();
    const c = d.conflicts[0];
    d = applyMutation(
      d,
      {
        kind: "resolve",
        id: c.id,
        expectedVersion: c.version,
        selectedFactId: c.factIds[0],
      },
      "test",
    );
    const f = d.facts.find((f) => f.id === c.factIds[0])!;
    d = applyMutation(
      d,
      {
        kind: "review",
        id: f.id,
        expectedVersion: f.version,
        action: "correct",
        value: 110,
        unit: "Mt",
      },
      "test",
    );
    expect(d.conflicts.find((x) => x.id === c.id)?.selectedFactId).toBeNull();
  });
  it("importing twice preserves facts, reviews, and revision", () => {
    const d = createSample();
    expect(
      applyMutation(
        applyMutation(d, { kind: "import" }, "test"),
        { kind: "import" },
        "test",
      ),
    ).toEqual(d);
  });
  it("preserves report snapshots but prevents stale approval", () => {
    let d = createSample();
    const report: Report = {
      id: "test-report",
      mineId: "m01",
      startYear: 2020,
      endYear: 2024,
      createdAt: "2026-09-30T00:00:00Z",
      revision: d.revision,
      version: 1,
      status: "draft",
      sections: [],
    };
    d = applyMutation(d, { kind: "report", report }, "test");
    d = applyMutation(
      d,
      {
        kind: "review",
        id: d.facts[0].id,
        expectedVersion: 1,
        action: "correct",
        value: 4.9,
        unit: "Mt",
      },
      "test",
    );
    expect(d.reports[0].revision).toBe(1);
    expect(() =>
      applyMutation(
        d,
        { kind: "approve-report", id: report.id, expectedVersion: 1 },
        "test",
      ),
    ).toThrow("stale");
  });
  it("rejects reports generated against stale facts", () => {
    const d = createSample();
    expect(() =>
      applyMutation(
        d,
        {
          kind: "report",
          report: {
            id: "r",
            mineId: "m01",
            startYear: 2020,
            endYear: 2024,
            createdAt: "",
            revision: 0,
            version: 1,
            status: "draft",
            sections: [],
          },
        },
        "test",
      ),
    ).toThrow("changed during");
  });
  it("reset restores baseline data and increments record versions", () => {
    const d = createSample();
    const changed = applyMutation(
      d,
      {
        kind: "review",
        id: d.facts[0].id,
        expectedVersion: 1,
        action: "correct",
        value: 4.8,
        unit: "Mt",
      },
      "test",
    );
    const reset = applyMutation(
      changed,
      { kind: "reset", expectedRevision: changed.revision },
      "test",
    );
    expect(reset.facts[0].value).toBe(d.facts[0].value);
    expect(reset.facts[0].version).toBe(3);
    expect(reset.events).toHaveLength(2);
    expect(reset.revision).toBe(3);
  });
  it("approving a report does not stale its own snapshot", () => {
    let d = createSample();
    const report: Report = {
      id: "r",
      mineId: "m01",
      startYear: 2020,
      endYear: 2024,
      createdAt: "",
      revision: d.revision,
      version: 1,
      status: "draft",
      sections: [],
    };
    d = applyMutation(d, { kind: "report", report }, "test");
    d = applyMutation(
      d,
      { kind: "approve-report", id: "r", expectedVersion: 1 },
      "test",
    );
    expect(d.reports[0].status).toBe("approved");
    expect(d.revision).toBe(d.reports[0].revision);
  });
});
