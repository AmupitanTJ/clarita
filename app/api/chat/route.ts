import { getReviewedResponse, moods, type MoodId } from "@/data/clarita-content";
import {
  buildChatInput,
  CHAT_INSTRUCTIONS,
  chatReplyJsonSchema,
  inferConversationPhase,
  type ChatHistoryItem,
  type ChatReply,
} from "@/lib/chat";
import { classifyLocally } from "@/lib/safety";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const validMoods = new Set(moods.map((mood) => mood.id));

function extractOutputText(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const response = payload as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  if (response.output_text) return response.output_text;
  return response.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
}

function gratitudeFallback(message: string): ChatReply {
  return {
    message: `That is beautiful to hear. Gratitude can be a way of slowing down long enough to recognise that a good gift is not ordinary or owed to us. Your words—“${message.slice(0, 180)}”—can become a simple testimony of God’s kindness.`,
    biblicalConnections: [
      {
        name: "Hannah",
        reference: "1 Samuel 1:9–28; 2:1–10",
        testimony: "After years of grief and prayer, Hannah received Samuel and responded with worship, faithfulness, and a prayer celebrating God’s character.",
        connection: "Her gratitude did more than mark a happy moment; it helped her remember who God had been through both waiting and receiving.",
      },
      {
        name: "The grateful Samaritan",
        reference: "Luke 17:11–19",
        testimony: "After being healed, one man returned to Jesus, praised God, and gave thanks—and Jesus noticed his return.",
        connection: "His story shows the difference between receiving a gift and returning to the Giver with attention and thanks.",
      },
    ],
    question: "What happened today that made gratitude rise in you?",
    prayer: "God, thank you for the goodness I can see today. Keep me attentive to your mercy and help my gratitude become generosity, worship, and faithful living. Amen.",
    safetyLevel: "ordinary",
    source: "reviewed",
  };
}

function exploratoryFallback(message: string, mood: MoodId, history: ChatHistoryItem[]): ChatReply {
  const isFollowUp = history.some((item) => item.role === "assistant");
  const openings: Record<MoodId, string> = {
    worried: "I’m sorry something is weighing on you. You don’t have to explain it perfectly or all at once—I’m here to listen before trying to fix it.",
    sad: "I’m sorry this feels heavy. Take your time; I’d like to understand what happened before offering an answer.",
    lonely: "I’m glad you said it instead of carrying the loneliness silently. I’m here with you, and you can share only as much as feels comfortable.",
    grateful: "I’d love to hear what has stirred that gratitude in you. Let’s stay with your story before reaching for a lesson.",
    direction: "I’d like to understand where you feel uncertain before offering direction. You don’t need to have it all sorted out first.",
    faith: "That sounds worth exploring honestly and without rushing. I’d like to understand the question as you are experiencing it.",
  };
  const questions: Record<MoodId, string> = {
    worried: "What has been worrying you, and would you like me simply to listen, pray with you, encourage you, or help you think through it?",
    sad: "What has been feeling heavy, and would listening, prayer, encouragement, or help thinking it through serve you best right now?",
    lonely: "When do you feel the loneliness most strongly, and would you prefer company in conversation, prayer, encouragement, or practical ideas?",
    grateful: "What happened that made gratitude rise in you today?",
    direction: "What area do you need guidance in, and would you like prayer, biblical encouragement, or help thinking through a next step?",
    faith: "What question about faith has been sitting with you most, and would you like me to listen, explore Scripture with you, or pray with you?",
  };
  const followUpQuestions: Record<MoodId, string> = {
    worried: "What happened, or what thought keeps returning when this worry feels strongest?",
    sad: "What part of this has been hardest to carry today?",
    lonely: "What do you most wish someone understood or offered you in this situation?",
    grateful: "How has this changed the way you see God’s care in your life?",
    direction: `What about ${message.trim().replace(/[.:!?]+$/, "").toLowerCase()} feels uncertain—a decision, a delay, a closed door, or something else?`,
    faith: "What makes this faith question especially important to you right now?",
  };

  return {
    message: isFollowUp
      ? "Thank you—that gives me a clearer place to stay with you. We can take this one step at a time."
      : openings[mood],
    biblicalConnections: [],
    question: isFollowUp ? followUpQuestions[mood] : questions[mood],
    prayer: null,
    safetyLevel: "ordinary",
    source: "reviewed",
  };
}

function reviewedFallback(message: string, mood: MoodId, history: ChatHistoryItem[]): ChatReply {
  if (inferConversationPhase(message, history) === "explore") return exploratoryFallback(message, mood, history);
  if (/\b(grateful|thankful|thank\s+god|blessed|gratitude)\b/i.test(message) || mood === "grateful") return gratitudeFallback(message);
  const reviewed = getReviewedResponse(mood, message);
  return {
    message: `${reviewed.acknowledgement} ${reviewed.reflection}`,
    biblicalConnections: reviewed.passages.slice(0, 1).map((passage) => ({
      name: "A passage to sit with",
      reference: passage.reference,
      testimony: passage.context,
      connection: passage.relevance,
    })),
    question: reviewed.question,
    prayer: reviewed.prayer,
    safetyLevel: classifyLocally(message) === "sensitive" ? "sensitive" : "ordinary",
    source: "reviewed",
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.is_anonymous !== false) {
    return Response.json({ error: "Sign in to talk with Clarita." }, { status: 401 });
  }

  let body: { message?: unknown; mood?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const mood = typeof body.mood === "string" && validMoods.has(body.mood as MoodId) ? (body.mood as MoodId) : "faith";
  const history = Array.isArray(body.history)
    ? body.history
        .filter((item): item is ChatHistoryItem => Boolean(item) && typeof item === "object" && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
        .slice(-12)
        .map((item) => ({ role: item.role, content: item.content.slice(0, 3000) }))
    : [];

  if (!message || message.length > 3000) return Response.json({ error: "Please write a message up to 3,000 characters." }, { status: 400 });

  const safety = classifyLocally(message);
  if (safety === "emergency") {
    return Response.json({
      message: "I’m really sorry you’re facing this. Your immediate safety matters more than continuing a long conversation here. Please move away from anything you could use to hurt yourself or someone else and contact a trusted person who can stay with you now.",
      biblicalConnections: [],
      question: "Can you call Nigeria’s emergency number 112 now, or ask someone nearby to call and stay with you?",
      prayer: "God, hold me in this moment and help me reach someone safe now. Give the people around me wisdom and urgency to help. Amen.",
      safetyLevel: "emergency",
      source: "safety",
      supportNote: "Clarita is not an emergency service. In Nigeria, call 112 or go to the nearest emergency department. If you are elsewhere, contact your local emergency number.",
    } satisfies ChatReply);
  }

  const reviewed = getReviewedResponse(mood, message);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json(reviewedFallback(message, mood, history));

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        store: false,
        instructions: CHAT_INSTRUCTIONS,
        input: buildChatInput({ message, mood, history, passages: reviewed.passages, locallySensitive: safety === "sensitive" }),
        text: { format: { type: "json_schema", name: "clarita_chat_reply", strict: true, schema: chatReplyJsonSchema } },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Responses API returned ${response.status}`);
    const outputText = extractOutputText(await response.json());
    if (!outputText) throw new Error("Responses API returned no output text");
    const reply = JSON.parse(outputText) as Omit<ChatReply, "source">;
    return Response.json({ ...reply, source: "generated" } satisfies ChatReply);
  } catch (error) {
    console.error("Clarita chat fell back to reviewed content", error instanceof Error ? error.message : "unknown error");
    return Response.json(reviewedFallback(message, mood, history));
  }
}
