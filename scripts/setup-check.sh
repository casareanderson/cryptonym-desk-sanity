#!/usr/bin/env bash
# Runs docs/SETUP.md steps that need no Sanity login: install, tests, build the site from the public
# dataset, read the proposals, export the corpus. With STUDIO=1 it also builds the Studio.
# Used by .github/workflows/setup-check.yml. Run it locally from the repo root too (Node 20).
set -euo pipefail
step() { printf '\n== %s\n' "$*"; }

step "1. install"
node --version
npm ci --no-audit --no-fund --silent

step "1. tests"
out=$(npm test 2>&1); echo "$out" | grep -E "^# (pass|fail)"
grep -q "^# fail 0" <<<"$out"

step "2. build the site from the public dataset (no token)"
env -u SANITY_AUTH_TOKEN npm run build 2>&1 | grep -E "page\(s\) built|Complete"
test -s dist/index.html && test -s dist/corpus/index.html && echo "dist/index.html, dist/corpus/index.html"

step "3. read the proposal queue (read-only, no token)"
env -u SANITY_AUTH_TOKEN node scripts/proposals.mjs list | tee /tmp/proposals.txt
[ -s /tmp/proposals.txt ]
set +e; node scripts/proposals.mjs >/dev/null 2>&1; rc=$?; set -e
[ "$rc" -eq 2 ] && echo "no command -> usage, exit 2"

step "5. export the public corpus (what you'd import into your own project)"
q='*[_type in ["digraph","wordBank","preset"]]'
curl -sfG "https://en9phc0q.api.sanity.io/v2024-01-01/data/query/production" --data-urlencode "query=$q" \
  | python3 -c "
import json, sys, collections
docs = json.load(sys.stdin)['result']
c = collections.Counter(d['_type'] for d in docs)
assert c['digraph'] and c['wordBank'] and c['preset'], c
print(len(docs), 'corpus documents:', dict(c))"

if [ "${STUDIO:-0}" = 1 ]; then
  step "4. build the Studio (no login needed to build)"
  ( cd studio && npm ci --no-audit --no-fund --silent && npx --no-install sanity build --yes 2>&1 | tail -2 && test -s dist/index.html )
fi

printf '\nSETUP CHECK PASSED\n'
