import { NextRequest } from "next/server";
import { z } from "zod";
import { canonical, timeline, reportStale } from "@/lib/intelligence";
import { AppError, type Mutation } from "@/lib/review";
import {
  snapshot,
  readState,
  mutate,
  aiConfigured,
  databaseConfigured,
} from "@/lib/server/store";
import {
  handle,
  sessionId,
  assertOrigin,
  boundedJson,
} from "@/lib/server/http";
import { answerQuestion, consumeLimit, generateReport } from "@/lib/server/ai";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Context = { params: Promise<{ path: string[] }> };
const idSchema = z.string().min(1).max(120);
const metricSchema = z.enum(["production", "reserves", "overburden", "target"]);
export async function GET(request: NextRequest, context: Context) {
  return handle(async () => {
    const { path } = await context.params;
    if (path[0] === "health")
      return {
        databaseConfigured: databaseConfigured(),
        aiConfigured: aiConfigured(),
      };
    const data = await snapshot();
    if (path[0] === "data") return data;
    if (path[0] === "mines" && path.length === 1) return data.mines;
    if (path[0] === "mines" && path[1]) {
      const mine = data.mines.find((m) => m.id === path[1]);
      if (!mine) throw new AppError("Mine not found.", 404);
      if (path[2] === "timeline")
        return timeline(
          data,
          mine.id,
          metricSchema.parse(
            request.nextUrl.searchParams.get("metric") ?? "production",
          ),
        );
      return {
        mine,
        facts: data.facts.filter((f) => f.mineId === mine.id),
        documents: data.documents.filter((d) => d.mineId === mine.id),
        conflicts: data.conflicts.filter((c) => c.mineId === mine.id),
        production: canonical(data, mine.id, 2024, "production"),
      };
    }
    if (path[0] === "documents")
      return path[1]
        ? (data.documents.find((d) => d.id === path[1]) ?? null)
        : data.documents;
    if (path[0] === "evidence") {
      const e = data.evidence.find((e) => e.id === path[1]);
      if (!e) throw new AppError("Evidence not found.", 404);
      return e;
    }
    if (path[0] === "conflicts") return data.conflicts;
    if (path[0] === "reports") {
      if (!path[1]) return data.reports;
      const report = data.reports.find((r) => r.id === path[1]);
      if (!report) throw new AppError("Report not found.", 404);
      return { ...report, stale: reportStale(data, report) };
    }
    throw new AppError("Endpoint not found.", 404);
  });
}
export async function POST(request: NextRequest, context: Context) {
  return handle(async () => {
    assertOrigin(request);
    if (Number(request.headers.get("content-length") ?? 0) > 16000)
      throw new AppError("Request too large.", 413);
    const { path } = await context.params;
    const body = await boundedJson(request);
    const sid = await sessionId();
    if (path[0] === "questions") {
      const input = z
        .object({
          mineId: idSchema,
          question: z.string().trim().min(3).max(2000),
        })
        .strict()
        .parse(body);
      if (!aiConfigured())
        throw new AppError(
          "Live AI is not configured. Configure an AI provider key to enable it.",
          503,
        );
      const { data } = await readState();
      await consumeLimit(request);
      return answerQuestion(data, input.mineId, input.question);
    }
    if (path[0] === "reports" && path.length === 1) {
      const input = z
        .object({
          mineId: idSchema,
          startYear: z.number().int().min(2020).max(2024),
          endYear: z.number().int().min(2020).max(2024),
        })
        .strict()
        .refine((v) => v.startYear <= v.endYear)
        .parse(body);
      if (!aiConfigured())
        throw new AppError(
          "Live AI is not configured. Configure an AI provider key to generate a brief.",
          503,
        );
      const { data } = await readState();
      await consumeLimit(request);
      const report = await generateReport(
        data,
        input.mineId,
        input.startYear,
        input.endYear,
      );
      await mutate({ kind: "report", report }, sid);
      return report;
    }
    let input: Mutation;
    if (path[0] === "facts" && path[2] === "review") {
      const fields = z
        .object({
          expectedVersion: z.number().int().positive(),
          action: z.enum(["approve", "reject", "correct"]),
          value: z.number().finite().nonnegative().max(1e12).optional(),
          unit: z.string().max(30).optional(),
        })
        .strict()
        .parse(body);
      input = { kind: "review", id: idSchema.parse(path[1]), ...fields };
    } else if (path[0] === "conflicts" && path[2] === "resolve") {
      const fields = z
        .object({
          expectedVersion: z.number().int().positive(),
          selectedFactId: idSchema.nullable(),
        })
        .strict()
        .parse(body);
      input = { kind: "resolve", id: idSchema.parse(path[1]), ...fields };
    } else if (path[0] === "reports" && path[2] === "approve") {
      const fields = z
        .object({ expectedVersion: z.number().int().positive() })
        .strict()
        .parse(body);
      input = {
        kind: "approve-report",
        id: idSchema.parse(path[1]),
        ...fields,
      };
    } else if (path[0] === "demo" && path[1] === "reset") {
      const fields = z
        .object({
          expectedRevision: z.number().int().positive(),
          confirm: z.literal("RESET SHARED DEMO"),
        })
        .strict()
        .parse(body);
      input = { kind: "reset", expectedRevision: fields.expectedRevision };
    } else if (path[0] === "demo" && path[1] === "import") {
      z.object({}).strict().parse(body);
      input = { kind: "import" };
    } else throw new AppError("Endpoint not found.", 404);
    await mutate(input, sid);
    return { ok: true };
  });
}
