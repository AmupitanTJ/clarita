import assert from "node:assert/strict";
import test from "node:test";
import { inferConversationPhase, type ChatHistoryItem } from "../lib/chat.ts";

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
