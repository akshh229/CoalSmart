"use client";
import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  FileCheck2,
  Files,
  MapPin,
  Mountain,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  TrendingUp,
} from "lucide-react";
import { latest, percentageChange, canonical } from "@/lib/intelligence";
import { useData } from "./data-context";
import { Badge, PageTitle, Panel, Source, MineSelector } from "./common";
import { Button } from "./ui/button";
import { TimelineChart } from "./timeline";
import type { Mine } from "@/lib/types";
const MineMap = dynamic(() => import("./mine-map"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading mine geography…</div>,
});
function Stat({
  label,
  value,
  note,
  icon: Icon,
  tone = "teal",
}: {
  label: string;
  value: string | number;
  note: string;
  icon: typeof Mountain;
  tone?: string;
}) {
  return (
    <div className="stat-card">
      <div>
        <span className="stat-label">{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
      <span className={`stat-icon ${tone}`}>
        <Icon size={20} />
      </span>
    </div>
  );
}
function Quarry() {
  return (
    <svg
      className="quarry"
      viewBox="0 0 350 210"
      fill="none"
      aria-hidden="true"
    >
      <ellipse
        cx="192"
        cy="131"
        rx="148"
        ry="60"
        stroke="#7cbcb0"
        strokeOpacity=".22"
      />
      <ellipse
        cx="192"
        cy="127"
        rx="126"
        ry="48"
        stroke="#7cbcb0"
        strokeOpacity=".32"
      />
      <ellipse
        cx="192"
        cy="122"
        rx="103"
        ry="38"
        stroke="#7cbcb0"
        strokeOpacity=".42"
      />
      <ellipse
        cx="192"
        cy="115"
        rx="80"
        ry="28"
        stroke="#7cbcb0"
        strokeOpacity=".52"
      />
      <ellipse
        cx="192"
        cy="109"
        rx="55"
        ry="19"
        stroke="#7cbcb0"
        strokeOpacity=".7"
      />
      <path
        d="M55 152L123 119L155 124L195 105L253 115L309 89"
        stroke="#f0bb67"
        strokeWidth="2"
        strokeDasharray="4 6"
      />
      <circle cx="196" cy="105" r="5" fill="#f0bb67" />
      <path
        d="M195 100V36M195 36L230 50L195 64"
        stroke="#b2d9d0"
        strokeWidth="2"
      />
      <path
        d="M94 76L110 57L126 76M275 60L286 44L299 60"
        stroke="#7cbcb0"
        strokeOpacity=".5"
      />
      <rect x="238" y="76" width="27" height="15" rx="2" fill="#c4d7bd" />
      <rect x="265" y="82" width="13" height="9" rx="2" fill="#e6c08c" />
      <circle cx="245" cy="92" r="4" fill="#325c53" />
      <circle cx="270" cy="92" r="4" fill="#325c53" />
    </svg>
  );
}
export function Overview() {
  const { data } = useData();
  const unresolved = data.conflicts.filter((c) => !c.selectedFactId),
    reviewed = data.facts.filter(
      (f) => f.status === "approved" || f.status === "corrected",
    ).length;
  const hero = data.mines[0];
  const end = latest(data, hero.id, "production");
  const start = canonical(data, hero.id, 2020, "production");
  const change =
    start && end?.fact ? percentageChange(start.value, end.fact.value) : null;
  return (
    <>
      <PageTitle
        eyebrow="YOUR INTELLIGENCE WORKSPACE"
        title="Mine intelligence, connected."
        description="Turn fragmented reports into a clearer picture of your mines."
      >
        <Button asChild variant="outline">
          <Link href="/documents">
            <Files size={16} />
            View documents
          </Link>
        </Button>
        <Button asChild>
          <Link href="/ai?mine=m01">
            <Sparkles size={16} />
            Ask CoalSMART AI
          </Link>
        </Button>
      </PageTitle>
      <div className="stats-grid">
        <Stat
          label="Digital mine twins"
          value={data.mines.length}
          note="Across 3 sample subsidiaries"
          icon={Mountain}
        />
        <Stat
          label="Source documents"
          value={data.documents.length}
          note="Prepared PDF, scans & Excel"
          icon={Files}
        />
        <Stat
          label="Demo-reviewed facts"
          value={reviewed}
          note={`${data.facts.length} total extracted sample facts`}
          icon={ShieldCheck}
        />
        <Stat
          label="Unresolved conflicts"
          value={unresolved.length}
          note="Review competing source values"
          icon={TriangleAlert}
          tone="amber"
        />
      </div>
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="hero-eyebrow">
            <span className="status-dot" /> FEATURED INVESTIGATION
          </span>
          <h2>
            One mine. Every source.
            <br />A connected story.
          </h2>
          <p>
            Explore {hero.name} from its annual production trend to the
            documents behind every observation.
          </p>
          <Button asChild>
            <Link href={`/twins?mine=${hero.id}`}>
              Open Digital Mine Twin <ArrowRight size={16} />
            </Link>
          </Button>
          <div className="hero-facts">
            <span>
              <MapPin size={13} />
              {hero.district}, {hero.state}
            </span>
            <span>2020–2024</span>
            <span>4 source documents</span>
          </div>
        </div>
        <div className="hero-visual">
          <Quarry />
          <div className="hero-callout">
            <span>PRODUCTION CHANGE</span>
            <strong>
              {change === null ? "Insufficient data" : `${change.toFixed(1)}%`}{" "}
              <ArrowDownRight size={22} />
            </strong>
            <small>
              {change === null
                ? "Review underlying observations"
                : "Calculated from cited annual values"}
            </small>
          </div>
        </div>
      </section>
      <div className="overview-columns">
        <TimelineChart mineId="m01" compact />
        <Panel
          title="Needs a closer look"
          subtitle="Competing values, ready for demo review."
          action={
            <Link className="text-link" href="/validation">
              View all <ArrowUpRight size={14} />
            </Link>
          }
        >
          {unresolved.length ? (
            unresolved.slice(0, 3).map((c) => (
              <Link
                className="conflict-summary"
                href={`/validation?mine=${c.mineId}`}
                key={c.id}
              >
                <span className="conflict-icon">
                  <TriangleAlert size={17} />
                </span>
                <div>
                  <strong>
                    {data.mines.find((m) => m.id === c.mineId)?.name}
                  </strong>
                  <p>
                    {c.year} ·{" "}
                    {c.metric === "reserves"
                      ? "Recoverable reserves"
                      : "Production"}
                  </p>
                  <div className="competing-values">
                    {data.facts
                      .filter((f) => c.factIds.includes(f.id))
                      .map((f) => (
                        <span key={f.id}>
                          {f.value.toFixed(2)} {f.unit}
                        </span>
                      ))}
                  </div>
                </div>
                <ChevronArrow />
              </Link>
            ))
          ) : (
            <div className="all-reviewed">
              <CheckCheck size={30} />
              <p>No unresolved conflicts.</p>
            </div>
          )}
          <div className="panel-tip">
            <ShieldCheck size={16} />
            <p>
              Conflicts stay visible until a demo reviewer chooses a source.
            </p>
          </div>
        </Panel>
      </div>
      <Panel
        title="Your digital mine twins"
        subtitle="A source-connected profile for every sample mine."
        action={
          <Link className="text-link" href="/map">
            Explore CoalMap <ArrowUpRight size={14} />
          </Link>
        }
      >
        <MineTable mines={data.mines} />
      </Panel>
      <div className="workflow-strip">
        <div>
          <span className="workflow-icon">
            <FileCheck2 size={20} />
          </span>
          <strong>Follow the evidence loop</strong>
        </div>
        <p>
          Documents <ArrowRight size={13} /> Intelligence{" "}
          <ArrowRight size={13} /> Review <ArrowRight size={13} /> Management
          brief
        </p>
        <Button variant="ghost" asChild>
          <Link href="/reports?mine=m01">
            Create a brief <ArrowUpRight size={14} />
          </Link>
        </Button>
      </div>
    </>
  );
}
function ChevronArrow() {
  return <ArrowUpRight size={16} className="muted" />;
}
export function MineTable({ mines }: { mines: Mine[] }) {
  const { data } = useData();
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Mine</th>
            <th>Subsidiary</th>
            <th>Latest production</th>
            <th>2020–2024 change</th>
            <th>Conflicts</th>
            <th>
              <span className="sr-only">Open mine</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {mines.map((m) => {
            const last = latest(data, m.id, "production"),
              first = canonical(data, m.id, 2020, "production");
            const change =
              first && last?.fact
                ? percentageChange(first.value, last.fact.value)
                : null;
            const n = data.conflicts.filter(
              (c) => c.mineId === m.id && !c.selectedFactId,
            ).length;
            return (
              <tr key={m.id}>
                <td>
                  <Link
                    className="mine-table-name"
                    href={`/twins?mine=${m.id}`}
                  >
                    <span className="mine-icon">
                      <Mountain size={17} />
                    </span>
                    <div>
                      <strong>{m.name}</strong>
                      <small>
                        {m.district}, {m.state}
                      </small>
                    </div>
                  </Link>
                </td>
                <td className="muted">{m.subsidiary}</td>
                <td>
                  <strong>
                    {last?.fact
                      ? `${last.fact.value.toFixed(2)} Mt`
                      : "Needs review"}
                  </strong>
                  <small className="cell-note">{last?.year ?? "No year"}</small>
                </td>
                <td>
                  {change === null ? (
                    <span className="muted">No trend</span>
                  ) : (
                    <span
                      className={`trend ${change < 0 ? "negative" : "positive"}`}
                    >
                      {change < 0 ? (
                        <ArrowDownRight size={14} />
                      ) : (
                        <TrendingUp size={14} />
                      )}{" "}
                      {Math.abs(change).toFixed(1)}%
                    </span>
                  )}
                </td>
                <td>
                  <Badge tone={n ? "amber" : "teal"}>
                    {n ? `${n} unresolved` : "Clear"}
                  </Badge>
                </td>
                <td>
                  <Link
                    aria-label={`Open ${m.name}`}
                    href={`/twins?mine=${m.id}`}
                  >
                    <ArrowUpRight size={17} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
export function MineTwins({
  mineId,
  chooseMine,
}: {
  mineId: string;
  chooseMine: (id: string) => void;
}) {
  const { data } = useData();
  const mine = data.mines.find((m) => m.id === mineId)!;
  const p = latest(data, mineId, "production"),
    r = latest(data, mineId, "reserves");
  const documents = data.documents.filter((d) => d.mineId === mineId);
  const issues = data.chunks.filter((c) => c.mineId === mineId);
  return (
    <>
      <PageTitle
        eyebrow="DIGITAL MINE INTELLIGENCE TWIN"
        title={mine.name}
        description={`${mine.subsidiary} · ${mine.district}, ${mine.state}`}
      >
        <MineSelector value={mineId} onChange={chooseMine} />
        <Button asChild>
          <Link href={`/reports?mine=${mineId}`}>
            Generate brief <ArrowUpRight size={16} />
          </Link>
        </Button>
      </PageTitle>
      <div className="twin-profile">
        <div className="twin-monogram">
          <Mountain size={32} />
        </div>
        <div>
          <Badge tone="teal">{mine.type}</Badge>
          <h2>{mine.name}</h2>
          <p className="muted">
            In operation since {mine.opened} · Aliases: {mine.alias.join(", ")}
          </p>
        </div>
        <div className="profile-coordinate">
          <MapPin size={17} />
          <span>
            {mine.lat.toFixed(2)}° N, {mine.lng.toFixed(2)}° E
            <small>Illustrative sample location</small>
          </span>
        </div>
      </div>
      <div className="stats-grid">
        <Stat
          label="Latest production"
          value={p?.fact ? `${p.fact.value.toFixed(2)} Mt` : "Needs review"}
          note={`Calendar year ${p?.year ?? "unavailable"}`}
          icon={TrendingUp}
        />
        <Stat
          label="Recoverable reserves"
          value={r?.fact ? `${r.fact.value.toFixed(2)} Mt` : "Needs review"}
          note={`As at 31 December ${r?.year ?? "—"}`}
          icon={Mountain}
        />
        <Stat
          label="Source documents"
          value={documents.length}
          note="Prepared sample extraction"
          icon={Files}
        />
        <Stat
          label="Unresolved conflicts"
          value={
            data.conflicts.filter(
              (c) => c.mineId === mineId && !c.selectedFactId,
            ).length
          }
          note="Competing facts require a decision"
          icon={TriangleAlert}
          tone="amber"
        />
      </div>
      <div className="key-sources">
        {p?.fact && <Source id={p.fact.evidenceId} />}{" "}
        {r?.fact && <Source id={r.fact.evidenceId} />}
      </div>
      <div className="overview-columns">
        <TimelineChart mineId={mineId} compact />
        <Panel
          title="Documented operational factors"
          subtitle="Reported observations, without assumed causation."
        >
          {issues.map((c) => (
            <div className="observation" key={c.id}>
              <span className="year-chip">{c.year}</span>
              <div>
                <p>
                  {data.evidence.find((e) => e.id === c.evidenceId)?.excerpt}
                </p>
                <Source id={c.evidenceId} />
              </div>
            </div>
          ))}
        </Panel>
      </div>
      <Panel
        title="Related documents"
        subtitle="Every fact stays connected to its source."
      >
        <div className="document-mini-grid">
          {documents.map((d) => (
            <div key={d.id}>
              <Files size={20} />
              <strong>{d.title}</strong>
              <Badge>{d.format}</Badge>
              <Source
                id={data.evidence.find((e) => e.documentId === d.id)!.id}
              />
            </div>
          ))}
        </div>
      </Panel>
      <div className="workflow-strip">
        <div>
          <Sparkles size={20} />
          <strong>Investigate this mine with CoalSMART AI</strong>
        </div>
        <Button asChild variant="outline">
          <Link href={`/ai?mine=${mineId}`}>
            Ask a question <ArrowRight size={15} />
          </Link>
        </Button>
      </div>
    </>
  );
}
export function MapPage() {
  const { data } = useData();
  const [subsidiary, setSubsidiary] = useState("all"),
    [filter, setFilter] = useState("all");
  const mines = data.mines.filter((m) => {
    if (subsidiary !== "all" && m.subsidiary !== subsidiary) return false;
    if (filter === "conflicts")
      return data.conflicts.some((c) => c.mineId === m.id && !c.selectedFactId);
    if (filter === "declining") {
      const a = canonical(data, m.id, 2020, "production"),
        b = canonical(data, m.id, 2024, "production");
      return a && b && b.value < a.value;
    }
    return true;
  });
  return (
    <>
      <PageTitle
        eyebrow="GEOGRAPHIC INTELLIGENCE"
        title="CoalMap"
        description="Explore the sample mine network and open a connected profile."
      />
      <div className="filter-bar">
        <label>
          Subsidiary
          <select
            aria-label="Map subsidiary"
            value={subsidiary}
            onChange={(e) => setSubsidiary(e.target.value)}
          >
            <option value="all">All subsidiaries</option>
            {[...new Set(data.mines.map((m) => m.subsidiary))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Show mines
          <select
            aria-label="Map mine filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All mines</option>
            <option value="declining">Declining production</option>
            <option value="conflicts">Unresolved conflicts</option>
          </select>
        </label>
        <Badge tone="teal">{mines.length} mines</Badge>
      </div>
      <Panel className="map-panel">
        <MineMap mines={mines} />
      </Panel>
      <Panel
        title="Mine network"
        subtitle="Illustrative coordinates for fictional mines."
      >
        <MineTable mines={mines} />
        {!mines.length && (
          <p className="muted">No mines match these filters.</p>
        )}
      </Panel>
    </>
  );
}
