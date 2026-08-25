import { getReviewedResponse, moods, type MoodId } from "@/data/clarita-content";
import { CLARITA_INSTRUCTIONS, buildHeartInput } from "@/lib/clarita-prompt";
import { assembleGuidance, heartJsonSchema, type HeartGeneration, type ResponseMode } from "@/lib/heart";
import { classifyLocally, nigeriaEmergencyGuidance } from "@/lib/safety";

export const runtime = "nodejs";

const validMoods = new Set(moods.map((mood) => mood.id));
const validModes = new Set<ResponseMode>(["comfort", "understand", "study", "pray"]);

function extractOutputText(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const response = payload as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  if (response.output_text) return response.output_text;
  return response.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
}

async function moderate(apiKey: string, reflection: string) {
  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "omni-moderation-latest", input: reflection }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return false;
  const body = (await response.json()) as { results?: Array<{ flagged?: boolean }> };
  return body.results?.[0]?.flagged === true;
}

export async function POST(request: Request) {
  let body: { reflection?: unknown; mood?: unknown; mode?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const reflection = typeof body.reflection === "string" ? body.reflection.trim() : "";
  const mood = typeof body.mood === "string" && validMoods.has(body.mood as MoodId) ? (body.mood as MoodId) : null;
  const mode = typeof body.mode === "string" && validModes.has(body.mode as ResponseMode) ? (body.mode as ResponseMode) : null;
  if (!reflection || reflection.length > 1200 || !mood || !mode) {
    return Response.json({ error: "Please provide a valid reflection, mood, and response mode." }, { status: 400 });
  }

  const localSafety = classifyLocally(reflection);
  if (localSafety === "emergency") return Response.json(nigeriaEmergencyGuidance());

  const reviewed = getReviewedResponse(mood, reflection);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ ...reviewed, safetyLevel: localSafety, source: "reviewed" });

  try {
    const moderationFlagged = await moderate(apiKey, reflection);
    const modelResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        store: false,
        instructions: CLARITA_INSTRUCTIONS,
        input: buildHeartInput({
          reflection,
          mode,
          mood,
          passages: reviewed.passages,
          locallySensitive: localSafety === "sensitive" || moderationFlagged,
        }),
        text: {
          format: { type: "json_schema", name: "clarita_heart_response", strict: true, schema: heartJsonSchema },
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!modelResponse.ok) throw new Error(`Responses API returned ${modelResponse.status}`);
    const payload: unknown = await modelResponse.json();
    const outputText = extractOutputText(payload);
    if (!outputText) throw new Error("Responses API returned no output text");
    const generation = JSON.parse(outputText) as HeartGeneration;
    return Response.json(assembleGuidance(generation, reviewed.passages));
  } catch (error) {
    console.error("Clarita generation fell back to reviewed content", error instanceof Error ? error.message : "unknown error");
    return Response.json({ ...reviewed, safetyLevel: localSafety, source: "reviewed" });
  }
}
