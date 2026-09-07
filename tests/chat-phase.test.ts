import assert from "node:assert/strict";
import test from "node:test";
import { buildChatInput, ensurePrayerEnding, inferConversationIntent, inferConversationPhase, REQUIRED_PRAYER_ENDING, type ChatHistoryItem } from "../lib/chat.ts";

const noHistory: ChatHistoryItem[] = [];

test("asks for context when the opening is broad", () => {
  assert.equal(inferConversationPhase("I need guidance", noHistory), "explore");
  assert.equal(inferConversationPhase("Something has been worrying me", noHistory), "explore");
});

test("moves to tailored support when the person gives situational detail", () => {
  assert.equal(
    inferConversationPhase("I need direction because I was offered a new job in another city", noHistory),
    "support",
  );
});

test("continues with support after a detailed earlier disclosure", () => {
  const history: ChatHistoryItem[] = [
    { role: "user", content: "My family expects me to take the job, but I am afraid of leaving my church and support system." },
    { role: "assistant", content: "Thank you for explaining that tension. Which part feels hardest?" },
  ];
  assert.equal(inferConversationPhase("The thought of being alone", history), "support");
});

test("recognises a clear request to pray without asking permission again", () => {
  assert.equal(inferConversationIntent("Yes please, let's pray together"), "pray");
  assert.equal(inferConversationIntent("okay lets pray together"), "pray");
  assert.equal(inferConversationIntent("Can you pray for me?"), "pray");
  assert.equal(inferConversationIntent("I would like us to pray"), "pray");
});

test("keeps listening when the person chooses to talk more", () => {
  assert.equal(inferConversationIntent("I would like to keep talking about this"), "talk_more");
  assert.equal(inferConversationIntent("I am not ready to pray, please listen to me"), "talk_more");
});

test("passes an explicit prayer choice to the model even when the message is brief", () => {
  const input = JSON.parse(buildChatInput({
    message: "Let's pray",
    mood: "worried",
    history: [],
    passages: [],
    locallySensitive: false,
  })) as { user_intent_hint: string; conversation_phase_hint: string };
  assert.equal(input.user_intent_hint, "pray");
  assert.equal(input.conversation_phase_hint, "explore");
});

test("enforces the required prayer ending without duplicating an existing amen", () => {
  assert.equal(
    ensurePrayerEnding("Father, give me wisdom. In Jesus’ name, amen."),
    `Father, give me wisdom. ${REQUIRED_PRAYER_ENDING}`,
  );
  assert.equal(
    ensurePrayerEnding(`Father, give me wisdom. ${REQUIRED_PRAYER_ENDING}`),
    `Father, give me wisdom. ${REQUIRED_PRAYER_ENDING}`,
  );
  assert.equal(ensurePrayerEnding(null), null);
});
