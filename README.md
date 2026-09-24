# Cryptonym Desk — on Astro + Sanity

**Name the films, anime and characters you like. The desk issues you a cryptonym,
a working alias and a field codename built out of them.**

→ **[Open it](https://casareanderson.github.io/cryptonym-desk-sanity/)** ·
[see the corpus](https://casareanderson.github.io/cryptonym-desk-sanity/corpus/)

This is a rebuild of [Cryptonym Desk](https://github.com/casareanderson/cryptonym-desk),
a single HTML file with its word banks hard-coded in a `<script>`. Here the
word banks, digraphs and presets live in a **public Sanity dataset**, and the page
is an Astro site built from it.

## Sanity project

- Project ID: **`en9phc0q`**, dataset **`production`** (public read)
- Read the whole corpus, no token:
  `https://en9phc0q.api.sanity.io/v2024-01-01/data/query/production?query=*[_type in ["digraph","wordBank","preset"]]`
- Schema: [`studio/schemaTypes/index.js`](studio/schemaTypes/index.js) — `digraph`, `wordBank`, `preset`

## What changed from the single-file version

- **The corpus is data, not code.** 103 documents: 20 digraphs, 77 word-bank
  entries across 7 banks, 6 presets. Anyone can read, fork or extend it.
- **Weights are real.** Each word-bank entry has a `weight`; the generator does a
  weighted pick. Clearance stamps are weighted so plain `SECRET` is common and
  `CODE WORD` is rare — an edit in the dataset, not a code change.
- **Build-time only.** Astro fetches the corpus while it builds and bakes it into
  the page. A visitor's browser never talks to Sanity, so the original promise
  still holds: what you type never leaves the page.
- **Records carry a corpus revision.** A record is seeded from your inputs plus a
  salt — and now also depends on the corpus. The revision (a hash of every
  document's `_rev`) is printed on the record, because a record is only
  rebuildable against the corpus it was drawn from.
- **The build refuses a bad corpus.** An empty bank, an unknown bank, a zero
  weight or no active digraphs fails the build instead of shipping a page that
  throws on click. The Studio schema enforces the same rules earlier.
- **Retiring a digraph** is a boolean in the dataset; it drops out of the next build.

## Two bugs the port found in the original

1. **`MERIDIAN` was in the noun bank twice**, so it was drawn twice as often as
   any other noun. Moving the list into documents made the duplicate obvious; it
   was dropped on import.
2. **The syllable splitter did not do what its README said.** The docs showed
   `Spiegel → Spie·gel` and `Kusanagi → Ku·sa·na·gi`; the regex actually kept one
   consonant after each vowel group — `Spieg·el`, `Kus·an·ag·i` — so the README's
   own example, `Spienagi`, could never be produced (every seed gave `Spiegagi`).
   Writing a test for the documented behaviour is what caught it. This port
   fixes the code to match the documentation, so the same inputs give different
   aliases from the original desk.

## Run it

```bash
npm ci
npm test        # generator + corpus-validation tests (node:test)
npm run dev     # fetches the corpus from Sanity, serves locally
npm run build   # static site in dist/
```

Deployment is a GitHub Action: it builds on push, on demand, and nightly, so a
dataset edit reaches the site on the next build. There is no webhook — that
would need a GitHub token stored in Sanity, and a nightly rebuild is enough for a
word list.

## Studio

```bash
cd studio && npm install && npx sanity dev
```

## Licence

MIT. Original single-file desk: same author, same licence.
