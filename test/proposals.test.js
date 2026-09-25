import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BANKS as PBANKS, TRANSITIONS, STATUSES, canMove, move, planMerge, mergeMutations, moveMutations, wordBankId, normalise, problems,
} from "../src/lib/proposals.js";
import { BANKS } from "../src/lib/corpus.js";

const at = "2026-09-25T10:00:00.000Z";
const base = {
  _id: "wordProposal-cistern", _rev: "r1", _type: "wordProposal",
  word: "cistern", bank: "noun", weight: 1, rationale: "Drab and municipal.", status: "approved",
  history: [{ _key: "a", status: "proposed", at }],
};
const bankEntries = [
  { _id: "noun-6", bank: "noun", value: "MERIDIAN" },
  { _id: "noun-3", bank: "noun", value: "LEDGER" },
];

test("the proposal module knows the same banks the build does", () => {
  assert.deepEqual(PBANKS, BANKS);
});

test("every status has an entry in the transition table and merged is terminal", () => {
  assert.deepEqual(Object.keys(TRANSITIONS).sort(), [...STATUSES].sort());
  assert.deepEqual(TRANSITIONS.merged, []);
});

test("review cannot be skipped", () => {
  assert.equal(canMove("proposed", "merged"), false);
  assert.equal(canMove("proposed", "approved"), false);
  assert.equal(canMove("in_review", "merged"), false);
  assert.throws(() => move({ ...base, status: "proposed" }, "merged", { at, key: "k" }), /cannot move proposed -> merged/);
  assert.throws(() => move({ ...base, status: "merged" }, "in_review", { at, key: "k" }), /cannot move merged/);
});

test("a rejection needs a reviewer note", () => {
  const p = { ...base, status: "in_review" };
  assert.throws(() => move(p, "rejected", { at, key: "k" }), /reviewer note/);
  const ok = move(p, "rejected", { at, key: "k", note: "Too dramatic." });
  assert.deepEqual(ok.set, { status: "rejected", reviewerNote: "Too dramatic." });
  assert.deepEqual(ok.append, { _type: "historyEntry", _key: "k", status: "rejected", at, note: "Too dramatic." });
});

test("an invalid proposal cannot be approved", () => {
  const p = { ...base, status: "in_review", bank: "verbs" };
  assert.deepEqual(problems(p), ['unknown bank "verbs"']);
  assert.throws(() => move(p, "approved", { at, key: "k" }), /cannot approve: unknown bank/);
  assert.throws(() => move({ ...base, status: "in_review", weight: 0 }, "approved", { at, key: "k" }), /weight must be > 0/);
});

test("merge creates a capitalised wordBank entry with a deterministic id", () => {
  const plan = planMerge(base, bankEntries, { at, key: "k", by: "reviewer" });
  assert.equal(plan.kind, "create");
  assert.deepEqual(plan.create, { _id: "noun-p-cistern", _type: "wordBank", bank: "noun", value: "CISTERN", weight: 1 });
  assert.equal(wordBankId({ bank: "noun", word: " Cistern " }), "noun-p-cistern");
  assert.deepEqual(plan.patch.set, { status: "merged", mergedAs: { _type: "reference", _ref: "noun-p-cistern", _weak: true } });
  assert.equal(plan.patch.append.by, "reviewer");
});

test("merging a word already in the bank does not create a duplicate (the MERIDIAN bug)", () => {
  const plan = planMerge({ ...base, word: "meridian" }, bankEntries, { at, key: "k" });
  assert.equal(plan.kind, "duplicate");
  assert.equal(plan.create, null);
  assert.equal(plan.targetId, "noun-6");
  const muts = mergeMutations(base, plan);
  assert.equal(muts.length, 1);
  assert.ok(!("createIfNotExists" in muts[0]));
});

test("merge is one transaction pinned to the proposal revision", () => {
  const plan = planMerge(base, bankEntries, { at, key: "k" });
  const muts = mergeMutations(base, plan);
  assert.equal(muts.length, 2);
  assert.equal(muts[0].createIfNotExists._id, "noun-p-cistern");
  assert.equal(muts[1].patch.id, base._id);
  assert.equal(muts[1].patch.ifRevisionID, "r1");
  assert.deepEqual(muts[1].patch.insert, { after: "history[-1]", items: [plan.patch.append] });
});

test("non-codename banks keep the proposer's case", () => {
  assert.equal(normalise("stations", "  Asmara "), "Asmara");
  assert.equal(normalise("adj", "overcast"), "OVERCAST");
  assert.equal(wordBankId({ bank: "cover_firm", word: "Hallam & Rye" }), "cover_firm-p-hallam-rye");
  assert.equal(wordBankId({ bank: "stations", word: "Asmará" }), "stations-p-asmara");
});

test("a plain move appends history and pins the revision", () => {
  const p = { ...base, status: "proposed" };
  const [m] = moveMutations(p, move(p, "in_review", { at, key: "k2" }));
  assert.equal(m.patch.ifRevisionID, "r1");
  assert.deepEqual(m.patch.set, { status: "in_review" });
  assert.equal(m.patch.insert.items[0].status, "in_review");
});
