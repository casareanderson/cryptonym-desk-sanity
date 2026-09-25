#!/usr/bin/env node
// Move word proposals through review from a terminal - same rules as the
// Studio actions and the proposal-queue app (src/lib/proposals.js).
//
//   node scripts/proposals.mjs list
//   node scripts/proposals.mjs move <id> <in_review|approved|rejected|proposed> [note]
//   node scripts/proposals.mjs merge <id> [note]
//
// Writes need SANITY_AUTH_TOKEN (an Editor token for en9phc0q). `list` does not.
import { createClient } from "@sanity/client";
import { move, moveMutations, planMerge, mergeMutations, newKey } from "../src/lib/proposals.js";

const client = createClient({
  projectId: "en9phc0q", dataset: "production", apiVersion: "2025-02-19", useCdn: false,
  token: process.env.SANITY_AUTH_TOKEN,
});
const [cmd, id, ...rest] = process.argv.slice(2);
const opts = () => ({ at: new Date().toISOString(), note: rest.join(" ") || undefined, key: newKey(), by: process.env.PROPOSAL_REVIEWER || "scripts/proposals.mjs" });

async function get(id) {
  const p = await client.getDocument(id);
  if (!p || p._type !== "wordProposal") throw new Error(`no wordProposal "${id}"`);
  return p;
}

try {
if (cmd === "list") {
  const rows = await client.fetch(`*[_type == "wordProposal"] | order(_createdAt asc){_id, word, bank, status, "mergedAs": mergedAs._ref}`);
  for (const r of rows) console.log([r.status.padEnd(9), r.bank.padEnd(12), r.word.padEnd(14), r._id, r.mergedAs ? `-> ${r.mergedAs}` : ""].join(" "));
} else if (cmd === "move" && id && rest.length) {
  const [to, ...note] = rest;
  rest.splice(0, rest.length, ...note);
  const p = await get(id);
  await client.mutate(moveMutations(p, move(p, to, opts())), { visibility: "sync" });
  console.log(`${id}: ${p.status} -> ${to}`);
} else if (cmd === "merge" && id) {
  const p = await get(id);
  const existing = await client.fetch(`*[_type == "wordBank" && bank == $bank]{_id, bank, value}`, { bank: p.bank });
  const plan = planMerge(p, existing, opts());
  await client.mutate(mergeMutations(p, plan), { visibility: "sync" });
  console.log(`${id}: merged (${plan.kind}) -> ${plan.targetId}`);
} else {
  console.error("usage: proposals.mjs list | move <id> <status> [note] | merge <id> [note]");
  process.exit(2);
}
} catch (e) {
  // An illegal move (proposed -> merged, a rejection with no note) or a stale
  // revision (someone else moved it first) lands here, and nothing is written.
  console.error(`refused: ${e.message}`);
  process.exit(1);
}
