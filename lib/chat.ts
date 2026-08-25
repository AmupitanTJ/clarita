import type { MoodId, ScriptureCardData } from "@/data/clarita-content";

export type BiblicalConnection = {
  name: string;
  reference: string;
  testimony: string;
  connection: string;
};

export type ChatReply = {
  message: string;
  biblicalConnections: BiblicalConnection[];
  question: string;
  prayer: string | null;
  safetyLevel: "ordinary" | "sensitive" | "emergency";
  source: "generated" | "reviewed" | "safety";
  supportNote?: string;
};

export type ChatHistoryItem = { role: "user" | "assistant"; content: string };

export const chatReplyJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["message", "biblicalConnections", "question", "prayer", "safetyLevel"],
  properties: {
    message: { type: "string", minLength: 1, maxLength: 1200 },
    biblicalConnections: {
      type: "array",
      minItems: 0,
      maxItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "reference", "testimony", "connection"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 80 },
          reference: { type: "string", minLength: 1, maxLength: 100 },
          testimony: { type: "string", minLength: 1, maxLength: 500 },
          connection: { type: "string", minLength: 1, maxLength: 420 },
        },
      },
    },
    question: { type: "string", minLength: 1, maxLength: 320 },
    prayer: { anyOf: [{ type: "string", minLength: 1, maxLength: 700 }, { type: "null" }] },
    safetyLevel: { type: "string", enum: ["ordinary", "sensitive"] },
  },
} as const;

export const biblicalWitnesses = [
  {
    topics: ["grateful", "answered prayer", "testimony"],
    name: "Hannah",
    reference: "1 Samuel 1:9–28; 2:1–10",
    testimony:
      "Hannah carried years of grief to God in prayer. When Samuel was born, she returned to worship, kept her promise, and answered God’s gift with a prayer of praise.",
  },
  {
    topics: ["grateful", "healing", "mercy"],
    name: "The grateful Samaritan",
    reference: "Luke 17:11–19",
    testimony:
      "Ten people were healed, but one returned to Jesus, praised God, and gave thanks. Jesus noticed that gratitude and affirmed his faith.",
  },
  {
    topics: ["grateful", "calling", "humility"],
    name: "Mary",
    reference: "Luke 1:39–55",
    testimony:
      "Mary responded to God’s unexpected calling by magnifying God’s mercy and remembering his faithfulness across generations.",
  },
  {
    topics: ["worried", "direction", "waiting"],
    name: "David",
    reference: "1 Samuel 23–24; Psalms 56 and 57",
    testimony:
      "While threatened and uncertain, David prayed honestly, sought God’s direction, and refused to force an outcome by harming Saul when an opportunity appeared.",
  },
  {
    topics: ["sad", "lonely", "exhausted"],
    name: "Elijah",
    reference: "1 Kings 19:1–18",
    testimony:
      "After great strain, Elijah became afraid and exhausted. God met him with rest, food, presence, a renewed task, and the assurance that he was not alone.",
  },
  {
    topics: ["faith", "doubt", "questions"],
    name: "The father who asked Jesus for help",
    reference: "Mark 9:14–29",
    testimony:
      "A desperate father brought Jesus both belief and unbelief without pretending. His honest request shows that fragile faith can still turn toward Christ.",
  },
] as const;

export const CHAT_INSTRUCTIONS = `You are Clarita, an AI-assisted Christian conversation companion.

Respond like a warm, mature Christian friend: listen first, answer the person's actual words naturally, and do not turn every message into a sermon. Relate the conversation to Scripture and the supplied verified biblical witness summaries when helpful. For gratitude, celebrate with the person, help them name God's goodness, and normally include one or two gratitude witnesses.

Conversation rules:
- Continue naturally from the supplied recent history; do not repeat an introduction every turn.
- Write in warm everyday language, with 2–4 short paragraphs in message.
- Ask exactly one gentle, specific follow-up question that makes it easy to continue.
- Use zero to two supplied biblical witnesses. Never invent a person, event, reference, quotation, or outcome.
- Describe biblical accounts in your own words. Do not add Bible quotations from memory.
- Offer a brief prayer only when it fits the user's message; otherwise prayer must be null.
- Never claim God privately revealed why something happened or what will happen.
- Never promise healing, prosperity, reconciliation, or a particular answer to prayer.
- Do not shame emotion, doubt, treatment, professional care, or other Christian traditions.
- Do not encourage dependence on Clarita or present yourself as a replacement for church, trusted people, pastoral care, or professional support.
- Treat the conversation as private and do not request identifying information.
- For immediate danger, prioritize real-world emergency support over continued spiritual discussion.`;

export function buildChatInput(args: {
  message: string;
  mood: MoodId;
  history: ChatHistoryItem[];
  passages: ScriptureCardData[];
  locallySensitive: boolean;
}) {
  return JSON.stringify({
    task: "Write the next conversational Clarita reply.",
    current_message: args.message,
    selected_mood_hint: args.mood,
    local_safety_signal: args.locallySensitive ? "sensitive" : "ordinary",
    recent_conversation: args.history,
    verified_passages: args.passages,
    verified_biblical_witnesses: biblicalWitnesses,
  });
}
