import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

// This module is imported only by server routes and setup scripts.
export const provider = () =>
  process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? "gemini" : "openai");
export const modelConfigured = () =>
  Boolean(
    provider() === "gemini"
      ? process.env.GEMINI_API_KEY
      : process.env.OPENAI_API_KEY,
  );
export const embeddingModel = () =>
  provider() === "gemini"
    ? process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2"
    : "text-embedding-3-small";
function openai() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 25000,
    maxRetries: 0,
  });
}
async function google(method: string, model: string, body: unknown) {
  if (!process.env.GEMINI_API_KEY) throw new Error("Gemini is not configured.");
  if (!/^[a-z0-9.-]+$/.test(model))
    throw new Error("Invalid model configuration.");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000),
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new Error(`AI provider request failed (${response.status}).`);
  return response.json();
}
export async function structured<T extends z.ZodType>(
  schema: T,
  name: string,
  system: string,
  input: string,
): Promise<z.infer<T>> {
  if (provider() === "gemini") {
    const response = await google(
      "generateContent",
      process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
      {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: input }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 4000,
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(schema),
        },
      },
    );
    const text = response.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || "")
      .join("");
    if (!text) throw new Error("AI response was empty.");
    return schema.parse(JSON.parse(text));
  }
  const response = await openai().responses.parse({
    model: process.env.OPENAI_MODEL || "gpt-5.6-terra",
    reasoning: { effort: "low" },
    max_output_tokens: 4000,
    store: false,
    input: [
      { role: "system", content: system },
      { role: "user", content: input },
    ],
    text: { format: zodTextFormat(schema, name) },
  });
  if (!response.output_parsed) throw new Error("AI response was incomplete.");
  return schema.parse(response.output_parsed);
}
export async function embed(text: string): Promise<number[]> {
  let values: number[];
  if (provider() === "gemini") {
    const result = await google("embedContent", embeddingModel(), {
      content: { parts: [{ text }] },
      outputDimensionality: 1536,
    });
    values = result.embedding?.values;
  } else {
    values = (
      await openai().embeddings.create({ model: embeddingModel(), input: text })
    ).data[0].embedding;
  }
  if (
    !Array.isArray(values) ||
    values.length !== 1536 ||
    values.some((n) => !Number.isFinite(n))
  )
    throw new Error("Invalid embedding response.");
  return values;
}
