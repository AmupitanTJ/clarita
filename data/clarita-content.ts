export type MoodId = "worried" | "sad" | "lonely" | "grateful" | "direction" | "faith";

export type ScriptureCardData = {
  reference: string;
  translation: string;
  excerpt: string;
  context: string;
  relevance: string;
};

export type ReviewedResponse = {
  acknowledgement: string;
  question: string;
  passages: ScriptureCardData[];
  reflection: string;
  prayer: string;
  nextStep: string;
};

export const moods: { id: MoodId; label: string; symbol: string }[] = [
  { id: "worried", label: "Worried", symbol: "~" },
  { id: "sad", label: "Sad", symbol: "◡" },
  { id: "lonely", label: "Lonely", symbol: "○" },
  { id: "grateful", label: "Grateful", symbol: "✦" },
  { id: "direction", label: "Seeking direction", symbol: "↗" },
  { id: "faith", label: "Questions of faith", symbol: "?" },
];

const commonPassages = {
  worried: [
    {
      reference: "Matthew 6:25–34",
      translation: "World English Bible",
      excerpt: "Therefore don’t be anxious for tomorrow, for tomorrow will be anxious for itself.",
      context:
        "This comes from Jesus’ Sermon on the Mount, where he teaches his followers to seek God’s kingdom while trusting God with ordinary needs.",
      relevance:
        "The passage does not shame anxious feelings. It invites attention back to today and to God’s steady care.",
    },
    {
      reference: "Philippians 4:4–9",
      translation: "World English Bible",
      excerpt: "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God.",
      context:
        "Paul wrote this from imprisonment to a church facing pressure. His words about peace were formed in hardship, not comfort.",
      relevance:
        "It gives worry somewhere to go: honest requests, practiced gratitude, and attention to what is true.",
    },
  ],
  sad: [
    {
      reference: "Psalm 42:1–11",
      translation: "World English Bible",
      excerpt: "Why are you in despair, my soul? Why are you disturbed within me? Hope in God!",
      context:
        "The psalmist speaks to God from a place of absence and deep longing. Sorrow and hope remain present together.",
      relevance:
        "This passage makes room for sadness rather than rushing past it, while gently remembering that despair is not the whole story.",
    },
  ],
  lonely: [
    {
      reference: "Psalm 139:1–12",
      translation: "World English Bible",
      excerpt: "If I take the wings of the dawn, and settle in the uttermost parts of the sea; even there your hand will lead me.",
      context:
        "David’s prayer reflects on being completely known by God—in every place, thought, and season.",
      relevance:
        "It offers the quiet assurance that isolation does not make you unseen, while leaving room to seek human companionship too.",
    },
  ],
  grateful: [
    {
      reference: "Psalm 103:1–5",
      translation: "World English Bible",
      excerpt: "Praise Yahweh, my soul, and don’t forget all his benefits.",
      context:
        "This psalm deliberately remembers God’s mercy and care. Gratitude becomes an act of attentive remembrance.",
      relevance:
        "It can help you name the goodness you have noticed and turn it into a simple prayer of thanks.",
    },
  ],
  direction: [
    {
      reference: "James 1:5–8",
      translation: "World English Bible",
      excerpt: "But if any of you lacks wisdom, let him ask of God, who gives to all liberally and without reproach.",
      context:
        "James writes to believers under pressure, connecting wisdom with patient, faithful action in real trials.",
      relevance:
        "The invitation is to ask for wisdom without pretending certainty—and then to act with integrity on what is clear.",
    },
  ],
  faith: [
    {
      reference: "Mark 9:14–29",
      translation: "World English Bible",
      excerpt: "I believe. Help my unbelief!",
      context:
        "A desperate father brings both trust and doubt to Jesus in the same honest sentence.",
      relevance:
        "The story suggests that honest uncertainty can be brought into prayer; faith does not require pretending that questions have vanished.",
    },
  ],
} satisfies Record<MoodId, ScriptureCardData[]>;

const acknowledgement: Record<MoodId, string> = {
  worried: "It sounds as though your mind has been carrying more than it can comfortably hold.",
  sad: "It sounds as though today feels heavy. You do not need to hurry past that here.",
  lonely: "Feeling alone can make even ordinary moments feel harder. Thank you for naming it.",
  grateful: "There is something good you want to notice and hold onto. That gratitude matters.",
  direction: "Not knowing which way to move can be tiring, especially when the decision matters deeply.",
  faith: "Questions about faith can feel vulnerable. You are welcome to bring them honestly, without performing certainty.",
};

export function getReviewedResponse(mood: MoodId, userText: string): ReviewedResponse {
  const hasDetails = userText.trim().length > 35;
  return {
    acknowledgement: acknowledgement[mood],
    question: hasDetails
      ? "Would you like to stay with what happened, or look at what these passages may offer first?"
      : "Would comfort, understanding, or a little space to talk help most right now?",
    passages: commonPassages[mood],
    reflection:
      mood === "grateful"
        ? "What specific gift from today would you like to remember a week from now?"
        : "What feels most important to place honestly before God—without trying to make it sound better than it is?",
    prayer:
      mood === "grateful"
        ? "God, thank you for the goodness I noticed today. Help me receive it with humility and share that goodness with someone else. Amen."
        : "God, you see what I am carrying. Meet me with wisdom and steady care. Help me receive what is true, ask for the support I need, and take the next faithful step. Amen.",
    nextStep:
      mood === "lonely"
        ? "Read the full passage slowly, then send one simple message to someone safe: “Could we talk today?”"
        : "Take two quiet minutes with the full passage. Write one sentence about what is within your control today.",
  };
}
