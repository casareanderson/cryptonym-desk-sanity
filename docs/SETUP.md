# Setting up Cryptonym Desk on Sanity

Five minutes to build the site from the public dataset, no account needed. Longer if you want your own
copy of the dataset to edit. The steps marked **CI checks this** run every week on a fresh Ubuntu
machine by [`setup-check`](../.github/workflows/setup-check.yml), with no Sanity token.

## What you need

| | |
|---|---|
| Node.js | 20 (what CI and the deploy workflow use), with npm |
| To build the site | nothing else: the dataset is public-read |
| To edit your own copy | a free [Sanity](https://www.sanity.io/) account and project |
| To write proposals from the terminal | an Editor token for that project (`SANITY_AUTH_TOKEN`) |

## 1. Install and test (CI checks this)

```bash
git clone https://github.com/casareanderson/cryptonym-desk-sanity && cd cryptonym-desk-sanity
npm ci
npm test
```

Success is `# pass 19` and `# fail 0`. The tests cover the generator, the corpus validation and the
proposal workflow, offline.

## 2. Build and run the site (CI checks the build)

```bash
npm run dev       # fetches the corpus from Sanity, serves it locally
npm run build     # writes the static site to dist/
```

`npm run dev` prints a local address. The desk is under `/cryptonym-desk-sanity/` because that's the
`base` in `astro.config.mjs` (the GitHub Pages path). The build fetches the corpus at build time and
writes 2 pages: `dist/index.html` and `dist/corpus/index.html`.

## 3. Look at the proposal queue (CI checks this)

```bash
node scripts/proposals.mjs list
```

Read-only, no token. One line per word proposal: status, bank, word, id, and what it was merged as.

Moving or merging a proposal writes to the dataset, so it needs an Editor token on **your** project:

```bash
export SANITY_AUTH_TOKEN="your editor token"
node scripts/proposals.mjs move <id> <in_review|approved|rejected|proposed> [note]
node scripts/proposals.mjs merge <id> [note]
```

An illegal move (say `proposed` straight to `merged`, or a rejection with no note) prints `refused: ...`,
exits 1 and writes nothing.

## 4. Run the Studio and the review app (CI checks the Studio builds)

```bash
cd studio && npm install && npx sanity dev      # the editing Studio
cd app && npm install && npx sanity dev         # the review queue app
```

Both open a Sanity login in the browser. Editing needs membership of the project. Building the Studio
(`npx sanity build`) needs no login, and that's what CI checks.

Deploying the review app to an organisation dashboard (`npx sanity deploy` in `app/`) needs a user login
with the org-level `sanity.sdk.applications.deploy` grant. A project robot token gets a 403.

## 5. Point it at your own dataset (not checked by CI, apart from the export)

The project id `en9phc0q` and dataset `production` are written into the code, not read from settings.
To make your own editable copy:

1. Create a project and a dataset in Sanity (`npx sanity init`, or the web dashboard). Make the dataset
   public-read if you want the site build to need no token.
2. Export the public corpus. **CI checks** this returns the digraphs, word banks and presets:

   ```bash
   curl -sG "https://en9phc0q.api.sanity.io/v2024-01-01/data/query/production" \
     --data-urlencode 'query=*[_type in ["digraph","wordBank","preset"]]' \
     | python3 -c "import json,sys; [print(json.dumps(d)) for d in json.load(sys.stdin)['result']]" \
     > corpus.ndjson
   ```

3. Import it into yours: `cd studio && npx sanity dataset import ../corpus.ndjson production`
4. Replace `en9phc0q` with your project id in `src/lib/corpus.js`, `studio/sanity.config.js`,
   `studio/sanity.cli.js`, `app/src/App.jsx` and `scripts/*.mjs`.

## 6. Deploy to GitHub Pages

`.github/workflows/deploy.yml` already does it: `npm ci`, `npm test`, `npm run build`, then Pages. It runs
on push to `main`, by hand, and nightly at 05:17 UTC, so a dataset edit reaches the site on the next
build. In a fork: **Settings → Pages → Source: GitHub Actions**, and change `site` and `base` in
`astro.config.mjs` to your own address.

## Settings

| name | default | what it does |
|---|---|---|
| `SANITY_AUTH_TOKEN` | unset | Editor token for `move` and `merge` in `scripts/proposals.mjs`, and for `scripts/seed-proposals.mjs`. The site build never uses it. |
| `PROPOSAL_REVIEWER` | `scripts/proposals.mjs` | name written to the `by` field of each history entry the script adds |
| `SANITY_APP_DEV_TOKEN` | unset | review app, **dev server only**. Never set it for a build or deploy. |
| `site`, `base` in `astro.config.mjs` | GitHub Pages address of this repo | where the built site is served |

## Common errors

| you see | what's wrong |
|---|---|
| `usage: proposals.mjs list \| move <id> <status> [note] \| merge <id> [note]` (exit 2) | missing or misspelt command |
| `refused: no wordProposal "<id>"` | that id doesn't exist. Run `list` for the ids. |
| `refused: ...` on a move | an illegal move or someone moved it first. Nothing was written. |
| a write fails with an auth or permission error | no `SANITY_AUTH_TOKEN`, or it's a Viewer token, or it's for a different project |
| the site shows old words after an edit | the corpus is read at build time. Push, run the workflow by hand, or wait for the nightly build. |
| the site loads without its styles in a fork | `base` in `astro.config.mjs` doesn't match the path you're served from |
| `npx sanity deploy` returns 403 | robot tokens can't deploy apps. Log in as a user with the org-level grant. |

## Updating and uninstalling

`git pull && npm ci && npm test`. To remove it, delete the folder. Your Sanity project, if you made one,
is deleted from the Sanity dashboard.

## What CI can't prove

Weekly, with no token, CI installs from a fresh clone, runs the 19 tests, builds both pages from the live
public dataset, reads the proposal queue, checks the usage error, exports the corpus, and builds the
Studio. It can't prove anything that needs a login or a token: editing in the Studio, moving or merging
proposals, importing into your own project, or deploying the review app.
