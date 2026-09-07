import type { HeartGuidance } from "@/lib/heart";

const IMMEDIATE_RISK_PATTERNS = [
  /\b(kill|hurt)\s+(myself|me)\b/i,
  /\b(kill|hurt)\s+(someone|somebody|him|her|them)\b/i,
  /\b(end|take)\s+my\s+(life|own life)\b/i,
  /\bsuicid(?:e|al)\b/i,
  /\b(?:do not|don['’]?t|no)\s+want\s+to\s+(live|be alive)\b/i,
  /\b(?:want|plan|intend|going|about)\s+to\s+(?:die|end it|overdose|harm myself)\b/i,
  /\b(?:i\s+wan\s+die|make\s+i\s+die|i\s+no\s+wan\s+live)\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\bno\s+(?:reason|point)\s+(?:to|in)\s+(?:live|living)\b/i,
  /\b(?:jump|throw myself)\s+(?:off|from)\b/i,
  /\bgoing to (kill|hurt)\s+(myself|someone)\b/i,
  /\bimmediate danger\b/i,
  /\bweapon\b.*\b(now|with me|near me)\b/i,
];

const SENSITIVE_PATTERNS = [
  /\b(abuse|abusive|assault|rape|raped|violence|violent|traffick(?:ed|ing)?)\b/i,
  /\b(domestic violence|sexual assault|being beaten|threatened me|forced me|coerced me)\b/i,
  /\bself[- ]?harm\b/i,
  /\b(hopeless|worthless|better off without me|can['’]?t go on)\b/i,
  /\b(panic attack|depress(?:ed|ion)|eating disorder|overdose)\b/i,
  /\b(not safe|do not feel safe|don['’]?t feel safe|unsafe|in danger|afraid of (?:him|her|them|someone))\b/i,
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
    nextStep: "Call your local emergency number now or go to the nearest emergency department. If you are in Nigeria, call 112. If calling is difficult, message someone nearby: “I may be in danger. Please stay with me and help me get urgent support.”",
    safetyLevel: "emergency",
    source: "safety",
    supportNote: "Clarita is not an emergency service. If you are in Nigeria, call 112. If you are elsewhere, contact your local emergency number now.",
  };
}
