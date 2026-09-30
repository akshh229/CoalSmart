"use client";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileCheck2,
  Loader2,
  Printer,
  Send,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { Answer, Report } from "@/lib/types";
import { reportStale } from "@/lib/intelligence";
import { useData } from "./data-context";
import { Badge, Empty, MineSelector, PageTitle, Panel, Source } from "./common";
import { Button } from "./ui/button";
type Exchange = {
  mineId: string;
  question: string;
  answer?: Answer;
  error?: string;
};
export function AIPage({
  mineId,
  chooseMine,
}: {
  mineId: string;
  chooseMine: (id: string) => void;
}) {
  const { data, post, busy } = useData();
  const [question, setQuestion] = useState(""),
    [exchanges, setExchanges] = useState<Exchange[]>([]);
  const suggested = [
    "What was production in 2023?",
    "How has production changed since 2020, and what factors are documented?",
    "Are there conflicting reserve values in 2022?",
  ];
  const ask = async (text: string) => {
    if (text.trim().length < 3 || busy) return;
    const query = text.trim();
    setQuestion("");
    const item = { mineId, question: query };
    setExchanges((old) => [...old, item]);
    try {
      const answer = await post<Answer>("questions", {
        mineId,
        question: query,
      });
      setExchanges((old) =>
        old.map((e, i) => (i === old.length - 1 ? { ...e, answer } : e)),
      );
    } catch (error) {
      setExchanges((old) =>
        old.map((e, i) =>
          i === old.length - 1
            ? {
                ...e,
                error:
                  error instanceof Error ? error.message : "Request failed.",
              }
            : e,
        ),
      );
    }
  };
  const current = exchanges.filter((e) => e.mineId === mineId);
  const enabled = data.connected && data.aiAvailable;
  return (
    <>
      <PageTitle
        eyebrow="ASK YOUR EVIDENCE"
        title="CoalSMART AI"
        description="Exact numbers. Documented context. Sources you can inspect."
      >
        <MineSelector value={mineId} onChange={chooseMine} />
        <Badge tone={enabled ? "teal" : "amber"}>
          {enabled ? "Live AI connected" : "AI setup required"}
        </Badge>
      </PageTitle>
      <div className="ai-layout">
        <Panel className="chat-panel">
          <div className="chat-context">
            <span className="ai-mark">
              <Sparkles size={20} />
            </span>
            <div>
              <strong>{data.mines.find((m) => m.id === mineId)?.name}</strong>
              <p className="muted small">
                Questions use this mine’s sample facts and documents.
              </p>
            </div>
            <Badge>2020–2024</Badge>
          </div>
          <div className="chat-content">
            {!current.length ? (
              <div className="chat-welcome">
                <span className="welcome-ai">
                  <Sparkles size={30} />
                </span>
                <h2>What would you like to investigate?</h2>
                <p>
                  Explore performance, compare conflicting values, or find
                  documented operational observations.
                </p>
                <div className="suggestions">
                  {suggested.map((text) => (
                    <button
                      disabled={!enabled || busy}
                      key={text}
                      onClick={() => void ask(text)}
                    >
                      {text}
                      <ArrowUpRight size={15} />
                    </button>
                  ))}
                </div>
                {!enabled && (
                  <p className="ai-offline">
                    Live AI needs a connected database and model API. No
                    prepared responses are presented as AI answers.
                  </p>
                )}
              </div>
            ) : (
              current.map((e, i) => (
                <div className="exchange" key={`${e.question}-${i}`}>
                  <div className="question-bubble">{e.question}</div>
                  {e.error ? (
                    <div className="answer-error">
                      <TriangleAlert size={17} />
                      <p>{e.error}</p>
                      <button
                        onClick={() => void ask(e.question)}
                        disabled={!enabled || busy}
                      >
                        Retry
                      </button>
                    </div>
                  ) : e.answer ? (
                    <div className="answer-block">
                      <div className="answer-heading">
                        <Sparkles size={16} />
                        <strong>CoalSMART AI</strong>
                        <Badge tone="teal">{e.answer.mode}</Badge>
                      </div>
                      {e.answer.calculations.length > 0 && (
                        <div className="answer-calculations">
                          {e.answer.calculations.map((c, j) => (
                            <div key={j}>
                              <span>{c.label}</span>
                              <strong>{c.value}</strong>
                              <div>
                                {c.evidenceIds.map((id) => (
                                  <Source key={id} id={id} />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {e.answer.blocks.map((block, j) => (
                        <div className="answer-claim" key={j}>
                          <p>{block.text}</p>
                          <div>
                            {block.evidenceIds.map((id) => (
                              <Source key={id} id={id} />
                            ))}
                          </div>
                        </div>
                      ))}
                      <p className="small muted">
                        Operational factors are documented observations, not
                        established causes.
                      </p>
                    </div>
                  ) : (
                    <div className="thinking">
                      <Loader2 size={17} className="spin" />
                      Retrieving facts and checking evidence…
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <form
            className="question-form"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(question);
            }}
          >
            <textarea
              aria-label="Ask CoalSMART AI"
              placeholder={
                enabled
                  ? "Ask about production, reserves, or documented factors…"
                  : "Connect live AI to ask a question…"
              }
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={2000}
              rows={2}
              disabled={!enabled}
            />
            <Button
              type="submit"
              disabled={!enabled || busy || question.trim().length < 3}
              size="icon"
              aria-label="Send question"
            >
              <Send size={18} />
            </Button>
          </form>
          <p className="chat-footnote">
            Answers are limited to the selected sample mine. Verify important
            claims against their sources.
          </p>
        </Panel>
        <aside className="ai-aside">
          <Panel title="How the answer is built">
            <div className="answer-step">
              <span>01</span>
              <div>
                <strong>Retrieve exact facts</strong>
                <p>
                  Numerical questions use structured values and review
                  decisions.
                </p>
              </div>
            </div>
            <div className="answer-step">
              <span>02</span>
              <div>
                <strong>Find relevant evidence</strong>
                <p>Document excerpts provide operational context.</p>
              </div>
            </div>
            <div className="answer-step">
              <span>03</span>
              <div>
                <strong>Explain with sources</strong>
                <p>Claims link to the original sample pages or cells.</p>
              </div>
            </div>
          </Panel>
          <div className="ai-side-note">
            <FileCheck2 size={24} />
            <h3>From investigation to brief</h3>
            <p>Turn the evidence into a management report for demo review.</p>
            <a href={`/reports?mine=${mineId}`}>
              Create a management brief <ArrowRight size={14} />
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}
export function ReportsPage({
  mineId,
  chooseMine,
}: {
  mineId: string;
  chooseMine: (id: string) => void;
}) {
  const { data, post, busy, notify } = useData();
  const [selected, setSelected] = useState<string | null>(null),
    [start, setStart] = useState(2020),
    [end, setEnd] = useState(2024);
  const reports = data.reports.filter((r) => r.mineId === mineId);
  const report = reports.find((r) => r.id === selected) ?? reports[0];
  const enabled = data.connected && data.aiAvailable;
  const generate = async () => {
    if (start > end) {
      notify("Start year must be before the end year.");
      return;
    }
    try {
      const r = await post<Report>("reports", {
        mineId,
        startYear: start,
        endYear: end,
      });
      setSelected(r.id);
      notify("Management brief generated and saved as a draft.");
    } catch {}
  };
  const approve = async () => {
    if (!report) return;
    try {
      await post(`reports/${report.id}/approve`, {
        expectedVersion: report.version,
      });
      notify("Report approved in the demo sandbox.");
    } catch {}
  };
  return (
    <>
      <PageTitle
        eyebrow="MANAGEMENT REPORTING"
        title="From evidence to a clear brief."
        description="Generate a cited snapshot, review it, and export it for discussion."
      >
        <MineSelector value={mineId} onChange={chooseMine} />
      </PageTitle>
      <div className="report-controls">
        <div>
          <strong>Mine Performance Brief</strong>
          <p className="small muted">
            Fixed template · Sources included · Demo approval workflow
          </p>
        </div>
        <label>
          From
          <select
            aria-label="Report start year"
            value={start}
            onChange={(e) => setStart(Number(e.target.value))}
          >
            {[2020, 2021, 2022, 2023, 2024].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <label>
          To
          <select
            aria-label="Report end year"
            value={end}
            onChange={(e) => setEnd(Number(e.target.value))}
          >
            {[2020, 2021, 2022, 2023, 2024].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <Button disabled={!enabled || busy} onClick={() => void generate()}>
          {busy ? (
            <Loader2 size={16} className="spin" />
          ) : (
            <Sparkles size={16} />
          )}
          Generate brief
        </Button>
      </div>
      {report ? (
        <>
          <div className="report-toolbar">
            <select
              aria-label="Saved report"
              value={report.id}
              onChange={(e) => setSelected(e.target.value)}
            >
              {reports.map((r) => (
                <option value={r.id} key={r.id}>
                  {r.startYear}–{r.endYear} ·{" "}
                  {new Date(r.createdAt).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}
                </option>
              ))}
            </select>
            <div className="actions">
              <Badge
                tone={
                  reportStale(data, report)
                    ? "amber"
                    : report.status === "approved"
                      ? "teal"
                      : "neutral"
                }
              >
                {reportStale(data, report)
                  ? "Stale snapshot"
                  : report.status === "approved"
                    ? "Demo approved"
                    : "Draft · Demo approval required"}
              </Badge>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer size={15} />
                Print / Save PDF
              </Button>
              <Button
                disabled={
                  !data.connected ||
                  busy ||
                  report.status === "approved" ||
                  reportStale(data, report)
                }
                onClick={() => void approve()}
              >
                <Check size={16} />
                Demo approve
              </Button>
            </div>
          </div>
          {reportStale(data, report) && (
            <p className="stale-notice">
              Shared facts changed after this report was generated. Create a new
              brief before approving.
            </p>
          )}
          <article className="report-paper" id="print-report">
            <div className="report-brand">
              <strong>
                Coal<span>SMART</span>
              </strong>
              <span>SAMPLE-DATA SANDBOX</span>
            </div>
            <div className="report-title">
              <p className="eyebrow">MINE PERFORMANCE BRIEF</p>
              <h1>{data.mines.find((m) => m.id === mineId)?.name}</h1>
              <p>
                {report.startYear}–{report.endYear} · Generated{" "}
                {new Date(report.createdAt).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}
              </p>
              <Badge tone={report.status === "approved" ? "teal" : "amber"}>
                {report.status === "approved"
                  ? "Demo approved"
                  : "Draft — demo approval required"}
              </Badge>
            </div>
            {report.sections.map((s) => (
              <section className="report-section" key={s.title}>
                <h2>{s.title}</h2>
                {s.claims.map((c, i) => (
                  <div key={i}>
                    <p>
                      {s.title === "Validation status" &&
                      report.status === "approved"
                        ? "Demo approved. Public sandbox approval does not represent authenticated expert sign-off. Confidence values are sample metadata."
                        : c.text}
                    </p>
                    <div className="report-citations">
                      {c.evidenceIds.map((id) => (
                        <Source key={id} id={id} />
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            ))}
            <div className="report-end">
              CoalSMART · Synthetic sample evidence · Data revision{" "}
              {report.revision}
            </div>
          </article>
        </>
      ) : (
        <Panel>
          <Empty
            title="Your first management brief starts here"
            description={
              enabled
                ? "Select a mine and period, then generate a brief."
                : "Connect shared storage and live AI to generate and save management briefs."
            }
          />
          <div className="report-preview-sections">
            {[
              "Mine overview",
              "Production trend",
              "Reserve status",
              "Historical changes",
              "Operational issues",
              "Data conflicts",
              "Sources",
              "Validation status",
            ].map((s, i) => (
              <div key={s}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                {s}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}
