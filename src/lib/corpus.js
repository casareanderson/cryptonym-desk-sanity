// Build-time only. The page fetches the corpus from Sanity while Astro builds
// it and bakes the result into the HTML, so a visitor's browser never talks to
// Sanity - what they type still never leaves the page.
import { createHash } from "node:crypto";
import { createClient } from "@sanity/client";

export const PROJECT_ID = "en9phc0q";
export const DATASET = "production";
export const API_VERSION = "2024-01-01";

export const BANKS = ["stations", "directorates", "clearances", "cover_role", "cover_firm", "adj", "noun"];

export const QUERY = `{
  "digraphs": *[_type == "digraph" && retired != true] | order(code asc) {code, note},
  "banks": *[_type == "wordBank"] | order(bank asc, value asc) {bank, value, "weight": coalesce(weight, 1)},
  "presets": *[_type == "preset"] | order(label asc) {label, seeds},
  "revs": *[_type in ["digraph", "wordBank", "preset"]] | order(_id asc) {_id, _rev}
}`;

// A public dataset: no token, and nothing secret in the build.
const client = createClient({ projectId: PROJECT_ID, dataset: DATASET, apiVersion: API_VERSION, useCdn: false });

export function shape(raw) {
  const banks = Object.fromEntries(BANKS.map((b) => [b, []]));
  for (const e of raw.banks) {
    if (!banks[e.bank]) throw new Error(`unknown bank "${e.bank}" on "${e.value}"`);
    if (!(e.weight > 0)) throw new Error(`weight must be > 0 ("${e.value}" in ${e.bank} has ${e.weight})`);
    banks[e.bank].push({ value: e.value, weight: e.weight });
  }
  // An edit in the Studio must not be able to ship a page that throws on click.
  for (const b of BANKS) if (!banks[b].length) throw new Error(`bank "${b}" is empty`);
  if (!raw.digraphs.length) throw new Error("no active digraphs");
  if (!raw.presets.length) throw new Error("no presets");

  // The revision is a hash of every document's _rev: any edit in the dataset
  // changes it, and the record prints it, because a record is only rebuildable
  // against the corpus it was drawn from.
  const rev = createHash("sha256").update(JSON.stringify(raw.revs)).digest("hex").slice(0, 7);
  return { digraphs: raw.digraphs, banks, presets: raw.presets, rev, count: raw.revs.length };
}

let cached;
export async function loadCorpus() {
  cached ??= client.fetch(QUERY).then(shape);
  return cached;
}

export function queryUrl() {
  return `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=` +
    encodeURIComponent('*[_type in ["digraph","wordBank","preset"]]');
}
