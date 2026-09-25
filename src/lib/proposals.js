// Word-proposal review workflow: the rules, with no I/O.
//
// The workflow state lives in the dataset as ordinary documents - a
// `wordProposal` carries its own `status` and an append-only `history` - so
// there is no second database to drift out of step with the content. This
// module only decides: which move is legal, what the patch is, and what a merge
// writes. The Studio actions, the App SDK queue and scripts/proposals.mjs all
// call it, so every surface enforces the same rules. No dependencies, so the
// Studio, the app and node:test can all import it.

export const BANKS = ["stations", "directorates", "clearances", "cover_role", "cover_firm", "adj", "noun"];

export const STATUSES = ["proposed", "in_review", "approved", "rejected", "merged"];

// Every legal move. `merged` is terminal; a rejection can be reopened.
export const TRANSITIONS = {
  proposed: ["in_review", "rejected"],
  in_review: ["approved", "rejected"],
  approved: ["merged", "in_review"],
  rejected: ["proposed"],
  merged: [],
};

// Codename words are shown in capitals (the wordBank schema says so); the
// other banks keep the case the proposer typed.
const CAPITALS = new Set(["adj", "noun"]);

export function canMove(from, to) {
  return (TRANSITIONS[from] ?? []).includes(to);
}

export function normalise(bank, word) {
  const w = String(word ?? "").trim().replace(/\s+/g, " ");
  return CAPITALS.has(bank) ? w.toUpperCase() : w;
}

// A key that ignores case and spacing, for spotting duplicates.
export const sameWord = (a, b) => normalise("noun", a) === normalise("noun", b);

export function slug(s) {
  return String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// The wordBank _id a merge writes. Deterministic, so merging the same proposal
// twice (a double click, a retried script) lands on the same document.
export function wordBankId(p) {
  return `${p.bank}-p-${slug(normalise(p.bank, p.word))}`;
}

// What must be true of a proposal before it can be approved or merged. The
// same rules the Astro build enforces on the corpus, applied one step earlier.
export function problems(p) {
  const out = [];
  if (!BANKS.includes(p.bank)) out.push(`unknown bank "${p.bank}"`);
  if (!normalise(p.bank, p.word)) out.push("no word");
  if (p.weight !== undefined && !(p.weight > 0)) out.push(`weight must be > 0 (got ${p.weight})`);
  if (!String(p.rationale ?? "").trim()) out.push("no rationale");
  return out;
}

export function historyEntry(status, at, note, key, by) {
  const e = { _type: "historyEntry", _key: key, status, at };
  if (note) e.note = note;
  if (by) e.by = by;
  return e;
}

// The patch that moves a proposal. Throws on an illegal move, so a surface
// cannot skip review (proposed -> merged) or resurrect a merged word.
export function move(p, to, { at, note, key, by } = {}) {
  const from = p.status ?? "proposed";
  if (!STATUSES.includes(to)) throw new Error(`unknown status "${to}"`);
  if (!canMove(from, to)) throw new Error(`cannot move ${from} -> ${to}`);
  if ((to === "approved" || to === "merged") && problems(p).length) {
    throw new Error(`cannot ${to === "merged" ? "merge" : "approve"}: ${problems(p).join("; ")}`);
  }
  if (to === "rejected" && !String(note ?? "").trim()) throw new Error("a rejection needs a reviewer note");
  const set = { status: to };
  if (note && to !== "merged") set.reviewerNote = note;
  return { set, append: historyEntry(to, at, note, key, by) };
}

// Weak, so a merged word can still be deleted from the bank later.
const ref = (id) => ({ _type: "reference", _ref: id, _weak: true });

// The merge plan. `existing` is every wordBank entry already in the proposal's
// bank. If the word is already there, the merge does NOT create a second
// document: that is how MERIDIAN ended up in the noun bank twice in the
// original desk and got drawn twice as often. It records the proposal against
// the existing entry instead and leaves its weight alone.
export function planMerge(p, existing, opts = {}) {
  const patch = move(p, "merged", opts);
  const word = normalise(p.bank, p.word);
  const dupe = existing.find((e) => e.bank === p.bank && sameWord(e.value, word));
  if (dupe) {
    return { kind: "duplicate", targetId: dupe._id, create: null, patch: { ...patch, set: { ...patch.set, mergedAs: ref(dupe._id) } } };
  }
  const targetId = wordBankId(p);
  const create = { _id: targetId, _type: "wordBank", bank: p.bank, value: word, weight: p.weight ?? 1 };
  return { kind: "create", targetId, create, patch: { ...patch, set: { ...patch.set, mergedAs: ref(targetId) } } };
}

// Turn a plan into Sanity mutations: one transaction, and the proposal patch is
// pinned to the revision the plan was made from, so two reviewers merging at
// once cannot both succeed.
export function moveMutations(p, patch) {
  return [{
    patch: {
      id: p._id,
      ifRevisionID: p._rev,
      set: patch.set,
      setIfMissing: { history: [] },
      insert: { after: "history[-1]", items: [patch.append] },
    },
  }];
}

export function mergeMutations(p, plan) {
  return [...(plan.create ? [{ createIfNotExists: plan.create }] : []), ...moveMutations(p, plan.patch)];
}

// A short random _key for array items (Sanity needs one on every object in an array).
export const newKey = () => Math.random().toString(36).slice(2, 12);
