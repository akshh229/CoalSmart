"use client";
import { ArrowUpRight, FileText, Info } from "lucide-react";
import Image from "next/image";
import { useData } from "./data-context";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import type { ReactNode } from "react";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "teal" | "amber" | "red";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="muted small">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Source({
  id,
  compact = false,
}: {
  id: string;
  compact?: boolean;
}) {
  const { data, openEvidence } = useData();
  const e = data.evidence.find((e) => e.id === id);
  if (!e) return null;
  return (
    <button
      className="source"
      onClick={() => openEvidence(id)}
      aria-label={`View source ${e.documentId} ${e.sheet ? `${e.sheet} cell ${e.cell}` : `page ${e.page}`}`}
    >
      <FileText size={13} />
      {compact
        ? "View source"
        : `${e.documentId.toUpperCase()} · ${e.sheet ? e.cell : `p.${e.page}`}`}
      <ArrowUpRight size={12} />
    </button>
  );
}
export function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty">
      <Info size={30} />
      <h3>{title}</h3>
      <p className="muted">{description}</p>
    </div>
  );
}
export function EvidenceViewer() {
  const { data, evidenceId, closeEvidence } = useData();
  const e = data.evidence.find((e) => e.id === evidenceId);
  const d = data.documents.find((d) => d.id === e?.documentId);
  const f = data.facts.find((f) => f.evidenceId === evidenceId);
  return (
    <Dialog
      open={Boolean(e && d)}
      onOpenChange={(open) => {
        if (!open) closeEvidence();
      }}
      title={d?.title ?? "Evidence"}
      description={
        e?.sheet
          ? `${e.sheet}!${e.cell} · Synthetic source workbook`
          : `Original sample document · Page ${e?.page ?? 1}`
      }
    >
      {e && d && (
        <>
          <div className="evidence-meta">
            <Badge tone="teal">{d.format}</Badge>
            {f && (
              <Badge>
                {f.status === "approved"
                  ? "Demo reviewed"
                  : f.status === "corrected"
                    ? "Demo corrected"
                    : f.status}
              </Badge>
            )}
            <a
              href={`/samples/${d.filename}`}
              target="_blank"
              rel="noreferrer"
              className="source"
            >
              Download original <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="evidence-excerpt">
            <p className="eyebrow">Source excerpt</p>
            <p>{e.excerpt}</p>
            {f && (
              <p className="muted small">
                Sample extraction confidence: {(f.confidence * 100).toFixed(0)}
                %. Original value: {f.originalValue} {f.originalUnit}.{" "}
                {f.status === "corrected" &&
                  `Current demo correction: ${f.value} ${f.unit}.`}
              </p>
            )}
          </div>
          <div className="source-preview">
            <Image
              src={e.preview}
              alt={`${d.filename}, ${e.sheet ? `${e.sheet} cell ${e.cell}` : `page ${e.page}`}`}
              width={1000}
              height={1300}
              unoptimized
              style={{ width: "100%", height: "auto" }}
            />
          </div>
          <p className="small muted">
            Synthetic evidence for demonstration. Confidence values are prepared
            metadata.
          </p>
        </>
      )}
    </Dialog>
  );
}
export function MineSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { data } = useData();
  return (
    <label className="select-label">
      <span>Mine</span>
      <select
        aria-label="Select mine"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {data.mines.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </label>
  );
}
export function RetryButton() {
  const { refresh } = useData();
  return (
    <Button variant="outline" size="sm" onClick={() => void refresh()}>
      Refresh data
    </Button>
  );
}
