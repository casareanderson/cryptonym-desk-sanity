// Sanity schema for the Cryptonym Desk corpus.
// The rules here are the page's rules: the Astro build refuses a corpus that
// breaks them, so the Studio stops an editor before the build has to.

const BANKS = [
  {title: "Stations", value: "stations"},
  {title: "Directorates", value: "directorates"},
  {title: "Clearances", value: "clearances"},
  {title: "Cover roles", value: "cover_role"},
  {title: "Cover firms", value: "cover_firm"},
  {title: "Codename adjectives", value: "adj"},
  {title: "Codename nouns", value: "noun"},
];

export const digraph = {
  name: "digraph", title: "Digraph", type: "document",
  fields: [
    {name: "code", title: "Code", type: "string",
     validation: (R) => R.required().regex(/^[A-Z]{2,3}$/, {name: "uppercase code"}),
     description: "Two- or three-letter prefix naming the sponsoring office, e.g. AE, QK, LI."},
    {name: "note", title: "Provenance note", type: "text",
     description: "Where this digraph is attested. Keep it factual - the page claims these are real."},
    {name: "retired", title: "Retired", type: "boolean", initialValue: false,
     description: "Retired digraphs stay in the dataset but drop out of the next build."},
  ],
  preview: {select: {title: "code", subtitle: "note"}},
};

export const wordBank = {
  name: "wordBank", title: "Word bank entry", type: "document",
  fields: [
    {name: "bank", title: "Bank", type: "string", validation: (R) => R.required(),
     options: {list: BANKS, layout: "radio"}},
    {name: "value", title: "Value", type: "string", validation: (R) => R.required(),
     description: "Codename words are shown in capitals; write them that way."},
    {name: "weight", title: "Weight", type: "number", initialValue: 1,
     validation: (R) => R.required().positive(),
     description: "Relative pick weight within its bank. A cryptonym word should be drab, so keep the odd ones low."},
  ],
  preview: {select: {title: "value", subtitle: "bank"}},
};

export const preset = {
  name: "preset", title: "Preset", type: "document",
  fields: [
    {name: "label", title: "Label", type: "string", validation: (R) => R.required()},
    {name: "seeds", title: "Seed material", type: "array", of: [{type: "string"}],
     validation: (R) => R.required().min(2),
     description: "Films, series and characters the record is cut from. Full names cut better than short words."},
  ],
  preview: {select: {title: "label"}},
};

// The review workflow as data: a proposal carries its own state. `status` is
// the current step and `history` is the append-only log of every move, so the
// dataset alone answers "who approved this, and when" - no shadow database.
// status/history/mergedAs are read-only here: they only change through the
// workflow (Studio actions, the proposal-queue app, scripts/proposals.mjs),
// which all go through src/lib/proposals.js.
const STATUS_LIST = [
  {title: "Proposed", value: "proposed"},
  {title: "In review", value: "in_review"},
  {title: "Approved", value: "approved"},
  {title: "Rejected", value: "rejected"},
  {title: "Merged", value: "merged"},
];

export const wordProposal = {
  name: "wordProposal", title: "Word proposal", type: "document",
  fields: [
    {name: "word", title: "Proposed word", type: "string", validation: (R) => R.required(),
     description: "Codename adjectives and nouns are stored in capitals; the merge does that for you."},
    {name: "bank", title: "Target bank", type: "string", validation: (R) => R.required(),
     options: {list: BANKS, layout: "radio"}},
    {name: "status", title: "Status", type: "string", readOnly: true, initialValue: "proposed",
     options: {list: STATUS_LIST}},
    {name: "reviewerNote", title: "Reviewer note", type: "text", rows: 2, readOnly: true},
    {name: "history", title: "History", type: "array", readOnly: true,
     of: [{type: "object", name: "historyEntry", fields: [
       {name: "status", type: "string", options: {list: STATUS_LIST}},
       {name: "at", type: "datetime"},
       {name: "by", type: "string"},
       {name: "note", type: "text"},
     ], preview: {
       select: {status: "status", at: "at", by: "by", note: "note"},
       prepare: ({status, at, by, note}) => ({
         title: `${(status || "").replace("_", " ")}${by ? ` · ${by}` : ""}`,
         subtitle: `${(at || "").slice(0, 16).replace("T", " ")} UTC${note ? ` — ${note}` : ""}`,
       }),
     }}]},
    {name: "weight", title: "Proposed weight", type: "number", initialValue: 1,
     validation: (R) => R.required().positive(),
     description: "For a clearance stamp this is how common it is: SECRET is 5, CODE WORD is 0.5."},
    {name: "rationale", title: "Rationale", type: "text", rows: 3, validation: (R) => R.required(),
     description: "Why it belongs. A cryptonym word should be drab - say why this one is."},
    {name: "proposedBy", title: "Proposed by", type: "string"},
    {name: "mergedAs", title: "Merged as", type: "reference", to: [{type: "wordBank"}],
     readOnly: true, weak: true},
  ],
  preview: {
    select: {word: "word", bank: "bank", status: "status"},
    prepare: ({word, bank, status}) => ({title: word, subtitle: `${bank} · ${(status || "proposed").replace("_", " ")}`}),
  },
};

export const schemaTypes = [digraph, wordBank, preset, wordProposal];

