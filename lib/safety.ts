import type { HeartGuidance } from "@/lib/heart";

const IMMEDIATE_RISK_PATTERNS = [
  /\b(kill|hurt)\s+(myself|me)\b/i,
  /\b(end|take)\s+my\s+(life|own life)\b/i,
  /\bsuicid(?:e|al)\b/i,
  /\bdo not want to (live|be alive)\b/i,
  /\bgoing to (kill|hurt)\s+(myself|someone)\b/i,
  /\bimmediate danger\b/i,
  /\bweapon\b.*\b(now|with me|near me)\b/i,
];

const SENSITIVE_PATTERNS = [
  /\b(abuse|assault|rape|violence)\b/i,
  /\bself[- ]?harm\b/i,
  /\bhopeless\b/i,
  /\bpanic attack\b/i,
  /\bnot safe\b/i,
];

export type LocalSafetyResult = "ordinary" | "sensitive" | "emergency";

export function classifyLocally(text: string): LocalSafetyResult {
  if (IMMEDIATE_RISK_PATTERNS.some((pattern) => pattern.test(text))) return "emergency";
  if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(text))) return "sensitive";
  return "ordinary";
}

export function nigeriaEmergencyGuidance(): HeartGuidance {
  return {
    acknowledgement: "I’m really sorry you’re facing this. Your immediate safety matters more than continuing a long conversation here.",
    question: "Can you move away from anything you could use to hurt yourself or someone else and contact a trusted person who can stay with you now?",
    passages: [],
    reflection: "You do not have to manage this moment alone. Reaching a nearby person or emergency responder is the next priority.",
    prayer: "God, hold me in this moment and help me reach someone safe now. Give the people around me wisdom and urgency to help. Amen.",
    nextStep: "Call Nigeria’s national emergency number 112 now, or go to the nearest emergency department. If calling is difficult, message someone nearby: “I may be in danger. Please stay with me and help me call 112.”",
    safetyLevel: "emergency",
    source: "safety",
    supportNote: "Clarita is not an emergency service. In Nigeria, 112 is the national emergency number. If you are elsewhere, contact your local emergency number.",
  };
}
