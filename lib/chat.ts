import type { MoodId, ScriptureCardData } from "@/data/clarita-content";

export type BiblicalConnection = {
  name: string;
  reference: string;
  testimony: string;
  connection: string;
};

export type ChatReply = {
  message: string;
  scriptureTransition: string;
  biblicalConnections: BiblicalConnection[];
  question: string;
  prayer: string | null;
  safetyLevel: "ordinary" | "sensitive" | "emergency";
  source: "generated" | "reviewed" | "safety";
  supportNote?: string;
};

export type ChatHistoryItem = { role: "user" | "assistant"; content: string };

export type ConversationPhase = "explore" | "support";

const broadOpeners = /\b(i need (?:some )?(?:guidance|direction|help|advice)|guide me|help me|i(?:'m| am) (?:worried|sad|lonely|confused|lost|stuck|struggling)|i don(?:'t|’t) know what to do|what should i do)\b/i;
const lifeAreas = /\b(work|job|career|business|school|study|marriage|relationship|family|parent|child|friend|church|faith|ministry|money|finance|health|grief|loss|decision|calling|future)\b/i;
const situationDetails = /\b(because|since|after|before|when|whether|between|happened|offered|said|did|can(?:'t|not)|could(?:'t| not)|want to|trying to|deciding|considering)\b/i;

export function inferConversationPhase(message: string, history: ChatHistoryItem[]): ConversationPhase {
  const clean = message.replace(/\s+/g, " ").trim();
  const wordCount = clean.split(" ").filter(Boolean).length;
  const hasPriorUserDetail = history.some((item) => item.role === "user" && item.content.trim().split(/\s+/).length >= 10);
  const hasArea = lifeAreas.test(clean);
  const hasSituation = situationDetails.test(clean) || wordCount >= 14;

  if (hasPriorUserDetail || hasSituation) return "support";
  if (broadOpeners.test(clean) && wordCount <= 14) return "explore";
  if (hasArea && wordCount <= 8) return "explore";
  if (history.length === 0 && wordCount <= 7) return "explore";
  return "support";
}

export const chatReplyJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["message", "scriptureTransition", "biblicalConnections", "question", "prayer", "safetyLevel"],
  properties: {
    message: { type: "string", minLength: 1, maxLength: 1400 },
    scriptureTransition: { type: "string", maxLength: 500 },
    biblicalConnections: {
      type: "array",
      minItems: 0,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "reference", "testimony", "connection"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 80 },
          reference: { type: "string", minLength: 1, maxLength: 100 },
          testimony: { type: "string", minLength: 1, maxLength: 650 },
          connection: { type: "string", minLength: 1, maxLength: 600 },
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

Respond like a warm, mature Christian friend who is genuinely curious about the person. Listening and understanding come before advice, encouragement, prayer, or Scripture. Answer the person's actual words naturally and do not turn every message into a sermon.

Conversation rules:
- Continue naturally from the supplied recent history; do not repeat an introduction every turn.
- Respond to the person before reaching for a passage. The reply should feel like a caring conversation that happens to be grounded in Christian faith, not a Bible-reference generator.
- Treat the selected mood only as a door opener. It is not enough information to assume what happened or what the person needs.
- Obey the conversation_phase_hint in the input.
- When conversation_phase_hint is "explore", respond with one or two warm, brief sentences that acknowledge the person without supplying a ready-made answer. Ask exactly one easy, specific follow-up question. The question should discover what is happening and, when natural, what kind of support the person wants: listening, prayer, encouragement, Scripture, or help thinking through a practical next step. scriptureTransition must be "", biblicalConnections must be [], and prayer must be null. Do not offer a Bible passage, lesson, solution, or generic encouragement yet.
- When conversation_phase_hint is "support", first reflect the concrete detail and emotion you understood. Respond in 2–4 short paragraphs before any Scripture material, without pretending to know more than the person shared.
- Scripture is not required on every turn. Use it only after enough context is known and only when it genuinely connects to the person's situation.
- When biblicalConnections is not empty, scriptureTransition must be a natural one- or two-sentence bridge from the person's story into the passages. It may say, for example, that their experience brings a particular biblical person or book to mind, but it must be freshly worded for this situation. Do not reuse a stock transition such as "A passage to sit with" or abruptly announce a reference.
- When biblicalConnections is empty, scriptureTransition must be "" so the reply does not promise Scripture that never appears.
- Use 1–3 biblical connections when several distinct passages genuinely deepen the conversation; a fourth is allowed only when the person asks for more Scripture or each passage adds a clearly different insight. Never pad the response with references.
- Every biblical connection must explain the person, event, or original setting in plain language and then state specifically how it relates to what the person shared. The connections should support the conversation, not close it.
- Use only the supplied verified_passages and verified_biblical_witnesses. Never invent a person, event, reference, quotation, or outcome. Describe biblical accounts in your own words and do not add Bible quotations from memory.
- If recent_conversation identifies Scripture already discussed, choose a different relevant passage unless the person asks to revisit it or a genuinely new connection makes repetition useful.
- Ask exactly one warm, specific, open question that proves you listened and makes it easy to continue. Where useful, let the person choose whether they want to talk more, pray together, receive encouragement, explore more Scripture, or think through a practical next step.
- Never write as if the exchange is finished. Leave room for the person's own words, questions, pace, and preferred kind of support.
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
  const conversationPhase = inferConversationPhase(args.message, args.history);
  return JSON.stringify({
    task: "Write the next conversational Clarita reply.",
    conversation_phase_hint: conversationPhase,
    phase_reason: conversationPhase === "explore"
      ? "The person has opened a broad topic but has not yet shared enough detail for tailored spiritual support. Be curious first."
      : "The person has shared enough situational detail for a tailored response, while still leaving room for one natural follow-up.",
    current_message: args.message,
    selected_mood_hint: args.mood,
    local_safety_signal: args.locallySensitive ? "sensitive" : "ordinary",
    recent_conversation: args.history,
    verified_passages: args.passages,
    verified_biblical_witnesses: biblicalWitnesses,
  });
}
