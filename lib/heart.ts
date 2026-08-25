import type { ReviewedResponse, ScriptureCardData } from "@/data/clarita-content";

export type ResponseMode = "comfort" | "understand" | "study" | "pray";
export type SafetyLevel = "ordinary" | "sensitive" | "urgent" | "emergency";

export type HeartGuidance = ReviewedResponse & {
  safetyLevel: SafetyLevel;
  source: "generated" | "reviewed" | "safety";
  supportNote?: string;
};

export type HeartGeneration = Omit<ReviewedResponse, "passages"> & {
  safetyLevel: "ordinary" | "sensitive";
};

export const heartJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["acknowledgement", "question", "reflection", "prayer", "nextStep", "safetyLevel"],
  properties: {
    acknowledgement: { type: "string", minLength: 1, maxLength: 420 },
    question: { type: "string", minLength: 1, maxLength: 280 },
    reflection: { type: "string", minLength: 1, maxLength: 520 },
    prayer: { type: "string", minLength: 1, maxLength: 700 },
    nextStep: { type: "string", minLength: 1, maxLength: 420 },
    safetyLevel: { type: "string", enum: ["ordinary", "sensitive"] },
  },
} as const;

export function assembleGuidance(generation: HeartGeneration, passages: ScriptureCardData[]): HeartGuidance {
  return { ...generation, passages, source: "generated" };
}
