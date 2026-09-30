"use client";
import { useState } from "react";
import {
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Pencil,
  RotateCcw,
  Search,
  ShieldCheck,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { metricLabel, type Fact, type Conflict } from "@/lib/types";
import { useData } from "./data-context";
import { Badge, PageTitle, Panel, Source, Empty, MineSelector } from "./common";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
export function Documents() {
  const { data, post, busy, notify } = useData();
  const [query, setQuery] = useState(""),
    [format, setFormat] = useState("all"),
    [loaded, setLoaded] = useState(false);
  const docs = data.documents.filter(
    (d) =>
      (format === "all" || d.format === format) &&
      `${d.title} ${d.filename} ${data.mines.find((m) => m.id === d.mineId)?.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const load = async () => {
    try {
      await post("demo/import", {});
      setLoaded(true);
      notify("Sample pack loaded. Existing facts and reviews were preserved.");
    } catch {}
  };
  return (
    <>
      <PageTitle
        eyebrow="DOCUMENT INTELLIGENCE"
        title="Your evidence library"
        description="Twenty synthetic reports. One traceable knowledge base."
      >
        <Button disabled={!data.connected || busy} onClick={() => void load()}>
          {busy ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
          Load Sample Pack
        </Button>
      </PageTitle>
      <div className="document-banner">
        <span className="document-banner-icon">
          <FilesIcon />
        </span>
        <div>
          <h2>Prepared sample extraction</h2>
          <p>
            Digital PDFs, one scanned report, and one Excel workbook with
            matching facts and source previews.
          </p>
          <span className="small muted">
            Real OCR and arbitrary uploads are planned for a later phase.
          </span>
        </div>
        <Badge tone="teal">
          {loaded ? "Pack loaded" : "20 documents ready"}
        </Badge>
      </div>
      <div className="filter-bar">
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Search documents"
            placeholder="Search mine, filename, or report…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Document format"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        >
          <option value="all">All formats</option>
          <option>PDF</option>
          <option>Scanned PDF</option>
          <option>Excel</option>
        </select>
        <span className="small muted">{docs.length} documents</span>
      </div>
      <Panel>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Mine</th>
                <th>Year</th>
                <th>Format</th>
                <th>Facts</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="document-title">
                      <span
                        className={`document-icon ${d.format === "Excel" ? "excel" : ""}`}
                      >
                        {d.format === "Excel" ? (
                          <FileSpreadsheet size={20} />
                        ) : (
                          <FileText size={20} />
                        )}
                      </span>
                      <div>
                        <strong>{d.title}</strong>
                        <small>{d.filename}</small>
                      </div>
                    </div>
                  </td>
                  <td className="muted">
                    {data.mines.find((m) => m.id === d.mineId)?.name}
                  </td>
                  <td>{d.year}</td>
                  <td>
                    <Badge>{d.format}</Badge>
                  </td>
                  <td>
                    {
                      data.facts.filter(
                        (f) =>
                          data.evidence.find((e) => e.id === f.evidenceId)
                            ?.documentId === d.id,
                      ).length
                    }
                  </td>
                  <td>
                    <div className="actions">
                      <Source
                        id={
                          data.evidence.find((e) => e.documentId === d.id)!.id
                        }
                        compact
                      />
                      <a
                        className="download-button"
                        aria-label={`Download ${d.filename}`}
                        href={`/samples/${d.filename}`}
                        download
                      >
                        <Download size={15} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!docs.length && (
          <Empty
            title="No matching documents"
            description="Try another name or format."
          />
        )}
      </Panel>
    </>
  );
}
function FilesIcon() {
  return <FileText size={28} />;
}
function ConflictCard({ conflict }: { conflict: Conflict }) {
  const { data, post, busy, notify } = useData();
  const facts = data.facts.filter((f) => conflict.factIds.includes(f.id));
  const resolve = async (id: string | null) => {
    try {
      await post(`conflicts/${encodeURIComponent(conflict.id)}/resolve`, {
        expectedVersion: conflict.version,
        selectedFactId: id,
      });
      notify(
        id ? "Conflict resolved by demo review." : "Conflict kept unresolved.",
      );
    } catch {}
  };
  return (
    <article className="conflict-card">
      <div className="conflict-card-heading">
        <div>
          <span className="conflict-icon">
            <TriangleAlert size={17} />
          </span>
          <strong>
            {conflict.year} · {metricLabel[conflict.metric]}
          </strong>
        </div>
        <Badge tone={conflict.selectedFactId ? "teal" : "amber"}>
          {conflict.selectedFactId ? "Demo resolved" : "Needs review"}
        </Badge>
      </div>
      <div className="conflict-options">
        {facts.map((f, i) => (
          <div
            className={conflict.selectedFactId === f.id ? "chosen" : ""}
            key={f.id}
          >
            <p className="eyebrow">SOURCE {String.fromCharCode(65 + i)}</p>
            <strong>
              {f.value.toFixed(2)} <span>{f.unit}</span>
            </strong>
            <Source id={f.evidenceId} />
            <p className="small muted">
              Sample confidence {(f.confidence * 100).toFixed(0)}% · {f.status}
            </p>
            <Button
              variant={conflict.selectedFactId === f.id ? "default" : "outline"}
              size="sm"
              disabled={!data.connected || busy}
              onClick={() => void resolve(f.id)}
            >
              {conflict.selectedFactId === f.id ? (
                <>
                  <Check size={14} />
                  Selected
                </>
              ) : (
                `Accept value ${String.fromCharCode(65 + i)}`
              )}
            </Button>
          </div>
        ))}
      </div>
      <button
        className="text-link small"
        disabled={!data.connected || busy}
        onClick={() => void resolve(null)}
      >
        Keep unresolved
      </button>
    </article>
  );
}
export function Validation({
  mineId,
  chooseMine,
}: {
  mineId: string;
  chooseMine: (id: string) => void;
}) {
  const { data, post, busy, notify } = useData();
  const [status, setStatus] = useState("all"),
    [query, setQuery] = useState(""),
    [correction, setCorrection] = useState<Fact | null>(null),
    [value, setValue] = useState(""),
    [unit, setUnit] = useState("Mt"),
    [reset, setReset] = useState(false);
  const facts = data.facts.filter(
    (f) =>
      f.mineId === mineId &&
      (status === "all" || f.status === status) &&
      `${f.year} ${metricLabel[f.metric]} ${f.value}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const conflicts = data.conflicts.filter((c) => c.mineId === mineId);
  const review = async (f: Fact, action: "approve" | "reject") => {
    try {
      await post(`facts/${f.id}/review`, {
        expectedVersion: f.version,
        action,
      });
      notify(
        `Fact ${action === "approve" ? "approved" : "rejected"} by demo review.`,
      );
    } catch {}
  };
  const save = async () => {
    if (!correction) return;
    const number = Number(value);
    if (!value.trim() || !Number.isFinite(number) || number < 0) {
      notify("Enter a non-negative numerical value.");
      return;
    }
    try {
      await post(`facts/${correction.id}/review`, {
        expectedVersion: correction.version,
        action: "correct",
        value: number,
        unit,
      });
      setCorrection(null);
      notify("Correction saved. The original extraction is preserved.");
    } catch {}
  };
  const resetDemo = async () => {
    try {
      await post("demo/reset", {
        expectedRevision: data.revision,
        confirm: "RESET SHARED DEMO",
      });
      setReset(false);
      notify(
        "Shared demo restored to its baseline. Previous reports are now stale.",
      );
    } catch {}
  };
  return (
    <>
      <PageTitle
        eyebrow="HUMAN REVIEW"
        title="Evidence, ready for review."
        description="Compare sources and keep every decision traceable."
      >
        <MineSelector value={mineId} onChange={chooseMine} />
        <Button
          variant="outline"
          disabled={!data.connected || busy}
          onClick={() => setReset(true)}
        >
          <RotateCcw size={15} />
          Reset Shared Demo
        </Button>
      </PageTitle>
      <div className="review-notice">
        <ShieldCheck size={20} />
        <p>
          <strong>Public demo review.</strong> Changes are shared with all
          visitors. Approvals demonstrate the workflow and do not represent
          authenticated expert sign-off.
        </p>
      </div>
      {conflicts.length > 0 && (
        <>
          <div className="section-label">
            <h2>Conflicting evidence</h2>
            <Badge tone="amber">
              {conflicts.filter((c) => !c.selectedFactId).length} unresolved
            </Badge>
          </div>
          <div className="conflicts-grid">
            {conflicts.map((c) => (
              <ConflictCard key={c.id} conflict={c} />
            ))}
          </div>
        </>
      )}
      <Panel
        title="Extracted facts"
        subtitle="Corrected facts retain their original values and source evidence."
      >
        <div className="filter-bar inset">
          <label className="search-field">
            <Search size={16} />
            <input
              aria-label="Search facts"
              placeholder="Search metric, year, or value…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Fact review status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All review statuses</option>
            {["unreviewed", "approved", "corrected", "rejected"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Metric / period</th>
                <th>Current value</th>
                <th>Source</th>
                <th>Sample confidence</th>
                <th>Demo review</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {facts.map((f) => (
                <tr key={f.id}>
                  <td>
                    <strong>{metricLabel[f.metric]}</strong>
                    <small className="cell-note">
                      {f.year}
                      {f.metric === "reserves" ? " · 31 Dec" : ""}
                    </small>
                  </td>
                  <td>
                    <strong>
                      {f.value.toFixed(2)} {f.unit}
                    </strong>
                    {f.status === "corrected" && (
                      <small className="cell-note">
                        Original {f.originalValue} {f.originalUnit}
                      </small>
                    )}
                  </td>
                  <td>
                    <Source id={f.evidenceId} />
                  </td>
                  <td className="muted">{(f.confidence * 100).toFixed(0)}%</td>
                  <td>
                    <Badge
                      tone={
                        f.status === "approved" || f.status === "corrected"
                          ? "teal"
                          : f.status === "rejected"
                            ? "red"
                            : "neutral"
                      }
                    >
                      {f.status}
                    </Badge>
                  </td>
                  <td>
                    <div className="review-actions">
                      <button
                        title="Approve fact"
                        aria-label={`Approve ${f.year} ${f.metric} ${f.value}`}
                        disabled={
                          !data.connected || busy || f.status === "approved"
                        }
                        onClick={() => void review(f, "approve")}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        title="Correct fact"
                        aria-label={`Correct ${f.year} ${f.metric} ${f.value}`}
                        disabled={!data.connected || busy}
                        onClick={() => {
                          setCorrection(f);
                          setValue(String(f.value));
                          setUnit(f.unit);
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        title="Reject fact"
                        aria-label={`Reject ${f.year} ${f.metric} ${f.value}`}
                        disabled={
                          !data.connected || busy || f.status === "rejected"
                        }
                        onClick={() => void review(f, "reject")}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!facts.length && (
          <Empty title="No matching facts" description="Try another filter." />
        )}
      </Panel>
      <Panel
        title="Recent review activity"
        subtitle="Anonymous session events are retained in shared storage."
      >
        {data.events.length ? (
          data.events
            .slice(-5)
            .reverse()
            .map((e) => (
              <div className="activity-row" key={e.id}>
                <Check size={15} />
                <strong>{e.action}</strong>
                <span className="muted">{e.recordId}</span>
                <time>
                  {new Date(e.at).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}
                </time>
              </div>
            ))
        ) : (
          <p className="muted">No new demo review events yet.</p>
        )}
      </Panel>
      <Dialog
        open={Boolean(correction)}
        onOpenChange={(open) => {
          if (!open) setCorrection(null);
        }}
        title="Correct a sample fact"
        description="The extracted source value will remain in the review history."
      >
        {correction && (
          <>
            <div className="evidence-excerpt">
              <strong>
                {metricLabel[correction.metric]} · {correction.year}
              </strong>
              <p>
                Original extraction: {correction.originalValue}{" "}
                {correction.originalUnit}
              </p>
              <Source id={correction.evidenceId} />
            </div>
            <div className="form-row">
              <label>
                Corrected value
                <input
                  aria-label="Corrected value"
                  type="number"
                  min="0"
                  step="any"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </label>
              <label>
                Unit
                <select
                  aria-label="Correction unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  {(correction.metric === "overburden"
                    ? ["Mm³", "m³", "thousand m³"]
                    : ["Mt", "kt", "tonnes"]
                  ).map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="dialog-actions">
              <Button variant="outline" onClick={() => setCorrection(null)}>
                Cancel
              </Button>
              <Button disabled={busy} onClick={() => void save()}>
                Save demo correction
              </Button>
            </div>
          </>
        )}
      </Dialog>
      <Dialog
        open={reset}
        onOpenChange={setReset}
        title="Reset the shared demo?"
        description="This restores every visitor’s sample facts and conflicts to the baseline. Review history and existing report snapshots are preserved; those reports become stale."
      >
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setReset(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => void resetDemo()}
          >
            Reset Shared Demo
          </Button>
        </div>
      </Dialog>
    </>
  );
}
