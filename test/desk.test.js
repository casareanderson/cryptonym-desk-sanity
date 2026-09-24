import { test } from "node:test";
import assert from "node:assert/strict";
import { build, mash, parts, rng, weighted } from "../src/lib/desk.js";
import { shape, BANKS } from "../src/lib/corpus.js";

const bank = (...values) => values.map((value) => ({ value, weight: 1 }));
const raw = {
  digraphs: [{ code: "AE" }, { code: "QK" }, { code: "LI" }],
  banks: BANKS.flatMap((b) => ["ONE", "TWO", "THREE"].map((v) => ({ bank: b, value: v, weight: 1 }))),
  presets: [{ label: "Cyberpunk", seeds: ["Blade Runner", "Motoko Kusanagi"] }],
  revs: [{ _id: "a", _rev: "1" }],
};

test("same seeds + salt + corpus rebuild the same record", () => {
  const c = shape(raw);
  const seeds = ["Cowboy Bebop", "Spike Spiegel", "Faye Valentine"];
  assert.deepEqual(build(c, seeds, 42), build(c, seeds, 42));
  assert.notDeepEqual(build(c, seeds, 42), build(c, seeds, 43));
});

test("the record carries the corpus revision it was drawn from", () => {
  const c = shape(raw);
  assert.equal(build(c, ["Akira"], 1).corpus, c.rev);
  const edited = shape({ ...raw, revs: [{ _id: "a", _rev: "2" }] });
  assert.notEqual(edited.rev, c.rev);
});

test("empty seed material still produces a whole record", () => {
  const rec = build(shape(raw), [], 1);
  for (const [k, v] of Object.entries(rec)) assert.ok(v !== undefined && v !== "", k);
});

test("weighted pick honours weights", () => {
  const r = rng(12345);
  const entries = [{ value: "rare", weight: 1 }, { value: "common", weight: 9 }];
  let common = 0;
  for (let i = 0; i < 10000; i++) if (weighted(entries, r) === "common") common++;
  assert.ok(common > 8700 && common < 9300, `common=${common}`);
});

test("mash collapses a tripled letter at the seam", () => {
  for (let s = 1; s < 500; s++) assert.doesNotMatch(mash("Ripley", "Apple", rng(s)), /(.)\1\1/i);
});

test("vowel-group splitter is the crude one on purpose", () => {
  assert.deepEqual(parts("Spiegel"), ["Spie", "gel"]);
  assert.deepEqual(parts("Kusanagi"), ["Ku", "sa", "na", "gi"]);
  assert.deepEqual(parts("Deckard"), ["De", "ckard"]);
  assert.deepEqual(parts("Rhythm"), ["Rhythm"]);
});

test("the README's worked example is actually reachable", () => {
  const seen = new Set();
  for (let s = 1; s < 200; s++) seen.add(mash("Spiegel", "Kusanagi", rng(s)));
  assert.ok(seen.has("Spienagi"), [...seen].join(","));
});

test("every part of the split rejoins to the original word", () => {
  for (const w of ["Spiegel", "Valentine", "Motoko", "Nausicaa", "McCauley", "Strength", "Aeon"]) {
    assert.equal(parts(w).join(""), w);
  }
});

test("the build refuses a corpus the page cannot use", () => {
  assert.throws(() => shape({ ...raw, banks: raw.banks.filter((e) => e.bank !== "noun") }), /bank "noun" is empty/);
  assert.throws(() => shape({ ...raw, banks: [...raw.banks, { bank: "adj", value: "X", weight: 0 }] }), /weight must be > 0/);
  assert.throws(() => shape({ ...raw, banks: [...raw.banks, { bank: "verbs", value: "X", weight: 1 }] }), /unknown bank/);
  assert.throws(() => shape({ ...raw, digraphs: [] }), /no active digraphs/);
});
