#!/usr/bin/env node
// Seed the word proposals the review queue was demonstrated with. Idempotent
// (createIfNotExists): re-running never resets a proposal that has moved on.
//   SANITY_AUTH_TOKEN=... node scripts/seed-proposals.mjs
import { createClient } from "@sanity/client";
import { historyEntry } from "../src/lib/proposals.js";

const client = createClient({
  projectId: "en9phc0q", dataset: "production", apiVersion: "2025-02-19", useCdn: false,
  token: process.env.SANITY_AUTH_TOKEN,
});

const SEEDS = [
  { slug: "cistern", word: "CISTERN", bank: "noun", weight: 1, proposedBy: "QK desk",
    rationale: "Municipal, damp, two syllables, and nobody has ever remembered one. Sits beside BALLAST and LEDGER without drawing the eye." },
  { slug: "asmara", word: "Asmara", bank: "stations", weight: 1, proposedBy: "AE desk",
    rationale: "Kagnew Station, the US listening post in Eritrea, ran until 1977. A real Cold War posting, and the bank has nothing in the Horn of Africa." },
  { slug: "overcast", word: "OVERCAST", bank: "adj", weight: 1, proposedBy: "LI desk",
    rationale: "Weather nobody writes down. Reads right against the nouns already there: OVERCAST LEDGER, OVERCAST TRAWLER." },
  { slug: "nightshade", word: "NIGHTSHADE", bank: "noun", weight: 1, proposedBy: "walk-in",
    rationale: "Poisonous plant, sounds sinister. Would make great codenames." },
  { slug: "hallam-rye", word: "Hallam & Rye Surveyors", bank: "cover_firm", weight: 1, proposedBy: "QK desk",
    rationale: "A two-partner land surveying practice: a reason to be anywhere with a tripod and a camera." },
];

const tx = client.transaction();
for (const s of SEEDS) {
  const { slug, ...fields } = s;
  tx.createIfNotExists({
    _id: `wordProposal-${slug}`, _type: "wordProposal", ...fields, status: "proposed",
    history: [historyEntry("proposed", new Date().toISOString(), undefined, `seed-${slug}`, fields.proposedBy)],
  });
}
const res = await tx.commit({ visibility: "sync" });
console.log(res.results.map((r) => `${r.id} ${r.operation}`).join("\n"));
