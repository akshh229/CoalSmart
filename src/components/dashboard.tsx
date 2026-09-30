"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  ChevronRight,
  FileCheck2,
  Files,
  Globe2,
  LayoutDashboard,
  Menu,
  Mountain,
  Sparkles,
  Workflow,
  X,
  RefreshCw,
} from "lucide-react";
import type { Snapshot } from "@/lib/types";
import { DataProvider, useData } from "./data-context";
import {
  Badge,
  EvidenceViewer,
  MineSelector,
  PageTitle,
  Panel,
} from "./common";
import { Button } from "./ui/button";
import { Overview, MineTwins, MapPage } from "./mine-pages";
import { Documents, Validation } from "./review-pages";
import { AIPage, ReportsPage } from "./ai-pages";
import { TimelineChart } from "./timeline";
const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "documents", label: "Documents", icon: Files },
  { id: "twins", label: "Mine Twins", icon: Workflow },
  { id: "ai", label: "CoalSMART AI", icon: Sparkles },
  { id: "timeline", label: "GeoTimeline", icon: BarChart3 },
  { id: "map", label: "CoalMap", icon: Globe2 },
  { id: "validation", label: "Validation", icon: FileCheck2 },
  { id: "reports", label: "Reports", icon: BookOpen },
];
export function Dashboard({
  initial,
  view,
}: {
  initial: Snapshot;
  view: string;
}) {
  return (
    <DataProvider initial={initial} view={view}>
      <Shell view={view} />
    </DataProvider>
  );
}
function Shell({ view }: { view: string }) {
  const { data, refresh, message, busy, notify } = useData();
  const router = useRouter(),
    pathname = usePathname(),
    searchParams = useSearchParams();
  const selected = searchParams.get("mine") ?? "m01";
  const mineId = data.mines.some((m) => m.id === selected) ? selected : "m01";
  const [menu, setMenu] = useState(false);
  const current = nav.find((n) => n.id === view);
  const conflicts = data.conflicts.filter((c) => !c.selectedFactId).length;
  const chooseMine = (id: string) => router.push(`${pathname}?mine=${id}`);
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {menu && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "is-open" : ""}`}>
        <Link className="brand" href="/">
          <span className="brand-icon">
            <Mountain size={23} />
          </span>
          <span>
            Coal<span className="brand-smart">SMART</span>
            <small>MINE INTELLIGENCE</small>
          </span>
        </Link>
        <div className="workspace-label">
          <span className="workspace-icon">
            <Globe2 size={17} />
          </span>
          <div>
            Demo workspace<small>Mining intelligence platform</small>
          </div>
          <ChevronRight size={15} />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <Link
              key={n.id}
              href={`/${n.id === "overview" ? "" : n.id}${n.id === "overview" ? "" : `?mine=${mineId}`}`}
              onClick={() => setMenu(false)}
              className={`nav-link ${n.id === view ? "active" : ""}`}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.id === "validation" && conflicts > 0 && (
                <span className="nav-count">{conflicts}</span>
              )}
              {n.id === "ai" && <span className="nav-ai">AI</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sandbox-card">
            <span className="status-dot" />
            <strong>Sample-data sandbox</strong>
            <p>
              Explore the full intelligence loop with synthetic mining reports.
            </p>
            <Link href="/documents">
              Explore sample pack <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="sidebar-user">
            <span className="avatar">CS</span>
            <div>
              CoalSMART Demo<small>Public sandbox</small>
            </div>
            <Badge tone="teal">V1</Badge>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <Button
              className="mobile-menu"
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu size={20} />
            </Button>
            <span className="muted">Workspace</span>
            <ChevronRight size={13} />
            <strong>{current?.label ?? "Page not found"}</strong>
          </div>
          <div className="topbar-right">
            <Badge tone="teal">
              <span className="status-dot" />
              Sample-data sandbox
            </Badge>
            <button
              className="refresh-button"
              onClick={() => void refresh()}
              aria-label="Refresh shared data"
            >
              <RefreshCw size={16} className={busy ? "spin" : ""} />
            </button>
            <span className="avatar small-avatar">CS</span>
          </div>
        </header>
        <main id="main" className="main-content">
          {!data.connected && (
            <div className="setup-banner">
              <span className="status-dot amber" />
              <span>
                <strong>Read-only preview</strong> · Shared reviews need service
                setup.{!data.aiAvailable && " Live AI is not connected."}
              </span>
              <button onClick={() => void refresh()}>
                Check again <RefreshCw size={12} />
              </button>
            </div>
          )}
          {view === "overview" ? (
            <Overview />
          ) : view === "twins" ? (
            <MineTwins mineId={mineId} chooseMine={chooseMine} />
          ) : view === "documents" ? (
            <Documents />
          ) : view === "validation" ? (
            <Validation mineId={mineId} chooseMine={chooseMine} />
          ) : view === "ai" ? (
            <AIPage mineId={mineId} chooseMine={chooseMine} />
          ) : view === "reports" ? (
            <ReportsPage mineId={mineId} chooseMine={chooseMine} />
          ) : view === "map" ? (
            <MapPage />
          ) : view === "timeline" ? (
            <>
              <PageTitle
                eyebrow="HISTORICAL INTELLIGENCE"
                title="GeoTimeline"
                description="Follow the numbers back to the evidence."
              >
                <MineSelector value={mineId} onChange={chooseMine} />
              </PageTitle>
              <TimelineChart mineId={mineId} />
            </>
          ) : (
            <Panel>
              <h1>Page not found</h1>
              <Link href="/">Return to overview</Link>
            </Panel>
          )}
          <footer className="page-footer">
            <span>
              <Mountain size={14} /> CoalSMART · Evidence-backed mine
              intelligence
            </span>
            <span>Synthetic data · Calendar years 2020–2024</span>
          </footer>
        </main>
      </div>
      <EvidenceViewer />
      {message && (
        <div className="toast" role="status">
          <span>{message}</span>
          <button aria-label="Dismiss notification" onClick={() => notify("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
