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

export const schemaTypes = [digraph, wordBank, preset];
