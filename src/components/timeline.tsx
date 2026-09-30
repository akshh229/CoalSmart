"use client";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { timeline } from "@/lib/intelligence";
import { metricLabel, type Metric } from "@/lib/types";
import { useData } from "./data-context";
import { Badge, Panel, Source } from "./common";
export function TimelineChart({
  mineId,
  compact = false,
}: {
  mineId: string;
  compact?: boolean;
}) {
  const { data, openEvidence } = useData();
  const [metric, setMetric] = useState<Metric>("production");
  const [target, setTarget] = useState(false);
  const points = timeline(data, mineId, metric);
  return (
    <Panel
      title={compact ? "Production over time" : "GeoTimeline"}
      subtitle="Select a data point to inspect its source."
      action={
        compact ? (
          <Badge>2020–2024</Badge>
        ) : (
          <select
            aria-label="Timeline metric"
            value={target ? "comparison" : metric}
            onChange={(e) => {
              const value = e.target.value;
              setTarget(value === "comparison");
              setMetric(
                value === "comparison" ? "production" : (value as Metric),
              );
            }}
          >
            {(["production", "reserves", "overburden"] as Metric[]).map((m) => (
              <option key={m} value={m}>
                {metricLabel[m]}
              </option>
            ))}
            <option value="comparison">Target versus actual</option>
          </select>
        )
      }
    >
      <div className="chart-legend">
        <span>
          <i className="legend-dot" /> {metricLabel[metric]} (
          {metric === "overburden" ? "Mm³" : "Mt"})
        </span>
        {target && (
          <span>
            <i className="legend-dot amber" />
            Target (Mt)
          </span>
        )}
      </div>
      <div className="chart" style={{ height: compact ? 260 : 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={points}
            margin={{ top: 20, right: 20, bottom: 10, left: 0 }}
          >
            <CartesianGrid
              stroke="#e8eeed"
              vertical={false}
              strokeDasharray="3 4"
            />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#7e8989", fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#7e8989", fontSize: 12 }}
              width={42}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #dde6e3",
                fontSize: 12,
              }}
            />
            <Line
              dataKey="value"
              name={metricLabel[metric]}
              type="linear"
              stroke="#118978"
              strokeWidth={2.5}
              connectNulls={false}
              dot={(props) => (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={4.5}
                  fill="white"
                  stroke="#118978"
                  strokeWidth={2}
                  onClick={() =>
                    props.payload.evidenceId &&
                    openEvidence(props.payload.evidenceId)
                  }
                  style={{ cursor: "pointer" }}
                />
              )}
            />
            {target && (
              <Line
                dataKey="target"
                name="Target"
                type="linear"
                stroke="#dba548"
                strokeWidth={2}
                strokeDasharray="5 5"
                connectNulls={false}
                dot={(props) => (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={4}
                    fill="white"
                    stroke="#dba548"
                    onClick={() =>
                      props.payload.targetEvidenceId &&
                      openEvidence(props.payload.targetEvidenceId)
                    }
                    style={{ cursor: "pointer" }}
                  />
                )}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {!compact && (
        <div className="timeline-points">
          {points.map((p) => (
            <div key={p.year}>
              <strong>{p.year}</strong>
              <span>
                {p.value === null
                  ? p.conflict
                    ? "Conflicting"
                    : "No data"
                  : `${p.value.toFixed(2)} ${metric === "overburden" ? "Mm³" : "Mt"}`}
              </span>
              {p.evidenceId && <Source id={p.evidenceId} />}{" "}
              {target && p.targetEvidenceId && (
                <Source id={p.targetEvidenceId} />
              )}
            </div>
          ))}
        </div>
      )}
      <p className="small muted chart-note">
        Calendar-year observations. Missing and unresolved values remain gaps.
      </p>
    </Panel>
  );
}
