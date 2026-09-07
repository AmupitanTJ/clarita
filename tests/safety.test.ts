import assert from "node:assert/strict";
import test from "node:test";
import { classifyLocally } from "../lib/safety.ts";

test("classifies ordinary emotional language without escalating it", () => {
  assert.equal(classifyLocally("I feel worried about a decision at work"), "ordinary");
});

test("recognises direct and indirect immediate-risk language", () => {
  const examples = [
    "I want to end my life",
    "I am better off dead",
    "I wan die",
    "I plan to overdose",
    "There is a weapon near me and I may hurt myself",
  ];
  for (const example of examples) assert.equal(classifyLocally(example), "emergency", example);
});

test("recognises abuse and mental-health disclosures as sensitive", () => {
  const examples = [
    "I am experiencing domestic violence",
    "Someone forced me",
    "I had a panic attack",
    "I feel hopeless",
    "I do not feel safe at home",
  ];
  for (const example of examples) assert.equal(classifyLocally(example), "sensitive", example);
});
